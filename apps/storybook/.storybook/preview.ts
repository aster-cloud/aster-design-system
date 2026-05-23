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
    // We let axe run its full default rule set (no `runOnly` filter)
    // so the Storybook addon-a11y panel matches what Chromatic's
    // accessibility view reports. Previously we limited the panel to
    // WCAG 2 / 2.1 A+AA tags which hid real violations like missing
    // form-control `name` attributes from local review.
    //
    // Two best-practice rules are explicitly disabled at the preview
    // level because they don't apply to component-isolation stories:
    //   - landmark-one-main: "document should have one main landmark"
    //   - page-has-heading-one: "page should contain a level-one heading"
    //
    // Story iframes are bare component-mount contexts, not pages — they
    // neither need a <main> landmark nor an <h1>. Foundation stories
    // (Brand/Color/Typography) do render those anyway, so the disable
    // costs nothing on the full-page side and silences ~130 false
    // positives across the 65-story project.
    a11y: {
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
