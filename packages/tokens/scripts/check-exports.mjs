/**
 * 构建后核对 package.json 的 exports 映射与 dist 产物是否一致。
 *
 * 为什么需要它：本包同时发布 ESM（dist/esm）与 CJS（dist/cjs），
 * 两边各有一套 .d.ts。tsconfig.cjs.json 一旦被改回 declaration:false，
 * 或 exports 被重构回「单一顶层 types 指向 dist/esm」的写法，CJS 消费方
 * 会在 TS node16 解析下报 TS1479，而 tsc / build 本身不会报错——
 * 问题只在消费方那边出现。这里把契约钉死：
 *   1. exports 里每一条文件路径都必须真实存在；
 *   2. 带 import / require 条件的子路径，两个条件各自必须内嵌 types；
 *   3. dist/esm、dist/cjs 的 package.json 必须分别标 module / commonjs，
 *      否则上面的 .d.ts 会被 TS 按错误的模块格式解读。
 * 任一条不满足即退出码 1，使 build 与发布门失败。
 */
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const pkgDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(resolve(pkgDir, 'package.json'), 'utf8'));
const failures = [];

/** 深度遍历 exports，收集所有叶子路径（字符串）及其在映射中的位置 */
function* leaves(node, trail) {
  if (typeof node === 'string') { yield [trail, node]; return; }
  for (const [key, child] of Object.entries(node)) yield* leaves(child, `${trail} › ${key}`);
}

for (const [trail, file] of leaves(pkg.exports, 'exports')) {
  if (!existsSync(resolve(pkgDir, file))) failures.push(`${trail} 指向的文件不存在：${file}`);
}

const DUAL_CONDITIONS = ['import', 'require'];
for (const [subpath, entry] of Object.entries(pkg.exports)) {
  if (typeof entry !== 'object') continue;
  for (const cond of DUAL_CONDITIONS.filter((c) => c in entry)) {
    const types = entry[cond]?.types;
    if (typeof types !== 'string') failures.push(`exports["${subpath}"].${cond} 缺少内嵌 types（CJS/ESM 各需一套 .d.ts）`);
  }
}

const EXPECTED_FORMAT = { 'dist/esm': 'module', 'dist/cjs': 'commonjs' };
for (const [dir, type] of Object.entries(EXPECTED_FORMAT)) {
  const file = resolve(pkgDir, dir, 'package.json');
  const actual = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')).type : undefined;
  if (actual !== type) failures.push(`${dir}/package.json 的 type 应为 "${type}"，实际为 ${JSON.stringify(actual)}`);
}

if (failures.length > 0) {
  console.error('[tokens check-exports] exports 映射与 dist 产物不一致：');
  for (const f of failures) console.error(`  - ${f}`);
  console.error('  （请先运行 pnpm build；若 dist 已是最新，说明 exports / tsconfig 被改坏了）');
  process.exit(1);
}
console.log('[tokens check-exports] exports 映射与 dist 产物一致');
