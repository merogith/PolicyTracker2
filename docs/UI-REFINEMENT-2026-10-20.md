# Policy Tracker: dashboard refinement and pipeline decision

20 October 2026 · implementation note

This note records the latest user direction: retain the working application, simplify its screens, bring the reviewed dashboard into the application, and **defer OCR**. The current Luna domain-by-domain pipeline remains the processing path. The earlier [final upgrade plan](review/team/FINAL-UPGRADE-PLAN.md) remains useful background; its OCR and comprehensive packet-processing proposals are not activated by this UI update.

## 1. What this refinement changes

The design keeps the existing country, domain, topic and document structure. Its priority is a readable overview with details available on demand.

### Latest regional update

The user approved the response-first dashboard update. `/countries` now opens a regional overview with four views:

| View | What is live |
|---|---|
| Overview | Response groups, response-topic coverage, unambiguous implementation/output reports, context-only topic observations, stage bars, domain reach and clickable evidence gaps. |
| Country comparison | Domain matrix with response coverage, claim counts, any-finding coverage and an explicitly unavailable action-score mode. |
| Targets & finance | Reported figures as stated, with search, country/domain/conditionality filters, pagination, expandable full statements, document links and filtered CSV export. |
| Regional position | Country/domain/topic comparisons within matching source types, document counts, edition years, taxonomy and method. Absolute values, cohort mean and differences; population SD and z-scores in Statistical detail. |

Demo data is excluded from every regional total and benchmark. Demo country profiles remain accessible; figures can include demos only through an explicit labeled toggle. Partial results can contribute observed counts but not normalized comparisons. With fewer than two eligible countries, the regional mean/difference/z-score stay unavailable. If all eligible values are equal, the mean remains valid and z-scores are unavailable. The default profile selects the largest eligible cohort; users can select another source profile.

Response-stage bars use agreement among each group's actual member labels. A shared-quote group with different response stages, or a response mixed with context, remains **Mixed statements**. It is never promoted to the maximum stage. The implementation headline includes only unanimously underway/delivered groups. Figures do not expose their legacy maximum-stage field.

**Targets and financing are not yet qualified categories.** The existing schema contains source figures, units, periods and conditions; it does not reliably distinguish a target from a baseline, cost or projection. No totals of unlike quantities, financing-need/allocated/spent classifications, deadline completion rates or contradiction totals are invented. The figures count is a count of displayed source entries, not unique policies or targets.

**Trend arrows, neutral change placeholders and Change columns are removed from default screens.** A future comparable-edition history view can reintroduce actual changes. “Policy detail” is now displayed as **Documented action score**, keeping the reviewed four-check meaning. Legacy action scores remain unavailable.

| Layer | Intended presentation |
|---|---|
| Country overview | Response counts first, response-topic coverage, a domain wheel and links to context-only or missing-findings topics. |
| Domain dashboard | Clickable domain cards with response coverage and finding counts; switch measures in the country overview. |
| Focused domain | A compact topic table; select a topic to inspect its findings. |
| Finding | Two-line preview, reported stage, document count and quote count. Expand to read the complete statement, figures, tags and evidence. |
| Evidence | Exact quotations appear after expansion. The source-page link and text-match result remain visible. |
| Regional comparison | Compare the same metric and topic inventory; keep counts, coverage, action specification and regional position separate. |

Shortening a card does not shorten the stored statement or remove its evidence. The current disclosure component clips the preview visually; it restores the complete text when expanded. A concise source-grounded title is a recommended future extraction field, not a substitute for the retained assertion.

Use UNDP-inspired blue for navigation and actions. Reserve score/status colors for their stated metric. Color must be accompanied by a text label, value or symbol. Keep the familiar navigation and use progressive disclosure instead of adding another dashboard hierarchy.

### Implementation locations

