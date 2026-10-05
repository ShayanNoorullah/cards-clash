/**
 * GameStore on Supabase Postgres (service role, so RLS doesn't apply here).
 * Conditional updates (`.eq('seq', expected)` / `.eq('version', expected)`)
 * return the updated rows, which gives optimistic concurrency without
 * transactions, and keeps every call a single small request.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Action } from '../../engine/actions';
import { getContent } from '../../engine/content';
import type { MatchView } from '../protocol';
import { GameService } from './service';
import type { HttpDeps } from './http';
import type { StoredSave } from './saveSync';
import type { GameStore, MatchRecord, QueueEntry, RatingRow, Season } from './store';

const ms = (iso: string | null | undefined): number => (iso ? Date.parse(iso) : 0);
const iso = (t: number | null): string | null => (t === null ? null : new Date(t).toISOString());

interface MatchRow {
  id: string;
  mode: MatchRecord['mode'];
  status: MatchRecord['status'];
  room_code: string | null;
  player0: string;
  player1: string | null;
  names: [string, string];
  decks: MatchRecord['decks'];
  state: MatchRecord['state'];
  seq: number;
  deadline: string | null;
  last_seen: [number, number];
  winner: string | null;
  season_id: number | null;
  result: MatchRecord['result'];
  created_at: string;
  updated_at: string;
}

function fromRow(r: MatchRow): MatchRecord {
  return {
    id: r.id,
    mode: r.mode,
    status: r.status,
    roomCode: r.room_code,
    players: [r.player0, r.player1],
    names: r.names,
    decks: r.decks,
    state: r.state,
    seq: r.seq,
    deadline: r.deadline ? ms(r.deadline) : null,
    lastSeen: r.last_seen,
    winner: r.winner === null ? null : r.winner === 'draw' ? 'draw' : (Number(r.winner) as 0 | 1),
    seasonId: r.season_id,
    result: r.result,
    createdAt: ms(r.created_at),
    updatedAt: ms(r.updated_at),
  };
}

function toRow(m: MatchRecord): MatchRow {
  return {
    id: m.id,
    mode: m.mode,
    status: m.status,
    room_code: m.roomCode,
    player0: m.players[0],
    player1: m.players[1],
    names: m.names,
    decks: m.decks,
    state: m.state,
    seq: m.seq,
    deadline: iso(m.deadline),
    last_seen: m.lastSeen,
    winner: m.winner === null ? null : String(m.winner),
    season_id: m.seasonId,
    result: m.result,
    created_at: new Date(m.createdAt).toISOString(),
    updated_at: new Date(m.updatedAt).toISOString(),
  };
}

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

function list<T>(res: { data: T[] | null; error: { message: string } | null }): T[] {
  if (res.error) throw new Error(res.error.message);
  return res.data ?? [];
}

export class SupabaseStore implements GameStore {
  constructor(private readonly db: SupabaseClient) {}

  async getSave(userId: string): Promise<StoredSave | null> {
    const row = check(
      await this.db.from('saves').select('data, version, synced_at').eq('user_id', userId).maybeSingle(),
    );
    return row ? { data: row.data, version: row.version, syncedAt: ms(row.synced_at) } : null;
  }

  async putSave(userId: string, save: StoredSave, expectedVersion: number | null): Promise<boolean> {
    const row = { user_id: userId, data: save.data, version: save.version, synced_at: iso(save.syncedAt) };
    if (expectedVersion === null) {
      const res = await this.db.from('saves').insert(row);
      if (res.error) return false; // someone else created it first
    } else {
      const res = await this.db
        .from('saves')
        .update(row)
        .eq('user_id', userId)
        .eq('version', expectedVersion)
        .select('version');
      if (list(res).length !== 1) return false;
    }
    await this.mirrorCollectionAndDecks(userId, save);
    return true;
  }

  /** Keeps `collections` and `decks` in step with the save (owner-readable, used for reporting). */
  private async mirrorCollectionAndDecks(userId: string, save: StoredSave): Promise<void> {
    const cards = Object.entries(save.data.collection).map(([card_id, c]) => ({
      user_id: userId,
      card_id,
      count: c.count,
      level: c.level,
    }));
    check(await this.db.from('collections').delete().eq('user_id', userId));
    if (cards.length > 0) check(await this.db.from('collections').insert(cards));
    const decks = save.data.decks.flatMap((d, slot) =>
      d
        ? [
            {
              user_id: userId,
              slot,
              name: d.name,
              hero_id: d.heroId,
              landscapes: d.landscapes,
              cards: d.cards,
            },
          ]
        : [],
    );
    check(await this.db.from('decks').delete().eq('user_id', userId));
    if (decks.length > 0) check(await this.db.from('decks').insert(decks));
  }

  async setProfile(userId: string, p: { name: string; avatar: string; cardBack: string }): Promise<void> {
    check(
      await this.db.from('profiles').upsert({
        id: userId,
        name: p.name,
        avatar: p.avatar,
        card_back: p.cardBack,
        updated_at: new Date().toISOString(),
      }),
    );
  }

  async getProfileName(userId: string): Promise<string> {
    const row = check(await this.db.from('profiles').select('name').eq('id', userId).maybeSingle());
    return row?.name ?? 'Player';
  }

  async activeSeason(): Promise<Season> {
    const r = check(await this.db.from('seasons').select('*').eq('active', true).single());
    if (!r) throw new Error('No active season');
    return { id: r.id, name: r.name, startsAt: ms(r.starts_at), endsAt: ms(r.ends_at), active: true };
  }

  async startSeason(s: Season): Promise<void> {
    check(await this.db.from('seasons').update({ active: false }).eq('active', true));
    check(
      await this.db
        .from('seasons')
        .insert({ id: s.id, name: s.name, starts_at: iso(s.startsAt), ends_at: iso(s.endsAt), active: true }),
    );
  }

  async getRating(userId: string, seasonId: number): Promise<RatingRow | null> {
    const r = check(
      await this.db.from('ratings').select('*').eq('user_id', userId).eq('season_id', seasonId).maybeSingle(),
    );
    return r
      ? { userId, seasonId, rating: r.rating, games: r.games, wins: r.wins, losses: r.losses, peak: r.peak }
      : null;
  }

  async putRating(r: RatingRow): Promise<void> {
    check(
      await this.db.from('ratings').upsert({
        user_id: r.userId,
        season_id: r.seasonId,
        rating: r.rating,
        games: r.games,
        wins: r.wins,
        losses: r.losses,
        peak: r.peak,
      }),
    );
  }

  async ratingsOf(seasonId: number): Promise<RatingRow[]> {
    const rows = list(await this.db.from('ratings').select('*').eq('season_id', seasonId));
    return rows.map((r: Record<string, number | string>) => ({
      userId: String(r.user_id),
      seasonId,
      rating: Number(r.rating),
      games: Number(r.games),
      wins: Number(r.wins),
      losses: Number(r.losses),
      peak: Number(r.peak),
    }));
  }

  async queue(): Promise<QueueEntry[]> {
    const rows = list(await this.db.from('matchmaking_queue').select('*').order('queued_at').limit(200));
    return rows.map(
      (r: {
        user_id: string;
        name: string;
        rating: number;
        deck: QueueEntry['deck'];
        queued_at: string;
      }) => ({
        userId: r.user_id,
        name: r.name,
        rating: r.rating,
        deck: r.deck,
        queuedAt: ms(r.queued_at),
      }),
    );
  }

  async putQueue(e: QueueEntry): Promise<void> {
    check(
      await this.db.from('matchmaking_queue').upsert({
        user_id: e.userId,
        name: e.name,
        rating: e.rating,
        deck: e.deck,
        queued_at: iso(e.queuedAt),
      }),
    );
  }

  async takeQueue(userId: string): Promise<boolean> {
    const rows = list(
      await this.db.from('matchmaking_queue').delete().eq('user_id', userId).select('user_id'),
    );
    return rows.length === 1;
  }

  async getMatch(id: string): Promise<MatchRecord | null> {
    const r = check(await this.db.from('matches').select('*').eq('id', id).maybeSingle());
    return r ? fromRow(r as MatchRow) : null;
  }

  async putMatch(m: MatchRecord, expectedSeq: number | null): Promise<boolean> {
    const row = toRow(m);
    if (expectedSeq === null) return !(await this.db.from('matches').insert(row)).error;
    const rows = list(
      await this.db.from('matches').update(row).eq('id', m.id).eq('seq', expectedSeq).select('id'),
    );
    return rows.length === 1;
  }

  async waitingRoom(code: string): Promise<MatchRecord | null> {
    const r = check(
      await this.db.from('matches').select('*').eq('status', 'waiting').eq('room_code', code).maybeSingle(),
    );
    return r ? fromRow(r as MatchRow) : null;
  }

  async activeMatchOf(userId: string): Promise<MatchRecord | null> {
    const rows = list(
      await this.db
        .from('matches')
        .select('*')
        .eq('status', 'active')
        .or(`player0.eq.${userId},player1.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(1),
    );
    return rows[0] ? fromRow(rows[0] as MatchRow) : null;
  }

  async logAction(matchId: string, seq: number, player: number, action: Action): Promise<void> {
    await this.db.from('match_actions').insert({ match_id: matchId, seq, player, action });
  }

  async publishView(matchId: string, userId: string, view: MatchView): Promise<void> {
    check(
      await this.db.from('match_views').upsert({
        match_id: matchId,
        user_id: userId,
        seq: view.seq,
        view,
        updated_at: new Date().toISOString(),
      }),
    );
  }
}

/** Builds the Edge Function's dependencies from its environment. */
export function createSupabaseDeps(url: string, serviceRoleKey: string): HttpDeps {
  const db = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const service = new GameService({
    store: new SupabaseStore(db),
    content: getContent(),
    now: () => Date.now(),
    random: () => crypto.getRandomValues(new Uint32Array(1))[0]! / 0x1_0000_0000,
    newId: () => crypto.randomUUID(),
  });
  return {
    service,
    auth: async (req) => {
      const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
      if (!token) return null;
      const { data, error } = await db.auth.getUser(token);
      return error || !data.user ? null : { userId: data.user.id };
    },
    isAdmin: (req) => req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') === serviceRoleKey,
  };
}
