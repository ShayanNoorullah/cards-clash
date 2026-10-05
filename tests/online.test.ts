import { describe, expect, it } from 'vitest';
import { decide } from '../src/ai/AiPlayer';
import { getProfile } from '../src/ai/profiles';
import { createGame, getContent, getLegalActions, type Action, type PlayerId } from '../src/engine';
import { Rng } from '../src/engine/rng';
import type { MatchView, Request as GameRequest } from '../src/online/protocol';
import { handle } from '../src/online/server/http';
import { expectedScore, matchWindow, softReset, tierOf, updateRating } from '../src/online/server/rating';
import { HIDDEN_CARD, isRedactedFor, redactEvents, redactState } from '../src/online/server/redact';
import { economyOf, mergeSave } from '../src/online/server/saveSync';
import { GameService } from '../src/online/server/service';
import { MemoryStore } from '../src/online/server/store';
import { createNewSave, type SaveData } from '../src/save/saveData';

const content = getContent();
const { ctx, starterDecks } = content;
const HOUR = 3_600_000;

// ---------------------------------------------------------------------------
// A tiny in-process "server" with a fake clock and two-or-more clients.
// ---------------------------------------------------------------------------

function makeServer(start = Date.UTC(2026, 9, 2)) {
  const clock = { t: start };
  const store = new MemoryStore(start);
  const rng = new Rng('server');
  let ids = 0;
  const service = new GameService({
    store,
    content,
    now: () => clock.t,
    random: () => rng.next(),
    newId: () => `m${++ids}`,
  });
  const deps = {
    service,
    auth: async (req: Request) => {
      const token = req.headers.get('authorization')?.replace('Bearer ', '');
      return token && token !== 'anon' ? { userId: token } : null;
    },
    isAdmin: (req: Request) => req.headers.get('authorization') === 'Bearer service-role',
  };
  const call = async (user: string, body: GameRequest | Record<string, unknown>) => {
    const res = await handle(
      new Request('http://local/game', {
        method: 'POST',
        headers: { authorization: `Bearer ${user}`, 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }),
      deps,
    );
    return {
      status: res.status,
      body: (await res.json()) as Record<string, unknown> & { ok: boolean; code?: string },
    };
  };
  return { clock, store, service, call };
}

function honestSave(now: number): SaveData {
  return createNewSave(content, now - 2 * HOUR);
}

describe('hidden information', () => {
  it('redacts the opponent hand, both decks and the RNG', () => {
    const { state, events } = createGame({ seed: 'r', decks: [starterDecks[0]!, starterDecks[1]!] }, ctx);
    const v = redactState(state, 0);
    expect(v.players[0].hand).toEqual(state.players[0].hand);
    expect(v.players[1].hand.every((c) => c.cardId === HIDDEN_CARD)).toBe(true);
    expect(v.players[1].hand).toHaveLength(state.players[1].hand.length);
    expect(v.players[0].deck.every((c) => c.cardId === HIDDEN_CARD)).toBe(true);
    expect(v.players[0].deck).toHaveLength(state.players[0].deck.length);
    expect(isRedactedFor(v, 0)).toBe(true);
    expect(JSON.stringify(v)).not.toContain(state.players[1].hand[0]!.iid + '"');
    expect(state.players[1].hand[0]!.cardId).not.toBe(HIDDEN_CARD); // original untouched
    const draws = redactEvents(
      [{ type: 'cardDrawn', player: 1, iid: 'c9', cardId: 'neutral_titan' }, ...events],
      0,
    );
    expect(draws[0]).toMatchObject({ type: 'cardDrawn', cardId: HIDDEN_CARD });
  });
});

describe('rating', () => {
  it('is zero-sum-ish Elo with faster movement for new players', () => {
    expect(expectedScore(1000, 1000)).toBeCloseTo(0.5);
    const up = updateRating(1000, 1000, 1, 0);
    const down = updateRating(1000, 1000, 0, 0);
    expect(up - 1000).toBe(1000 - down);
    expect(updateRating(1000, 1000, 1, 50) - 1000).toBeLessThan(up - 1000);
    expect(updateRating(1400, 1000, 1, 50) - 1400).toBeLessThan(updateRating(1000, 1400, 1, 50) - 1000);
    expect(softReset(1600)).toBe(1300);
    expect(softReset(800)).toBe(900);
    expect([tierOf(0), tierOf(1150), tierOf(1999)]).toEqual(['Bronze', 'Silver', 'Legend']);
    expect(matchWindow(0)).toBe(100);
    expect(matchWindow(1000)).toBe(500);
  });
});

describe('cloud save merge', () => {
  const now = Date.UTC(2026, 9, 2);

  it('accepts honest progress and refuses an edited economy on first upload', () => {
    const honest = honestSave(now);
    honest.currencies.coins += 300;
    const ok = mergeSave(null, { save: honest, baseVersion: null, base: null }, now, content);
    expect(ok.flags).toEqual([]);
    expect(ok.save.currencies.coins).toBe(honest.currencies.coins);
    const cheat = honestSave(now);
    cheat.currencies.coins = 1_000_000;
    cheat.currencies.gems = 99_999;
    const r = mergeSave(null, { save: cheat, baseVersion: null, base: null }, now, content);
    expect(r.save.currencies.coins).toBeLessThan(10_000);
    expect(r.save.currencies.gems).toBeLessThan(1_000);
    expect(r.flags.join(' ')).toMatch(/coins.*refused[\s\S]*gems.*refused/);
  });

  it('merges spending and earning from two devices', () => {
    const first = mergeSave(null, { save: honestSave(now), baseVersion: null, base: null }, now, content);
    const stored = { data: first.save, version: first.version, syncedAt: now };
    // Device A spends 100 Coins; device B (same base) earns 50.
    const a = structuredClone(first.save);
    a.currencies.coins -= 100;
    a.updatedAt = now + 10;
    const afterA = mergeSave(
      stored,
      { save: a, baseVersion: first.version, base: first.base },
      now + HOUR,
      content,
    );
    const b = structuredClone(first.save);
    b.currencies.coins += 50;
    b.updatedAt = now + 5;
    const afterB = mergeSave(
      { data: afterA.save, version: afterA.version, syncedAt: now + HOUR },
      { save: b, baseVersion: first.version, base: first.base },
      now + 2 * HOUR,
      content,
    );
    expect(afterB.save.currencies.coins).toBe(first.save.currencies.coins - 100 + 50);
    expect(afterB.version).toBe(3);
  });

  it('caps new card copies, keeps lifetime stats monotonic, and sanitises garbage', () => {
    const first = mergeSave(null, { save: honestSave(now), baseVersion: null, base: null }, now, content);
    const stored = { data: first.save, version: first.version, syncedAt: now };
    const c = structuredClone(first.save);
    for (const card of ctx.cards.all.filter((x) => !x.token)) c.collection[card.id] = { count: 3, level: 5 };
    c.lifetime.wins = 2;
    const r = mergeSave(stored, { save: c, baseVersion: 1, base: first.base }, now + HOUR, content);
    const total = (s: SaveData) => Object.values(s.collection).reduce((n, x) => n + x.count, 0);
    expect(total(r.save) - total(first.save)).toBeLessThanOrEqual(60);
    expect(r.flags.some((f) => f.startsWith('cards'))).toBe(true);
    expect(Object.values(r.save.collection).every((x) => x.level <= 3)).toBe(true);
    expect(r.save.lifetime.wins).toBe(2);
    const junk = mergeSave(
      stored,
      { save: { version: 5, currencies: { coins: 'lots' } } as never, baseVersion: 1, base: first.base },
      now,
      content,
    );
    expect(junk.save.currencies.coins).toBeGreaterThanOrEqual(0);
    expect(economyOf(junk.save).coins).toBe(junk.save.currencies.coins);
  });
});

describe('online matches through the game function', () => {
  async function syncAll(srv: ReturnType<typeof makeServer>, users: string[]) {
    for (const u of users) {
      const r = await srv.call(u, {
        op: 'sync',
        save: honestSave(srv.clock.t),
        baseVersion: null,
        base: null,
      });
      expect(r.body.ok).toBe(true);
    }
  }

  /** Plays a match to the end: each side decides from the true state, but acts only through the API. */
  async function playOut(srv: ReturnType<typeof makeServer>, matchId: string) {
    const views: Record<string, MatchView> = {};
    for (let i = 0; i < 600; i++) {
      const m = (await srv.store.getMatch(matchId))!;
      if (m.status !== 'active') return m;
      const p = (await import('../src/engine')).playersToAct(m.state!)[0]!;
      const user = m.players[p]!;
      const v = (await srv.call(user, { op: 'view', matchId })).body.view as MatchView;
      views[user] = v;
      // The client sees only a redacted state, yet computes the same legal actions as the server.
      expect(isRedactedFor(v.state!, p)).toBe(true);
      if (m.state!.phase === 'main')
        expect(getLegalActions(v.state!, p, ctx).length).toBe(getLegalActions(m.state!, p, ctx).length);
      const action = decide(m.state!, p, ctx, getProfile('easy')).action;
      const r = await srv.call(user, { op: 'act', matchId, seq: v.seq, action });
      expect(r.body.ok, JSON.stringify(r.body)).toBe(true);
      srv.clock.t += 2000;
    }
    throw new Error('match did not finish');
  }

  it('pairs two ranked players, plays a full match, updates ratings and grants rewards server-side', async () => {
    const srv = makeServer();
    await syncAll(srv, ['ann', 'bob']);
    const a = await srv.call('ann', { op: 'queue', deck: starterDecks[0]! });
    expect(a.body).toMatchObject({ ok: true, status: 'queued' });
    const b = await srv.call('bob', { op: 'queue', deck: starterDecks[5]! });
    expect(b.body).toMatchObject({ ok: true, status: 'matched' });
    const matchId = b.body.matchId as string;
    expect((await srv.call('ann', { op: 'queueStatus' })).body).toMatchObject({ status: 'matched', matchId });
    const coinsBefore =
      (await srv.store.getSave('ann'))!.data.currencies.coins +
      (await srv.store.getSave('bob'))!.data.currencies.coins;

    const end = await playOut(srv, matchId);
    expect(end.status).toBe('ended');
    const winnerUser = end.winner === 'draw' ? null : end.players[end.winner as PlayerId]!;
    const season = await srv.store.activeSeason();
    const ra = (await srv.store.getRating('ann', season.id))!;
    const rb = (await srv.store.getRating('bob', season.id))!;
    expect(ra.games).toBe(1);
    expect(rb.games).toBe(1);
    if (winnerUser) {
      const w = winnerUser === 'ann' ? ra : rb;
      const l = winnerUser === 'ann' ? rb : ra;
      expect(w.rating).toBeGreaterThan(1000);
      expect(l.rating).toBeLessThan(1000);
    }
    const coinsAfter =
      (await srv.store.getSave('ann'))!.data.currencies.coins +
      (await srv.store.getSave('bob'))!.data.currencies.coins;
    expect(coinsAfter - coinsBefore).toBe(winnerUser ? 80 : 40);
    const finalView = (await srv.call('ann', { op: 'view', matchId })).body.view as MatchView;
    expect(finalView.status).toBe('ended');
    expect(finalView.rating?.after).toBe(ra.rating);
    // Every action was logged for audit.
    expect(srv.store.actions.filter((x) => x.matchId === matchId).length).toBeGreaterThan(4);
  }, 60_000);

  it('rejects cheating attempts', async () => {
    const srv = makeServer();
    await syncAll(srv, ['ann', 'bob']);
    expect((await srv.call('anon', { op: 'profile' })).status).toBe(401);
    expect((await srv.call('ann', { op: 'seasonRollover' })).status).toBe(403);
    // Decks: illegal, and cards not owned in Ranked.
    const bad = { ...starterDecks[0]!, cards: Array(40).fill('golden_barley_king') };
    expect((await srv.call('ann', { op: 'queue', deck: bad })).body.code).toBe('DECK_INVALID');
    const owned = createNewSave(content, 0).collection;
    const missing = ctx.cards.all.find((c) => !c.token && !owned[c.id] && c.rarity === 'common')!.id;
    const unowned = { ...starterDecks[0]!, cards: [...starterDecks[0]!.cards.slice(0, 39), missing] };
    expect((await srv.call('ann', { op: 'queue', deck: unowned })).body.code).toBe('NOT_OWNED');
    expect((await srv.call('carl', { op: 'queue', deck: starterDecks[0]! })).body.code).toBe('NOT_OWNED');

    await srv.call('ann', { op: 'queue', deck: starterDecks[0]! });
    const matchId = (await srv.call('bob', { op: 'queue', deck: starterDecks[1]! })).body.matchId as string;
    const m = (await srv.store.getMatch(matchId))!;
    const annSeat = m.players.indexOf('ann') as PlayerId;
    const bobSeat = (1 - annSeat) as PlayerId;
    // Acting for the other player.
    const forOther: Action = {
      type: 'arrangeLandscapes',
      player: bobSeat,
      order: [...m.state!.players[bobSeat].landscapePool],
    };
    expect((await srv.call('ann', { op: 'act', matchId, seq: m.seq, action: forOther })).body.code).toBe(
      'WRONG_PLAYER',
    );
    // Illegal action (ending a turn during setup).
    expect(
      (
        await srv.call('ann', {
          op: 'act',
          matchId,
          seq: m.seq,
          action: { type: 'endTurn', player: annSeat },
        })
      ).body.code,
    ).toBe('ILLEGAL');
    // Stale / replayed sequence numbers.
    const arrange: Action = {
      type: 'arrangeLandscapes',
      player: annSeat,
      order: [...m.state!.players[annSeat].landscapePool],
    };
    expect((await srv.call('ann', { op: 'act', matchId, seq: m.seq + 5, action: arrange })).body.code).toBe(
      'STALE',
    );
    expect((await srv.call('ann', { op: 'act', matchId, seq: m.seq, action: arrange })).body.ok).toBe(true);
    expect((await srv.call('ann', { op: 'act', matchId, seq: m.seq, action: arrange })).body.code).toBe(
      'STALE',
    );
    // Strangers can't read or act.
    expect((await srv.call('eve', { op: 'view', matchId })).body.code).toBe('NOT_PARTICIPANT');
    // The opponent's hand never leaves the server.
    const view = (await srv.call('ann', { op: 'view', matchId })).body.view as MatchView;
    const real = (await srv.store.getMatch(matchId))!.state!;
    const bobHand = real.players[bobSeat].hand.map((c) => c.cardId);
    expect(view.state!.players[bobSeat].hand.every((c) => c.cardId === HIDDEN_CARD)).toBe(true);
    expect(bobHand.some((id) => id !== HIDDEN_CARD)).toBe(true);
    // A forged save can't mint currency.
    const forged = structuredClone((await srv.store.getSave('ann'))!.data);
    forged.currencies.gems = 1_000_000;
    forged.updatedAt = srv.clock.t + 1;
    const synced = await srv.call('ann', { op: 'sync', save: forged, baseVersion: 1, base: null });
    expect((synced.body.save as SaveData).currencies.gems).toBeLessThan(500);
    expect((synced.body.flags as string[]).length).toBeGreaterThan(0);
  });

  it('auto-ends a turn after the timer, and forfeits a player who disconnects', async () => {
    const srv = makeServer();
    await syncAll(srv, ['ann', 'bob']);
    const { matchId } = (await srv.call('ann', { op: 'createRoom', deck: starterDecks[0]! }))
      .body as unknown as { matchId: string };
    const code = (await srv.store.getMatch(matchId))!.roomCode!;
    expect((await srv.call('ann', { op: 'joinRoom', code, deck: starterDecks[1]! })).body.code).toBe(
      'BAD_REQUEST',
    );
    expect(
      (await srv.call('bob', { op: 'joinRoom', code: 'ZZZZZZ', deck: starterDecks[1]! })).body.code,
    ).toBe('NOT_FOUND');
    expect(
      (await srv.call('bob', { op: 'joinRoom', code: code.toLowerCase(), deck: starterDecks[1]! })).body.ok,
    ).toBe(true);
    // Both clients tick every 15 s; nobody acts. Setup times out step by step.
    const both = async (seconds: number) => {
      for (let t = 0; t < seconds; t += 15) {
        srv.clock.t += 15_000;
        await srv.call('ann', { op: 'tick', matchId });
        await srv.call('bob', { op: 'tick', matchId });
      }
    };
    await both(150);
    let v = (await srv.call('ann', { op: 'view', matchId })).body.view as MatchView;
    expect(v.state!.phase).toBe('main');
    expect(v.status).toBe('active');
    const turn = v.state!.turn;
    // The active player idles past the timer: their turn is ended for them.
    await both(75);
    v = (await srv.call('bob', { op: 'view', matchId })).body.view as MatchView;
    expect(v.state!.turn).toBeGreaterThan(turn);
    // Bob vanishes for longer than the reconnect window: Ann's tick forfeits him.
    for (let i = 0; i < 4; i++) {
      srv.clock.t += 20_000;
      await srv.call('ann', { op: 'tick', matchId });
    }
    const end = (await srv.store.getMatch(matchId))!;
    expect(end.status).toBe('ended');
    expect(end.winner).toBe(end.players.indexOf('ann'));
    expect(end.state!.endReason).toBe('surrender');
    // Friendly matches don't touch ratings.
    expect(await srv.store.getRating('ann', 1)).toBeNull();
  });

  it('rolls the season over: rewards by tier and a soft reset', async () => {
    const srv = makeServer();
    await syncAll(srv, ['ann']);
    await srv.store.putRating({
      userId: 'ann',
      seasonId: 1,
      rating: 1600,
      games: 30,
      wins: 20,
      losses: 10,
      peak: 1650,
    });
    const gems = (await srv.store.getSave('ann'))!.data.currencies.gems;
    const early = await srv.call('service-role', { op: 'seasonRollover' });
    expect(early.body).toMatchObject({ ok: true, rolled: false });
    srv.clock.t += 43 * 86_400_000;
    const r = await srv.call('service-role', { op: 'seasonRollover' });
    expect(r.body).toMatchObject({ ok: true, rolled: true, seasonId: 2 });
    expect((await srv.store.getRating('ann', 2))!.rating).toBe(1300);
    expect((await srv.store.getSave('ann'))!.data.currencies.gems).toBe(gems + 40);
  });
});
