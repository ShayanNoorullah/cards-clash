import { describe, expect, it } from 'vitest';
import { applyAction, creatureAtk, creatureDef, getLegalActions } from '../../src/engine';
import {
  CTX,
  act,
  build,
  ctxWith,
  eventsOf,
  expectError,
  give,
  passRound,
  setMp,
  startedGame,
  summon,
} from '../helpers';

// Player 0 lanes: golden, golden, ember, ember. Player 1 lanes: azure, dune, dune, murk.

describe('playing creatures', () => {
  it('pays MP, enters summoning sick and emits events', () => {
    const state = startedGame({ firstPlayer: 0 });
    const iid = give(state, 0, 'golden_sprout');
    const r = act(state, { type: 'playCard', player: 0, iid, lane: 1 });
    const c = r.state.players[0].lanes[1]!.creature!;
    expect(c).toMatchObject({ iid, cardId: 'golden_sprout', summoningSick: true, damage: 0 });
    expect(r.state.players[0].mp).toBe(1);
    expect(r.state.players[0].hand.some((h) => h.iid === iid)).toBe(false);
    expect(r.events.map((e) => e.type)).toEqual(['mpChanged', 'cardPlayed', 'creatureSummoned']);
  });

  it('checks MP, hand and lane', () => {
    const state = startedGame({ firstPlayer: 0 });
    const titan = give(state, 0, 'neutral_titan');
    expectError(state, { type: 'playCard', player: 0, iid: titan, lane: 0 }, 'NOT_ENOUGH_MP');
    expectError(state, { type: 'playCard', player: 0, iid: 'ghost', lane: 0 }, 'CARD_NOT_IN_HAND');
    const sprout = give(state, 0, 'golden_sprout');
    expectError(state, { type: 'playCard', player: 0, iid: sprout, lane: 4 }, 'INVALID_LANE');
    expectError(state, { type: 'playCard', player: 0, iid: sprout }, 'INVALID_LANE');
    expectError(
      state,
      { type: 'playCard', player: 0, iid: sprout, lane: 0, target: { kind: 'hero', player: 1 } },
      'TARGET_NOT_ALLOWED',
    );
  });

  it('enforces landscape requirements', () => {
    const state = startedGame({ firstPlayer: 0 });
    setMp(state, 0, 6);
    // Haybale Knight needs 2 Golden Fields: player 0 has exactly 2.
    const knight = give(state, 0, 'golden_knight');
    expect(applyAction(state, { type: 'playCard', player: 0, iid: knight, lane: 0 }, CTX).ok).toBe(true);
    // Player 0 has no Azure Meadows.
    const wisp = give(state, 0, 'azure_wisp');
    expectError(state, { type: 'playCard', player: 0, iid: wisp, lane: 0 }, 'REQUIREMENT_NOT_MET');
    // Flipping one Golden Fields drops the count to 1.
    state.players[0].lanes[0]!.flipped = true;
    expectError(state, { type: 'playCard', player: 0, iid: knight, lane: 1 }, 'REQUIREMENT_NOT_MET');
  });

  it('cards cannot be played onto a flipped landscape', () => {
    const state = startedGame({ firstPlayer: 0 });
    state.players[0].lanes[2]!.flipped = true;
    const imp = give(state, 0, 'ember_imp');
    expectError(state, { type: 'playCard', player: 0, iid: imp, lane: 2 }, 'LANE_FLIPPED');
    expect(applyAction(state, { type: 'playCard', player: 0, iid: imp, lane: 3 }, CTX).ok).toBe(true);
  });

  it('replacing a creature discards the old one without destroying it', () => {
    const state = startedGame({ firstPlayer: 0 });
    const old = summon(state, 0, 0, 'neutral_wanderer');
    const iid = give(state, 0, 'golden_sprout');
    const r = act(state, { type: 'playCard', player: 0, iid, lane: 0 });
    expect(r.state.players[0].lanes[0]!.creature!.iid).toBe(iid);
    expect(r.state.players[0].discard.map((c) => c.iid)).toContain(old.iid);
    expect(eventsOf(r.events, 'cardReplaced')).toHaveLength(1);
    expect(eventsOf(r.events, 'creatureDestroyed')).toHaveLength(0);
  });
});

