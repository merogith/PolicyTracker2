# Planned changes: a simpler policy tracker

19 October 2026 · Recommended specification v2.0.0 · **Not active in the application.**

This plan replaces the proposed 0–100 headline score with four evidence-based documentation bands. It preserves the climate/disaster scope, 16 domains, 64 topics, two LLM stages, existing application and automatic publication. This document changes the specification; runtime behavior changes only when the code integration and database migration below are implemented.

## 1. What changes and why

| Priority | Planned change | Result for the team |
|---|---|---|
| First | One versioned bundle for taxonomy, labels, prompts, pipeline settings and band rules | Operators can identify and export exactly what a run used. |
| First | Preserve source records and the fields needed for band decisions | Every displayed label has inspectable evidence; document history remains intact. |
| First | Pool by assigned topic before organization | Evidence found under different questions reaches the correct country/topic group. |
| First | Replace ordinal totals and the proposed points rubric with four documentation bands | Clear labels replace difficult-to-explain sums and apparent precision. |
| Next | Cache unchanged extraction; rebuild affected groups and linked neighbors | Adding a document avoids repeating work on unchanged documents. |
| Next | Display topic bands, domain distributions and response-coverage bounds | Regional comparison stays readable without averaging categorical labels. |
| Next | Enforce bounded repairs, budgets and coverage states | Results publish automatically, including honest incomplete states. |

The four exact names are **No evidence found**, **Context documented**, **Policy response documented**, and **Delivery details documented**. These describe documentation, not climate performance or adequacy of ambition.

The last band requires a named responsible/implementing actor, an action-anchored timeframe, and a specific verifiable deliverable for the same coherent response. A broad phrase such as “rehabilitate canals” is insufficient. “The Ministry of Agriculture will rehabilitate 30 km of canals during 2026–2030” provides the relevant details. A named legal instrument or concrete milestone can qualify without a numerical target.

Progress reports, contradictions, conditionality and processing completeness appear separately. A disagreement between comparable 100,000 ha and 80,000 ha targets does not itself erase documented policy responses. If unresolved variants change whether a band criterion is met, show the lower guaranteed band and explain the unresolved qualification.

## 2. Keep two model stages; add code pooling

**Current:** document/domain extraction → synthesis of answers to the same domain question → merged topic views → coarse score.

**Planned:** document/domain extraction → checked durable records → code pooling by assigned topics → country/domain organization → checked claims and relationships → deterministic bands → automatic snapshot publication.

Pooling does not call an LLM. It assigns one owner through the primary topic, collects records across documents, reconciles exact duplicate discoveries conservatively and supplies relevant records from other owners as read-only context. Stage 2 preserves equivalent assertions, differing variants and typed links. Supporting material does not silently become proof that a target was achieved.

Two roles may use the same model. There is no routine third scoring model or separate model for pooling. Retagging is maintenance or targeted repair. A genuinely expanded taxonomy requires searching sources again; retagging cannot recover evidence never extracted.

## 3. Implementation map

Paths in this section are repository-relative. Files described as proposed do not yet form active dependencies. Read the installed Next.js guides required by AGENTS.md before application changes.

| Work package | Existing files to change | Concrete implementation and automated completion check |
|---|---|---|
| Configuration and prompt authority | `src/lib/analysis/prompt.ts`, `src/lib/analysis/schemas.ts`, `src/lib/taxonomy.ts`, `src/lib/taxonomy-edit.ts`, `prisma/seed.ts`, `prisma/schema.prisma` | Load a validated immutable bundle for each run; render the editable prompts; derive allowed IDs from the bundle. Save prompt/configuration hashes. Export/import must reproduce the same definitions, and display-only edits must cause zero model calls. Preserve existing database taxonomy edits during migration. |
| Records and evidence | `prisma/schema.prisma`, `src/lib/analysis/run.ts`, `src/lib/analysis/schemas.ts`, `src/lib/analysis/verify.ts` | Add durable record/evidence identities and versions, source-linked facts, responsible actors, action timeframes and deliverables. Keep existing raw results for compatibility. Unsupported factual fields cannot establish a higher band. Reprocessing must preserve identities or record split/merge lineage. |
| Topic pooling and claim organization | `src/lib/analysis/synthesise.ts`, `src/lib/topics.ts`, `src/lib/topic-merge.ts` | Pool by assigned topics, retain quotes and qualifiers in Stage 2, account for each owned record once, preserve context-only references and typed relationships. Replace shared-quote merging and historical maximum-stage propagation. The same quote can support different propositions. |
| Incremental jobs and budgets | `src/lib/jobs.ts`, `src/lib/reruns.ts`, `src/worker/handlers.ts`, `src/lib/openai.ts`, `src/lib/analysis/call.ts`, `src/lib/cost.ts` | Cache by input and semantic configuration hashes; invalidate only affected extraction/groups. Persist one country-update allowance including retries, overflow, repairs and search. A result-limit setting is not a total search-call limit. Interrupted work resumes safely; stale jobs cannot overwrite a newer input bundle. |
| Four-band evaluation | `src/lib/scoring.ts`, `src/lib/scoring.test.ts`, `src/lib/overview.ts`, `src/lib/views.ts` | Replace the active rubric after the new evaluator is integrated. Apply the same evidence checks to records/claims and topic views, without point totals or ordinal averaging. Resolve multi-document details only within the same identified response. A complete empty search differs from failed processing. |
| Dashboard and settings | `src/app/countries/page.tsx`, `src/app/countries/[iso3]/page.tsx`, `src/app/countries/[iso3]/documents/[id]/page.tsx`, `src/components/charts/country-matrix.tsx`, `src/components/charts/domain-dashboard.tsx`, `src/components/domains-view.tsx`, `src/components/result-card.tsx`, `src/components/page-viewer.tsx`, `src/components/taxonomy-editor.tsx` | Add topic-band cells, domain distributions, response coverage and coverage diagnostics. Preserve document/combined switches and source drill-down. Expose bundle editing with impact previews. Flags/hiding apply after publication and remain recoverable. |

