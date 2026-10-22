# Scoring v2: four clear documentation bands

**Recommended specification v2.0.0. Not active in the application.** This replaces v1's claim and topic percentages. The editable rules are in [scoring.json](config/scoring.json), with a runnable [reference calculator](reference/score-bands.mjs) and [examples](examples/band-cases.json).

The main question is **“Does the supplied policy material document a response, and does it specify its delivery?”** This is a documentary assessment, not a measure of policy effectiveness, adequate climate ambition, actual resilience or comprehensive national policy quality.

## 1. Read one simple scale

| Band | Label | What the documents establish | Simple example |
|---|---|---|---|
| 0 | No evidence found | Complete processing of the defined usable-source scope found no qualifying topic claim | No irrigation evidence in the searched material |
| 1 | Context documented | A concern, baseline, projection, reported effect or unadopted proposal, but no attributable policy response | “Drought is reducing irrigation reliability” |
| 2 | Policy response documented | At least one attributable commitment, planned action, implementation assertion or delivered output | “The country commits to expanding efficient irrigation by 2030” |
| 3 | Delivery details documented | At least one response passes all three delivery checks below | “The Agriculture Ministry will rehabilitate 30 km of canals by 2030” |
| — | Unavailable | Processing is incomplete and no qualifying evidence is available | An unreadable required document |

Use labels in the dashboard. The numeric codes support filtering and reproducibility; **do not average the codes** or turn band 3 into “100% policy quality.” A detailed risk finding remains valuable evidence even though it is not a policy response.

Band 0 means **not found in the defined searched material**, not “the country has no policy.” A bounded retrieval process cannot establish universal absence. Required documents, retrieval coverage and processing failures remain visible.

## 2. Apply three delivery checks to the same response

| Check | Qualifies | Does not qualify |
|---|---|---|
| Who? | Named accountable or implementing organization | A funder, an organization merely mentioned, or an inferred ministry |
| When? | Explicit action period, delivery deadline or dated milestone | Publication year or a contextual observation date alone |
| What specifically? | Quantified output/target, identified asset, named legal instrument or identifiable milestone | “Improve resilience,” or “rehabilitate canals” without a specific verifiable deliverable |

All three must concern **the same coherent response**. “Rehabilitate 30 km of canals” is specific. “Adopt the National Drought Management Regulation” can also be specific: a number is not compulsory.

A conditional commitment qualifies as a response. Show “conditional on international finance” alongside it; do not invent a penalty or reward. An unadopted recommendation remains context/proposal, however detailed. Attributable intentions and adopted undertakings must be distinguished from advice and hypothetical scenarios upstream.

**Cross-document example:** the NDC identifies a named irrigation programme and its 2030 target; the NAP explicitly names the ministry responsible for that same programme. Compatible evidence can establish the response's missing detail. A ministry responsible for a separate supporting project cannot supply it.

An ordinary supports/contextualizes link is insufficient. Quote checks, actor roles and explicit policy-object identity must support the combination. The LLM proposes these fields; automatic source/semantic checks precede calculation. Code then applies the rules, without asking the LLM for a score.

## 3. Assess claims, then topics

Every sourced claim receives a **1–3 assessment**, its statement type, and applicable delivery checks. Band 0 is reserved for an empty, completed topic search. There are no separate claim percentages or hidden weighting formulas.

| Claim example | Assessment | Additional information |
|---|---|---|
| Existing irrigation network served 60,000 hectares in 2024 | Context documented | Existing capacity; not evidence of target achievement |
| Efficient-irrigation target of 100,000 hectares by 2030, no accountable organization stated | Policy response documented | Commitment; conditions and target details retained |
| Named ministry will rehabilitate 30 km of canals by 2030 | Delivery details documented | Planned; not implemented merely because details exist |

The topic's demonstrated band is the highest **supported claim lower band**. One detailed response can therefore establish topic band 3. Show **response-claim count and detail-ready-claim count** beside it so users can inspect the underlying portfolio. These counts describe evidence volume; they do not add score or establish that all important measures are covered.

Repeated mentions do not earn extra credit. Directly relevant evidence may substantively support a secondary topic, but a taxonomy tag alone earns nothing. A topic displayed under two domains remains one scored topic with one configured home domain.

## 4. Preserve disagreements instead of selecting a winner

Suppose an NDC targets **100,000 hectares** and a NAP gives a comparable target of **80,000 hectares**. Both explicitly describe the same programme, area basis and deadline. Keep two variants of the target claim, with an unresolved conflict. Do not average the target values or assume that the newer publication wins.

