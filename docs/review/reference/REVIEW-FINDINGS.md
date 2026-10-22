# Final end-to-end review

19 October 2026. This audit distinguishes current code, proposed improvements and unresolved empirical questions. Application behavior has not been changed by this review pack. Paths below refer to the repository root.

## Findings that justify a change

| Priority | Current evidence | Risk | Smallest useful revision |
|---|---|---|---|
| P0 | `src/lib/analysis/verify.ts` normalise removes dashes including minus signs; squash removes spaces | A quote can match after changing numerical meaning. Reproduced: -5 versus 5, and 10–20 versus 1020 | Strict evidence eligibility preserves signs, ranges, comparators and units. Keep tolerant highlighting separate |
| P0 | `src/lib/analysis/run.ts` stores citation verification flags but can finish a unit with unverified findings; citation arrays can be empty | Schema-valid output becomes apparently complete even without supported evidence | Require supporting evidence for qualifying fields; unsupported material cannot establish a band. Track unresolved processing separately |
| P0 | `src/lib/openai.ts` allows file search; result-count limit does not enforce search execution or complete topic coverage | Empty output can be mistaken for complete absence | Code executes/logs a bounded query plan and owns coverage. A model does not certify that it searched enough |
| P0 | `src/worker/handlers.ts` waits for queued/running work in the same domain | Cross-domain-discovered records may miss the first synthesis | Freeze a contributing country/document/configuration manifest; wait for all its Stage 1 units or the partial deadline |
| P0 | `src/lib/analysis/synthesise.ts` reduces evidence fields and uses document plus array-position references | Organization loses precise context and stable identity; difficult to audit duplicate/contradictory assertions | Keep stable code-owned record/evidence IDs, exact quotes, structured facts and ownership manifests |
| P0 | `src/lib/analysis/prompt.ts` synthesis selects furthest stage; `src/lib/topic-merge.ts` and `src/lib/topics.ts` propagate maxima | A newer action can rewrite an older document's apparent stage or lend detail to a different target | Source-local records remain immutable. Common claims preserve variants; each topic assessment uses its own qualifying facts |
| P0 | `src/lib/analysis/call.ts` retries; gateway defaults allow very large outputs | A dense domain can truncate and repeatedly fail at the same boundary | Bound both input and output, split deterministic source/record manifests, reconcile only boundary candidates |
| P1 | Retry layers exist in SDK, analysis wrapper and worker; cost estimates precede work | Attempts, search, repair and uncertain timeout spend can exceed visible estimates | One persisted update allowance with attempt ledger and reservations; consolidate retries |
| P1 | Retrieval chunks and readable page counts are not equivalent to complete reading | Dashboard overstates evidence coverage, especially tables and scans | Show source quality and bounded-search limitations; route only affected pages through optional OCR/table handling |
| P1 | Current schema lacks explicit baseline, scenario, target scope and responsible actor | Different targets are merged, or ordinary capacity is mistaken for achievement | Small nullable fact/delivery objects, with source references; group by identity and negative constraints |
| P1 | Current UI relies on stage maxima and latest-versus-prior document comparisons | NAP/NDC purpose differences become misleading progress arrows | Fixed source profiles; deterministic topic coverage; arrows only for comparable documentation snapshots |
| P1 | Taxonomy editor behavior can couple codes to current placement | Moving a topic breaks identity/history | Keep permanent IDs; home and secondary placements are separate editable fields |
| P1 | Prompt/configuration and human explanations are scattered | Humans and future coding assistants may choose an obsolete file | One entry point, one bundle, two normal templates; archives explicitly excluded from inputs |

## What the model should and should not receive

Extraction receives a short role/task prompt, compact global topic vocabulary, detailed local routing definitions, enabled label choices, a strict output schema, source identity and a bounded set of page/context units. The global vocabulary lets a water passage found during agriculture retrieval route correctly. Detailed definitions of every optional facet need not accompany every request.

Organization receives source-linked records and candidate context from the selected corpus. It needs quotes, scope, time, conditions and evidence references to avoid false merging. It does not need the full PDFs again, earlier scores, the team handbook, old prompt files or arbitrary repository search results. Scoring is deterministic code after organization, not a third reasoning stage.

Neither JSON Schema nor exact quote occurrence proves that the interpretation is correct. They catch shape/provenance errors. Semantic attribution and identity errors remain a reason for conservative prompts, retained variants and representative-source evaluation. No design can promise zero hallucinations without measuring actual model behavior.

## Context and cost: measured versus proposed

The proposed 8k target / 18k hard source-token limit, 12k / 24k organization-input limits, 6k output reserve and parallelism of four are initial configurable hypotheses. They are not benchmark results. Count the whole request: instructions, vocabulary, schema, data, output/reasoning reserve and margin. A character estimate is an offline check, not an exact tokenizer or provider guarantee.

