# Engineering design

Recommended specification v2.0.0; a target contract, not active application behavior. The existing Next.js/Prisma/SQLite/worker/OpenAI architecture stays. No new vector database or autonomous agent framework is needed.

## One authority for editable configuration

An immutable ConfigBundle contains taxonomy, labels, prompt text, output-contract version, model/retrieval settings and scoring. Each run references its bundle. The UI edits a draft, validates it automatically and creates a new version; exports reproduce that same version. Files must not silently compete with database edits.

Portable layout: `config/{bundle,taxonomy,labels,pipeline,scoring}.json` and `prompts/{extract,organize,retag}.md`. In this review pack these are proposed contents. Today the active prompt is still `src/lib/analysis/prompt.ts`, taxonomy is database-backed and output schemas are code. RUNTIME-INPUTS.md is the source map.

Derive topic and label enums from the bundle when building strict structured outputs. Keep the shapes in `src/lib/analysis/schemas.ts`; do not maintain a second handwritten enum list. DATA-DICTIONARY.md is the proposed field contract, while runtime-reference includes today's actual schemas. Updating prompt text alone cannot activate new fields.

## Persistent evidence before synthesis

Store Document, Evidence and atomic Record independently from Claim/ClaimVariant/ClaimMember. Relationships connect assertions without destroying them. TopicCoverage records what was processed. Snapshot freezes document, record, claim, bundle and coverage versions; UserOverlay stores later display choices.

LLMs return temporary references and source wording, not persistent IDs. Code resolves IDs. Evidence has original quote, physical page, document ID and source-check state. Record field_evidence uses JSON Pointer paths; every factual qualifier needs support. Keep raw outputs separately for diagnosis. Do not store credentials in bundles or exports.

Use one country-scoped policy_object_id for a particular proposition/intervention, not a whole sector or broad programme. Same programme names help candidate matching but cannot combine an unrelated actor, deadline and deliverable. A claim's variants share an identity while preserving incompatible values or interpretations. Evidence admitted to a coherent variant includes its assertion and compatible detail sources; detail citations must be a subset of those admitted IDs.

## Stage 1: extraction and routing

Unit: document × domain/query bundle. Default retrieval is limited to document_id, with logged search calls and pages. Supply a compact global topic catalogue plus detailed current and adjacent definitions; do not constrain primary_topic_id to the queried domain. Measure a reduced-context version against full definitions before using it.

Capture source statement, topic, type, enabled facets, quantitative facts and comparability dimensions. Actor/timeframe/deliverable details must belong to the same assertion. Preserve conditional pathways, total/additional distinctions and finance statuses. Do not infer climate purpose merely from the document title, adoption from official styling, implementation from allocation, or causation from a reported effect.

Check schema/IDs/quotes/numbers in code. Optional targeted semantic repair can clarify association but is still fallible. Bound repair attempts. Invalid evidence creates limitations and cannot qualify a band; no human queue is introduced.

## Code pooling and Stage 2

Pool by assigned topic's home across all extraction questions and documents. Deduplicate repeat discovery only when document/span AND proposition match. Topic conflicts need bounded retagging or explicit unresolved routing. A shared quote can support different valid records.

Owned records appear in one primary-topic pack. Context-only records can support relationships in another pack, never second ownership. Direct substantive secondary-topic evidence may support that topic's band; a cross-domain display placement alone cannot. The comparison denominator counts each home topic once.

Stage 2 receives short quotes, qualifiers, IDs, source metadata and identity candidates. It returns claim memberships, variants, links and retained unclassified records. It does not calculate scores, source stages, counts or confidence. Separate target/context/action claims remain linkable.

Overflow splits by topic and policy object, with a directory of potential boundary candidates. Reconcile cross-partition candidates within Stage 2. Every owned eligible record must be accounted for exactly once; every link resolves. Skipped reconciliation makes affected coverage partial. Singleton bypass is deferred until evaluation proves there is no relevant identity/link candidate anywhere in scope; one record in one topic alone is not enough.

## Contradictions and history

For numeric contradictions check metric, compatible units, geographic/population/system scope, period, baseline/denominator when relevant, scenario and conditionality. Different pathways or dates may be complementary. Missing essential dimensions means insufficient_detail. Preserve both assertions and never average incompatible numbers.

