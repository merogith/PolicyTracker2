# Dashboard presentation demo

21 October 2026. Local, isolated preview of the [reviewed design plan](../../proposals/dashboard-unification-final-plan-2026-10-20.md), refined using the user's navigation reference and [brainstorming guide](../../proposals/POLICY-TRACKER-UI-UX-GUIDELINES.md).

Open `http://127.0.0.1:3000/design-preview?country=KAZ` with the existing development server running.

## Latest implementation: score and color hierarchy

The demo and regular country domain cards now share saturated score badges, tinted cards, colored top edges and one readable color key. Fresh country Overview and Domains pages start with **Average action stage /100**, with topic coverage as secondary context. Explicit measure/scale links are preserved. The same Original/Normalized labels are used in shared controls. Counts and claim points remain available; their colors still mean regional comparison, while original action-stage colors use the existing absolute bands.

The regular country cards are now implemented locally, along with shared metric controls and legends. This is a scoped adoption, not a rollout of the entire preview layout. The regional matrix no longer repeats numerical deviation annotations. Calculations and thresholds are unchanged. A stage score that would round across a color boundary keeps additional display precision (for example, 49.8 rather than an orange 50).

Validation: TypeScript, scoped ESLint and 44 score/dashboard tests passed, including a regression check for display rounding at color boundaries. Browser checks cover the real country route, preserved explicit metrics and report links, normalized scores, drill-down and narrow layout.

## Try this

Start with Overview: a six-domain radar, reported-stage bars and clickable domain cards. The seven familiar country navigation items are retained. Overview and Domains & topics stay inside this preview; Claims, Targets, Reported figures, Regional position and Documents open their existing working screens with the selected report context.

Fresh Overview and Domains & topics links start with **Average action stage · Original**. Explicit metric/scale links remain respected. This is a presentation default, not a scoring change.

1. Select a domain to reveal its topic tiles. A tile opens the existing evidence view with its report and selected metric.
2. Change the measure: Claim points, Average action stage, Claims, Action claims or Topics covered.
3. Switch between Original and Normalized. Coverage retains its original fraction and does not offer normalization.
4. Select a comparison country. Blue circles and magenta diamonds distinguish countries; connected dots show the difference on one shared axis.
5. Select Region to explore the country-by-domain matrix. Click a cell to open that country's domain.
6. Select All domains for the full taxonomy. The initial six appear in the same order in both views.
7. Switch Radar/Bars to see the same values represented differently. Select a radar label with mouse or keyboard to inspect its topics. View values expands a numerical table.
8. In the bottom Domains & topics section, select a domain card to reveal named topics in that same section. Each topic opens its evidence. All domains or Escape returns to the cards and restores focus. On mobile, six cards show first; All 16 domains reveals the rest. This local browse selection resets on refresh or a country change; the top chart's URL selection is unchanged.

## Design demonstrated

Coverage and action claims sit above a single measure toolbar. Domain tracks support exact comparison; compact domain cards make the complete taxonomy easy to browse. The existing comparison colors communicate relative position; independent identity colors distinguish the two countries. Topic details appear only after selection. Reported stages use one compact bar chart with counts. Methodology remains accessible without explanatory paragraphs in the workspace.

The latest review replaces only the bottom topic-square landscape. Each full-card button contains a domain name, one selected value, a short coverage context and a colored bar. All 16 domain bars share one range; all 64 topic bars share another range, consistent across drill-downs. Bounded metrics use 0–100. Original counts use their maximum within each level, with the range labeled once. Colors retain their existing meaning, independently of bar length. The common metric/normalization toolbar also drives the cards; no duplicate controls or numeric deviation text are introduced. Opening a card leaves the upper chart, navigation and summaries unchanged.

The default six are Climate; Disaster Risk Management; Agriculture & Food; Water; Nature, Forests & Land; and Energy. This is a presentation preset, not a new score, a ranking or a taxonomy change.

