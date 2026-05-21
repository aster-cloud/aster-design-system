#!/usr/bin/env node
// generate-coverage-matrix.mjs — G7 coverage matrix generator.
//
// Plan: aster-cloud/.claude/plan/glossary-contract.md (v7) §10.2.
//
// Two run modes:
//   1. GitHub App (production): set GLOSSARY_BOT_APP_ID +
//      GLOSSARY_BOT_PRIVATE_KEY + GLOSSARY_BOT_INSTALLATION_ID env vars.
//      Pulls glossary.config.yaml from each consumer repo via the App
//      and the latest CI run for surface coverage.
//   2. Local-filesystem fallback (dev): if any GLOSSARY_BOT_* env var
//      is missing, walks `..` for sibling repos. NOT appropriate for
//      the final G7 acceptance artifact — output is marked DEV ONLY.
//
// Output: Markdown table to stdout. Caller redirects to
// `aster-cloud/docs/operations/add-locale-dry-run-<bcp47>.md`.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const here = dirname(fileURLToPath(import.meta.url));
const designSystemRoot = resolvePath(here, '..', '..', '..');

async function loadConsumers() {
  const path = join(designSystemRoot, '.glossary', 'consumers.yaml');
  if (!existsSync(path)) {
    throw new Error('[matrix] .glossary/consumers.yaml not found');
  }
  const raw = parseYaml(readFileSync(path, 'utf8'));
  // Validate via the canonical Zod schema so a malformed consumers file
  // fails fast with a precise error path instead of crashing downstream.
  const schemaModule = await import(
    join(designSystemRoot, 'packages', 'glossary', 'dist', 'schema.js')
  ).catch(() => null);
  if (schemaModule && schemaModule.ConsumersFileSchema) {
    const parsed = schemaModule.ConsumersFileSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(
        `[matrix] .glossary/consumers.yaml failed schema validation:\n  ${parsed.error.issues
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .join('\n  ')}`,
      );
    }
    return parsed.data;
  }
  // G7 acceptance artifact MUST be schema-validated. Hard fail rather than
  // silently degrading — this is the official-tier coverage gate.
  throw new Error(
    '[matrix] @aster-cloud/glossary dist/schema.js not found. ' +
    'Run `pnpm build` in aster-design-system/packages/glossary before invoking the matrix generator.',
  );
}

function loadLocales() {
  const path = join(designSystemRoot, 'packages', 'glossary', 'src', 'locales.yaml');
  return parseYaml(readFileSync(path, 'utf8'));
}

function authMode() {
  const required = ['GLOSSARY_BOT_APP_ID', 'GLOSSARY_BOT_PRIVATE_KEY', 'GLOSSARY_BOT_INSTALLATION_ID'];
  if (required.every((k) => process.env[k])) return 'github-app';
  return 'local-fs';
}

// ─── Local-fs mode (dev fallback) ───
function localRepoRoot(consumer) {
  const parent = resolvePath(designSystemRoot, '..');
  return join(parent, consumer.repo);
}

function fetchConfigLocal(consumer) {
  const root = localRepoRoot(consumer);
  const path = join(root, consumer['glossary-config-path']);
  if (!existsSync(path)) return null;
  try {
    return parseYaml(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

// ─── GitHub App mode ───
// Implemented as a stub here — actual implementation requires the
// `octokit` + `@octokit/auth-app` dependencies which are NOT installed
// in this package by default (would add ~5MB to npm install for a
// matrix tool nobody uses outside G7). When run with credentials,
// dynamic import + delegate.
async function fetchConfigViaApp(consumer, retryCount = 0) {
  let createAppAuth, Octokit;
  try {
    ({ createAppAuth } = await import('@octokit/auth-app'));
    ({ Octokit } = await import('@octokit/rest'));
  } catch {
    throw new Error(
      '[matrix] GitHub App mode requested but @octokit/auth-app + @octokit/rest not installed. ' +
      'Run `pnpm add --filter @aster-cloud/glossary @octokit/auth-app @octokit/rest` before invoking with credentials.'
    );
  }
  const app = new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: process.env.GLOSSARY_BOT_APP_ID,
      privateKey: process.env.GLOSSARY_BOT_PRIVATE_KEY.replace(/\\n/g, '\n'),
      installationId: process.env.GLOSSARY_BOT_INSTALLATION_ID,
    },
  });
  try {
    const { data } = await app.repos.getContent({
      owner: consumer.org,
      repo: consumer.repo,
      path: consumer['glossary-config-path'],
    });
    if (Array.isArray(data) || data.type !== 'file') return null;
    return parseYaml(Buffer.from(data.content, 'base64').toString());
  } catch (err) {
    if (err.status === 404) return null;
    if (err.status === 403 && retryCount < 3) {
      // rate-limit; exponential backoff up to 3 retries.
      await new Promise((r) => setTimeout(r, 5000 * (retryCount + 1)));
      return fetchConfigViaApp(consumer, retryCount + 1);
    }
    if (err.status === 403) {
      throw new Error(`[matrix] persistent 403 from GitHub App for ${consumer.org}/${consumer.repo} after 3 retries`);
    }
    throw err;
  }
}

