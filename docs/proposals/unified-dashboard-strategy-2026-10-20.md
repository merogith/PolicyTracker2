# A simpler, unified policy tracker dashboard

20 October 2026 · Strategy and design specification · No production changes

**Superseded planning baseline:** Use the [final dashboard unification plan](dashboard-unification-final-plan-2026-10-20.md). It preserves the existing comparison palette and familiar metric names, keeps navigation changes modest, and moves detailed explanation into Methodology. Comparison tracks and selected-topic tiles are the leading visual direction; radar remains optional. Its decisions override this document and the earlier blue-only concept.

This revision supersedes the primary dashboard layout and hierarchy in [the earlier profile visualization plan](profile-visualization-plan-2026-10-20.md). Its inventory remains useful, but adding more charts around the current score selector would preserve the underlying confusion.

**Recommendation: lead with topics covered and reported action stages; use statement counts as context; move derived indices into an explicit analysis view.** Preserve existing data, calculations, evidence, filters, exports and report history. Simplify the first interaction and give each measure one name and one meaning.

## 1. What the product should help someone understand

The tracker describes evidence in selected policy documents. Its core questions are:

1. Which climate and disaster policy topics do these documents address?
2. What stages of action do their statements report?
3. Where should I investigate further?
4. Which source supports the finding?
5. How do comparable document sets differ?

Primary users should answer the first two without learning a scoring methodology. Analysts should be able to reach the underlying measures and source evidence without losing context.

This is a policy documentation tracker. The available data does not establish national resilience, disaster losses, physical climate risk, independently verified delivery, policy effectiveness, or progress toward all national targets. A statement about delivery remains a reported statement. Climate and disaster labels provide ways to explore the policy evidence.

## 2. Audit: why the current screen is confusing

The supplied screenshot shows 124 claims, 67 action claims, coverage of 42/64 topics, and 64/64 assessed topics. Its five stage counts are 57, 13, 21, 24 and 9.

| Current design or behavior | Consequence | Proposed correction |
|---|---|---|
| A very large 124, repeated in two additional places | Volume dominates; repeated totals consume attention | One compact scope line for the statement inventory |
| Stacked distribution, category list and another full distribution in Details | The same information appears in several competing forms | One directly labeled stage chart; details explain evidence or calculation |
| Count and Regional score are adjacent alternatives | A count appears interchangeable with an assessment of performance | Keep count presentation local; regional transformation belongs in analysis |
| Claims, action claims, points, topic average and regional score share controls | Users must understand the data model before exploring | Fixed overview questions; explicit measure selection in Compare |
| Red “Non-action” includes context, concerns, projections, proposals and reported results | Useful evidence can look like failure | Neutral “Other statements,” preserving detailed classifications |
| One red–yellow–green scale is reused for stage, coverage and regional deviation | Identical colors encode different quantities | Separate color roles and remove evaluative color from counts |
| Raw domain bars can use regional-deviation colors | Length and color silently answer different questions | Raw bars use one color; comparison is an explicit reference mark |
| Topic tables expose several indices at once | Dense numerical comparison without a clear task | A chosen measure, its denominator, and evidence access |
| Partial, missing, zero and “no action” states appear near the same low-end styling | Lack of evidence can appear to be poor performance | Distinct named states with assessment context |

The problem is hierarchy and semantics, as well as visual styling. A new chart library alone would not resolve it.

## 3. What we currently track

The active menu exposes five metrics. A sixth, action coverage, is supported in code but absent from that menu. Statement stages, topic assessment status, source processing and label facets are additional analytical dimensions, not interchangeable scores.

| Current name / internal ID | Actual calculation or counting unit | Recommended display name | Primary home |
|---|---|---|---|
| Claims / `claims` | Distinct grouped extracted statements in scope; not necessarily independent policies or programmes | **Policy statements** | Scope line; Explore |
| Action claims / `actions` | A group counts once if any in-scope member has a selected positive stage; default stages 1–4 | **Action statements** | Reported action stages |
| Topic coverage / `coverage` | Home topics with any statement ÷ enabled home topics | **Topics covered** | Overview; default comparison |
| Claim points / `claim_points` | Sum of resolved 0–4 group progression points; no fixed maximum | **Stage-weighted total** | Advanced measures |
| Average action stage / `detail` | Source-matched action-stage mean within each topic, then equal-weight mean of scored home topics, scaled to 100 | **Average reported stage** | Advanced measures |
| Action coverage / `responses` | Home topics with action statements ÷ enabled home topics | **Topics with action statements** | Coverage detail |
| Normalized scale / `normalized` | Transform of the chosen eligible measure relative to the complete regional reference | **Relative regional position** | Advanced comparison |

