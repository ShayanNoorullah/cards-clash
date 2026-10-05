import { describe, expect, it } from 'vitest';
import { applyAction, countOwnedCards, createGame, getLegalActions, validateDeck } from '../../src/engine';
import {
  AZURE_DUNE_DECK,
  CTX,
  GOLDEN_EMBER_DECK,
  act,
  ctxWith,
  eventsOf,
  expectError,
  makeDeck,
} from '../helpers';

const DECKS = [GOLDEN_EMBER_DECK, AZURE_DUNE_DECK] as [typeof GOLDEN_EMBER_DECK, typeof AZURE_DUNE_DECK];

describe('deck validation', () => {
  it('accepts the fixture decks', () => {
    expect(validateDeck(GOLDEN_EMBER_DECK, CTX)).toEqual([]);
    expect(validateDeck(AZURE_DUNE_DECK, CTX)).toEqual([]);
  });

  it('requires exactly 40 cards', () => {
    const short = { ...GOLDEN_EMBER_DECK, cards: GOLDEN_EMBER_DECK.cards.slice(0, 39) };
    expect(validateDeck(short, CTX)).toContain('Deck has 39 cards; it needs exactly 40.');
  });

  it('enforces copy limits by rarity (3 common/uncommon, 1 epic/legendary)', () => {
    const base = GOLDEN_EMBER_DECK.cards.filter((id) => id !== 'golden_sprout').slice(0, 36);
    const fourCommons = { ...GOLDEN_EMBER_DECK, cards: [...base, ...Array(4).fill('golden_sprout')] };
    expect(validateDeck(fourCommons, CTX).some((e) => e.includes('4 copies, max 3'))).toBe(true);

    const noTitan = GOLDEN_EMBER_DECK.cards.filter((id) => id !== 'neutral_titan').slice(0, 38);
    const twoLegendaries = { ...GOLDEN_EMBER_DECK, cards: [...noTitan, 'neutral_titan', 'neutral_titan'] };
    expect(validateDeck(twoLegendaries, CTX)).toContain(
      'Hollowpeak Titan: 2 copies, max 1 for legendary cards.',
    );
  });

  it('rejects unknown cards, missing hero and wrong landscape count', () => {
    const bad = {
      heroId: '',
      landscapes: ['golden', 'golden', 'ember'] as never,
      cards: ['nope', ...GOLDEN_EMBER_DECK.cards.slice(1)],
    };
    const errors = validateDeck(bad, CTX);
    expect(errors).toContain('Deck needs a hero.');
    expect(errors).toContain('Deck needs exactly 4 landscapes.');
    expect(errors).toContain('Unknown card "nope".');
  });

  it('createGame refuses illegal decks', () => {
    const short = { ...GOLDEN_EMBER_DECK, cards: GOLDEN_EMBER_DECK.cards.slice(0, 30) };
    expect(() => createGame({ seed: 1, decks: [short, AZURE_DUNE_DECK] }, CTX)).toThrow(/Deck 1 is illegal/);
  });
});

describe('match setup', () => {
  it('first player draws 5, second draws 6; both start at 25 HP', () => {
    const { state, events } = createGame({ seed: 7, decks: DECKS }, CTX);
    const first = state.players[state.firstPlayer];
    const second = state.players[state.firstPlayer === 0 ? 1 : 0];
    expect(first.hand).toHaveLength(5);
    expect(second.hand).toHaveLength(6);
    expect(first.deck).toHaveLength(35);
    expect(second.deck).toHaveLength(34);
    expect(state.players.every((p) => p.hp === 25 && p.maxHp === 25)).toBe(true);
    expect(state.phase).toBe('arrange');
    expect(events).toEqual([{ type: 'gameCreated', firstPlayer: state.firstPlayer }]);
  });

  it('the coin flip is seeded: same seed → same result, and both outcomes occur', () => {
    const a = createGame({ seed: 'abc', decks: DECKS }, CTX).state;
    const b = createGame({ seed: 'abc', decks: DECKS }, CTX).state;
    expect(a).toEqual(b);
    const firsts = new Set(
      Array.from({ length: 40 }, (_, i) => createGame({ seed: i, decks: DECKS }, CTX).state.firstPlayer),
    );
    expect(firsts).toEqual(new Set([0, 1]));
  });

  it('shuffles decks and gives every card a unique instance id', () => {
    const { state } = createGame({ seed: 3, decks: DECKS }, CTX);
    const iids = state.players.flatMap((p) => [...p.deck, ...p.hand].map((c) => c.iid));
    expect(new Set(iids).size).toBe(80);
    expect(countOwnedCards(state, 0)).toBe(40);
    const inOrder = [...state.players[0].hand, ...state.players[0].deck].map((c) => c.cardId);
    expect(inOrder).not.toEqual(GOLDEN_EMBER_DECK.cards);
  });

  it('landscapes must be arranged from the deck list before anything else', () => {
    let { state } = createGame({ seed: 1, decks: DECKS }, CTX);
    expectError(state, { type: 'mulligan', player: 0, iids: [] }, 'WRONG_PHASE');
    expectError(state, { type: 'endTurn', player: state.firstPlayer }, 'WRONG_PHASE');
    expectError(
      state,
      { type: 'arrangeLandscapes', player: 0, order: ['azure', 'golden', 'ember', 'ember'] },
      'INVALID_ARRANGEMENT',
    );
    expectError(
      state,
      { type: 'arrangeLandscapes', player: 0, order: ['golden', 'ember', 'ember'] },
      'INVALID_ARRANGEMENT',
    );

    const r = act(state, {
      type: 'arrangeLandscapes',
      player: 0,
      order: ['ember', 'golden', 'ember', 'golden'],
    });
    state = r.state;
    expect(state.players[0].lanes.map((l) => l.landscape)).toEqual(['ember', 'golden', 'ember', 'golden']);
    expect(eventsOf(r.events, 'landscapesArranged')).toHaveLength(1);
    expectError(
      state,
      { type: 'arrangeLandscapes', player: 0, order: ['ember', 'golden', 'ember', 'golden'] },
      'ALREADY_DONE',
    );
    expect(state.phase).toBe('arrange');

    state = act(state, {
      type: 'arrangeLandscapes',
      player: 1,
      order: ['dune', 'azure', 'murk', 'dune'],
    }).state;
    expect(state.phase).toBe('mulligan');
  });

  it('legal arrangements are the unique permutations of the landscape pool', () => {
    const { state } = createGame({ seed: 1, decks: DECKS }, CTX);
    // golden,golden,ember,ember → 4!/(2!2!) = 6; azure,dune,dune,murk → 4!/2! = 12
    expect(getLegalActions(state, 0, CTX)).toHaveLength(6);
    expect(getLegalActions(state, 1, CTX)).toHaveLength(12);
  });
});

