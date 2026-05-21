// Zod schemas for the glossary contract.
//
// Single source of truth — every TS consumer's input validation flows
// through here. The Java reader generates a parallel set; the
// contract test in tests/integration/cross-language.test.ts asserts
// byte-equivalence between the JSON the TS loader produces and what
// the Java reader expects.
//
// Design notes:
//   - Concept IDs (not surface strings) are the keys — homonyms split
//     into multiple concepts with distinct `sense` + `disambiguation`.
//   - `match.mode = literal` is restricted to `do-not-translate` or
//     ASCII technical strings; the loader-level check sits in
//     `validateTermBusinessRules()` because Zod can't express the
//     cross-field invariant cleanly.
//   - `backbone-change-type` controls strict-CI gating per §7.3 of
//     the v7 plan. The schema enforces presence + valid value when
//     `backbone-revision > 1`; the gating logic lives in scanner.ts.

import { z } from 'zod';

// ───────── Locales ─────────

export const LocaleIdSchema = z
  .string()
  .regex(/^[a-z]{2,3}-[A-Z][a-zA-Z0-9-]+$/, 'locale id must match `<lang>-<region>` BCP-47-ish');

export const LocaleSchema = z.object({
  id: LocaleIdSchema,
  role: z.literal('backbone').optional(),
  bcp47: z.string(),
});

export const LocalesFileSchema = z.object({
  version: z.literal(1),
  localesVersion: z.number().int().positive(),
  locales: z.array(LocaleSchema).min(1).refine(
    (xs) => xs.filter((x) => x.role === 'backbone').length === 1,
    { message: 'exactly one locale must have role: backbone' },
  ),
});

export type LocaleId = z.infer<typeof LocaleIdSchema>;
export type Locale = z.infer<typeof LocaleSchema>;
export type LocalesFile = z.infer<typeof LocalesFileSchema>;

// ───────── Match modes ─────────

export const MatchSchema = z.object({
  mode: z.enum(['literal', 'phrase', 'reviewed-regex']),
  'case-sensitive': z.boolean().default(false),
  boundary: z.enum(['unicode-word', 'none']).default('unicode-word'),
  normalize: z.array(z.enum(['case', 'width', 'punctuation', 'whitespace'])).default([]),
  'allowed-inflections': z.record(LocaleIdSchema, z.array(z.string())).optional(),
  'regex-rationale': z.string().optional(),
});

export type Match = z.infer<typeof MatchSchema>;

// ───────── Forbidden aliases ─────────
// v3-codex #3: raw substring aliases are unsafe. Every alias has its own
// match spec; the schema rejects bare strings.

export const ForbiddenAliasSchema = z.object({
  text: z.string().min(1),
  match: MatchSchema,
});

export type ForbiddenAlias = z.infer<typeof ForbiddenAliasSchema>;

// ───────── Lifecycle ─────────

export const LifecycleStatusSchema = z.enum([
  'reserved',
  'active',
  'deprecated',
  'superseded',
]);

export const BackboneChangeTypeSchema = z.enum([
  'cosmetic',
  'terminology',
  'semantic',
  'legal',
]);

export const BackboneApprovalSchema = z.object({
  role: z.enum(['glossary-steward', 'legal', 'per-locale-reviewer', 'product', 'security']),
  actor: z.string().email().or(z.string().regex(/^[a-z0-9._-]+@aster$/i)),
  at: z.string().datetime(),
});

export const LifecycleSchema = z
  .object({
    status: LifecycleStatusSchema,
    'since-version': z.number().int().positive(),
    'backbone-revision': z.number().int().positive().default(1),
    'backbone-change-type': BackboneChangeTypeSchema.optional(),
    'backbone-change-approved-by': z.array(BackboneApprovalSchema).optional(),
    'reviewed-backbone-revision': z.record(LocaleIdSchema, z.number().int().positive()).default({}),
    replaces: z.string().optional(),
    'superseded-by': z.string().optional(),
  })
  .refine(
    (l) => l['backbone-revision'] === 1 || l['backbone-change-type'] !== undefined,
    { message: 'backbone-change-type required when backbone-revision > 1', path: ['backbone-change-type'] },
  )
  .refine(
    (l) =>
      l['backbone-revision'] === 1 ||
      (l['backbone-change-approved-by'] !== undefined && l['backbone-change-approved-by'].length > 0),
    {
      message: 'backbone-change-approved-by required when backbone-revision > 1',
      path: ['backbone-change-approved-by'],
    },
  );

