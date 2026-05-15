/**
 * @aster-cloud/tokens — single re-export surface.
 *
 * Consumers:
 *   import { semantic, fontFamilies } from "@aster-cloud/tokens";
 *   import "@aster-cloud/tokens/tokens.css";  // CSS variables
 *   import asterPreset from "@aster-cloud/tokens/tailwind-preset"; // Tailwind preset
 */

export * from './color.js';
export * from './typography.js';
export * from './spacing.js';
export { asterTailwindPreset as default } from './tailwind-preset.js';
export { asterTailwindPreset } from './tailwind-preset.js';
