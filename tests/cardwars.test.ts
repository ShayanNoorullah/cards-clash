/**
 * The shipped Card Wars card pool: the import matches the source data, every
 * card and Hero Ability works in play, and the mechanics added for it do what
 * the printed text says.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  applyAction,
  collectibleCards,
  creatureAtk,
  creatureDef,
  creatureMaxDef,
  getContent,
  getLegalActions,
  validateDeck,
  type Action,
  type GameState,
  type LandscapeType,
  type PlayerId,
  type RulesContext,
} from '../src/engine';
import { cardCost, floopCost } from '../src/engine/costs';
import { MP_EFFECT_CAP } from '../src/engine/mutations';
import cardSources from '../src/data/card-sources.json';
import { act, expectError, give, setMp, startedGame, summon } from './helpers';

const content = getContent();
const ctx: RulesContext = content.ctx;
const decks = content.starterDecks;
const collectible = collectibleCards(ctx.cards);
const ROOT = join(__dirname, '..');

/** Player 0 to move, main phase, both sides on `lanes` (default: all Corn Fields). */
function game(
  lanes: LandscapeType[] = ['golden', 'golden', 'golden', 'golden'],
  enemyLanes = lanes,
): GameState {
  const s = startedGame({ decks: [decks[0]!, decks[1]!], firstPlayer: 0, ctx });
  s.players[0].lanes.forEach((l, i) => (l.landscape = lanes[i]!));
  s.players[1].lanes.forEach((l, i) => (l.landscape = enemyLanes[i]!));
  setMp(s, 0, 8);
  return s;
}

const run = (s: GameState, a: Action) => act(s, a, ctx);
const fail = (s: GameState, a: Action, code: Parameters<typeof expectError>[2]) =>
  expectError(s, a, code, ctx);
const endTurn = (s: GameState) => run(s, { type: 'endTurn', player: s.activePlayer }).state;
/** Passes both turns, returning to player 0 with full MP. */
function nextRound(s: GameState): GameState {
  let t = endTurn(s);
  t = endTurn(t);
  setMp(t, 0, 8);
  return t;
}
const creature = (s: GameState, p: PlayerId, lane: number) => s.players[p].lanes[lane]!.creature!;
const atk = (s: GameState, p: PlayerId, lane: number) => creatureAtk(s, ctx, creature(s, p, lane), lane);
const def = (s: GameState, p: PlayerId, lane: number) => creatureDef(s, ctx, creature(s, p, lane), lane);
const printed = (id: string) => ctx.cards.byId.get(id) as { atk: number; def: number; cost: number };
const placeBuilding = (s: GameState, p: PlayerId, lane: number, cardId: string) => {
  s.players[p].lanes[lane]!.building = { iid: `b-${cardId}-${p}-${lane}`, cardId, owner: p };
};

// ---------------------------------------------------------------------------
// The imported data
// ---------------------------------------------------------------------------