export type Lifecycle = z.infer<typeof LifecycleSchema>;

// ───────── Term ─────────

const PartOfSpeechSchema = z.enum([
  'noun',
  'verb',
  'adjective',
  'adverb',
  'phrase',
  'acronym',
]);

const TermBaseSchema = z.object({
  id: z
    .string()
    .regex(/^[a-z][a-z0-9-]+$/, 'id must be kebab-case, start with a lowercase letter'),
  category: z.string().min(1),
  sense: z.string().optional(),
  'part-of-speech': PartOfSpeechSchema,
  disambiguation: z.string().optional(),
  definition: z.string().min(1),
  'legal-basis': z.string().optional(),
  'introduced-in': z.string().optional(),
  'user-facing': z.boolean(),
  lifecycle: LifecycleSchema,
  translations: z.record(LocaleIdSchema, z.string().min(1)),
  match: MatchSchema,
  'forbidden-aliases': z.record(LocaleIdSchema, z.array(ForbiddenAliasSchema)).default({}),
  'applies-to': z.array(z.string()).default([]),
  'tenant-overridable': z.boolean().default(false),
  'do-not-translate': z.boolean().default(false),
});

export const TermSchema = TermBaseSchema.superRefine((term, ctx) => {
  // match.mode = literal is allowed only when do-not-translate is true OR
  // the term is ASCII-only technical (translations contain only [\x20-\x7E]).
  if (term.match.mode === 'literal') {
    const asciiOnly = Object.values(term.translations).every((t) => /^[\x20-\x7E]+$/.test(t));
    if (!term['do-not-translate'] && !asciiOnly) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['match', 'mode'],
        message:
          "match.mode='literal' allowed only when do-not-translate=true or translations are ASCII-only technical strings",
      });
    }
  }
  // reviewed-regex requires rationale.
  if (term.match.mode === 'reviewed-regex' && !term.match['regex-rationale']) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['match', 'regex-rationale'],
      message: "match.mode='reviewed-regex' requires 'regex-rationale'",
    });
  }
  // reviewed-backbone-revision[locale] <= lifecycle.backbone-revision
  for (const [locale, rev] of Object.entries(term.lifecycle['reviewed-backbone-revision'])) {
    if (rev > term.lifecycle['backbone-revision']) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['lifecycle', 'reviewed-backbone-revision', locale],
        message: `reviewed-backbone-revision[${locale}] (${rev}) > backbone-revision (${term.lifecycle['backbone-revision']})`,
      });
    }
  }
});

export type Term = z.infer<typeof TermSchema>;

// ───────── Terms file ─────────

export const TermsFileSchema = z.object({
  version: z.literal(1),
  terms: z.record(z.string(), TermSchema),
});

export type TermsFile = z.infer<typeof TermsFileSchema>;

// ───────── Glossary (loaded view) ─────────

export const GlossarySchema = z.object({
  version: z.literal(1),
  localesVersion: z.number().int().positive(),
  locales: z.array(LocaleSchema),
  terms: z.record(z.string(), TermSchema),
});

export type Glossary = z.infer<typeof GlossarySchema>;

// ───────── Release manifest ─────────

export const ReleaseStateSchema = z.enum([
  'prepared',
  'rc-validating',
  'rc-validated',
  'npm-promoting',
  'npm-published',
  'maven-releasing',
  'maven-released',
  'promoted',
  'failed',
]);

export const ReleaseManifestSchema = z.object({
  version: z.string(),
  localesVersion: z.number().int().positive(),
  state: ReleaseStateSchema,
  transitions: z.array(
    z.object({
      to: ReleaseStateSchema,
      at: z.string().datetime(),
      by: z.string(),
    }),
  ),
  checksums: z.object({
    'npm-integrity': z.string(),
    'maven-jar-sha256': z.string(),
    'glossary-export-sha256': z.string(),
  }),
  signature: z.string(),
  consumers: z.array(
    z.object({
      repo: z.string(),
      tier: z.enum(['official', 'community']),
      'lockfile-pr': z.string().nullable(),
      'merged-at': z.string().datetime().nullable().optional(),
    }),
  ),
});

