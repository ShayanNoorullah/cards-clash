/**
 * The authoritative game server. Every online action goes through here: the
 * shared rules engine validates it against the real (hidden) state, the store
 * records it, and each player is sent their own redacted view. Clients can't
 * act for the other player, act out of turn, replay stale actions, use cards
 * they don't own in Ranked, or grant themselves rewards.
 */
import type { Action } from '../../engine/actions';
import { applyAction } from '../../engine/apply';
import { BALANCE } from '../../engine/balance';
import type { GameContent } from '../../engine/content';
import { validateDeck } from '../../engine/deck';
import type { GameEvent } from '../../engine/events';
import { playersToAct } from '../../engine/legal';
import { createGame } from '../../engine/state';
import type { DeckList, GameState, PlayerId } from '../../engine/types';
import type { SaveData } from '../../save/saveData';
import type {
  EconomySnapshot,
  ErrorCode,
  MatchView,
  ProfileResult,
  QueueResult,
  SyncResult,
} from '../protocol';
import { matchWindow, ONLINE, softReset, tierOf, updateRating } from './rating';
import { redactEvents, redactState } from './redact';
import { grantToSave, mergeSave } from './saveSync';
import type { GameStore, MatchRecord, QueueEntry, RatingRow } from './store';

export class ServiceError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly extra: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

export interface ServiceDeps {
  store: GameStore;
  content: GameContent;
  now: () => number;
  /** Uniform random in [0, 1): server seeds and room codes (never exposed to clients). */
  random: () => number;
  newId: () => string;
}

const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_TTL_MS = 10 * 60_000;
const DEADLINE_GRACE_MS = 1500;

export class GameService {
  constructor(private readonly d: ServiceDeps) {}

  private get ctx() {
    return this.d.content.ctx;
  }

  private turnMs(): number {
    return BALANCE.online.turnTimerSeconds * 1000;
  }

  // -------------------------------------------------------------------------
  // Cloud save
  // -------------------------------------------------------------------------

  async sync(
    userId: string,
    req: { save: SaveData; baseVersion: number | null; base: EconomySnapshot | null },
  ): Promise<SyncResult> {
    for (let attempt = 0; attempt < 3; attempt++) {
      const stored = await this.d.store.getSave(userId);
      let merged;
      try {
        merged = mergeSave(stored, req, this.d.now(), this.d.content);
      } catch (err) {
        throw new ServiceError('BAD_REQUEST', `Save rejected: ${(err as Error).message}`);
      }
      const ok = await this.d.store.putSave(
        userId,
        { data: merged.save, version: merged.version, syncedAt: this.d.now() },
        stored?.version ?? null,
      );
      if (!ok) continue;
      const p = merged.save.profile;
      await this.d.store.setProfile(userId, { name: p.name, avatar: p.avatar, cardBack: p.cardBack });
      return { save: merged.save, version: merged.version, base: merged.base, flags: merged.flags };
    }
    throw new ServiceError('BUSY', 'Your save is being updated on another device. Try again.');
  }

  /** Applies a server-side reward to the stored save (ranked wins, season rewards). */
  private async grant(userId: string, reward: { coins?: number; gems?: number; xp?: number }): Promise<void> {
    for (let attempt = 0; attempt < 3; attempt++) {
      const stored = await this.d.store.getSave(userId);
      if (!stored) return; // never synced: nothing to credit (they play as a guest without cloud save)
      const ok = await this.d.store.putSave(
        userId,
        { data: grantToSave(stored.data, reward), version: stored.version + 1, syncedAt: stored.syncedAt },
        stored.version,
      );
      if (ok) return;
    }
  }

  // -------------------------------------------------------------------------
  // Profile & ratings
  // -------------------------------------------------------------------------

  private async ratingRow(userId: string, seasonId: number): Promise<RatingRow> {
    return (
      (await this.d.store.getRating(userId, seasonId)) ?? {
        userId,
        seasonId,
        rating: ONLINE.rating.start,
        games: 0,
        wins: 0,
        losses: 0,
        peak: ONLINE.rating.start,
      }
    );
  }

  async profile(userId: string): Promise<ProfileResult> {
    const season = await this.d.store.activeSeason();
    const r = await this.ratingRow(userId, season.id);
    return {
      name: await this.d.store.getProfileName(userId),
      season: { id: season.id, name: season.name, endsAt: season.endsAt },
      rating: r.rating,
      tier: tierOf(r.rating),
      games: r.games,
      wins: r.wins,
      losses: r.losses,
    };
  }

