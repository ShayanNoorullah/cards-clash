/**
 * Web Worker entry: runs AI decisions off the main thread so animations stay
 * smooth on budget phones. The worker loads its own copy of the game content.
 */
import { getContent } from '../engine/content';
import type { GameState, PlayerId } from '../engine/types';
import { decide } from './AiPlayer';
import { getProfile, type BossHooks, type Difficulty } from './profiles';

export interface AiRequest {
  id: number;
  state: GameState;
  player: PlayerId;
  difficulty: Difficulty;
  hooks?: BossHooks;
}

const worker = self as unknown as {
  onmessage: ((e: MessageEvent<AiRequest>) => void) | null;
  postMessage: (message: unknown) => void;
};

worker.onmessage = (e) => {
  const { id, state, player, difficulty, hooks } = e.data;
  try {
    const decision = decide(state, player, getContent().ctx, getProfile(difficulty, hooks));
    worker.postMessage({ id, decision });
  } catch (err) {
    worker.postMessage({ id, error: err instanceof Error ? err.message : String(err) });
  }
};
