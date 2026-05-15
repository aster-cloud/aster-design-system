/**
 * Postbuild: emit dual-format artifacts.
 *
 *   - Copy tokens.css → dist/tokens.css
 *   - Drop a `package.json` into dist/cjs/ flagging CommonJS, so Node
 *     resolves the .js files there as CJS even though the parent
 *     package has no top-level "type" field. Same trick for dist/esm/.
 */
import { writeFileSync, copyFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const pkg  = resolve(here, '..');

mkdirSync(resolve(pkg, 'dist'), { recursive: true });
copyFileSync(resolve(pkg, 'src/tokens.css'), resolve(pkg, 'dist/tokens.css'));

writeFileSync(resolve(pkg, 'dist/esm/package.json'), JSON.stringify({ type: 'module' }, null, 2));
writeFileSync(resolve(pkg, 'dist/cjs/package.json'), JSON.stringify({ type: 'commonjs' }, null, 2));

console.log('[tokens postbuild] dual-format artifacts ready');
