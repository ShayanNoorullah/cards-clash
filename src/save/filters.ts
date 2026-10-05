/**
 * Card list filtering and sorting for the Collection and Deck Builder. Pure.
 */
import type { CardDef, CardLandscape, CardType, Rarity } from '../engine/types';
import { ownedCount } from './collection';
import type { SaveData } from './saveData';

export interface CardFilter {
  landscape: CardLandscape | 'all';
  rarity: Rarity | 'all';
  type: CardType | 'all';
  ownership: 'all' | 'owned' | 'missing';
  /** Case-insensitive match on name, rules text and keywords. */
  query: string;
  /** Only cards castable with these landscapes (deck builder). */
  castableWith?: (card: CardDef) => boolean;
}

export const DEFAULT_FILTER: CardFilter = {
  landscape: 'all',
  rarity: 'all',
  type: 'all',
  ownership: 'all',
  query: '',
};

const RARITY_ORDER: Record<Rarity, number> = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
const LANDSCAPE_ORDER = ['azure', 'golden', 'murk', 'dune', 'candy', 'ember', 'neutral'];

export function filterCards(cards: readonly CardDef[], f: CardFilter, save: SaveData): CardDef[] {
  const q = f.query.trim().toLowerCase();
  return cards
    .filter((c) => !c.token)
    .filter((c) => f.landscape === 'all' || c.landscape === f.landscape)
    .filter((c) => f.rarity === 'all' || c.rarity === f.rarity)
    .filter((c) => f.type === 'all' || c.type === f.type)
    .filter((c) => {
      if (f.ownership === 'all') return true;
      const owned = ownedCount(save, c.id) > 0;
      return f.ownership === 'owned' ? owned : !owned;
    })
    .filter((c) => !f.castableWith || f.castableWith(c))
    .filter((c) => {
      if (!q) return true;
      const keywords = c.type === 'creature' ? c.keywords.join(' ') : '';
      return `${c.name} ${c.text} ${keywords} ${c.type}`.toLowerCase().includes(q);
    })
    .sort(
      (a, b) =>
        LANDSCAPE_ORDER.indexOf(a.landscape) - LANDSCAPE_ORDER.indexOf(b.landscape) ||
        a.cost - b.cost ||
        RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity] ||
        a.name.localeCompare(b.name),
    );
}
