import type { Config } from 'tailwindcss';
import asterPreset from '@aster-cloud/tokens/tailwind-preset';

/**
 * Storybook Tailwind config — extends Aster preset and scans @aster-cloud/ui's
 * source so utility classes there get extracted into the build.
 */
const config: Config = {
  content: [
    './.storybook/**/*.{ts,tsx,css}',
    './stories/**/*.{ts,tsx,mdx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  presets: [asterPreset as Config],
  darkMode: ['selector', '[data-theme="dark"]'],
  plugins: [],
};

export default config;
