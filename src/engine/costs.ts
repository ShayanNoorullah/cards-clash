/**
 * Effective costs after temporary cost changes ("spells cost 2 less this
 * turn") and static ones (a building that makes floops cheaper).
 */
import { floopCostStatic } from './statics';
import type { CardDef, CostKind, GameState, PlayerId, RulesContext } from './types';

function modifierTotal(
  state: GameState,
  player: PlayerId,
  kinds: readonly CostKind[],
  landscape?: string,
): number {
  let total = 0;
  for (const m of state.players[player].costMods ?? []) {
    if (m.turn !== state.turn || !kinds.includes(m.kind)) continue;
    if (m.landscape !== undefined && m.landscape !== landscape) continue;
    total += m.amount;
  }
  return total;
}

/** MP needed to play a card from hand right now. */
export function cardCost(state: GameState, player: PlayerId, card: CardDef): number {
  return Math.max(0, card.cost + modifierTotal(state, player, ['card', card.type], card.landscape));
}

/** MP needed to floop the creature in `lane` right now (null if it has no floop). */
export function floopCost(
  state: GameState,
  ctx: RulesContext,
  player: PlayerId,
  lane: number,
): number | null {
  const c = state.players[player].lanes[lane]?.creature;
  if (!c) return null;
  const card = ctx.cards.byId.get(c.cardId);
  if (!card || card.type !== 'creature' || !card.floop) return null;
  const mods = modifierTotal(state, player, ['floop'], card.landscape) + floopCostStatic(state, ctx, c, lane);
  return Math.max(0, card.floop.cost + mods);
}
