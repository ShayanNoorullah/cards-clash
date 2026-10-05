import { getContent } from '../engine/content';
import type { GameState, PlayerId } from '../engine/types';
import { logger } from '../services/logger';
import { decide, type Decision } from './AiPlayer';
import type { AiRequest } from './aiWorker';
import { getProfile, type BossHooks, type Difficulty } from './profiles';

const log = logger.child('AI');
const WORKER_TIMEOUT_MS = 5000;

type Pending = {
  resolve: (d: Decision) => void;
  reject: (e: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

/**
 * Asks the AI for a decision, in a Web Worker when available, otherwise on the
 * main thread (after yielding a frame). Falls back to the main thread if the
 * worker errors or takes too long.
 */
export class AiClient {
  private worker: Worker | null = null;
  private readonly pending = new Map<number, Pending>();
  private nextId = 1;

  constructor() {
    if (typeof Worker === 'undefined') return;
    try {
      this.worker = new Worker(new URL('./aiWorker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = (e: MessageEvent<{ id: number; decision?: Decision; error?: string }>) => {
        const p = this.pending.get(e.data.id);
        if (!p) return;
        this.pending.delete(e.data.id);
        clearTimeout(p.timer);
        if (e.data.decision) p.resolve(e.data.decision);
        else p.reject(new Error(e.data.error ?? 'AI worker error'));
      };
      this.worker.onerror = (e) => {
        log.warn('AI worker failed; using the main thread', e.message);
        this.dispose();
      };
    } catch (err) {
      log.warn('Web Workers unavailable; AI runs on the main thread', err);
      this.worker = null;
    }
  }

  async decide(
    state: GameState,
    player: PlayerId,
    difficulty: Difficulty,
    hooks?: BossHooks,
  ): Promise<Decision> {
    if (this.worker) {
      try {
        return await this.viaWorker(state, player, difficulty, hooks);
      } catch (err) {
        log.warn('AI worker decision failed; retrying on the main thread', err);
      }
    }
    await new Promise((r) => setTimeout(r, 0));
    return decide(state, player, getContent().ctx, getProfile(difficulty, hooks));
  }

  private viaWorker(
    state: GameState,
    player: PlayerId,
    difficulty: Difficulty,
    hooks?: BossHooks,
  ): Promise<Decision> {
    const id = this.nextId++;
    const request: AiRequest = { id, state, player, difficulty };
    if (hooks) request.hooks = hooks;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('AI worker timed out'));
      }, WORKER_TIMEOUT_MS);
      this.pending.set(id, { resolve, reject, timer });
      this.worker!.postMessage(request);
    });
  }

  dispose(): void {
    this.worker?.terminate();
    this.worker = null;
    for (const p of this.pending.values()) {
      clearTimeout(p.timer);
      p.reject(new Error('AI client disposed'));
    }
    this.pending.clear();
  }
}
