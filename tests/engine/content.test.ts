import { describe, expect, it } from 'vitest';
import {
  applyAction,
  buildContent,
  collectibleCards,
  countOwnedCards,
  getLegalActions,
  LANDSCAPE_TYPES,
  playableHeroes,
  validateDeck,
  type GameState,
} from '../../src/engine';
import cardData from '../fixtures/legacy-cards.json';
import heroData from '../fixtures/legacy-heroes.json';
import deckData from '../fixtures/legacy-starter-decks.json';
import { LAB_CTX, lanesFor, realGame } from '../contentHelpers';
import { give, setMp, summon } from '../helpers';

/**
 * The original card pool (kept as a fixture). The shipped Card Wars pool has
 * its own tests in tests/cardwars.test.ts.
 */
const { ctx, starterDecks } = buildContent(cardData, heroData, deckData);
const collectible = collectibleCards(ctx.cards);

describe('legacy content fixture', () => {
  it('has 120 landscape cards (20 per landscape) plus 10 neutral cards', () => {
    expect(collectible).toHaveLength(130);
    for (const l of LANDSCAPE_TYPES) {
      const set = collectible.filter((c) => c.landscape === l);
      expect(set, l).toHaveLength(20);
      expect(
        set.filter((c) => c.type === 'creature'),
        l,
      ).toHaveLength(13);
      expect(
        set.filter((c) => c.type === 'spell'),
        l,
      ).toHaveLength(4);
      expect(
        set.filter((c) => c.type === 'building'),
        l,
      ).toHaveLength(3);
      const rarity = (r: string) => set.filter((c) => c.rarity === r).length;
      expect(
        [rarity('common'), rarity('uncommon'), rarity('rare'), rarity('epic'), rarity('legendary')],
        l,
      ).toEqual([9, 6, 3, 1, 1]);
    }
    expect(collectible.filter((c) => c.landscape === 'neutral')).toHaveLength(10);
  });

  it('has unique card names and art keys', () => {
    expect(new Set(ctx.cards.all.map((c) => c.name)).size).toBe(ctx.cards.all.length);
    expect(new Set(ctx.cards.all.map((c) => c.artKey)).size).toBe(ctx.cards.all.length);
  });

  it('every creature with abilities, statics or keywords has rules text', () => {
    for (const c of ctx.cards.all) {
      if (c.type === 'creature' && (c.keywords.length > 0 || c.abilities || c.statics || c.floop)) {
        expect(c.text.length, c.id).toBeGreaterThan(0);
      }
    }
  });

  it('has 8 heroes and 10 legal starter decks covering every hero', () => {
    expect(playableHeroes(ctx.heroes)).toHaveLength(8);
    expect(ctx.heroes.all.filter((h) => h.boss)).toHaveLength(8);
    expect(starterDecks).toHaveLength(10);
    for (const d of starterDecks) expect(validateDeck(d, ctx), d.id).toEqual([]);
    expect(new Set(starterDecks.map((d) => d.heroId))).toEqual(
      new Set(playableHeroes(ctx.heroes).map((h) => h.id)),
    );
  });

  it('content validation reports broken data clearly', () => {
    const badCards = [...cardData, { ...cardData[0], id: 'broken', name: 'Broken', artKey: 'b', cost: -1 }];
    expect(() => buildContent(badCards, heroData, deckData)).toThrow(/broken: cost must be/);
    const badDecks = [{ ...deckData[0], cards: { golden_sunsprout: 40 } }];
    expect(() => buildContent(cardData, heroData, badDecks)).toThrow(/40 copies, max 3/);
    const badReq = [{ ...deckData[0], landscapes: ['azure', 'azure', 'azure', 'azure'] }];
    expect(() => buildContent(cardData, heroData, badReq)).toThrow(/cannot provide it/);
    const badSummon = [
      ...cardData,
      {
        ...cardData[1],
        id: 'bad_summoner',
        name: 'Bad Summoner',
        artKey: 'x',
        abilities: [
          {
            trigger: 'onPlay',
            effects: [{ type: 'summon', cardId: 'azure_frostmote', where: 'randomEmptyLane' }],
          },
        ],
      },
    ];
    expect(() => buildContent(badSummon, heroData, deckData)).toThrow(/not a token/);
  });
});

/** Cards are conserved by every action; HP stays in range. */
function sane(before: GameState, state: GameState): void {
  for (const p of state.players) {
    expect(countOwnedCards(state, p.id)).toBe(countOwnedCards(before, p.id));
    expect(p.hp).toBeGreaterThanOrEqual(0);
    expect(p.hp).toBeLessThanOrEqual(p.maxHp);
  }
}

describe('every collectible card works in play', () => {
  it.each(collectible.map((c) => [c.id, c] as const))('%s', (_id, card) => {
    const s = realGame({
      firstPlayer: 0,
      ctx: LAB_CTX,
      lanes: [lanesFor(card), ['golden', 'murk', 'dune', 'ember']],
    });
    summon(s, 1, 0, 'neutral_sellsword');
    summon(s, 1, 1, 'murk_slime');
    summon(s, 1, 3, 'neutral_wanderer');
    summon(s, 0, 1, 'neutral_wanderer', { damage: 1 });
    summon(s, 0, 3, 'neutral_stone_sentry');
    s.players[0].lanes[0]!.flipped = false;
    setMp(s, 0, 6);
    const iid = give(s, 0, card.id);

    const plays = getLegalActions(s, 0, LAB_CTX).filter((a) => a.type === 'playCard' && a.iid === iid);
    expect(plays.length, `${card.id} should be playable`).toBeGreaterThan(0);
    let after: GameState | null = null;
    for (const action of plays) {
      const r = applyAction(s, action, LAB_CTX);
      expect(r.ok, JSON.stringify(action)).toBe(true);
      if (r.ok) {
        sane(s, r.state);
        after ??= r.state;
      }
    }
    let state = after!;

    // Floop it if it has a floop ability.
    if (card.type === 'creature' && card.floop) {
      state.players[0].mp = 6;
      const floops = getLegalActions(state, 0, LAB_CTX).filter((a) => a.type === 'floop');
      const own = floops.find(
        (a) => a.type === 'floop' && state.players[0].lanes[a.lane]!.creature?.cardId === card.id,
      );
      expect(own, `${card.id} floop`).toBeDefined();
      const r = applyAction(state, own!, LAB_CTX);
      expect(r.ok).toBe(true);
      if (r.ok) state = r.state;
    }

    // Two full turns: combat, start/end-of-turn triggers.
    for (let i = 0; i < 2 && state.phase !== 'ended'; i++) {
      const r = applyAction(state, { type: 'endTurn', player: state.activePlayer }, LAB_CTX);
      expect(r.ok).toBe(true);
      if (r.ok) {
        sane(state, r.state);
        state = r.state;
      }
    }

    // Destroy everything: On Destroy / ally & enemy destroyed triggers.
    if (state.phase !== 'ended') {
      state.players[state.activePlayer].mp = 6;
      const wipe = give(state, state.activePlayer, 'lab_obliterate');
      const r = applyAction(state, { type: 'playCard', player: state.activePlayer, iid: wipe }, LAB_CTX);
      expect(r.ok).toBe(true);
      if (r.ok) sane(state, r.state);
    }
  });
});
