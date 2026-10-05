/**
 * Typed access to src/data/balance.json with validation at load time.
 * Pure TypeScript: safe for the client, AI workers and Edge Functions.
 */
import rawBalance from '../data/balance.json';

export interface MatchBalance {
  heroMaxHp: number;
  laneCount: number;
  deckSize: number;
  maxCopiesCommon: number;
  maxCopiesUncommon: number;
  maxCopiesRare: number;
  maxCopiesEpic: number;
  maxCopiesLegendary: number;
  firstPlayerHandSize: number;
  secondPlayerHandSize: number;
  /** The player who goes first skips the draw on their very first turn. */
  firstPlayerSkipsFirstDraw: boolean;
  mulligansAllowed: number;
  startingMp: number;
  mpPerTurn: number;
  maxMp: number;
  extraDrawCost: number;
  extraDrawsPerTurn: number;
  moveCost: number;
  maxMovesPerCreaturePerTurn: number;
  fatigueDamage: number;
  maxHandSize: number;
  ultimateChargePerDamage: number;
  ultimateChargeMax: number;
  maxEffectResolutionsPerAction: number;
  /** Safety valve: the match is declared a draw after this many total turns. */
  maxTurns: number;
}

export interface OnlineBalance {
  turnTimerSeconds: number;
  reconnectGraceSeconds: number;
  rankedCardLevel: number;
}

/** Bonuses for a card at a given level (1..5). `ability` adds to damage, heal and poison amounts. */
export interface CardLevelBonus {
  level: number;
  atk: number;
  def: number;
  ability: number;
}

export interface Balance {
  version: number;
  match: MatchBalance;
  online: OnlineBalance;
  cardLevels: CardLevelBonus[];
}

const MATCH_INT_KEYS: readonly Exclude<keyof MatchBalance, 'firstPlayerSkipsFirstDraw'>[] = [
  'heroMaxHp',
  'laneCount',
  'deckSize',
  'maxCopiesCommon',
  'maxCopiesUncommon',
  'maxCopiesRare',
  'maxCopiesEpic',
  'maxCopiesLegendary',
  'firstPlayerHandSize',
  'secondPlayerHandSize',
  'mulligansAllowed',
  'startingMp',
  'mpPerTurn',
  'maxMp',
  'extraDrawCost',
  'extraDrawsPerTurn',
  'moveCost',
  'maxMovesPerCreaturePerTurn',
  'fatigueDamage',
  'maxHandSize',
  'ultimateChargePerDamage',
  'ultimateChargeMax',
  'maxEffectResolutionsPerAction',
  'maxTurns',
];

const ONLINE_KEYS: readonly (keyof OnlineBalance)[] = [
  'turnTimerSeconds',
  'reconnectGraceSeconds',
  'rankedCardLevel',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function checkNonNegativeInts(obj: unknown, keys: readonly string[], path: string, errors: string[]): void {
  if (!isRecord(obj)) {
    errors.push(`${path} must be an object`);
    return;
  }
  for (const key of keys) {
    const v = obj[key];
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 0) {
      errors.push(`${path}.${key} must be a non-negative integer (got ${JSON.stringify(v)})`);
    }
  }
}

/** Validates an unknown value as Balance. Returns the list of problems (empty = valid). */
export function validateBalance(value: unknown): string[] {
  if (!isRecord(value)) return ['balance must be an object'];
  const errors: string[] = [];
  if (typeof value.version !== 'number') errors.push('version must be a number');
  checkNonNegativeInts(value.match, MATCH_INT_KEYS, 'match', errors);
  if (isRecord(value.match) && typeof value.match.firstPlayerSkipsFirstDraw !== 'boolean') {
    errors.push('match.firstPlayerSkipsFirstDraw must be a boolean');
  }
  checkNonNegativeInts(value.online, ONLINE_KEYS, 'online', errors);
  if (!Array.isArray(value.cardLevels) || value.cardLevels.length === 0) {
    errors.push('cardLevels must be a non-empty array');
  } else {
    (value.cardLevels as unknown[]).forEach((l, i) => {
      checkNonNegativeInts(l, ['level', 'atk', 'def', 'ability'], `cardLevels[${i}]`, errors);
      if (isRecord(l) && l.level !== i + 1) errors.push(`cardLevels[${i}].level must be ${i + 1}`);
    });
  }
  if (errors.length > 0) return errors;

  const m = value.match as unknown as MatchBalance;
  if (m.heroMaxHp < 1) errors.push('match.heroMaxHp must be >= 1');
  if (m.laneCount < 1) errors.push('match.laneCount must be >= 1');
  if (m.deckSize < 1) errors.push('match.deckSize must be >= 1');
  if (m.startingMp > m.maxMp) errors.push('match.startingMp must be <= match.maxMp');
  if (m.firstPlayerHandSize > m.maxHandSize || m.secondPlayerHandSize > m.maxHandSize) {
    errors.push('starting hand sizes must be <= match.maxHandSize');
  }
  if (m.ultimateChargeMax < 1) errors.push('match.ultimateChargeMax must be >= 1');
  if (m.maxEffectResolutionsPerAction < 1) errors.push('match.maxEffectResolutionsPerAction must be >= 1');
  return errors;
}

function load(): Balance {
  const errors = validateBalance(rawBalance);
  if (errors.length > 0) throw new Error(`Invalid balance.json:\n- ${errors.join('\n- ')}`);
  const b = rawBalance as Balance;
  return Object.freeze({
    ...b,
    match: Object.freeze({ ...b.match }),
    online: Object.freeze({ ...b.online }),
    cardLevels: Object.freeze(b.cardLevels.map((l) => Object.freeze({ ...l }))) as CardLevelBonus[],
  });
}

/** Level bonus for a card level (clamped to the table). */
export function levelBonus(level: number): CardLevelBonus {
  const table = BALANCE.cardLevels;
  return table[Math.max(1, Math.min(table.length, Math.floor(level))) - 1]!;
}

/** The validated, deeply frozen balance configuration. */
export const BALANCE: Readonly<Balance> = load();
