/**
 * The app-wide save instance (client only). Loaded during Boot; scenes read
 * `saves().save` and write through `saves().commit/update`.
 */
import { getContent } from '../engine/content';
import { PreferencesStorage } from '../services/storage';
import { SaveManager } from './SaveManager';

let instance: SaveManager | null = null;

export function saves(): SaveManager {
  instance ??= new SaveManager(new PreferencesStorage(), getContent());
  return instance;
}

/** Whether the save was created yet (the crash screen flushes it only if so). */
export function hasSaves(): boolean {
  return instance !== null;
}
