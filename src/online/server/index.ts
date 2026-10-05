/**
 * Entry point of the server bundle (`npm run server:build` →
 * server/supabase/functions/_shared/game.js), imported by the Deno Edge Function.
 */
export { handle, CORS_HEADERS, type HttpDeps } from './http';
export { createSupabaseDeps, SupabaseStore } from './supabaseStore';
export { GameService, ServiceError } from './service';
export { MemoryStore } from './store';
