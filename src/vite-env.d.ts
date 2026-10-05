/// <reference types="vite/client" />

/** Injected by Vite from package.json (see vite.config.ts). */
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  /** Supabase project URL (optional: without it the game is offline-only). */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase anon (public) key. Safe to ship: Row Level Security protects the data. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
}
