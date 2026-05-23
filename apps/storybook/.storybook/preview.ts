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
    // a11y axe configuration.
    //
    // The Storybook addon-a11y panel and Chromatic's a11y view both use
    // axe under the hood, but they pick rule sets differently:
    //   - Local addon-a11y respects `parameters.a11y.options.runOnly`
    //     and we limit it to WCAG 2 / 2.1 A+AA tags. Best-practice
    //     warnings are filtered out so reviewers focus on real WCAG
    //     failures.
    //   - Chromatic ignores `runOnly` and runs every default axe rule,
    //     including `best-practice` tagged rules.
    //
    // Two best-practice rules fire on every single story because each
    // story renders in an isolated iframe without a full page document:
    //   - landmark-one-main: "document should have one main landmark"
    //   - page-has-heading-one: "page should contain a level-one heading"
    //
    // Neither applies to a component-isolation story. A Button in
    // isolation neither needs a <main> landmark nor an <h1>. Both rules
    // are disabled at the preview level via `config.rules` so they
    // don't fire in either tool. The full-page foundation stories
    // (Brand/Color/Typography) DO have an h1 + main landmark anyway,
    // so disabling globally costs nothing for them and silences the
    // false positives for component stories.
    a11y: {
      options: {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
        },
      },
      config: {
        rules: [
          { id: 'landmark-one-main', enabled: false },
          { id: 'page-has-heading-one', enabled: false },
        ],
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
