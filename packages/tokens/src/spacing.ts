/**
 * 4-px base spacing grid. Matches Tailwind's default scale so consumers can
 * still use `p-4` etc. fluently — these tokens add semantic aliases on top.
 *
 * Why 4 over 8: marketing layouts need fine-grain at the small end (icon +
 * label = 4px gap is meaningful) while still composing cleanly into 8/16/24
 * multiples for major rhythm.
 */
export const space = {
  px:   '1px',
  0:    '0',
  0.5:  '0.125rem', //  2 px
  1:    '0.25rem',  //  4 px
  1.5:  '0.375rem', //  6 px
  2:    '0.5rem',   //  8 px
  2.5:  '0.625rem', // 10 px
  3:    '0.75rem',  // 12 px
  4:    '1rem',     // 16 px ← canonical small
  5:    '1.25rem',  // 20 px
  6:    '1.5rem',   // 24 px ← canonical medium
  8:    '2rem',     // 32 px
  10:   '2.5rem',   // 40 px
  12:   '3rem',     // 48 px ← canonical large (section gap)
  16:   '4rem',     // 64 px
  20:   '5rem',     // 80 px
  24:   '6rem',     // 96 px ← section gap on marketing
  32:   '8rem',     //128 px
} as const;

/**
 * Radius scale — moderate rounding (8–12px) is the brand sweet spot.
 * Hard corners read industrial-cold, full pills read consumer-friendly;
 * Aster sits as "modern professional", which lives in this range.
 */
export const radius = {
  none: '0',
  xs:   '0.125rem',  //  2 px — code chips, dense badges
  sm:   '0.25rem',   //  4 px
  md:   '0.5rem',    //  8 px — inputs, small cards
  lg:   '0.75rem',   // 12 px — buttons, cards (canonical)
  xl:   '1rem',      // 16 px — modals, sections
  '2xl':'1.5rem',    // 24 px — hero shapes
  full: '9999px',
} as const;

/**
 * Shadow scale — subtle. Heavy drop shadows feel dated. We lean on tinted
 * shadows (violet at very low alpha) for primary surfaces, neutral for the
 * rest, so floating elements feel "of the brand" rather than generic.
 */
export const shadow = {
  none: 'none',
  xs:   '0 1px 2px 0 rgb(9 9 11 / 0.04)',
  sm:   '0 1px 3px 0 rgb(9 9 11 / 0.06), 0 1px 2px -1px rgb(9 9 11 / 0.06)',
  md:   '0 4px 6px -1px rgb(9 9 11 / 0.08), 0 2px 4px -2px rgb(9 9 11 / 0.04)',
  lg:   '0 10px 15px -3px rgb(9 9 11 / 0.08), 0 4px 6px -4px rgb(9 9 11 / 0.04)',
  xl:   '0 20px 25px -5px rgb(9 9 11 / 0.08), 0 8px 10px -6px rgb(9 9 11 / 0.04)',
  '2xl':'0 25px 50px -12px rgb(9 9 11 / 0.18)',
  /** Brand-tinted: violet 600 @ 12% alpha. Use on primary CTA hovers. */
  brand:'0 8px 24px -8px rgb(124 58 237 / 0.35)',
  /** Inner ring for focus/checked states. */
  ring: '0 0 0 3px rgb(139 92 246 / 0.35)',
} as const;

/**
 * Motion — Apple-style easing + restrained durations. Marketing surfaces
 * use up to 'slow'; product UI is mostly 'fast' (≤200ms).
 */
export const motion = {
  duration: {
    instant: '0ms',
    fast:    '150ms',
    medium:  '250ms',
    slow:    '400ms',
    slower:  '600ms',
  },
  easing: {
    /** Default — feels natural for most UI transitions. */
    standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
    /** Decelerate — enter animations. */
    out:      'cubic-bezier(0, 0, 0.2, 1)',
    /** Accelerate — exit animations. */
    in:       'cubic-bezier(0.4, 0, 1, 1)',
    /** Spring-like overshoot for delight moments. */
    bounce:   'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
} as const;

/** Maximum content widths — marketing prose vs full dashboard. */
export const containers = {
  prose:  '65ch',
  narrow: '640px',
  base:   '768px',
  wide:   '1024px',
  xl:     '1280px',
  '2xl':  '1440px',
} as const;
