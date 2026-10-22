# Policy Tracker UI and UX Guidelines

**Purpose:** Guide the design of a clear, useful regional policy tracker for claims in Nationally Determined Contributions (NDCs), National Adaptation Plans (NAPs), and disaster risk reduction and resilience documents.

**Status:** Design inspiration and proposed frontend direction. This guide does not change the application's methodology or scoring rules. Features marked **Future** need additional data or assessment logic before becoming active controls.

**Prepared:** 20 October 2026

## 1. The experience to create

Help a user move from a broad policy question to an understandable, source-backed answer:

**Regional pattern → country or topic → claim → original evidence.**

The interface should feel like a calm research workspace. It should make a complex policy landscape navigable, help users compare like with like, and keep the supporting documents close to every conclusion.

The central user question is:

> What do these documents say, how specific are their commitments, how do they differ, and where can I check the evidence?

Design for three complementary qualities:

| Quality | What the user experiences |
|---|---|
| Desirable | Clear hierarchy, readable content, restrained colour, and meaningful summaries that invite exploration. |
| Efficient | Useful defaults, persistent filters, fast search, and short paths to source evidence. |
| Enabling | The ability to investigate a question, understand limitations, compare evidence, and export a usable result. |

## 2. Design around user tasks

| User task | Starting point | Successful outcome |
|---|---|---|
| Understand the region | Regional overview | Identify a pattern and open the claims behind it. |
| Investigate one country | Country profile | Find the relevant topic, commitments, and source documents. |
| Compare policies | Compare | Compare a defined metric across countries with visible source coverage. |
| Find a commitment | Explore | Search and filter claims or targets, then inspect exact wording. |
| Assess document quality | Future quality profile | See which published criteria are supported by evidence and where information is missing. |
| Prepare a briefing | Any filtered results view | Export the selected evidence with citations and scope information. |

A visitor should be able to browse existing results immediately. Put uploading, processing, and configuration where they support these tasks without dominating the reading experience.

## 3. Principles that guide every screen

1. **Show the scope beside the result.** Country, document type, edition, and assessment completeness affect interpretation.
2. **Make the evidence reachable.** Selecting a claim or chart segment should lead to the records that explain it.
3. **Reveal detail progressively.** Start with the answer; let the user expand quotations, methodology, and technical information.
4. **Preserve the user's place.** Filters, sort order, page, and scroll position should survive a drill-down and return.
5. **Use explicit language.** Prefer “Reported implementation” and “Quote matched” to an unexplained “Verified” badge.
6. **Make missing information legible.** Unknown, not assessed, and not found are different states.
7. **Give charts a task.** Each chart should support a comparison, a pattern, a change, or an investigation.
8. **Keep the default view focused.** Advanced metrics and classification facets remain available without becoming the first decision every visitor must make.

## 4. Information architecture

Use a small set of stable destinations. This is a proposed grouping; existing routes and components can support it.

| Destination | Main purpose |
|---|---|
| **Region** | Understand the collection, regional patterns, and topics to explore. |
| **Countries** | Find and open a country profile. |
| **Compare** | Compare countries by topic or domain using a selected metric. |
| **Explore** | Search Claims, Targets, and Reported figures as related views. |
| **Documents** | Inspect sources, their coverage, and processing status. |

Keep **Methodology** consistently accessible. Place **Manage** functions such as taxonomy editing and processing runs in a secondary navigation group.

Within a country, use five clear sections: **Overview, Topics, Claims, Targets, Documents**. Keep less frequent views in a labelled overflow menu or within the relevant section.

Show the current country and provide a country switcher. Use breadcrumbs for deeper views, for example:

`Region / Country / Water / Drought`

## 5. Regional overview

The first screen should answer: “What is in this collection, and what is worth exploring?”

Recommended order:

1. Title and a one-sentence explanation of the tracker.
2. Collection scope: countries, source documents, document types, and update date.
3. Three summary measures: topic coverage, action claims, and reported action-stage distribution.
4. A country-by-domain matrix with a clear metric selector.
5. A short set of evidence-linked exploration prompts.

```text
Regional policy tracker                         Explore claims
Claims from NDCs, NAPs, and DRR documents
Collection scope · source types · last updated

[Topic coverage] [Action claims] [Reported stages]

Compare countries by domain
[Metric] [Countries] [Document scope] [More filters]
------------------------------------------------------------
Country       Water       Agriculture       Health       ...
Country A     value       value             value
Country B     value       value             value
------------------------------------------------------------
Each cell opens the records behind that value.

Explore the evidence
[Drought commitments] [Early warning measures] [Finance]
```

