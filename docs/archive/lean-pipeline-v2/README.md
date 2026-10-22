# Climate and disaster policy tracker — review pack

Recommended specification **2.0.0 · 19 October 2026**. Editable files and a tested scoring reference; **not activated in the application**. Current application files are preserved in `runtime-reference/`. No country results have been regenerated.

Use four documentation bands: **No evidence found → Context documented → Policy response documented → Delivery details documented**. Show reported progress, contradictions and processing completeness separately. These describe supplied documentation, not climate performance or the adequacy of ambition.

Keep two LLM stages: extract per document/domain, then organize the country's records into common claims. Code pools records and calculates bands. No third routine LLM pooling/scoring stage and no human approval queue before publication.

## What to open

| Need | File |
|---|---|
| Team overview and examples | [HANDBOOK.md](HANDBOOK.md) |
| Shareable seven-page handbook | [handbook.pdf](handbook.pdf) |
| Step-by-step workflow | [PROCESS.md](PROCESS.md) |
| Editable overview and engineering diagrams | [pipeline.drawio](diagrams/pipeline.drawio) |
| Diagram previews | [Simple](diagrams/pipeline-simple.svg), [detailed](diagrams/pipeline-detailed.svg) |
| Four bands and exact rules | [SCORING.md](SCORING.md) |
| Dashboard | [Design](DASHBOARD.md), [interactive example](dashboard-preview.html) |
| Every domain, topic and label choice | [TAXONOMY.md](TAXONOMY.md) |
| Proposed data fields | [DATA-DICTIONARY.md](DATA-DICTIONARY.md) |
| Prompt assembly and explanation | [PROMPTS.md](PROMPTS.md) |
| Proposed prompt files | [Extract](prompts/extract.md), [organize](prompts/organize.md), [maintenance retag](prompts/retag.md) |
| Actual current scripts and LLM inputs | [RUNTIME-INPUTS.md](RUNTIME-INPUTS.md), [CURRENT-PIPELINE.md](CURRENT-PIPELINE.md), [runtime snapshot](runtime-reference/README.md) |
| Changes and implementation | [PLANNED-CHANGES.md](PLANNED-CHANGES.md), [IMPLEMENTATION-PLAN.md](IMPLEMENTATION-PLAN.md) |
| Engineering decisions | [DESIGN.md](DESIGN.md) |
| Editable configuration | [config/bundle.json](config/bundle.json) |
| Synthetic multi-document example | [examples/water.json](examples/water.json) |
| Executable scoring reference | [reference/score-bands.mjs](reference/score-bands.mjs) |
| Primary references | [METHOD-SOURCES.md](METHOD-SOURCES.md) |
| Checks and implementation boundary | [VERIFICATION.md](VERIFICATION.md) |

## Recommended decisions

1. Preserve the existing **16 domains and 64 topic codes**. One home per topic; cross-links elsewhere. Stay within regional climate and disaster scope.
2. Preserve document records and evidence. Common claims organize them; they never replace them.
3. Keep targets, actions and supporting capacity distinguishable. Shared topic alone does not justify merging.
4. Use four bands and three delivery checks: **who, when, what specifically**. No LLM-generated numerical score.
5. Compare topic distributions and the share with documented responses. Incomplete work creates a range, not a negative score.
6. Publish automatically after bounded machine checks. Users can flag or hide afterward.
7. Edit prompts, labels, taxonomy and rules through one versioned bundle. Display-only changes need no LLM calls.

## Options: simple SWOT

| Option | Strength | Weakness | Opportunity | Threat |
|---|---|---|---|---|
| One call over all country PDFs | Easy prototype | Repeats old context; weak document history | Exploratory narrative | Lost evidence and unstable grouping |
| **Two stages plus code pooling** | Reuses extraction; preserves both views | Needs identity and coverage checks | Incremental updates and targeted repair | Search misses or over-merging |
| Exhaustive page extraction then organization | Explicit page-processing coverage | More tokens and duplicate records | Optional thorough mode | OCR/table errors remain |

| Scoring option | Strength | Weakness | Opportunity | Threat |
|---|---|---|---|---|
| **Four bands plus separate badges** | Explainable; deterministic | Less numeric granularity | Fast topic comparison | Mistaking documentation for implementation |
| Weighted 0–100 composite | Familiar ranking | Arbitrary trade-offs and missingness hidden | Specialist analysis later | False precision and document-volume advantage |
| Z-scores of band codes | Compact relative position | Ordinal distances and small cohorts mislead | Not needed initially | Rankings move when cohort changes |

## What changed

The earlier proposed claim percentages and five-component topic score are replaced by four bands. Domain averages of band codes and default z-scores are removed. Supporting context cannot raise an unrelated target's band. The pack adds coherent delivery rules, missing-processing ranges, exact runtime exports, editable diagrams, a dashboard example and executable fixtures.

The current application's −1/0/+1 scoring is documented as the migration starting point. Proposed files here are not silently used by current workers. Application integration and real-source evaluation remain necessary before claiming production extraction accuracy or cost savings.