export type ReleaseManifest = z.infer<typeof ReleaseManifestSchema>;

// ───────── Denylist ─────────

export const DenylistEntrySchema = z.object({
  'package-version': z.string(),
  reason: z.string().min(1),
  replacement: z.string(),
  'denylisted-at': z.string().datetime(),
  'denylisted-by': z.string(),
});

export const DenylistSchema = z.object({
  version: z.literal(1),
  'updated-at': z.string().datetime(),
  signature: z.string(),
  entries: z.array(DenylistEntrySchema),
});

export type DenylistEntry = z.infer<typeof DenylistEntrySchema>;
export type Denylist = z.infer<typeof DenylistSchema>;

// ───────── Block map (sidecar for Markdown surfaces) ─────────

export const BlockMapSchema = z.object({
  version: z.literal(1),
  'fmt-config-version': z.number().int().positive().default(1),
  blocks: z.record(
    z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
    z.object({
      'created-at': z.string().datetime(),
      'created-by': z.string(),
      occurrences: z.record(
        z.string(),
        z.object({
          'line-hint': z.number().int().positive(),
        }),
      ),
      'alias-of': z.string().nullable().optional(),
    }),
  ),
});

export type BlockMap = z.infer<typeof BlockMapSchema>;

// ───────── Consumers registry ─────────

export const ConsumerEntrySchema = z.object({
  org: z.string(),
  repo: z.string(),
  tier: z.enum(['official', 'community']),
  status: z.enum(['active', 'onboarding']).default('active'),
  'onboarded-at': z.string().datetime().optional(),
  'active-by': z.string().datetime().optional(),
  'glossary-config-path': z.string().default('glossary.config.yaml'),
  'expected-surfaces': z.array(z.string()).min(1),
});

export const ConsumersFileSchema = z.object({
  version: z.literal(1),
  consumers: z
    .array(ConsumerEntrySchema)
    .refine(
      (xs) =>
        new Set(xs.map((c) => `${c.org}/${c.repo}`)).size === xs.length,
      { message: 'org/repo pairs must be unique' },
    )
    .refine(
      (xs) => xs.every((c) => c.status !== 'onboarding' || (c['onboarded-at'] && c['active-by'])),
      { message: 'onboarding consumers must set onboarded-at + active-by' },
    ),
});

export type ConsumerEntry = z.infer<typeof ConsumerEntrySchema>;
export type ConsumersFile = z.infer<typeof ConsumersFileSchema>;

// ───────── Consumer-side glossary.config.yaml schema ─────────
// Shared so consumer scripts can validate config via Zod instead of
// strong-cast (`as Config`). See aster-cloud/scripts/check-glossary.ts +
// aster-lang-dev/scripts/check-glossary.ts for usage.

export const GlossaryConfigSurfaceSchema = z.object({
  type: z.enum(['json', 'markdown']),
  paths: z.union([z.string(), z.array(z.string())]),
  'backbone-locale': z.string().optional(),
  'locale-from-filename': z.boolean().optional(),
  'locale-from-frontmatter': z.boolean().optional(),
  'fallback-locale': z.string().optional(),
  alignment: z.enum(['block-id']).optional(),
});

export const GlossaryConfigSchema = z.object({
  version: z.literal(1),
  tier: z.enum(['official', 'community']),
  localesVersion: z.number().int().positive(),
  'glossary-pin': z
    .object({
      version: z.string(),
      'npm-integrity': z.string(),
      'maven-sha256': z.string(),
    })
    .optional(),
  surfaces: z.record(z.string(), GlossaryConfigSurfaceSchema),
  'ignored-surfaces': z
    .array(z.object({ path: z.string(), reason: z.string(), expires: z.string().optional() }))
    .optional(),
  'untranslated-tokens': z.array(z.string()).optional(),
});

export type GlossaryConfig = z.infer<typeof GlossaryConfigSchema>;
