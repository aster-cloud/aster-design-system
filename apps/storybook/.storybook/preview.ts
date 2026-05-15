import type { Preview } from '@storybook/react';
import './preview.css';

/**
 * Preview-level config. Imports the Aster token CSS + Tailwind so every
 * story renders with the real brand stylesheet, not Storybook's default.
 *
 * We also expose a `theme` toolbar globaltype so reviewers can flip
 * light/dark and verify token contracts hold.
 */
const preview: Preview = {
  parameters: {
    layout: 'fullscreen',
    backgrounds: { disable: true }, // we control bg via Tailwind tokens
    controls: {
      matchers: { color: /(background|color)$/i, date: /Date$/i },
    },
  },
  globalTypes: {
    theme: {
      description: 'Aster theme',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark',  title: 'Dark'  },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, ctx) => {
      const theme = ctx.globals.theme === 'dark' ? 'dark' : 'light';
      if (typeof document !== 'undefined') {
        document.documentElement.dataset.theme = theme;
      }
      return Story();
    },
  ],
};

export default preview;
