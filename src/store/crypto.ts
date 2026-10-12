/**
 * Password hashing and at-rest encryption for the demo store, all with the browser's Web Crypto API.
 * - The password is never stored: we keep a PBKDF2-SHA-256 hash with a random salt.
 * - The medical file is encrypted with AES-256-GCM. Its key is derived from the password with a
 *   second, separate salt and is created non-extractable, so page scripts can use it but never read it.
 */
const ITERATIONS = 600_000; // OWASP 2023 guidance for PBKDF2-HMAC-SHA256
const enc = new TextEncoder();
const dec = new TextDecoder();

export const randomBytes = (n: number) => crypto.getRandomValues(new Uint8Array(n));
export const toB64 = (b: Uint8Array) => btoa(String.fromCharCode(...b));
export const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function baseKey(password: string) {
  return crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits', 'deriveKey']);
}

export async function hashPassword(password: string, salt: Uint8Array, iterations = ITERATIONS) {
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations }, await baseKey(password), 256);
  return new Uint8Array(bits);
}

export async function deriveVaultKey(password: string, salt: Uint8Array, iterations = ITERATIONS): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    await baseKey(password),
    { name: 'AES-GCM', length: 256 },
    false, // non-extractable
    ['encrypt', 'decrypt'],
  );
}

/** Constant-time comparison so a wrong password takes as long to reject however close it is. */
export function sameBytes(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export interface Sealed {
  iv: Uint8Array;
  data: ArrayBuffer;
}

export async function seal(key: CryptoKey, bytes: Uint8Array | ArrayBuffer): Promise<Sealed> {
  const iv = randomBytes(12);
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, bytes as BufferSource);
  return { iv, data };
}

export async function open(key: CryptoKey, sealed: Sealed): Promise<ArrayBuffer> {
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv: sealed.iv as BufferSource }, key, sealed.data);
}

export const sealJson = (key: CryptoKey, value: unknown) => seal(key, enc.encode(JSON.stringify(value)));
export const openJson = async <T>(key: CryptoKey, sealed: Sealed): Promise<T> => JSON.parse(dec.decode(await open(key, sealed))) as T;

export { ITERATIONS };
