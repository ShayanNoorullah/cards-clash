/**
 * Storage interface for the game server. The Edge Function implements it on
 * Postgres (supabaseStore.ts); tests use MemoryStore. All writes that can race
 * use optimistic concurrency (expected version / sequence number).
 */
import type { Action } from '../../engine/actions';
import type { DeckList, GameState, Winner } from '../../engine/types';
import type { MatchMode, MatchStatus, MatchView } from '../protocol';
import type { StoredSave } from './saveSync';

export interface MatchRecord {
  id: string;
  mode: MatchMode;
  status: MatchStatus;
  roomCode: string | null;
  players: [string, string | null];
  names: [string, string];
  decks: [DeckList, DeckList | null];
  state: GameState | null;
  seq: number;
  /** Server time (ms) when the current turn or setup step times out. */
  deadline: number | null;
  lastSeen: [number, number];
  winner: Winner | null;
  seasonId: number | null;
  result: { ratings?: [{ before: number; after: number }, { before: number; after: number }] } | null;
  createdAt: number;
  updatedAt: number;
}

export interface QueueEntry {
  userId: string;
  name: string;
  rating: number;
  deck: DeckList;
  queuedAt: number;
}

export interface RatingRow {
  userId: string;
  seasonId: number;
  rating: number;
  games: number;
  wins: number;
  losses: number;
  peak: number;
}

export interface Season {
  id: number;
  name: string;
  startsAt: number;
  endsAt: number;
  active: boolean;
}

export interface GameStore {
  getSave(userId: string): Promise<StoredSave | null>;
  /** Insert (expectedVersion null) or update only if the stored version still matches. */
  putSave(userId: string, save: StoredSave, expectedVersion: number | null): Promise<boolean>;
  setProfile(userId: string, profile: { name: string; avatar: string; cardBack: string }): Promise<void>;
  getProfileName(userId: string): Promise<string>;

  activeSeason(): Promise<Season>;
  startSeason(season: Season): Promise<void>;
  getRating(userId: string, seasonId: number): Promise<RatingRow | null>;
  putRating(row: RatingRow): Promise<void>;
  ratingsOf(seasonId: number): Promise<RatingRow[]>;

  queue(): Promise<QueueEntry[]>;
  putQueue(entry: QueueEntry): Promise<void>;
  /** Removes an entry; true only for the caller that actually removed it (claims the opponent). */
  takeQueue(userId: string): Promise<boolean>;

  getMatch(id: string): Promise<MatchRecord | null>;
  /** Insert (expectedSeq null) or update only if the stored seq still matches. */
  putMatch(match: MatchRecord, expectedSeq: number | null): Promise<boolean>;
  waitingRoom(code: string): Promise<MatchRecord | null>;
  activeMatchOf(userId: string): Promise<MatchRecord | null>;
  logAction(matchId: string, seq: number, player: number, action: Action): Promise<void>;
  publishView(matchId: string, userId: string, view: MatchView): Promise<void>;
}

/** In-memory store (tests and local experiments). Behaves like the Postgres one. */
export class MemoryStore implements GameStore {
  saves = new Map<string, StoredSave>();
  profiles = new Map<string, { name: string; avatar: string; cardBack: string }>();
  seasons: Season[] = [];
  ratings = new Map<string, RatingRow>();
  entries = new Map<string, QueueEntry>();
  matches = new Map<string, MatchRecord>();
  actions: { matchId: string; seq: number; player: number; action: Action }[] = [];
  views = new Map<string, MatchView>();

  constructor(now: number) {
    this.seasons.push({
      id: 1,
      name: 'Season 1',
      startsAt: now,
      endsAt: now + 42 * 86_400_000,
      active: true,
    });
  }

  private copy<T>(v: T): T {
    return structuredClone(v);
  }

  async getSave(userId: string) {
    const s = this.saves.get(userId);
    return s ? this.copy(s) : null;
  }
  async putSave(userId: string, save: StoredSave, expectedVersion: number | null) {
    const cur = this.saves.get(userId);
    if (expectedVersion === null ? cur !== undefined : cur?.version !== expectedVersion) return false;
    this.saves.set(userId, this.copy(save));
    return true;
  }
  async setProfile(userId: string, profile: { name: string; avatar: string; cardBack: string }) {
    this.profiles.set(userId, { ...profile });
  }
  async getProfileName(userId: string) {
    return this.profiles.get(userId)?.name ?? 'Player';
  }

  async activeSeason() {
    return this.copy(this.seasons.find((s) => s.active)!);
  }
  async startSeason(season: Season) {
    for (const s of this.seasons) s.active = false;
    this.seasons.push({ ...season, active: true });
  }
  async getRating(userId: string, seasonId: number) {
    const r = this.ratings.get(`${userId}:${seasonId}`);
    return r ? this.copy(r) : null;
  }
  async putRating(row: RatingRow) {
    this.ratings.set(`${row.userId}:${row.seasonId}`, this.copy(row));
  }
  async ratingsOf(seasonId: number) {
    return [...this.ratings.values()].filter((r) => r.seasonId === seasonId).map((r) => this.copy(r));
  }

  async queue() {
    return [...this.entries.values()].map((e) => this.copy(e));
  }
  async putQueue(entry: QueueEntry) {
    this.entries.set(entry.userId, this.copy(entry));
  }
  async takeQueue(userId: string) {
    return this.entries.delete(userId);
  }

  async getMatch(id: string) {
    const m = this.matches.get(id);
    return m ? this.copy(m) : null;
  }
  async putMatch(match: MatchRecord, expectedSeq: number | null) {
    const cur = this.matches.get(match.id);
    if (expectedSeq === null ? cur !== undefined : cur?.seq !== expectedSeq) return false;
    this.matches.set(match.id, this.copy(match));
    return true;
  }
  async waitingRoom(code: string) {
    const m = [...this.matches.values()].find((x) => x.status === 'waiting' && x.roomCode === code);
    return m ? this.copy(m) : null;
  }
  async activeMatchOf(userId: string) {
    const m = [...this.matches.values()].find((x) => x.status === 'active' && x.players.includes(userId));
    return m ? this.copy(m) : null;
  }
  async logAction(matchId: string, seq: number, player: number, action: Action) {
    this.actions.push({ matchId, seq, player, action: this.copy(action) });
  }
  async publishView(matchId: string, userId: string, view: MatchView) {
    this.views.set(`${matchId}:${userId}`, this.copy(view));
  }
}
