# A layered dashboard: counts, scores, colors and change

**Presentation 4.1.0 / scoring method 4.0.0 - proposed, not active. Updated 20 October 2026.** This replaces the coverage-only dashboard recommendation in the earlier v3 review. The two-stage extraction pipeline, evidence provenance and 16-domain/64-topic taxonomy remain the starting point.

The latest refinement uses a restrained UNDP-inspired blue, clearer navigation and more neutral policy terminology. Its framework alignment is light: country context, risk-informed planning and traceable evidence. The [method](METHOD.md) explains the NAP, Sendai and transparency principles; they do not add indicators, model calls or an approval stage.

The user's SDG screenshots guide the visual hierarchy: a country summary, domain overview, colored tiles, indicator-like topic rows and regional comparison bars. The quantities here are derived from policy claims; they are not copied SDG indicators or country results.

## What the layers show

| Layer | Main information | One click reveals |
|---|---|---|
| Country | Documentation score /100, unique claims, topics with responses | Domain summaries and source scope |
| Domain | Score, status color, change arrow, claims and addressed topics | Topic rows |
| Topic | Claims, scored responses, average score, status and change | The underlying common claims |
| Claim | Four-point documentation checklist, statement type and sources | Exact evidence, variants and supporting context |
| Source | Document, page, quotation and source-local assertion | Comparison with another document |

The regional view compares the same domain/topic scores and shows a named eligible cohort. The document view preserves each source's own claims and checks. A combined claim repeated in two documents counts once in the combined view; its source occurrences remain visible.

## The recommended visual hierarchy

1. **Country overview:** one score gauge, one claim-count summary and one topic-coverage summary. Show source profile/date beside the country name. Use the same score in every visual.
2. **Domain overview:** compact colored domain cards with score, arrow and claim count. A radial overview provides the pattern across all domains; aligned bars provide precise comparison.
3. **Focused domain screen:** selecting a domain replaces the overview with its topic table: topic, claims, responses, average score, color and arrow. A breadcrumb returns to the overview; a domain selector switches directly between domains.
4. **Focused topic screen:** selecting a topic opens its claim evidence, with a clear return to the domain topics. Show short statements and 1-4 points, with responsibility, timeframe and output/milestone checks. Planned, implementation reported and output delivered remain separate labels. Sources, disagreements and support open underneath.
5. **Region:** aligned country bars and a country-by-domain comparison. Show cohort size and incomplete/excluded cases. A rank is not needed on the first screen.
6. **Documents:** compare NDC/NAP assertions and their source-local scores. Selecting a different document changes the evidence scope, not historical facts.

## What changes from the previous proposal

| Previous recommendation | Revised recommendation |
|---|---|
| Coverage percentages were the headline | A documentation score /100 is the headline; counts and coverage explain it |
| Claim scores were hidden diagnostics | Show a simple four-point score on every eligible response claim |
| One best response could set the topic band | Average the distinct response claims in that topic |
| Domain summaries were neutral coverage bars | Use score-driven color, an explicit number and a separate change arrow |
| Counts were secondary | Show unique claim and response counts at each relevant layer |
| Four evidence bands drove the main colors | One shared numerical score legend drives the revised interface |

The earlier topic bands may remain internal diagnostics during migration. Do not display two competing status-color systems on the same dashboard. Context remains counted and visible, but it does not receive a poor-quality score merely for being context.

## Read and try

The common score legend is **Limited policy detail (0 to below 25), Basic policy detail (25 to below 50), Moderate policy detail (50 to below 75), Substantial policy detail (75 to 100)**. Gray means **Assessment unavailable**. These are documentation bands, not implementation stages or official UN ratings. Color, text and numerical value appear together.

Navigation blue follows the [UNDP data-visualization palette](https://data-viz.data.undp.org/color-palette). Analytical colors retain their scoring meaning. Local font fallbacks, light/dark surfaces and modest corner radii keep the prototype portable. No official emblem is added.

- [Method and worked examples](METHOD.md): points, averages, colors, arrows, limitations and source references.
- [Editable scoring settings](scoring.json): the proposed rubric and presentation thresholds.
- [Reference calculator](scoring.mjs) and [tests](scoring.test.mjs).
- [Synthetic examples](examples.json): invented country and document evidence, never real assessments.
- [Interactive dashboard](dashboard.html): local review mockup; the same interface is shown in the conversation.
- [Team review PDF](policy-tracker-ui-scoring-revision.pdf): design, updated process diagrams, screens and scoring method.
- [Verification and reproduction](VERIFICATION.md): tested behavior and delivery limits.

## Integration plan

Follow the [final upgrade plan](../team/FINAL-UPGRADE-PLAN.md) for integration. Its complete source-packet extraction, titles, unit accounting and OCR/evidence additions supersede the earlier assumption that model inputs could remain unchanged. The existing sourced response/actor/timeframe/deliverable concepts remain sufficient for the four-check score. Code calculates that layer after grouping; no scoring LLM and no manual acceptance queue are added.

1. Add the four-check calculator and deterministic claim-count ownership rules.
2. Freeze per-topic claim inventories and scoring/source versions before comparing averages.
3. Replace the headline data adapter and color/arrow mapping consistently across country, domain, topic and document views.
4. Add the shared claim/source detail view, regional cohort comparison and source-local calculations.
5. Run extraction/grouping stability and score-sensitivity checks on representative NAP/NDC documents before activation.

The prototype and calculator are review artifacts. They do not connect to the current application or establish live extraction accuracy. All demonstration countries and values are synthetic. Original v3 review files are preserved in docs/archive/policy-tracker-review-v3.zip.
