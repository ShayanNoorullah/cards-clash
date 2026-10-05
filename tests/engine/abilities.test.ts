import { describe, expect, it } from 'vitest';
import {
  applyAction,
  countLandscapes,
  creatureAtk,
  creatureDef,
  spellPower,
  type GameState,
} from '../../src/engine';
import { LAB_CTX, RCTX, realGame } from '../contentHelpers';
import { act, eventsOf, expectError, give, setMp, summon } from '../helpers';

const end = (s: GameState, ctx = RCTX) => act(s, { type: 'endTurn', player: s.activePlayer }, ctx);
const play = (
  s: GameState,
  player: 0 | 1,
  cardId: string,
  extra: Record<string, unknown> = {},
  ctx = RCTX,
) => {
  setMp(s, player, 6);
  const iid = give(s, player, cardId);
  return act(s, { type: 'playCard', player, iid, ...extra }, ctx);
};

describe('triggers', () => {
  it('On Play', () => {
    const r = play(realGame({ firstPlayer: 0 }), 0, 'dune_sand_imp', { lane: 2 });
    expect(r.state.players[1].hp).toBe(24);
    expect(eventsOf(r.events, 'triggered')[0]).toMatchObject({ trigger: 'onPlay', cardId: 'dune_sand_imp' });
  });

  it('On Play with a chosen target, which fizzles when nothing can be chosen', () => {
    const s = realGame({ firstPlayer: 0 });
    s.players[0].lanes[0]!.landscape = 'azure';
    s.players[0].lanes[1]!.landscape = 'azure';
    s.players[0].lanes[2]!.landscape = 'azure';
    summon(s, 1, 3, 'neutral_sellsword');
    setMp(s, 0, 6);
    const q = give(s, 0, 'azure_queen_ysolde');
    expectError(s, { type: 'playCard', player: 0, iid: q, lane: 0 }, 'TARGET_REQUIRED', RCTX);
    const r = act(
      s,
      { type: 'playCard', player: 0, iid: q, lane: 0, target: { kind: 'creature', player: 1, lane: 3 } },
      RCTX,
    );
    expect(r.state.players[1].lanes[3]!.creature).toBeNull();
    expect(r.state.players[1].hand.map((c) => c.cardId)).toContain('neutral_sellsword');

    const empty = realGame({ firstPlayer: 0 });
    for (const l of empty.players[0].lanes.slice(0, 3)) l.landscape = 'azure';
    expect(
      play(empty, 0, 'azure_queen_ysolde', { lane: 0 }).state.players[0].lanes[0]!.creature,
    ).not.toBeNull();
  });

  it('On Destroy uses the lane the creature died in', () => {
    const s = realGame({ firstPlayer: 0 });
    summon(s, 0, 1, 'neutral_titan');
    summon(s, 1, 1, 'murk_spore_puff');
    const r = end(s);
    // Spore Puff died and poisoned the Titan (then Titan's owner is no longer active, so no tick yet).
    expect(r.state.players[0].lanes[1]!.creature!.poison).toBe(2);
  });

  it('On Destroy summons into the empty lane (Gingerbread Golem)', () => {
    const s = realGame({ firstPlayer: 0 });
    summon(s, 0, 1, 'neutral_titan');
    summon(s, 1, 1, 'candy_gingerbread_golem'); // 4/5
    const r = end(s);
    expect(r.state.players[1].lanes[1]!.creature).toMatchObject({ cardId: 'token_gingerbread', token: true });
  });

  it('Start of Turn and End of Turn', () => {
    const s = realGame({ firstPlayer: 1 });
    summon(s, 0, 0, 'murk_nightshade');
    summon(s, 1, 0, 'neutral_stone_sentry');
    summon(s, 0, 2, 'dune_sun_colossus', { summoningSick: true });
    let r = end(s); // player 0's turn starts
    expect(r.state.players[1].lanes[0]!.creature!.poison).toBe(1);
    r = end(r.state); // player 0 ends: Colossus deals 2 at end of turn
    expect(r.state.players[1].hp).toBeLessThanOrEqual(25 - 2);
    expect(eventsOf(r.events, 'triggered').map((e) => e.cardId)).toContain('dune_sun_colossus');
  });

  it('On Attack resolves before damage', () => {
    const s = realGame({ firstPlayer: 0 });
    summon(s, 0, 0, 'ember_salamander'); // 2 ATK, +1 on attack
    const r = end(s);
    expect(r.state.players[1].hp).toBe(22);
  });

  it('When Damaged', () => {
    const s = realGame({ firstPlayer: 0 });
    summon(s, 0, 0, 'golden_sunsprout'); // 1 ATK
    summon(s, 1, 0, 'ember_ashen_berserker'); // 3/3
    const r = end(s);
    expect(creatureAtk(r.state, RCTX, r.state.players[1].lanes[0]!.creature!, 0)).toBe(5);
  });

  it('Whenever you play another creature (Wheatfield Giant)', () => {
    const s = realGame({ firstPlayer: 0 });
    s.players[0].lanes[1]!.landscape = 'golden';
    const giant = summon(s, 0, 0, 'golden_wheat_giant');
    const r = play(s, 0, 'neutral_wanderer', { lane: 2 });
    expect(r.state.players[0].lanes[0]!.creature!.iid).toBe(giant.iid);
    expect(creatureAtk(r.state, RCTX, r.state.players[0].lanes[0]!.creature!, 0)).toBe(5);
  });

  it('Whenever you cast a spell (Pyromaniac), after the spell resolves', () => {
    const s = realGame({ firstPlayer: 0 });
    summon(s, 0, 3, 'ember_pyromaniac');
    const r = play(s, 0, 'neutral_mana_gem');
    expect(r.state.players[1].hp).toBe(24);
    const types = r.events.map((e) => e.type);
    expect(types.lastIndexOf('mpChanged')).toBeLessThan(types.indexOf('triggered'));
  });

  it('Rotting Altar heals when an enemy creature dies', () => {
    const s = realGame({ firstPlayer: 0 });
    s.players[0].hp = 20;
    s.players[0].lanes[0]!.building = { iid: 'alt', cardId: 'murk_rotting_altar', owner: 0 };
    summon(s, 1, 3, 'murk_slime');
    const r = play(s, 0, 'ember_bolt', { target: { kind: 'creature', player: 1, lane: 3 } });
    expect(r.state.players[0].hp).toBe(22);
  });

  it('Old Oaken charges 20% when an allied creature is destroyed', () => {
    const s = realGame({ firstPlayer: 1, heroes: ['oaken', 'test_hero'] });
    s.players[1].lanes[0]!.landscape = 'ember';
    // Oaken's creatures have +1 DEF, so pre-damage the Slime to let the Bolt kill it.
    summon(s, 0, 1, 'murk_slime', { damage: 1 });
    const r = play(s, 1, 'ember_bolt', { target: { kind: 'creature', player: 0, lane: 1 } });
    expect(r.state.players[0].ultimateCharge).toBe(30 + 20);
  });

  it('conditions gate abilities (Moonwell Library)', () => {
    const s = realGame({ firstPlayer: 1 });
    s.players[0].lanes[0]!.building = { iid: 'mw', cardId: 'azure_moonwell', owner: 0 };
    for (let i = 0; i < 5; i++) give(s, 0, 'neutral_scout');
    let r = end(s);
    expect(r.state.players[0].hand).toHaveLength(6); // 5 + normal draw only

    const s2 = realGame({ firstPlayer: 1 });
    s2.players[0].lanes[0]!.building = { iid: 'mw', cardId: 'azure_moonwell', owner: 0 };
    r = end(s2);
    expect(r.state.players[0].hand).toHaveLength(2); // moonwell + normal draw
  });

  it('floop conditions are validated', () => {
    const s = realGame({ firstPlayer: 0, ctx: LAB_CTX });
    summon(s, 0, 1, 'lab_side');
    expectError(s, { type: 'floop', player: 0, lane: 1 }, 'CONDITION_NOT_MET', LAB_CTX);
    summon(s, 1, 1, 'neutral_sellsword');
    summon(s, 1, 2, 'neutral_sellsword');
    const r = act(s, { type: 'floop', player: 0, lane: 1 }, LAB_CTX);
    expect(r.state.players[1].lanes[2]!.creature!.damage).toBe(1);
  });
});