“Policy statement” is a proposed public term for the existing grouped claim entity. Retain “claim” in the technical schema and explain the equivalence once in the glossary. Do not rename IDs, rewrite saved reports or change grouping as part of this presentation work.

The current taxonomy has 16 domains and 64 home topics. These are current configuration values, not permanent constants. Use the selected report's taxonomy and denominator. A statement may relate to several topics/domains; adding their counts can double-count the national inventory.

Additional capabilities to retain:

- Statement types and reported stages; source quotations and match information; grouping and provenance.
- Eight enabled label families: purpose, hazards, risk function, scope, themes, affected groups, instruments and risk components.
- Targets, including quantitative, deliverable and qualitative target-bearing statements.
- Reported figures with values, units, periods, baselines, conditions and financial qualifiers as stated.
- Documents, processing status, report snapshots, main-report selection and report-aware exports.

Target-bearing statements are not a count of independent numerical targets. A statement can carry several facts. Label families can overlap; their counts do not form a partition of 100%.

## 4. The scoring layers must be explained separately

### Statement classification

The active progression assignments are commitment 1, planned action 2, implementation underway 3, and output delivered 4. Concern, context, projection, result reported, proposal and other types currently receive 0.

Zero means “outside these four action stages.” It does not mean worthless evidence, failed policy, or zero implementation. In particular, “Result reported” currently receives 0; preserve that fact and make the detailed definition discoverable. Changing it would be a separate methodology revision.

Grouping introduces two different questions: is a group's classification mixed, and can it receive a single progression value? Different types can have the same points. Types with conflicting progression values produce unresolved points. Preserve these distinctions.

### Stage-weighted total

For the supplied screenshot, the stage-weighted total is:

`13 × 1 + 21 × 2 + 24 × 3 + 9 × 4 = 163 points`

This combines statement volume with assigned stage. More documents, extraction differences and grouping can affect it. It is unbounded and should have no gauge, completion ring, pass mark or percentage suffix.

The current sum can include classified statements without a matched source quotation; `unmatchedClaims` is tracked separately. “Complete” for this score does not itself mean every quotation matched. Show the quotation-match count in its method detail.

### Average reported stage

The topic calculation uses source-matched positive-stage claims. Country/domain aggregation gives each scored home topic equal weight. Topics with no action or unknown assessment have no numerical stage average; incomplete assessments can return a provisional average.

Consequences:

- A high value can coexist with narrow policy coverage.
- The equal topic weights and equally spaced stage values are methodology choices.
- It is an index on a 0–100 display scale, not percentage delivered.
- Show scored topics / total topics whenever showing this index; expose the source-matched action-statement count in detail.
- A country average cannot be reconstructed by dividing 163 points by 67 action statements and multiplying by 25. That ignores topic weighting.

Retain the current calculation in this redesign. Use a fixed-axis dot with its denominator in Advanced measures; avoid bands that imply validated performance thresholds.

### Relative regional position

The current transformation is `100 × Φ((raw − regional mean) / population SD)`. At least two complete non-demo values are required. Equal values, including all-zero values, map to 50 by convention. The reference is the full eligible region in the same country/domain/topic scope, independently of display filters. Eligibility also depends on the selected measure.

A calculation checked against the existing functions illustrates the interpretation:

| Raw cohort | Lower value's transformed position | Higher value's transformed position |
|---|---:|---:|
| 100 and 101 | 15.9 | 84.1 |
| 100 and 1,000 | 15.9 | 84.1 |

This transform describes position relative to the current cohort; it is neither an observed percentile rank nor a completion percentage. It does not remove differences in source quantity or document comparability.

Default to the raw measure with individual peer values visible. Retain the transform under “Relative regional position,” always naming the underlying measure, reference population, eligible N and report scope. Avoid league-table language and medal colors. For small cohorts, show individual observations instead of suggesting a stable regional distribution.

### Legacy and overlapping implementations

The draft topic-response rubric in `config/scoring/rubric.json` uses −1/0/+1. It is still calculated through the topic model; it is not the active overview headline. Older highest-stage/trend chart components appear unreferenced by the active surfaces inspected. The four-check specificity proposal is not an enabled headline KPI.

