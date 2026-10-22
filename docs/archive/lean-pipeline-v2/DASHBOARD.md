# Dashboard: four clear bands, evidence one click away

19 October 2026 · Recommended specification v2.0.0 · **UI design, not an implemented application change.**

The dashboard answers three practical questions: **What is documented? Where are the gaps? Which sources support or disagree with it?** Use the existing domain → topic system throughout. Domain cards play the overview role that SDG tiles play in an SDG dashboard; topics are this tracker's comparison units. These are documentation measures, not official SDG indicators or measured climate outcomes.

## 1. One legend everywhere

| Band | Plain meaning | Example |
|---|---|---|
| **No evidence found** | No eligible evidence found after the required bounded search/processing completed | A completed search finds no statement on the topic in the supplied documents. |
| **Context documented** | A concern, risk, barrier, projection, need or relevant context is documented; no policy response is established | “Drought is reducing crop yields.” |
| **Policy response documented** | A commitment, target or action is explicitly documented | “Expand efficient irrigation to 100,000 hectares by 2030.” |
| **Delivery details documented** | The same response has an accountable actor, an action-anchored timeframe and a specific verifiable deliverable | “The Ministry of Agriculture will rehabilitate 30 km of canals during 2026–2030.” |

A concrete legal instrument, named asset or verifiable milestone may supply the deliverable without a numerical target. An action's date cannot be borrowed from an unrelated target. A publication year alone supplies no action timeframe. A broad action such as “rehabilitate canals” does not establish a specific deliverable.

Use a neutral-to-blue sequence for bands, always with names or accessible text. Avoid green labels suggesting targets have been achieved. Give domains their own icons or accent colors, but keep the band legend consistent across every domain.

**Incomplete processing is not a fifth band.** Show a separate hatch/icon with its cause. If eligible evidence already proves a band, show “At least [band name]” with the incomplete badge. If no band can be established, show “Unavailable — processing incomplete” rather than No evidence found. A Context documented topic can also have incomplete processing; its unresolved response presence belongs in the coverage upper bound.

## 2. Regional overview

The default view is a country-by-domain matrix. Each cell contains a compact distribution of topic bands and a short response-coverage label. Clicking it opens that country's domain. Provide a topic-level matrix after selecting a domain; those cells use the four band colors directly.

| Visual | What it shows | Interaction |
|---|---|---|
| Country × domain matrix | Topic-band distribution and response coverage, with incomplete markers | Open the country/domain; filter countries without changing the comparison profile. |
| Country × topic heatmap within a domain | Each topic's supported band and separate issue badges | Open the topic evidence drawer. |
| Small horizontal distribution bars | Counts in the four bands; unclassified topics remain a clearly labeled segment | Select a band to view its topics. |
| Response-coverage bars | Proven response share, plus a hatched unresolved interval | Show P, A, U, N and the documents/profile used. |

Do not color an entire domain by its single strongest claim. Do not average band codes into a domain band. A distribution distinguishes a domain with responses across most topics from one with a single detailed project.

Put the comparison profile, source rules and snapshot date above the matrix. If countries do not share the required source-role/date profile, label the view exploratory and explain the mismatch. Document quantity is context, not evidence of better policy.

Default ordering is alphabetical or an explicit user order. Do not introduce a default country ranking, z-score or red/green performance league table. If a map is added later, clicking a country should open its evidence overview; do not shade geography as a climate-performance score.

## 3. Country overview

Show a compact header containing country, snapshot date, included document roles/editions, processing completeness and comparison-profile eligibility. Then show the 16 domain tiles.

Each domain tile contains:

- Domain name and number of home topics.
- A small distribution of supported topic bands.
- Response coverage as a percentage or bounded interval.
- Separate counts for topics with reported progress and unresolved contradictions.
- An incomplete-processing marker where relevant.

Use a short subtitle: **“What the supplied documents substantiate.”** Avoid a single overall quality score and crowded radar charts. A country can document many responses while omitting financing or describing ambitious targets with substantial unresolved conditions.

The topic list underneath the selected tile gives the band, a short reason and the evidence count. Put optional taxonomy facets in filters rather than making every claim card display every label.

## 4. Response coverage: a percentage with a clear denominator

The standard regional profile fixes 64 topics, each counted once in its home domain. A domain uses its fixed home-topic subset. A focus filter does not silently change these denominators.

For the selected fixed basket:

- **P = proven response:** topics with Policy response documented or Delivery details documented. Count these even when another processing issue remains.
- **A = complete without a response:** required processing completed and the possible upper band is below 2. Complete but unresolved 1–2 variants belong to U, not A.
- **U = unresolved response presence:** the remaining topics.
- **N = P + A + U.**

Display `P/N` to `(P+U)/N`, expressed as percentages. The lower end is substantiated. The upper end allows for responses that missing processing or unresolved classification/variants might establish; it is not a prediction or a statistical confidence interval.

**Synthetic example:** six proven-response topics, two complete topics without a response, and two unresolved topics in a ten-topic basket give **60–80% response coverage**. Under the bar, write: “6 documented · 2 complete without response · 2 unresolved · 10 topics.” This example illustrates arithmetic, not a change to the 64-topic taxonomy.

