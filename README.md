# Cards Clash

A lane-based collectible card game for phones and the web, built with free,
open-source tools. It has no ads and no real-money purchases.

Two Heroes battle across four lanes of Landscapes (Blue Plains, Corn Fields,
Useless Swamp, Sandy Lands, Nice Lands) with Creatures, Spells and Buildings.
The card pool is the complete **Card Wars** card list (323 creatures, 51
spells, 29 buildings, 69 heroes) with generated realistic illustrations, so
this is a **free, non-commercial fan build** (see [CREDITS.md](CREDITS.md)).

## Card pool

The cards come from the **CARD INFO EXTRACTOR** folder (a scrape of the Card
Wars Wiki, CC BY-SA, with locally generated art). Names, stats and ability
texts are copied exactly; a test compares every card with the source CSV.

```bash
python scripts/cardwars/import_cards.py     # cards.json, heroes.json, public/cards/*.webp (needs Pillow)
python scripts/cardwars/build_decks.py      # starter decks and campaign boss decks
```

- `scripts/cardwars/abilities.py` says what every printed ability does in the
  rules engine (one entry per distinct text). Vague texts are interpreted
  there, with notes. The import stops if a text has no rule.
- Other art styles in the extractor (`cartoon`, `adventure-time`) can be used
  with `--style`.
- **Store builds:** the card names and texts are Cartoon Network's property.
  For a commercial or store release, replace the card pool (re-run the import
  on an original card list) and the generated art (SD-Turbo is licensed for
  non-commercial use only).

## Status

| Milestone | Scope                                                                      | State   |
| --------- | -------------------------------------------------------------------------- | ------- |
| M0        | Project setup, RNG, logger, balance config, Boot/Preload/Title/Menu scenes | ✅ Done |
| M1        | Headless rules engine: actions, validation, turns, combat, legal actions   | ✅ Done |
| M2        | Effect pipeline, all keywords, original 130-card pool (now a test fixture) | ✅ Done |
| M3        | Procedural art, card rendering, card gallery                               | ✅ Done |
| M4        | Match scene: playable local hot-seat match                                 | ✅ Done |
| M5        | AI opponents (Easy → Nightmare), vs-AI matches                             | ✅ Done |
| M6        | Save system, collection, deck builder, deck codes                          | ✅ Done |
| M7        | Progression & economy                                                      | ✅ Done |
| M8        | Tutorial, campaign, starter-deck balance pass                              | ✅ Done |
| M9        | Additional offline modes, card face redesign                               | ✅ Done |
| M10       | Audio, settings, polish, accessibility, profile, 2D/3D battle board        | ✅ Done |
| M11       | Online: accounts, cloud save, PvP (Supabase)                               | ✅ Done |
| —         | Card Wars card pool, realistic art, Hero Abilities with cooldowns          | ✅ Done |
| M12       | Builds, performance, release (web, Android), crash screen, offline mode    | ✅ Done |

## Requirements

- Node.js **20.x** (18.18+ works). Vite 6 is used because Vite 7 needs Node 20.19+.
- npm 10+
- For Android: Android Studio (its bundled JDK 21 is used) and the Android SDK.
- For re-importing cards: Python 3.9+ with Pillow.

## Setup

```bash
npm install
npm run dev
```

