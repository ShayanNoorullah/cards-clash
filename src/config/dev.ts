/**
 * Development shortcuts (only active in `npm run dev`):
 *   ?scene=Match      → jump straight into a hot-seat match with two starter decks
 *   ?scene=Match&ai=hard → same, against the AI
 *   ?scene=Gallery    → open the card gallery
 */
import type { Difficulty } from '../ai/profiles';
import { getContent } from '../engine/content';
import type { MatchSceneData } from '../scenes/MatchSetupScene';
import { SCENE_KEYS } from './display';

export function devStartScene(): { key: string; data?: object } | null {
  if (!import.meta.env.DEV || typeof location === 'undefined') return null;
  const key = new URLSearchParams(location.search).get('scene');
  if (!key || !(Object.values(SCENE_KEYS) as string[]).includes(key)) return null;
  if (key === SCENE_KEYS.Match) {
    const { starterDecks } = getContent();
    const seed = new URLSearchParams(location.search).get('seed') ?? 'dev';
    const data: MatchSceneData = {
      seed,
      seats: [
        { name: 'Player 1', human: true, deck: starterDecks[0]! },
        new URLSearchParams(location.search).get('ai')
          ? {
              name: 'AI',
              human: false,
              deck: starterDecks[5]!,
              ai: { difficulty: (new URLSearchParams(location.search).get('ai') as Difficulty) ?? 'normal' },
            }
          : { name: 'Player 2', human: true, deck: starterDecks[5]! },
      ],
    };
    return { key, data };
  }
  return { key };
}
