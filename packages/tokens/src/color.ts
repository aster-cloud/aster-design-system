/**
 * Aster color system — Option (c): 紫罗兰 + 电光蓝 (AI/future).
 *
 * Why these specific values:
 *
 * - **Violet (primary)** anchors brand authority. We use Tailwind's `violet`
 *   ramp (not `purple`, not `indigo`) because violet has the cleanest hue at
 *   500–700 — purple drifts magenta, indigo drifts navy. The 600 step is the
 *   default CTA fill on white; 500 reads as the brand on dark.
 *
 * - **Sky (accent)** carries AI/streaming/highlight roles. Sky over blue —
 *   we already have violet in the warm-cool seesaw, and sky's slightly cyan
 *   shift opens up enough contrast that text doesn't muddle when violet and
 *   accent neighbor each other (e.g. AI panel inside a violet-tinted card).
 *
 * - **Zinc (neutral)** rather than gray/slate. Zinc has a touch of warmth
 *   that complements violet; pure gray is sterile, slate drifts cold-blue
 *   and fights with sky.
 *
 * - **Semantic** colors are emerald / amber / rose — the standard tri.
 *   Pinned to mid-500s so they sit at consistent perceived weight with
 *   violet/sky at 600.
 *
 * All ramps follow Tailwind 11-step convention (50 → 950) so consumers can
 * mix in raw Tailwind utilities where a tokenized step doesn't exist yet.
 */

export type ColorScale = {
  50: string; 100: string; 200: string; 300: string;
  400: string; 500: string; 600: string; 700: string;
  800: string; 900: string; 950: string;
};

/** Primary — deep violet. Wordmark, primary CTA, focus rings, active nav. */
export const violet: ColorScale = {
  50:  '#f5f3ff',
  100: '#ede9fe',
  200: '#ddd6fe',
  300: '#c4b5fd',
  400: '#a78bfa',
  500: '#8b5cf6',
  600: '#7c3aed', // canonical brand step
  700: '#6d28d9',
  800: '#5b21b6',
  900: '#4c1d95',
  950: '#2e1065',
};

/** Accent — electric sky blue. AI streaming, links, callouts, "live" badges. */
export const sky: ColorScale = {
  50:  '#f0f9ff',
  100: '#e0f2fe',
  200: '#bae6fd',
  300: '#7dd3fc',
  400: '#38bdf8',
  500: '#0ea5e9', // canonical accent step
  600: '#0284c7',
  700: '#0369a1',
  800: '#075985',
  900: '#0c4a6e',
  950: '#082f49',
};

/** Neutral — zinc. Backgrounds, text, borders. Warmth complements violet. */
export const zinc: ColorScale = {
  50:  '#fafafa',
  100: '#f4f4f5',
  200: '#e4e4e7',
  300: '#d4d4d8',
  400: '#a1a1aa',
  500: '#71717a',
  600: '#52525b',
  700: '#3f3f46',
  800: '#27272a',
  900: '#18181b',
  950: '#09090b',
};

export const emerald: ColorScale = {
  50:  '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7',
  400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857',
  800: '#065f46', 900: '#064e3b', 950: '#022c22',
};

export const amber: ColorScale = {
  50:  '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d',
  400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309',
  800: '#92400e', 900: '#78350f', 950: '#451a03',
};

export const rose: ColorScale = {
  50:  '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af',
  400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c',
  800: '#9f1239', 900: '#881337', 950: '#4c0519',
};

export const palette = { violet, sky, zinc, emerald, amber, rose } as const;
export type Palette = typeof palette;

/**
 * Semantic aliases — what consumers should actually reference. Component
 * variants bind to these names, not raw ramps. Swapping the brand later
 * is then a single-file change.
 */
export const semantic = {
  /** Brand primary — the violet CTA on light surfaces. */
  primary:        violet[600],
  primaryHover:   violet[700],
  primaryActive:  violet[800],
  primaryFg:      '#ffffff',
  primarySubtle:  violet[50],
  primaryRing:    violet[500],

  /** Accent — sky blue for AI/links/streaming. */
  accent:         sky[500],
  accentHover:    sky[600],
  accentFg:       '#ffffff',
  accentSubtle:   sky[50],

  /** Surfaces & ink. */
  bg:             '#ffffff',
  bgSubtle:       zinc[50],
  bgMuted:        zinc[100],
  fg:             zinc[900],
  fgMuted:        zinc[600],
  fgSubtle:       zinc[500],
  border:         zinc[200],
  borderStrong:   zinc[300],

  /** Status. */
  success:        emerald[600],
  successFg:      '#ffffff',
  successSubtle:  emerald[50],
  warning:        amber[500],
  warningFg:      zinc[900],
  warningSubtle:  amber[50],
  danger:         rose[600],
  dangerFg:       '#ffffff',
  dangerSubtle:   rose[50],
} as const;

export type SemanticColor = keyof typeof semantic;
