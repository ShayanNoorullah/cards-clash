import { describe, expect, it } from 'vitest';
import {
  allEffectLists,
  chosenSelector,
  playEffects,
  createCardDb,
  getCard,
  validateCardDef,
} from '../../src/engine';
import testCards from '../fixtures/test-cards.json';
import { TEST_DB } from '../helpers';

const creature = {
  id: 'x_creature',
  name: 'X',
  type: 'creature',
  landscape: 'golden',
  requirements: [{ landscape: 'golden', count: 1 }],
  cost: 1,
  atk: 1,
  def: 1,
  rarity: 'common',
  keywords: [],
  text: '',
  flavorText: '',
  artKey: 'x',
};

describe('card database', () => {
  it('loads the 20 test cards covering every card type and rarity', () => {
    expect(TEST_DB.all).toHaveLength(20);
    const types = new Set(TEST_DB.all.map((c) => c.type));
    expect(types).toEqual(new Set(['creature', 'spell', 'building']));
    const rarities = new Set(TEST_DB.all.map((c) => c.rarity));
    expect(rarities).toEqual(new Set(['common', 'uncommon', 'rare', 'epic', 'legendary']));
    expect(getCard(TEST_DB, 'golden_knight').name).toBe('Haybale Knight');
    expect(() => getCard(TEST_DB, 'nope')).toThrow(/Unknown card/);
  });

  it('accepts a valid creature', () => {
    expect(validateCardDef(creature)).toEqual([]);
  });

  it('reports readable problems for invalid cards', () => {
    const bad = { ...creature, id: 'Bad Id', def: 0, cost: -1, rarity: 'mythic', keywords: ['flying'] };
    const errors = validateCardDef(bad);
    expect(errors.some((e) => e.includes('id must match'))).toBe(true);
    expect(errors.some((e) => e.includes('def must be a positive integer'))).toBe(true);
    expect(errors.some((e) => e.includes('cost must be'))).toBe(true);
    expect(errors.some((e) => e.includes('rarity must be'))).toBe(true);
    expect(errors.some((e) => e.includes('keyword "flying" is invalid'))).toBe(true);
  });

  it('rejects impossible requirements and duplicate requirement types', () => {
    expect(
      validateCardDef({ ...creature, requirements: [{ landscape: 'golden', count: 5 }] }).join(),
    ).toMatch(/can never be met/);
    expect(
      validateCardDef({
        ...creature,
        requirements: [
          { landscape: 'golden', count: 1 },
          { landscape: 'golden', count: 1 },
        ],
      }).join(),
    ).toMatch(/twice/);
  });

  it('spells cannot use creature-source selectors or mix chosen targets', () => {
    const spell = {
      id: 'x_spell',
      name: 'S',
      type: 'spell',
      landscape: 'neutral',
      requirements: [],
      cost: 1,
      rarity: 'common',
      text: 't',
      flavorText: '',
      artKey: 's',
    };
    expect(
      validateCardDef({ ...spell, effects: [{ type: 'damage', target: 'self', amount: 1 }] }).join(),
    ).toMatch(/only for creatures/);
    expect(
      validateCardDef({
        ...spell,
        effects: [
          { type: 'damage', target: 'chosenEnemyCreature', amount: 1 },
          { type: 'heal', target: 'chosenAllyCreature', amount: 1 },
        ],
      }).join(),
    ).toMatch(/only one kind of chosen target/);
    expect(validateCardDef({ ...spell, effects: [{ type: 'explode' }] }).join()).toMatch(
      /not a known effect/,
    );
    expect(validateCardDef({ ...spell, effects: [] }).join()).toMatch(/non-empty/);
  });

  it('createCardDb throws on duplicates and lists every error', () => {
    expect(() => createCardDb([creature, creature])).toThrow(/duplicate card id/);
    expect(() => createCardDb({})).toThrow(/must be an array/);
    expect(() => createCardDb([...testCards, { ...creature, atk: -1 }])).toThrow(/atk must be/);
  });

  it('exposes effects and chosen selectors', () => {
    expect(chosenSelector(playEffects(getCard(TEST_DB, 'ember_bolt')))).toBe('chosenCreature');
    expect(chosenSelector(allEffectLists(getCard(TEST_DB, 'dune_scorpion'))[0]!)).toBeNull();
    expect(allEffectLists(getCard(TEST_DB, 'golden_banner'))).toEqual([]);
  });
});