// ─── Per-(repo,surface,locale) row ───
function surfaceExpectsLocale(surface, locale) {
  // 'overlays', 'vocabularies', 'docs', 'messages' all expect every
  // locale to have at least one artifact. The matrix entry tracks
  // whether the consumer has ANY content for that locale at the
  // surface; details of which file are out of scope here.
  return true;
}

function rowFor(consumer, surface, locale, config) {
  const expected = surfaceExpectsLocale(surface, locale);
  if (!config) {
    return {
      repo: `${consumer.org}/${consumer.repo}`,
      surface,
      locale,
      expected,
      ciReportedGap: '?',
      evidence: null,
      signoff: null,
      status: consumer.status === 'onboarding' ? '<ONBOARDING-PENDING>' : '<MISSING-CONFIG>',
    };
  }
  const surfaceConf = config.surfaces?.[surface];
  return {
    repo: `${consumer.org}/${consumer.repo}`,
    surface,
    locale,
    expected,
    ciReportedGap: surfaceConf ? 'covered' : 'gap',
    evidence: null,    // populated by CI in production mode
    signoff: null,     // populated by owner team
    status: 'ok',
  };
}

// ─── Markdown rendering ───
function emitMarkdown(matrix, opts) {
  const lines = [];
  lines.push(`# Add-locale dry-run: ${opts.locale}`);
  lines.push('');
  lines.push(`**Generated at**: ${new Date().toISOString()}`);
  lines.push(`**Auth mode**: ${opts.authMode}${opts.authMode === 'local-fs' ? ' — DEV ONLY (do NOT use as G7 acceptance artifact)' : ''}`);
  lines.push('');
  lines.push('## Coverage matrix');
  lines.push('');
  lines.push('| Repo | Surface | Locale | Expected? | CI gap reported? | Evidence | Owner sign-off |');
  lines.push('|---|---|---|---|---|---|---|');
  for (const row of matrix) {
    const expected = row.expected ? 'yes' : 'no';
    const gap = row.status !== 'ok' ? row.status : row.ciReportedGap;
    const evidence = row.evidence ? `[CI run](${row.evidence})` : '—';
    const signoff = row.signoff ?? '_pending_';
    lines.push(`| \`${row.repo}\` | ${row.surface} | ${row.locale} | ${expected} | ${gap} | ${evidence} | ${signoff} |`);
  }
  lines.push('');
  const blocked = matrix.filter((r) => r.status === '<MISSING-CONFIG>' || r.status === '<AUTH-FAILURE>').length;
  const onboarding = matrix.filter((r) => r.status === '<ONBOARDING-PENDING>').length;
  lines.push(`**Summary**: ${matrix.length} rows; ${blocked} blocking (<MISSING-CONFIG> + <AUTH-FAILURE>); ${onboarding} onboarding-pending.`);
  if (blocked > 0) {
    lines.push('');
    lines.push(`G7 acceptance criterion: \`${blocked} rows\` must reach \`ok\` before this artifact can be committed as the locale dry-run record.`);
  }
  return lines.join('\n');
}

// ─── Main ───
async function main() {
  const localeArg = process.argv[2];
  if (!localeArg) {
    console.error('usage: generate-coverage-matrix.mjs <bcp47-locale>  e.g. ja-JP');
    process.exit(2);
  }
  const mode = authMode();
  if (mode === 'local-fs') {
    console.error('[matrix] local-fs fallback (no GLOSSARY_BOT_* env vars). Output is DEV-ONLY.');
  }

  const consumersDoc = await loadConsumers();
  const localesDoc = loadLocales();
  const knownLocales = new Set(localesDoc.locales.map((l) => l.id));
  const allLocales = new Set([...knownLocales, localeArg]);

  const matrix = [];
  for (const consumer of consumersDoc.consumers) {
    const config = mode === 'github-app'
      ? await fetchConfigViaApp(consumer)
      : fetchConfigLocal(consumer);
    for (const surface of consumer['expected-surfaces']) {
      for (const locale of allLocales) {
        matrix.push(rowFor(consumer, surface, locale, config));
      }
    }
  }

  process.stdout.write(emitMarkdown(matrix, { authMode: mode, locale: localeArg }));
  process.stdout.write('\n');
}

main().catch((err) => {
  console.error('[matrix] fatal:', err.message);
  process.exit(1);
});