Document these as compatibility or historical concepts. Do not silently delete them or describe them as current user-facing scores. Saved reports and links need explicit version behavior; the current code can rederive an older report's average-stage value from its frozen claims.

## 5. A common information structure

Use the same four main destinations for country and regional profiles. Keep report identity and source scope above them.

| Destination | Main user task | Existing functionality preserved |
|---|---|---|
| **Overview** | Understand coverage and reported stages quickly | Country/regional summaries; domain entry points |
| **Explore** | Investigate a domain, topic or climate/disaster question | Statements, labels, targets, reported figures, search, grouping, evidence and exports |
| **Compare** | Compare the same measure across countries/domains | Comparison matrix, regional average, regional position, source cohorts and advanced measures |
| **Sources & reports** | Understand what was assessed | Documents, processing, snapshots, main report and provenance |

Keep Methodology as a persistent utility link. Explore can use secondary destinations “Statements,” “Targets” and “Reported figures.” Source management remains available in its current permission context.

Existing URLs and bookmarked report links should continue to work. A new navigation structure must not imply new data ownership or a new climate-monitoring module.

### Country overview

Order the page as follows:

1. Country, selected report, source scope and one concise assessment-status line.
2. Topics covered, as numerator/denominator and a compact coverage bar.
3. Reported action stages, as four directly labeled horizontal bars; show mixed/unclassified action groups when present.
4. Domains, as readable aligned rows with topics covered and an entry to their evidence.

The statement inventory is a compact context line, not a giant hero score. Keep the domain list in stable taxonomy order; allow a clearly labeled coverage sort when useful. It can sit below the initial viewport without being hidden.

The default primary panel has no universal KPI selector, normalization toggle, points explanation or repeated distribution. These remain available under clearly named comparison and methodology actions.

### Regional overview

Lead with “Countries in this view” and source/assessment scope. Show a country list with directly comparable topic-coverage bars and numerator/denominator. Beside or immediately below it, show the selected country's reported action-stage distribution. Selecting a country changes that detail with its name clearly visible.

This linked master/detail design avoids filling every country row with five colored metrics. Provide “Compare action stages” in Compare for simultaneous country small multiples on shared scales. Preserve pooled regional statement totals as secondary context, labeled “Across included country reports.”

Do not average country indices into a new regional quality score. Do not call the sum of country-topic gaps “topics”: report “country–topic pairs,” or display the number of assessed countries without action for each named topic.

Current gap aggregation can include unassessed topics because it checks for zero responses. In the new view, distinguish “No action documented in assessed topics” from “Assessment incomplete.” This is a presentation eligibility correction, not a new score.

## 6. The replacement for the supplied panel

Use the exact screenshot aggregates:

- A quiet scope line: **124 policy statements · 64/64 topics assessed**.
- Coverage: **42/64 topics covered**, with a single bar. The remaining 22 have no statements found in this fully assessed scope; this is not evidence that no policy exists.
- Action-stage heading: **67 action statements**.
- Four directly labeled bars: Commitment 13; Planned action 21; Underway 24; Output delivered 9.
- A neutral secondary link/count: **57 other statements**.
- Separate access to **Advanced measures** and **How this is calculated**.

Use counts as the initial chart unit. If the user chooses share, explicitly label the denominator “% of 67 action statements”: 19.4%, 31.3%, 35.8%, 13.4%. This differs intentionally from the original percentages of all 124 statements.

Choosing a stage opens the matching evidence context. It does not alter the overall coverage denominator or silently redefine the summary. A deliberate “Apply to Explore” action carries the stage and current report into the statements view.

The accompanying interactive concept is limited to these supplied aggregates. It demonstrates stage selection and the count/share display. It has no live evidence records, invented domain values, country average or regional benchmark.

## 7. Naming and color rules

### One vocabulary

Use “Reported action stages” as the shared heading. Stage names are **Commitment**, **Planned action**, **Underway**, **Output delivered**. The heading provides the “reported” qualification; source detail explains the exact classification.

Use **Other statements** for the residual non-action inventory, with its detailed types available. **Mixed classification**, **Unclassified**, **Unresolved points**, **No statements found**, **No action documented**, and **Not assessed** remain distinct.

Use **Quotation matched** for the source-text check. It establishes that text was located, not that a policy outcome was verified. Do not replace it with “Verified policy” or “Verified delivery.”

Ban generic “Score,” “Regional score,” “Performance,” “Success,” and “Progress %” where the specific measure is available. Use “index /100” for a derived index, “%” only for an actual fraction, and “points” only for the weighted sum.

