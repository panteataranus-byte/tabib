import { idb, type StoreName } from './idb';
import { deriveVaultKey, fromB64, hashPassword, ITERATIONS, open, openJson, randomBytes, sameBytes, seal, sealJson, toB64, type Sealed } from './crypto';
import { AuthError, emptyVault, type Account, type Backend, type Vault } from './types';

interface StoredUser extends Account {
  passSalt: string;
  passHash: string;
  keySalt: string;
  iterations: number;
}

interface StoredSession {
  userId: string;
  key: CryptoKey; // non-extractable; IndexedDB keeps it across reloads without exposing its bytes
  expires: number;
}

const SESSION_DAYS = 7;
const MAX_FREE_ATTEMPTS = 5;

const fail = (e: unknown): never => {
  if (e instanceof AuthError) throw e;
  throw new AuthError('storage');
};

/** Stores everything in this browser's IndexedDB. Nothing leaves the device. */
export class LocalBackend implements Backend {
  private session: StoredSession | null = null;

  private async readVault(userId: string, key: CryptoKey): Promise<Vault> {
    const sealed = await idb.get<Sealed>('vaults', userId);
    return sealed ? { ...emptyVault(), ...(await openJson<Vault>(key, sealed)) } : emptyVault();
  }

  /** A new sign-in lasts 7 days from that moment; reopening the app does not extend it. */
  private async startSession(user: StoredUser, key: CryptoKey, restored?: StoredSession) {
    this.session = restored ?? { userId: user.id, key, expires: Date.now() + SESSION_DAYS * 86_400_000 };
    if (!restored) await idb.put('session', 'current', this.session);
    const { passSalt, passHash, keySalt, iterations, ...account } = user;
    return { account, vault: await this.readVault(user.id, key) };
  }

  async restore() {
    try {
      const s = await idb.get<StoredSession>('session', 'current');
      if (!s || s.expires < Date.now()) {
        if (s) await idb.del('session', 'current');
        return null;
      }
      const users = await idb.keys('users');
      for (const phone of users) {
        const u = await idb.get<StoredUser>('users', String(phone));
        if (u?.id === s.userId) return await this.startSession(u, s.key, s);
      }
      return null;
    } catch {
      return null;
    }
  }

  async signUp(input: { name: string; phone: string; birthDate: string; password: string }) {
    try {
      if (await idb.get('users', input.phone)) throw new AuthError('exists');
      const passSalt = randomBytes(16);
      const keySalt = randomBytes(16);
      const user: StoredUser = {
        id: crypto.randomUUID(),
        name: input.name,
        phone: input.phone,
        birthDate: input.birthDate,
        passSalt: toB64(passSalt),
        passHash: toB64(await hashPassword(input.password, passSalt)),
        keySalt: toB64(keySalt),
        iterations: ITERATIONS,
      };
      await idb.put('users', user.phone, user);
      const key = await deriveVaultKey(input.password, keySalt);
      await idb.put('vaults', user.id, await sealJson(key, emptyVault()));
      return await this.startSession(user, key);
    } catch (e) {
      return fail(e);
    }
  }

  async signIn(phone: string, password: string) {
    try {
      // Slow down guessing: after 5 failures, wait 2^n seconds between tries (per phone number).
      const attempts = (await idb.get<{ n: number; until: number }>('attempts', phone)) ?? { n: 0, until: 0 };
      if (attempts.until > Date.now()) throw new AuthError('locked', Math.ceil((attempts.until - Date.now()) / 1000));
      const user = await idb.get<StoredUser>('users', phone);
      // Hash even when the user does not exist, so timing does not reveal which numbers have accounts.
      const salt = user ? fromB64(user.passSalt) : randomBytes(16);
      const hash = await hashPassword(password, salt, user?.iterations ?? ITERATIONS);
      if (!user || !sameBytes(hash, fromB64(user.passHash))) {
        const n = attempts.n + 1;
        const until = n >= MAX_FREE_ATTEMPTS ? Date.now() + 2 ** (n - MAX_FREE_ATTEMPTS + 1) * 1000 : 0;
        await idb.put('attempts', phone, { n, until });
        throw new AuthError('login');
      }
      await idb.del('attempts', phone);
      return await this.startSession(user, await deriveVaultKey(password, fromB64(user.keySalt), user.iterations));
    } catch (e) {
      return fail(e);
    }
  }

  async signOut() {
    this.session = null;
    try {
      await idb.del('session', 'current');
    } catch {
      // If the delete fails, an expired entry still keeps this device signed out after a reload.
      await idb.put('session', 'current', { userId: '', expires: 0 }).catch(() => {});
    }
  }

  private need() {
    if (this.session && this.session.expires < Date.now()) {
      void this.signOut();
      throw new AuthError('login');
    }
    if (!this.session) throw new AuthError('login');
    return this.session;
  }

  /** The latest saved vault, including changes made in another tab. */
  async loadVault() {
    const s = this.need();
    return this.readVault(s.userId, s.key);
  }

  async saveVault(vault: Vault) {
    const s = this.need();
    await idb.put('vaults', s.userId, await sealJson(s.key, vault));
  }

  async putFile(id: string, bytes: ArrayBuffer) {
    const s = this.need();
    await idb.put('files', `${s.userId}/${id}`, await seal(s.key, bytes));
  }

  async getFile(id: string) {
    const s = this.need();
    const sealed = await idb.get<Sealed>('files', `${s.userId}/${id}`);
    return sealed ? open(s.key, sealed) : null;
  }

  async deleteFile(id: string) {
    const s = this.need();
    await idb.del('files', `${s.userId}/${id}`);
  }

  /** Removes the account, its vault, its files, its sign-in attempts and the session, all in one step. */
  async deleteAccount() {
    const s = this.need();
    const gone: [StoreName, string][] = [['vaults', s.userId], ['session', 'current']];
    for (const k of await idb.keys('files')) if (String(k).startsWith(`${s.userId}/`)) gone.push(['files', String(k)]);
    for (const phone of await idb.keys('users')) {
      const u = await idb.get<StoredUser>('users', String(phone));
      if (u?.id === s.userId) gone.push(['users', String(phone)], ['attempts', String(phone)]);
    }
    await idb.removeAll(gone);
    this.session = null;
  }
}
