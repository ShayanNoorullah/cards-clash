/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  // Relative base so the same build works on GitHub Pages, itch.io and inside Capacitor.
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      '@engine': fileURLToPath(new URL('./src/engine', import.meta.url)),
      '@data': fileURLToPath(new URL('./src/data', import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 5173,
    // Native projects and generated assets hold copies of the build: don't watch them.
    watch: { ignored: ['**/android/**', '**/ios/**', '**/assets/**', '**/dist/**', '**/CARD INFO EXTRACTOR/**'] },
  },
  optimizeDeps: {
    // Only the real entry page (android/ has a synced copy of the build).
    entries: ['index.html'],
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
        },
      },
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
