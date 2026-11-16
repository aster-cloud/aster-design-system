/**
 * color.ts 的 `semantic`（浅色主题 hex）必须与 tokens.css :root 的同名语义变量一致（aster-cloud#774）。
 * 此前 TS 侧滞后于 CSS 的 AA 调整（success / warning / danger 仍是旧色阶），JS 消费方拿到的是不达标的颜色。
 * 在 build 之后运行（读取 dist/esm），零依赖。
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

const pkgDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { semantic } = await import(pathToFileURL(resolve(pkgDir, 'dist/esm/color.js')).href);
const css = readFileSync(resolve(pkgDir, 'src/tokens.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const root = css.slice(css.indexOf(':root'), css.indexOf('\n}', css.indexOf(':root')));
const decl = Object.fromEntries(Array.from(root.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g), (m) => [m[1], m[2].trim()]));
const resolveHex = (name, seen = new Set()) => {
  if (seen.has(name)) throw new Error(`循环引用 ${name}`);
  seen.add(name);
  const v = decl[name];
  if (v === undefined) return undefined;
  const ref = /^var\((--[\w-]+)\)$/.exec(v);
  return ref ? resolveHex(ref[1], seen) : v.toLowerCase();
};
const kebab = (k) => k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
const drift = [];
for (const [key, hex] of Object.entries(semantic)) {
  const cssHex = resolveHex(`--aster-${kebab(key)}`);
  // 缺失也算漂移：semantic 新增字段而 CSS 没有对应变量时不能静默通过
  if (cssHex === undefined) drift.push(`semantic.${key} 在 tokens.css :root 中没有 --aster-${kebab(key)}`);
  else if (cssHex !== String(hex).toLowerCase()) drift.push(`semantic.${key} = ${hex}，tokens.css = ${cssHex}`);
}
if (drift.length) {
  console.error(`[check-semantic-sync] color.ts 与 tokens.css 不一致：\n  ${drift.join('\n  ')}`);
  process.exit(1);
}
console.log(`[check-semantic-sync] OK — ${Object.keys(semantic).length} 个语义色与 tokens.css 一致`);