describe('buildings', () => {
  it('buff the creature in their lane and can be replaced', () => {
    const state = startedGame({ firstPlayer: 0 });
    setMp(state, 0, 6);
    const c = summon(state, 0, 2, 'ember_imp');
    const forge = give(state, 0, 'ember_forge');
    let r = act(state, { type: 'playCard', player: 0, iid: forge, lane: 2 });
    expect(creatureAtk(r.state, CTX, r.state.players[0].lanes[2]!.creature!, 2)).toBe(4);
    expect(eventsOf(r.events, 'buildingPlaced')).toHaveLength(1);

    const banner = give(r.state, 0, 'golden_banner');
    r = act(r.state, { type: 'playCard', player: 0, iid: banner, lane: 2 });
    const now = r.state.players[0].lanes[2]!.creature!;
    expect(now.iid).toBe(c.iid);
    expect(creatureAtk(r.state, CTX, now, 2)).toBe(3);
    expect(creatureDef(r.state, CTX, now, 2)).toBe(2);
    expect(r.state.players[0].discard.map((d) => d.cardId)).toContain('ember_forge');
  });

  it('losing a DEF building destroys a creature whose damage now exceeds its DEF', () => {
    const state = startedGame({ firstPlayer: 0 });
    build(state, 0, 0, 'golden_banner');
    summon(state, 0, 0, 'golden_sprout', { damage: 3 }); // 3 DEF + 1 banner = 4, 1 left
    const forge = give(state, 0, 'ember_forge');
    // Forge replaces the banner (+0 DEF) → DEF 3, damage 3 → destroyed.
    const r = act(state, { type: 'playCard', player: 0, iid: forge, lane: 0 });
    expect(r.state.players[0].lanes[0]!.creature).toBeNull();
    expect(eventsOf(r.events, 'creatureDestroyed')).toHaveLength(1);
  });
});

