# Final upgrade plan: complete evidence, clear comparison

20 October 2026 | Review plan 4.2 | Ready for the user's implementation decision; not an activated migration.

This is the controlling upgrade plan. It combines the comprehensive pipeline handoff with the dashboard the user liked. Preserve presentation 4.1, scoring method 4.0 and the 16-domain / 64-topic taxonomy. Replace selective domain retrieval with systematic source-packet extraction. The older v3 machine files are reference contracts to revise during implementation, not the final runtime configuration.

## 1. Decisions to carry forward

- One run can process one document, selected documents, one country or the whole collection. Process countries sequentially, initially with two shared model-request slots inside a country.
- Process every selected source unit within the climate/disaster scope, including historical editions, sectoral plans, supplements and annexes. No application count quota may silently remove evidence.
- Keep two principal model tasks: extract source statements, then organize common claims. Pooling, scoring and publication use code. OCR, omission checks and repairs are conditional supporting work.
- Publish automatically. No manual labeling, validation or acceptance queue is introduced. Users can inspect, flag, hide and restore afterward.
- Retain the approved UNDP-inspired dashboard: Country, Region and Documents as primary navigation; overview, domain topics and claim evidence as progressive detail.
- Scores describe documented response detail and topic coverage. Implementation, reported results, conditions and disagreements remain separate facts.

The corpus audit reports 42 PDFs and 2,670 pages across 17 populated country folders. These are an initial inventory, not permanent limits. The companion audit reports a successful live retrieval test for one domain; it does not establish complete extraction or OCR accuracy. No new live run was performed to prepare this plan.

## 2. End-to-end process

```text
Choose source scope and start one run
  -> Freeze source versions and method configuration
  -> Prepare every page: native text, layout, targeted OCR/vision
  -> LLM 1: extract statements, titles, topics, labels and evidence
  -> Code checks + targeted omission checks/repairs
  -> Store immutable records; pool by assigned topic and identity
  -> LLM 2: common claims, variants and supported relationships
  -> Code checks, source-scoped scores/counts, atomic publication
  -> Continue to next country; retain resumable outstanding work
```

**Preparation:** preserve the original PDF and its hash. Build a page and region inventory before excluding anything. Keep paragraphs, list items, table groups, captions and footnotes as source units, with physical page numbers and necessary structural context. A readable heading does not establish that the rest of a page was readable.

**Extraction:** assign each source unit one owner. Adjacent context may be supplied elsewhere without gaining duplicate ownership. LLM 1 reads all owned units across all topics and returns atomic statements, clear English titles, original-language evidence and supported labels. An action retains its actor, timeframe and conditions together; these do not become separate claims simply because they are separate fields.

**Checking:** every unit receives an extracted, no-relevant-assertion or unresolved disposition. Validate schema, source references, numerical meaning and factual attribution. Exact quotation occurrence is necessary for text grounding but does not prove correct interpretation. Sample successful packets as well as flagged ones, including empty results; do not invent a semantic recall percentage.

**Organization:** pool records from all selected documents by their assigned primary topics. Use stable identifiers, structured matches and semantic neighbors to find candidates. Keep topic ownership consistent even when several small topics fit one request. Reconcile cross-pack identities and relationships. Similarity or a shared quotation alone never proves identity.

**Publication:** a frozen source selection determines each assessment. Preserve the last complete snapshot while a new one runs; display partial new evidence distinctly. Store snapshots atomically with a generation check so an older run cannot overwrite a newer one. Processing/accounting completion, unresolved material and missing national source roles are separate statuses.

Search indexing runs alongside preparation for later questions and discovery. It is not the gate through which extraction must pass, and an indexing outage should not stop otherwise usable extraction. Exhaustive lists and exports query the stored ledger, never a top-k search result.

## 3. OCR: local first, targeted recovery

