import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: ['dist', 'node_modules', 'android', 'ios', 'coverage', 'server/supabase', 'public', 'CARD INFO EXTRACTOR'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': ['warn', { allow: ['warn', 'error', 'info', 'debug'] }],
    },
  },
  {
    // The rules engine must stay pure: it runs headless in tests, AI workers and Edge Functions.
    files: ['src/engine/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['phaser', 'phaser/*'], message: 'The engine must not depend on Phaser.' },
            {
              group: ['**/scenes/**', '**/ui/**', '**/services/**', '**/art/**'],
              message: 'The engine must not import client code.',
            },
          ],
        },
      ],
      'no-restricted-globals': ['error', 'window', 'document', 'localStorage'],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Use the seeded RNG in engine/rng.ts.' },
      ],
    },
  },
  {
    // Command-line tools print their results.
    files: ['scripts/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
  prettier,
);
