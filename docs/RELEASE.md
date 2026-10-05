# Releasing Cards Clash

Cards Clash ships as a web build (GitHub Pages / itch.io) and an Android app
(Capacitor). It is a **free, non-commercial fan build**: its card pool is the
Card Wars card list (Cartoon Network's property) and the illustrations are
licensed for non-commercial use only (see [CREDITS.md](../CREDITS.md)). That
is fine for a free web page or sharing an APK, but **app stores will reject or
remove it**. For a store release, re-run the card import on an original card
list and replace the art first.

## Checklist

- [ ] `npm test` passes (unit, engine, content, card-pool tests)
- [ ] `npm run lint` and `npm run typecheck` pass
- [ ] `npm run sim:decks` shows no starter deck far outside 35–65 %
- [ ] CREDITS.md and `src/data/credits.json` list every third-party item
- [ ] Version bumped in `package.json` (shown on the title screen) and, for
      Android, `versionCode` / `versionName` in `android/app/build.gradle`
- [ ] Online: `.env.local` has the Supabase URL and anon key, the `game` function
      is deployed (`npm run server:deploy`), `npm run server:e2e` passes
- [ ] Privacy policy ([PRIVACY.md](PRIVACY.md)) published at a public URL if
      online play is enabled

## Web

```bash
npm run build          # dist/ (relative paths: works from any folder)
npm run preview        # check the production build locally
npm run package:web    # release/cards-clash-web-<version>.zip
```

### GitHub Pages

1. Create a GitHub repository and push this project (`main` branch).
2. Settings → Pages → Source: **GitHub Actions**.
3. Optional, for online play: Settings → Secrets and variables → Actions →
   **Variables**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (public values).
4. Every push to `main` runs `.github/workflows/pages.yml` (tests, build,
   deploy). The game is then at `https://<user>.github.io/<repo>/`.

### GitHub Pages without the workflow (current setup)

The live site (https://shayannoorullah.github.io/cards-clash/) is served from a
`gh-pages` branch that holds only the built files (Settings → Pages → Source:
"Deploy from a branch", `gh-pages` / root). To update it by hand:

```bash
npm run build   # without .env.local (or with your hosted Supabase values)
cd dist && touch .nojekyll && git init -b gh-pages && git add -A && git commit -m deploy
git push -f https://github.com/<user>/cards-clash.git gh-pages && cd ..
```

To switch to the automatic workflow instead, push `main` (needs a GitHub token
with the `workflow` scope: `gh auth refresh -h github.com -s workflow`) and set
Settings → Pages → Source to "GitHub Actions".

### Hosted Supabase (online play)

Project `cards-clash` (ref `idchielsujwfqhiwbsui`, free tier,
`https://idchielsujwfqhiwbsui.supabase.co`). The database migrations are
applied and the repository variables `VITE_SUPABASE_URL` /
`VITE_SUPABASE_ANON_KEY` are set. One-time setup from this folder:

```bash
npx supabase login
npx supabase link --workdir server --project-ref idchielsujwfqhiwbsui
npx supabase config push --workdir server   # anonymous sign-ins + code e-mail templates
npm run server:deploy                        # migrations + the game Edge Function
```

The service-role key never goes into the client, `.env.local` or GitHub variables.

### itch.io

1. `npm run build && npm run package:web`.
2. New project → Kind: **HTML** → upload `release/cards-clash-web-<version>.zip`
   → tick "This file will be played in the browser".
3. Embed options: viewport 540 × 960 (portrait), enable "Mobile friendly" and
   "Fullscreen button". The game scales to any size.
4. Pricing: "No payments" (the content may not be sold).

## Android

Needs Android Studio (its bundled JDK 21 is used automatically) and the Android
SDK. `android/local.properties` points Gradle at the SDK (Android Studio creates
it; or write `sdk.dir=C:/Users/<you>/AppData/Local/Android/Sdk`).

```bash
npm run assets:app     # icon + splash from scripts/make_app_assets.py (already generated)
npm run android:sync   # web build + copy into android/
npm run android:apk    # debug APK: android/app/build/outputs/apk/debug/app-debug.apk
npm run android:open   # open in Android Studio (run on a device / emulator)
```

The debug APK installs on any phone with "Install unknown apps" allowed
(`adb install -r app-debug.apk`). The app is portrait-only, the hardware Back
button closes dialogs and goes back a screen (twice on the main menu exits),
and the splash uses the game colours.

### Signed release (AAB / APK)

1. Create an upload key once and keep it safe (losing it means you can't
   update the app):

   ```bash
   keytool -genkeypair -v -keystore cards-clash-upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Put the `.jks` file in `android/` and create `android/keystore.properties`
   (both are git-ignored):

   ```properties
   storeFile=cards-clash-upload.jks
   storePassword=<the password you chose>
   keyAlias=upload
   keyPassword=<the key password>
   ```

3. `npm run android:sync && npm run android:aab` →
   `android/app/build/outputs/bundle/release/app-release.aab` (for Google Play),
   or `node scripts/android.mjs release` for a signed release APK.
4. Google Play (only after replacing the card pool and art): create the app,
   enrol in Play App Signing, upload the AAB to an internal test track, fill in
   the store listing ([store-listing.md](store-listing.md)), content rating,
   data safety (see PRIVACY.md) and target audience.

## Performance notes

- Target 60 FPS. Static vector shapes (board, lane strips, buttons, hero
  panels) are baked into textures once (`bakeRegion` in `src/art/frames.ts`);
  a live Phaser Graphics is re-tessellated every frame. Measured in the match
  scene (desktop, software WebGL): render time per frame 26.6 ms → 7.1 ms.
  Menus still draw some small panels live (about 12–14 ms in the same setup,
  well under budget on phone GPUs).
- Card art is loaded on demand (`ArtCache`), cropped per use, and evicted when
  unused (LRU), so memory stays bounded with 472 illustrations (15 MB on disk).
- The AI runs in a Web Worker; matches never block the UI thread.
