/**
 * Bundles the shared server code (rules engine, content, game service) into a
 * single ES module for the Supabase Edge Function. supabase-js stays external:
 * the function's deno.json maps it to the npm package.
 */
import { defineConfig } from 'vite';

export default defineConfig({
  // The function needs only the bundle, not the game's public/ assets (card art).
  publicDir: false,
  build: {
    outDir: 'server/supabase/functions/_shared',
    emptyOutDir: false,
    target: 'es2022',
    minify: false,
    sourcemap: false,
    lib: {
      entry: 'src/online/server/index.ts',
      formats: ['es'],
      fileName: () => 'game.js',
    },
    rollupOptions: { external: ['@supabase/supabase-js'] },
  },
});