describe('spells', () => {
  it('go to the discard pile and resolve their effects', () => {
    const state = startedGame({ firstPlayer: 0 });
    summon(state, 1, 1, 'dune_scorpion');
    const bolt = give(state, 0, 'ember_bolt');
    const r = act(state, {
      type: 'playCard',
      player: 0,
      iid: bolt,
      target: { kind: 'creature', player: 1, lane: 1 },
    });
    expect(r.state.players[1].lanes[1]!.creature).toBeNull();
    expect(r.state.players[0].discard.map((c) => c.iid)).toContain(bolt);
    expect(r.state.players[1].discard.map((c) => c.cardId)).toContain('dune_scorpion');
  });

  it('validate chosen targets', () => {
    const state = startedGame({ firstPlayer: 0 });
    const bolt = give(state, 0, 'ember_bolt');
    expectError(state, { type: 'playCard', player: 0, iid: bolt }, 'NO_VALID_TARGET');
    summon(state, 1, 1, 'murk_slime');
    expectError(state, { type: 'playCard', player: 0, iid: bolt }, 'TARGET_REQUIRED');
    expectError(
      state,
      { type: 'playCard', player: 0, iid: bolt, target: { kind: 'creature', player: 1, lane: 0 } },
      'INVALID_TARGET',
    );
    expectError(
      state,
      { type: 'playCard', player: 0, iid: bolt, target: { kind: 'hero', player: 1 } },
      'INVALID_TARGET',
    );
    expectError(state, { type: 'playCard', player: 0, iid: bolt, lane: 1 }, 'LANE_NOT_ALLOWED');

    const blessing = give(state, 0, 'golden_blessing');
    expectError(
      state,
      { type: 'playCard', player: 0, iid: blessing, target: { kind: 'creature', player: 1, lane: 1 } },
      'INVALID_TARGET',
    );
    summon(state, 0, 0, 'golden_sprout');
    expectError(
      state,
      { type: 'playCard', player: 0, iid: blessing, target: { kind: 'creature', player: 1, lane: 1 } },
      'INVALID_TARGET',
    );
    const r = act(state, {
      type: 'playCard',
      player: 0,
      iid: blessing,
      target: { kind: 'creature', player: 0, lane: 0 },
    });
    const c = r.state.players[0].lanes[0]!.creature!;
    expect(creatureAtk(r.state, CTX, c, 0)).toBe(3);
    expect(creatureDef(r.state, CTX, c, 0)).toBe(5);
    expect(eventsOf(r.events, 'statsChanged')).toHaveLength(1);
  });

  it('debuffs can destroy a creature', () => {
    const state = startedGame({ firstPlayer: 1 });
    summon(state, 0, 0, 'azure_wisp'); // 1/2
    const hex = give(state, 1, 'murk_hex');
    const r = act(state, {
      type: 'playCard',
      player: 1,
      iid: hex,
      target: { kind: 'creature', player: 0, lane: 0 },
    });
    expect(r.state.players[0].lanes[0]!.creature).toBeNull();
  });

  it('draw, gain MP (effects may go above the per-turn max) and hero damage', () => {
    const state = startedGame({ firstPlayer: 1 });
    setMp(state, 1, 6);
    const insight = give(state, 1, 'azure_insight');
    const handBefore = state.players[1].hand.length;
    let r = act(state, { type: 'playCard', player: 1, iid: insight });
    expect(r.state.players[1].hand).toHaveLength(handBefore - 1 + 2);

    const gem = give(r.state, 1, 'neutral_mana_gem');
    r = act(r.state, { type: 'playCard', player: 1, iid: gem });
    expect(r.state.players[1].mp).toBe(5); // 4 - 1 + 2

    r.state.players[1].mp = 6;
    const gem2 = give(r.state, 1, 'neutral_mana_gem');
    r = act(r.state, { type: 'playCard', player: 1, iid: gem2 });
    expect(r.state.players[1].mp).toBe(7); // 6 - 1 + 2: gains from effects ignore the per-turn max

    const blast = give(r.state, 1, 'dune_blast');
    r = act(r.state, { type: 'playCard', player: 1, iid: blast });
    expect(r.state.players[0].hp).toBe(22);
  });

  it('area damage hits every enemy creature', () => {
    const state = startedGame({ firstPlayer: 1 });
    setMp(state, 1, 3);
    summon(state, 0, 0, 'golden_sprout'); // 1/3
    summon(state, 0, 2, 'ember_imp'); // 2/1
    summon(state, 1, 1, 'murk_slime');
    const storm = give(state, 1, 'dune_sandstorm');
    const r = act(state, { type: 'playCard', player: 1, iid: storm });
    expect(r.state.players[0].lanes[0]!.creature!.damage).toBe(2);
    expect(r.state.players[0].lanes[2]!.creature).toBeNull();
    expect(r.state.players[1].lanes[1]!.creature!.damage).toBe(0);
  });

  it('stops after the effect resolution cap', () => {
    // 1 resolution for the spell itself + 1 for the first target.
    const ctx = ctxWith({ maxEffectResolutionsPerAction: 2 });
    const state = startedGame({ firstPlayer: 1, ctx });
    setMp(state, 1, 3);
    summon(state, 0, 0, 'golden_sprout');
    summon(state, 0, 1, 'golden_sprout');
    const storm = give(state, 1, 'dune_sandstorm');
    const r = act(state, { type: 'playCard', player: 1, iid: storm }, ctx);
    expect(r.state.players[0].lanes[0]!.creature!.damage).toBe(2);
    expect(r.state.players[0].lanes[1]!.creature!.damage).toBe(0);
    expect(eventsOf(r.events, 'effectLimitReached')).toEqual([{ type: 'effectLimitReached', limit: 2 }]);
  });
});

