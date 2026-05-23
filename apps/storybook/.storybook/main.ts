import type { StorybookConfig } from '@storybook/react-vite';

/**
 * Storybook config — Vite-based, scans both `stories/` (atomic-style brand
 * stories) and `../../packages/ui/src` so component-adjacent stories
 * placed beside the source automatically show up.
 */
const config: StorybookConfig = {
  stories: [
    '../stories/**/*.stories.@(ts|tsx|mdx)',
    '../../../packages/ui/src/**/*.stories.@(ts|tsx|mdx)',
  ],
  addons: [
    '@storybook/addon-a11y',
    '@storybook/addon-docs',
    '@storybook/addon-vitest',
    '@chromatic-com/storybook'
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  typescript: {
    reactDocgen: 'react-docgen',
  },
};

export default config;
