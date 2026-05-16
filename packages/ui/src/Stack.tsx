/**
 * Stack — semantic flex container.
 *
 * 95% of `<div className="flex flex-col gap-X">` in dashboard code is
 * the same thing. Stack encodes the *intent* (a sequence of children
 * with a rhythm) and lets us tune defaults centrally.
 *
 * Gap scale mirrors the canonical spacing anchors. Direction defaults
 * to vertical because that's the dominant case (form rows, card
 * sections, sidebar lists).
 */
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './utils.js';

const stackVariants = cva('flex', {
  variants: {
    direction: {
      row: 'flex-row',
      col: 'flex-col',
      'row-reverse': 'flex-row-reverse',
      'col-reverse': 'flex-col-reverse',
    },
    gap: {
      0:  'gap-0',
      1:  'gap-1',
      2:  'gap-2',
      3:  'gap-3',
      4:  'gap-4',
      5:  'gap-5',
      6:  'gap-6',
      8:  'gap-8',
      10: 'gap-10',
      12: 'gap-12',
    },
    align: {
      start:    'items-start',
      center:   'items-center',
      end:      'items-end',
      baseline: 'items-baseline',
      stretch:  'items-stretch',
    },
    justify: {
      start:   'justify-start',
      center:  'justify-center',
      end:     'justify-end',
      between: 'justify-between',
      around:  'justify-around',
      evenly:  'justify-evenly',
    },
    wrap: { true: 'flex-wrap', false: 'flex-nowrap' },
  },
  defaultVariants: { direction: 'col', gap: 4 },
});

export interface StackProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof stackVariants> {
  /** Render as a different element (e.g. `as="ul"` for lists). */
  as?: keyof React.JSX.IntrinsicElements;
}

export const Stack = React.forwardRef<HTMLDivElement, StackProps>(
  ({ className, direction, gap, align, justify, wrap, as: Tag = 'div', ...props }, ref) => {
    const Component = Tag as React.ElementType;
    return (
      <Component
        ref={ref}
        className={cn(stackVariants({ direction, gap, align, justify, wrap }), className)}
        {...props}
      />
    );
  }
);
Stack.displayName = 'Stack';