Use real, reproducible queries for exploration prompts. A prompt such as “Explore early warning commitments” can open a filtered claim list. Claims about a regional trend need an explicit calculation and a link to its evidence.

An optional map can help users locate countries. Retain a searchable list or matrix as the main analytical view, where small countries and close values remain easy to compare.

## 6. Country profile

Begin with the country's source context: available document types, editions, and assessment status. A compact source strip should reveal which documents contribute to the displayed results.

The overview should contain:

- A short summary of documented priorities, with links to supporting claims.
- Topic coverage and a distribution of reported action stages.
- Domain rows showing coverage, claim counts, and a direct route into the topic.
- A compact source list with document titles and editions.

Prefer domain rows to a large wall of repeated cards. Rows make it easier to compare Water, Agriculture, Health, Energy, and Disaster Risk Reduction without excessive scrolling.

**Future:** An edition-change summary can show added, revised, superseded, or unchanged commitments once claim relationships across editions are reliably represented. Until then, offer side-by-side document and claim views without assigning change labels by guesswork.

## 7. Claims and targets explorer

Make this the main working surface for users who arrive with a question.

### Search and filters

- Search claim wording and supporting quotations. Explain the searchable scope near the field.
- Show the most useful filters first: country, domain or topic, and statement type or action stage.
- Put hazards, affected groups, policy instruments, geography, and other facets under **More filters**.
- Add document-type and edition filters only when their source attribution is available and accurate.
- Show selected filters as removable chips, with a visible **Clear filters** action.
- Define selection behaviour consistently: multiple values within a facet mean OR; different facets combine with AND. Label any alternative mode.
- Make result counts describe the selected scope. Distinguish unique claims from source findings.
- Keep sorting predictable. Show the active sort and use relevance only when search ranking supports it.

### Results

Use a table on wide screens and compact rows or cards on narrow screens. Default columns:

| Claim or target | Country | Topic | Statement or stage | Sources |
|---|---|---|---|---|
| Clear, readable summary | Country name | Primary topic | Explicit label | Document and page links |

Show only a few useful labels in each row; reveal the full classification in the detail view. Keep claim text visually dominant.

Targets need their own structured fields: stated value, unit, baseline, target year, scope, and conditionality where available. Preserve the original wording. Display missing fields as “Not stated” or “Not extracted” according to the evidence state. Separate targets from observations, projections, and finance figures using their extracted fact roles.

**Export results** should include the entire filtered result set, not just the current page. Explain the export scope and retain country, document, page, and quotation references.

## 8. Evidence detail view

On wide screens, open a side panel so the result list remains visible. On small screens, use a full-screen detail view with an obvious return action.

Order the content as follows:

1. Claim summary and statement classification.
2. Source document, edition, and quoted page.
3. Exact quotation, visually separated from the extracted summary.
4. **Open source page** action.
5. Other supporting or conflicting source passages, when available.
6. Additional labels and structured facts.
7. Explanation of the classification or metric, if supported by stored data.

Keep the summary and source wording distinct. Use “Quote matched” to describe a successful text match; it establishes that the passage appears in the source. Delivery and real-world results require their own evidence.

Closing the panel should restore focus to the selected row. Copying a citation should produce usable document, edition, page, and quotation information.

## 9. Comparisons that users can interpret

Use a matrix for broad country-by-domain comparison and horizontal bars for a selected topic. Offer raw values by default, with regional standardization as an explicit secondary view.

Every comparison needs:

- The selected metric and its unit.
- The source documents or source-selection rule.
- The number of eligible countries in the benchmark.
- Visible incomplete or unavailable states.
- A route from a value to the contributing claims.

Keep raw values accessible when standardization is selected. Explain that a regional standardized score describes position relative to a reference group. The existing method maps the regional raw mean to 50; it does not express implementation percentage or an observed percentile.

The existing reference uses complete, non-demo assessments and remains fixed when display filters change. Preserve that behaviour unless a separately versioned methodological change is intentionally introduced. Show which reference is being used.

Make document differences visible: an NDC-only profile and a profile containing an NDC, NAP, and implementation report have different evidence coverage. A matching-source comparison should disclose exclusions and preserve access to the broader collection.

## 10. Metric and evidence language

The current tracker supports topic coverage, claims, action claims, claim points, and average action stage. The frontend must preserve their meanings.

