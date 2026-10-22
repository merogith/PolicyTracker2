# Dashboard and scoring — current implementation

Updated 20 October 2026. This is the current UI and score guide. It supersedes the display and scoring proposal in `UI-REFINEMENT-2026-10-20.md`; older review PDFs and ZIPs are historical proposals, not runtime configuration.

## Regional standardization — current method

The normalized display now uses **Standardized regional score**, replacing both the earlier maximum-based scale and the rank percentile:

`z = (raw value − regional mean) / population standard deviation`

`standardized score = 100 × Φ(z)`

Here Φ is the standard normal cumulative distribution function. A raw value equal to the regional mean maps to 50; −1/+1 SD maps to 15.9/84.1; −2/+2 SD maps to 2.3/97.7. The scale is bounded by 0 and 100. This is a standardized comparison, not an observed percentile or an implementation percentage. Nearby raw values receive nearby scores; differences near the ends are compressed, and extreme totals still affect the reference mean and SD.

Country totals use regional country totals; domains and topics use their own same-domain or same-topic regional reference. Every eligible country has equal weight. Only complete, non-demo assessments enter the reference or receive a standardized score; at least two are required. Equal totals, including all-zero totals, receive 50 by convention because there is no spread. Incomplete or unavailable comparisons show a dash. Display and source-profile filters do not recalculate the full-region reference.

Raw claim points remain visible alongside standardized scores. Colors use the same raw population-SD bands at −2, −1, +1 and +2 SD. In normalized charts, the raw regional average is shown at 50 (the arithmetic average of transformed scores need not equal 50). Small country groups produce sensitive comparisons. Standardization does not assign country-specific domain importance.

The shared method is versioned as `regional-normal-cdf-v1`; newly generated exports include its version and explanation. Historical report snapshots retain their original export metadata.

## Three words to use consistently

| Term | Meaning | Example |
|---|---|---|
| Claim | A grouped statement extracted from the supplied documents | “Drought threatens food security.” |
| Action claim | A claim describing a commitment, plan, or reported implementation | “The ministry plans to rehabilitate canals.” |
| Coverage | Topics with at least one extracted claim / all active home topics | 48 of 64 topics = 75% |

Action claims are a subset of claims, not an additional category to add to the total. “Response” is no longer a dashboard metric. Counts are provisional: the existing grouping joins findings sharing quotations. National groups are deduplicated; domain and topic counts can overlap.

## A score that works with the available records

**Average action stage** replaces the highest-claim topic documentation score. It averages the reported stages of distinct action claims tagged to a topic, on a 0–100 display scale. Claim-point sums, action filters and other KPIs keep their existing behavior.

| Claim stage | Claim points | Action-stage value |
|---|---:|---:|
| Commitment | 1 | 25 |
| Planned action | 2 | 50 |
| Implementation underway | 3 | 75 |
| Output delivered | 4 | 100 |

The shared point mapping comes from `config/labels.json`. Each distinct grouped claim counts once within the topic, using only its topic-tagged members. Only claims with a resolved stage and matched source evidence enter the average; conflicting or unmatched claims make the result provisional. Context and other non-action claims are excluded from the denominator.

**Topic score = action-claim points ÷ action claims × 25.** Ten commitments and one delivered claim give `14 / 11 × 25 = 31.8/100`; one commitment and ten delivered claims give `41 / 11 × 25 = 93.2/100`. Both previously received 4/4.

**Domain and country score = equal-weight mean of scored home topics.** Each eligible topic with an action-stage score counts once. A completed topic with no action claims shows **No action documented** and stays outside the numerical average; it is counted separately in the distribution. Unassessed topics also stay outside the average. The separate coverage metric retains the full enabled topic inventory.

Partial results are **provisional averages**, not minimums or bounds: adding claims can raise or lower them. Partial and demo results never enter regional benchmarks. The distribution uses numeric topic-score bands (25–<50, 50–<75, 75–<100, 100), plus No action documented and Not assessed.

Topic, domain and country views all display /100. The metric describes reported stages, not independently verified delivery or policy quality. Saved reports derive this metric from their own frozen claims when viewed; their stored snapshots, original exports and other saved KPIs remain unchanged. Newly generated exports include the versioned topic-documentation rubric, `average-action-stage-v1`.

The earlier four-check specificity score (response, actor, timeframe, output) remains an unimplemented proposal. It is not secretly inferred from legacy prose and must not be compared with this new documentation index. The older −1/0/+1 backend rubric is also not the headline score.

## Screen order

1. **Regional overview:** claim count; implementation reports; context-only topics; prominent country scores; stage distribution; topics to follow up. Definitions are collapsed. Duplicate country cards were removed.
2. **Compare:** **Claim points / Average action stage / Claims / Action claims / Topic coverage**, with a separate Raw / Standardized (0–100) switch for score and counts. Actions count unique groups with selected claim stages (default 1–4). Standardized scores use the normal-CDF method above. Raw values remain visible, and normalized values use raw regional SD color bands. Cells link to the relevant country/domain.
3. **Claims, Targets and Reported figures:** the regional Claims tab searches unique country claim groups, including their quotes, with country/domain/stage filters, pagination and CSV export. Country Claims uses the same explorer scoped to that country. Reported figures has its own regional and country tab. Targets has an explicit unavailable-label state: the runtime does not yet extract the original target/observation/projection/finance/indicator categories. No keyword-based target labels are fabricated.
4. **Regional average / country Regional position:** default to all complete non-demo countries, with raw values, standardized scores and differences from the equal-country average. Domain/topic selection is available. Optional matching-source filtering changes the displayed group and its average; standardization and SD colors still use the full region. The country profile highlights the selected country. At least two eligible countries are required. Matrix cells also describe their distance from the raw regional average in SD.
5. **Country overview:** score first, editable action counts, normalization and compact domain cards. Reported figures and Regional position have dedicated tabs. Documents & processing lives under Documents.
6. **Domain/topic:** average action stage /100, all-claim and action-claim counts, expandable original quotations. Individual claims retain their existing stage labels and point values.