Radar axes have a fixed domain order and one common scale. Average action stage, coverage and normalized values use 0–100; original counts use the shared count range also used by the bars. Counts are never normalized separately per axis. The polygon is not a composite score. A peer replaces the neutral regional reference, keeping at most two series. Missing vertices remain absent and break the line; they never become zeros or a closed filled polygon. Blue circles and magenta diamonds distinguish countries. The established comparison/stage palette remains on bars, topic cells and the regional matrix.

The overview favors a quick shape comparison; Domains & topics retains exact-value comparison tracks. The readable chart table and keyboard-accessible drill-down follow the [W3C guidance for complex chart alternatives](https://www.w3.org/WAI/tutorials/images/complex/). Completed scopes without action claims show an em dash, a short label and an outlined empty track; unavailable metrics show an em dash, an Unavailable label and a neutral hatched track. Real zero values stay zero. Numerical deviation annotations remain absent.

## Data and scope

- Loads the current selected country reports; an explicit `report` query parameter preserves a selected saved report.
- Reuses `buildDocumentationDashboard`, `buildResponseStages`, `buildRegionalReferences`, `metricValue`, `normalizedMetric`, `documentationBand` and `deviationBand`.
- Uses the existing default action-stage definition. Advanced stage filtering remains in the current dashboard.
- Counts each country's claims using existing grouping; domain totals are not presented as additive country totals.
- Preserves unavailable normalized values and excludes demonstration reports from regional references.
- No data writes, extraction changes, new scoring formula or navigation replacement. The shared card treatment and country defaults are applied to regular local profiles; the full radar overview remains in the preview.
- No additional chart dependency. Responsive HTML/CSS and existing icons support native controls, keyboard interaction, numerical labels, shape distinction, dark appearance and reduced motion.
- The preview is separate at `/design-preview`; it does not add a public navigation entry. It is a local working prototype, not a deployed release or a feature-flagged production feature.

## Validation

The latest bottom-card revision passed TypeScript and scoped ESLint. Direct in-app-browser checks covered all 16 domains and 64 unique report-aware topic links, five metrics, normalization, distinct zero/no-action/unavailable states, keyboard activation/Escape/focus return, mobile expansion and 320px/390px layouts. Selecting a bottom card leaves the upper chart and stage content unchanged. Review images and this revision's checks use the `cards-` prefix in `tmp/dashboard-design-preview/`. No formula or data files changed for this refinement.

TypeScript and scoped ESLint passed. All 48 existing metric, documentation-score, documentation-stage and regional-dashboard tests passed.

Those 48 tests and the original lint check were run for the first demo. The revised demo was checked with TypeScript and direct browser interactions through the in-app browser: navigation, five metrics, radar/bar value consistency, keyboard drill-down, report-aware topic links, comparison gaps for missing values, refresh persistence, six/all-sixteen domain and regional views, and narrow layouts. Current screenshots and checks use the `final-` prefix under `tmp/dashboard-design-preview/`. The standalone smoke-test script has been updated for the revised layout; this revision's browser verification used the in-app browser.

`check-preview.cjs` exercises the running local app using the bundled Playwright runtime and installed Edge. It checks all five metrics, normalization, drill-down URLs, selection persistence after refresh, country comparison, six/all sixteen regional domains, 320px and 390px page widths, and browser runtime errors. Screenshots are saved under `tmp/dashboard-design-preview/`; desktop, comparison, region, mobile and dark appearances were inspected. The script reflects the current three-country local dataset and local runtime paths.

Current-data baseline: KAZ shows 378 claim points, 196 action claims out of 324 claims and 61 of 64 topics covered. These are report values, not mock values from the earlier screenshots.

## Implementation files

- `src/app/design-preview/page.tsx`: read-only report loading and initial URL state.
- `src/lib/dashboard-preview.ts`: presentation adapter over existing calculations.
- `src/components/design-preview/policy-design-preview.tsx`: interactive preview.
- `src/components/design-preview/overview-visuals.tsx`: radar, accessible values and domain-card explorer.
- `src/components/design-preview/preview.css`: styles scoped with the `ptd-` prefix.

The project currently transforms CSS through a custom Turbopack rule, so the preview uses explicitly namespaced CSS instead of relying on CSS-module exports.
