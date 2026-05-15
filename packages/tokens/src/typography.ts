/**
 * Aster typography system.
 *
 * Three families, picked for the brand brief (option c = Serif reflex):
 *
 * - **Display**: Fraunces — a variable serif with OpenType axes for weight,
 *   optical size, and "softness". We pin display headings to optical size
 *   144 + soft 0 (sharper terminals) so they feel editorial, not cozy.
 *   Free via Google Fonts. Wordmark uses this at 1× weight + tighter
 *   tracking.
 *
 * - **Sans**: Inter — variable, neutral, OpenType `cv01` ss for the
 *   single-storey "a", which pairs cleaner with Fraunces. Body, UI, controls.
 *
 * - **Mono**: JetBrains Mono — ligatures off by default (we'll enable per
 *   component in code editors). Used in Monaco, code blocks, and the
 *   wordmark's optional "lang-dev" inline mark.
 *
 * Modular scale: type-major-third (1.250) anchored at 16px body. Yields
 * comfortable hierarchy without compressing too fast at the top.
 */

export const fontFamilies = {
  display: '"Fraunces", "Source Serif 4", Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  mono: '"JetBrains Mono", "SF Mono", "Cascadia Code", Menlo, Consolas, monospace',
} as const;

/** Modular scale × line-heights. Body = 16/1.625, descend 0.875× per step down. */
export const fontSizes = {
  xs:   '0.75rem',    //  12 px
  sm:   '0.875rem',   //  14 px
  base: '1rem',       //  16 px — body
  lg:   '1.125rem',   //  18 px
  xl:   '1.25rem',    //  20 px
  '2xl':'1.5rem',     //  24 px
  '3xl':'1.875rem',   //  30 px — section heading
  '4xl':'2.25rem',    //  36 px
  '5xl':'3rem',       //  48 px — page hero
  '6xl':'3.75rem',    //  60 px
  '7xl':'4.5rem',     //  72 px — landing hero
  '8xl':'6rem',       //  96 px — wordmark XL
} as const;

export const lineHeights = {
  tight: 1.1,
  snug: 1.25,
  normal: 1.5,
  relaxed: 1.625,
  loose: 1.9,
} as const;

export const letterSpacing = {
  /** Wordmark + display use tight tracking for visual cohesion. */
  tightest: '-0.04em',
  tighter:  '-0.02em',
  tight:    '-0.01em',
  normal:   '0',
  wide:     '0.025em',
  wider:    '0.05em',
  widest:   '0.1em',
} as const;

export const fontWeights = {
  light: 300,
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  black: 900,
} as const;

/**
 * Pre-composed type recipes — what components actually reach for. These
 * encode our hierarchy decisions in one place; pages compose them, not
 * raw size/weight pairs.
 */
export const textStyles = {
  /** Landing hero. Fraunces semibold, very tight tracking. */
  displayXl: {
    fontFamily: fontFamilies.display,
    fontSize: fontSizes['7xl'],
    lineHeight: lineHeights.tight,
    letterSpacing: letterSpacing.tighter,
    fontWeight: fontWeights.semibold,
  },
  /** Page hero. */
  displayLg: {
    fontFamily: fontFamilies.display,
    fontSize: fontSizes['5xl'],
    lineHeight: lineHeights.snug,
    letterSpacing: letterSpacing.tight,
    fontWeight: fontWeights.semibold,
  },
  /** Section heading. */
  displayMd: {
    fontFamily: fontFamilies.display,
    fontSize: fontSizes['3xl'],
    lineHeight: lineHeights.snug,
    letterSpacing: letterSpacing.tight,
    fontWeight: fontWeights.semibold,
  },
  /** Subhead. */
  displaySm: {
    fontFamily: fontFamilies.display,
    fontSize: fontSizes['2xl'],
    lineHeight: lineHeights.snug,
    letterSpacing: letterSpacing.tight,
    fontWeight: fontWeights.medium,
  },
  /** Body. */
  body: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes.base,
    lineHeight: lineHeights.relaxed,
    letterSpacing: letterSpacing.normal,
    fontWeight: fontWeights.normal,
  },
  /** UI controls (buttons, labels). */
  ui: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes.sm,
    lineHeight: lineHeights.snug,
    letterSpacing: letterSpacing.normal,
    fontWeight: fontWeights.medium,
  },
  /** Eyebrow / kicker / overline. */
  eyebrow: {
    fontFamily: fontFamilies.sans,
    fontSize: fontSizes.xs,
    lineHeight: lineHeights.snug,
    letterSpacing: letterSpacing.widest,
    fontWeight: fontWeights.semibold,
    textTransform: 'uppercase' as const,
  },
  /** Code inline + blocks. */
  code: {
    fontFamily: fontFamilies.mono,
    fontSize: fontSizes.sm,
    lineHeight: lineHeights.normal,
    letterSpacing: letterSpacing.normal,
    fontWeight: fontWeights.normal,
  },
} as const;

export type TextStyle = keyof typeof textStyles;
