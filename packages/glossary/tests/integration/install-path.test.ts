// 回归：包被安装在含空格（或 %、# 等 URL 保留字符）的路径下时，
// `import '@aster-cloud/glossary'` 的顶层急切加载必须成功。
//
// 为什么要 spawn 子进程：loadGlossary() 的默认根目录由 dist/loader.js 自身的
// import.meta.url 推导，进程内用 rootDir 覆盖无法触达这条默认路径；只有把
// dist+src 真正复制到带空格的目录、再由独立 node 进程 import，才能复现
// issue #16 的故障（pathname 未解码 → locales.yaml not found at …%20…）。

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { fetchWithRetry } from '../../src/fetch-utils.js';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, '..', '..');

/**
 * 每次都把当前源码编译到临时安装目录，而不是复用 pkgRoot/dist：
 * dist 过期时复用会让测试考验陈旧产物——源码被改坏也不会变红。编译约 1–2 秒。
 */
function compileSrcInto(outDir: string): void {
  const require = createRequire(import.meta.url);
  const tscBin = join(dirname(require.resolve('typescript/package.json')), 'bin', 'tsc');
  execFileSync(process.execPath, [tscBin, '-p', pkgRoot, '--outDir', outDir], { stdio: 'inherit' });
}

let tmpRoot: string;
let installDir: string;

beforeAll(() => {
  tmpRoot = mkdtempSync(join(tmpdir(), 'aster glossary #'));
  installDir = join(tmpRoot, 'node_modules', '@aster-cloud', 'glossary');
  mkdirSync(installDir, { recursive: true });
  compileSrcInto(join(installDir, 'dist'));
  for (const entry of ['src', 'package.json']) {
    cpSync(join(pkgRoot, entry), join(installDir, entry), { recursive: true });
  }
  // 运行时依赖（yaml / zod）复用本包已安装的 node_modules，避免在临时目录重新安装。
  symlinkSync(join(pkgRoot, 'node_modules'), join(installDir, 'node_modules'), 'dir');
});

afterAll(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
});

describe('install path with space / reserved URL characters (issue #16)', () => {
  it('top-level `import` of dist/index.js eager-loads the glossary', () => {
    const entry = pathToFileURL(join(installDir, 'dist', 'index.js')).href;
    // 以 URL 形式经 argv 传入，入口 import 本身不受路径中空格影响；
    // 真正被考验的是 loader.js 内部由 import.meta.url 推导 src/ 的那一行。
    const stdout = execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        'const m = await import(process.argv[1]); console.log(JSON.stringify({ terms: Object.keys(m.glossary.terms).length, localesVersion: m.glossary.localesVersion }));',
        '--',
        entry,
      ],
      { cwd: installDir, encoding: 'utf8' },
    );
    const result = JSON.parse(stdout.trim()) as { terms: number; localesVersion: number };
    expect(result.terms).toBeGreaterThanOrEqual(38);
    expect(result.localesVersion).toBe(1);
  });

  it('fetchWithRetry resolves a file:// URL whose path contains space and #', async () => {
    const cdnDir = join(tmpRoot, 'cdn #1');
    mkdirSync(cdnDir, { recursive: true });
    writeFileSync(join(cdnDir, 'denylist.json'), '{"ok":true}', 'utf8');
    const url = pathToFileURL(join(cdnDir, 'denylist.json')).href;
    expect(url).toMatch(/%20/);
    expect(url).toMatch(/%23/);
    await expect(fetchWithRetry(url, { timeoutMs: 1000, maxRetries: 0 })).resolves.toBe('{"ok":true}');
  });

  it('fetchWithRetry maps a malformed file:// URL to the not-found error (source fallback path)', async () => {
    await expect(fetchWithRetry('file://not-absolute', { timeoutMs: 1000, maxRetries: 0 }))
      .rejects.toThrow(/file not found/);
  });
});