Action selection defaults to stages 1–4. If an advanced user changes that set, name the measure **Statements at selected stages** and show the selected stages. Selecting stage 0 must not produce a count still labeled “Action statements.” Changing this filter must not suggest the point or average-stage formulas changed.

### Color has one job at a time

| Role | Recommended treatment | Avoid |
|---|---|---|
| Counts and topic coverage | Existing product blue; neutral background/track | Red–green bands or conditional colors |
| Four action stages | Ordered blue shades with direct names; darker means later reported stage | Red for commitment, green as verified success |
| Other statements | Neutral gray and a label | Red “non-action” |
| Selected item | Consistent blue emphasis plus visible selection state | Recoloring the underlying metric's meaning |
| Regional raw comparison | Neutral peers, blue selected country, labeled reference marker | Raw length with hidden SD-based coloring |
| Missing or incomplete | Named state; hatch or dashed placeholder where needed | Zero-length bar indistinguishable from measured zero |
| Errors and processing | Red for actual error; amber for pending/attention | Reusing these colors as policy-quality categories |
| Domain identity | Names and stable order; restrained existing identifiers where necessary | Sixteen competing saturated chart colors |

Retain the current blue brand anchor. Define semantic stage, status, comparison and selection tokens independently; stop aliasing them to one five-color score palette. Initial light-theme stage candidates are `#598BAB`, `#4384AB`, `#226891`, `#12496F`, with dark text outside the bars. Validate final colors in every theme and component before release; these candidates are not an accessibility certification.

## 8. Visualization and interaction specification

| Parameter | Unified rule |
|---|---|
| Question | One explicit analytical question per chart; title names subject and unit |
| Geometry | Position/length for comparisons; one coverage bar for a fraction; fixed-scale dots for indices |
| Baselines | Count/points bars start at zero; coverage uses 0–100%; an index uses its documented fixed scale |
| Stage order | Commitment → Planned action → Underway → Output delivered; unresolved categories separate |
| Comparability | Shared axes for simultaneous comparisons; never rescale each country silently |
| Denominator | Numerator/denominator next to coverage; count/share explicitly named; scored-topic count beside stage index |
| Precision | Integer counts; whole coverage percentage when shown alongside exact fraction; at most one decimal in analytic details |
| Labels | Direct labels preferred; units on axis/title; no acronym-only terminology |
| Legend | Only when direct labeling cannot explain categories; one per view |
| Chart density | Two primary summaries and a domain entry list on country Overview; no duplicated chart in Details |
| Layout | Restrained surfaces, clear reading order, aligned values, generous space around sections rather than giant number blocks |
| Typography | Existing product font; 14–16px primary labels, at least 12px supporting chart text; tabular numerals; avoid all-cap labels |
| Screen sizes | Desktop aligned rows; narrow screens stacked sections; labels wrap; no essential content hidden by hover |
| Selection | One visible selected state; selecting a bar reveals relevant detail without silently filtering unrelated panels |
| Filters | Common scope controls at page level, chart-specific controls locally; active filter chips and a clear removal path |
| Filter semantics | Preserve current matching behavior and explain it; explicitly define AND across families / OR within a family only where the implementation supports it |
| State | Preserve report, country, domain/topic, measure and supported filters through URLs, Back, drill-down and export |
| Tooltips | Supplementary only; never the sole place for denominator, unit, source scope or essential values |
| Motion | Brief transitions only when data changes; reduced-motion support; no animated counters |
| Loading | Stable layout and “Loading” state; no transient zero values |
| Empty result | Explain “No matching statements” with active filters and a way to clear them |
| Processing failure | Preserve available observations; show incomplete status; do not present absence as a finding |
| Export | Accessible table/CSV with scope, source/report IDs, metric version, denominator, exclusions and units |
| Performance | Reuse server aggregates; load evidence on selection; avoid shipping every quotation to the overview |
| Print/share | Legible chart plus source/report scope and method version; selection not conveyed by color alone |

Counts within overlapping domains, hazards or other labels must not be presented as parts of one pie. Show sorted bars for one selected label family in Explore, with “Statements may have multiple labels.” Keep an untagged/unknown option so the category view does not hide missing classification.

For mixed action groups, do not force four stage counts to sum to the action total. Reconcile with explicit mixed/unclassified categories and explain any remaining classification limitation. Non-action types with equal points can resolve to zero in the points calculation while remaining mixed in a type view.

## 9. Climate and disaster visualizations within scope

