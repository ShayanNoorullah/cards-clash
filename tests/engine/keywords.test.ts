import { describe, expect, it } from 'vitest';
import { applyAction, creatureDef, formatKeyword, keywordValue, parseKeyword } from '../../src/engine';
import { RCTX, realGame } from '../contentHelpers';
import { act, eventsOf, expectError, give, setMp, summon } from '../helpers';

const end = (s: Parameters<typeof act>[0]) => act(s, { type: 'endTurn', player: s.activePlayer }, RCTX);

describe('keyword parsing', () => {
  it('parses flag and valued keywords', () => {
    expect(parseKeyword('rush')).toEqual(['rush', 1]);
    expect(parseKeyword('poison:2')).toEqual(['poison', 2]);
    expect(parseKeyword('poison')).toBeNull();
    expect(parseKeyword('rush:2')).toBeNull();
    expect(parseKeyword('flying')).toBeNull();
    expect(parseKeyword('thorns:0')).toBeNull();
    expect(formatKeyword('regenerate:2')).toBe('Regenerate 2');
    expect(formatKeyword('stealth')).toBe('Stealth');
  });
});

describe('Guard', () => {
  it('blocks an attack aimed at the Hero through an adjacent empty lane', () => {
    const s = realGame({ firstPlayer: 0 });
    summon(s, 0, 1, 'neutral_sellsword'); // 4 ATK
    const guard = summon(s, 1, 0, 'azure_glacier_sentinel'); // 1/5 Guard
    const r = end(s);
    expect(r.state.players[1].hp).toBe(25);
    expect(r.state.players[1].lanes[0]!.creature!.iid).toBe(guard.iid);
    expect(r.state.players[1].lanes[0]!.creature!.damage).toBe(4);
    expect(eventsOf(r.events, 'attack')[0]!.target).toEqual({ kind: 'creature', player: 1, lane: 0 });
  });

  it('does not block when the attacked lane is occupied, or for Ranged attackers', () => {
    const s = realGame({ firstPlayer: 0 });
    summon(s, 0, 1, 'azure_icicle_archer'); // 2 ATK Ranged
    summon(s, 1, 0, 'azure_glacier_sentinel');
    const r = end(s);
    expect(r.state.players[1].hp).toBe(23);
    expect(r.state.players[1].lanes[0]!.creature!.damage).toBe(0);
  });
});

describe('Ranged, Thorns and Counter', () => {
  it('Thorns hits the attacker even if the defender dies', () => {
    const s = realGame({ firstPlayer: 0 });
    summon(s, 0, 0, 'ember_magma_brute'); // 5/3
    summon(s, 1, 0, 'ember_lava_pup'); // 1/2 Thorns 1
    const r = end(s);
    expect(r.state.players[1].lanes[0]!.creature).toBeNull();
    expect(r.state.players[0].lanes[0]!.creature!.damage).toBe(1);
  });

  it('Counter strikes back with full ATK only if it survives', () => {
    const s = realGame({ firstPlayer: 0 });
    summon(s, 0, 0, 'neutral_sellsword'); // 4/4
    summon(s, 1, 0, 'azure_crystal_golem', { shield: false }); // 3/6 Counter
    let r = end(s);
    expect(r.state.players[1].lanes[0]!.creature!.damage).toBe(4);
    expect(r.state.players[0].lanes[0]!.creature!.damage).toBe(3);

    const s2 = realGame({ firstPlayer: 0 });
    summon(s2, 0, 0, 'neutral_titan'); // 7/7
    summon(s2, 1, 0, 'azure_crystal_golem', { shield: false });
    r = end(s2);
    expect(r.state.players[1].lanes[0]!.creature).toBeNull();
    expect(r.state.players[0].lanes[0]!.creature!.damage).toBe(0);
  });

  it('Ranged attackers take no Thorns or Counter damage', () => {
    const s = realGame({ firstPlayer: 0 });
    summon(s, 0, 0, 'azure_icicle_archer');
    summon(s, 1, 0, 'dune_cactus_brute'); // Thorns 2
    summon(s, 0, 1, 'dune_sun_archer');
    summon(s, 1, 1, 'azure_crystal_golem', { shield: false });
    const r = end(s);
    expect(r.state.players[0].lanes[0]!.creature!.damage).toBe(0);
    expect(r.state.players[0].lanes[1]!.creature!.damage).toBe(0);
  });
});