describe('Card Wars card pool', () => {
  it('has every card from the source list: 323 creatures, 51 spells, 29 buildings, 69 heroes', () => {
    const count = (t: string) => collectible.filter((c) => c.type === t).length;
    expect([count('creature'), count('spell'), count('building')]).toEqual([323, 51, 29]);
    expect(ctx.heroes.all).toHaveLength(69);
    expect(ctx.cards.all.every((c) => !c.token)).toBe(true);
    // Every card and hero has a source page (attribution).
    const ids = [...ctx.cards.all.map((c) => c.id), ...ctx.heroes.all.map((h) => h.id)];
    expect(Object.keys(cardSources).sort()).toEqual([...ids].sort());
  });

  it('every card and hero has its illustration in public/cards', () => {
    for (const d of [...ctx.cards.all, ...ctx.heroes.all]) {
      expect(d.image, d.id).toBe(`cards/${d.id}.webp`);
      expect(existsSync(join(ROOT, 'public', d.image!)), d.id).toBe(true);
    }
  });

  it('every Hero Ability recharges over a number of turns', () => {
    for (const h of ctx.heroes.all) {
      expect(h.ultimate.cooldown, h.id).toBeGreaterThanOrEqual(1);
      expect(h.ultimate.text.length, h.id).toBeGreaterThan(0);
      expect(h.boss, h.id).toBeUndefined();
    }
  });

  const csv = join(ROOT, 'CARD INFO EXTRACTOR', 'card info', 'data', 'csv', 'all-cards.csv');
  it.skipIf(!existsSync(csv))('copies names, stats and ability texts exactly from the source CSV', () => {
    const rows = parseCsv(readFileSync(csv, 'utf8').trimStart());
    const head = rows.shift()!;
    const col = (r: string[], name: string) => (r[head.indexOf(name)] ?? '').trim();
    const missing = new Set(['Polterclops', 'Super Hug']); // values absent in the source, filled in
    let checked = 0;
    for (const r of rows) {
      const type = col(r, 'Card Type');
      const name = col(r, 'Card Name').replace(/^[^\w(]+/, '');
      const variant = col(r, 'Variant');
      if (type === 'Hero') {
        const hero = ctx.heroes.all.find((h) => h.name === name)!;
        expect(hero, name).toBeDefined();
        expect(hero.ultimate.text).toBe(col(r, 'Hero Ability'));
        checked++;
        continue;
      }
      const named = ctx.cards.all.filter((c) => c.name === name);
      const found = named.length === 1 ? named[0] : named.find((c) => (c.variant ?? 'Regular') === variant);
      expect(found, `${name} (${variant})`).toBeDefined();
      if (!found) continue;
      if (!missing.has(name)) expect(found.cost, name).toBe(Number(col(r, 'Magic Cost')));
      if (found.type === 'creature') {
        if (!missing.has(name)) {
          expect(found.atk, name).toBe(Number(col(r, 'Attack')));
          expect(found.def, name).toBe(Math.max(1, Number(col(r, 'Defense'))));
          expect(found.floop!.cost, name).toBe(Number(col(r, 'Floop Cost')));
        }
        expect(found.text).toBe(`Floop (${found.floop!.cost} MP): ${col(r, 'Floop Ability')}`);
      } else {
        expect(found.text, name).toBe(col(r, type === 'Spell' ? 'Spell Effect' : 'Building Effect'));
      }
      checked++;
    }
    expect(checked).toBe(472);
  });

  it('ships 10 legal starter decks whose heroes are free from level 1', () => {
    expect(decks).toHaveLength(10);
    for (const d of decks) {
      expect(validateDeck(d, ctx), d.id).toEqual([]);
      expect(ctx.heroes.byId.has(d.heroId)).toBe(true);
    }
  });
});

/** Minimal CSV parser (quoted fields, doubled quotes, newlines inside quotes). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some((f) => f !== '')) rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Every card and every Hero Ability in play
// ---------------------------------------------------------------------------

/** Total cards across both players never changes (a stolen card just changes sides). */
function conserved(before: GameState, after: GameState): void {
  const total = (s: GameState) =>
    s.players.reduce(
      (n, p) =>
        n +
        p.deck.length +
        p.hand.length +
        p.discard.length +
        p.lanes.reduce((m, l) => m + (l.creature ? 1 : 0) + (l.building ? 1 : 0), 0),
      0,
    );
  expect(total(after)).toBe(total(before));
  for (const p of after.players) {
    expect(p.hp).toBeGreaterThanOrEqual(0);
    expect(p.hp).toBeLessThanOrEqual(p.maxHp);
  }
}

/** A busy board so every kind of effect has something to work on. */
function busyBoard(land: LandscapeType): GameState {
  const s = game([land, land, land, land], ['golden', 'azure', 'murk', 'dune']);
  summon(s, 1, 0, 'cornball');
  summon(s, 1, 1, 'cool_dog', { damage: 2 });
  summon(s, 1, 3, 'rural_earl');
  placeBuilding(s, 1, 1, 'corn_dome');
  summon(s, 0, 1, 'husker_worm', { damage: 2 });
  summon(s, 0, 3, 'chad_bear');
  placeBuilding(s, 0, 3, 'astral_fortress');
  for (const id of ['husker_knight', 'strawberry_butt', 'corn_dome']) {
    s.players[0].discard.push({ iid: `d-${id}`, cardId: id, owner: 0 });
    s.players[1].discard.push({ iid: `e-${id}`, cardId: id, owner: 1 });
  }
  return s;
}

describe('every Card Wars card works in play', () => {
  it.each(collectible.map((c) => [c.id, c] as const))('%s', (_id, card) => {
    const land = card.landscape === 'neutral' ? 'golden' : card.landscape;
    const s = busyBoard(land);
    // Spells like Bone Wand need an allied creature of their land.
    const effects = card.type === 'spell' ? card.effects : [];
    const needs = effects.find((e) => e.filter?.landscape)?.filter?.landscape;
    if (needs) summon(s, 0, 2, ctx.cards.all.find((c) => c.type === 'creature' && c.landscape === needs)!.id);
    const iid = give(s, 0, card.id);
    const plays = getLegalActions(s, 0, ctx).filter((a) => a.type === 'playCard' && a.iid === iid);
    expect(plays.length, `${card.id} should be playable`).toBeGreaterThan(0);
    let state: GameState | null = null;
    for (const action of plays) {
      const r = applyAction(s, action, ctx);
      expect(r.ok, JSON.stringify(action)).toBe(true);
      if (r.ok) {
        conserved(s, r.state);
        // Prefer a play that put the creature on the board (lane 0 is empty).
        if (!state || (action.type === 'playCard' && action.lane === 0)) state = r.state;
      }
    }
    let t = state!;
    if (card.type === 'creature' && t.phase !== 'ended') {
      // Some floops cost more than a turn's MP (Snowy McSnow: 10) and need MP from effects.
      t.players[0].mp = MP_EFFECT_CAP;
      const lane = t.players[0].lanes.findIndex((l) => l.creature?.cardId === card.id);
      if (lane >= 0) {
        const floops = getLegalActions(t, 0, ctx).filter((a) => a.type === 'floop' && a.lane === lane);
        expect(floops.length, `${card.id} floop`).toBeGreaterThan(0);
        for (const f of floops) {
          const r = applyAction(t, f, ctx);
          expect(r.ok, JSON.stringify(f)).toBe(true);
          if (r.ok) conserved(t, r.state);
        }
        const r = applyAction(t, floops[0]!, ctx);
        if (r.ok) t = r.state;
      }
    }
    for (let i = 0; i < 2 && t.phase !== 'ended'; i++) {
      const r = applyAction(t, { type: 'endTurn', player: t.activePlayer }, ctx);
      expect(r.ok).toBe(true);
      if (r.ok) {
        conserved(t, r.state);
        t = r.state;
      }
    }
  });
});

describe('every Hero Ability works', () => {
  it.each(ctx.heroes.all.map((h) => [h.id, h] as const))('%s', (_id, hero) => {
    const s = busyBoard('golden');
    s.players[0].heroId = hero.id;
    s.players[0].ultimateCharge = ctx.balance.ultimateChargeMax;
    const uses = getLegalActions(s, 0, ctx).filter((a) => a.type === 'useUltimate');
    expect(uses.length, hero.id).toBeGreaterThan(0);
    for (const u of uses) {
      const r = applyAction(s, u, ctx);
      expect(r.ok, JSON.stringify(u)).toBe(true);
      if (r.ok) {
        conserved(s, r.state);
        expect(r.state.players[0].ultimateCharge).toBe(0);
      }
    }
  });

  it('charges over its cooldown: ready on turn N, then every N turns', () => {
    const s = game();
    expect(s.players[0].heroId).toBe('jake'); // (3 Turns), charged once at the start of turn 1
    let t = s;
    const readyOn: number[] = [];
    for (let turn = 2; turn <= 8; turn++) {
      t = nextRound(t);
      if (t.players[0].ultimateCharge >= ctx.balance.ultimateChargeMax) {
        readyOn.push(turn);
        t = run(t, { type: 'useUltimate', player: 0 }).state;
      }
    }
    // Ready at the start of turn 3, then 3 turns after each use.
    expect(readyOn).toEqual([3, 6]);
  });
});

// ---------------------------------------------------------------------------
// Mechanics added for Card Wars
// ---------------------------------------------------------------------------

describe('scaled amounts', () => {
  it('Husker Giant gains +2 ATK for each Corn landscape', () => {
    const s = game(['golden', 'golden', 'golden', 'azure']);
    summon(s, 0, 0, 'husker_giant');
    const t = run(s, { type: 'floop', player: 0, lane: 0 }).state;
    expect(atk(t, 0, 0)).toBe(printed('husker_giant').atk + 6);
  });

  it('Corn Ronin gains +3 ATK for every card in hand', () => {
    const s = game();
    summon(s, 0, 0, 'corn_ronin');
    const hand = s.players[0].hand.length;
    const t = run(s, { type: 'floop', player: 0, lane: 0 }).state;
    expect(atk(t, 0, 0)).toBe(printed('corn_ronin').atk + 3 * hand);
  });

  it('Mama Spider deals 4 for every 2 cards in your discard pile', () => {
    const s = game(['murk', 'murk', 'murk', 'murk']);
    summon(s, 0, 0, 'mama_spider');
    summon(s, 1, 0, 'ghost_sludger'); // 1/37
    for (let i = 0; i < 5; i++) s.players[0].discard.push({ iid: `x${i}`, cardId: 'cornball', owner: 0 });
    const t = run(s, { type: 'floop', player: 0, lane: 0 }).state;
    expect(creature(t, 1, 0).damage).toBe(8);
  });

  it('Cerebral Bloodstorm deals damage equal to the target ATK; Clairvoyant Daggerstorm doubles damage', () => {
    const s = game();
    summon(s, 1, 2, 'ghost_sludger', { damage: 5 });
    summon(s, 1, 1, 'patchy_the_pumpkin');
    const a = give(s, 0, 'cerebral_bloodstorm');
    let t = run(s, {
      type: 'playCard',
      player: 0,
      iid: a,
      target: { kind: 'creature', player: 1, lane: 1 },
    }).state;
    expect(t.players[1].lanes[1]!.creature).toBeNull(); // 22 damage on a 5 DEF creature
    const b = give(t, 0, 'clairvoyant_daggerstorm');
    t = run(t, {
      type: 'playCard',
      player: 0,
      iid: b,
      target: { kind: 'creature', player: 1, lane: 2 },
    }).state;
    expect(creature(t, 1, 2).damage).toBe(10);
  });
});

describe('stat changes', () => {
  it('Cough Syrup switches ATK and DEF; Candy Igloo swaps while in its lane', () => {
    const s = game();
    summon(s, 0, 0, 'patchy_the_pumpkin'); // 22/5
    const syrup = give(s, 0, 'cough_syrup');
    const t = run(s, {
      type: 'playCard',
      player: 0,
      iid: syrup,
      target: { kind: 'creature', player: 0, lane: 0 },
    }).state;
    expect([atk(t, 0, 0), def(t, 0, 0)]).toEqual([5, 22]);

    const u = game();
    summon(u, 0, 1, 'patchy_the_pumpkin');
    placeBuilding(u, 0, 1, 'candy_igloo');
    expect([atk(u, 0, 1), creatureMaxDef(u, ctx, creature(u, 0, 1), 1)]).toEqual([5, 22]);
  });

  it('Heifergeist negates all modifiers and damage on itself', () => {
    const s = game(['azure', 'azure', 'azure', 'azure']);
    summon(s, 0, 0, 'heifergeist', { damage: 4, atkMod: -6, defMod: 3 });
    const t = run(s, { type: 'floop', player: 0, lane: 0 }).state;
    expect([atk(t, 0, 0), def(t, 0, 0)]).toEqual([printed('heifergeist').atk, printed('heifergeist').def]);
  });

  it('Count Cactus: +50% DEF until your next turn', () => {
    const s = game(['dune', 'dune', 'dune', 'dune']);
    summon(s, 0, 0, 'count_cactus');
    summon(s, 0, 1, 'sandbacho'); // 11/10
    let t = run(s, { type: 'floop', player: 0, lane: 0 }).state;
    expect(def(t, 0, 1)).toBe(15);
    t = endTurn(t);
    expect(def(t, 0, 1)).toBe(15); // still there on the enemy turn
    t = endTurn(t);
    expect(def(t, 0, 1)).toBe(10);
  });
});

describe('locks, seals and blocks', () => {
  it('Cool Dog stops the opposing floop next turn; Nice Ice Baby stops its attack', () => {
    const s = game(['azure', 'golden', 'golden', 'golden'], ['golden', 'golden', 'golden', 'golden']);
    summon(s, 0, 0, 'cool_dog');
    summon(s, 1, 0, 'husker_worm');
    summon(s, 0, 1, 'nice_ice_baby');
    summon(s, 1, 1, 'rural_earl');
    let t = run(s, { type: 'floop', player: 0, lane: 0 }).state;
    t = run(t, { type: 'floop', player: 0, lane: 1 }).state;
    const hp = t.players[0].hp;
    t = endTurn(t);
    setMp(t, 1, 8);
    fail(t, { type: 'floop', player: 1, lane: 0 }, 'FLOOP_LOCKED');
    t = endTurn(t);
    // Rural Earl was locked: Nice Ice Baby survived and the hero took no damage from lane 1.
    expect(t.players[0].lanes[1]!.creature?.cardId).toBe('nice_ice_baby');
    expect(t.players[0].hp).toBe(hp - 0);
    // The lock is over on the following enemy turn.
    t = endTurn(t);
    setMp(t, 1, 8);
    expect(applyAction(t, { type: 'floop', player: 1, lane: 0 }, ctx).ok).toBe(true);
  });

  it('Spirit Torch seals a lane; Psychic Tempest and Door of Strength block card types', () => {
    const s = game();
    const torch = give(s, 0, 'spirit_torch');
    let t = run(s, {
      type: 'playCard',
      player: 0,
      iid: torch,
      target: { kind: 'landscape', player: 1, lane: 2 },
    }).state;
    const tempest = give(t, 0, 'psychic_tempest');
    t = run(t, { type: 'playCard', player: 0, iid: tempest }).state;
    t = endTurn(t);
    setMp(t, 1, 8);
    const c = give(t, 1, 'cornball');
    fail(t, { type: 'playCard', player: 1, iid: c, lane: 2 }, 'LANE_SEALED');
    expect(applyAction(t, { type: 'playCard', player: 1, iid: c, lane: 1 }, ctx).ok).toBe(true);
    const spell = give(t, 1, 'strawberry_butt');
    fail(t, { type: 'playCard', player: 1, iid: spell }, 'BLOCKED');
    t = endTurn(endTurn(t)); // the enemy's following turn: no more block
    setMp(t, 1, 8);
    const spell2 = give(t, 1, 'strawberry_butt');
    expect(applyAction(t, { type: 'playCard', player: 1, iid: spell2 }, ctx).ok).toBe(true);
  });

  it('Dark Pyramid only lets 1-star creatures into the lane across from it', () => {
    const s = game();
    placeBuilding(s, 1, 0, 'dark_pyramid');
    const big = give(s, 0, 'archer_dan'); // 2 stars
    const small = give(s, 0, 'cornball'); // 1 star
    fail(s, { type: 'playCard', player: 0, iid: big, lane: 0 }, 'RARITY_CAP');
    expect(applyAction(s, { type: 'playCard', player: 0, iid: big, lane: 1 }, ctx).ok).toBe(true);
    expect(applyAction(s, { type: 'playCard', player: 0, iid: small, lane: 0 }, ctx).ok).toBe(true);
  });
});

describe('costs', () => {
  it('Tax Reduction makes floops free this turn; Stonehenge makes its lane cheaper', () => {
    const s = game();
    summon(s, 0, 0, 'ghost_sludger');
    expect(floopCost(s, ctx, 0, 0)).toBe(6);
    placeBuilding(s, 0, 0, 'stonehenge');
    expect(floopCost(s, ctx, 0, 0)).toBe(5);
    const tax = give(s, 0, 'tax_reduction');
    const t = run(s, { type: 'playCard', player: 0, iid: tax }).state;
    expect(floopCost(t, ctx, 0, 0)).toBe(0);
    expect(floopCost(nextRound(t), ctx, 0, 0)).toBe(5);
  });

  it('Brief Power and Infinite Figure change costs for the right player and turn', () => {
    const s = game(['azure', 'azure', 'azure', 'azure']);
    const brief = give(s, 0, 'brief_power');
    let t = run(s, { type: 'playCard', player: 0, iid: brief }).state;
    expect(cardCost(t, 0, ctx.cards.byId.get('legion_of_earlings')!)).toBe(4);
    summon(t, 0, 0, 'infinite_figure');
    t = run(t, { type: 'floop', player: 0, lane: 0 }).state;
    t = endTurn(t);
    summon(t, 1, 3, 'husker_worm');
    expect(floopCost(t, ctx, 1, 3)).toBe(2 + 1); // Husker Worm floops for 2, +1 this turn
  });
});

describe('the discard pile and the deck', () => {
  it('Unempty Coffin returns your best creature; Scroll of Bad Breath a spell', () => {
    const s = game();
    s.players[0].discard.push(
      { iid: 'd1', cardId: 'cornball', owner: 0 },
      { iid: 'd2', cardId: 'legion_of_earlings', owner: 0 },
      { iid: 'd3', cardId: 'strawberry_butt', owner: 0 },
    );
    const coffin = give(s, 0, 'unempty_coffin');
    let t = run(s, { type: 'playCard', player: 0, iid: coffin }).state;
    expect(t.players[0].hand.some((c) => c.iid === 'd2')).toBe(true);
    const scroll = give(t, 0, 'scroll_of_bad_breath');
    t = run(t, { type: 'playCard', player: 0, iid: scroll }).state;
    expect(t.players[0].hand.some((c) => c.iid === 'd3')).toBe(true);
  });

  it('Mausoleum returns its destroyed creature to your hand, then crumbles', () => {
    const s = game();
    summon(s, 0, 0, 'cornball');
    placeBuilding(s, 0, 0, 'mausoleum');
    const iid = creature(s, 0, 0).iid;
    const bolt = give(s, 0, 'banana_butt');
    const t = run(s, {
      type: 'playCard',
      player: 0,
      iid: bolt,
      target: { kind: 'creature', player: 0, lane: 0 },
    }).state;
    expect(t.players[0].hand.some((c) => c.iid === iid)).toBe(true);
    expect(t.players[0].lanes[0]!.building).toBeNull();
    expect(t.players[0].discard.some((c) => c.cardId === 'mausoleum')).toBe(true);
  });

  it('Fantasmo steals the creature it destroys', () => {
    const s = game(['azure', 'azure', 'azure', 'azure']);
    summon(s, 0, 0, 'fantasmo');
    summon(s, 1, 0, 'ethan_allfire'); // 5/1 dies to the 4 damage
    const victim = creature(s, 1, 0).iid;
    const t = run(s, { type: 'floop', player: 0, lane: 0 }).state;
    expect(t.players[0].hand.find((c) => c.iid === victim)).toMatchObject({ owner: 0 });
    expect(t.players[1].discard.some((c) => c.iid === victim)).toBe(false);
  });

  it('Crystal Ball shuffles the hand away and draws 5; Incredible Egg finds a creature', () => {
    const s = game();
    const ball = give(s, 0, 'crystal_ball');
    let t = run(s, { type: 'playCard', player: 0, iid: ball }).state;
    expect(t.players[0].hand).toHaveLength(5);
    t.players[0].deck = t.players[0].deck.filter((c) => ctx.cards.byId.get(c.cardId)!.type !== 'creature');
    t.players[0].deck.push({ iid: 'egg-target', cardId: 'cornball', owner: 0 });
    const egg = give(t, 0, 'incredible_egg');
    t = run(t, { type: 'playCard', player: 0, iid: egg }).state;
    expect(t.players[0].hand.some((c) => c.iid === 'egg-target')).toBe(true);
  });
});

describe('combat and buildings', () => {
  it('Sand Sphinx: 5 less damage from attacks in its lane', () => {
    const s = game();
    summon(s, 0, 0, 'rural_earl'); // 13 ATK
    summon(s, 1, 0, 'ghost_sludger'); // 1/37
    placeBuilding(s, 1, 0, 'sand_sphinx');
    const t = endTurn(s);
    expect(creature(t, 1, 0).damage).toBe(8);
  });

  it('Sand Pyramid: the creature heals 5 when it destroys a creature', () => {
    const s = game();
    summon(s, 0, 0, 'rural_earl', { damage: 6 });
    summon(s, 1, 0, 'cornball');
    const pyramid = give(s, 0, 'sand_pyramid');
    let t = run(s, {
      type: 'playCard',
      player: 0,
      iid: pyramid,
      target: { kind: 'creature', player: 0, lane: 0 },
    }).state;
    t = endTurn(t);
    expect(t.players[1].lanes[0]!.creature).toBeNull();
    expect(creature(t, 0, 0).damage).toBe(1);
  });

  it('Woadic Time Walker sends damage on the opposing creature to its Hero', () => {
    const s = game(['azure', 'azure', 'azure', 'azure']);
    summon(s, 0, 0, 'woadic_time_walker');
    summon(s, 1, 0, 'ghost_sludger');
    let t = run(s, { type: 'floop', player: 0, lane: 0 }).state;
    const hp = t.players[1].hp;
    const zap = give(t, 0, 'cerebral_bloodstorm'); // 1 damage (its ATK) to the redirected creature
    t = run(t, {
      type: 'playCard',
      player: 0,
      iid: zap,
      target: { kind: 'creature', player: 1, lane: 0 },
    }).state;
    expect(creature(t, 1, 0).damage).toBe(0);
    expect(t.players[1].hp).toBe(hp - 1);
  });

  it('Corn Scepter makes a Corn creature attack right now, even when just played', () => {
    const s = game();
    summon(s, 0, 2, 'rural_earl', { summoningSick: true, exhausted: true });
    const hp = s.players[1].hp;
    const scepter = give(s, 0, 'corn_scepter');
    const t = run(s, {
      type: 'playCard',
      player: 0,
      iid: scepter,
      target: { kind: 'creature', player: 0, lane: 2 },
    }).state;
    expect(t.players[1].hp).toBe(hp - 13);
    const notCorn = give(t, 0, 'corn_scepter');
    summon(t, 0, 3, 'chad_bear');
    fail(
      t,
      { type: 'playCard', player: 0, iid: notCorn, target: { kind: 'creature', player: 0, lane: 3 } },
      'INVALID_TARGET',
    );
  });

  it('Punk Cat uses an adjacent creature floop for free', () => {
    const s = game(['azure', 'azure', 'azure', 'azure']);
    summon(s, 0, 1, 'punk_cat');
    summon(s, 0, 2, 'heavenly_gazer'); // Floop: draw 1
    const hand = s.players[0].hand.length;
    const t = run(s, { type: 'floop', player: 0, lane: 1 }).state;
    expect(t.players[0].hand).toHaveLength(hand + 1);
    expect(creature(t, 0, 2).exhausted).toBe(false);
  });

  it('Volcano destroys everything in a lane on both sides', () => {
    const s = game();
    summon(s, 0, 1, 'cornball');
    summon(s, 1, 1, 'cornball');
    placeBuilding(s, 0, 1, 'corn_dome');
    placeBuilding(s, 1, 1, 'corn_dome');
    const v = give(s, 0, 'volcano');
    const t = run(s, {
      type: 'playCard',
      player: 0,
      iid: v,
      target: { kind: 'landscape', player: 1, lane: 1 },
    }).state;
    for (const p of [0, 1] as const) {
      expect(t.players[p].lanes[1]!.creature).toBeNull();
      expect(t.players[p].lanes[1]!.building).toBeNull();
    }
  });

  it('Lonely Hearts only works on a lone enemy creature', () => {
    const s = game();
    summon(s, 1, 0, 'cornball');
    summon(s, 1, 1, 'cornball');
    const lh = give(s, 0, 'lonely_hearts');
    let t = run(s, { type: 'playCard', player: 0, iid: lh }).state;
    expect(t.players[1].lanes.filter((l) => l.creature)).toHaveLength(2);
    t.players[1].lanes[1]!.creature = null;
    const lh2 = give(t, 0, 'lonely_hearts');
    t = run(t, { type: 'playCard', player: 0, iid: lh2 }).state;
    expect(t.players[1].lanes.filter((l) => l.creature)).toHaveLength(0);
  });

  it('Palace of Bone hits the opposing creature when you play into its lane', () => {
    const s = game();
    placeBuilding(s, 0, 2, 'palace_of_bone');
    summon(s, 1, 2, 'ghost_sludger');
    const c = give(s, 0, 'cornball');
    const t = run(s, { type: 'playCard', player: 0, iid: c, lane: 2 }).state;
    expect(creature(t, 1, 2).damage).toBe(5);
  });

  it('Haunted Windmill gives 1 MP when its creature floops', () => {
    const s = game();
    summon(s, 0, 0, 'cornball');
    placeBuilding(s, 0, 0, 'haunted_windmill');
    setMp(s, 0, 5);
    const t = run(s, { type: 'floop', player: 0, lane: 0 }).state;
    expect(t.players[0].mp).toBe(5 - 2 + 1);
  });
});