| Available question | Suitable method | Boundary |
|---|---|---|
| Which hazards are addressed in policy statements? | Horizontal count bars, click to statements | Documentation attention, not hazard severity or exposure |
| Which risk functions are represented? | Bars for one label family; selected label → domains/topics | No new preparedness score |
| Which domains address adaptation, mitigation or disaster risk reduction? | Filtered domain coverage rows or a labeled matrix | Labels may overlap; denominator stays explicit |
| What targets are stated? | Target-kind counts and source-linked target register | No completion percentage without comparable observations |
| When are targets due? | Date lanes only for parseable, comparable deadlines | No invented date for vague time language |
| What finance or numeric quantities are reported? | Structured table first; chart only a comparable subset | Keep currency, price basis, period, conditionality and financial status separate |
| How has documentation changed? | Saved-report differences only after method/source comparability checks | Report editions are not a real-world outcome time series |

Do not add a risk choropleth, emissions trend, disaster-loss chart, universal finance sum, causal impact graphic or composite resilience score from this data. A geographic locator could help navigation later; it should not become the main dashboard solely because this is a climate product.

## 10. Methodology and data-quality contract

Every visual should receive one presentation-ready result containing:

- Stable metric ID, canonical label, unit and measure type.
- Value, numerator/denominator where applicable, and counting entity.
- Scope: country set, selected reports, home-topic inventory, filters and source profile.
- Eligibility: assessed/scored counts, missing/unresolved counts, quotation-match information where relevant.
- Calculation version, data/report date, comparator scope and eligible country count.
- Evidence drill-down target and accessible table rows.

Implement this as a small shared presentation layer over existing aggregation functions. Do not build a second scoring engine in components. One catalog should supply labels, units, tooltips, valid scales, chart defaults and color roles.

Separate four dimensions of quality: processing completeness; classification resolution; quotation matching; source-set comparability. None alone establishes substantive truth. Put a concise relevant status near the result and the full breakdown in its explanation.

Coverage is observed against the enabled home-topic inventory. For a partial report, label it “Coverage observed so far”; separate unassessed topics from fully assessed topics with no statements. Do not fabricate confidence intervals or turn a provisional average into a lower/upper bound.

Regional source-profile filtering and full-region normalization currently have different reference behavior. Name both scopes if used together. Never move a reference mean just because a display filter changed unless the chosen comparison explicitly recalculates it and says so. Historical country reports compared with current peer reports need explicit dates and report scope.

## 11. Implementation sequence

| Phase | Deliverable | Completion gate |
|---|---|---|
| 1. Semantic foundation | Metric catalog, glossary, distinct color roles, source/assessment state contract; audit all active labels | A metric has the same name, unit and interpretation in overview, comparison, evidence and export |
| 2. Focused prototype | Replace the supplied panel concept; test country and regional reading tasks | Users distinguish coverage, stages and volume without opening methodology |
| 3. Country overview | Fixed coverage/stage hierarchy; domain rows; contextual evidence access | No repeated distribution or normalized score on default overview |
| 4. Regional overview and Compare | Country coverage list, selected-country detail, simultaneous stage comparison and optional advanced measures | Shared scales, explicit reference cohort, complete/partial states reconciled |
| 5. Explore integration | Existing filters, facets, targets and figures accessible through consistent drill-down | All prior capabilities remain reachable; selected report and filters survive navigation |
| 6. Quality and release | Accessibility, method parity, responsive checks, export metadata and wording review | Pass the acceptance checks below before replacing existing primary navigation |

Use the existing HTML/CSS/SVG approach for bars, dots and simple matrices. Add a chart dependency only if a demonstrated interaction or volume requirement justifies it. Dense tables remain useful in Explore; not every existing table needs to become a chart.

## 12. Acceptance and validation

The proposal has not yet been user-tested or implemented. Treat these as proposed release criteria:

