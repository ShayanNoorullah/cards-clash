import { describe, expect, it } from 'vitest';
import { mpForTurn, other } from '../../src/engine';
import { CTX, act, ctxWith, eventsOf, expectError, give, passRound, setMp, startedGame } from '../helpers';

describe('magic points', () => {
  it('turn 1 gives 2 MP, +1 per own turn, capped at 6', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 10].map((t) => mpForTurn(t, CTX))).toEqual([2, 3, 4, 5, 6, 6, 6, 6]);
  });

  it('MP refreshes each turn and unspent MP is lost', () => {
    let state = startedGame({ firstPlayer: 0 });
    const seen: number[] = [];
    for (let i = 0; i < 7; i++) {
      seen.push(state.players[0].mp);
      state = passRound(state);
    }
    expect(seen).toEqual([2, 3, 4, 5, 6, 6, 6]);

    const r = act(state, { type: 'endTurn', player: 0 });
    expect(r.state.players[0].mp).toBe(0);
  });

  it('the second player also starts at 2 MP', () => {
    const state = startedGame({ firstPlayer: 0 });
    const next = act(state, { type: 'endTurn', player: 0 }).state;
    expect(next.activePlayer).toBe(1);
    expect(next.players[1].mp).toBe(2);
  });
});

describe('drawing', () => {
  it('the first player skips the draw on turn 1; everyone draws 1 afterwards', () => {
    let state = startedGame({ firstPlayer: 0 });
    expect(state.players[0].hand).toHaveLength(5);
    const r = act(state, { type: 'endTurn', player: 0 });
    state = r.state;
    expect(state.players[1].hand).toHaveLength(7);
    expect(eventsOf(r.events, 'cardDrawn').map((e) => e.player)).toEqual([1]);
    state = act(state, { type: 'endTurn', player: 1 }).state;
    expect(state.players[0].hand).toHaveLength(6);
  });

  it('first-turn draw skipping can be switched off in balance', () => {
    const ctx = ctxWith({ firstPlayerSkipsFirstDraw: false });
    const state = startedGame({ firstPlayer: 0, ctx });
    expect(state.players[0].hand).toHaveLength(6);
  });

  it('empty deck: the draw becomes 2 fatigue damage', () => {
    const state = startedGame({ firstPlayer: 0 });
    state.players[1].deck = [];
    const r = act(state, { type: 'endTurn', player: 0 });
    expect(r.state.players[1].hp).toBe(23);
    expect(eventsOf(r.events, 'fatigue')).toEqual([{ type: 'fatigue', player: 1, damage: 2 }]);
  });

  it('fatigue can end the game', () => {
    const state = startedGame({ firstPlayer: 0 });
    state.players[1].deck = [];
    state.players[1].hp = 2;
    const r = act(state, { type: 'endTurn', player: 0 });
    expect(r.state.phase).toBe('ended');
    expect(r.state.winner).toBe(0);
  });

  it('buy draw: costs 1 MP, once per turn, needs cards in the deck', () => {
    const state = startedGame({ firstPlayer: 0 });
    const r = act(state, { type: 'buyDraw', player: 0 });
    expect(r.state.players[0].mp).toBe(1);
    expect(r.state.players[0].hand).toHaveLength(6);
    expectError(r.state, { type: 'buyDraw', player: 0 }, 'DRAW_LIMIT');

    const broke = startedGame({ firstPlayer: 0 });
    setMp(broke, 0, 0);
    expectError(broke, { type: 'buyDraw', player: 0 }, 'NOT_ENOUGH_MP');

    const empty = startedGame({ firstPlayer: 0 });
    empty.players[0].deck = [];
    expectError(empty, { type: 'buyDraw', player: 0 }, 'DECK_EMPTY');
  });

  it('the buy-draw limit resets each turn', () => {
    let state = startedGame({ firstPlayer: 0 });
    state = act(state, { type: 'buyDraw', player: 0 }).state;
    state = passRound(state);
    expect(act(state, { type: 'buyDraw', player: 0 }).state.players[0].extraDrawsThisTurn).toBe(1);
  });
});

