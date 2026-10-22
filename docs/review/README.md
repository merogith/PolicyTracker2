# Start here: policy tracker final review

**Start with the [final upgrade plan](team/FINAL-UPGRADE-PLAN.md).** It consolidates the comprehensive pipeline handoff, targeted OCR and the approved [dashboard design](ui-scoring/README.md). The [interactive preview](ui-scoring/dashboard.html) and [scoring method](ui-scoring/METHOD.md) remain current design references. The v3 machine files are baseline contracts awaiting the specified implementation upgrade; their domain-retrieval settings and old request examples are superseded by the final plan. Prior packs are preserved under docs/archive. This planning update changes no application behavior.

**Review pack 4.2.0 · presentation 4.1.0 · scoring method 4.0.0 · taxonomy 3.0.0 · 20 October 2026 · proposed, not active.**

The recommendation is a lean two-stage pipeline with explicit inputs, preserved sources and automatic publication. The dashboard combines unique claim counts, response detail scores and coverage across topics. Reported implementation remains a separate fact; users can open exact evidence from each claim.

## Read in this order

| Audience / question | Open |
|---|---|
| Decision maker: what are we approving? | [Final upgrade plan, including OCR](team/FINAL-UPGRADE-PLAN.md), [shareable PDF](team/policy-tracker-final-upgrade-plan.pdf) |
| Whole team: how does information move? | [Pipeline and LLM inputs](team/PIPELINE.md) |
| Analysts: what do numbers, colors and arrows mean? | [Current scoring method](ui-scoring/METHOD.md) |
| Product team: what appears on each screen? | [Current dashboard design](ui-scoring/README.md), [screen priorities](team/DASHBOARDS.md) |
| Everyone reviewing categories | [Full taxonomy and label catalogue](team/TAXONOMY.md) |
| Engineer: what could fail? | [Deep review findings](reference/REVIEW-FINDINGS.md) |
| Engineer: what are the fields? | [Data dictionary](reference/DATA-DICTIONARY.md), [wire contracts](pipeline/llm-contracts.json) |
| Exact historical implementation, safely preserved | [Preserved source guide](preserved/README.md) |
| Tests and delivery boundary | [Current scoring/UI verification](ui-scoring/VERIFICATION.md), [pipeline reference checks](reference/VERIFICATION.md) |

## The method in one minute

For sharing, use the [final upgrade plan PDF](team/policy-tracker-final-upgrade-plan.pdf). The [UI/scoring PDF](ui-scoring/policy-tracker-ui-scoring-revision.pdf) remains a reference for the approved screens and score method, while its earlier pipeline passages/diagrams are superseded by the new plan. The [taxonomy and fields](pdf/policy-tracker-v3-taxonomy-and-fields.pdf) remain a category reference. The [prompt sourcebook](pdf/policy-tracker-v3-prompt-sourcebook.pdf) preserves the historical real prompts and v3 proposal; it is not the final packet-extraction prompt set.

Explore the [current dashboard mockup](ui-scoring/dashboard.html), [simple process](visuals/process-simple.svg) and [engineering flow](visuals/process-technical.svg). Both diagrams can be edited in [pipeline.drawio](visuals/pipeline.drawio). The mockup is synthetic and has no live backend.

1. Register all selected source versions and prepare every page/region, using native text, layout and targeted OCR/vision recovery.
2. **LLM 1** reads every owned source packet across all topics, returning statements, titles, labels, evidence and unit accounting.
3. Code checks evidence, performs targeted omission checks/repairs, persists records and pools them by assigned topic across documents.
4. **LLM 2** organizes conservative common claims and links, preserving conflicting values and supporting context.
5. Code scores responses with four explicit checks, averages responses within topics and fixed topics within domains/country. Counts and topic coverage remain separate.
6. Publish automatically, including incomplete-state labels when needed. Users may flag or hide afterward.

Countries run sequentially, initially with two shared model-request slots within a country. Organization uses a frozen contributing record inventory; partial results remain explicitly partial. These are two principal model stages, not exactly two API requests. Recovery is conditional; pooling and scoring do not call an LLM.

## Counts, scores and meaning

