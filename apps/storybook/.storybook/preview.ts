import type { Preview } from '@storybook/react-vite';
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
    backgrounds: { disabled: true }, // we control bg via Tailwind tokens
    controls: {
      matchers: { color: /(background|color)$/i, date: /Date$/i },
    },
    // P0: axe rules scoped to WCAG 2.1 AA. Panel-only review for now —
    // automated all-story axe runs land in P2 once baseline violations
    // are triaged. Per-story rule disables live in the story file (see
    // 00 Foundations/Color → Ramps).
    a11y: {
      options: {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
        },
      },
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
      // Theme-isolated stories render light + dark columns side by side
      // using inner `[data-theme="..."]` wrappers. If the global toolbar
      // set the html element to dark, Tailwind's `dark:` utilities
      // (selector strategy = `[data-theme="dark"] &`) would still match
      // any descendant — including the inner light column — because the
      // matcher walks ancestors, not the nearest themed wrapper. Story
      // authors opt in by setting `parameters.forceRootTheme: 'light'`
      // (or 'dark') so each inner column owns its own theme context.
      //
      // ThemeCompare stories convention: every component story file
      // sets parameters.forceRootTheme = 'light' on its ThemeCompare
      // story. The toolbar still controls every other story.
      const forced = ctx.parameters?.forceRootTheme as
        | 'light'
        | 'dark'
        | undefined;
      const theme =
        forced ?? (ctx.globals.theme === 'dark' ? 'dark' : 'light');
      if (typeof document !== 'undefined') {
        document.documentElement.dataset.theme = theme;
      }
      return Story();
    },
  ],
};

export default preview;
