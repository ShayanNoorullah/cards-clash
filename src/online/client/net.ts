/**
 * Client connection to Supabase: accounts (guest, email code, linking a guest
 * to an email), calls to the `game` Edge Function, and Realtime updates of the
 * player's own match views. Without VITE_SUPABASE_URL the game stays offline.
 */
import { createClient, FunctionsHttpError, type SupabaseClient } from '@supabase/supabase-js';
import type { MatchView, Request as GameRequest } from '../protocol';
import { logger } from '../../services/logger';
import { isOnline, OFFLINE_MESSAGE } from '../../services/network';
import type { Loopback } from './loopback';

const log = logger.child('Online');

const URL = import.meta.env.VITE_SUPABASE_URL ?? '';
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

/** Dev only: `?loopback` runs the game server in the browser (see loopback.ts). */
const LOOPBACK =
  import.meta.env.DEV &&
  typeof location !== 'undefined' &&
  new URLSearchParams(location.search).has('loopback');
let loop: Loopback | null = null;
async function loopback(): Promise<Loopback> {
  loop ??= new (await import('./loopback')).Loopback();
  return loop;
}

export const ONLINE_CONFIGURED = LOOPBACK || (URL.startsWith('http') && KEY.length > 20);

let client: SupabaseClient | null = null;

export function supa(): SupabaseClient {
  if (!ONLINE_CONFIGURED) throw new OnlineError('OFFLINE', 'Online play is not set up in this build.');
  client ??= createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true } });
  return client;
}

export class OnlineError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly extra: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

export type Account =
  | { kind: 'offline' }
  | { kind: 'signedOut' }
  | { kind: 'guest'; userId: string }
  | { kind: 'email'; userId: string; email: string };

export async function account(): Promise<Account> {
  if (!ONLINE_CONFIGURED) return { kind: 'offline' };
  if (LOOPBACK) return (await loopback()).account();
  const { data } = await supa().auth.getSession();
  const user = data.session?.user;
  if (!user) return { kind: 'signedOut' };
  if (user.is_anonymous || !user.email) return { kind: 'guest', userId: user.id };
  return { kind: 'email', userId: user.id, email: user.email };
}

function fail(error: { message: string } | null): void {
  if (error) throw new OnlineError('AUTH', error.message);
}

export async function playAsGuest(): Promise<void> {
  if (LOOPBACK) return (await loopback()).signIn();
  fail((await supa().auth.signInAnonymously()).error);
}

/** Emails a 6-digit sign-in code (creates the account if it doesn't exist). */
export async function sendEmailCode(email: string): Promise<void> {
  if (LOOPBACK) throw new OnlineError('LOOPBACK', 'Email sign-in needs a real Supabase project.');
  fail((await supa().auth.signInWithOtp({ email, options: { shouldCreateUser: true } })).error);
}

export async function verifyEmailCode(email: string, code: string): Promise<void> {
  fail((await supa().auth.verifyOtp({ email, token: code.trim(), type: 'email' })).error);
}

/**
 * Turns the current guest account into an email account (keeps all progress).
 * Returns true when a confirmation code was emailed, false when the project
 * doesn't confirm email changes and the email is already linked.
 */
export async function linkEmail(email: string): Promise<boolean> {
  if (LOOPBACK) throw new OnlineError('LOOPBACK', 'Email linking needs a real Supabase project.');
  const { data, error } = await supa().auth.updateUser({ email });
  fail(error);
  return data.user?.email?.toLowerCase() !== email.trim().toLowerCase();
}

export async function verifyLinkCode(email: string, code: string): Promise<void> {
  fail((await supa().auth.verifyOtp({ email, token: code.trim(), type: 'email_change' })).error);
}

export async function signOut(): Promise<void> {
  if (LOOPBACK) return (await loopback()).signOut();
  fail((await supa().auth.signOut()).error);
}

/** Calls the game function; throws OnlineError with the server's code on failure. */
export async function call<T>(req: GameRequest): Promise<T> {
  if (LOOPBACK) {
    const r = await (await loopback()).call<T>(req);
    if (r.ok) return r.data;
    throw new OnlineError(String(r.body.code ?? 'NETWORK'), String(r.body.error ?? 'Server error.'), r.body);
  }
  if (!isOnline()) throw new OnlineError('OFFLINE', OFFLINE_MESSAGE);
  const { data, error } = await supa().functions.invoke('game', { body: req });
  if (error) {
    let body: { code?: string; error?: string } & Record<string, unknown> = {};
    if (error instanceof FunctionsHttpError) {
      try {
        body = (await error.context.json()) as typeof body;
      } catch {
        // not JSON
      }
    }
    log.warn(`${req.op} failed`, body.code ?? error.message);
    throw new OnlineError(body.code ?? 'NETWORK', body.error ?? 'Could not reach the game server.', body);
  }
  return data as T;
}

/** Pushes every change to the player's own match views (Realtime, RLS-filtered). */
export function onMatchViews(userId: string, cb: (view: MatchView) => void): () => void {
  if (LOOPBACK && loop) return loop.onViews(cb);
  const channel = supa()
    .channel(`views-${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'match_views', filter: `user_id=eq.${userId}` },
      (payload) => {
        const row = payload.new as { view?: MatchView } | undefined;
        if (row?.view) cb(row.view);
      },
    )
    .subscribe();
  return () => {
    void supa().removeChannel(channel);
  };
}
