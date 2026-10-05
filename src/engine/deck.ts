import type { MatchBalance } from './balance';
import { LANDSCAPE_TYPES, type DeckList, type Rarity, type RulesContext } from './types';

export function maxCopiesFor(rarity: Rarity, balance: MatchBalance): number {
  switch (rarity) {
    case 'common':
      return balance.maxCopiesCommon;
    case 'uncommon':
      return balance.maxCopiesUncommon;
    case 'rare':
      return balance.maxCopiesRare;
    case 'epic':
      return balance.maxCopiesEpic;
    case 'legendary':
      return balance.maxCopiesLegendary;
  }
}

/** Returns every reason the deck is illegal (empty = legal). */
export function validateDeck(deck: DeckList, ctx: RulesContext): string[] {
  const { cards, heroes, balance } = ctx;
  const errors: string[] = [];
  if (typeof deck.heroId !== 'string' || deck.heroId === '') errors.push('Deck needs a hero.');
  else if (!heroes.byId.has(deck.heroId)) errors.push(`Unknown hero "${deck.heroId}".`);

  if (!Array.isArray(deck.landscapes) || deck.landscapes.length !== balance.laneCount) {
    errors.push(`Deck needs exactly ${balance.laneCount} landscapes.`);
  } else {
    for (const l of deck.landscapes) {
      if (!(LANDSCAPE_TYPES as readonly string[]).includes(l)) errors.push(`Unknown landscape "${l}".`);
    }
  }

  if (!Array.isArray(deck.cards)) return [...errors, 'Deck cards must be a list.'];
  if (deck.cards.length !== balance.deckSize) {
    errors.push(`Deck has ${deck.cards.length} cards; it needs exactly ${balance.deckSize}.`);
  }

  const counts = new Map<string, number>();
  for (const id of deck.cards) counts.set(id, (counts.get(id) ?? 0) + 1);
  for (const [id, n] of counts) {
    const card = cards.byId.get(id);
    if (!card) {
      errors.push(`Unknown card "${id}".`);
      continue;
    }
    if (card.token) {
      errors.push(`${card.name} is a token and cannot be put in a deck.`);
      continue;
    }
    const max = maxCopiesFor(card.rarity, balance);
    if (n > max) errors.push(`${card.name}: ${n} copies, max ${max} for ${card.rarity} cards.`);
  }
  return errors;
}

/** Converts { cardId: count } into a flat card list (used by content JSON). */
export function expandCounts(counts: Record<string, number>): string[] {
  return Object.entries(counts).flatMap(([id, n]) => Array.from({ length: n }, () => id));
}
