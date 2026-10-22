# Climate and disaster policy tracker

Implementation handbook · Recommended specification 2.0.0 · 19 October 2026

This pack defines a simpler way to compare what countries document about climate and disaster policy. It preserves 16 domains and 64 topics, two LLM stages and automatic publication. It updates proposed prompts, grouping, data structure and scoring. The application has not yet been connected to these replacements; exact current runtime copies and a migration plan accompany this handbook.

## 1. What the tracker tells the team

The main question is: “What does the supplied evidence document for this topic?” A concern, policy response, delivery detail and reported implementation stage are different signals. A detailed policy does not prove effective implementation or adequate ambition.

Use four bands with consistent names. Numeric codes are for software only; do not average them into a national performance score.

| Band | Meaning | Example |
|---|---|---|
| No evidence found | Completed usable-source search found no qualifying evidence within the recorded scope | No relevant statement retrieved |
| Context documented | Concern, condition, projection, proposal or other relevant context | Drought affects agricultural production |
| Policy response documented | Attributable policy undertaking or action | Expand efficient irrigation by 2030 |
| Delivery details documented | Same response identifies who, when and a specific deliverable | Ministry will rehabilitate 30 km of programme canals during 2026–2030 |

Processing incomplete is a separate status, never silently No evidence found. If a valid response is already established, show it with a partial badge. Conditional commitments can qualify; display their conditions.

## 2. The recommended pipeline

Source documents → prepare pages → extract records → pool country records → organize claims → calculate bands → publish dashboard.

Two logical LLM stages are enough. Stage 1 reads each document in domain-sized units and extracts sourced statements. Code pools records by assigned topic. Stage 2 organizes records across documents into common claims and relationships. Code checks, scores and publishes. Two roles can use the same model; choose through measured examples.

1. Register documents, editions, sources and hashes. Keep versions.
2. Prepare pages and record unreadable material. Search only the intended document; log what was returned and supplied.
3. Stage 1 returns atomic records, original-language quotations, pages, topics, statement types and explicit qualifiers.
4. Code checks shape, IDs, quotations and numbers. Repair failing units only within a shared budget.
5. Code pools by topic home, reconciles repeated discovery and preserves one record owner.
6. Stage 2 groups the same propositions, preserves variants and links context, support, progress and disagreement.
7. Code calculates bands, creates document and combined views, and publishes a versioned snapshot automatically.

There is no pre-publication human review queue. Failures appear as missing coverage or diagnostics. Users can flag or hide afterward. Automated checks improve reliability but cannot guarantee every semantic interpretation is correct.

## 3. Why pooling is separate

Pooling collects stored records into bounded topic/domain packs. It does not summarize them or decide which document is right, so no extra LLM prompt is needed.

A Water question can discover irrigation evidence belonging to AGR-01. Pool by AGR-01, not by the question that found it. Each record has one owner; other views link to it. A single quotation may contain several propositions, so quotation equality alone is not a duplicate rule.

Keep short quotations and qualifiers in Stage 2. The current application strips some of these before synthesis; restoring them is a priority. Split oversized packs by topic and identifiable policy object, then reconcile cross-partition candidates within Stage 2. Skipped work remains explicitly incomplete.

## 4. Multiple documents: worked example

The following example is synthetic and represents no country.

| Document | Statement | Treatment |
|---|---|---|
| NAP 2024 | Network served 60,000 hectares in 2024 | Separate context claim |
| NDC 2025 | Efficient irrigation target: 100,000 hectares nationally by 2030 | Target claim |
| NAP 2026 | Same target: 80,000 hectares | Conflicting target variant |
| NAP 2026 | Ministry will rehabilitate 30 km of programme canals during 2026–2030 | Separate planned-action claim linked to target |

The target values conflict because metric, scope, period, basis and conditionality match. Preserve both; never average or assume a later NAP replaces the NDC. Network capacity is not necessarily efficient-irrigation capacity and does not establish achievement.

The combined topic band is Delivery details documented because the canal action has who/when/what. The target claim remains Policy response documented; the linked action does not lend its details to the target. A conflict badge stays visible. No physical implementation is established by this plan.

Document bands remain source-local: NAP 2024 is Context documented; NDC 2025 is Policy response documented; NAP 2026 is Delivery details documented. Later evidence cannot change what the earlier document said.

## 5. Repeatable scoring

Each claim receives a documentation classification and an inspectable reason. For responses, display three checks: named responsible/implementing actor, action-anchored timeframe and specific verifiable deliverable. Each check needs evidence for the same coherent response.

A deliverable need not be numeric. Adoption of a named law by a specified date with a responsible ministry can qualify. “Improve resilience” or broad “rehabilitate canals” is insufficient. Publication year is not action timing; a funder is not automatically the implementer. Different passages may supply details only when explicitly tied to the same response and variant.

A topic shows its strongest guaranteed band. This indicates presence, not that all responses are fully specified. Show response-claim counts and how many have complete delivery details. Repeating a statement a hundred times cannot raise its band.

If unresolved variants differ in qualification, display the lower band with “details differ” and the possible upper band in detail. Conflicting target values do not reduce the band if both qualify at the same level. Contradictions are visible separately, without arbitrary penalties.

## 6. Comparing countries and domains

Do not average ordinal band codes. Show the distribution of topics and a documented-response coverage percentage: the share with at least Policy response documented, using a fixed shared topic set.

