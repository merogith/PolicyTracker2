# Implementation plan — v2

Recommended specification v2.0.0. The review pack and executable scoring reference are updated; application integration remains planned. Keep the current application stack and domain/topic system. Read the relevant installed Next.js guides required by AGENTS.md before application coding.

## 1. Establish one configuration authority

Update `src/lib/analysis/prompt.ts`, `schemas.ts`, `src/lib/taxonomy.ts`, `taxonomy-edit.ts`, `prisma/seed.ts` and `prisma/schema.prisma`. Add versioned ConfigBundle loading/import/export; derive enum choices from its taxonomy/labels. Connect proposed `config/*.json` and `prompts/*.md` through the existing prompt builders, with immutable per-run hashes.

Tests: invalid IDs rejected; export/import round trip; UI and file export represent the same bundle; current jobs retain their starting version. Display-only edits require no LLM. Do not switch the runtime to incompatible prompt text before schema/storage changes.

## 2. Persist atomic records and evidence

Extend Prisma models and ingestion/extraction in `src/lib/analysis/run.ts`, `src/lib/analysis/schemas.ts`, `src/lib/analysis/verify.ts` and the ingestion modules identified in CURRENT-PIPELINE.md. Add Evidence, Record, field provenance and per-topic coverage. Preserve existing outputs as historical snapshots; migrate or re-extract only when required fields are unavailable.

Tests: source quote/numeric fidelity; idempotent ingestion; original language; physical page mapping; failures never appear as no evidence; original document assertions remain immutable.

## 3. Replace lossy synthesis with pooled organization

Update `src/lib/analysis/synthesise.ts`, `src/lib/topics.ts`, `src/lib/topic-merge.ts`. Introduce packing/reconciliation modules. Pool by assigned primary-topic home; retain quotes and qualifiers; use one owner plus context-only references. Group identities, variants and typed relationships. Reconcile overflow boundaries.

Tests: every owned record accounted once; duplicate discovery differs from distinct proposition; no borrowed fields across unrelated actions; numeric contradictions require comparable qualifiers; newest date does not imply replacement; context remains separate; failed accounting marks partial results.

## 4. Integrate deterministic bands and source-scoped snapshots

Adapt `reference/score-bands.mjs` into application scoring with the exact source-checked contract in SCORING.md. Replace use of `config/scoring/rubric.json` only after consumer migration. Preserve legacy scores under their original method version. Implement claim variants, topic bands, domain P/A/U intervals and independent processing completeness.

Tests: reference fixtures plus integration tests; document-only evidence isolation; partial positive remains positive; duplicate placements do not change denominator; all-empty incomplete gives unavailable; band-code averages and country composites absent. Existing old JSON lacks several delivery fields, so do not backfill them by inference.

## 5. Align every dashboard consumer

Follow DASHBOARD.md. Update overview, country, topic, comparison and source-detail components listed in CURRENT-PIPELINE.md/PLANNED-CHANGES.md. Use exact band names, accessible colors, separate progress/conflict/conditionality badges, and source/profile labels. Correct page-usage labels to measured coverage.

Add a versioned settings editor for taxonomy, labels, prompts, pipeline and scoring, using the same configuration authority. Keep flags/hides as post-publication overlays. Provide a clearly labelled adjusted analysis if exclusions affect scores.

Tests: four band names consistent; unknowns distinct from zero; ranges explained; per-document stages do not inherit combined maxima; filters do not alter fixed benchmark denominators; hiding does not silently modify benchmarks; keyboard/text equivalents for color.

## 6. Bound operations and release automatically

Update `src/lib/openai.ts`, the worker queue and orchestration. Share one country-update budget across SDK/application retries, both stages, tool calls, repairs and overflow. Cache unchanged work. Publish snapshots automatically at terminal state/deadline, with limitations and safe late completion. Preserve the old published view during refresh.

Run automated representative-source evaluations for missed evidence, quotation/number fidelity, grouping, contradictions, document scope, cost and latency. Use a smaller model/context only after it meets the configured criteria. No manual country-result validation queue is added.

## Completion means

The pack's files are actually loaded through the versioned bundle; persistent records retain provenance; all UI consumers use the same scoring version; bounded failures publish honestly; document and combined results remain reproducible; automatic tests and source evaluations pass. Merely editing a Markdown prompt is not completion of runtime integration.

PLANNED-CHANGES.md provides the prioritized code/file change inventory. RUNTIME-INPUTS.md and its byte-exact snapshots preserve the current starting point.

