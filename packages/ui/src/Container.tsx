/**
 * Container — max-width content wrapper.
 *
 * Mirrors the token spacing.containers map:
 *   prose  65ch  long-form text (legal pages, blog)
 *   narrow 640px focused forms (login, signup)
 *   base   768px default page width
 *   wide   1024px dashboard pages
 *   xl     1280px marketing surfaces
 *   2xl    1440px hero / full-bleed layouts
 *
 * Padding-x defaults to px-4 on mobile, px-6 sm and up — small enough
 * that text doesn't crash into the viewport edge but not so big that
 * narrow mobile screens feel half-empty.
 */
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './utils.js';

const containerVariants = cva('mx-auto w-full px-4 sm:px-6', {
  variants: {
    size: {
      prose:  'max-w-[65ch]',
      narrow: 'max-w-[640px]',
      base:   'max-w-[768px]',
      wide:   'max-w-[1024px]',
      xl:     'max-w-[1280px]',
      '2xl':  'max-w-[1440px]',
    },
  },
  defaultVariants: { size: 'wide' },
});

export interface ContainerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof containerVariants> {
  as?: keyof React.JSX.IntrinsicElements;
}

export const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, size, as: Tag = 'div', ...props }, ref) => {
    const Component = Tag as React.ElementType;
    return (
      <Component
        ref={ref}
        className={cn(containerVariants({ size }), className)}
        {...props}
      />
    );
  }
);
Container.displayName = 'Container';