## Real files to edit

| Purpose | Active file |
|---|---|
| Score version and aggregation rule | `config/scoring/documentation.json` |
| Shared claim-stage point mapping | `config/labels.json` |
| Pure scoring rules | `src/lib/documentation-stage.ts` |
| Source/topic attribution and dashboard aggregation | `src/lib/documentation-score.ts` |
| Shared country cards, explanations, metric names | `src/components/charts/documentation-dashboard.tsx` |
| Regional views | `src/app/countries/page.tsx`, `src/components/regional-dashboard.tsx` |
| Comparison matrix | `src/components/charts/country-matrix.tsx` |
| Targets search and CSV | `src/components/regional-figures.tsx` |
| Topic drill-down | `src/components/domains-view.tsx` |
| Regional comparison math | `src/lib/regional-dashboard.ts` |

Change the rubric version when changing point meanings, and recompute comparisons consistently. Display labels are editable; stage points must stay within the 0–4 method. No LLM reads this document: requests still use the existing explicit prompt/schema construction.

## Connection error: cause and repair

The local Node runtime reproduced `UNABLE_TO_VERIFY_LEAF_SIGNATURE` when reaching the API. Using the Windows trust store resolved it. `src/lib/network.ts` now adds system-trusted CA certificates to the existing Node trust roots before constructing the OpenAI client. TLS verification remains enabled. Node 22.19+ or 24.5+ supports the required APIs; Node 24 is recommended here. This follows the [Node TLS API](https://nodejs.org/api/tls.html#tlssetdefaultcacertificatescerts).

`src/worker/index.ts` records useful TLS/network errors rather than only “Connection error.” To check connectivity without a model call, run `node --import tsx scripts/check-connection.ts`. The repaired connection passed authenticated API access. The idle worker was restarted; cancelled Türkiye jobs were left cancelled. The subsequently supplied KAZ-NDC2 indexed 19 pages and began normal domain analysis successfully.

## Verification

- 68 unit tests passed, including stage attribution, duplicate invariance, missing-data handling and safe connection errors.
- TypeScript and targeted lint passed; final checks cover the small subsequent UI and provisional-score corrections.
- Browser checks: populated country and regional scores, Health topic levels, comparison matrix, Targets rename/search, regional benchmark eligibility.
- OCR is still deferred. No cancelled job was requeued, no document was reprocessed for scoring, and no migration or prompt/model change was needed. User-queued document processing continues normally.

Limit: no production build or exhaustive device/accessibility audit was performed. Existing grouping and LLM label accuracy remain limitations; the index is deliberately transparent about these.

[Screenshot of the simplified regional dashboard](../output/ui/regional-dashboard-simplified-2026-10-20.png). Values can change while a user-queued document analysis is in progress.

## Label taxonomy audit — 20 October 2026

**Update after the audit:** the user selected the full catalogue. `config/labels.json` now activates all eight facet families. The extraction schema and prompt require evidence-linked classification; country views resolve it from source findings. Claims supports categorical filtering, grouping and sorting, and Targets uses structured fact types. The original diagnosis below describes the pre-repair state. Recovery of existing labels is a separate, resumable operation (`npm run refresh:labels`); its report states what actually completed.

**Recovery completed on 20 October 2026:** 591 of 599 document findings were classified; 8 without matched quotations remain unclassified. All eight facet families have recovered labels. Country views retain 413 claims, with complete labels on 406 and missing or partial labels on 7. Targets contains 52 Kazakhstan claims and 59 Türkiye claims. Every recovered classification passed the source-reference and exact-value checks; all original output fields in the 64 document results match the pre-recovery snapshot. The worker was reloaded with prompt `2026-10-20.4`. Detailed counts and the integrity check are in `output/claim-labels/verification.json`. These are automatic grounding checks, not proof of every semantic label decision.

The domain/topic taxonomy is active, but the richer labeling system is disconnected from the runtime. `fresh-start/config/vocabulary.json` contains the earlier detailed vocabulary; `docs/review/pipeline/labels.json` and `llm-contracts.json` contain the v3 review baseline. Those files are not imported by the active extraction schema or prompt builders. The v3 baseline explicitly marks purpose, hazards, geographic scope and policy instruments as core enabled facets; themes, affected groups, risk component and risk function are optional modules. Their activation must follow the accepted methodology rather than silently enabling every draft field.

A read-only database audit found 64 completed document results with 599 findings: all had only text, kind, figures, topic_ids, unmapped_concepts and citations. The 32 completed country results contained 523 findings before shared-quote grouping. Neither scope contained structured statement_type, labels or facts. The current 16 enabled domains and 64 topics are retained. The archived runtime snapshot already has the same six-kind enum, so the gap predates these UI changes; no Git history is available here to date the original divergence.

Restoration requires a versioned runtime label contract, automatic evidence-grounded validation, preservation through country organization and a source-evidenced backfill. Topic-only retagging cannot recreate missing facts. Distinguish statement type, policy facets, fact role and derived response stage; do not map old concern/commitment/delivered values to lost types by assumption. No extraction reruns or paid model calls were started for this audit.
