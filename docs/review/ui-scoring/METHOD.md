# One score, four checks, four dashboard layers

**Calculation version 4.0.0; presentation version 4.1.0 — review only, not active in the application.** This revision follows the request for visible claim scores, topic/domain averages, counts, colors and arrows. It replaces the earlier coverage-only headline recommendation. The existing two-stage extraction and organization approach remains.

The headline is a **policy documentation specification score**. It answers: **How explicitly do the selected documents describe the responses they contain, across the common topic inventory?** It does not answer whether a country is doing enough, has implemented its plans, or has reduced climate and disaster losses.

## Practical alignment with UN frameworks

Three principles guide how we use the existing evidence and labels:

- **Country-driven and context-sensitive:** retain stated national priorities, conditions and affected groups. Compare a shared documentary scope without treating the 64-topic inventory as a universal prescription for national policy. This reflects the NAP process's country-driven, transparent and non-prescriptive approach. [UNFCCC NAP principles](https://unfccc.int/national-adaptation-plans)
- **Risk-informed:** interpret existing topics through risk knowledge, governance, investment, preparedness and recovery. These reflect Sendai's priorities and keep both climate and wider disaster risks visible. [Sendai Framework](https://www.undrr.org/publication/sendai-framework-disaster-risk-reduction-2015-2030)
- **Transparent results chain:** distinguish policy intent, reported implementation, outputs and outcomes in the evidence. “Will rehabilitate canals”, “work has started”, “30 km completed” and “losses reduced” are different assertions. Retain their sources and conditions; a detailed commitment is not proof of results. This supports the transparency objective of understanding climate action and tracking reported progress. [UNFCCC Enhanced Transparency Framework](https://unfccc.int/reporting-and-review)

This is practical methodological alignment, not an official UN/UNDP score or a compliance assessment. It adds no taxonomy, data fields, LLM step or human review queue.

## The calculation in one minute

```text
Source documents
      ↓ extract statements, labels, exact evidence
Source records                         NDC and NAP remain separately accessible
      ↓ organize the same response across documents; preserve disagreements
Unique common claims                   Repeated mentions count once
      ↓ deterministic checklist
Response claim: 1–4 points             Context: counted, visible, unscored
      ↓ mean of distinct response claims
Topic: 0–100                            Complete, no response found → 0
      ↓ mean of fixed home topics
Domain: 0–100                           Incomplete topic → gray domain
      ↓ mean of all 64 unique topics
Country: 0–100                          Not the mean of domain scores
```

No scoring LLM, human acceptance queue or additional review stage is required. Automatic extraction, evidence checks, grouping and scope checks feed a deterministic calculator. Results can publish with unavailable scores and visible technical status when a source fails; publication need not wait for a person. Users can flag or hide an item after publication. A display-only hide must not silently recalculate the official comparative score; an exclusion that changes the corpus creates a new, auditable assessment.

## 1. Score each distinct response with four questions

| Check | One point when the evidence establishes | Does not qualify |
|---|---|---|
| Response | An attributable commitment, planned action, implementation report or delivered output | A concern, contextual fact, projection or unadopted recommendation |
| Responsibility (who) | A named responsible or implementing actor for this response | A funder, consultant, supporting partner or unspecified actor alone |
| Timeframe (when) | A date, period, deadline or named timing milestone anchored to this response | The document's publication date alone |
| Output / milestone (what) | A verifiable deliverable: quantity, named asset, named legal instrument or specific milestone | “Improve resilience” or “rehabilitate canals” without a sufficiently specific deliverable |

These are display names. The calculation keys remain `response`, `who`, `when` and `what`; each still contributes one point.

Every qualifying response starts at **1/4**. A conditional commitment can qualify; keep the condition visible rather than deducting points. The responsible actor need not be a ministry: a named municipality, agency or accountable implementation organization can qualify. A deliverable need not be numeric: “adopt the named Water Allocation Regulation” can qualify. The scoring category must be backed by an actual source statement.

All three details must belong to the **same coherent response**. A related irrigation-capacity fact cannot supply a target to another claim. A ministry named for canal rehabilitation cannot be automatically attached to a separate national irrigation-area target. A support link is useful context, not a license to combine every nearby fact.

```text
response claim points = 1 + who + when + specific what
each detail check = 0 or 1
claim score = points / 4 × 100
```

Context, concerns, projections, proposals and background results remain visible and counted. They receive **no numerical claim score**. This prevents a valid concern from looking like a poorly documented policy response. A contextual assertion may have no policy-object ID; the calculator does not invent one.

Implementation stage is an independent label: planned, implementation reported, or delivered. A detailed plan can score 4/4. An implementation report with few details can score 1/4. Neither conclusion changes the recorded stage.

## 2. Organize first, then average

The scored unit is a distinct organized response, not an extraction sentence, paragraph, document or mention. Preserve one stable canonical claim ID across repeated statements. Different interventions remain different claims. Explicitly linked historical progress or revision can update the current assessment of that response while its earlier source records remain accessible. Do not choose the highest stage, newest publication or best-scoring variant automatically.

At the topic level, average the distinct, relevant response claims:

```text
topic score = 100 × sum(response claim points) / (4 × response claim count)
```

If a complete source search finds no response, assign **0 by convention**. This is not an average of an empty list and not proof that no national policy exists.

**Example:** one response has all four checks: 100. A second, separate response has only the response check: 25. The topic becomes **(100 + 25) / 2 = 62.5**. It does not remain 100, and more mentions do not earn more points.

This average has a tradeoff: discovering a broad response can lower a score. Splitting one intervention into several claims can also change the mean. For that reason, stable grouping rules, the visible response count and a source-change explanation are necessary. This score is not an effort meter. One fully specified project can produce a topic score of 100; the claim count makes that limited evidence base visible.

### A worked irrigation example

These are invented demonstration statements, not real country findings.

| Common claim | Sources and relationship | Response | Responsibility | Timeframe | Output / milestone | Points |
|---|---|---:|---:|---:|---:|---:|
| Efficient irrigation area target | NDC says 100,000 ha by 2030; NAP says 80,000 ha by 2030 | 1 | 0 | 1 | 1 | 3/4 |
| Rehabilitate canals | NAP: Ministry of Agriculture will rehabilitate 30 km during 2026–2030 | 1 | 1 | 1 | 1 | 4/4 |
| Existing irrigation capacity | Older NAP: network served 60,000 ha in 2024; linked supporting context | — | — | — | — | Unscored |

There are **3 common claims: 2 responses and 1 context claim**. The topic score is **7 / 8 × 100 = 87.5**. The two area targets remain conflicting variants of one claim, not two independent responses. Their numbers differ, but both establish a specific target and timeframe, so the qualification score is unchanged. The discrepancy remains prominently visible.

The document views recalculate from their own assertions: **NDC 75; NAP 2026 87.5; older NAP context-only 0**. The older context is included in the all-supplied exploratory example; it is not silently carried into a matched latest-edition benchmark. The canal actor does not improve the separate target claim. The 60,000 ha capacity does not prove that either future target has been achieved.

## 3. Count claims without double-counting

Each common claim has one **primary topic**, which owns its count. Domain and country totals are distinct canonical claim counts based on that ownership. Consequently, primary topic counts add up to their home-domain totals and national total.

A claim can be substantively relevant to a secondary topic. It needs an explicit source-qualified projection for that topic; a tag alone gives no scoring credit. The projection can retain only details supported for that subject. A climate observation claim may be context for disaster-risk assessment without establishing a disaster-risk response.

Show the following separately:

| Count | Meaning |
|---|---|
| Total claims | Primary-owned response and context claims |
| Response claims | Primary-owned scored-response identities, including unresolved ones |
| Context claims | Primary-owned unscored context identities |
| Related claims | Claims owned elsewhere but relevant here; non-additive across topic rows |
| Responses used in topic score | All qualifying primary and secondary response projections in that topic |

The last count can exceed the topic's owned response count. Label it explicitly in the score explanation. A secondary display placement never adds a second topic to the national denominator. Counts in a partial run mean **observed claims so far**.

The sum of resolved primary-owned claim points is retained as `total_points` for secondary export. It is an observed sum, not a comparative headline, and may exclude unresolved or missing claims. Country rankings must not use it: adding more claims would otherwise raise the total mechanically.

## 4. Roll up using the common topic inventory

```text
domain score = sum(scores of its home topics) / number of fixed home topics
country score = sum(scores of all fixed unique topics) / number of fixed unique topics
```

The default inventory has **16 domains and 64 unique topics**, with one scoring home per topic. Domains have different numbers of topics; averaging the 16 domain scores would silently give some topics more weight. Calculate the national score directly from the 64 unique topic scores.

**Example:** a domain has four topic scores: 100, 75, 25 and 0. Its score is **50**. Another domain has two topics at 100 and 0. Its score is also **50**. Both have the same average documentation score, with different topic patterns and counts visible underneath.

A domain with 10 topics, six of which contain responses averaging 80, has a score of **48**. This shows why domain/country scores mix **documented coverage across topics** with **specificity within responding topics**. Display “6/10 topics with responses” beside the score.

The 64-topic basket is an inventory of documentary coverage, not a universal prescription of national priorities. Do not infer non-applicability from silence or remove fisheries from one country's denominator automatically. A water-priority country and a tourism-priority country can be compared on water or tourism under the same rules; their different priorities remain an explanatory lens. A future narrower regional core must be agreed, versioned and applied to every member of its comparison cohort. Country-specific priority filters change navigation, not benchmark weights.

## 5. Keep uncertainty visible and simple

| Situation | Main score | Detail |
|---|---|---|
| Complete usable source/profile search; no response | 0 | “No response found in this assessed source scope” |
| Complete, resolved response inventory | Exact mean | Checks, counts and sources |
| Missing required NAP/NDC role, extraction failure or unfinished grouping | Assessment unavailable, gray | Provisional observed mean, technical status, broad bounds |
| Competing variants differ on whether a check qualifies | Assessment unavailable, gray | Alternative points and qualification range |
| Target numbers conflict but check qualification is unchanged | Exact mean | Conflict badge and both source statements |

Missing source roles and failed jobs are different diagnostic fields. Both prevent an absence claim. The calculator requires the complete fixed topic list; an empty or malformed request fails closed instead of producing a false national zero.

For partial inventories, unseen responses can lower or raise a mean. An observed 100 is therefore **not a lower bound**. It is available only as a provisional detail. When any home topic is unavailable, its domain headline is unavailable; when any inventory topic is unavailable, the national headline is unavailable.

Aggregate detail bounds substitute **0 and 100 for each unavailable topic**. If three complete topics are 100, 50 and 0, and a fourth is unavailable, the domain is gray with a conservative possible range of **37.5–62.5**. These are exact bounds under the declared missing-topic convention, not statistical confidence intervals or calibrated LLM confidence.

For a complete known claim inventory with alternative qualifications, the detail view also reports the mean of minimum and maximum possible claim points. For example, an actor dispute can make one claim 3–4 points. This narrower diagnostic does not turn the main headline green by choosing the best case.

## 6. Use one color legend at every scored layer

| Score | Label | Color |
|---|---|---|
| 0 to below 25 | Limited policy detail | Red |
| 25 to below 50 | Basic policy detail | Orange |
| 50 to below 75 | Moderate policy detail | Amber |
| 75 through 100 | Substantial policy detail | Green |
| Unavailable | Assessment unavailable | Gray |

These bands describe policy detail in the assessed documents, not implementation stages. They are not empirically validated policy-performance thresholds. Green at 75 can mean three of four checks; it does not guarantee a particular detail, full implementation, adequate ambition or low climate/disaster risk. At domain and country level, the score also reflects coverage across the fixed topic inventory. Keep the exact number and accessible text label alongside color. Context claims have an unscored label rather than a red score.

## 7. Arrows describe documentation changes

Use **↑ increase, → unchanged and ↓ decrease** only for comparable, complete snapshots assessed under the same method and source basis. Show the numerical score-point difference. Use **↻ refresh** for backfill, ordinary uploads, changes in grouping/method, changed profile, exploratory scope or incomplete comparison. Never infer an annual rate or a 45-degree arrow from two arbitrary document uploads.

The comparison gate checks country, method/taxonomy/scoring versions, common topic profile, source profile, role coverage, date-selection rule, source family/role inventory, completeness and cutoff dates. A new edition must be later than the previous cutoff and its prior edition. Same-document IDs cannot silently acquire different edition dates. Recompute both snapshots under the same frozen method before comparing them.

The upstream adapter must attest that the versions, source-family identity and event are correct. The reference code checks their consistency; it does not independently retrieve document registries, detect factual revisions or prove that a declared method version was actually applied. New editions can change the evidence and therefore the documentation score without proving implementation progress. Changed grouping from a method update requires a refresh even if the arithmetic happens to be unchanged.

The synthetic examples intentionally include three states: Country A is exploratory with refresh symbols; Country B has matched complete edition comparisons; Country C has missing processing and unresolved qualification. A regional comparison must use a named like-for-like cohort. Exclude unavailable values and incompatible source profiles; show the included count. If only one eligible country remains, show its value without implying a meaningful regional benchmark or standard deviation.

## 8. What is editable, and where

| File | Purpose |
|---|---|
| `scoring.json` | Versioned rubric, allowed categories, score labels/colors and comparison rules |
| `scoring.mjs` | Deterministic reference calculation, source-scope examples and comparison gate |
| `scoring.test.mjs` | 25 meaningful boundary and worked-example tests |
| `examples.json` | Precomputed synthetic UI data plus all normalized inputs needed to reproduce it |
| `../pipeline/taxonomy.json` | Existing 16-domain/64-topic profile, identifiers and home ownership |

The four equal one-point checks are the version-4 method contract. Changing a point weight fails explicitly; it needs a new method/calculator version and recomputation, not an unnoticed settings edit. Topic changes need a versioned common profile; stable IDs must not be reused for a different meaning.

Keep `presentation_version` separate from calculation version. Presentation 4.1.0 changes wording only: the calculation remains 4.0.0, all thresholds are unchanged, and valid numerical comparisons remain valid. Future numeric threshold changes need an explicit interpretive version update: show the new legend and render both compared snapshots under the same thresholds. A category change caused by a new legend is not documentation progress. Changes to evidence qualification, weights or aggregation require a calculation-version change and recomputation.

The reference input is **already normalized and source-checked**. It includes selected documents, topic processing status, canonical claims, exact source records, coherent variants and explicit secondary-topic projections. The calculator checks IDs, source scope, object consistency, valid categories and mathematical invariants. It cannot prove that a quote is faithful, an actor is semantically responsible, a milestone is sufficiently specific, or two statements describe the same intervention. Those are evidence extraction/grouping responsibilities, evaluated by automated checks and representative fixtures before activation. There is no claim here that the existing application already implements this adapter.

```text
for each selected scope:
  require the fixed topic inventory and explicit completeness
  deduplicate identical canonical claim IDs
  reject conflicting identities or invalid evidence references
  calculate four checks for each coherent response variant
  if qualification differs: preserve alternatives, mark unresolved
  score each source-qualified topic projection
  average distinct responses per complete/resolved topic
  use 0 only for a completed topic with no response
  average fixed home topics; keep unavailable topics gray
  count each claim once through its primary topic
  attach arrows only after the comparable-edition gate passes
```

Run from the repository root:

```sh
node docs/review/ui-scoring/scoring.test.mjs
node docs/review/ui-scoring/scoring.mjs --recompute-examples
```

`--generate-examples` regenerates the entirely invented demonstration corpus. `--recompute-examples` uses the normalized inputs already saved in the JSON. Neither calls an LLM, accesses the network or modifies the application.

## Recommendation and tradeoffs

| Option | Strength | Weakness | Opportunity | Threat |
|---|---|---|---|---|
| **Four-check mean (recommended)** | Easy to explain; visible claim counts; one calculation across layers | Sensitive to claim grouping; newly discovered broad responses can lower the mean | Clear evidence drilldown and actionable missing-detail checks | Users may mistake specificity for ambition or implementation |
| Best response per topic | Very simple; stable when weaker responses are added | One polished project can hide many weak responses | Useful as an additional “example available” filter | Green topics can overstate the whole response portfolio |
| Coverage percentages only | Clear presence/absence meaning; limited dependence on response volume | Does not give the requested per-claim and topic-average depth | Useful supporting coverage figures | Can flatten meaningful differences in documentation |
| Many weighted indicators or model-generated quality ratings | Can represent more dimensions | Harder to audit, customize and explain; more cost and disagreement | Later expert-designed modules for a defined question | False precision and weights that quietly encode priorities |

Use the recommended simple mean as the review proposal, keep coverage and implementation stage visible beside it, and test grouping sensitivity before activating comparisons. Regional z-scores and standard deviations can wait: they do not repair mismatched source profiles or a small cohort, and they are harder to interpret than the same 0–100 rubric.

## Reference notes

The NAP, Sendai and transparency sources linked above inform our use of country context, disaster risk and reported progress. The following sources inform the score presentation and its limits.

The OECD/JRC handbook discusses making weighting, aggregation and sensitivity choices explicit when building composite indicators. This proposal adopts that transparency principle; its four equal checks and thresholds are product choices, not an OECD-endorsed score. [OECD/JRC handbook](https://www.oecd.org/en/publications/handbook-on-constructing-composite-indicators_533411815016.html)

The Sustainable Development Report describes indicator-specific thresholds and time-based trend methods. Here the SDG-style visual hierarchy is inspiration only: documentary scores and edition-change arrows have different meanings. [Sustainable Development Report methods](https://dashboard.sdgindex.org/chapters/part-5-methods/)
