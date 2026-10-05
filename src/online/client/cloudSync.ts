/**
 * Cloud save sync. The client sends its save plus the economy snapshot from its
 * last sync; the server merges (latest wins for ordinary data, capped deltas for
 * the economy) and returns the authoritative save, which replaces the local one.
 * Runs on start, after sign-in, and 30 s after the save changes (debounced).
 */
import { saves } from '../../save';
import type { EconomySnapshot, SyncResult } from '../protocol';
import { logger } from '../../services/logger';
import onlineConfig from '../../data/online.json';
import { account, call, ONLINE_CONFIGURED } from './net';

const log = logger.child('CloudSync');
const META_KEY = 'cards-clash.cloud';

interface SyncMeta {
  version: number;
  base: EconomySnapshot;
  at: number;
  flags: string[];
}

function readMeta(): SyncMeta | null {
  try {
    const raw = globalThis.localStorage?.getItem(META_KEY);
    return raw ? (JSON.parse(raw) as SyncMeta) : null;
  } catch {
    return null;
  }
}

function writeMeta(meta: SyncMeta | null): void {
  try {
    if (meta) globalThis.localStorage?.setItem(META_KEY, JSON.stringify(meta));
    else globalThis.localStorage?.removeItem(META_KEY);
  } catch {
    // storage unavailable: next sync just merges from scratch
  }
}

export function lastSync(): { at: number; flags: string[] } | null {
  const m = readMeta();
  return m ? { at: m.at, flags: m.flags } : null;
}

/** Forget sync state (after signing out, so another account starts clean). */
export function resetSyncMeta(): void {
  writeMeta(null);
}

let applying = false;
let inFlight: Promise<SyncResult> | null = null;

export async function syncNow(): Promise<SyncResult> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const meta = readMeta();
    const result = await call<SyncResult>({
      op: 'sync',
      save: saves().save,
      baseVersion: meta?.version ?? null,
      base: meta?.base ?? null,
    });
    applying = true;
    try {
      await saves().commit(result.save);
    } finally {
      applying = false;
    }
    writeMeta({ version: result.version, base: result.base, at: Date.now(), flags: result.flags });
    if (result.flags.length > 0) log.warn('Server refused part of the save', result.flags);
    return result;
  })();
  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

let timer: ReturnType<typeof setTimeout> | null = null;

/** Starts background sync for signed-in players. Safe to call once at boot. */
export function startAutoSync(): void {
  if (!ONLINE_CONFIGURED) return;
  const schedule = () => {
    if (applying) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void trySync(), onlineConfig.client.syncDebounceSeconds * 1000);
  };
  saves().onChange(schedule);
  void trySync();
}

async function trySync(): Promise<void> {
  try {
    const a = await account();
    if (a.kind === 'guest' || a.kind === 'email') await syncNow();
  } catch (err) {
    log.warn('Background sync failed (will retry on the next change)', err);
  }
}
