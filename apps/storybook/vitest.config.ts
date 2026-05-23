/**
 * Vitest config for the Storybook test runner.
 *
 * Storybook 10 ships @storybook/addon-vitest, which exports a Vite plugin
 * (`storybookTest`) that translates every story into a test case. The
 * test:
 *   - mounts the story in a headless Chromium via @vitest/browser + playwright
 *   - runs the story's `play` function
 *   - asserts axe a11y violations when addon-a11y is wired (we wired it)
 *
 * This file is intentionally separate from apps/storybook's storybook
 * config — Storybook needs Vite, but the test runner needs a Vitest
 * project that points back at the Storybook config to discover stories.
 *
 * Run:    npx vitest --project storybook run
 * (or)    pnpm --filter storybook test
 */
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';

const dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [
    storybookTest({
      configDir: `${dirname}.storybook`,
    }),
  ],
  // Pre-bundle the deps every story file pulls in. Without this, Vite's
  // first-run discovery triggers a re-optimize mid-test which closes the
  // browser connection and leaves the run with "no tests".
  optimizeDeps: {
    include: [
      'react/jsx-dev-runtime',
      'react/jsx-runtime',
      'storybook/test',
      '@storybook/react-vite',
    ],
  },
  test: {
    name: 'storybook',
    browser: {
      enabled: true,
      provider: 'playwright',
      headless: true,
      instances: [{ browser: 'chromium' }],
    },
    // No setupFiles needed: Storybook 10.3+ addon-vitest auto-applies
    // preview annotations (decorators / parameters / globalTypes) to every
    // test, so an explicit setProjectAnnotations() call would just
    // conflict.
  },
});