describe('end phase', () => {
  it('discards down to 8, newest cards first by default', () => {
    const state = startedGame({ firstPlayer: 0 });
    const extra = [
      give(state, 0, 'golden_sprout'),
      give(state, 0, 'golden_sprout'),
      give(state, 0, 'ember_imp'),
      give(state, 0, 'ember_bolt'),
      give(state, 0, 'neutral_titan'),
    ];
    expect(state.players[0].hand).toHaveLength(10);
    const r = act(state, { type: 'endTurn', player: 0 });
    expect(r.state.players[0].hand).toHaveLength(8);
    expect(eventsOf(r.events, 'cardDiscarded').map((e) => e.iid)).toEqual([extra[4], extra[3]]);
  });

  it('honours the chosen discards', () => {
    const state = startedGame({ firstPlayer: 0 });
    for (let i = 0; i < 5; i++) give(state, 0, 'golden_sprout');
    const oldest = state.players[0].hand.slice(0, 2).map((c) => c.iid);
    const r = act(state, { type: 'endTurn', player: 0, discard: oldest });
    expect(eventsOf(r.events, 'cardDiscarded').map((e) => e.iid)).toEqual(oldest);
    expect(r.state.players[0].discard.map((c) => c.iid)).toEqual(oldest);
  });

  it('does not discard when at or below the limit, and rejects bad discard lists', () => {
    const state = startedGame({ firstPlayer: 0 });
    const r = act(state, { type: 'endTurn', player: 0, discard: [state.players[0].hand[0]!.iid] });
    expect(eventsOf(r.events, 'cardDiscarded')).toHaveLength(0);
    expectError(state, { type: 'endTurn', player: 0, discard: ['ghost'] }, 'CARD_NOT_IN_HAND');
    const iid = state.players[0].hand[0]!.iid;
    expectError(state, { type: 'endTurn', player: 0, discard: [iid, iid] }, 'INVALID_DISCARD');
  });
});

describe('turn order and win conditions', () => {
  it('only the active player may act in the main phase', () => {
    const state = startedGame({ firstPlayer: 0 });
    expectError(state, { type: 'endTurn', player: 1 }, 'NOT_YOUR_TURN');
    expectError(state, { type: 'buyDraw', player: 1 }, 'NOT_YOUR_TURN');
  });

  it('turns alternate and phases are announced in order', () => {
    const state = startedGame({ firstPlayer: 1 });
    const r = act(state, { type: 'endTurn', player: 1 });
    expect(r.state.activePlayer).toBe(0);
    expect(r.state.turn).toBe(2);
    const phases = eventsOf(r.events, 'phase').map((e) => `${e.player}:${e.phase}`);
    expect(phases).toEqual(['1:combat', '1:end', '0:start', '0:draw', '0:main']);
  });

  it('surrender ends the game at any phase', () => {
    const state = startedGame({ firstPlayer: 0 });
    const r = act(state, { type: 'surrender', player: 1 });
    expect(r.state).toMatchObject({ phase: 'ended', winner: 0, endReason: 'surrender' });
    expect(eventsOf(r.events, 'gameEnded')).toEqual([{ type: 'gameEnded', winner: 0, reason: 'surrender' }]);
    expectError(r.state, { type: 'endTurn', player: 0 }, 'GAME_OVER');
    expectError(r.state, { type: 'surrender', player: 0 }, 'GAME_OVER');
  });

  it('the turn limit ends the game in a draw', () => {
    const ctx = ctxWith({ maxTurns: 4 });
    let state = startedGame({ firstPlayer: 0, ctx });
    for (let i = 0; i < 3; i++)
      state = act(state, { type: 'endTurn', player: state.activePlayer }, ctx).state;
    expect(state.turn).toBe(4);
    const r = act(state, { type: 'endTurn', player: state.activePlayer }, ctx);
    expect(r.state).toMatchObject({ phase: 'ended', winner: 'draw', endReason: 'turnLimit' });
  });

  it('other() flips players', () => {
    expect(other(0)).toBe(1);
    expect(other(1)).toBe(0);
  });
});