Explicit supersession is a source-supported relationship. Date order, document family and non-repetition are insufficient. Document views are calculated with only their own evidence. Combined country views retain separate source assertion stages; no historical maximum stage is propagated backward.

## Scoring contract

Use the four-band rules in config/scoring.json. The standalone reference calculator accepts normalized source-checked evidence and coherent variants. It verifies identifiers/enums/coherence; it does not perform OCR, quote verification or semantic interpretation.

Response types are commitment, planned_action, implementation_underway and output_delivered. Relevant context, concerns, projections, proposals and reported effects alone are band 1. Band 3 needs actor + action timeframe + specific verifiable deliverable for the same response. Quantification is optional when a named instrument/asset/milestone makes the output testable.

Unresolved variant lower=min and upper=max. Topic lower=max claim lower; upper=max claim upper if processing complete, otherwise 3. Empty incomplete topics display unavailable; internal lower 0 is only a bound. Empty complete search displays band 0. These are ordinal classifications, never numeric performance measurements.

For a fixed set of home topics: P=lower≥2; A=complete and upper<2; U=remaining. Response coverage spans 100P/N to 100(P+U)/N, N=P+A+U. Count processing completeness separately. No country composite, mean ordinal rank or z-score is enabled. Show response/detail-ready counts to reveal the limits of a topic's best-evidence band.

## Publication and failure handling

One country-update state machine coordinates stages and accounting. A snapshot publishes atomically when jobs finish or a configured deadline arrives. Failures publish explicit coverage limitations alongside usable evidence. Later successful jobs automatically create a newer snapshot unless their input bundle has been superseded. Keep prior published results visible while refreshing, with date/method labels.

Required unreadable material makes its affected topic scope incomplete; unknown topic impact means the full required scope. A valid established response remains positive even if another document fails. Missing source-role profile and incomplete processing are distinct: all supplied PDFs may process successfully while an expected NAP is absent.

Post-publication flags/hides are overlays, with actor/reason/time/claim-version and recoverable originals. Presentation hiding does not silently change comparison values. An explicitly excluded analytical view is a separate labelled adjusted snapshot.

## Incremental cost and observability

Cache keys include source/record hash, prompt hash, taxonomy and labels semantic hashes, schema version, model and parameters, retrieval settings. Display metadata is excluded from semantic invalidation. New documents trigger their own extraction and affected organization packs plus linked neighbors. Scoring-only updates need no LLM if necessary fields already exist.

Maintain one persisted country-update allowance. Reserve estimated cost before dispatch; reconcile actual usage; include tool calls, both stages, retries, overflow and repairs. Do not reset the allowance in each subjob. Track storage separately. Limit search calls as well as search results; these are different controls.

Record actual input/output/cached tokens, billable tool calls, pages supplied, unreadable pages, missing topics, unresolved records/links, repair attempts and cost per update. No model confidence percentage. Optional batch execution handles supported offline work; dependent Stage 2 begins after Stage 1. Token/deadline defaults in pipeline.json are unmeasured starting settings.

## Editable UI and regeneration

Settings tabs: Taxonomy, Labels, Prompts, Pipeline, Scoring, Versions. Show descriptions and exact choices, validate unknown IDs/orphaned topics, prevent reused semantic IDs, and preview change impact. Keep stable topic codes. Semantic splits/merges require lineage and an explicit common comparison profile.

Display edit → render only. Semantic label/topic edit → affected retagging, and new source search if scope expands. Extraction prompt/model edit → new method and affected extraction. Organization prompt edit → reuse records and regroup. Scoring edit → recalculate snapshots. User hide/flag → overlay only. There is no per-result human acceptance stage.

## Verification boundary

Reference fixtures test deterministic scoring and pathological inputs. Source/schema/accounting fixtures test adapter correctness during implementation. LLM evaluation must separately measure source fidelity, missed evidence, routing, merge/split accuracy, false contradictions, cost and latency against fixed representative material, including multilingual and scanned/table-heavy cases. Automated regression checks before a software release are different from requiring human moderation before each result.

This pack does not claim production accuracy, zero hallucination or measured cost improvement. It makes the method and remaining application work explicit.