describe('static abilities', () => {
  it('Aura affects adjacent allies only, and disappears with its source', () => {
    const s = realGame({ firstPlayer: 0 });
    summon(s, 0, 1, 'golden_field_marshal');
    const left = summon(s, 0, 0, 'neutral_wanderer');
    const far = summon(s, 0, 3, 'neutral_wanderer');
    expect(creatureAtk(s, RCTX, left, 0)).toBe(4);
    expect(creatureAtk(s, RCTX, far, 3)).toBe(3);
    s.players[0].lanes[1]!.creature = null;
    expect(creatureAtk(s, RCTX, left, 0)).toBe(3);
  });

  it('DEF auras: a damaged creature dies when the aura source leaves', () => {
    const s = realGame({ firstPlayer: 1 });
    s.players[1].lanes[0]!.landscape = 'ember';
    summon(s, 0, 1, 'azure_winter_warden');
    summon(s, 0, 0, 'neutral_wanderer', { damage: 4 }); // 3 DEF + 2 aura = 5
    const r = play(s, 1, 'ember_bolt', { target: { kind: 'creature', player: 0, lane: 1 } });
    // Warden takes 3 of 5 and survives, so the Wanderer still lives.
    expect(r.state.players[0].lanes[0]!.creature).not.toBeNull();
    const r2 = play(r.state, 1, 'ember_bolt', { target: { kind: 'creature', player: 0, lane: 1 } });
    expect(r2.state.players[0].lanes[1]!.creature).toBeNull();
    expect(r2.state.players[0].lanes[0]!.creature).toBeNull();
  });

  it('While in Play buffs other allies; hero statics can depend on landscape', () => {
    const s = realGame({ firstPlayer: 0, heroes: ['sola', 'test_hero'] });
    summon(s, 0, 2, 'golden_goldmane_lion');
    const onGolden = summon(s, 0, 0, 'neutral_wanderer');
    const offGolden = summon(s, 0, 3, 'neutral_wanderer');
    expect(creatureDef(s, RCTX, onGolden, 0)).toBe(3 + 1 + 1);
    expect(creatureDef(s, RCTX, offGolden, 3)).toBe(3 + 1);
    s.players[0].lanes[0]!.flipped = true;
    expect(creatureDef(s, RCTX, onGolden, 0)).toBe(3 + 1);
  });

  it('spell power adds to spell damage only', () => {
    const s = realGame({ firstPlayer: 0, heroes: ['rask', 'test_hero'] });
    summon(s, 0, 1, 'dune_sphinx');
    expect(spellPower(s, RCTX, 0)).toBe(2);
    const r = play(s, 0, 'dune_blast');
    expect(r.state.players[1].hp).toBe(25 - 5);
  });

  it('keyword auras grant Rush (Ember Warlord)', () => {
    const s = realGame({ firstPlayer: 0 });
    summon(s, 0, 2, 'ember_warlord', { summoningSick: true });
    const r = play(s, 0, 'neutral_wanderer', { lane: 3 });
    const r2 = end(r.state);
    // Wanderer (3 +1 aura, Rush from aura) attacks the turn it was played.
    expect(eventsOf(r2.events, 'attack').map((e) => e.lane)).toEqual([3]);
    expect(r2.state.players[1].hp).toBe(21);
  });
});