- [Claim disclosure and evidence](../src/components/claim-details.tsx): compact preview and expandable complete evidence.
- [Country visuals and legend](../src/components/charts/documentation-dashboard.tsx): ring, domain wheel, domain tiles, metric switch and change symbols.
- [Domain and topic screens](../src/components/domains-view.tsx): focused topic tables, filters and expandable findings.
- [Regional matrix](../src/components/charts/country-matrix.tsx): shared domain inventory and metric labels across countries.
- [Dashboard data adapter](../src/lib/documentation-score.ts): observed counts and topic coverage; explicit unavailable policy-detail score and comparison state for legacy results.
- [Dashboard adapter tests](../src/lib/documentation-score.test.ts): coverage denominators, shared groups, incomplete processing and unavailable legacy scores.
- [Regional calculations](../src/lib/regional-dashboard.ts) and [tests](../src/lib/regional-dashboard.test.ts): demo exclusion, unanimous versus mixed stages, country/topic observations, cohort eligibility, mean, population SD and z-scores.
- [Regional figures](../src/components/regional-figures.tsx): searchable native values, progressive disclosure and export. No LLM is called by the dashboard.

The implementation and browser-check status are recorded at the end of this note.

> Superseded dashboard/scoring notes: use [DASHBOARD-GUIDE.md](DASHBOARD-GUIDE.md) for the currently implemented stage-based documentation score, terminology and connection repair. The four-check score below is retained as a historical proposal.

## 2. What the numbers, colors and arrows mean

Three concepts stay separate:

1. **Volume:** how many finding groups and response groups appear in the current extracted results.
2. **Topic coverage:** the percentage of the fixed topic inventory with at least one finding. Concern/context evidence also addresses a topic. The count of topics with a response is a separate measure.
3. **Policy detail:** how explicitly a coherent policy response states responsibility, action timeframe and a specific output. This is the reviewed four-check method; legacy results cannot yet supply it reliably.

For example, a country with findings on 48 of 64 topics has **75% topic coverage**. That does not mean its policies score 75/100, that implementation is 75% complete, or that every assertion in its documents was extracted.

The reviewed policy-detail bands remain:

| Score | Label | Color |
|---|---|---|
| 0 to below 25 | Limited policy detail | Red |
| 25 to below 50 | Basic policy detail | Orange |
| 50 to below 75 | Moderate policy detail | Amber |
| 75 to 100 | Substantial policy detail | Green |
| Unavailable | Assessment unavailable | Gray |

Do not apply these labels to topic-coverage percentages. Legacy findings do not contain the source-qualified fields needed for the four-check score; the adapter therefore returns an unavailable score instead of estimating one from narrative wording, figure dates or reported stage.

No change arrow or neutral trend placeholder is displayed in the current dashboards. A future history view may show a numerical change only between comparable assessments of the same document families under the same method. A method change or additional historical source is a refresh, not automatic policy improvement or decline.

Existing finding groups are provisional: the current merge groups items sharing source quotes. One group counts once nationally but may appear in several topics/domains. Do not add those domain counts to calculate a country total.

For response counts, a topic requires a response statement explicitly tagged to that topic. A different response in the same quote-sharing group does not upgrade a context-only topic. Only topics whose home domain is enabled enter the dashboard inventory; changing that inventory changes the comparison scope. Saved demonstration results are visibly marked and cannot establish a completed assessment.

## 3. Recommended pipeline: keep two logical stages

Luna's affordable domain calls are a reason to retain the working flow. A low price or successful quotation match does not establish complete extraction, so the next changes should improve coverage, source identity and field quality.

```text
Supplied PDFs
  → native text extraction and page index (no OCR)
  → Stage 1: document × domain extraction with Luna
      statements + topics + figures + original quotations
  → automatic source/schema checks and targeted recovery
  → Stage 2: country × domain organization with Luna
      common propositions + retained variants + source references
  → code computes counts, coverage and eligible scores
  → publish dashboard; users may flag or hide items afterwards
```

Within a country, independent document/domain tasks can run with bounded concurrency. Organization follows the document answers it depends on. A new document should reuse unchanged extraction results and refresh only affected country organization. There is no routine human validation queue.

Keep document results as well as combined country results. A combined claim links to its source statements; it must not erase document-specific values, conditions or quotations. A NAP's description of existing irrigation capacity can support the context of an NDC target without becoming the same assertion or proof that the target was achieved.

## 4. Next pipeline upgrades, in order

These are recommendations for the next processing change, **not work activated by the UI refinement**.

