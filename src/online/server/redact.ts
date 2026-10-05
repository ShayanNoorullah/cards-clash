/**
 * Hidden information. The server keeps the full game state; each player only
 * ever receives a copy where the opponent's hand and both decks (order and
 * contents) are replaced by face-down placeholders, and the RNG is removed so
 * future draws can't be predicted. Pure.
 */
import type { GameEvent } from '../../engine/events';
import { cloneState } from '../../engine/state';
import type { CardInstance, GameState, PlayerId } from '../../engine/types';

export const HIDDEN_CARD = '__hidden';

const faceDown = (c: CardInstance, i: number, prefix: string): CardInstance => ({
  iid: `${prefix}${i}`,
  cardId: HIDDEN_CARD,
  owner: c.owner,
});

export function redactState(state: GameState, viewer: PlayerId): GameState {
  const s = cloneState(state);
  s.seed = 0;
  s.rng = 0;
  for (const p of s.players) {
    p.deck = p.deck.map((c, i) => faceDown(c, i, `deck${p.id}-`));
    if (p.id !== viewer) p.hand = p.hand.map((c, i) => faceDown(c, i, `hand${p.id}-`));
  }
  return s;
}

/** Hides what the opponent drew (everything else in the event stream is public). */
export function redactEvents(events: readonly GameEvent[], viewer: PlayerId): GameEvent[] {
  return events.map((e) => {
    if (e.type === 'cardDrawn' && e.player !== viewer)
      return { ...e, cardId: HIDDEN_CARD, iid: `drawn-${e.iid}` };
    return e;
  });
}

/** True if a (client-side) state contains no hidden information about `viewer`'s opponent. */
export function isRedactedFor(state: GameState, viewer: PlayerId): boolean {
  const opp = state.players[viewer === 0 ? 1 : 0];
  return (
    opp.hand.every((c) => c.cardId === HIDDEN_CARD) &&
    state.players.every((p) => p.deck.every((c) => c.cardId === HIDDEN_CARD)) &&
    state.rng === 0
  );
}