If both variants have the same delivery qualifications, their documentation band is unchanged. A conflict badge remains visible: a documentation band cannot resolve a substantive disagreement.

If qualifications differ, assess each variant independently:

- Variant A has a target and deadline but no responsible organization: band 2.
- Variant B has all three delivery details: band 3.
- Claim display: **Policy response documented · Details vary · possible bands 2–3**.

Do not borrow A's missing details from an incompatible B. Claim lower = minimum variant band; claim upper = maximum variant band. For a completed topic, lower = maximum claim lower and upper = maximum claim upper. The displayed label uses the lower band. These are unresolved evidence bounds, not statistical confidence intervals.

A separate, clearly documented canal project can make the topic band 3 on its own merits. It still does not upgrade the disputed target claim or prove that the target will be achieved.

## 5. Keep implementation and history separate

| Reported stage | Source assertion |
|---|---|
| Commitment | Attributable goal or target |
| Planned | Specific attributable planned measure |
| Underway | Explicit implementation of the identified response |
| Delivered | Explicit completed output of the identified response |

Context, concerns, projections and proposals have no implementation stage. A reported result is retained as a result; it does not automatically establish policy causation, delivery or achievement.

Stage and documentation detail answer different questions. A planned response can have excellent delivery documentation. A reported completed activity can have sparse documentation. Neither should be forced into the other's scale.

Keep document-specific snapshots. If the NDC reports a commitment and a later NAP reports delivery, the original NDC view must still show commitment. Current status requires explicit update lineage; publication dates alone do not establish supersession. Never average stages or use a maximum stage as historical truth.

## 6. Handle incomplete processing honestly

| Situation | Treatment |
|---|---|
| Complete usable-source processing, no claim | Band 0 |
| Complete processing, contextual evidence only | Band 1 |
| No evidence and incomplete processing | Unavailable; internal bounds 0–3 |
| A supported response exists, but another required source failed | Show at least band 2, “Search incomplete,” possible upper band 3 |
| Claims are available but their required organization is unfinished | Preserve demonstrated evidence, mark affected topics incomplete, and exclude from complete benchmarks |
| Unreadable source affects unknown topics | Mark its entire required topic scope incomplete |

Processing failure does not remove positive evidence already established. It does prevent confident absence or a complete portrait. Technical checks do not prove factual truth; uncertainty and evidence links remain necessary even after checks pass.

Production has **no human approval queue**. Bounded automatic repair attempts finish in either a usable result or an explicit incomplete state. Users can flag or hide published claims afterward. Hiding changes presentation by default; an analytical exclusion creates a labelled adjusted snapshot.

## 7. Compare domains with counts and response coverage

The domain view shows a distribution of its topic bands and **“How many topics document a response?”** Each unique topic belongs to one fixed home-domain denominator. Search filters and duplicate display placements never change this denominator.

Define:

- **P:** topics with a demonstrated lower band of at least 2.
- **A:** complete topics whose upper band is below 2.
- **U:** all remaining topics whose response status is undetermined.
- **N:** the fixed number of home topics; N = P + A + U.

When U = 0, response coverage = **P ÷ N × 100**. Otherwise show **P/N to (P+U)/N**, expressed as percentages. This percentage counts topic presence; it is not an average of ordinal bands.

**Example:** a domain has ten topics. Six fully processed topics document responses, two fully processed topics have upper band below 2, and two have unfinished processing with no response yet established. Show **6/10 topics document responses · coverage 60–80% · 8/10 topics processed**. The processed count follows those explicit assumptions, not P+A in general. Do not silently remove the two unknown topics and show 75%.

A positive response can remain in P even when its topic processing is incomplete. Thus a coverage value can be exact while processing remains incomplete: all required topics may already have responses, but more detail could still be found. Always show the processing count separately; this does not confer benchmark eligibility.

For regional comparisons require the same taxonomy, rubric, topic profile, source-role/date profile and compatible extraction scope. While source coverage differs, keep results exploratory/provisional. Do not automatically infer N/A from silence. A changed regional profile must be explicit, versioned and applied consistently.

Use **band distributions, response counts and source coverage**. There is no ordinal mean, country composite, z-score or SD-based ranking in v2. Topic types differ, and a detailed response can still be weak or poorly matched to local risk. A numerical regional league table would conceal those limitations.

## 8. Match the visuals to these meanings