- A user can identify covered topics, the largest action stage and the source scope within 15 seconds.
- A user can reach supporting source evidence in at most two deliberate actions from a selected stage/topic.
- No participant in a small formative session interprets a stage index or relative position as percentage implementation; misunderstanding triggers a wording/layout revision. This is a usability gate, not statistical proof.
- Screenshot reconstruction reconciles: 57 + 13 + 21 + 24 + 9 = 124; 13 + 21 + 24 + 9 = 67; weighted total = 163; coverage = 42/64.
- Test current methods on: complete report, partial processing, no source, context-only topics, unmatched quotations, mixed points, same-point mixed types, unclassified statements, untagged statements and overlapping topic membership.
- Test regional behavior with 0, 1, 2 and several eligible countries; equal values; all-zero values; excluded partial reports; source-profile filters; historical report selection.
- Confirm pre/post-redesign metric parity for the same scope. Any intentional eligibility/display change has a named specification and does not overwrite historical calculations.
- Keyboard and touch reach every interactive chart action; focus stays visible; chart data has a semantic text/table alternative.
- Check normal text contrast of at least 4.5:1 and applicable non-text contrast of at least 3:1; color is never the sole carrier of meaning.
- Check 320px width, zoom/reflow, long labels, light/dark appearances, reduced motion and empty/error states. Avoid internal horizontal scroll except genuinely two-dimensional tables.
- Export and on-screen values reconcile after rounding; metadata carries selected report, units and filters.

## 13. Research informing the design

These sources inform the recommendations; they do not validate this particular tracker or its current scoring methodology.

- [Nielsen Norman Group: Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/) supports separating frequent tasks from advanced options while keeping the path to detail apparent. Applied here: simple Overview, explicit Advanced measures. This is design guidance; the exact grouping still needs user testing.
- [ONS visualization principles](https://service-manual.ons.gov.uk/data-visualisation/guidance/principles) supports clarity and a purposeful choice of visual. Applied here: directly labeled comparisons and restrained presentation.
- [Government Analysis Function: building and managing dashboards](https://analysisfunction.civilservice.gov.uk/policy-store/data-visualisation-building-and-managing-dashboards/) emphasizes user needs, maintenance and alternative access to data. Applied here: task-led views, accessible tables and evidence links.
- [Heer and Bostock, 2010: Crowdsourcing Graphical Perception](https://hci.stanford.edu/publications/2010/crowd-perception/heer-chi2010.pdf) investigates accuracy across visual encodings. It supports preferring aligned position/length for these comparisons; it does not establish that every bar layout will be usable.
- [OECD/JRC Handbook on Constructing Composite Indicators](https://www.oecd.org/content/dam/oecd/en/publications/reports/2008/08/handbook-on-constructing-composite-indicators-methodology-and-user-guide_g1gh9301/9789264043466-en.pdf) discusses transparency, weighting, normalization and sensitivity. Applied here: expose the existing indices' assumptions and underlying observations; do not invent another overall score.
- [W3C complex-image guidance](https://www.w3.org/WAI/tutorials/images/complex/) and [non-text contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) inform equivalent text/data access and distinguishable essential marks. Apply alongside [text contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) and [target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

## 14. Local evidence and review limits

Source inspection covered the active metric definitions, classification and aggregation rules, dashboard controls, country/domain/topic presentation, regional aggregation, colors, evidence detail, methodology and legacy scoring references. The supplied screenshot anchors the replacement concept. Earlier live observations inform the capability inventory; this revision does not claim a fresh full database or production audit.

| Source | Relevant responsibility |
|---|---|
| `src/lib/dashboard-metrics.ts` | Enabled metric menu, names/units, action selection, normalization and cohort eligibility |
| `src/lib/statement-types.ts` | Statement classifications and progression assignments |
| `src/lib/claim-score.ts` | Group resolution, sum, unmatched quotations and saved score behavior |
| `src/lib/documentation-stage.ts` | Source-matched topic means and equal-topic aggregate |
| `src/lib/documentation-score.ts` | Inventory, topic coverage, processing and report summaries |
| `src/lib/regional-dashboard.ts` | Stage grouping, pooled summaries and gap counts |
| `src/components/charts/documentation-dashboard.tsx` | Current selected-metric panel, duplicate distribution and domain presentations |
| `src/components/charts/metric-controls.tsx` | Raw/normalized naming and stage controls |
| `src/components/domains-view.tsx` | Simultaneous metric columns and topic details |
| `src/components/claim-details.tsx` | Statement types, points badges and source details |
| `src/components/methodology-content.tsx` | User-facing method definitions |
| `src/app/globals.css`, `src/lib/colors.ts` | Shared score/stage/deviation aliases and domain colors |
| `config/scoring/documentation.json` | Active average-stage rubric |
| `src/lib/scoring.ts`, `src/lib/topics.ts`, `config/scoring/rubric.json` | Legacy response-signal calculations still carried by topic data |

Next step: implement the semantic catalog and the focused overview prototype before extending the pattern across the regional and comparison views. The complete analytical inventory remains accessible throughout.