Proposed supporting modules are `src/lib/configuration.ts`, `src/lib/analysis/records.ts`, `src/lib/analysis/identity.ts`, `src/lib/analysis/pack.ts`, `src/lib/analysis/reconcile.ts`, `src/lib/analysis/cache.ts`, `src/lib/snapshots.ts` and `src/lib/claim-overlays.ts`. Add a timestamped Prisma migration and the necessary settings/overlay routes. These names are implementation suggestions, not additional independent configuration authorities.

## 4. Aggregation contract

Every topic has one scoring home. Secondary placements provide navigation without duplicating a denominator. The regional profile retains all 64 topics; a domain uses its fixed home-topic subset.

For a basket of N topics:

- **P:** topics with a proven policy response, including topics with Delivery details documented. They stay in P even if another part of their processing failed.
- **A:** topics whose required processing is complete and whose possible upper band is below 2. Unresolved 1–2 variants remain in U even after processing finishes.
- **U:** remaining topics, where response presence remains unresolved.

The categories partition the basket: `N = P + A + U`. Show response coverage as `100 × P/N` to `100 × (P+U)/N`. This is a bound on documentation coverage, not a confidence interval. It is one exact percentage only when U is zero.

Synthetic arithmetic example: `P=6, A=2, U=2, N=10` gives **60–80% response coverage**. The ten-topic basket only illustrates the formula; it does not change the 64-topic profile. Processing completeness is measured separately: `N−U` is not necessarily the number of fully processed topics because P can contain incomplete topics.

Show distributions of topic bands. Do not calculate a mean of band codes, a default country league table or a z-score of ordinal labels. Comparisons require the same source-role/date rules, topic profile, method version and snapshot/as-of convention. Adding documents can improve documentation coverage without demonstrating a change in national policy.

## 5. What an edit should trigger

| Edit | Automatic effect |
|---|---|
| Rename/reorder display labels or change colors | Re-render only; no model call. |
| Change band criteria | Recalculate from stored eligible facts. If new evidence fields are required, schedule affected extraction rather than inventing them. |
| Improve organization instructions | Reorganize affected saved records and recalculate derived views. |
| Improve extraction instructions or change extraction model/settings | Re-extract affected source units, then rebuild dependent groups. |
| Change topic meaning or enabled labels | Reclassify affected evidence; expanded subject scope also searches relevant sources again. |
| Change a topic's home or comparison basket | Rebuild affected views and version the comparison profile; preserve historical comparability metadata. |
| Add a document | Extract the new document; rebuild affected groups and relationship neighbors. |
| Hide or flag a published claim | Apply a recoverable display overlay. Do not silently rewrite the shared benchmark. |

The settings interface should edit and export the same bundle. It should show the affected work and estimated scope before saving. A configuration version change is an operator customization, not a human acceptance queue for country results.

## 6. Simple options and SWOT

| Option | Strength | Weakness | Opportunity | Threat |
|---|---|---|---|---|
| Four bands + distributions + response coverage — recommended | Simple decisions, explicit evidence, readable regional comparison | Does not distinguish every degree of ambition | Add deeper source-linked detail only where useful | Users may still mistake documentation for performance unless labels remain explicit |
| Weighted 0–100 headline index | Fine-grained sortable number | Arbitrary weights and false precision; harder to explain | Useful later for a separately validated research question | More documents or differently split claims can distort apparent quality |
| Response present/absent only | Cheapest explanation and simplest count | Hides context and delivery detail | Useful as the coverage summary beside four bands | Binary cells conceal material differences and processing uncertainty |

No option can infer real climate outcomes from policy text alone. The recommended system tracks what the supplied documents substantiate.

## 7. Rollout without a production review queue

1. Integrate bundle loading and the record/schema migration while preserving existing results.
2. Implement pooling, identity reconciliation, bounded processing and automatic snapshots.
3. Implement deterministic band rules and the P/A/U calculations.
4. Add the dashboard views and settings controls.
5. Run automated fixtures covering duplicate discoveries, conflicting targets, conditional targets, missing actors/dates/deliverables, multilingual quotations, unreadable pages and out-of-order jobs. Compare extraction/grouping quality and cost against the existing pipeline on the same inputs.
6. Activate a versioned release with rollback to the previous bundle and snapshots. Automatically publish valid results and visible incomplete states; late successes publish a newer snapshot.

Fixtures and automated integrity checks are development checks, not manual moderation of country outputs. There is no required human review or validation step before dashboard publication. Users can inspect sources, flag mistakes or hide items after publication.

See [SCORING.md](SCORING.md) for the full band rules, [DASHBOARD.md](DASHBOARD.md) for visuals, [PROCESS.md](PROCESS.md) for the process and [CURRENT-PIPELINE.md](CURRENT-PIPELINE.md) for the unchanged runtime audit.
