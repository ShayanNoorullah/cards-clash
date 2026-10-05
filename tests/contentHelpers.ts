import {
  buildContent,
  collectibleCards,
  createCardDb,
  createGame,
  createHeroDb,
  type CardDef,
  type DeckList,
  type GameState,
  type LandscapeType,
  type PlayerId,
  type RulesContext,
} from '../src/engine';
import heroData from './fixtures/legacy-heroes.json';
import cardData from './fixtures/legacy-cards.json';
import legacyDecks from './fixtures/legacy-starter-decks.json';
import testHeroes from './fixtures/test-heroes.json';
import { act, makeDeck, TEST_BALANCE } from './helpers';

/**
 * The original 130-card pool, kept as a fixture: it uses every keyword,
 * trigger and selector, so these mechanics stay covered even where the
 * shipped Card Wars pool doesn't use them (match rules still do).
 */
const content = buildContent(cardData, heroData, legacyDecks);

/** Legacy cards + legacy heroes + the passive-free "test_hero". */
export const RCTX: RulesContext = {
  cards: content.ctx.cards,
  heroes: createHeroDb([...heroData, ...testHeroes], content.ctx.cards),
  balance: TEST_BALANCE,
};

export const STARTER_DECKS = content.starterDecks;

/**
 * Test-only cards that exercise effect types/selectors no shipped card uses,
 * plus a deliberate infinite loop to prove the resolution cap.
 */
export const LAB_CARDS = [
  {
    id: 'lab_mover',
    name: 'Lab Mover',
    type: 'spell',
    landscape: 'neutral',
    requirements: [],
    cost: 0,
    rarity: 'common',
    text: 'Move an enemy creature.',
    flavorText: '',
    artKey: 'lab',
    effects: [{ type: 'move', target: 'chosenEnemyCreature' }],
  },
  {
    id: 'lab_drain',
    name: 'Lab Drain',
    type: 'spell',
    landscape: 'neutral',
    requirements: [],
    cost: 0,
    rarity: 'common',
    text: 'Enemy loses 2 MP next turn; both draw 1; you discard 1.',
    flavorText: '',
    artKey: 'lab',
    effects: [
      { type: 'loseMp', amount: 2 },
      { type: 'draw', amount: 1, who: 'enemy' },
      { type: 'discard', amount: 1, who: 'self' },
    ],
  },
  {
    id: 'lab_quake',
    name: 'Lab Quake',
    type: 'spell',
    landscape: 'neutral',
    requirements: [],
    cost: 0,
    rarity: 'common',
    text: 'Flip 2 random enemy landscapes; convert one of yours to Ember.',
    flavorText: '',
    artKey: 'lab',
    effects: [
      { type: 'flip', target: 'randomEnemyLandscape', count: 2 },
      { type: 'convert', target: 'chosenAllyLandscape', to: 'ember' },
    ],
  },
  {
    id: 'lab_obliterate',
    name: 'Lab Obliterate',
    type: 'spell',
    landscape: 'neutral',
    requirements: [],
    cost: 0,
    rarity: 'common',
    text: 'Destroy all creatures.',
    flavorText: '',
    artKey: 'lab',
    effects: [{ type: 'destroy', target: 'allCreatures' }],
  },
  {
    id: 'lab_bounce_all',
    name: 'Lab Bounce',
    type: 'spell',
    landscape: 'neutral',
    requirements: [],
    cost: 0,
    rarity: 'common',
    text: 'Return all creatures to hand.',
    flavorText: '',
    artKey: 'lab',
    effects: [{ type: 'returnToHand', target: 'allCreatures' }],
  },
  {
    id: 'lab_both',
    name: 'Lab Both',
    type: 'spell',
    landscape: 'neutral',
    requirements: [],
    cost: 0,
    rarity: 'common',
    text: 'Deal 3 damage to both Heroes.',
    flavorText: '',
    artKey: 'lab',
    effects: [{ type: 'damage', target: 'bothHeroes', amount: 3 }],
  },
  {
    id: 'lab_echo',
    name: 'Lab Echo',
    type: 'creature',
    landscape: 'neutral',
    requirements: [],
    cost: 0,
    rarity: 'common',
    atk: 0,
    def: 99,
    keywords: [],
    text: 'When Damaged: deal 1 damage to all creatures.',
    flavorText: '',
    artKey: 'lab',
    abilities: [{ trigger: 'onDamaged', effects: [{ type: 'damage', target: 'allCreatures', amount: 1 }] }],
  },
  {
    id: 'lab_side',
    name: 'Lab Side',
    type: 'creature',
    landscape: 'neutral',
    requirements: [],
    cost: 0,
    rarity: 'common',
    atk: 1,
    def: 5,
    keywords: [],
    text: 'Floop: if the opposing lane is occupied, deal 1 to adjacent enemies.',
    flavorText: '',
    artKey: 'lab',
    floop: {
      cost: 0,
      condition: { type: 'opposingLaneOccupied' },
      effects: [{ type: 'damage', target: 'adjacentEnemies', amount: 1 }],
    },
  },
];

