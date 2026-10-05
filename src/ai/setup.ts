/**
 * Pre-match AI decisions: landscape arrangement and mulligan.
 */
import type { Action } from '../engine/actions';
import { uniquePermutations } from '../engine/legal';
import { countLandscapesIn } from '../engine/requirements';
import type { CardDef, GameState, LandscapeType, PlayerId, RulesContext } from '../engine/types';

/**
 * Arrangement: keep same-type landscapes adjacent (auras, lane buffs and
 * Guard favour neighbours) and put the most common type in the middle lanes.
 */
export function chooseArrangement(state: GameState, player: PlayerId): Action {
  const pool = state.players[player].landscapePool;
  let best = pool;
  let bestScore = -Infinity;
  for (const order of uniquePermutations<LandscapeType>(pool)) {
    let score = 0;
    for (let i = 0; i < order.length - 1; i++) if (order[i] === order[i + 1]) score += 2;
    const counts = new Map<LandscapeType, number>();
    for (const l of order) counts.set(l, (counts.get(l) ?? 0) + 1);
    const main = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    if (order[1] === main) score += 1;
    if (order[2] === main) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = order;
    }
  }
  return { type: 'arrangeLandscapes', player, order: [...best] };
}

function castableWith(card: CardDef, landscapes: readonly LandscapeType[]): boolean {
  return card.requirements.every((r) => countLandscapesIn(landscapes, r.landscape) >= r.count);
}

/**
 * Mulligan: throw back cards that can never be cast with this deck's
 * landscapes, and expensive cards (cost >= 4) when the hand has fewer than two
 * cheap plays (cost <= 2).
 */
export function chooseMulligan(state: GameState, player: PlayerId, ctx: RulesContext): Action {
  const p = state.players[player];
  const cards = p.hand.map((inst) => ({ inst, card: ctx.cards.byId.get(inst.cardId)! }));
  const cheap = cards.filter(({ card }) => card.cost <= 2 && castableWith(card, p.landscapePool)).length;
  const back = cards
    .filter(({ card }) => !castableWith(card, p.landscapePool) || (cheap < 2 && card.cost >= 4))
    .map(({ inst }) => inst.iid);
  const allowed = p.mulligansUsed < ctx.balance.mulligansAllowed;
  return { type: 'mulligan', player, iids: allowed ? back : [] };
}
