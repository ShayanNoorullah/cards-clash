/**
 * Board evaluation from one player's point of view. Uses PUBLIC information
 * only: the board, hero HP, charges and the opponent's hand/deck SIZES. It never
 * reads the opponent's hand or either deck's order.
 */
import { creatureAtk, creatureDef, creatureKeywords } from '../engine/statics';
import type { CreatureInPlay, GameState, KeywordValues, PlayerId, RulesContext } from '../engine/types';
import { other } from '../engine/types';
import type { EvalWeights } from './profiles';

export const WIN_SCORE = 1_000_000;

const KEYWORD_VALUE: Partial<Record<keyof KeywordValues, number>> = {
  guard: 1.2,
  ranged: 1,
  lifesteal: 1.2,
  thorns: 0.8,
  counter: 1,
  poison: 1,
  regenerate: 0.9,
  rush: 0.3,
  swift: 0.3,
};

interface SideInfo {
  /** Damage this side could push to the enemy hero on its next attack. */
  unblockedDamage: number;
  value: number;
}

function creatureValue(
  state: GameState,
  ctx: RulesContext,
  c: CreatureInPlay,
  lane: number,
  kw: KeywordValues,
  w: EvalWeights,
): number {
  const atk = creatureAtk(state, ctx, c, lane);
  const def = Math.max(0, creatureDef(state, ctx, c, lane));
  let v = atk * w.creatureAtk + def * w.creatureDef;
  for (const [k, mult] of Object.entries(KEYWORD_VALUE)) {
    const n = kw[k as keyof KeywordValues] ?? 0;
    if (n > 0) v += n * (mult ?? 0) * w.keyword;
  }
  if (c.shield) v += 1.2 * w.keyword;
  if (c.stealth) v += 0.5 * w.keyword;
  if (c.frozen) v -= atk * w.frozenPenalty;
  if (c.poison > 0) v -= Math.min(def, c.poison) * w.poisonPenalty;
  return v + 1; // being on the board at all is worth something
}

function sideInfo(state: GameState, ctx: RulesContext, me: PlayerId, w: EvalWeights): SideInfo {
  const opp = other(me);
  const mine = state.players[me];
  const theirs = state.players[opp];
  let unblocked = 0;
  let value = 0;
  mine.lanes.forEach((l, lane) => {
    const c = l.creature;
    if (!c) return;
    const kw = creatureKeywords(state, ctx, c, lane);
    value += creatureValue(state, ctx, c, lane, kw, w);
    const atk = creatureAtk(state, ctx, c, lane);
    if (atk <= 0) return;
    const opposing = theirs.lanes[lane]?.creature;
    if (opposing) {
      // Would this attack kill the defender?
      if (atk >= creatureDef(state, ctx, opposing, lane) && !opposing.shield) value += 0.6 * w.pressure;
      return;
    }
    const guarded =
      !(kw.ranged ?? 0) &&
      [lane - 1, lane + 1].some((g) => {
        const gc = theirs.lanes[g]?.creature;
        return !!gc && (creatureKeywords(state, ctx, gc, g).guard ?? 0) > 0;
      });
    if (!guarded && !c.frozen) unblocked += atk;
  });
  for (const l of mine.lanes) if (l.building) value += w.building;
  return { unblockedDamage: unblocked, value };
}

/** Higher is better for `me`. Finished games score ±WIN_SCORE (faster wins score higher). */
export function evaluate(state: GameState, ctx: RulesContext, me: PlayerId, w: EvalWeights): number {
  const opp = other(me);
  if (state.phase === 'ended') {
    if (state.winner === me) return WIN_SCORE - state.turn;
    if (state.winner === opp) return -WIN_SCORE + state.turn;
    return -WIN_SCORE / 10;
  }
  const a = state.players[me];
  const b = state.players[opp];
  const mineInfo = sideInfo(state, ctx, me, w);
  const theirInfo = sideInfo(state, ctx, opp, w);

  let score = 0;
  // Hero health, with growing urgency as the enemy gets low.
  score += (a.hp - b.hp) * w.heroHp;
  score += Math.max(0, 15 - b.hp) ** 1.3 * w.enemyLowHpBonus;
  score -= Math.max(0, 15 - a.hp) ** 1.3 * w.enemyLowHpBonus;
  // Board.
  score += mineInfo.value - theirInfo.value;
  score += (mineInfo.unblockedDamage - theirInfo.unblockedDamage * 1.15) * w.pressure;
  if (mineInfo.unblockedDamage >= b.hp) score += w.lethalThreat;
  if (theirInfo.unblockedDamage >= a.hp) score -= w.lethalThreat * 1.5;
  // Cards and resources (public counts only).
  score += (a.hand.length - b.hand.length) * w.card;
  if (a.deck.length === 0) score -= w.deckOut * 3;
  score += (a.ultimateCharge - b.ultimateCharge) * w.charge;
  score += b.lanes.filter((l) => l.flipped).length * w.flippedEnemyLandscape;
  score -= a.lanes.filter((l) => l.flipped).length * w.flippedEnemyLandscape;
  return score;
}