  // -------------------------------------------------------------------------
  // Decks
  // -------------------------------------------------------------------------

  private async checkDeck(userId: string, raw: DeckList, ranked: boolean): Promise<DeckList> {
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.cards) || !Array.isArray(raw.landscapes))
      throw new ServiceError('DECK_INVALID', 'That deck is not valid.');
    // Online decks play at a fixed level; any client-side levels are ignored.
    const deck: DeckList = {
      heroId: String(raw.heroId),
      landscapes: [...raw.landscapes],
      cards: raw.cards.map(String),
    };
    const hero = this.ctx.heroes.byId.get(deck.heroId);
    const errors = validateDeck(deck, this.ctx);
    if (!hero || hero.boss || errors.length > 0)
      throw new ServiceError('DECK_INVALID', errors[0] ?? 'That hero cannot be used online.');
    if (ranked) {
      const stored = await this.d.store.getSave(userId);
      if (!stored) throw new ServiceError('NOT_OWNED', 'Sync your save to the cloud before playing Ranked.');
      const counts = new Map<string, number>();
      for (const id of deck.cards) counts.set(id, (counts.get(id) ?? 0) + 1);
      for (const [id, n] of counts) {
        if ((stored.data.collection[id]?.count ?? 0) < n) {
          const name = this.ctx.cards.byId.get(id)?.name ?? id;
          throw new ServiceError('NOT_OWNED', `You don't own ${n} × ${name}.`);
        }
      }
    }
    return deck;
  }

  // -------------------------------------------------------------------------
  // Matchmaking
  // -------------------------------------------------------------------------

  async queue(userId: string, rawDeck: DeckList): Promise<QueueResult> {
    const active = await this.d.store.activeMatchOf(userId);
    if (active) return { status: 'matched', matchId: active.id };
    const deck = await this.checkDeck(userId, rawDeck, true);
    const season = await this.d.store.activeSeason();
    const rating = (await this.ratingRow(userId, season.id)).rating;
    const entry: QueueEntry = {
      userId,
      name: await this.d.store.getProfileName(userId),
      rating,
      deck,
      queuedAt: this.d.now(),
    };
    await this.d.store.putQueue(entry);
    return this.tryPair(entry);
  }

  async queueStatus(userId: string): Promise<QueueResult> {
    const active = await this.d.store.activeMatchOf(userId);
    if (active) return { status: 'matched', matchId: active.id };
    const me = (await this.d.store.queue()).find((e) => e.userId === userId);
    if (!me) return { status: 'idle' };
    if (this.d.now() - me.queuedAt > ONLINE.matchmaking.queueTimeoutSeconds * 1000) {
      await this.d.store.takeQueue(userId);
      return { status: 'idle' };
    }
    return this.tryPair(me);
  }

  async cancelQueue(userId: string): Promise<QueueResult> {
    await this.d.store.takeQueue(userId);
    return { status: 'idle' };
  }

  private async tryPair(me: QueueEntry): Promise<QueueResult> {
    const now = this.d.now();
    const others = (await this.d.store.queue()).filter((e) => e.userId !== me.userId);
    const wait = (e: QueueEntry) => (now - e.queuedAt) / 1000;
    const fits = others
      .filter((e) => Math.abs(e.rating - me.rating) <= matchWindow(Math.max(wait(e), wait(me))))
      .sort(
        (a, b) => Math.abs(a.rating - me.rating) - Math.abs(b.rating - me.rating) || a.queuedAt - b.queuedAt,
      );
    for (const opp of fits) {
      // Whoever removes the opponent's entry first owns the pairing.
      if (!(await this.d.store.takeQueue(opp.userId))) continue;
      if (!(await this.d.store.takeQueue(me.userId))) {
        await this.d.store.putQueue(opp); // we were claimed meanwhile; give the opponent back
        const active = await this.d.store.activeMatchOf(me.userId);
        return active ? { status: 'matched', matchId: active.id } : { status: 'idle' };
      }
      const flip = this.d.random() < 0.5;
      const [a, b] = flip ? [opp, me] : [me, opp];
      const season = await this.d.store.activeSeason();
      const match = await this.startMatch(
        'ranked',
        [a.userId, b.userId],
        [a.name, b.name],
        [a.deck, b.deck],
        season.id,
        null,
      );
      return { status: 'matched', matchId: match.id };
    }
    return { status: 'queued', since: me.queuedAt };
  }

  // -------------------------------------------------------------------------
  // Friendly rooms
  // -------------------------------------------------------------------------

  async createRoom(userId: string, rawDeck: DeckList): Promise<{ matchId: string; code: string }> {
    const deck = await this.checkDeck(userId, rawDeck, false);
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = Array.from(
        { length: 6 },
        () => ROOM_ALPHABET[Math.floor(this.d.random() * ROOM_ALPHABET.length)],
      ).join('');
      if (await this.d.store.waitingRoom(code)) continue;
      const now = this.d.now();
      const m: MatchRecord = {
        id: this.d.newId(),
        mode: 'friendly',
        status: 'waiting',
        roomCode: code,
        players: [userId, null],
        names: [await this.d.store.getProfileName(userId), ''],
        decks: [deck, null],
        state: null,
        seq: 0,
        deadline: null,
        lastSeen: [now, now],
        winner: null,
        seasonId: null,
        result: null,
        createdAt: now,
        updatedAt: now,
      };
      if (await this.d.store.putMatch(m, null)) {
        await this.publish(m, []);
        return { matchId: m.id, code };
      }
    }
    throw new ServiceError('BUSY', 'Could not create a room. Try again.');
  }

  async joinRoom(userId: string, rawCode: string, rawDeck: DeckList): Promise<{ matchId: string }> {
    const code = String(rawCode ?? '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
    const room = await this.d.store.waitingRoom(code);
    if (!room || this.d.now() - room.createdAt > ROOM_TTL_MS)
      throw new ServiceError('NOT_FOUND', 'No open room with that code.');
    if (room.players[0] === userId)
      throw new ServiceError('BAD_REQUEST', 'That is your own room. Share the code with a friend.');
    const deck = await this.checkDeck(userId, rawDeck, false);
    const started = this.newGame([room.decks[0], deck]);
    const now = this.d.now();
    const m: MatchRecord = {
      ...room,
      status: 'active',
      players: [room.players[0], userId],
      names: [room.names[0], await this.d.store.getProfileName(userId)],
      decks: [room.decks[0], deck],
      state: started.state,
      seq: room.seq + 1,
      deadline: now + this.turnMs(),
      lastSeen: [now, now],
      updatedAt: now,
    };
    if (!(await this.d.store.putMatch(m, room.seq)))
      throw new ServiceError('BUSY', 'Someone else joined that room first.');
    await this.publish(m, started.events);
    return { matchId: m.id };
  }

  // -------------------------------------------------------------------------
  // Matches
  // -------------------------------------------------------------------------

  private newGame(decks: [DeckList, DeckList]): { state: GameState; events: GameEvent[] } {
    const seed = Math.floor(this.d.random() * 0xffffffff);
    return createGame({ seed, decks, fixedCardLevel: BALANCE.online.rankedCardLevel }, this.ctx);
  }

  private async startMatch(
    mode: 'ranked' | 'friendly',
    players: [string, string],
    names: [string, string],
    decks: [DeckList, DeckList],
    seasonId: number | null,
    roomCode: string | null,
  ): Promise<MatchRecord> {
    const now = this.d.now();
    const started = this.newGame(decks);
    const m: MatchRecord = {
      id: this.d.newId(),
      mode,
      status: 'active',
      roomCode,
      players,
      names,
      decks,
      state: started.state,
      seq: 1,
      deadline: now + this.turnMs(),
      lastSeen: [now, now],
      winner: null,
      seasonId,
      result: null,
      createdAt: now,
      updatedAt: now,
    };
    await this.d.store.putMatch(m, null);
    await this.publish(m, started.events);
    return m;
  }

  private async load(userId: string, matchId: string): Promise<{ m: MatchRecord; me: PlayerId }> {
    const m = await this.d.store.getMatch(String(matchId));
    if (!m) throw new ServiceError('NOT_FOUND', 'Match not found.');
    const me = m.players.indexOf(userId);
    if (me < 0) throw new ServiceError('NOT_PARTICIPANT', 'You are not in this match.');
    return { m, me: me as PlayerId };
  }

  /** Applies one player action after full validation. */
  async act(userId: string, matchId: string, seq: number, action: Action): Promise<MatchView> {
    const { m, me } = await this.load(userId, matchId);
    if (m.status !== 'active' || !m.state)
      throw new ServiceError('NOT_ACTIVE', 'This match is not in progress.');
    if (seq !== m.seq)
      throw new ServiceError('STALE', 'Your game is out of date.', { view: this.viewFor(m, me, []) });
    if (!action || typeof action !== 'object' || action.player !== me)
      throw new ServiceError('WRONG_PLAYER', 'You can only act for yourself.');
    // Attack timing is client-side only, so online attacks always land normally (no claimed "perfect" hits).
    if (action.type === 'endTurn' && action.strikes !== undefined) {
      const { strikes: _ignored, ...rest } = action;
      action = rest;
    }
    const now = this.d.now();
    m.lastSeen = [...m.lastSeen];
    m.lastSeen[me] = now;
    const applied = this.apply(m, action, now);
    if (!applied.ok) throw new ServiceError('ILLEGAL', applied.error);
    if (!(await this.d.store.putMatch(applied.match, m.seq)))
      throw new ServiceError('STALE', 'Your game is out of date.', { view: this.viewFor(m, me, []) });
    await this.d.store.logAction(m.id, applied.match.seq, me, action);
    await this.afterChange(applied.match, applied.events);
    return this.viewFor(applied.match, me, applied.events);
  }

  private apply(
    m: MatchRecord,
    action: Action,
    now: number,
  ): { ok: true; match: MatchRecord; events: GameEvent[] } | { ok: false; error: string } {
    const r = applyAction(m.state!, action, this.ctx);
    if (!r.ok) return { ok: false, error: r.error.message };
    const next: MatchRecord = { ...m, state: r.state, seq: m.seq + 1, updatedAt: now };
    // A fresh timer for every new turn (and when setup finishes).
    const turnChanged = r.events.some((e) => e.type === 'turnStarted');
    if (turnChanged || r.state.phase !== m.state!.phase) next.deadline = now + this.turnMs();
    if (r.state.phase === 'ended') {
      next.status = 'ended';
      next.winner = r.state.winner;
      next.deadline = null;
    }
    return { ok: true, match: next, events: r.events };
  }

  /**
   * Called by clients every few seconds while a match is open: records that
   * they're still connected, ends a turn that ran out of time, and forfeits a
   * player who has been gone longer than the reconnect window.
   */
  async tick(userId: string, matchId: string): Promise<MatchView> {
    const loaded = await this.load(userId, matchId);
    const me = loaded.me;
    let m = loaded.m;
    const loadedSeq = m.seq;
    const now = this.d.now();
    m.lastSeen = [...m.lastSeen];
    m.lastSeen[me] = now;
    let events: GameEvent[] = [];
    const taken: { seq: number; action: Action }[] = [];
    if (m.status === 'active' && m.state) {
      const grace = BALANCE.online.reconnectGraceSeconds * 1000;
      const gone = ([0, 1] as const).find((p) => p !== me && now - m.lastSeen[p] > grace);
      const actions: Action[] = [];
      if (gone !== undefined) actions.push({ type: 'surrender', player: gone });
      else if (m.deadline !== null && now > m.deadline + DEADLINE_GRACE_MS)
        actions.push(...this.timeoutActions(m.state));
      for (const a of actions) {
        const r = this.apply(m, a, now);
        if (!r.ok) break;
        m = r.match;
        events = [...events, ...r.events];
        taken.push({ seq: m.seq, action: a });
      }
    }
    // Someone acted meanwhile: just return the fresh view (they'll tick again).
    if (!(await this.d.store.putMatch(m, loadedSeq))) return this.view(userId, matchId);
    if (taken.length > 0) {
      for (const t of taken) await this.d.store.logAction(m.id, t.seq, t.action.player, t.action);
      await this.afterChange(m, events);
    }
    return this.viewFor(m, me, events);
  }

  /** What the server does for a player whose time ran out. */
  private timeoutActions(state: GameState): Action[] {
    return playersToAct(state).map((p): Action => {
      const ps = state.players[p];
      if (state.phase === 'arrange')
        return { type: 'arrangeLandscapes', player: p, order: [...ps.landscapePool] };
      if (state.phase === 'mulligan') return { type: 'mulligan', player: p, iids: [] };
      const excess = ps.hand.length - this.ctx.balance.maxHandSize;
      return excess > 0
        ? { type: 'endTurn', player: p, discard: ps.hand.slice(-excess).map((c) => c.iid) }
        : { type: 'endTurn', player: p };
    });
  }

  async view(userId: string, matchId: string): Promise<MatchView> {
    const { m, me } = await this.load(userId, matchId);
    return this.viewFor(m, me, []);
  }

  async current(userId: string): Promise<MatchView | null> {
    const m = await this.d.store.activeMatchOf(userId);
    if (!m) return null;
    return this.viewFor(m, m.players.indexOf(userId) as PlayerId, []);
  }

  private async afterChange(m: MatchRecord, events: GameEvent[]): Promise<void> {
    if (m.status === 'ended' && m.mode === 'ranked' && !m.result) await this.finishRanked(m);
    await this.publish(m, events);
  }

  private async finishRanked(m: MatchRecord): Promise<void> {
    const seasonId = m.seasonId ?? (await this.d.store.activeSeason()).id;
    const ids = m.players as [string, string];
    const rows = await Promise.all(ids.map((id) => this.ratingRow(id, seasonId)));
    const score = (p: PlayerId) => (m.winner === 'draw' ? 0.5 : m.winner === p ? 1 : 0);
    const ratings = ([0, 1] as const).map((p) => {
      const r = rows[p]!;
      const after = updateRating(r.rating, rows[p === 0 ? 1 : 0]!.rating, score(p), r.games);
      return { before: r.rating, after, row: r };
    });
    for (const p of [0, 1] as const) {
      const { after, row } = ratings[p]!;
      await this.d.store.putRating({
        ...row,
        rating: after,
        games: row.games + 1,
        wins: row.wins + (score(p) === 1 ? 1 : 0),
        losses: row.losses + (score(p) === 0 ? 1 : 0),
        peak: Math.max(row.peak, after),
      });
      await this.grant(ids[p], score(p) === 1 ? ONLINE.rewards.rankedWin : ONLINE.rewards.rankedLoss);
    }
    m.result = {
      ratings: [
        { before: ratings[0]!.before, after: ratings[0]!.after },
        { before: ratings[1]!.before, after: ratings[1]!.after },
      ],
    };
    await this.d.store.putMatch(m, m.seq);
  }

  private viewFor(m: MatchRecord, me: PlayerId, events: GameEvent[]): MatchView {
    const view: MatchView = {
      matchId: m.id,
      mode: m.mode,
      status: m.status,
      seq: m.seq,
      you: me,
      names: m.names,
      state: m.state ? redactState(m.state, me) : null,
      events: redactEvents(events, me),
      deadline: m.deadline,
      serverNow: this.d.now(),
      winner: m.winner,
      roomCode: m.roomCode,
    };
    const r = m.result?.ratings?.[me];
    if (r) view.rating = { before: r.before, after: r.after, tier: tierOf(r.after) };
    return view;
  }

  private async publish(m: MatchRecord, events: GameEvent[]): Promise<void> {
    for (const p of [0, 1] as const) {
      const user = m.players[p];
      if (user) await this.d.store.publishView(m.id, user, this.viewFor(m, p, events));
    }
  }

  // -------------------------------------------------------------------------
  // Seasons
  // -------------------------------------------------------------------------

  /** Ends the active season (if it's over): season rewards by tier, then a soft reset. */
  async seasonRollover(force = false): Promise<{ rolled: boolean; seasonId: number }> {
    const season = await this.d.store.activeSeason();
    const now = this.d.now();
    if (!force && now < season.endsAt) return { rolled: false, seasonId: season.id };
    const next = {
      id: season.id + 1,
      name: `Season ${season.id + 1}`,
      startsAt: now,
      endsAt: now + ONLINE.rating.seasonDays * 86_400_000,
      active: true,
    };
    const rows = await this.d.store.ratingsOf(season.id);
    for (const r of rows) {
      if (r.games === 0) continue;
      const reward = (ONLINE.rewards.seasonEnd as Record<string, { coins?: number; gems?: number }>)[
        tierOf(r.rating)
      ];
      if (reward) await this.grant(r.userId, reward);
    }
    await this.d.store.startSeason(next);
    for (const r of rows) {
      if (r.games === 0) continue;
      const rating = softReset(r.rating);
      await this.d.store.putRating({
        userId: r.userId,
        seasonId: next.id,
        rating,
        games: 0,
        wins: 0,
        losses: 0,
        peak: rating,
      });
    }
    return { rolled: true, seasonId: next.id };
  }
}