Open the printed URL (default http://localhost:5173). Because the dev server
listens on your LAN (`host: true`), you can also open the Network URL on your
phone.

## Release

See [docs/RELEASE.md](docs/RELEASE.md) for the web build (GitHub Pages,
itch.io), the Android APK/AAB and signing, and the release checklist. Also:
[privacy policy](docs/PRIVACY.md), [store listing](docs/store-listing.md).

## Scripts

| Command                | Purpose                                                           |
| ---------------------- | ----------------------------------------------------------------- |
| `npm run dev`          | Start the Vite dev server with hot reload                         |
| `npm run build`        | Type-check, then make a production build in `dist/`               |
| `npm run preview`      | Serve the production build locally                                |
| `npm test`             | Run all Vitest tests once                                         |
| `npm run test:watch`   | Run Vitest in watch mode                                          |
| `npm run typecheck`    | TypeScript strict type-check only                                 |
| `npm run lint`         | ESLint                                                            |
| `npm run format`       | Prettier (writes changes)                                         |
| `npm run sim:ai`       | AI benchmark (default: 500 Hard-vs-Easy mirror matches, parallel) |
| `npm run sim:decks`    | Starter-deck balance report (every pairing, same AI both sides)   |
| `npm run package:web`  | Zip `dist/` for itch.io (`release/`)                              |
| `npm run android:sync` | Web build, then copy it into the Android project                  |
| `npm run android:apk`  | Debug APK (`android/app/build/outputs/apk/debug/`)                |
| `npm run android:aab`  | Release AAB (signed when `android/keystore.properties` exists)    |
| `npm run server:e2e`   | End-to-end test of the online backend (see server/README.md)      |

## Project structure

```
/src/engine      Pure rules engine: no Phaser, no DOM, deterministic (seeded RNG)
/src/data        JSON content and balance (balance.json, landscapes.json, credits.json, ...)
/src/ai          AI players (M5)
/src/scenes      Phaser scenes (Boot, Preload, Title, MainMenu, Credits, ...)
/src/ui          Reusable UI components (Button, Modal, Toast, theme, transitions)
/src/services    Logger, and later saves, audio, settings and network
/src/art         Procedural placeholder art generators
/src/online      Online protocol, server logic (shared with the Edge Function) and client (M11)
/src/i18n        String table (English first) and t() lookup (M10)
/src/modes       Daily Dungeon, Gauntlet, Draft Arena, Sandbox logic (M9)
/src/campaign    Campaign config, unlocks, stars, rewards, story (M8)
/src/tutorial    Tutorial lessons and the forced-move runner (M8)
/src/progression XP, levels, chests, packs, daily login, quests, achievements (M7)
/src/save        Versioned save data, collection, deck slots (M6)
/src/config      Client display constants
/server          Supabase SQL migrations and Edge Functions (M11)
/tests           Vitest unit and simulation tests
```

### Architecture rules

1. **The engine is pure.** `src/engine` must not import Phaser, the DOM or any
   client code, and must not use `Math.random`. This is enforced by ESLint
   (`eslint.config.js`) and by a unit test (`tests/project.test.ts`). The same
   engine code will run in the client, AI simulations and Supabase Edge
   Functions.
2. **Randomness is seeded.** Use `Rng` / `nextFloat` from `src/engine/rng.ts`
   (mulberry32). The RNG state is a single uint32, so it can be stored in game
   state and replayed exactly.
3. **Content is data.** Rules constants live in `src/data/balance.json` and are
   validated at load time (`src/engine/balance.ts`).
4. **Actions → state + events.** Starting in M1, every player action is a
   serializable object. The engine returns a new state plus a list of events,
   and the UI only animates those events.

### Using the engine

```ts
import { BALANCE, applyAction, createCardDb, createGame, getLegalActions } from './src/engine';

const ctx = { cards: createCardDb(cardJson), balance: BALANCE.match };
let { state, events } = createGame({ seed: 'match-123', decks: [deckA, deckB] }, ctx);

const result = applyAction(state, { type: 'arrangeLandscapes', player: 0, order: deckA.landscapes }, ctx);
if (result.ok)
  state = result.state; // result.events → animate these
else console.warn(result.error.code, result.error.message);

getLegalActions(state, state.activePlayer, ctx); // every valid move, including targets
```

- A match goes through these phases: `arrange` (both players place landscapes),
  then `mulligan` (both players keep or redraw), then `main` (turns), then `ended`.
- The start and draw phases run when a turn begins. Combat and the end phase run
  on `endTurn`.
- `runMatch` and `replayMatch` in `src/engine/simulate.ts` play headless matches,
  and can replay one exactly from its seed and action list.

### Content (all JSON, validated at load time)

| File                          | Contents                                                                                 |
| ----------------------------- | ---------------------------------------------------------------------------------------- |
| `src/data/cards.json`         | 403 Card Wars cards: 323 creatures (Regular and Gold printings), 51 spells, 29 buildings |
| `src/data/heroes.json`        | 69 heroes, each with a Hero Ability that recharges over a number of turns                |
| `src/data/starter-decks.json` | 10 legal starter decks (generated by `scripts/cardwars/build_decks.py`)                  |
| `src/data/card-sources.json`  | The Card Wars Wiki page of every card and hero (attribution)                             |
| `src/data/keywords.json`      | Keyword, status and trigger names and rules text (used for UI tooltips)                  |
| `src/data/balance.json`       | Every rules number (HP, MP, hand size, copy limits, ...)                                 |

Cards are built from abilities. Each ability is a **trigger**, an optional
**condition**, a **target selector** and one or more **effects**. Cards can also
have **statics** for ongoing effects ("While in Play" and Aura). See
`src/engine/types.ts` for the full vocabulary. `getContent()` loads and
validates everything, and a mistake in any JSON file fails with a list of every
problem.

### Art

Cards and heroes show their illustration from `public/cards/<id>.webp` (loaded
on demand, cropped per use: card art window, round hero portrait, standing
board card). Until an image has loaded, and for anything without one, the
procedural art below is shown.

- `src/art/genome.ts` turns each card or hero id into a seeded "genome" (body
  type, colors, eyes, horns, spell motif, building type, ...). Keywords and
  names act as hints, so an "Archer" looks like an archer.
- `src/art/painters.ts` draws genomes with Phaser Graphics. `src/art/frames.ts`
  bakes frames, gems, stat badges, landscape tiles, card backs and the 22
  ability icons (`src/art/icons.ts`).
- `src/art/ArtCache.ts` bakes card art on demand and frees unused art (LRU),
  keeping memory bounded on budget phones.
- **Real art later:** add `"art-<artKey>": "art/file.png"` (or `hero-<id>`,
  `tile-<landscape>`, `card-back-<style>`, ...) to `src/data/asset-manifest.json`
  and put the file under `public/`. It replaces the procedural texture with no
  code changes. Credit it in CREDITS.md.
- Main Menu → Collection opens the **Card Gallery**: every card, token, hero,
  landscape tile, card back and icon. Tap a card to inspect it.

### Playing a match (M4)

Main Menu → **PLAY** → pick a starter deck for each player → **START**. It's
2-player hot-seat on one device: a "pass the device" screen hides each hand
between turns.

| Gesture                                                | Does                                             |
| ------------------------------------------------------ | ------------------------------------------------ |
| Drag a glowing hand card onto a green lane / the board | Play it (then tap a highlighted target if asked) |
| Tap a hand card, then tap a lane                       | Same as dragging                                 |
| Tap your creature                                      | Floop / Move / Details                           |
| Long-press any card, creature, building or hero        | Inspect it                                       |
| Tap your deck                                          | Buy a draw (1 MP)                                |
| Tap your hero when the ring glows                      | Use the Hero Ability                             |
| **End Turn**, **Log**, **≡** (surrender)               | as named                                         |

Code: `src/match/MatchController.ts` owns the state; `interaction.ts` maps legal
actions to gestures; `Animator.ts` plays engine events, then `BoardView.sync`
snaps the view to the real state. Dev shortcut: `http://localhost:5173/?scene=Match`
jumps straight into a match (`&seed=xyz` for a fixed shuffle, `&ai=hard` to face the AI).

### AI (M5)

- `src/ai/evaluate.ts` scores a board using **public information only** (board, HP,
  charges, hand/deck _sizes_). It never reads the opponent's hand or any deck order.
- `src/ai/search.ts` runs a beam search over the AI's own actions within the turn.
  Each line is scored by simulating End Turn and combat, then the opponent's board
  hitting back. Winning states score huge, so lethal is found automatically.
- Difficulties live in `src/data/ai-profiles.json` (depth, beam width, randomness,
  mistake rate, evaluation budget, time budget, weights). Bosses (M8) add hooks:
  scripted openings, card preferences and weight scaling.
- In the browser the AI runs in a **Web Worker** (`src/ai/aiWorker.ts`), with a
  main-thread fallback. Hard is capped at 0.8 s per decision, Nightmare at 1 s.
- Benchmark (`npm run sim:ai`, mirror decks): **Hard beats Easy 96.5%** of 500 games.

### Saves, collection and decks (M6)

- The save is versioned JSON stored with Capacitor Preferences (native storage on
  phones, browser storage on the web). Code: `src/save/saveData.ts` (format,
  migrations, repair) and `SaveManager.ts` (load, write after every change,
  backup, recovery from a corrupt save).
- New players own every starter-deck card and start with 3 starter decks in
  slots. **Collection**: filters, search, Craft (Dust), Scrap spare copies, and
  Level Up (spare copies + Coins). Values live in `src/data/economy.json`.
- **My Decks**: 10 slots; create (empty, from a starter deck, or from a code),
  edit, set as active, duplicate, delete, and share a `CC1-…` deck code.
- **Deck Builder**: hero and landscape pickers, castable and landscape filters,
  search, mana curve, a live rules and ownership check with warnings, and
  auto-fill. Every change is saved immediately.

### Progression and economy (M7)

All numbers live in `src/data/progression.json` (XP, level thresholds, unlocks,
chests, packs, login calendar, quests, achievements) and `balance.json`
(`cardLevels`). Logic is pure and tested in `src/progression/` and
`tests/progression.test.ts`.

- **XP and levels**: matches vs the AI give XP and Coins (win > draw > loss).
  Each level gives Coins (and Gems every 5 levels) and unlocks heroes, game modes
  and deck slots (4 at level 1, +1 per level). Locked heroes and slots show a
  lock with their unlock level. A new player reaches level 5 in about 12 matches.
- **Card levels**: Lv2–Lv5 add ATK/DEF and, at Lv3 and Lv5, +1 to ability
  damage, healing and poison. Ranked (M9) will fix every card at Lv3.
- **Chests**: a free Wooden Chest every 4 hours, plus 4 slots for victory
  chests (Wooden/Silver/Golden/Magic) that unlock on a timer, one at a time, or
  open now for Gems.
- **Shop**: Basic, Premium and Landscape packs for Coins or Gems, with drop
  rates shown. There are no real-money purchases.
- **Daily**: a 7-day login calendar and 3 daily quests that reset at local
  midnight. **Achievements** track lifetime stats.
- Rewards play a reveal (chest opening, card flips, confetti for Epic and
  better). Saves from M6 migrate to save version 2 automatically.

### Tutorial and campaign (M8)

- **Play** (from the main menu) lists Campaign, Quick Battle, Tutorial and the
  modes still to come (locked ones show their unlock level).
- **Tutorial**: 3 scripted lessons in `src/data/tutorial.json` (lanes and
  creatures; spells, buildings and Floop; landscapes, moves and Hero Abilities). Decks
  are stacked, the enemy's first turns are scripted, and each step either waits
  for "Next" or allows exactly one action, highlighted on the board
  (`src/tutorial/tutorial.ts`, `src/match/TutorialCoach.ts`). After the steps the
  lesson is free play against an easy AI. New players are offered the tutorial
  once; each lesson pays its reward the first time.
- **Campaign**: 8 regions × 10 nodes (`src/data/campaign.json`), on a scrollable
  world map. Each node has an enemy deck, AI difficulty, enemy card level, and
  optional **modifiers** from `src/data/match-rules.json` (for example Fortified,
  Toxic Fog, War Drums). The 10th node of each region is a **boss**: a boss-only
  hero, a unique deck (`campaign-decks.json`), AI hooks and one special rule.
- **Stars**: winning gives 1 star; each of the node's two objectives (win within
  N turns, finish with N HP, destroy N creatures, use / don't use your Hero Ability,
  ...) gives one more. The best result is saved per node. Nodes unlock in order;
  a region unlocks when the previous boss is beaten. Story text plays when a
  region opens and when its boss falls.