export const LAB_DB = createCardDb([...cardData, ...LAB_CARDS]);
export const LAB_CTX: RulesContext = { ...RCTX, cards: LAB_DB };

/** A legal filler deck from real neutral + common cards (no hero passive by default). */
export function realDeck(
  heroId = 'test_hero',
  landscapes: LandscapeType[] = ['golden', 'murk', 'dune', 'ember'],
): DeckList {
  const ids = collectibleCards(RCTX.cards)
    .filter((c) => c.rarity === 'common')
    .map((c) => c.id);
  return { ...makeDeck(landscapes, ids, RCTX), heroId };
}

/**
 * A started match on real content. Lanes are set to `lanes` for both players
 * (default: one of each of four types) so any requirement can be met in tests.
 */
export function realGame(
  options: {
    heroes?: [string, string];
    firstPlayer?: PlayerId;
    lanes?: [LandscapeType[], LandscapeType[]];
    ctx?: RulesContext;
  } = {},
): GameState {
  const ctx = options.ctx ?? RCTX;
  const heroes = options.heroes ?? ['test_hero', 'test_hero'];
  const decks: [DeckList, DeckList] = [realDeck(heroes[0]), realDeck(heroes[1])];
  let n = 0;
  let state = createGame({ seed: 'real', decks }, ctx).state;
  while (options.firstPlayer !== undefined && state.firstPlayer !== options.firstPlayer) {
    state = createGame({ seed: `real#${++n}`, decks }, ctx).state;
  }
  for (const p of [0, 1] as const) {
    state = act(state, { type: 'arrangeLandscapes', player: p, order: [...decks[p].landscapes] }, ctx).state;
  }
  for (const p of [0, 1] as const) state = act(state, { type: 'mulligan', player: p, iids: [] }, ctx).state;
  const lanes = options.lanes ?? [
    ['golden', 'murk', 'dune', 'ember'],
    ['azure', 'candy', 'golden', 'murk'],
  ];
  for (const p of [0, 1] as const) {
    state.players[p].lanes.forEach((l, i) => {
      l.landscape = lanes[p][i]!;
    });
  }
  // Clean hands so tests control exactly what is held.
  for (const p of state.players) {
    p.deck.push(...p.hand);
    p.hand = [];
  }
  return state;
}

/** Lanes that satisfy a card's requirements (up to 3 of its type, rest neutral-ish). */
export function lanesFor(card: CardDef): LandscapeType[] {
  const lanes: LandscapeType[] = [];
  for (const r of card.requirements) for (let i = 0; i < r.count; i++) lanes.push(r.landscape);
  const fill: LandscapeType[] = ['golden', 'azure', 'murk', 'dune', 'candy', 'ember'];
  while (lanes.length < 4) lanes.push(fill[lanes.length]!);
  return lanes.slice(0, 4);
}
