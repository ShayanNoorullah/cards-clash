/**
 * Key-value persistence. On Android/iOS (Capacitor) Preferences stores data
 * natively; on the web the same plugin falls back to localStorage. Tests use
 * MemoryStorage.
 */
import { Preferences } from '@capacitor/preferences';

export interface StorageBackend {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export class PreferencesStorage implements StorageBackend {
  async get(key: string): Promise<string | null> {
    const { value } = await Preferences.get({ key });
    return value;
  }
  async set(key: string, value: string): Promise<void> {
    await Preferences.set({ key, value });
  }
  async remove(key: string): Promise<void> {
    await Preferences.remove({ key });
  }
}

export class MemoryStorage implements StorageBackend {
  readonly data = new Map<string, string>();
  async get(key: string): Promise<string | null> {
    return this.data.get(key) ?? null;
  }
  async set(key: string, value: string): Promise<void> {
    this.data.set(key, value);
  }
  async remove(key: string): Promise<void> {
    this.data.delete(key);
  }
}