- **Rewards** (`progression.json` → `campaign`): first win Coins + XP, Gems for
  every new star, and a chest + Gems for each boss, on top of normal match rewards.
- Match rules work like extra hero passives in the engine (`MatchRule` on each
  player: statics, triggered abilities, HP/charge/hand tweaks), so they are
  deterministic and visible to the AI. Tap **Rules** in a match to read them.
- **Balance pass**: starter decks and four hero kits were tuned with
  `npm run sim:decks`. With the Normal AI, every starter deck now wins 39–62% of
  its games (it was 4–86%).

### Offline modes (M9)

Every mode is opened from **Play**, which first shows its rules and rewards. All
numbers live in `src/data/progression.json` → `modes`; the logic is pure and
tested in `src/modes/` and `tests/modes.test.ts`. Gauntlet and Draft runs are
saved, so you can leave and come back.

- **Daily Dungeon** (level 3): the date picks the enemy deck and modifiers, so
  everyone gets the same dungeon on the same day. Unlimited tries; the first
  win of the day pays Coins, Gems and a Golden Chest.
- **Gauntlet** (level 4): 5 battles with one deck. Hero HP carries over (+4 HP
  after each win); one loss ends the run; the final opponent is a boss deck.
  Rewards by wins, claimed at the end (or after abandoning).