| View | Show | Click-through |
|---|---|---|
| Regional comparison | Country × topic band matrix; fixed legend and unavailable state | Country/topic evidence |
| Country overview | Domain cards: response topics/total, delivery-detail topics, processing completeness | Domain topic list |
| Domain view | Stacked counts of demonstrated bands, marking provisional topics | Topic cards |
| Topic view | Band label, response/detail-ready counts, conflict icon, document toggle | Claims and their variants |
| Claim view | Type, band label, Who/When/What checks, reported stage, conditions | Exact quotations and pages |

Use an ordered color family for documentation bands. Distinguish unavailable with a neutral patterned state, and contradictions with an icon rather than changing the band's color. Avoid “on track,” “target met,” success gauges and progress arrows unless a separate valid outcome time series supports them.

The readable category-and-drill-down approach can resemble an SDG dashboard. It is **not the official SDG progress methodology**, which assesses indicator trends toward targets. [UNSD technical note, 2025](https://unstats.un.org/sdgs/files/report/2025/Technical_Note_for_Progress_Assessment_2025.pdf).

## 9. Reference calculator contract and verification

[score-bands.mjs](reference/score-bands.mjs) is executable specification code, not a live pipeline integration. [band-cases.json](examples/band-cases.json) contains five complete synthetic inputs. [score-bands.test.mjs](reference/score-bands.test.mjs) adds edge cases for identity, conflicts, missing sources, duplicate mentions, document scope and historical stage preservation.

| Input field | Meaning |
|---|---|
| `scope.kind` | `document` or `country` |
| `scope.document_ids` | Exact source documents allowed in this snapshot; document scope has one |
| `profile.profile_id`, `profile.topic_ids` | Named fixed comparison profile and its unique topic denominator |
| `evidence[]` | Resolved `evidence_id` → `document_id` registry; quotations are retained upstream |
| `claims[].claim_id`, `topic_ids` | Stable claim identity and substantively supported topics |
| `claims[].variants[]` | Coherent alternative assertions, each with `variant_id`, `policy_object_id`, `statement_type`, `conditionality`, `evidence_ids` and `details`; evidence IDs include all compatible evidence admitted to this interpretation, including delivery details |
| `details.actor` | Null, or text + policy-object ID + evidence IDs + role: responsible / implementing / financing / supporting / monitoring_reporting / consulted / unspecified |
| `details.timeframe` | Null, or text + policy-object ID + evidence IDs + anchor: action / publication; a contextual observation date stays in source facts, not a delivery field |
| `details.deliverable` | Null, or text + policy-object ID + evidence IDs + kind: quantified_output / named_asset / named_legal_instrument / named_milestone / generic_action |
| `topics[]` | Exactly the profile topics, each with one `home_domain_id` and explicit `processing_complete` |

All three detail fields must be present; use null for missing evidence. Response types require a policy-object ID. All variants grouped into one claim must share that ID; non-response claims may use null. Each variant ID belongs to one claim only. Detail citations must belong to that variant's coherent evidence set, and every evidence ID must resolve within snapshot scope. An exact repeated stable ID is deduplicated; conflicting duplicate IDs fail. Raw record field names may differ: the production adapter must create this normalized assessment input explicitly.

The calculator enforces enums, citations' existence and coherent membership, scope, variant ownership, same-object detail references and deterministic arithmetic. It **cannot verify whether a quotation really supports a semantic label**, whether two records concern the same real policy, whether a generic phrase was mistakenly labelled specific, or whether a completed-search assertion is justified. The raw record ownership partition and authoritative taxonomy home mapping must also be checked upstream. A shared quotation can legitimately support several different atomic assertions; quotation identity alone is not claim identity. Upstream checks and representative-document evaluations are still required. A passed reference test is not evidence of LLM accuracy.

`assessDataset` is strict and rejects malformed normalized inputs. `assessDatasetSafely` wraps it and returns either `{status: "available", assessment: ...}` or `{status: "unavailable", assessment: null, reason: ..., detail: ...}`. “Available” here means the contract was calculable, not that every topic is complete. Invalid fields, unknown labels, unresolved citations or missing scope never become a successful zero. The production caller must retain the failure state; it must not replace an exception with an empty successful assessment.

Run from the repository root:

```text
node docs/proposals/lean-pipeline/reference/score-bands.test.mjs
```

Changing label text is a presentation change. Changing qualification rules or topic/source profiles requires a versioned recomputation. Recompute from stored fields without LLM calls only when those fields already establish the new criteria; otherwise automatically re-extract the affected material. Retain old snapshots for reproducibility.
