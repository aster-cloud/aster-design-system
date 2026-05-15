/**
 * Tiny class-name combiner. Wrapping clsx here means consumers don't import
 * it directly — keeps the dependency surface inside @aster-cloud/ui where we can
 * swap to tailwind-merge or twMerge later without breaking call sites.
 */
import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