describe('Lifesteal', () => {
  it('heals the Hero by the damage dealt', () => {
    const s = realGame({ firstPlayer: 0 });
    s.players[0].hp = 20;
    summon(s, 0, 0, 'murk_leech'); // 2 ATK Lifesteal
    const r = end(s);
    expect(r.state.players[0].hp).toBe(22);
    expect(r.state.players[1].hp).toBe(23);
  });
});

describe('Shield', () => {
  it('blocks the next damage completely, then breaks', () => {
    const s = realGame({ firstPlayer: 0 });
    summon(s, 0, 0, 'neutral_sellsword');
    summon(s, 1, 0, 'candy_sugar_sprite', { shield: true });
    let r = end(s);
    expect(r.state.players[1].lanes[0]!.creature!.damage).toBe(0);
    expect(r.state.players[1].lanes[0]!.creature!.shield).toBe(false);
    expect(eventsOf(r.events, 'shieldBroken')).toHaveLength(1);
    r = end(r.state);
    r = end(r.state);
    expect(r.state.players[1].lanes[0]!.creature).toBeNull();
  });

  it('cards with Shield enter play shielded', () => {
    const s = realGame({ firstPlayer: 1 });
    const iid = give(s, 1, 'candy_sugar_sprite');
    const r = act(s, { type: 'playCard', player: 1, iid, lane: 1 }, RCTX);
    expect(r.state.players[1].lanes[1]!.creature!.shield).toBe(true);
  });
});

describe('Frozen', () => {
  it('a frozen creature skips its attack, cannot floop, and thaws at the end of its turn', () => {
    const s = realGame({ firstPlayer: 0 });
    summon(s, 0, 0, 'dune_scorpion', { frozen: true });
    expectError(s, { type: 'floop', player: 0, lane: 0 }, 'FROZEN', RCTX);
    const r = end(s);
    expect(eventsOf(r.events, 'attack')).toHaveLength(0);
    expect(eventsOf(r.events, 'thawed')).toHaveLength(1);
    expect(r.state.players[0].lanes[0]!.creature!.frozen).toBe(false);
  });

  it('freeze effects mark the target', () => {
    const s = realGame({ firstPlayer: 0 });
    s.players[0].lanes[0]!.landscape = 'azure';
    summon(s, 1, 2, 'neutral_sellsword');
    const iid = give(s, 0, 'azure_cold_snap');
    const r = act(
      s,
      { type: 'playCard', player: 0, iid, target: { kind: 'creature', player: 1, lane: 2 } },
      RCTX,
    );
    expect(r.state.players[1].lanes[2]!.creature!.frozen).toBe(true);
    // The frozen creature cannot attack on its owner's next turn.
    const r2 = end(r.state);
    expect(eventsOf(r2.events, 'turnStarted')[0]!.player).toBe(1);
    const r3 = end(r2.state);
    expect(eventsOf(r3.events, 'attack')).toHaveLength(0);
    expect(r3.state.players[1].lanes[2]!.creature!.frozen).toBe(false);
  });
});