- **Draft Arena** (level 5): pay the entry, pick a hero (1 of 3), a second
  landscape (1 of 3) and 30 cards (1 of 3, rarity-weighted); 10 basic
  creatures complete the 40-card deck. Play until 7 wins or 3 losses; rewards
  by wins. Offers come from the run seed, so a run replays exactly.
- **Sandbox** (level 2): any deck vs a 100 HP Practice Dummy that never plays.
  **Tools** refill MP, draw, add any card, spawn enemy creatures, charge the
  Hero Ability, heal, ready creatures and clear the board. No rewards.
- Daily, Gauntlet and Draft matches also give the normal match rewards.

### Card faces

Cards use a trading-card layout: dark outer frame, cream card, tall artwork,
a coloured name banner (each landscape's `ink` colour in `landscapes.json`)
with the ATK circle and DEF shield, a dark type strip, a parchment rules box
with landscape-requirement pips, a footer with the collector number and rarity,
a hexagonal cost badge, and a foil sheen on Epic, Legendary and Gold cards. Names use
**Oswald** and rules text **Barlow Condensed** (both SIL OFL). Layout values are
in `src/art/cardLayout.ts`; board creatures use the same style.

### Battle board (2D / 3D)

The board is a grassy arena with four long landscape strips (enemy half above
the centre line, yours below). Creatures stand on their lanes as figures with a
stat plate: a health arc between the red ATK and blue DEF circles. Usable Floop
abilities show a **FLOOP** button on the lane, and the round **GO** button ends
the turn. **Tap any creature or building** to see its full card with live stats
and status; on your turn your creature's panel also has Floop and Move buttons.

Every board position is defined on a flat plane and drawn through a projection
(`src/match/projection.ts`): **3D arena** (default) tilts the board into
perspective; **2D flat** is a top-down view. Taps are hit-tested through the
inverse projection. Switch in **Settings** or the match menu (≡).

### Audio, settings, profile (M10)

- **Audio** (`src/services/audio.ts`): every sound effect and music track is
  synthesised with the Web Audio API, so the game ships no audio files.
  Contexts: menu, campaign map, battle, boss battle; stingers for victory and
  defeat; effects for every game event (`src/match/sfx.ts`), buttons, chests,
  card reveals, rewards and errors. Separate music and effects volumes.
- **Settings**: music/effects volume, animation speed, reduced motion, text
  size (90–130% for descriptions, dialogs and logs), 3D/2D board, landscape
  symbols (colourblind aid), language, Credits and Replay tutorial.
- **Strings**: menus and new screens use `t()` from `src/i18n/strings.ts`;
  adding a language means adding a table with the same keys (tested).
- **Profile**: name, level, lifetime stats and progress, and earned-only
  cosmetics: hero avatars unlock with heroes, boss avatars by beating each boss,
  card backs by level and campaign stars. Save version 5 stores them.
- **Polish**: rotating loading tips, click sounds, hover lift for hand cards on
  desktop, softer transitions.

### Online (M11)

Accounts, cloud save, Ranked and Friendly PvP on a free Supabase project.
Setup and the security model are in [`server/README.md`](server/README.md).

- **Accounts**: play as a guest in one tap, sign in with an emailed 6-digit
  code, or link a guest to an email without losing progress (Settings → Account).
- **Cloud save**: syncs on start, after sign-in and 30 s after changes. The
  server merges saves (newest wins for ordinary data) and accepts economy gains
  only up to per-hour caps, so an edited client can't mint currency or cards.
- **Ranked**: matchmaking by rating (the window widens while you wait), owned
  cards only, every card at level 3, Elo rating with tiers (Bronze → Legend),
  6-week seasons with tier rewards and a soft reset. Rewards are granted by the server.
- **Friendly**: create a room and share its 6-character code.
- **Fair play**: one Edge Function runs the shared engine on every action;
  wrong-player, out-of-turn, illegal and replayed actions are rejected. Players
  receive redacted views (no opponent hand, deck order or RNG) over Realtime.
  60 s turn timer; leaving for over 60 s forfeits.
- **Try it without Supabase**: `npm run dev`, then open
  `http://localhost:5173/?loopback`. The real server code runs in the browser
  against an in-memory store, with an AI bot as your opponent (dev builds only).
- Tests: `tests/online.test.ts` plays full Ranked matches through the HTTP
  handler and checks every cheating case.

### Visual style

Dark-fantasy look, all procedural (`src/art/cinematic.ts`, `src/art/atmosphere.ts`):

- **Card art**: each landscape has its own night or dusk scene: icy peaks under
  a pale moon, wheat hills at amber dusk, a swamp with dead trees, dunes and
  obelisks, candy hills at twilight, volcanoes under an eclipse, misty ruins.
  The scenes have light shafts, layered fog and drifting motes. Creatures are
  rim-lit silhouettes with glowing eyes and runes (aura for Epic/Legendary);
  heroes are shadowed busts; spells are glowing sigils; buildings have lit
  windows and torches.
- **Screens**: an animated backdrop on every screen: stars, a moon with light
  rays, parallax mountains, fog and rising embers. The title has a metallic logo
  with a light sweep over a floating fan of legendary cards. The UI uses Oswald
  and Barlow Condensed and bevelled metal-edged buttons.
- **Motion**: board figures breathe, rare cards shimmer, PLAY glows. Reduced
  motion turns all of it off.

### Display

The game is authored at **1080×1920 portrait** and scaled with Phaser
`Scale.FIT` plus centering, so it letterboxes cleanly on any phone, tablet or
desktop window.

## Assets and licenses

Only free-licensed assets are used, and every one is tracked in
[CREDITS.md](CREDITS.md) and `src/data/credits.json`. The in-game credits
screen is at Settings → Credits.
