/**
 * 语义 token 对比度门（aster-cloud#774）：解析 src/tokens.css 的各主题块，把语义变量解析成实际颜色
 * （var() 链展开、带透明度的颜色按所在表面合成），对每一组「前景 / 背景」按 WCAG 2.x 相对亮度公式算对比度，
 * 低于阈值即退出码 1，使 test / 发布门失败。
 *
 * 阈值：正文文字 4.5:1（AA）；非文字 UI（焦点环、边框式控件轮廓）3:1（WCAG 1.4.11）。
 * 主题：light（:root 与 [data-theme="light"] 两块都核对）、dark（[data-theme="dark"] 与 prefers-color-scheme 回退两块都核对）。
 *
 * 零依赖、离线、秒级，与 check-exports.mjs 同一取舍。用法：
 *   node scripts/check-contrast.mjs            # 校验，失败退出 1
 *   node scripts/check-contrast.mjs --table    # 另外打印全部组合的对比度表（Markdown）
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const pkgDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(resolve(pkgDir, 'src/tokens.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/** 取出某个选择器块的声明（只取第一层花括号内的 --var: value;） */
function block(selectorRe) {
  const m = selectorRe.exec(css);
  if (!m) throw new Error(`tokens.css 缺少主题块 ${selectorRe}`);
  let depth = 0;
  let i = css.indexOf('{', m.index);
  const start = i + 1;
  for (; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    else if (css[i] === '}' && --depth === 0) break;
  }
  const decls = {};
  for (const d of css.slice(start, i).matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) decls[d[1]] = d[2].trim();
  return decls;
}

const ROOT = block(/:root\s*\{/);
const THEMES = {
  'light (:root)': ROOT,
  'light ([data-theme=light])': { ...ROOT, ...block(/\[data-theme="light"\]\s*\{/) },
  'dark ([data-theme=dark])': { ...ROOT, ...block(/\[data-theme="dark"\]\s*\{/) },
  'dark (prefers-color-scheme)': { ...ROOT, ...block(/:root:not\(\[data-theme="light"\]\)\s*\{/) },
};

function parseColor(v) {
  let m = /^#([0-9a-f]{6})$/i.exec(v);
  if (m) return { r: parseInt(m[1].slice(0, 2), 16), g: parseInt(m[1].slice(2, 4), 16), b: parseInt(m[1].slice(4), 16), a: 1 };
  m = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)\s*(?:[/,]\s*([\d.]+%?))?\s*\)$/i.exec(v);
  if (m) {
    const a = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return { r: +m[1], g: +m[2], b: +m[3], a };
  }
  throw new Error(`无法解析颜色：${v}`);
}

function resolveVar(theme, name, seen = new Set()) {
  if (seen.has(name)) throw new Error(`循环引用 ${name}`);
  seen.add(name);
  const v = theme[name];
  if (v === undefined) throw new Error(`未定义 ${name}`);
  const ref = /^var\((--[\w-]+)\)$/.exec(v);
  if (ref) return resolveVar(theme, ref[1], seen);
  // box-shadow 形式的焦点环（如 `0 0 0 3px rgb(…)`）：取其中的颜色
  const shadow = /(#[0-9a-f]{6}|rgba?\([^)]*\))\s*$/i.exec(v);
  return parseColor(shadow && v.includes('px') ? shadow[1] : v);
}

const over = (fg, bg) => ({
  r: fg.r * fg.a + bg.r * (1 - fg.a),
  g: fg.g * fg.a + bg.g * (1 - fg.a),
  b: fg.b * fg.a + bg.b * (1 - fg.a),
  a: 1,
});
const lin = (c) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const lum = (c) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
export function ratio(a, b) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/**
 * 需要核对的组合：[前景, 背景, 阈值, 说明]。背景若半透明，先合成到 --aster-bg 上；
 * 前景若半透明（如焦点环），合成到背景上。
 */
const TEXT = 4.5;
const UI = 3;
const SURFACES = ['--aster-bg', '--aster-bg-subtle', '--aster-bg-muted'];
const PAIRS = [
  // 角色填充上的文字（按钮、徽章）
  ['--aster-primary-fg', '--aster-primary', TEXT],
  ['--aster-primary-fg', '--aster-primary-hover', TEXT],
  ['--aster-primary-fg', '--aster-primary-active', TEXT],
  ['--aster-accent-fg', '--aster-accent', TEXT],
  ['--aster-accent-fg', '--aster-accent-hover', TEXT],
  ['--aster-success-fg', '--aster-success', TEXT],
  ['--aster-warning-fg', '--aster-warning', TEXT],
  ['--aster-danger-fg', '--aster-danger', TEXT],
  // 角色色作文字：落在各表面与自身的 subtle 底上
  ...['--aster-primary', '--aster-primary-hover', '--aster-accent', '--aster-success', '--aster-warning', '--aster-danger']
    .flatMap((fg) => SURFACES.map((bg) => [fg, bg, TEXT])),
  ['--aster-primary', '--aster-primary-subtle', TEXT],
  ['--aster-accent', '--aster-accent-subtle', TEXT],
  ['--aster-success', '--aster-success-subtle', TEXT],
  ['--aster-warning', '--aster-warning-subtle', TEXT],
  ['--aster-danger', '--aster-danger-subtle', TEXT],
  // 正文 / 次要 / 弱化文字在各表面上
  ...['--aster-fg', '--aster-fg-muted', '--aster-fg-subtle'].flatMap((fg) => SURFACES.map((bg) => [fg, bg, TEXT])),
  // 非文字 UI：焦点环（实色环与 shadow-ring 用的 ring 色）在各表面上
  ...['--aster-primary-ring', '--aster-shadow-ring', '--aster-shadow-ring-danger'].flatMap((ring) => SURFACES.map((bg) => [ring, bg, UI])),
];

function surface(theme, name) {
  const c = resolveVar(theme, name);
  return c.a < 1 ? over(c, resolveVar(theme, '--aster-bg')) : c;
}

const failures = [];
const rows = [];
for (const [themeName, theme] of Object.entries(THEMES)) {
  // 有的主题块不重定义 ring：沿用 :root
  for (const [fgName, bgName, min] of PAIRS) {
    const bg = surface(theme, bgName);
    let fg = resolveVar(theme, fgName);
    if (fg.a < 1) fg = over(fg, bg);
    const r = ratio(fg, bg);
    rows.push({ themeName, fgName, bgName, r, min });
    if (r < min) failures.push(`${themeName}: ${fgName} on ${bgName} = ${r.toFixed(2)}:1 < ${min}:1`);
  }
}

if (process.argv.includes('--table')) {
  console.log('| theme | foreground | background | ratio | min |\n| --- | --- | --- | --- | --- |');
  for (const x of rows) console.log(`| ${x.themeName} | ${x.fgName} | ${x.bgName} | ${x.r.toFixed(2)} | ${x.min} |`);
}
if (failures.length) {
  console.error(`[check-contrast] ${failures.length} 组对比度不达标：\n  ${failures.join('\n  ')}`);
  process.exit(1);
}
console.log(`[check-contrast] OK — ${rows.length} 组（${Object.keys(THEMES).length} 个主题块 × ${PAIRS.length} 组）全部达标`);