If all ten become resolved and neither adds a response, the interval becomes **60%**. If both add a response, it becomes **80%**. A failed document never pushes an otherwise unproven topic into the complete-without-response group.

Processing completeness is a separate statistic based on required jobs/source scope. Do not label `N−U` “fully processed topics”: a proven-response topic may still have incomplete processing.

## 5. Topic drawer: explain the band

The drawer should fit the essential explanation before exposing deeper technical details:

1. **Band and reason.** For example: “Delivery details documented: ministry, 2026–2030 timeframe and 30 km deliverable are explicitly documented for this programme.”
2. **Evidence checks.** Show the relevant response, accountable actor, action timeframe and deliverable, each linked to its source quote. Display absent details as “Not found in eligible evidence.”
3. **Claims and variants.** Group equivalent statements, show differing target values together and retain each source's wording.
4. **Related evidence.** Display supporting capacity, concerns and associated actions as separate linked claims.
5. **Coverage and provenance.** Show documents included, pages retrieved/cited, unresolved processing and configuration version.
6. **Post-publication controls.** Flag incorrect, duplicate, wrong-topic or outdated material; hide/reveal it through recoverable display controls.

An optional “Method” disclosure can show field provenance, grouping reasons and run/configuration IDs. Everyday users should not need to understand model names or JSON schemas to read a claim.

## 6. Badges answer different questions

| Badge | Meaning | Does not mean |
|---|---|---|
| **Reported progress** | A source reports an identifiable implementation change or result, with its applicable date | Independently verified achievement or effectiveness |
| **Conflicting statements** | Comparable assertions disagree and no explicit replacement resolves them | The entire topic is undocumented |
| **Conditional response** | The assertion depends on stated conditions such as international support | That the conditions have been satisfied |
| **Incomplete processing** | Required source/search/organization work has unresolved gaps | No policy exists |
| **Comparison profile differs** | Source/profile/method/time rules differ from the comparison requirements | The country is performing worse |

Keep these orthogonal to the band. Conditional responses can still be well documented. Contradicting target values alone do not reduce the band; unresolved variants that change whether a criterion qualifies require the lower guaranteed label and an explanation.

Do not show an unexplained model confidence percentage. Quotation checks establish traceability, not the truth or effectiveness of a national policy.

## 7. Document and combined views

Provide a clear switch: **Combined country evidence / By document**. Preserve the same claim identity across views where it refers to the same proposition, but calculate each view from the evidence available to that view.

| Synthetic source | Evidence | Document-specific display |
|---|---|---|
| NDC | Efficient-irrigation target: 100,000 ha by 2030 | Policy response documented |
| Earlier NAP | Existing irrigation capacity: 60,000 ha | Context documented |
| Later NAP | Comparable 80,000 ha target, plus a ministry plan to rehabilitate 30 km of canals during 2026–2030 | Delivery details documented for the rehabilitation response; target conflict remains visible |

The combined topic can show Delivery details documented because a qualifying response exists. It also shows the target conflict and linked capacity evidence. The capacity figure does not become proof of target achievement, and the earlier NAP does not inherit the later plan's band.

Document comparison should align claim rows with one column per document, preserving target values, conditions, quotations and source-specific dates. Use “Not repeated” where appropriate; omission is not withdrawal. An explicitly superseding policy is shown through a source-supported relationship, not inferred only from publication order.

Offer a historical **as-of** view using only evidence available under the selected date rule. Keep historical published snapshots accessible. Reprocessing old documents with a newer method must identify the new method version and must not inject future documents into the historical evidence set. Trend arrows should say “Documentation changed” and explain whether sources, policy statements or methodology changed.

## 8. Settings and publication

Settings expose four understandable areas: **Taxonomy and labels**, **Prompts**, **Documentation bands**, and **Processing**. Each saves a new version of the same exportable configuration bundle. Provide a preview of active prompt text and a plain-language impact summary.

- A label rename changes display only.
- A grouping-prompt edit reorganizes saved evidence.
- A band-rule edit recalculates from stored facts; missing newly required fields trigger affected extraction.
- A topic expansion searches relevant sources again.

The dashboard publishes results automatically after machine checks and bounded repair. Incomplete results remain explicitly marked; later completion creates a newer snapshot. A previous published snapshot stays visible while an update runs, with its date and a pending-update indicator. There is no mandatory review, approval or moderation screen before publication.

Post-publication hiding changes presentation by default and leaves the shared benchmark intact. An explicit custom exclusion creates a separately labeled adjusted view with its exclusion list and version; it must not silently enter the standard regional comparison.

## 9. Accessibility and minimum build

Use visible names and numbers with color, not color alone. Provide keyboard-accessible cells, screen-reader descriptions, sufficient contrast and hatch patterns for incomplete processing. Export tables with band names, reasons, coverage fields and source IDs; screenshots alone are not the evidence record.

The first implementation needs only **domain tiles, one matrix, a topic drawer, document comparison and settings**. Defer maps, radar charts, weighted composite indices and statistical normalization until a concrete user question justifies them.

See [SCORING.md](SCORING.md) for formal rules, [PLANNED-CHANGES.md](PLANNED-CHANGES.md) for implementation mapping and [PROCESS.md](PROCESS.md) for the full source-to-dashboard flow.
