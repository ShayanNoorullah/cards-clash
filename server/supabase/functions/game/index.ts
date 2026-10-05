// deno-lint-ignore-file
// Cards Clash game server: one Edge Function for cloud sync, matchmaking,
// friendly rooms, authoritative matches and season rollover. All logic lives in
// the shared bundle built from src/online/server (npm run server:build).
import { createSupabaseDeps, handle } from '../_shared/game.js';

const deps = createSupabaseDeps(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve((req: Request) => handle(req, deps));
