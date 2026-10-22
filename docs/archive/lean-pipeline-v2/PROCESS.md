# Process, step by step

Recommended specification v2.0.0. This is the target workflow; RUNTIME-INPUTS.md describes today's application.

## Simple flow

**Documents → source pages → Stage 1 records → code pooling → Stage 2 common claims → code bands → automatic dashboard publication.**

There are two logical LLM stages, not necessarily two API calls or two different models. Each country can have many document/domain extraction jobs and bounded organization packs. Pooling, checks, scoring and publication use code. Retag/repair calls are occasional bounded exceptions.

The editable `diagrams/pipeline.drawio` contains team and engineering views. Matching SVG files open without an editor.

## 1. Freeze configuration

Read an immutable bundle: taxonomy, labels, prompts, output-contract version, scoring, retrieval and model settings. Store its ID and hashes with the country update. An edit creates a new version, not a mid-job change.

Changing a display name requires no extraction. Expanding AGR-01's meaning may require retagging and new source searches.

## 2. Register documents separately

Store country, title, role, edition date, language, file hash, source URL, family and explicit replacement links. Keep NDC, NAP and disaster strategy documents distinct. A new NAP does not automatically cancel an NDC target. Publication date is not an action deadline.

Identical file hashes can reuse extraction under the same configuration. Keep upload aliases. Changed files become new versions; never overwrite old evidence.

## 3. Prepare pages and coverage

Extract text with physical PDF pages and a page-to-text map. Retain tables and section context when usable. Record unreadable pages; optional OCR handles those pages only. Document title alone cannot establish a purpose label.

Default to bounded document-scoped retrieval, matching current architecture. It is not exhaustive review of every page. Log queries, returned pages, pages actually supplied, unsearched topics, truncation and failures. A wholly unreadable document produces missing coverage, not 64 No evidence found results.

## 4. Stage 1: extract document records

Use `prompts/extract.md`. Each document/domain unit receives a compact global topic catalogue, detailed current-domain and adjacent definitions, allowed labels, document metadata and authorized source material. Global routing permits a record found under Water to belong to an agriculture topic.

Return atomic records: original-language quotes, pages, English statement, one primary topic, substantive secondary topics, statement type, figures, qualifiers, actors and source-linked delivery details. Unstated fields stay null or not_stated. Do not invent scope, baselines or deadlines.

Example: an NDC irrigation target and a NAP's current network capacity are separate records even if both use AGR-01.

## 5. Check and persist automatically

Check shape, IDs, evidence references, quotation matches and numeric fidelity. Preserve original text; use a documented whitespace-normalization rule for matching. Targeted repair is bounded. Remaining unverifiable fields cannot qualify a band; preserve diagnostics and mark affected coverage incomplete.

Code assigns persistent record/evidence IDs. Store field-level evidence, raw responses, versions, tokens and costs. These checks reduce errors without guaranteeing semantic truth. Do not display model confidence as a reliability percentage.

## 6. Pool all country records in code

Pool by **assigned primary topic and home domain**, regardless of extraction question. Reconcile repeat discoveries of the same source span **and proposition**; quote equality alone is insufficient. Preserve aliases and distinct propositions.

Each record has one owner. Relevant records enter other packs as context_only. Direct substantive secondary-topic evidence may qualify that topic; display placement alone cannot. Each topic still appears once in the comparison denominator.

Example: AGR-01 owns irrigation even when found through Water. Water can display a cross-link without adding a second score to the denominator.

## 7. Stage 2: organize across documents

Use `prompts/organize.md`. Supply short quotations, qualifiers, document/record IDs, definitions, owned records, context-only records and prior identity candidates. Do not resend every PDF.

Group only the same proposition or identifiable intervention. Preserve variants. Link separate claims with supports, contextualizes, progress_of, contradicts and other allowed types. Every eligible owned record belongs exactly once to a claim or a retained unclassified item.

Partition oversized packs by topic and policy object. Reconcile cross-partition candidates within Stage 2. Truncation, skipped partitions or unresolved ownership make organization partial. New documents rerun affected packs and linked neighbors only.

## 8. Preserve disagreement and history

Compare quantities only when metric, unit, scope, system, period, relevant baseline/basis, scenario and conditionality align. Different periods or conditional pathways need not contradict. Missing comparability detail means unresolved comparison.

100,000 versus 80,000 hectares for the same national, unconditional, total efficient-irrigation area by 2030 remain conflicting variants. Never produce a 90,000-hectare average. Date order alone is not replacement.

Compute document views from that document's assertions only. Combined views can show all assertions and links. Later implementation statements must not appear as earlier progress.

## 9. Calculate bands in code

Context alone: Context documented. An attributable commitment or action: Policy response documented. The same response with named responsible/implementing actor, action timeframe and specific verifiable deliverable: Delivery details documented.

Unresolved variants that differ in qualification retain the lower guaranteed band and possible upper band. Conflicting numbers alone do not reduce detail when both variants qualify at the same level. Topic status is the strongest guaranteed band, not an average or a claim that every response is detailed.

A completed bounded usable-source search with no qualifying evidence gives No evidence found. Empty incomplete work gives Processing incomplete, outside the four bands. Valid positive evidence remains visible with a partial badge.

## 10. Publish automatically

When jobs are terminal or a deadline arrives, publish a consistent snapshot with bands, sources, document scope, method versions, conflicts and coverage. There is no human acceptance queue. Late jobs automatically produce a newer snapshot unless newer inputs have superseded them.

Keep the last published snapshot visible while processing. Label fallback age and partial status. Budget exhaustion and unreadable sources remain explicit.

## 11. Use and customize

Country: domain tiles, topic bands, response coverage and evidence drawers. Region: country × topic heatmap and distributions. Documents: side-by-side assertions and source-local bands. Progress/conflicts remain separate.

Users can flag or hide after publication. Store reason, actor, timestamp and claim version separately. Hiding changes presentation by default. Any adjusted analysis must disclose exclusions and preserve the generated baseline.

## Worked example

| Source | Content | Topic band in that document |
|---|---|---|
| NAP 2024 | Network served 60,000 ha | Context documented |
| NDC 2025 | Efficient irrigation target: 100,000 ha by 2030 | Policy response documented |
| NAP 2026 | Same target: 80,000 ha; ministry will rehabilitate 30 km of programme canals during 2026–2030 | Delivery details documented |

Combined AGR-01 is Delivery details documented because the canal action has who/when/what. The target claim remains Policy response documented with a conflict badge. Capacity is not target achievement. A plan does not establish implementation. The complete synthetic example is `examples/water.json`.

## Changes and reruns

| Change | Work repeated |
|---|---|
| New document | Extract new document; organize affected packs and neighbors; recompute snapshot |
| Display wording/color/order | Render only |
| Topic meaning/label semantics | Retag affected records; search sources for expanded scope; regroup |
| Extraction prompt/model | New method version; rerun affected extraction |
| Organization prompt | Reuse records; rerun organization |
| Scoring rule | Recalculate stored evidence; preserve old versions |
| User flag/hide | Presentation overlay; no extraction |

One persisted country-update budget covers both stages, overflow, SDK/application retries, repair, search and optional OCR. Initial token/call limits are hypotheses, not measured optima. Evaluate cost and missed evidence on fixed sources before reducing context or changing models.