describe('effects', () => {
  it('summons tokens; tokens vanish instead of going to the discard pile', () => {
    let r = play(realGame({ firstPlayer: 0 }), 0, 'golden_bee_swarm', { lane: 0 });
    const bees = r.state.players[0].lanes.filter((l) => l.creature?.cardId === 'token_bee');
    expect(bees).toHaveLength(2);
    r = play(r.state, 0, 'lab_obliterate', {}, LAB_CTX);
    expect(r.state.players[0].discard.map((c) => c.cardId)).toEqual(['lab_obliterate', 'golden_bee_swarm']);
  });

  it('return to hand: cards go back, tokens vanish', () => {
    const s = realGame({ firstPlayer: 0, ctx: LAB_CTX });
    summon(s, 1, 0, 'neutral_sellsword');
    summon(s, 1, 1, 'token_bee', { token: true });
    const r = play(s, 0, 'lab_bounce_all', {}, LAB_CTX);
    expect(r.state.players[1].hand.map((c) => c.cardId)).toEqual(['neutral_sellsword']);
    expect(eventsOf(r.events, 'tokenVanished')).toHaveLength(1);
  });

  it('move, lose MP, draw for enemy, discard self, both heroes', () => {
    const s = realGame({ firstPlayer: 0, ctx: LAB_CTX });
    summon(s, 1, 0, 'neutral_sellsword');
    let r = play(s, 0, 'lab_mover', { target: { kind: 'creature', player: 1, lane: 0 } }, LAB_CTX);
    expect(r.state.players[1].lanes[0]!.creature).toBeNull();
    expect(r.state.players[1].lanes.some((l) => l.creature?.cardId === 'neutral_sellsword')).toBe(true);

    give(r.state, 0, 'neutral_scout');
    const hand1 = r.state.players[1].hand.length;
    r = play(r.state, 0, 'lab_drain', {}, LAB_CTX);
    expect(r.state.players[1].hand).toHaveLength(hand1 + 1);
    expect(r.state.players[0].hand).toHaveLength(0);
    r = end(r.state, LAB_CTX);
    expect(r.state.players[1].mp).toBe(0); // 2 MP - 2 penalty
    r = play(r.state, 1, 'lab_both', {}, LAB_CTX);
    expect(r.state.players[0].hp).toBe(22);
    expect(r.state.players[1].hp).toBe(22);
  });

  it('flip, convert and restore landscapes; flips wear off after the owner next turn', () => {
    const s = realGame({ firstPlayer: 0, ctx: LAB_CTX });
    let r = play(s, 0, 'lab_quake', { target: { kind: 'landscape', player: 0, lane: 0 } }, LAB_CTX);
    expect(r.state.players[1].lanes.filter((l) => l.flipped)).toHaveLength(2);
    expect(r.state.players[0].lanes[0]!.landscape).toBe('ember');
    expect(countLandscapes(r.state.players[0], 'ember')).toBe(2);
    r = end(r.state, LAB_CTX); // player 1's turn: still flipped
    expect(r.state.players[1].lanes.filter((l) => l.flipped)).toHaveLength(2);
    r = end(r.state, LAB_CTX); // end of player 1's turn: restored
    expect(r.state.players[1].lanes.filter((l) => l.flipped)).toHaveLength(0);
    expect(eventsOf(r.events, 'landscapeRestored')).toHaveLength(2);
  });

  it('Tremor flips a chosen landscape; Landshaper restores', () => {
    const s = realGame({ firstPlayer: 0 });
    let r = play(s, 0, 'neutral_tremor', { target: { kind: 'landscape', player: 1, lane: 2 } });
    expect(r.state.players[1].lanes[2]!.flipped).toBe(true);
    r = end(r.state);
    const iid = give(r.state, 1, 'neutral_wanderer');
    expectError(r.state, { type: 'playCard', player: 1, iid, lane: 2 }, 'LANE_FLIPPED', RCTX);
    r = play(r.state, 1, 'neutral_landshaper', { lane: 0 });
    expect(r.state.players[1].lanes[2]!.flipped).toBe(false);
  });

  it('Encroaching Sands converts an enemy landscape', () => {
    const s = realGame({
      firstPlayer: 0,
      lanes: [
        ['dune', 'dune', 'golden', 'ember'],
        ['azure', 'azure', 'golden', 'murk'],
      ],
    });
    const r = play(s, 0, 'dune_encroaching_sands', { target: { kind: 'landscape', player: 1, lane: 0 } });
    expect(r.state.players[1].lanes[0]!.landscape).toBe('dune');
    expect(eventsOf(r.events, 'landscapeConverted')[0]).toMatchObject({ from: 'azure', to: 'dune' });
  });

  it('infinite trigger loops are stopped by the resolution cap', () => {
    const s = realGame({ firstPlayer: 0, ctx: LAB_CTX });
    summon(s, 0, 1, 'lab_echo');
    summon(s, 1, 0, 'lab_echo');
    summon(s, 0, 0, 'ember_imp'); // attacks the enemy Echo and starts the loop
    const r = end(s, LAB_CTX);
    expect(eventsOf(r.events, 'effectLimitReached')).toEqual([{ type: 'effectLimitReached', limit: 200 }]);
    expect(r.state.phase).not.toBe('ended');
  });
});