describe('Poison and Regenerate', () => {
  it('combat damage from a Poison creature poisons the target', () => {
    const s = realGame({ firstPlayer: 0 });
    summon(s, 0, 0, 'murk_rot_hound'); // 2 ATK Poison 1
    summon(s, 1, 0, 'neutral_stone_sentry'); // 2/5
    const r = end(s);
    const c = r.state.players[1].lanes[0]!.creature!;
    // Poison ticks at the start of player 1's turn (which just began): 2 combat + 1 poison.
    expect(c.damage).toBe(3);
    expect(c.poison).toBe(0);
  });

  it('poison ticks each turn and decreases by 1', () => {
    const s = realGame({ firstPlayer: 1 });
    summon(s, 0, 0, 'neutral_titan', { poison: 3 });
    let r = end(s);
    expect(r.state.players[0].lanes[0]!.creature!.damage).toBe(3);
    expect(r.state.players[0].lanes[0]!.creature!.poison).toBe(2);
    r = end(r.state);
    r = end(r.state);
    expect(r.state.players[0].lanes[0]!.creature!.damage).toBe(5);
  });

  it('Regenerate heals at the start of its owner turn', () => {
    const s = realGame({ firstPlayer: 1 });
    summon(s, 0, 0, 'murk_mud_golem', { damage: 5 });
    const r = end(s);
    expect(r.state.players[0].lanes[0]!.creature!.damage).toBe(3);
  });
});

describe('Stealth', () => {
  it('cannot be chosen by enemy spells until it attacks', () => {
    const s = realGame({ firstPlayer: 1 });
    s.players[1].lanes[0]!.landscape = 'ember';
    summon(s, 0, 1, 'dune_mirage_dancer', { stealth: true });
    const bolt = give(s, 1, 'ember_bolt');
    expectError(
      s,
      { type: 'playCard', player: 1, iid: bolt, target: { kind: 'creature', player: 0, lane: 1 } },
      'INVALID_TARGET',
      RCTX,
    );
    expectError(s, { type: 'playCard', player: 1, iid: bolt }, 'NO_VALID_TARGET', RCTX);
  });

  it('can still be targeted by its owner, and loses Stealth after attacking', () => {
    const s = realGame({ firstPlayer: 0 });
    summon(s, 0, 1, 'dune_mirage_dancer', { stealth: true });
    const bless = give(s, 0, 'golden_blessing');
    expect(
      applyAction(
        s,
        { type: 'playCard', player: 0, iid: bless, target: { kind: 'creature', player: 0, lane: 1 } },
        RCTX,
      ).ok,
    ).toBe(true);
    const r = end(s);
    expect(r.state.players[0].lanes[1]!.creature!.stealth).toBe(false);
  });
});

describe('keyword sources', () => {
  it('keywords come from the card, from effects and from statics', () => {
    const s = realGame({ firstPlayer: 0 });
    const c = summon(s, 0, 2, 'neutral_sellsword', { grantedKeywords: ['rush'] });
    expect(keywordValue(s, RCTX, c, 2, 'rush')).toBe(1);
    s.players[0].lanes[2]!.building = { iid: 'b1', cardId: 'murk_spore_tower', owner: 0 };
    expect(keywordValue(s, RCTX, c, 2, 'poison')).toBe(1);
    const toad = summon(s, 0, 3, 'murk_bog_toad');
    s.players[0].lanes[3]!.building = { iid: 'b2', cardId: 'murk_spore_tower', owner: 0 };
    expect(keywordValue(s, RCTX, toad, 3, 'poison')).toBe(2); // valued keywords stack
  });

  it('Rush from Kindle lets a fresh creature attack', () => {
    let s = realGame({ firstPlayer: 0 });
    setMp(s, 0, 6);
    const w = give(s, 0, 'neutral_wanderer');
    s = act(s, { type: 'playCard', player: 0, iid: w, lane: 3 }, RCTX).state;
    const k = give(s, 0, 'ember_kindle');
    s = act(
      s,
      { type: 'playCard', player: 0, iid: k, target: { kind: 'creature', player: 0, lane: 3 } },
      RCTX,
    ).state;
    const r = end(s);
    expect(r.state.players[1].hp).toBe(25 - 5);
    // The temporary +3 ATK is gone after the turn.
    expect(r.state.players[0].lanes[3]!.creature!.tempAtk).toBe(0);
    expect(creatureDef(r.state, RCTX, r.state.players[0].lanes[3]!.creature!, 3)).toBe(3);
  });
});
