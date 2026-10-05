import { describe, expect, it } from 'vitest';
import { BALANCE, validateBalance } from '../src/engine/balance';
import raw from '../src/data/balance.json';

describe('balance config', () => {
  it('matches the core rules of the game design', () => {
    const m = BALANCE.match;
    expect(m.heroMaxHp).toBe(100);
    expect(m.laneCount).toBe(4);
    expect(m.deckSize).toBe(40);
    expect(m.maxCopiesCommon).toBe(3);
    expect(m.maxCopiesUncommon).toBe(3);
    expect(m.maxCopiesEpic).toBe(1);
    expect(m.maxCopiesLegendary).toBe(1);
    expect(m.firstPlayerHandSize).toBe(5);
    expect(m.secondPlayerHandSize).toBe(6);
    expect(m.startingMp).toBe(2);
    expect(m.mpPerTurn).toBe(1);
    expect(m.maxMp).toBe(8);
    expect(m.extraDrawCost).toBe(1);
    expect(m.moveCost).toBe(1);
    expect(m.fatigueDamage).toBe(5);
    expect(m.maxHandSize).toBe(8);
    expect(m.ultimateChargePerDamage).toBe(10);
    expect(m.maxEffectResolutionsPerAction).toBe(200);
    expect(BALANCE.online.turnTimerSeconds).toBe(60);
  });

  it('the shipped balance.json is valid', () => {
    expect(validateBalance(raw)).toEqual([]);
  });

  it('is frozen at runtime', () => {
    expect(Object.isFrozen(BALANCE)).toBe(true);
    expect(Object.isFrozen(BALANCE.match)).toBe(true);
    expect(() => {
      (BALANCE.match as { heroMaxHp: number }).heroMaxHp = 99;
    }).toThrow();
  });

  it('rejects malformed configs with readable reasons', () => {
    expect(validateBalance(null)).toEqual(['balance must be an object']);

    const missing = structuredClone(raw) as Record<string, unknown>;
    delete (missing.match as Record<string, unknown>).heroMaxHp;
    expect(validateBalance(missing)).toContain(
      'match.heroMaxHp must be a non-negative integer (got undefined)',
    );

    const badMp = structuredClone(raw);
    badMp.match.startingMp = 10;
    expect(validateBalance(badMp)).toContain('match.startingMp must be <= match.maxMp');

    const fractional = structuredClone(raw);
    fractional.match.deckSize = 39.5;
    expect(validateBalance(fractional).length).toBeGreaterThan(0);
  });
});