| Display label | Meaning to preserve |
|---|---|
| **Topic coverage** | Topics with extracted claims out of the relevant enabled topic inventory. Show the numerator and denominator. |
| **Claims** | Grouped extracted statements. Topic and domain totals can overlap. |
| **Action claims** | A subset of claims describing commitments, plans, or reported implementation. |
| **Average action stage** | Mean reported stage of eligible action claims, aggregated under the active rubric. |
| **Claim points** | A stage-weighted total affected by both the number and stages of claims. |
| **Quote matched** | Supporting text was matched to its cited source passage. |

The current action-stage display maps commitment, planned action, implementation underway, and output delivered to 25, 50, 75, and 100. These are index values, not percentages of completed work. Topics without action claims remain outside the numerical stage average and need their own visible count. Partial averages can rise or fall as analysis continues.

Put claim points in advanced comparison controls. A larger volume of extracted statements should not visually imply better policy quality.

### Future document-quality profile

Introduce quality as a separate assessment when evidence-backed criteria are available. Begin with criterion-level results, then consider aggregation after the rubric has been defined and checked.

Candidate dimensions include:

- Clarity and specificity of commitments.
- Responsibilities and implementation arrangements.
- Financing and support needs.
- Monitoring, indicators, and review arrangements.
- Inclusion and participation.
- Consistency between risks, objectives, and measures.

Use document-specific expectations for NDCs, NAPs, and DRR strategies. Distinguish evidence in the selected document from evidence in a linked supporting instrument. Give every criterion a source and an explanation.

Example states: **Explicitly documented, Partly documented, Not found in assessed sources, Not assessed, Not applicable, Documented in a supporting source**. “Not applicable” needs a rationale. A referenced but unavailable supporting document is a separate unresolved state.

## 11. Visual language

Use a restrained palette, clear typography, and strong alignment. Let policy content carry the page.

| Element | Recommended treatment |
|---|---|
| Background | A light neutral canvas with white or subtly tinted content surfaces. |
| Main text | Dark, high-contrast text; readable body copy around 16 px. |
| Supporting text | Muted but readable; reserve compact sizes for short metadata. |
| Accent | One consistent colour for navigation, selection, and primary actions. |
| Stage labels | Distinct labels and a consistent sequential palette, supported by text. |
| Missing or incomplete data | Neutral treatment with an explicit state label. |
| Numbers | Aligned columns and tabular numerals. |
| Spacing | A consistent 4/8 px spacing rhythm; generous separation between analytical sections. |

Avoid using red and green as a universal judgement of country performance. Stage, missing evidence, processing errors, and relative benchmark position have different meanings and need distinguishable treatments.

Use short, purposeful transitions. Hover effects should clarify interactivity. Animation should not distract from reading or imply that an analytical result is more certain than it is.

### Chart selection

| User question | Preferred visual |
|---|---|
| Which topics are documented where? | Heatmap with visible values and an accessible table. |
| What stages are reported? | Stacked horizontal bars with counts or denominators. |
| How do selected countries compare? | Sorted horizontal bars or a compact matrix. |
| Which quality criteria have evidence? | Criterion checklist or evidence matrix. |
| What changed across editions? | Future edition comparison or claim timeline. |
| How does a risk connect to a response? | Future linked evidence chain. |

Keep legends and scale definitions near charts. Selecting a segment should filter the associated evidence. Prefer direct comparison views over radar charts when users need to read precise differences.

## 12. Loading, empty, and incomplete states

| Situation | User-facing message | Useful next action |
|---|---|---|
| No documents for a country | “No source documents added yet.” | Add a document. |
| Analysis running | “Analysis is in progress. Results shown so far are partial.” | View available results or processing details. |
| No filter matches | “No claims match these filters.” | Remove a filter or clear filters. |
| Completed topic with no action claims | “No action documented in the assessed sources.” | Inspect context claims or source documents. |
| Topic not assessed | “This topic has not been assessed.” | View assessment status. |
| Unreadable pages | “Some pages could not be read.” | Show affected pages and available analysis. |
| Unmatched quotation | “Source text could not be matched.” | Open the cited document and passage details. |
| Comparison unavailable | “Not enough complete assessments for this comparison.” | Show available raw results. |
| A request failed | “This view could not be loaded.” | Retry while preserving filters. |

Background updates should preserve the reader's position. For changing results, show an “Updated results available” notice instead of silently reordering the visible list. Keep model identifiers, run IDs, and diagnostic errors in processing details.

## 13. Responsive, accessible, and efficient interaction

