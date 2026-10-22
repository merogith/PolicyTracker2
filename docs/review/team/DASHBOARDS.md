# Dashboard screens and interaction

**Current proposal: [presentation 4.1 / scoring method 4.0](../ui-scoring/README.md).** Try the [interactive mockup](../ui-scoring/dashboard.html). All demonstration countries and values are synthetic. The [scoring method](../ui-scoring/METHOD.md) defines the shared calculations, legend and light UN-framework alignment.

## Country first

Show selected sources and date, one documentation score, unique claims, response claims and addressed-topic count. Keep every domain accessible as a colored card with its score, claim count, topic coverage and change arrow. Offer a radial overview for pattern recognition and aligned bars for precise comparison.

Selecting a domain opens a focused screen with its topic rows: topic, claims, responses, average score, status color and change. The country overview is replaced, so users do not scroll past it repeatedly. Breadcrumbs return to the overview; a domain selector permits direct switching. Counts use primary-topic ownership; related claims appear separately and are not added to country totals. A topic can receive secondary-topic response credit only through its own evidenced projection.

## Topic, claim and source

Selecting a topic opens a focused evidence screen with a clear return to the domain topics. Show a response's 1-4 points, Responsibility / Timeframe / Output or milestone checks and its separately labeled planned / implementation reported / output delivered stage. Show context and concerns without a score. Keep incompatible variants together with their sources; link supporting capacity and actions without treating them as proof of delivery.

Selecting a source reveals its quotation and page. In the production interface this opens the corresponding physical PDF page. Method fields and technical diagnostics remain collapsed. A detailed planned response can score 4/4; the stage label prevents that from being presented as completed work.

## Regional comparison

Use aligned country bars and a country-by-domain matrix. A domain/topic selector supports focused comparison. Keep the same topic basket and source-profile rules across the eligible cohort, disclose its size and show exploratory or incomplete countries explicitly. A single eligible country is insufficient for a regional benchmark. Country rank is not the default.

Unknown values display a gray dash. Bounds, where useful, belong in details; they are possible arithmetic ranges, not measured scores or statistical confidence intervals. Do not put a partial lower bound on a bar as if it were a finished estimate.

## Document comparison

Keep document-local scores and evidence separate from the combined country result. Selecting the NDC must not borrow a responsible actor or progress assertion from the NAP. The eventual comparison table aligns target, baseline, timeframe, condition and source-local stage across documents. An omitted statement means 'not repeated', not automatically withdrawn.

## What stays secondary

Use UNDP-inspired blue for navigation, selected states and structure. Reserve red/orange/amber/green for Limited / Basic / Moderate / Substantial policy detail; gray means Assessment unavailable. Keep full meanings and exact score intervals in the shared legend, with a short key near the overview. Arrows retain their separate documentation-change meaning. These are tool-specific bands, not UN performance classifications.

Source-linked country priorities can change sorting and focus, never silently change comparison weights. Reported implementation, contradictions, conditions, hazards and affected groups are filters or badges, not hidden scoring bonuses. Technical run logs belong in diagnostics.

Flags and visibility controls act after publication. A local hide preference must not silently alter shared regional scores; analytical exclusions require an auditable new snapshot and stated reason. The review mockup demonstrates local flags only, without persistence to an application database.

## Configuration

The production settings screen should edit one versioned bundle: domain/topic labels, enabled facets, prompt text, model/size limits and scoring presentation. Provide import/export, change-impact preview and restore. Basic options appear first; schemas and exact rendered requests are advanced details. No settings page becomes a required country-review gate.

If extraction or organization remains partial, publish the available source assertions with a clear partial label, preserve lineage and withhold unjustified exact aggregate scores. Automatic completion publishes a newer snapshot. No manual acceptance step is introduced.
