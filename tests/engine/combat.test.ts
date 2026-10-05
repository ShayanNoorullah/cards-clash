import { describe, expect, it } from 'vitest';
import { attackingLanes } from '../../src/engine';
import { act, build, CTX, eventsOf, expectError, give, passRound, startedGame, summon } from '../helpers';

describe('combat', () => {
  it('an unblocked creature hits the enemy Hero', () => {
    const state = startedGame({ firstPlayer: 0 });
    summon(state, 0, 1, 'neutral_wanderer'); // 2 ATK
    const r = act(state, { type: 'endTurn', player: 0 });
    expect(r.state.players[1].hp).toBe(23);
    expect(eventsOf(r.events, 'attack')).toEqual([
      { type: 'attack', player: 0, lane: 1, iid: expect.any(String), target: { kind: 'hero', player: 1 } },
    ]);
  });

  it('a blocked creature damages the defender, which does not strike back', () => {
    const state = startedGame({ firstPlayer: 0 });
    summon(state, 0, 0, 'neutral_wanderer'); // 2/2
    summon(state, 1, 0, 'azure_sentinel'); // 1/6
    const r = act(state, { type: 'endTurn', player: 0 });
    expect(r.state.players[1].lanes[0]!.creature!.damage).toBe(2);
    expect(r.state.players[0].lanes[0]!.creature!.damage).toBe(0);
    expect(r.state.players[1].hp).toBe(25);
  });

  it('a creature reduced to 0 DEF is destroyed and goes to the discard pile', () => {
    const state = startedGame({ firstPlayer: 0 });
    summon(state, 0, 2, 'ember_brute'); // 5/3
    const victim = summon(state, 1, 2, 'murk_slime'); // 3/3
    const r = act(state, { type: 'endTurn', player: 0 });
    expect(r.state.players[1].lanes[2]!.creature).toBeNull();
    expect(r.state.players[1].discard.map((c) => c.iid)).toContain(victim.iid);
    expect(eventsOf(r.events, 'creatureDestroyed')).toEqual([
      { type: 'creatureDestroyed', player: 1, iid: victim.iid, cardId: 'murk_slime', lane: 2 },
    ]);
  });

  it('damage persists between turns', () => {
    let state = startedGame({ firstPlayer: 0 });
    summon(state, 0, 0, 'golden_sprout'); // 1 ATK
    summon(state, 1, 0, 'azure_sentinel'); // 1/6, but player 1 attacks back on its own turn
    state = passRound(state);
    expect(state.players[1].lanes[0]!.creature!.damage).toBe(1);
    const r = act(state, { type: 'endTurn', player: 0 });
    expect(r.state.players[1].lanes[0]!.creature!.damage).toBe(2);
  });

  it('attacks resolve left to right', () => {
    const state = startedGame({ firstPlayer: 0 });
    summon(state, 0, 3, 'golden_sprout');
    summon(state, 0, 0, 'neutral_wanderer');
    summon(state, 0, 2, 'ember_imp');
    const r = act(state, { type: 'endTurn', player: 0 });
    expect(eventsOf(r.events, 'attack').map((e) => e.lane)).toEqual([0, 2, 3]);
    expect(r.state.players[1].hp).toBe(25 - 2 - 2 - 1);
  });

  it('summoning sickness: no attack the turn a creature is played', () => {
    let state = startedGame({ firstPlayer: 0 });
    const iid = give(state, 0, 'neutral_wanderer');
    state = act(state, { type: 'playCard', player: 0, iid, lane: 0 }).state;
    let r = act(state, { type: 'endTurn', player: 0 });
    expect(eventsOf(r.events, 'attack')).toHaveLength(0);
    r = act(r.state, { type: 'endTurn', player: 1 });
    expect(r.state.players[0].lanes[0]!.creature!.summoningSick).toBe(false);
    r = act(r.state, { type: 'endTurn', player: 0 });
    expect(eventsOf(r.events, 'attack')).toHaveLength(1);
  });

  it('Rush creatures attack the turn they are played', () => {
    let state = startedGame({ firstPlayer: 0 });
    const iid = give(state, 0, 'ember_imp');
    state = act(state, { type: 'playCard', player: 0, iid, lane: 3 }).state;
    const r = act(state, { type: 'endTurn', player: 0 });
    expect(r.state.players[1].hp).toBe(23);
  });

  it('creatures with 0 ATK do not attack', () => {
    const state = startedGame({ firstPlayer: 0 });
    summon(state, 0, 0, 'golden_sprout', { atkMod: -1 });
    const r = act(state, { type: 'endTurn', player: 0 });
    expect(eventsOf(r.events, 'attack')).toHaveLength(0);
  });

  it('buildings add to combat damage', () => {
    const state = startedGame({ firstPlayer: 0 });
    summon(state, 0, 2, 'ember_imp'); // 2 ATK
    build(state, 0, 2, 'ember_forge'); // +2
    const r = act(state, { type: 'endTurn', player: 0 });
    expect(r.state.players[1].hp).toBe(21);
  });

  it('lethal combat damage ends the game immediately and stops later attacks', () => {
    const state = startedGame({ firstPlayer: 0 });
    state.players[1].hp = 2;
    summon(state, 0, 0, 'neutral_wanderer');
    summon(state, 0, 1, 'neutral_wanderer');
    const r = act(state, { type: 'endTurn', player: 0 });
    expect(r.state).toMatchObject({ phase: 'ended', winner: 0, endReason: 'heroDefeated' });
    expect(r.state.players[1].hp).toBe(0);
    expect(eventsOf(r.events, 'attack')).toHaveLength(1);
    expect(eventsOf(r.events, 'turnStarted')).toHaveLength(0);
  });

  it('dealing and taking damage charges both Ultimates (1 damage = 10%)', () => {
    const state = startedGame({ firstPlayer: 0 });
    summon(state, 0, 1, 'neutral_wanderer');
    summon(state, 0, 0, 'golden_sprout');
    summon(state, 1, 0, 'azure_sentinel');
    const r = act(state, { type: 'endTurn', player: 0 });
    expect(r.state.players[0].ultimateCharge).toBe(30);
    expect(r.state.players[1].ultimateCharge).toBe(30);
  });

  it('Ultimate charge caps at 100%', () => {
    const state = startedGame({ firstPlayer: 0 });
    state.players[0].ultimateCharge = 95;
    summon(state, 0, 1, 'neutral_wanderer');
    const r = act(state, { type: 'endTurn', player: 0 });
    expect(r.state.players[0].ultimateCharge).toBe(100);
  });

  describe('attack timing', () => {
    it('a perfect strike doubles the damage', () => {
      const state = startedGame({ firstPlayer: 0 });
      summon(state, 0, 1, 'neutral_wanderer'); // 2 ATK
      const r = act(state, { type: 'endTurn', player: 0, strikes: [null, 'perfect'] });
      expect(r.state.players[1].hp).toBe(21);
      expect(eventsOf(r.events, 'attack')[0]).toMatchObject({ lane: 1, roll: 'perfect' });
    });

    it('a miss deals no damage and draws no retaliation', () => {
      const state = startedGame({ firstPlayer: 0 });
      summon(state, 0, 0, 'neutral_wanderer');
      summon(state, 1, 0, 'azure_sentinel');
      const r = act(state, { type: 'endTurn', player: 0, strikes: ['miss'] });
      expect(r.state.players[1].lanes[0]!.creature!.damage).toBe(0);
      expect(eventsOf(r.events, 'damage')).toEqual([]);
      expect(eventsOf(r.events, 'attack')[0]).toMatchObject({ lane: 0, roll: 'miss' });
    });

    it('a normal hit is the default and adds no roll to the event', () => {
      const state = startedGame({ firstPlayer: 0 });
      summon(state, 0, 1, 'neutral_wanderer');
      const r = act(state, { type: 'endTurn', player: 0, strikes: [null, 'hit'] });
      expect(r.state.players[1].hp).toBe(23);
      expect(eventsOf(r.events, 'attack')[0]).not.toHaveProperty('roll');
    });

    it('rejects malformed timing results', () => {
      const state = startedGame({ firstPlayer: 0 });
      expectError(state, { type: 'endTurn', player: 0, strikes: ['crit' as never] }, 'INVALID_STRIKES');
      expectError(
        state,
        { type: 'endTurn', player: 0, strikes: [null, null, null, null, 'hit'] },
        'INVALID_STRIKES',
      );
    });

    it('lists the lanes that will attack', () => {
      const state = startedGame({ firstPlayer: 0 });
      summon(state, 0, 1, 'neutral_wanderer');
      summon(state, 0, 3, 'golden_sprout');
      expect(attackingLanes(state, CTX, 0)).toEqual([1, 3]);
    });
  });
});
