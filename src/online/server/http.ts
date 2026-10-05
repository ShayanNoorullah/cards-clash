/**
 * HTTP entry point of the `game` Edge Function, independent of the runtime:
 * the Deno function passes real Supabase dependencies, tests pass in-memory ones.
 */
import type { Action } from '../../engine/actions';
import type { DeckList } from '../../engine/types';
import type { Request as GameRequest, Response as GameResponse } from '../protocol';
import type { GameService } from './service';
import { ServiceError } from './service';

export interface HttpDeps {
  service: GameService;
  /** The signed-in user for a request (from its JWT), or null. */
  auth: (req: Request) => Promise<{ userId: string } | null>;
  /** Admin calls (season rollover) must use the service-role key. */
  isAdmin: (req: Request) => boolean;
}

export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/** Requests above this size are refused (free-tier friendly, and a sanity limit). */
const MAX_BODY_BYTES = 256 * 1024;

function json(body: GameResponse, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

const fail = (
  code: Extract<GameResponse, { ok: false }>['code'],
  error: string,
  status: number,
  extra = {},
) => json({ ok: false, code, error, ...extra } as GameResponse, status);

const STATUS: Record<string, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  NOT_PARTICIPANT: 403,
  STALE: 409,
  BUSY: 409,
};

export async function handle(req: Request, deps: HttpDeps): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== 'POST') return fail('BAD_REQUEST', 'Use POST.', 405);
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) return fail('BAD_REQUEST', 'Request too large.', 413);
  let body: GameRequest;
  try {
    body = JSON.parse(text) as GameRequest;
  } catch {
    return fail('BAD_REQUEST', 'Invalid JSON.', 400);
  }
  if (!body || typeof body !== 'object' || typeof body.op !== 'string')
    return fail('BAD_REQUEST', 'Missing op.', 400);

  const s = deps.service;
  try {
    if (body.op === 'seasonRollover') {
      if (!deps.isAdmin(req)) return fail('FORBIDDEN', 'Admin only.', 403);
      return json({ ok: true, ...(await s.seasonRollover()) });
    }
    const user = await deps.auth(req);
    if (!user) return fail('UNAUTHORIZED', 'Sign in first.', 401);
    const id = user.userId;
    switch (body.op) {
      case 'sync':
        return json({ ok: true, ...(await s.sync(id, body)) });
      case 'profile':
        return json({ ok: true, ...(await s.profile(id)) });
      case 'queue':
        return json({ ok: true, ...(await s.queue(id, body.deck as DeckList)) });
      case 'queueStatus':
        return json({ ok: true, ...(await s.queueStatus(id)) });
      case 'cancelQueue':
        return json({ ok: true, ...(await s.cancelQueue(id)) });
      case 'createRoom':
        return json({ ok: true, ...(await s.createRoom(id, body.deck as DeckList)) });
      case 'joinRoom':
        return json({ ok: true, ...(await s.joinRoom(id, body.code, body.deck as DeckList)) });
      case 'act':
        return json({
          ok: true,
          view: await s.act(id, body.matchId, Number(body.seq), body.action as Action),
        });
      case 'tick':
        return json({ ok: true, view: await s.tick(id, body.matchId) });
      case 'view':
        return json({ ok: true, view: await s.view(id, body.matchId) });
      case 'current':
        return json({ ok: true, view: await s.current(id) });
      default:
        return fail('BAD_REQUEST', 'Unknown op.', 400);
    }
  } catch (err) {
    if (err instanceof ServiceError) return fail(err.code, err.message, STATUS[err.code] ?? 400, err.extra);
    console.error(err);
    return fail('BAD_REQUEST', 'Server error.', 500);
  }
}
