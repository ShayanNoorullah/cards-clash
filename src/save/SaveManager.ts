/**
 * Loads, migrates, repairs and persists the player's save. Every change is
 * written immediately (writes are queued so they never interleave). The
 * previous good save is kept as a backup; a corrupt save is set aside and the
 * backup (or a fresh save) is used instead.
 */
import type { GameContent } from '../engine/content';
import { logger } from '../services/logger';
import type { StorageBackend } from '../services/storage';
import { createNewSave, loadSaveString, type SaveData } from './saveData';

const log = logger.child('Save');

export const SAVE_KEY = 'cards-clash.save';
export const BACKUP_KEY = 'cards-clash.save.bak';
export const CORRUPT_KEY = 'cards-clash.save.corrupt';

export type LoadSource = 'main' | 'backup' | 'new';

export class SaveManager {
  private data: SaveData | null = null;
  private writeChain: Promise<void> = Promise.resolve();
  private readonly listeners = new Set<(s: SaveData) => void>();
  loadedFrom: LoadSource = 'new';

  constructor(
    private readonly storage: StorageBackend,
    private readonly content: GameContent,
    private readonly now: () => number = () => Date.now(),
  ) {}

  get save(): SaveData {
    if (!this.data) throw new Error('Save not loaded yet; call load() first');
    return this.data;
  }

  get loaded(): boolean {
    return this.data !== null;
  }

  async load(): Promise<SaveData> {
    const main = await this.safeGet(SAVE_KEY);
    if (main) {
      try {
        const { save, fixes } = loadSaveString(main, this.content, this.now());
        if (fixes.length) log.warn(`Repaired save: ${fixes.join('; ')}`);
        this.data = save;
        this.loadedFrom = 'main';
        if (fixes.length) await this.persist();
        return save;
      } catch (err) {
        log.error('Save is unreadable; trying the backup', err);
        await this.storage.set(CORRUPT_KEY, main).catch(() => undefined);
      }
    }
    const backup = await this.safeGet(BACKUP_KEY);
    if (backup) {
      try {
        this.data = loadSaveString(backup, this.content, this.now()).save;
        this.loadedFrom = 'backup';
        await this.persist();
        return this.data;
      } catch (err) {
        log.error('Backup save is unreadable too', err);
      }
    }
    this.data = createNewSave(this.content, this.now());
    this.loadedFrom = 'new';
    await this.persist();
    return this.data;
  }

  /** Replaces the save with a new value (from a pure operation) and persists it. */
  async commit(next: SaveData): Promise<void> {
    this.data = { ...next, updatedAt: this.now() };
    for (const l of this.listeners) l(this.data);
    await this.persist();
  }

  /** Convenience: copy, mutate, commit. */
  async update(mutate: (draft: SaveData) => void): Promise<void> {
    const draft = structuredClone(this.save);
    mutate(draft);
    await this.commit(draft);
  }

  onChange(listener: (s: SaveData) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Waits for all queued writes (tests, app pause). */
  flush(): Promise<void> {
    return this.writeChain;
  }

  /** Wipes progress (Settings → reset, M10). */
  async reset(): Promise<void> {
    await this.commit(createNewSave(this.content, this.now()));
  }

  /** Storage can be unavailable (private browsing, quota): play on with an in-memory save. */
  private async safeGet(key: string): Promise<string | null> {
    try {
      return await this.storage.get(key);
    } catch (err) {
      log.error(`Storage read failed for ${key}`, err);
      return null;
    }
  }

  private persist(): Promise<void> {
    const snapshot = JSON.stringify(this.save);
    this.writeChain = this.writeChain.then(async () => {
      try {
        const previous = await this.storage.get(SAVE_KEY);
        if (previous) await this.storage.set(BACKUP_KEY, previous);
        await this.storage.set(SAVE_KEY, snapshot);
      } catch (err) {
        log.error('Could not write the save', err);
      }
    });
    return this.writeChain;
  }
}