**Response + Who + When + specific What = up to 4 points.** Two response claims with 3 and 4 points give a topic score of **87.5/100**. If six of ten fixed topics average 80 and the other four were completely searched without responses, the domain score is **48/100**, shown beside **6/10 topics addressed**. The country averages all unique topics, not unequal domain averages.

Score colors mean **Limited, Basic, Moderate and Substantial policy detail**. Context remains unscored and unavailable assessments are gray. Arrows show matched-edition documentation changes; backfills and method changes receive a refresh marker. A detailed plan can score highly without being implemented. The [method](ui-scoring/METHOD.md) explains boundaries, missing-data handling, score sensitivity and light alignment with NAP, Sendai and transparency principles. These do not add fields or stages.

Country priorities are highlighted only when explicitly sourced. They can change sorting and focus but never silently reweight the common comparison. NDC-only, NDC+NAP and all-supplied views are distinct source scopes.

## One small structure

```text
review/
  README.md                    entry point
  ui-scoring/                  current design, scoring, examples and review PDF
  team/                        final plan/PDF and short discussion guides
  pipeline/                    v3 baseline machine files to upgrade in phase 1
    prompts/                   two normal LLM prompts
    maintenance/               occasional retag prompt
  examples/                    synthetic data and rendered requests; never auto-loaded
  reference/                   offline builders, checks, field dictionary and audit
  visuals/                     editable diagrams and dashboard example
  pdf/                         v3 reference books; scoring/UI passages historical
  preserved/                   frozen current source; never model input
```

Only explicit paths in a versioned pipeline manifest may contribute to a model request. The model never browses this folder or receives all Markdown. Team guides, archives, scoring rules, test fixtures, previous scores and unrelated sources are not prompt context. A future coding assistant starts with the final plan, updates the v3 baseline under that plan, and creates one new immutable runtime bundle; it does not choose files by apparent recency.

## Files humans can change later

These are the existing reference files. The final plan specifies their migration to one production configuration folder, including the new recovery prompt and upgraded contracts. They are not activated by this review pack.

| Change | Existing reference file to migrate | Automatic effect |
|---|---|---|
| Domains/topics/routing | [taxonomy.json](pipeline/taxonomy.json) | Retag affected records; re-extract affected source units if scope expands |
| Label choices and optional modules | [labels.json](pipeline/labels.json) | Re-extract/retag affected fields; do not invent old missing labels |
| Extraction behavior | [extract.md](pipeline/prompts/extract.md) | New method version and affected extraction |
| Grouping behavior | [organize.md](pipeline/prompts/organize.md) | Reuse source records, regroup affected packs |
| Limits/models/concurrency | [pipeline.json](pipeline/pipeline.json) | New processing configuration; no mid-run change |
| Current scoring/colors/arrows | [scoring.json](ui-scoring/scoring.json) | Recompute from sourced facts; preserve versions; rubric changes require matching calculator changes |
| Model output shape | [llm-contracts.json](pipeline/llm-contracts.json) | Validate adapters and fixtures together |

UI settings must edit/export the same immutable bundle. Saving a display-only edit requires no model call. Source statements, raw evidence and old snapshots remain recoverable.

## Preserve versus propose

The [application archive](preserved/application-before-update.zip) contains exact pre-update code/configuration with a [SHA-256 manifest](preserved/application-manifest.json). The [current prompt/reference archive](preserved/current-runtime.zip) includes real prompt-builder code and illustrative renders produced by it. Live database settings and credentials are not included. The earlier review pack is preserved separately under docs/archive.

The files in pipeline/ are preserved v3 proposal references; phase 1 will replace them under the final plan. The offline examples demonstrate the baseline assembly and metric rules; they do not establish live LLM accuracy or production cost. Application integration remains the work described in the final upgrade plan.

The preserved source is the **19 October baseline**. The current workspace now differs in some application files; `PACK-MANIFEST.json` records those paths. This presentation update does not modify those files. Recheck the earlier implementation findings against current source before starting a migration.

The full package is also available as `docs/policy-tracker-final-review.zip`. `PACK-MANIFEST.json` lists every delivered file and hash; `pipeline/bundle.json` identifies the proposed configuration and reference contracts. Only each stage's explicit input allowlist enters request assembly, not every file in either manifest.
