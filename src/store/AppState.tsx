import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { LocalBackend } from './local';
import type { Account, Appointment, Backend, DocumentMeta, MedicalRecord, Vault } from './types';

interface AppState {
  ready: boolean;
  account: Account | null;
  vault: Vault | null;
  signUp: Backend['signUp'];
  signIn: Backend['signIn'];
  signOut: () => Promise<void>;
  book: (a: Omit<Appointment, 'id' | 'status' | 'createdAt'>) => Promise<Appointment>;
  cancelAppointment: (id: string) => Promise<void>;
  /** Pass a function to build the change from the latest record, so quick edits never undo each other. */
  updateRecord: (patch: Partial<MedicalRecord> | ((r: MedicalRecord) => Partial<MedicalRecord>)) => Promise<void>;
  addDocument: (file: File) => Promise<void>;
  readDocument: (id: string) => Promise<Blob | null>;
  removeDocument: (id: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
}

export const MAX_FILE_MB = 5;
const SIGNATURES: [DocumentMeta['type'], number[]][] = [
  ['application/pdf', [0x25, 0x50, 0x44, 0x46]], // %PDF
  ['image/png', [0x89, 0x50, 0x4e, 0x47]],
  ['image/jpeg', [0xff, 0xd8, 0xff]],
];

/** Decide a file's type from its first bytes, not its name, so a renamed file cannot pass as a PDF. */
export function sniffType(bytes: Uint8Array): DocumentMeta['type'] | null {
  for (const [type, sig] of SIGNATURES) if (sig.every((b, i) => bytes[i] === b)) return type;
  return null;
}

export class FileError extends Error {
  constructor(public code: 'size' | 'type') {
    super(code);
  }
}

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children, backend }: { children: ReactNode; backend?: Backend }) {
  const be = useRef<Backend>(backend ?? new LocalBackend()).current;
  const [ready, setReady] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [vault, setVault] = useState<Vault | null>(null);
  const vaultRef = useRef<Vault | null>(null);
  vaultRef.current = vault;

  useEffect(() => {
    be.restore().then((r) => {
      if (r) {
        setAccount(r.account);
        setVault(r.vault);
      }
      setReady(true);
    });
  }, [be]);

  // Other tabs say when they save or sign in or out, so this one never writes over their changes.
  const channel = useRef<BroadcastChannel | null>(null);
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const ch = new BroadcastChannel('tabib');
    channel.current = ch;
    ch.onmessage = (e) => {
      if (e.data === 'vault' && vaultRef.current) be.loadVault().then(setVault, () => {});
      if (e.data === 'session')
        be.restore().then((r) => {
          setAccount(r?.account ?? null);
          setVault(r?.vault ?? null);
        });
    };
    return () => ch.close();
  }, [be]);
  const tell = (what: 'vault' | 'session') => channel.current?.postMessage(what);

  // Saves run one after another, each on top of the latest stored vault.
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const change = useCallback(
    (fn: (v: Vault) => Vault) => {
      const run = queue.current.then(async () => {
        const next = fn(await be.loadVault());
        await be.saveVault(next);
        setVault(next);
        tell('vault');
      });
      queue.current = run.catch(() => {});
      return run;
    },
    [be],
  );
  const current = () => {
    if (!vaultRef.current) throw new Error('not signed in');
    return vaultRef.current;
  };

  const start = (r: { account: Account; vault: Vault }) => {
    setAccount(r.account);
    setVault(r.vault);
    tell('session');
    return r;
  };

  const value = useMemo<AppState>(
    () => ({
      ready,
      account,
      vault,
      signUp: async (input) => start(await be.signUp(input)),
      signIn: async (phone, password) => start(await be.signIn(phone, password)),
      signOut: async () => {
        await be.signOut();
        setAccount(null);
        setVault(null);
        tell('session');
      },
      book: async (a) => {
        const appt: Appointment = { ...a, id: crypto.randomUUID(), status: 'booked', createdAt: new Date().toISOString() };
        await change((v) => ({ ...v, appointments: [...v.appointments, appt] }));
        return appt;
      },
      cancelAppointment: async (id) => {
        await change((v) => ({ ...v, appointments: v.appointments.map((x) => (x.id === id ? { ...x, status: 'cancelled' as const } : x)) }));
      },
      updateRecord: async (patch) => {
        await change((v) => ({ ...v, record: { ...v.record, ...(typeof patch === 'function' ? patch(v.record) : patch) } }));
      },
      addDocument: async (file) => {
        if (file.size > MAX_FILE_MB * 1024 * 1024) throw new FileError('size');
        const bytes = await file.arrayBuffer();
        const type = sniffType(new Uint8Array(bytes.slice(0, 8)));
        if (!type) throw new FileError('type');
        const meta: DocumentMeta = {
          id: crypto.randomUUID(),
          name: file.name.replace(/[^\p{L}\p{N} ._()-]/gu, '').slice(0, 80) || 'file',
          type,
          size: file.size,
          addedAt: new Date().toISOString(),
        };
        await be.putFile(meta.id, bytes);
        try {
          await change((v) => ({ ...v, record: { ...v.record, documents: [...v.record.documents, meta] } }));
        } catch (e) {
          await be.deleteFile(meta.id).catch(() => {}); // do not leave an unlisted file behind
          throw e;
        }
      },
      readDocument: async (id) => {
        const meta = current().record.documents.find((d) => d.id === id);
        const bytes = await be.getFile(id);
        return meta && bytes ? new Blob([bytes], { type: meta.type }) : null;
      },
      removeDocument: async (id) => {
        // Unlist first: if deleting the file then fails, nothing broken is left on screen.
        await change((v) => ({ ...v, record: { ...v.record, documents: v.record.documents.filter((d) => d.id !== id) } }));
        await be.deleteFile(id).catch(() => {});
      },
      deleteAccount: async () => {
        await be.deleteAccount();
        setAccount(null);
        setVault(null);
        tell('session');
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, account, vault, be, change],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp outside AppStateProvider');
  return v;
}
