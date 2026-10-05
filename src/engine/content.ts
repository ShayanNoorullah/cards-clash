/**
 * Loads and validates the shipped game content (cards, heroes, starter decks).
 * Validation runs once, on first use; any content mistake throws with the full
 * list of problems, so broken data can never reach a match.
 */
import cardData from '../data/cards.json';
import heroData from '../data/heroes.json';
import starterDeckData from '../data/starter-decks.json';
import { BALANCE } from './balance';
import { createCardDb, createHeroDb } from './cards';
import { expandCounts, validateDeck } from './deck';
import { validateKeywordData } from './keywords';
import { countLandscapesIn } from './requirements';
import type { DeckList, RulesContext } from './types';

export interface StarterDeck extends DeckList {
  id: string;
  name: string;
  description: string;
}

export interface GameContent {
  ctx: RulesContext;
  starterDecks: readonly StarterDeck[];
}

interface RawStarterDeck {
  id: string;
  name: string;
  description: string;
  heroId: string;
  landscapes: string[];
  cards: Record<string, number>;
}

/** Builds and validates content from raw JSON (exported for tests and tools). */
export function buildContent(rawCards: unknown, rawHeroes: unknown, rawDecks: unknown): GameContent {
  const keywordErrors = validateKeywordData();
  if (keywordErrors.length > 0) throw new Error(`Invalid keyword data:\n- ${keywordErrors.join('\n- ')}`);

  const cards = createCardDb(rawCards);
  const heroes = createHeroDb(rawHeroes, cards);
  const ctx: RulesContext = { cards, heroes, balance: BALANCE.match };

  if (!Array.isArray(rawDecks)) throw new Error('Starter deck data must be an array');
  const errors: string[] = [];
  const ids = new Set<string>();
  const starterDecks = (rawDecks as RawStarterDeck[]).map((raw) => {
    const deck: StarterDeck = {
      id: raw.id,
      name: raw.name,
      description: raw.description,
      heroId: raw.heroId,
      landscapes: raw.landscapes as DeckList['landscapes'],
      cards: expandCounts(raw.cards ?? {}),
    };
    if (ids.has(deck.id)) errors.push(`${deck.id}: duplicate starter deck id`);
    ids.add(deck.id);
    for (const e of validateDeck(deck, ctx)) errors.push(`${deck.id}: ${e}`);
    // Every card in a starter deck must be castable with the deck's own landscapes.
    for (const id of new Set(deck.cards)) {
      const card = cards.byId.get(id);
      if (!card) continue;
      for (const r of card.requirements) {
        if (countLandscapesIn(deck.landscapes, r.landscape) < r.count) {
          errors.push(
            `${deck.id}: ${card.name} needs ${r.count} ${r.landscape}, but the deck cannot provide it`,
          );
        }
      }
    }
    return deck;
  });
  if (errors.length > 0) throw new Error(`Invalid starter decks:\n- ${errors.join('\n- ')}`);
  return { ctx, starterDecks };
}

let cached: GameContent | null = null;

/** The validated game content shipped with the game (loaded lazily, once). */
export function getContent(): GameContent {
  cached ??= buildContent(cardData, heroData, starterDeckData);
  return cached;
}
