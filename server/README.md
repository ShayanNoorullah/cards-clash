# Cards Clash online backend (Supabase free tier)

Everything online runs on one free Supabase project:

| Piece                             | Where                                                       |
| --------------------------------- | ----------------------------------------------------------- |
| Tables + Row Level Security       | `supabase/migrations/20261002000000_init.sql`               |
| Game server (one Edge Function)   | `supabase/functions/game/index.ts` → `_shared/game.js`      |
| Server logic (TypeScript, tested) | `src/online/server/` (engine, matches, ratings, save merge) |
| Client                            | `src/online/client/` (accounts, cloud sync, online matches) |

The function bundle `_shared/game.js` is **generated** from `src/online/server`
by `npm run server:build`, so the server runs exactly the same rules engine as
the game. Rebuild it whenever engine or content files change.

## How it stays fair

- **Clients can't write to the database.** RLS is on for every table and there
  are no insert/update/delete policies; only the Edge Function (service role)
  writes. Clients may read only their own save, collection, decks and match
  views, plus public profiles, ratings and seasons.
- **Every PvP action is validated by the server** with the shared engine: wrong
  player, out of turn, illegal moves and stale/replayed actions are rejected.
  The full match state never leaves the server; each player gets a redacted
  copy (`match_views`) without the opponent's hand, either deck's order, or the RNG.
- **Ranked decks** must be legal and use cards the player owns on the server.
- **Rewards and currencies are server-side.** Ranked rewards are granted by the
  function. Cloud saves are merged on the server: offline gains are accepted
  only up to plausible per-hour caps (`src/data/online.json` → `saveCaps`), so an
  edited client can't mint Coins, Gems, Dust, XP or cards.
- **Timers**: 60 s per turn (the server ends an expired turn), and a player gone
  for more than 60 s forfeits. Clients send a heartbeat every 15 s while in a match.

## Set up (once)

1. Create a free project at supabase.com. Note the project **URL**, **anon key**
   and **project ref** (Settings → API).
2. In **Authentication → Sign In / Providers**: enable **Anonymous sign-ins** and
   **Email**.
3. In **Authentication → Email Templates**, make the **Magic Link** and
   **Change Email Address** templates show the 6-digit code, e.g.
   `Your Cards Clash code is {{ .Token }}`. (The game signs in with codes, not links.)
4. From the repo root:

   ```bash
   npx supabase login
   npx supabase link --workdir server --project-ref <your-project-ref>
   npm run server:deploy
   ```

   This builds the function bundle, applies the migration and deploys `game`.

5. Copy `.env.example` to `.env.local` and fill in:

   ```
   VITE_SUPABASE_URL=https://<ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon key>
   ```

   The anon key is public by design (RLS protects the data). **Never** put the
   service-role key in the client.

6. `npm run dev` (or rebuild the web/app build). Online modes unlock in **Play**.

### Season rollover

Seasons last 6 weeks. Once a day, call the function with the service-role key;
it only rolls over when the season has ended (rewards by tier, then a soft
reset of every rating halfway back to 1000). With `pg_cron` + `pg_net` enabled
(Database → Extensions), run this once in the SQL editor:

```sql
select cron.schedule('season-rollover', '0 4 * * *', $$
  select net.http_post(
    url := 'https://<ref>.supabase.co/functions/v1/game',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <service-role-key>'),
    body := '{"op":"seasonRollover"}'::jsonb);
$$);
```

## Local development (optional, needs Docker)

```bash
npm run server:start      # local Postgres/Auth/Realtime/Functions in Docker
npm run server:serve      # serves the `game` function with hot reload
```

`supabase start` prints a local URL and anon key for `.env.local`. The local
stack already uses code-based email templates (`supabase/templates/`), and
sign-in emails land in Mailpit at http://127.0.0.1:54324.

### End-to-end test

With the stack and the function running, this plays a full Ranked match between
two guest accounts through the function and checks Row Level Security,
Realtime, ratings/rewards and anti-cheat (wrong player, stale and illegal
actions, unowned cards):

```bash
SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_ANON_KEY=<anon> SUPABASE_SERVICE_ROLE_KEY=<service role> npm run server:e2e
```

The service-role key is used only by the test to read the true match state.

## Free-tier budget

- One function for everything (fewer cold starts); requests are small JSON.
- Realtime pushes only a player's own view row; polling is limited to a 15 s
  heartbeat during matches and a 4 s queue check while searching.
- Match states are a few KB; finished matches can be pruned with
  `delete from matches where status = 'ended' and updated_at < now() - interval '30 days';`
