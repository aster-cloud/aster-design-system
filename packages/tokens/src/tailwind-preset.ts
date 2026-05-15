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
  violet, sky, zinc, emerald, amber, rose, semantic,
} from './color.js';
import {
  fontFamilies, fontSizes, lineHeights, letterSpacing, fontWeights,
} from './typography.js';
import {
  space, radius, shadow, motion, containers,
} from './spacing.js';

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
          DEFAULT: semantic.primary,
          hover:   semantic.primaryHover,
          active:  semantic.primaryActive,
          fg:      semantic.primaryFg,
          subtle:  semantic.primarySubtle,
        },
        accent: {
          DEFAULT: semantic.accent,
          hover:   semantic.accentHover,
          fg:      semantic.accentFg,
          subtle:  semantic.accentSubtle,
        },
        success: { DEFAULT: semantic.success, fg: semantic.successFg, subtle: semantic.successSubtle },
        warning: { DEFAULT: semantic.warning, fg: semantic.warningFg, subtle: semantic.warningSubtle },
        danger:  { DEFAULT: semantic.danger,  fg: semantic.dangerFg,  subtle: semantic.dangerSubtle  },
        bg: {
          DEFAULT: semantic.bg,
          subtle:  semantic.bgSubtle,
          muted:   semantic.bgMuted,
        },
        fg: {
          DEFAULT: semantic.fg,
          muted:   semantic.fgMuted,
          subtle:  semantic.fgSubtle,
        },
        border: {
          DEFAULT: semantic.border,
          strong:  semantic.borderStrong,
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
      boxShadow: shadow,
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