- Make navigation, filters, table rows, and evidence controls usable by keyboard.
- Provide visible focus, descriptive control labels, and predictable focus restoration.
- Use text or icons alongside colour to communicate states.
- Design comfortable touch targets, aiming for approximately 44 px where practical.
- Let filters open in a drawer on small screens; keep active filter chips visible afterward.
- Avoid page-level horizontal scrolling. Wide matrices can have their own labelled scroll area and a list alternative.
- Support readable text at increased zoom and reduced-motion preferences.
- Announce loading and updated result counts without repeatedly interrupting screen-reader users.
- Keep navigation and filtering responsive while document processing continues.
- Paginate large claim lists; render source viewers when requested rather than loading every PDF on page entry.
- Preserve state in shareable URLs where possible. A shared link should reproduce scope, filters, metric, and sort order.

## 14. Priorities for frontend work

| Priority | Work | Completion signal |
|---|---|---|
| **1 — Core investigation** | Clear navigation, focused overview, claims search, evidence panel, visible source scope. | A user can move from a regional pattern to its original quotation without losing context. |
| **2 — Effective comparison** | Consistent filters, matrix drill-downs, source-composition context, explicit metric definitions. | Users can explain what a comparison means and what evidence it includes. |
| **3 — Usable outputs** | Filter-aware exports, citation copying, persistent view state, responsive refinements. | Users can take a reproducible evidence set into a briefing. |
| **4 — Richer assessment** | Document quality, claim relationships, edition changes, and risk-to-action connections. | Each new visual is supported by structured evidence and a defined method. |

Prototype the core investigation journey first. Reuse the current claims, topic, comparison, and source components where they already support it. Keep methodology changes separate from layout changes so a redesign does not silently change the meaning of an existing result.

## 15. Review checklist

- [ ] A first-time user can explain what the tracker measures after reading the first screen.
- [ ] The source scope and assessment completeness are visible beside analytical results.
- [ ] A user can find a country's drought action claims and open a source passage in a short, predictable sequence.
- [ ] Returning from evidence preserves search, filters, and position.
- [ ] Chart selections open the corresponding records.
- [ ] Claims, targets, projections, and reported figures have distinguishable meanings.
- [ ] Stage scores cannot be mistaken for policy quality or completion percentages.
- [ ] Unknown and missing states are distinguishable from zero.
- [ ] Comparisons disclose document coverage and benchmark eligibility.
- [ ] Exports preserve scope, citations, and the relevant methodology version.
- [ ] The main journey works with keyboard navigation and on a narrow screen.
- [ ] Proposed features with missing data are deferred or clearly explained.

For a small usability check, ask users to locate a drought commitment, compare two countries on one topic, inspect the source, and export the evidence. Observe where they hesitate, lose context, or misinterpret a metric. Use those observations to refine the interface.

## 16. Inspiration and methodological references

These resources inform different parts of the design. Their criteria, data coverage, and assessment methods are not interchangeable.

| Reference | Use as inspiration for |
|---|---|
| [NAP Trends](https://trends.napglobalnetwork.org/) and its [methodology](https://trends.napglobalnetwork.org/about) | Country summaries, thematic exploration, enabling factors, and explicit document scope. |
| [WRI Climate Watch NDC data](https://www.wri.org/data/climate-watch-nationally-determined-contributions-ndc-data) | Structured NDC comparisons and target fields. |
| [Climate Policy Radar](https://app.climatepolicyradar.org/) and [experimental Targets Explorer](https://labs.climatepolicyradar.org/targets/) | Searchable document evidence and extracted target exploration. |
| [UNDP NDC 3.0 Quality Assurance Checklist](https://www.undp.org/publications/quality-assurance-checklist-nationally-determined-contributions-ndcs-30) | Future NDC quality criteria, including information in supporting instruments. |
| [Woodruff and Regan — Quality of national adaptation plans](https://doi.org/10.1007/s11027-018-9794-z) | National adaptation-plan evaluation principles. |
| [ADAQA research](https://www.nature.com/articles/s42949-023-00085-1) and [Adaptation Scoring Tool](https://www.lcp-initiative.eu/climate-change-scoring-tool/) | Plan-quality profiles and consistency between risks, measures, and evaluation. Developed for urban adaptation planning. |
| [Sendai Framework Monitor](https://www.undrr.org/implementing-sendai-framework/monitoring-sendai-framework) and [Target E assessment](https://www.undrr.org/publication/documents-and-publications/status-report-target-e-2023) | DRR indicators, regional drill-downs, and strategy alignment. |
| [Climate Action Tracker methodology](https://climateactiontracker.org/methodology/) | Clear separation of targets, implemented policies, and assessed emissions implications. Its modelling-based ratings cannot be inferred from document claims alone. |

The proposed layouts and interaction rules in this guide are a design synthesis for this project. They do not imply that the referenced platforms implement every suggested feature.
