/**
 * Sends the owner's customer list (sign-ups, bookings, cancellations) to their Supabase project.
 * It runs only when the build sets VITE_SUPABASE_URL and VITE_SUPABASE_KEY (the public, publishable key).
 * The database accepts new rows only; nothing can be read back with this key (supabase/schema.sql).
 * Entries wait in an outbox in IndexedDB until they are delivered, so a weak connection loses nothing.
 * Medical files and the reason for a visit are never sent.
 */
import { idb } from './idb';

const BASE = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_KEY as string | undefined;
export const remoteEnabled = Boolean(BASE && KEY);

export type RemoteTable = 'customers' | 'bookings' | 'cancellations';
interface OutboxItem {
  table: RemoteTable;
  row: Record<string, unknown>;
  queuedAt: number;
}

function headers(): Record<string, string> {
  const h: Record<string, string> = { apikey: KEY!, 'Content-Type': 'application/json', Prefer: 'return=minimal' };
  // Legacy anon keys are JWTs and go in Authorization too; new publishable keys go in apikey only.
  if (KEY!.startsWith('eyJ')) h.Authorization = `Bearer ${KEY}`;
  return h;
}

type Outcome = 'sent' | 'retry' | 'drop';

async function post(item: OutboxItem): Promise<Outcome> {
  try {
    const res = await fetch(`${BASE}/rest/v1/${item.table}`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(item.row),
      referrerPolicy: 'no-referrer',
      credentials: 'omit',
    });
    if (res.ok || res.status === 409) return 'sent'; // 409: already delivered by an earlier try
    // 400/422: the database refused the row's content, and resending it would never succeed.
    // Anything else (offline, busy, a key problem fixed by the next deploy) is tried again later.
    if (res.status === 400 || res.status === 422) return 'drop';
    return 'retry';
  } catch {
    return 'retry';
  }
}

let flushing: Promise<void> | null = null;

/** Delivers everything waiting, oldest first. Safe to call often. */
export function flushOutbox(): Promise<void> {
  if (!remoteEnabled) return Promise.resolve();
  flushing ??= (async () => {
    try {
      const keys = (await idb.keys('outbox')).map(String);
      const items = await Promise.all(keys.map(async (k) => [k, await idb.get<OutboxItem>('outbox', k)] as const));
      items.sort((a, b) => (a[1]?.queuedAt ?? 0) - (b[1]?.queuedAt ?? 0));
      for (const [key, item] of items) {
        if (!item) continue;
        const outcome = await post(item);
        if (outcome === 'retry') break; // offline or the server is busy: keep the order and try later
        await idb.del('outbox', key);
      }
    } catch {
      /* storage unavailable: nothing can be queued either */
    } finally {
      flushing = null;
    }
  })();
  return flushing;
}

/** Queues one row for the owner's list and tries to send it straight away. Never throws. */
export async function queueRemote(table: RemoteTable, id: string, row: Record<string, unknown>) {
  if (!remoteEnabled) return;
  try {
    await idb.put('outbox', `${table}:${id}`, { table, row, queuedAt: Date.now() } satisfies OutboxItem);
  } catch {
    return;
  }
  void flushOutbox();
}

if (remoteEnabled && typeof window !== 'undefined') window.addEventListener('online', () => void flushOutbox());