describe('floop', () => {
  it('pays, exhausts, resolves and blocks a second use', () => {
    const state = startedGame({ firstPlayer: 1 });
    summon(state, 1, 1, 'dune_scorpion');
    summon(state, 0, 1, 'golden_sprout'); // 1/3
    const r = act(state, { type: 'floop', player: 1, lane: 1 });
    expect(r.state.players[1].mp).toBe(1);
    expect(r.state.players[1].lanes[1]!.creature!.exhausted).toBe(true);
    expect(r.state.players[0].lanes[1]!.creature!.damage).toBe(2);
    expect(r.events.map((e) => e.type)).toEqual([
      'mpChanged',
      'floop',
      'damage',
      'ultimateCharge',
      'ultimateCharge',
    ]);
    expectError(r.state, { type: 'floop', player: 1, lane: 1 }, 'EXHAUSTED');
  });

  it('an exhausted creature does not attack, and readies next turn', () => {
    let state = startedGame({ firstPlayer: 1 });
    summon(state, 1, 1, 'dune_scorpion');
    state = act(state, { type: 'floop', player: 1, lane: 1 }).state;
    const r = act(state, { type: 'endTurn', player: 1 });
    expect(eventsOf(r.events, 'attack')).toHaveLength(0);
    expect(r.state.players[0].hp).toBe(25);
    state = act(r.state, { type: 'endTurn', player: 0 }).state;
    expect(state.players[1].lanes[1]!.creature!.exhausted).toBe(false);
  });

  it('works on the turn a creature is played', () => {
    const state = startedGame({ firstPlayer: 1 });
    setMp(state, 1, 3);
    const scorp = give(state, 1, 'dune_scorpion');
    const s2 = act(state, { type: 'playCard', player: 1, iid: scorp, lane: 1 }).state;
    expect(applyAction(s2, { type: 'floop', player: 1, lane: 1 }, CTX).ok).toBe(true);
  });

  it('validates creature, ability and MP', () => {
    const state = startedGame({ firstPlayer: 1 });
    expectError(state, { type: 'floop', player: 1, lane: 0 }, 'NO_CREATURE');
    expectError(state, { type: 'floop', player: 1, lane: 9 }, 'INVALID_LANE');
    summon(state, 1, 0, 'murk_slime');
    expectError(state, { type: 'floop', player: 1, lane: 0 }, 'NO_FLOOP');
    summon(state, 1, 1, 'azure_sentinel');
    setMp(state, 1, 0);
    expectError(state, { type: 'floop', player: 1, lane: 1 }, 'NOT_ENOUGH_MP');
  });

  it('heal floops: hero heal is capped at max HP; creature heal removes damage', () => {
    const state = startedGame({ firstPlayer: 1 });
    summon(state, 1, 0, 'azure_sentinel');
    summon(state, 1, 3, 'candy_healer');
    summon(state, 1, 1, 'murk_slime', { damage: 2 });
    state.players[1].hp = 24;
    let r = act(state, { type: 'floop', player: 1, lane: 0 });
    expect(r.state.players[1].hp).toBe(25);
    expect(eventsOf(r.events, 'heal')).toEqual([
      { type: 'heal', target: { kind: 'hero', player: 1 }, amount: 1 },
    ]);
    r = act(r.state, { type: 'floop', player: 1, lane: 3 });
    expect(r.state.players[1].lanes[1]!.creature!.damage).toBe(0);
  });
});

