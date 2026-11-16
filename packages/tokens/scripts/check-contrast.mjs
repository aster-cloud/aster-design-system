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

/** 支持 #rgb / #rrggbb / #rrggbbaa、rgb()/rgba()（整数或百分比通道，逗号或空格分隔）、hsl()/hsla()；其余格式直接报错，不静默放过 */
function parseColor(v) {
  const s = v.trim();
  let m = /^#([0-9a-f]{3,8})$/i.exec(s);
  if (m && [3, 6, 8].includes(m[1].length)) {
    const h = m[1].length === 3 ? m[1].replace(/./g, '$&$&') : m[1];
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1 };
  }
  const alpha = (x) => (x === undefined ? 1 : x.endsWith('%') ? parseFloat(x) / 100 : parseFloat(x));
  m = /^rgba?\(\s*([\d.]+%?)[\s,]+([\d.]+%?)[\s,]+([\d.]+%?)\s*(?:[/,]\s*([\d.]+%?))?\s*\)$/i.exec(s);
  if (m) {
    const ch = (x) => (x.endsWith('%') ? (parseFloat(x) / 100) * 255 : parseFloat(x));
    return { r: ch(m[1]), g: ch(m[2]), b: ch(m[3]), a: alpha(m[4]) };
  }
  m = /^hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%\s*(?:[/,]\s*([\d.]+%?))?\s*\)$/i.exec(s);
  if (m) {
    const [h, sat, l] = [parseFloat(m[1]) / 360, parseFloat(m[2]) / 100, parseFloat(m[3]) / 100];
    const q = l < 0.5 ? l * (1 + sat) : l + sat - l * sat;
    const p = 2 * l - q;
    const t = (x) => {
      const k = (x + 1) % 1;
      return k < 1 / 6 ? p + (q - p) * 6 * k : k < 1 / 2 ? q : k < 2 / 3 ? p + (q - p) * (2 / 3 - k) * 6 : p;
    };
    return { r: t(h + 1 / 3) * 255, g: t(h) * 255, b: t(h - 1 / 3) * 255, a: alpha(m[4]) };
  }
  throw new Error(`无法解析颜色：${v}`);
}

const COLOR_IN_TEXT = /#[0-9a-f]{3,8}\b|(?:rgba?|hsla?)\([^)]*\)/gi;

/** 解析为颜色列表：普通色值得到一个；box-shadow（焦点环）得到每一层的颜色，逐层核对 */
function resolveVar(theme, name, seen = new Set()) {
  if (seen.has(name)) throw new Error(`循环引用 ${name}`);
  seen.add(name);
  const v = theme[name];
  if (v === undefined) throw new Error(`未定义 ${name}`);
  const ref = /^var\((--[\w-]+)\)$/.exec(v);
  if (ref) return resolveVar(theme, ref[1], seen);
  if (/\bvar\(/.test(v)) throw new Error(`${name} 的值含内嵌 var()，检查脚本未覆盖：${v}`);
  if (/\dpx\b/.test(v)) {
    const layers = v.match(COLOR_IN_TEXT);
    if (!layers) throw new Error(`${name} 的 shadow 里没有颜色：${v}`);
    return layers.map(parseColor);
  }
  return [parseColor(v)];
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

const one = (theme, name) => {
  const list = resolveVar(theme, name);
  if (list.length !== 1) throw new Error(`${name} 不是单一颜色`);
  return list[0];
};
const BASE_SURFACES = new Set(SURFACES);

const failures = [];
const rows = [];
function check(themeName, fgName, bgName, bg, min, label = bgName) {
  for (const raw of resolveVar(THEMES[themeName], fgName)) {
    const fg = raw.a < 1 ? over(raw, bg) : raw;
    const r = ratio(fg, bg);
    rows.push({ themeName, fgName, bgName: label, r, min });
    if (r < min) failures.push(`${themeName}: ${fgName} on ${label} = ${r.toFixed(2)}:1 < ${min}:1`);
  }
}
for (const [themeName, theme] of Object.entries(THEMES)) {
  for (const [fgName, bgName, min] of PAIRS) {
    const bg = one(theme, bgName);
    if (bg.a === 1) {
      check(themeName, fgName, bgName, bg, min);
      continue;
    }
    // 半透明背景（*-subtle 着色）按实际可能落在的每一种表面分别合成后核对
    for (const s of BASE_SURFACES) check(themeName, fgName, bgName, over(bg, one(theme, s)), min, `${bgName} over ${s}`);
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
console.log(`[check-contrast] OK — ${rows.length} 组对比度（${Object.keys(THEMES).length} 个主题块）全部达标`);
