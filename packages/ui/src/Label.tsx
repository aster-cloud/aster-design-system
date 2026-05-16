/**
 * Label — form-control label.
 *
 * Enforces consistent typography and the disabled-peer cascade.
 * Pairs with peer/group inputs so the label dims when the control
 * disables.
 */
import * as React from 'react';
import { cn } from './utils.js';

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        'text-sm font-medium leading-none text-fg',
        'peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
);
Label.displayName = 'Label';