describe('moving creatures', () => {
  it('costs 1 MP, needs an empty lane and is limited per turn', () => {
    const state = startedGame({ firstPlayer: 0 });
    summon(state, 0, 0, 'golden_sprout');
    summon(state, 0, 1, 'neutral_wanderer');
    expectError(state, { type: 'moveCreature', player: 0, from: 0, to: 1 }, 'LANE_OCCUPIED');
    expectError(state, { type: 'moveCreature', player: 0, from: 2, to: 3 }, 'NO_CREATURE');
    expectError(state, { type: 'moveCreature', player: 0, from: 0, to: 0 }, 'INVALID_LANE');
    const r = act(state, { type: 'moveCreature', player: 0, from: 0, to: 3 });
    expect(r.state.players[0].lanes[3]!.creature!.cardId).toBe('golden_sprout');
    expect(r.state.players[0].lanes[0]!.creature).toBeNull();
    expect(r.state.players[0].mp).toBe(1);
    expect(eventsOf(r.events, 'creatureMoved')[0]).toMatchObject({ from: 0, to: 3, cost: 1 });
    expectError(r.state, { type: 'moveCreature', player: 0, from: 3, to: 2 }, 'MOVE_LIMIT');
  });

  it('Swift moves for free', () => {
    const state = startedGame({ firstPlayer: 1 });
    summon(state, 1, 0, 'azure_wisp');
    const r = act(state, { type: 'moveCreature', player: 1, from: 0, to: 2 });
    expect(r.state.players[1].mp).toBe(2);
  });

  it('cannot move onto a flipped landscape or without MP', () => {
    const state = startedGame({ firstPlayer: 0 });
    summon(state, 0, 0, 'golden_sprout');
    state.players[0].lanes[3]!.flipped = true;
    expectError(state, { type: 'moveCreature', player: 0, from: 0, to: 3 }, 'LANE_FLIPPED');
    setMp(state, 0, 0);
    expectError(state, { type: 'moveCreature', player: 0, from: 0, to: 2 }, 'NOT_ENOUGH_MP');
  });

  it('the move limit resets next turn', () => {
    let state = startedGame({ firstPlayer: 0 });
    summon(state, 0, 0, 'golden_sprout');
    state = act(state, { type: 'moveCreature', player: 0, from: 0, to: 1 }).state;
    state = passRound(state);
    expect(applyAction(state, { type: 'moveCreature', player: 0, from: 1, to: 0 }, CTX).ok).toBe(true);
  });
});

describe('getLegalActions', () => {
  it('every listed action is accepted by applyAction', () => {
    const state = startedGame({ firstPlayer: 0 });
    setMp(state, 0, 6);
    summon(state, 0, 1, 'golden_sprout');
    summon(state, 1, 1, 'dune_scorpion');
    for (const id of ['ember_bolt', 'golden_blessing', 'ember_forge', 'golden_knight']) give(state, 0, id);
    const legal = getLegalActions(state, 0, CTX);
    expect(legal.length).toBeGreaterThan(10);
    for (const a of legal) expect(applyAction(state, a, CTX).ok, JSON.stringify(a)).toBe(true);
    expect(legal).toContainEqual({ type: 'endTurn', player: 0 });
    expect(legal.filter((a) => a.type === 'surrender')).toHaveLength(0);
    expect(getLegalActions(state, 0, CTX, { includeSurrender: true })).toContainEqual({
      type: 'surrender',
      player: 0,
    });
  });

  it('lists every chosen target for targeted spells', () => {
    const state = startedGame({ firstPlayer: 0 });
    state.players[0].hand = [];
    summon(state, 0, 0, 'golden_sprout');
    summon(state, 1, 2, 'murk_slime');
    const bolt = give(state, 0, 'ember_bolt');
    const plays = getLegalActions(state, 0, CTX).filter((a) => a.type === 'playCard' && a.iid === bolt);
    expect(plays).toHaveLength(2);
  });

  it('the inactive player and a finished game have no actions', () => {
    const state = startedGame({ firstPlayer: 0 });
    expect(getLegalActions(state, 1, CTX)).toEqual([]);
    const over = act(state, { type: 'surrender', player: 0 }).state;
    expect(getLegalActions(over, 0, CTX, { includeSurrender: true })).toEqual([]);
  });
});