describe('heroes', () => {
  it('Ultimate needs full charge, costs it all, and resolves its effects', () => {
    const s = realGame({ firstPlayer: 0, heroes: ['vulka', 'test_hero'] });
    summon(s, 1, 0, 'neutral_sellsword');
    summon(s, 1, 1, 'neutral_titan');
    expectError(s, { type: 'useUltimate', player: 0 }, 'ULTIMATE_NOT_READY', RCTX);
    s.players[0].ultimateCharge = 100;
    const r = act(s, { type: 'useUltimate', player: 0 }, RCTX);
    // Charge resets to 0, then the Ultimate's own 4 damage recharges 40% (1 damage = 10%).
    expect(eventsOf(r.events, 'ultimateCharge')[0]).toEqual({ type: 'ultimateCharge', player: 0, charge: 0 });
    expect(r.state.players[0].ultimateCharge).toBe(40);
    expect(r.state.players[1].lanes[0]!.creature!.damage).toBe(2);
    expect(eventsOf(r.events, 'ultimateUsed')).toEqual([
      { type: 'ultimateUsed', player: 0, heroId: 'vulka' },
    ]);
  });

  it('every hero passive does what it says', () => {
    // Nyla: spells charge 25%.
    let s = realGame({ firstPlayer: 0, heroes: ['nyla', 'test_hero'] });
    expect(play(s, 0, 'neutral_mana_gem').state.players[0].ultimateCharge).toBe(25);
    // Grimble: Poison 1 on Murk Bog (lane 1).
    s = realGame({ firstPlayer: 0, heroes: ['grimble', 'test_hero'] });
    const onMurk = summon(s, 0, 1, 'neutral_wanderer');
    expect(creatureAtk(s, RCTX, onMurk, 1)).toBe(3);
    expect(applyAction(s, { type: 'endTurn', player: 0 }, RCTX).ok).toBe(true);
    summon(s, 1, 1, 'neutral_titan');
    expect(end(s).state.players[1].lanes[1]!.creature!.damage).toBeGreaterThanOrEqual(2);
    // Pip: heals 1 at end of turn.
    s = realGame({ firstPlayer: 0, heroes: ['pip', 'test_hero'] });
    s.players[0].hp = 20;
    expect(end(s).state.players[0].hp).toBe(21);
    // Vulka: 1 damage at start of turn with 3+ creatures (not with 2).
    s = realGame({ firstPlayer: 1, heroes: ['vulka', 'test_hero'] });
    summon(s, 0, 0, 'golden_scarecrow');
    summon(s, 0, 1, 'golden_scarecrow');
    expect(end(s).state.players[1].hp).toBe(25);
    summon(s, 0, 2, 'golden_scarecrow');
    expect(end(s).state.players[1].hp).toBe(24);
    // Maestra: restores flipped landscapes and heals 1 at start of turn.
    s = realGame({ firstPlayer: 1, heroes: ['maestra', 'test_hero'] });
    s.players[0].lanes[0]!.flipped = true;
    s.players[0].lanes[0]!.flipTimer = 1;
    s.players[0].hp = 20;
    const after = end(s).state.players[0];
    expect(after.lanes[0]!.flipped).toBe(false);
    expect(after.hp).toBe(21);
  });

  it('every hero Ultimate can be used', () => {
    for (const heroId of ['sola', 'nyla', 'grimble', 'rask', 'pip', 'vulka', 'oaken', 'maestra']) {
      const s = realGame({ firstPlayer: 0, heroes: [heroId, 'test_hero'] });
      summon(s, 0, 0, 'neutral_wanderer');
      summon(s, 1, 1, 'neutral_sellsword');
      give(s, 1, 'neutral_scout');
      s.players[0].ultimateCharge = 100;
      const r = applyAction(s, { type: 'useUltimate', player: 0 }, RCTX);
      expect(r.ok, heroId).toBe(true);
      if (r.ok) expect(r.events.length, heroId).toBeGreaterThan(2);
    }
  });
});