**Recommended stack: keep PDF.js, add local Tesseract 5 in the background worker, and use an image-capable model only for unresolved substantive regions.** This requires a pinned OCR binary and language data in deployment, not a permanent OCR service or a human step for each document. Tesseract was not found on the current command path; installation and deployment packaging remain implementation work.

| Source condition | Automatic route | What is retained |
|---|---|---|
| Usable digital text | Read native text and positions with PDF.js | Original text, page, spans and coordinates |
| Scanned or garbled text | Render the page/crop; run local Tesseract | Original-language transcript, word boxes and OCR diagnostics |
| Mixed page: text plus scanned table | Retain native text; OCR only the inaccessible region | Both regions, without duplicating their text |
| Table structure remains unclear | Targeted image recovery with headers, adjacent rows and footnotes | Structured cells/associations and the source crop |
| Chart or diagram | Inspect the relevant rendered region, including vector-drawn figures | Readable labels/annotations and supported qualitative interpretation |
| Recovery still ambiguous | Retain the source and unresolved status | Evidence can be inspected; affected scores remain unavailable |

**Local pass.** Render selected pages or crops initially at about 300 dpi. Preserve original bytes; rotation, deskew and contrast adjustments affect derivatives only. Select language packs using document metadata and detected text/script, with an explicit unknown state. A country name does not determine document language. Use the actual languages in the corpus plus English as needed; do not load every language into every OCR request. Tesseract supports multilingual recognition and TSV/hOCR with word positions and confidence. [Output formats](https://tesseract-ocr.github.io/tessdoc/Command-Line-Usage.html), [language data](https://tesseract-ocr.github.io/tessdoc/Data-Files-in-different-versions.html)

**Layout handling.** OCR reads characters; it does not by itself establish a table's policy meaning. Reconstruct reliable rows and columns from positions, preserving headers, merged-cell scope, units and footnotes. Join cross-page tables only with explicit continuation context and separate page evidence. Use a targeted rendered-region call when associations remain uncertain. Tesseract's own documentation identifies table-recognition limitations and recommends adequate resolution and deskewing. [Quality guidance](https://tesseract-ocr.github.io/tessdoc/ImproveQuality.html)

**Bounded fallback.** Permit one local OCR retry using a better crop, corrected orientation, segmentation or language model. Then permit one configured image-model recovery attempt for unresolved substantive content. Return transcription, table structure and limitations, not scores or invented facts. A larger image may be tiled with overlap and reconciled; pixel limits divide work rather than cropping away evidence. Bound CPU concurrency separately from model requests, initially one OCR job at a time.

**Preserve uncertainty.** OCR confidence is a diagnostic, not a truth score. Matching a quote against its own OCR transcript does not verify the original image. Material disagreements such as 80,000 versus 100,000 remain unresolved unless recoverable from the source. Do not read precise numerical values from unlabelled bar heights. Vision-derived qualitative interpretations must be identified as such and linked to a crop, not presented as invented verbatim quotations. If only a region is located reliably, highlight that region rather than manufacturing word boxes.

**Evidence storage.** Save physical page, printed page label, crop rectangle, native/OCR/vision method, raw transcript, normalized offset mapping, parser/OCR/model versions, language/settings and check status. Store the transform between PDF coordinates and rendered pixel coordinates, including page rotation. Cache recovery by document hash, region, context and processing configuration. The evidence viewer opens the untouched original page with a method badge and the cited transcript. [PDF.js rendering coordinates](https://mozilla.github.io/pdf.js/examples/index.html)

**Example:** a 100-page NAP has 92 pages of usable digital text, six scanned pages and two mixed pages containing image tables. Read the digital text directly, OCR the six pages and two table regions, then use image recovery only where meaning remains inaccessible. Everything recovered enters the same extraction stage. If one table stays unreadable, publish the usable evidence with that unresolved region visible; do not convert it to no-policy evidence.

OCRmyPDF can be added later for downloadable searchable derivative PDFs. It is not required for source extraction and coordinates. Page-wide skip-text behavior is unsuitable as the sole mixed-page detector. [OCRmyPDF processing modes](https://ocrmypdf.readthedocs.io/en/latest/advanced.html)

## 4. Model inputs, prompts and initial settings

| Task | Receives | Returns |
|---|---|---|
| Extract | Compact global topic catalogue, enabled labels, strict schema, one document's owned units and necessary context | Source statements, titles, evidence, factual details and unit accounting |
| Organize | Owned records, relevant read-only neighbors, exact evidence, source metadata and prior identity candidates | Claim titles/descriptions, variants, member IDs, relationships and retained unresolved records |
| Recover, only when needed | Specific failed units/records, original evidence or relevant image crops, and explicit errors | Bounded corrections, missed assertions or structured transcription with limitations |

Keep two normal prompt files and one conditional recovery file with explicit modes and separate strict output schemas. OCR transcription is a recovery mode; it is not a third routine policy-analysis stage. Maintenance retagging remains optional. Models never read team documents, archives, old scores, arbitrary folders or credentials. Source text and metadata are untrusted data.

Titles are display text, never identity keys. Ground a claim title/description only in its member records or explicitly associated details. Preserve conditions and reported status; repair a bad title or temporarily use its full grounded statement. Facts remain in immutable source records; Stage 2 returns references instead of rewriting them.

| Setting | Initial choice |
|---|---|
| Countries / model requests | 1 country / 2 concurrent requests shared across stages and recovery |
| Narrative / dense owned text | 4,000 / 2,000 tokens; adapt to structure and output density |
| Neighbor context | About 400 tokens; required headers/qualifiers remain intact |
| Prepared source split threshold | 8,000 tokens including context; prompt/schema are additional |
| Extraction output reservation | 16,000 tokens, including reasoning where counted there |
| Organization input | Target 12,000 tokens; split around 24,000 |
| Organization output reservation | 12,000 tokens |
| Full request safety margin | 10%, at least 2,000 tokens; use provider token counting/limits |
| Models | Luna low for extraction, medium for organization; stronger targeted recovery configurable |
| Omission audit | Flagged packets plus 10% of successful packets per document, at least one when nonempty |
| Q&A search / overlap | Initial 800 / 100 token indexing; extraction is independent |

These are trial settings, not measured optima. Official model documentation supports the needed structured-output and image-input capabilities; suitability still requires automatic regression checks. [Luna model](https://developers.openai.com/api/docs/models/gpt-6-luna)

Stratify audit selection by language/layout and include no-relevant-assertion outputs. A missed independent assertion or material qualification triggers one expansion to the remaining document packets for that revision; cosmetic title changes do not. Audit caches include extracted-output hashes, not only PDF hashes. Split exhausted outputs immediately; do not resend the same oversized request unchanged.

Use one retry owner and append-only attempt/cost ledger. Initially allow up to five transport attempts per dispatch episode with backoff and Retry-After; use one targeted semantic repair and one configured stronger attempt. Record uncertain spend after timeouts. Explicit spend/account limits pause work visibly and resumably. A corrupt local source can leave one country partial; a shared authentication/quota failure pauses shared dispatch instead of failing every country. No automatic page, claim or elapsed-time cutoff may declare unfinished work complete.

## 5. Records, taxonomy and scores

The durable evidence path is **claim -> variant -> statement -> evidence span -> source unit -> original PDF page**. Store document versions, source units, statements/evidence, claim membership/relationships, assessment snapshots, and run/attempt state. Raw attempts remain recoverable. Code owns IDs, source eligibility, accounting, versions and scores.

Keep the 16 domains and 64 topics. One primary topic owns a claim's count; secondary topics are supported placements and do not duplicate totals. Retain relevant unmapped material without inventing an Other domain. A statement's Other type and an unmapped subject are different concepts. Optional labels are enabled deliberately; disabled labels do not justify discarding underlying source meaning.

Classify source role and scope explicitly: national NAP, sectoral NAP, action-plan supplement and NDC edition families are not interchangeable. A supplement links to its parent; a sectoral plan cannot silently satisfy national-NAP availability. Unknown metadata remains visible and blocks unjustified matched comparisons, not publication of grounded evidence. Preserve historical editions; absence from a newer document is not withdrawal.

Build document-only, selected current and all-supplied/historical views from explicit source selections. Neither a combined claim title nor its score may inherit facts from an excluded document. Reuse stable claim identities and retain split/merge lineage; titles and adjustable packet numbers are not persistent identities.

**Keep scoring method 4.0.** A response earns one point for the response and one each for evidenced responsibility, action timeframe and specific output/milestone belonging to that same response. Context is counted and unscored. Topic scores average distinct responses; complete no-response topics are zero by convention. Domains average their fixed home topics; country scores average all 64 unique topics. Counts and addressed-topic coverage stay visible beside scores.

| Score | Display band |
|---|---|
| 0 to below 25 | Limited policy detail |
| 25 to below 50 | Basic policy detail |
| 50 to below 75 | Moderate policy detail |
| 75 to 100 | Substantial policy detail |
| Unknown / incomplete | Assessment unavailable, gray |

Unresolved organization can publish qualified statements as provisional singletons, with source-local checks. It cannot claim finalized unique-claim counts or exact comparative topic averages. Propagate unknown scores under the existing method. Missing unclassified source regions may affect all topics unless their scope can be established; do not silently restrict their impact to a guessed domain.

Arrows show comparable documentation-score changes, not physical progress. The extraction-method upgrade is a method change: initially show refresh, unless both comparison snapshots are recalculated using the same new method and source profile. Preserve the [full score method](../ui-scoring/METHOD.md), including contradiction handling, secondary-topic projections and absence/unknown distinctions. Country-driven NAP principles, Sendai risk framing and transparency inform interpretation without adding a new UN rating system.

## 6. Dashboard implementation: keep the approved design

Use the approved [interactive dashboard](../ui-scoring/dashboard.html) as the visual reference. Retain its UNDP-inspired blue, compact cards, light/dark support, clear score colors, visible labels and mobile layout. Connect it to real source-scoped data; the existing preview remains visibly synthetic.

| Screen | First view | Detail on demand |
|---|---|---|
| Country | Scope/date; documentation score; unique claims/responses; topics addressed; domain cards with color and arrow | Exact score calculation, source gaps, conditions and priorities |
| Domain | Focused topic rows with counts, average, color and arrow | Topic evidence; domain switcher and return to country |
| Topic / claim | Plain-language claims, points, stage and conflict badges | Responsibility/timeframe/output checks, variants, linked context and evidence |
| Evidence | Original PDF page/crop, quotation/transcript and source identity | OCR/vision method, limitations, other evidence spans and source-local comparison |
| Region | Like-for-like country bars and domain/topic matrix; eligible cohort size | Focused country/topic evidence and source-profile exclusions |
| Documents | Selected sources, edition/role and processing state; document-only versus combined results | Target, timeframe, conditions and variants aligned across selected documents |
| Processing | Selected sources; prepared/extracted/organized/outstanding counts; cost; resume | Technical failure details and attempt history |
| Settings | Labels, modules, source profiles, prompts/model settings and presentation | Schema/request preview, impact, version history, import/export and restore |

Keep Country / Region / Documents as primary navigation. Processing and Settings are secondary utilities. Country -> domain -> topic replaces the main content rather than stacking every layer on one long screen. Preserve breadcrumbs and keyboard focus. Open evidence beside claims on wide screens and as a focused page on narrow screens. Color is always accompanied by a number or text label.

Keep advanced fields and extraction diagnostics collapsed. Do not add a default country rank, z-score, confidence percentage or wall of filters. Distinguish observed statements, evidence quotations and unique claims. Post-publication local hiding is a view preference; a shared analytical exclusion creates a new auditable assessment and does not silently change regional scores.

## 7. Ordered implementation and acceptance

| Phase | Work | Evidence required before activation |
|---|---|---|
| 1. Freeze and consolidate | Reinspect latest source; preserve current state; one config loader; upgrade prompts/contracts; add run and source-version ledger | Exact configuration and inputs reproducible; old archives excluded from model input |
| 2. Prepare sources | Layout-aware PDF.js units, region inventory, OCR/vision fallback, original-page mapping | Mixed text/image page, Cyrillic source and cross-page table remain recoverable |
| 3. Extract and recover | All-packet scheduling, titles, field evidence, unit accounting, sampling, splitting and bounded repairs | Final-page assertions survive; no count slicing; signs, conditions and unknowns preserved |
| 4. Organize and publish | Topic pooling, evidence-linked variants, boundary reconciliation, immutable membership and atomic snapshots | Repeated quotes do not force merges; each owner accounted once; resume does not duplicate records |
| 5. Integrate scores and UI | Source-local adapter, existing score method, approved dashboard, evidence viewer, settings and full exports | Same source-scoped values across all screens; unresolved grouping cannot inflate counts/scores |
| 6. Release automatically | Regression fixtures, representative-source integration checks, cost/status reporting and migration | Single PDF, country and full collection use the same resumable path; explicit failures stay partial |

Build offline fixtures alongside each phase. Include English and Cyrillic qualifiers, conditional targets, expected indicators versus achieved outputs, conflicting numbers, scanned content, repeated quotations, changed editions and secondary topics. Test source-profile isolation and score invariance under harmless title/packet changes. Evaluations do not become a human country-review queue, and model self-checks do not certify factual truth.

Make all retained results accessible through database pagination and streaming exports with evidence references. Q&A indexing failure, a missing source role, unreadable evidence and model-access failure must be distinguishable. Use controlled integration checks; do not rerun the entire corpus after every display edit.

## 8. Simple file structure and customization

The production configuration location below is a planned destination, not an existing activated bundle. Migrate the reviewed sources into it during phase 1; keep one authority and generate other views from it.

```text
config/policy-tracker/
  pipeline.json       models, OCR, source profiles, budgets and concurrency
  taxonomy.json       stable domains/topics and routing
  labels.json         statement types and enabled facets
  scoring.json        score method and presentation settings
  contracts.json      strict extraction/organization/recovery contracts
  prompts/
    extract.md        normal stage 1
    organize.md       normal stage 2
    recover.md        conditional repair, omission and image recovery
```

Keep source preparation in the existing PDF/ingest modules, add a small OCR adapter, and evolve existing analysis/jobs/storage modules rather than introducing microservices. UI settings export or save immutable versions of the same bundle; do not maintain competing database prompt text and unrelated file defaults. Snapshot the active bundle per run. A basic settings view hides advanced contracts but exposes change impact and restore.

Cache native preparation and OCR by document/region/configuration. Cache extraction by owned units, required context and semantic model/prompt/schema/vocabulary settings. Cache organization by selected member/context records and identity candidates. Recompute scores from retained facts when possible; display-only labels/colors do not trigger model calls. Genuine scope or missing-field changes re-extract affected source units. Audit results are invalidated when their checked outputs change.

The original October 19 archive remains a historical baseline; later workspace changes must be preserved. The implementation should create a fresh pre-migration snapshot rather than restoring older code. This plan changes review documents only. Current v3 request examples must be regenerated after contracts are upgraded; they must not be advertised as final packet requests.

Defer a new vector database, optional claim index, routine third reviewer model, country prose-summary layer, country-specific weights and regional normalization. Batch processing can be added after ordinary resumable requests work; it is not a launch dependency.

**Ready now:** this consolidated plan, the approved interactive design, the reference scoring calculator and preserved material. **Implementation still required:** complete packet extraction, OCR, new record/run storage, conservative organization, production scoring adapter and dashboard integration. No OCR installation, database migration or new model API call was performed for this planning update.