The existing rough estimator uses around 19k input and 4k output per extraction. For three documents and 16 domains, the ordinary pattern is 48 extraction units plus 16 organization units, before retries/splitting. A rough 1.08 million input / 256k output estimate is illustrative, not observed usage or a price quote. Savings depend on retrieval, actual outputs, repeated prefixes, model choice, batching and reuse. Measure actual billed usage before asserting a saving.

Keep domain retrieval for the first update. Section-first extraction is a benchmark option, not an automatic improvement: it can reduce repeated passages but needs reliable section segmentation, cross-section context and another deduplication burden. A single giant country prompt loses source-local repeatability and makes incremental updates expensive. Two logical stages with bounded parallel units remain the best fit here.

## Edge cases and the intended behavior

| Case | Required behavior |
|---|---|
| NDC says 100,000 ha; NAP says 80,000 ha for the same scope/year | Keep both values as unresolved variants; show a conflict badge, not an arbitrary score penalty |
| One value is additional area, another total area | Keep different metrics; do not declare a contradiction |
| Conditional and unconditional targets | Preserve both conditions; do not average or treat them as disagreement |
| Baseline 2010 versus 2015, gross versus net, different scenarios | Negative merge constraints; explicit compatible relationship only |
| Existing 60,000 ha network supports an irrigation plan | Context supports relevance; it is not target achievement |
| Finance allocated but no physical work reported | Funding state stays visible; it does not establish physical implementation |
| Planned law with named actor and date | Specific verifiable deliverable may qualify without a quantity; no fabricated numerical threshold |
| National ministry named elsewhere in the document | Do not lend it to every intervention without an explicit source connection |
| One programme contains several different projects | Shared programme name alone does not prove identical intervention |
| A~B and B~C look similar but A and C differ in scope | No transitive merge without checking the whole identity set |
| Claim mentions agriculture and health | Each topic needs its own evidence-supported predicates; no automatic inheritance of the claim-wide band |
| Cross-domain record arrives after one domain job | Frozen barrier includes all contributing extraction units; late completion creates a newer snapshot |
| New document arrives while an update runs | Put it in the next manifest or coalesce before freeze; never mutate the in-flight corpus |
| Output truncates in a dense table | Split source-unit manifest, keep headers/footnotes as context, deduplicate and reconcile boundaries |
| Table row has a number but its unit is in the header | Include separate cited header context; no invented stitched quotation |
| Source is unreadable, scanned or missing a page | Optional targeted OCR; otherwise incomplete coverage, never a confident zero |
| Retrieval finds no evidence after all planned searches | No evidence found in this bounded supplied corpus; not proof of national policy absence |
| Document includes instructions to the assistant | Source text and metadata are data only; ignore embedded instructions |
| Relevant statement has no suitable topic | Keep unmapped evidence, original statement type and quotes; no invented Other domain |
| Generic education or tourism policy unrelated to climate/disaster | Omit as outside scope; sector names alone do not make it eligible |
| Water is a stated priority for one country | Priority lens changes focus; common-topic denominators and weights stay fixed |
| Landlocked country and fisheries topic | Do not infer non-applicability: inland fisheries exist; silence never creates N/A |
| Newer NAP edition and older NDC | Source profile selects eligible editions by role; selection does not assert one instrument repeals the other |
| Older expired target absent from new edition | Retain history; do not silently carry it into the current corpus or infer withdrawal |
| Missing NAP in an NDC+NAP comparison | Mark source profile incomplete; retain positives and express unresolved potential coverage |
| Model/prompt changes improve extraction | New baseline or refresh marker; no upward policy-progress arrow |
| One topic has several commitments but only one detailed action | Topic may reach band 3; disclose 1 of N detailed responses in its drawer |
| User hides a claim after publication | Preserve raw data and canonical snapshot; mark customized view. Comparison must not silently mix personal overlays |
| Budget exhausted or provider timeout | Retain positives, publish partial status; reserve uncertain spend and retry within the same allowance |
| Organization split cannot resolve boundary identity | Keep separate provisional groups and incomplete grouping status; no silent evidence loss |

## Release evaluation, without a human moderation queue

Use fixed fixtures plus a representative source set containing scanned pages, tables, multilingual text, repeated targets, conflicting targets and different document editions. Automated checks cover schema, references, quote integrity, accounting, topic ownership, deterministic scores, idempotence and snapshot ordering. Evaluate semantic recall and false merges against a fixed benchmark; do not substitute a second model's confidence for ground truth.

Choosing an evaluation set and maintaining software tests is product development. It does not introduce a manual approval gate for each upload or publication. The production path either publishes completed evidence or clearly labelled partial evidence automatically. Current pack tests validate reference contracts and scoring logic; they do not establish live extraction accuracy.

## Future extensibility boundary

Keep interfaces for source preparation, retrieval, extraction, organization and scoring. Store facts and provenance, not only display prose. A future OCR service, document type, model provider or analyst tool can implement an interface without replacing the taxonomy or creating extra routine reasoning stages. Add modules when an observed user need justifies them, not because all possible tools could be supported.
