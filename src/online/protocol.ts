/**
 * Client ↔ server protocol for the `game` Edge Function. Every request is a
 * POST with `{ op, ... }`; every response is `{ ok: true, ... }` or
 * `{ ok: false, error, code }`. Plain JSON only (small payloads).
 */
import type { Action } from '../engine/actions';
import type { GameEvent } from '../engine/events';
import type { DeckList, GameState, PlayerId, Winner } from '../engine/types';
import type { SaveData } from '../save/saveData';

export type MatchMode = 'ranked' | 'friendly';
export type MatchStatus = 'waiting' | 'active' | 'ended';

/** Economy snapshot a client keeps from its last sync (to merge offline gains safely). */
export interface EconomySnapshot {
  coins: number;
  gems: number;
  dust: number;
  xp: number;
  cards: Record<string, number>;
}

/** What one player is allowed to see of a match (hidden cards redacted). */
export interface MatchView {
  matchId: string;
  mode: MatchMode;
  status: MatchStatus;
  seq: number;
  you: PlayerId;
  names: [string, string];
  state: GameState | null;
  /** Events produced by the latest accepted action (redacted for you). */
  events: GameEvent[];
  /** Server time (ms) when the current turn/setup step times out. */
  deadline: number | null;
  serverNow: number;
  winner: Winner | null;
  /** Ranked only, once the match ended: rating before/after for you. */
  rating?: { before: number; after: number; tier: string };
  roomCode?: string | null;
}

export type Request =
  | { op: 'sync'; save: SaveData; baseVersion: number | null; base: EconomySnapshot | null }
  | { op: 'profile' }
  | { op: 'queue'; deck: DeckList }
  | { op: 'cancelQueue' }
  | { op: 'queueStatus' }
  | { op: 'createRoom'; deck: DeckList }
  | { op: 'joinRoom'; code: string; deck: DeckList }
  | { op: 'act'; matchId: string; seq: number; action: Action }
  | { op: 'tick'; matchId: string }
  | { op: 'view'; matchId: string }
  | { op: 'current' }
  | { op: 'seasonRollover' };

export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'BAD_REQUEST'
  | 'NOT_FOUND'
  | 'NOT_PARTICIPANT'
  | 'NOT_ACTIVE'
  | 'STALE'
  | 'ILLEGAL'
  | 'WRONG_PLAYER'
  | 'DECK_INVALID'
  | 'NOT_OWNED'
  | 'BUSY'
  | 'FORBIDDEN';

export type Response =
  ({ ok: true } & Record<string, unknown>) | { ok: false; code: ErrorCode; error: string };

export interface SyncResult {
  save: SaveData;
  version: number;
  base: EconomySnapshot;
  /** Gains the server refused (an edited or impossible save). */
  flags: string[];
}

export interface ProfileResult {
  name: string;
  season: { id: number; name: string; endsAt: number };
  rating: number;
  tier: string;
  games: number;
  wins: number;
  losses: number;
}

export type QueueResult =
  { status: 'queued'; since: number } | { status: 'matched'; matchId: string } | { status: 'idle' };