| Category | Meaning |
|---|---|
| P: response established | A valid response is documented, even if other processing is incomplete |
| A: no response found | Processing is complete and neither established nor unresolved possible evidence reaches response level |
| U: undetermined | Remaining topics where missing work or unresolved interpretation affects response presence |

With N = P + A + U, response coverage ranges from P/N to (P+U)/N. For 10 topics with 6 responses, 2 completed without responses and 2 undetermined, show **60–80%**: “6 of 10 topics have a documented response; 2 remain undetermined.” Fully resolved results show one percentage. Processing completeness is a separate count.

This range describes missing classification information, not statistical confidence. Valid positive evidence remains positive when another source fails. An empty selected profile is not available, never zero.

Compare the same source-role/date profile, taxonomy and scoring version. Until a common source profile is configured, label comparisons exploratory. Default to all 64 topics with one home each. Focus filters change the display, not the benchmark denominator. A smaller regional module must be versioned and shared across the comparison.

Avoid band-code z-scores and national league tables. An optional analyst view may later describe the distribution or median of complete comparable countries' response-coverage percentages, with cohort and sample size shown. Do not turn unresolved ranges into single scores or call relative documentation position climate performance.

## 7. Matching dashboard visuals

| View | Main visual | Drill-down |
|---|---|---|
| Country | Domain tiles, coverage range, segmented topic-band bars | Topics, sources, incomplete work |
| Region | Country × topic heatmap with text/icon legend | Evidence and comparison scope |
| Topic | Band, three checks, response counts, separate badges | Claims, variants, context, quotes |
| Documents | Side-by-side source columns and dated assertions | What each document says and explicit replacements |
| History | Snapshot changes and changed-source indicators | New evidence versus method changes |

Use grey for No evidence found, pale blue for Context documented, blue for Policy response documented and dark teal for Delivery details documented. Missing processing has hatching and a text label. Use symbols and text with color. Avoid “on track,” “successful” and achievement ticks for documentation bands.

Reported progress remains separate: commitment, planned action, implementation reported or output reported delivered. Result-reported evidence does not by itself establish causation. Show conflicts, conditionality and incomplete work without collapsing them into the band.

## 8. Keep the taxonomy; simplify its use

Retain 16 domains and 64 stable IDs. The existing catalogue covers sector responses and cross-sector climate/disaster systems. Inspect recurrent unmapped concepts before adding topics. Hazards, populations and instruments should remain facets, not new topics by default.

Topics answer what a statement is about. Statement type identifies the assertion. Optional facets capture purpose, hazards, geography, affected groups, themes and instruments. Keep detailed risk-component and risk-function labels disabled initially; they add extraction work without changing the headline view.

Sector measures use sector topics: flood protection infrastructure belongs to its water topic; national warning/governance systems belong to Disaster Risk Management. Climate-domain membership does not establish climate causation. Earthquake and other non-climate disasters remain correctly in all-hazards disaster scope.

TAXONOMY.md lists every code, definition, placement and label choice. DATA-DICTIONARY.md explains fields. JSON holds the editable vocabulary; guides describe that same version.

## 9. Fewer authoritative files

| File | Purpose |
|---|---|
| config/bundle.json | Version and hashes |
| config/taxonomy.json | Domains, topics, definitions, routing and homes |
| config/labels.json | Statement types, facets, qualifiers, relationships |
| config/pipeline.json | Models, retrieval, budgets, checks and publication |
| config/scoring.json | Bands and deterministic rules |
| prompts/extract.md | Stage 1 records |
| prompts/organize.md | Stage 2 claims and relationships |
| prompts/retag.md | Occasional maintenance/targeted repair |

Once implemented, an immutable database bundle is each run's authority. Files are portable import/export copies. The settings screen edits the same bundle, explains change impact, validates automatically and creates a version. It must not become a second independent configuration source.

## 10. Cost and implementation

Improve the current retrieval-based two-stage approach. Reuse unchanged extraction, organize affected packs, cache static instructions and taxonomy, and bound tool calls as well as returned results. One country-update allowance includes both stages, overflow, SDK/application retries, repair, search and optional OCR. Initial limits require measurement.

| Option | Benefit | Weakness |
|---|---|---|
| One call over all documents | Fast prototype | Repeated old-document cost; fragile traceability |
| Two stages plus code pooling | Incremental, inspectable, closest to current app | Requires precise identity and coverage checks |
| Exhaustive page extraction | Explicit page-processing coverage | Higher volume; OCR/semantic errors remain |

Implement configuration authority and persistent records first; then grouping, scoring snapshots and the dashboard. Preserve old outputs and versions. A fixed automated evaluation set should test software changes before activation; this is not a human moderation step for country results.

The delivered scorer and synthetic fixtures test deterministic rules. They do not measure LLM accuracy or production costs. Exact current prompts, implementation mapping, diagrams and proposed files accompany this handbook. PLANNED-CHANGES.md states the remaining application work.

## 11. Relationship to UN monitoring

Use SDG-style navigation and compact comparison, while preserving this tool's meaning: documented policy evidence. Official SDG progress assessment uses indicator series and trend-to-target methods. These four bands are a proposed local documentation method, not an official UN indicator or SDG rating. Sendai monitoring also addresses substantive risk-reduction targets. METHOD-SOURCES.md supplies primary references and design limits.
