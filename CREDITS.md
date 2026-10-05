# Credits

Cards Clash is a **non-commercial fan project**. Its card pool is the card
list of _Card Wars_ (the card game from the animated series _Adventure Time_
and its mobile games): card, hero and land names and the printed rules texts
belong to their owners (Cartoon Network / Warner Bros. Discovery and the
original game makers). Cards Clash is not affiliated with or endorsed by them.
It is free, has no ads and no purchases, and must not be sold or monetised.
Because of the card names, it is **not suitable for store release** as is;
see "Card pool" in the README for what to replace for a commercial or store
build.

Every third-party asset, library and algorithm is listed below with its source
and license. This list is also shown in-game under **Settings → Credits**,
generated from `src/data/credits.json`. A unit test (`tests/project.test.ts`)
fails if the two files disagree.

## Card data and card art

| Name                                              | Author                                       | License                                                | Source                                          |
| ------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------- |
| Card Wars card data (names, stats, ability texts) | Card Wars Wiki contributors (Fandom)         | CC BY-SA 4.0                                           | https://cardwars.fandom.com/wiki/Card_Wars_Wiki |
| Card illustrations (realistic style)              | Generated locally with Stability AI SD-Turbo | Stability AI Non-Commercial Research Community License | https://huggingface.co/stabilityai/sd-turbo     |

- The card list was collected by the **CARD INFO EXTRACTOR** tool (in this
  repository's working folder, not shipped) from the Card Wars Wiki. Wiki text
  is used under CC BY-SA 4.0; each card's source page is listed in
  `src/data/card-sources.json` and the rule mapping for every ability text in
  `scripts/cardwars/abilities.py`. Changes made to the data: two values the wiki
  lacks were filled in (Polterclops: cost 4, 2/30, Floop 7; Super Hug: cost 2),
  a stray symbol was removed from one name ("Throne of Doom"), and Defense 0 is
  shown as 1. Everything else is exactly as listed.
- The illustrations were generated on a local GPU with SD-Turbo (prompts built
  from each card's name and land). SD-Turbo's license allows non-commercial use
  only, which matches this project. `scripts/cardwars/import_cards.py` crops
  and converts them to `public/cards/*.webp`.

## Libraries

| Name                                                              | Author                         | License                                | Source                                   |
| ----------------------------------------------------------------- | ------------------------------ | -------------------------------------- | ---------------------------------------- |
| Phaser 3                                                          | Phaser Studio Inc.             | MIT                                    | https://github.com/phaserjs/phaser       |
| Capacitor (core, Preferences, App, Splash Screen)                 | Ionic / Capacitor contributors | MIT                                    | https://github.com/ionic-team/capacitor  |
| @fontsource/oswald, @fontsource/barlow-condensed (font packaging) | Fontsource contributors        | MIT (packaging) / OFL-1.1 (font files) | https://github.com/fontsource/font-files |

Online backend client: **supabase-js** (Supabase, MIT, https://github.com/supabase/supabase-js). The Supabase CLI (MIT) is a development tool only.

## Fonts

| Name                    | Author                              | License                   | Source                                             |
| ----------------------- | ----------------------------------- | ------------------------- | -------------------------------------------------- |
| Oswald (font)           | Vernon Adams, Kalapi Gajjar, Cyreal | SIL Open Font License 1.1 | https://fonts.google.com/specimen/Oswald           |
| Barlow Condensed (font) | Jeremy Tribby                       | SIL Open Font License 1.1 | https://fonts.google.com/specimen/Barlow+Condensed |

## Algorithms

| Name               | Author         | License       | Source                                                                 |
| ------------------ | -------------- | ------------- | ---------------------------------------------------------------------- |
| mulberry32 PRNG    | Tommy Ettinger | Public Domain | https://gist.github.com/tommyettinger/46a874533244883189143505d203312c |
| cyrb53 string hash | bryc           | Public Domain | https://github.com/bryc/code/blob/master/jshash/experimental/cyrb53.js |

## Other art, audio and icons

Board, frames, icons, backdrops and the fallback card art are drawn in code
(`src/art/`), and all music and sound effects are synthesised with the Web
Audio API (`src/services/audio.ts`). Real files can replace any of them through
`src/data/asset-manifest.json` and `src/data/audio-manifest.json`.

When a third-party asset is added (for example from Kenney.nl,
game-icons.net, OpenGameArt or Freesound), add a row here **and** an entry in
`src/data/credits.json` in the same commit. CC BY assets need the author's
name and a license link.

## Development tools (not shipped with the game)

Vite (MIT), TypeScript (Apache-2.0), Vitest (MIT), ESLint (MIT),
typescript-eslint (MIT), Prettier (MIT), ws (MIT, end-to-end test only),
Python + Pillow (HPND, card import and app icon scripts), Capacitor CLI and
@capacitor/assets (MIT, Android build and icon generation), Gradle and the
Android SDK (Apache-2.0, Android builds).
