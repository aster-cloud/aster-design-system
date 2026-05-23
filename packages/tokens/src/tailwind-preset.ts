/**
 * Tailwind preset that maps every Aster token onto Tailwind's theme.
 *
 * aster-cloud's tailwind.config.ts adds this to `presets: [asterTailwindPreset]`
 * and immediately gets `bg-primary`, `text-fg`, `shadow-brand`, `font-display`,
 * etc. — no extra setup, no class-name forks.
 *
 * Imported as a CommonJS-friendly default so Tailwind's CJS-based config can
 * consume it from its own ESM/CJS toolchain.
 */

import {
  violet, sky, zinc, emerald, amber, rose,
} from './color.js';
import {
  fontFamilies, fontSizes, lineHeights, letterSpacing, fontWeights,
} from './typography.js';
import {
  space, radius, shadow, motion, containers,
} from './spacing.js';

/**
 * Semantic colors resolve through CSS custom properties so a
 * data-theme="dark" wrapper actually flips the rendered color.
 *
 * If we compiled with raw hex (e.g. semantic.primary === '#7c3aed'),
 * Tailwind would bake the light-mode hex into `.bg-primary` and the
 * dark theme block in tokens.css would have no effect — the class
 * never references --aster-primary. Going through var(--aster-*)
 * makes the CSS variable cascade authoritative.
 *
 * Tailwind's --tw-bg-opacity alpha modifier (`bg-primary/40`) is lost
 * here because `var()` isn't channel-formatted. That's fine for the
 * semantic role tokens — opacity modifiers belong on the raw ramps
 * (e.g. `bg-violet-500/40`), which keep hex values for that exact
 * reason.
 */
const v = (name: string) => `var(--aster-${name})`;

/**
 * Build the preset. Returns a plain object so Tailwind doesn't need to
 * import any ESM-only modules — important because consumers may still be on
 * a CommonJS Tailwind config.
 */
export const asterTailwindPreset = {
  // Tailwind treats a preset as a partial Config; declare an empty `content`
  // so consumer configs aren't expected to provide it via the preset.
  content: [] as string[],
  theme: {
    extend: {
      colors: {
        violet,
        sky,
        zinc,
        emerald,
        amber,
        rose,
        primary: {
          DEFAULT: v('primary'),
          hover:   v('primary-hover'),
          active:  v('primary-active'),
          fg:      v('primary-fg'),
          subtle:  v('primary-subtle'),
        },
        accent: {
          DEFAULT: v('accent'),
          hover:   v('accent-hover'),
          fg:      v('accent-fg'),
          subtle:  v('accent-subtle'),
        },
        success: { DEFAULT: v('success'), fg: v('success-fg'), subtle: v('success-subtle') },
        warning: { DEFAULT: v('warning'), fg: v('warning-fg'), subtle: v('warning-subtle') },
        danger:  { DEFAULT: v('danger'),  fg: v('danger-fg'),  subtle: v('danger-subtle')  },
        bg: {
          DEFAULT: v('bg'),
          subtle:  v('bg-subtle'),
          muted:   v('bg-muted'),
        },
        fg: {
          DEFAULT: v('fg'),
          muted:   v('fg-muted'),
          subtle:  v('fg-subtle'),
        },
        border: {
          DEFAULT: v('border'),
          strong:  v('border-strong'),
        },
      },
      fontFamily: {
        display: fontFamilies.display.split(', '),
        sans:    fontFamilies.sans.split(', '),
        mono:    fontFamilies.mono.split(', '),
      },
      fontSize: fontSizes,
      lineHeight: lineHeights as unknown as Record<string, string>,
      letterSpacing,
      fontWeight: fontWeights as unknown as Record<string, string>,
      spacing: space as unknown as Record<string, string>,
      borderRadius: radius,
      // Shadows also flip per-theme (dark mode uses higher alpha on
      // black) so we route them through CSS variables for the same
      // reason as the semantic colors above. `shadow.none` stays as the
      // literal 'none' keyword.
      boxShadow: {
        none:  shadow.none,
        xs:    v('shadow-xs'),
        sm:    v('shadow-sm'),
        md:    v('shadow-md'),
        lg:    v('shadow-lg'),
        xl:    v('shadow-xl'),
        '2xl': v('shadow-2xl'),
        brand: v('shadow-brand'),
        ring:  v('shadow-ring'),
      },
      transitionDuration: motion.duration,
      transitionTimingFunction: motion.easing,
      maxWidth: containers,
    },
  },
} as const;

// Default export so `import preset from '@aster-cloud/tokens/tailwind-preset'`
// (or its CJS equivalent) hands the consumer the actual preset object,
// not a namespace wrapper. Tailwind requires the value passed into
// `presets: [...]` to itself be a Config-shaped object.
export default asterTailwindPreset;