1. **Add source-supported fields without changing the domain workflow.** Extract a short display title alongside the full statement. Add actor with role, action timeframe, specific output/milestone, and evidence references for each. Distinguish the action's year from a publication year. Keep unknown values null. This enables the four-check score after automatic re-extraction or enrichment.
2. **Make retrieval coverage explicit.** Generate domain searches from all its topics and record the actual source chunks supplied to extraction. Returned pages and indexed pages are different measures. Label absence as “not found in retrieved evidence” while extraction remains retrieval-based.
3. **Add an automatic gap sweep when comprehensive coverage is activated.** Process source chunks never supplied to normal extraction, with the compact full taxonomy. This is another use of stage 1, not an extra narrative summarizer. Retain uncertain material instead of discarding it through a strict routing filter. Processing every source unit still does not prove perfect assertion recall.
4. **Strengthen organization.** Pass relevant exact spans and structured fields alongside source-record IDs. Group only compatible propositions; keep conflicting values, conditions and time periods as variants. Sharing a quotation or programme name is not enough to establish identity. Account for every input record, including unresolved singletons.
5. **Make publication and comparisons explicit.** Separate complete and partial processing; retain unresolved references and missing document answers. Compare editions within a known family and source scope. Backfill older results automatically before enabling the new score. Do not rescale the legacy −1/0/+1 response-signal rubric into the four-check score.

On output truncation, split the affected source/record task instead of repeating the unchanged oversized request. Reuse cached compatible work and preserve usage from every attempt. These are reliability improvements; no fixed cost saving or accuracy guarantee is assumed.

Implementation reference: the [OpenAI file-search guide](https://developers.openai.com/api/docs/guides/tools-file-search) documents `include: ["file_search_call.results"]` for returning retrieved results. Persisting those results is the recommended next audit improvement; file annotations alone are not the retrieval log.

## 5. Current limits to show honestly

- **OCR is deferred.** Scanned, image-only or garbled material is not recovered in this update. Keep unreadable-page indicators visible. A page containing some readable text may still contain an unread image/table.
- **Retrieval is selective.** All pages can be indexed without all content being supplied to the model. A successfully completed domain job is not a recall certificate.
- **Text matching is not factual validation.** It shows that quoted text was located under the matching rules; it does not establish that a label or interpretation is correct, or that a policy was implemented.
- **Existing grouping can combine separate propositions.** Counts remain observed/provisional until the identity upgrade; do not use them as audited canonical-claim counts.
- **Policy-detail scores and comparable trends need richer records.** Unavailable is preferable to an invented score or misleading arrow. Coverage and useful source-linked findings can still be shown now.
- **Countries have different document inventories.** Regional comparisons must display source coverage and scope; a missing source is not evidence of missing national policy.

## 6. Verification and activation record

Implemented in the existing Next.js application. The normal country/document routes, source viewer and analysis controls remain available. The navigation is shorter; findings use two-line previews with complete statements and evidence behind a disclosure.

Checks completed on 20 October 2026:

- **62/62 local unit tests passed**, including ten documentation-dashboard tests and ten regional-calculation tests. Regression coverage includes shared-quote response attribution, enabled-topic denominators, mixed stages, demo exclusion, incomplete processing, unavailable scores and comparable-cohort statistics.
- **TypeScript passed** (`tsc --noEmit`). Targeted ESLint passed for every changed TypeScript/TSX file, and again for the final corrections.
- The read-only saved-result checker found **64 answers, all done, zero invalid** at the time it ran.
- Browser checks covered all four regional views, response-first country overview, claim-count comparison, figures search and domain filters, regional-position eligibility and unavailable-score states, and context-only topic navigation. Earlier checks also covered compact combined claims, expanded full evidence, and the source-page link with its highlighted quotation. CSV export is implemented; its download was not exercised in the browser check.
- Fixed an SVG title hydration issue found during browser verification. No production build, broad device matrix or exhaustive accessibility audit is claimed.

Screenshots: [regional dashboard](../output/ui/regional-dashboard-2026-10-20.png), [response-first country dashboard](../output/ui/country-responses-2026-10-20.png), and [compact claims](../output/ui/compact-claims-2026-10-20.png).

**No OCR, database migration, corpus reprocessing or new paid model call was initiated for this update.** Production prompts, schemas and model settings remain unchanged. Comparable-cohort statistics are implemented for observed response coverage, with insufficient-data states where necessary. The source-supported action score and edition-to-edition trends remain next pipeline work; no score or trend is invented from legacy results. The older review ZIP remains a proposal snapshot, not the implemented code for this refinement.