describe('mulligan', () => {
  function atMulligan(seed = 5) {
    let { state } = createGame({ seed, decks: DECKS }, CTX);
    state = act(state, { type: 'arrangeLandscapes', player: 0, order: [...DECKS[0].landscapes] }).state;
    state = act(state, { type: 'arrangeLandscapes', player: 1, order: [...DECKS[1].landscapes] }).state;
    return state;
  }

  it('returns chosen cards, shuffles, and redraws the same number', () => {
    const state = atMulligan();
    const hand = state.players[0].hand;
    const back = [hand[0]!.iid, hand[1]!.iid];
    const { state: next, events } = act(state, { type: 'mulligan', player: 0, iids: back });
    const p = next.players[0];
    expect(p.hand).toHaveLength(hand.length);
    expect(p.hand.map((c) => c.iid)).toEqual(expect.arrayContaining(hand.slice(2).map((c) => c.iid)));
    expect(countOwnedCards(next, 0)).toBe(40);
    expect(eventsOf(events, 'mulligan')[0]).toEqual({ type: 'mulligan', player: 0, returned: 2 });
    expect(eventsOf(events, 'cardDrawn')).toHaveLength(2);
  });

  it('allows exactly one decision per player and validates the cards', () => {
    const state = atMulligan();
    expectError(state, { type: 'mulligan', player: 0, iids: ['not-a-card'] }, 'CARD_NOT_IN_HAND');
    const iid = state.players[0].hand[0]!.iid;
    expectError(state, { type: 'mulligan', player: 0, iids: [iid, iid] }, 'INVALID_MULLIGAN');
    const next = act(state, { type: 'mulligan', player: 0, iids: [] }).state;
    expectError(next, { type: 'mulligan', player: 0, iids: [] }, 'ALREADY_DONE');
  });

  it('starts the first turn when both players are done', () => {
    let state = atMulligan(11);
    state = act(state, { type: 'mulligan', player: 0, iids: [] }).state;
    expect(state.phase).toBe('mulligan');
    const r = act(state, { type: 'mulligan', player: 1, iids: [] });
    expect(r.state.phase).toBe('main');
    expect(r.state.turn).toBe(1);
    expect(r.state.activePlayer).toBe(r.state.firstPlayer);
    expect(r.state.players[r.state.firstPlayer].mp).toBe(2);
    expect(eventsOf(r.events, 'turnStarted')).toEqual([
      { type: 'turnStarted', player: r.state.firstPlayer, turn: 1, mp: 2 },
    ]);
  });

  it('with mulligans disabled, the match starts right after arranging', () => {
    const ctx = ctxWith({ mulligansAllowed: 0 });
    let { state } = createGame({ seed: 2, decks: DECKS }, ctx);
    state = act(state, { type: 'arrangeLandscapes', player: 0, order: [...DECKS[0].landscapes] }, ctx).state;
    state = act(state, { type: 'arrangeLandscapes', player: 1, order: [...DECKS[1].landscapes] }, ctx).state;
    expect(state.phase).toBe('main');
  });

  it('only non-empty mulligans are refused when none are left', () => {
    const ctx = ctxWith({ mulligansAllowed: 1 });
    const state = atMulligan();
    state.players[0].mulligansUsed = 1;
    const iid = state.players[0].hand[0]!.iid;
    expect(applyAction(state, { type: 'mulligan', player: 0, iids: [iid] }, ctx).ok).toBe(false);
    expect(applyAction(state, { type: 'mulligan', player: 0, iids: [] }, ctx).ok).toBe(true);
  });

  it('makeDeck helper builds 40 legal cards', () => {
    expect(
      makeDeck(
        ['golden', 'golden', 'golden', 'golden'],
        CTX.cards.all.map((c) => c.id),
      ).cards,
    ).toHaveLength(40);
  });
});
