# Policy tracker dashboard unification plan

20 October 2026 · Final reviewed implementation plan

### Implemented score hierarchy and color treatment — 21 October 2026

Lead fresh country Overview and Domains pages with the existing Average action stage /100 and supporting topic coverage. Preserve explicit metric links. Apply the same saturated score badges, lightly tinted cards, colored top edge and compact contextual legend to preview and regular country cards. Keep all other measures available under the shared controls, now consistently labeled Original/Normalized. Original stage scores use their absolute bands; counts and normalized values retain regional comparison colors. Shared palette tokens replace preview-only hex colors, including dark red for the lowest regional band. No thresholds, normalization rules or calculations change.

Remove repeated numerical deviation annotations from comparison cells and replace technical comparison labels with plain language. Methodology retains the statistical explanation. Prevent rounding from making a score appear to cross its color boundary by retaining enough display precision only when necessary. This is a scoped implementation of country cards, shared controls/legends and defaults; the full preview layout remains separate.

### Latest card review — 21 October 2026

The user approved the upper preview and asked to replace only its bottom topic landscape. This decision supersedes the small topic-cell layout described in the earlier refinement below. Keep the header, seven-item navigation, summary metrics, radar/bars, reported stages and formulas as they are.

Use compact, fully clickable domain cards: name, one selected measure, a brief topic-coverage context and one colored bar. Show all 16 on desktop, six with expansion on mobile. Selection replaces the cards within that section with named topic rows, each linking to its existing report evidence. All domains and Escape return to the same cards with keyboard focus restored. Do not add a second metric selector, a dense multi-score table, a ranking or extra methodology text.

Bar length uses one common scale across the 16 domains and one common scale across all 64 topics. Bounded metrics retain 0–100; original counts use a common maximum for their level. State the range once. Color keeps the existing relative-comparison or absolute-stage meaning; it is not a new score. Keep the current palette, zero/missing/no-action distinctions, taxonomy order and report-aware links. This is a local demo refinement, before production implementation.

### Preview refinement — 21 October 2026

The user reviewed the working preview and requested a middle ground: retain the familiar country navigation, add a radar and strengthen the country overview. The revised `/design-preview` now demonstrates:

- The existing seven country destinations, with Overview and Domains & topics shown in the preview and other links retaining their working screens and report context.
- An Overview with a six-domain radar, compact reported-stage bars and a topic landscape. The radar and Bars switch display the same selected metric and scale. All 16 domains remain available in the detailed bar view and regional matrix.
- Average action stage as the fresh Overview default; explicit incoming metric/scale selections remain respected. This default is a preview candidate for review, not a change to production defaults or scoring.
- Stable axis order, one scale shared by all spokes, a maximum of two series, contrast and shape to distinguish countries, and gaps for unavailable observations. Original count metrics use a common count scale; no per-axis rescaling or polygon-area score is introduced.
- Topic cells retaining the established score/comparison palette, with distinct unavailable and no-action states. A cell opens the corresponding report evidence. Mobile initially reveals six domain groups and expands to all 16.

The brainstorming UI/UX guide informs progressive disclosure and evidence access. It does not replace the agreed taxonomy, formulas, palette, navigation or scope. This revision remains a local demonstration before rollout; the broader implementation requirements below still apply.

**Make the existing tracker easier to read and explore through one presentation language. Keep the working taxonomy, classification, claim grouping, calculations, regional normalization, comparison palette and evidence workflows.**

The primary tool should feel easy and effective: clear values, a distinctive visual overview and an obvious next action. Methodology carries definitions, calculations and detailed qualifications. The work is a focused presentation redesign, with fewer repeated elements and reliable movement from a chart to its evidence.

This plan supersedes conflicting recommendations in the [earlier visualization plan](profile-visualization-plan-2026-10-20.md) and [dashboard strategy](unified-dashboard-strategy-2026-10-20.md). In particular:

- Keep the red–orange–yellow–green comparison language. The previous blue-only concept is not the implementation target.
- Keep familiar names such as Claims, Action claims and Claim points; define them consistently instead of renaming the whole product.
- Keep existing navigation and routes. Do not introduce the proposed four-destination navigation restructure.
- Keep normalization readily available in analytical views. Remove numerical deviation annotations from the interface.
- Make domain comparison tracks and selectable topic tiles the leading visual direction. Radar is a candidate for focused comparison, not a requirement or the automatic default. Preserve access to all 16 domains.
- Implement no new overall performance score, composite domain, taxonomy or classification method.

## Priority and scope

| Priority | The user should understand | Default presentation |
|---|---|---|
| First | What action stages the documents report, and how broadly topics are addressed | One reported-stage chart and one coverage fraction/bar |
| Second | Which domains warrant closer inspection | Domain profile with a consistent measure, meaningful color and direct drill-down |
| Third | How the country compares with peers | Existing raw/normalized comparison, with one measure and reference scope |
| Fourth | Why a value appears and what supports it | Claims, source quotations, matched-text status, topic detail and source/report identity |
| On demand | Calculations, custom stage selection, processing and detailed source comparisons | Clearly labeled disclosures and the existing Methodology page |

Claim points remain available and visible in the selected-measure summary. Reduce their oversized visual treatment; do not remove them or silently change bookmarked metric selections. Preserve current default metric/scale behavior in the first implementation pass. The layout should make coverage and reported stages intelligible even when Claim points is selected.

The initial release covers country Overview; regional Overview; Compare; Regional comparison; domain tiles; all-topics tables; domain/topic details; metric controls; legends; claims/targets presentation; relevant source/status text; and export labeling/context. Taxonomy editing, extraction, model prompts, grouping rules and backend score formulas are outside this change.

## Primary experience and disclosure rules

The detailed requirements in this plan are implementation instructions, not copy to place on screen. A correct calculation does not need a paragraph beside it. Put routine explanation in Methodology and reveal supporting detail when the user asks for it.

| Layer | Show | Keep elsewhere |
|---|---|---|
| Default overview | Country/report, two compact summaries, one primary domain graphic, a compact reported-stage section, selected metric and scale, direct next actions | Formula explanations, source-matching percentages, deduplication caveats, cohort counts, processing inventories and repeated disclaimers |
| Focus or selection | Exact value, unit and domain/topic; a short relevant status; one action to open evidence | Whole methodology paragraphs and every diagnostic field in the presentation adapter |
| Open detail | Topic breakdown, relevant denominators, sources and quotation status; advanced filters when requested | Persistent duplication of the overview chart |
| Methodology | Definitions, grouping, stage rules, normalization, eligibility, overlap, limitations and worked examples | Repeated notices spread across normal rows and cells |

Preserve essential meaning through the metric name, unit and selected scope. A coverage fraction needs its denominator; a domain score does not need its entire scored-topic audit permanently beside it. Missing values stay missing and a material incomplete result gets one concise local indication. Successful routine processing needs no badge wall.

Use these concrete limits for the default layout:

- At most two supporting summary values. Total Claims can sit as secondary context beside Action claims; do not give every available KPI its own card.
- One primary chart and one compact stage section. Coverage is a fraction or small inline bar, not a third large chart panel.
- One metric selector and one Original/Normalized control for the domain profile. Keep advanced stage selection closed until requested; show an active custom selection when one exists.
- No standing methodology paragraph. Use the existing Methodology destination; allow at most one short chart-specific cue when a marker or color would otherwise be ambiguous.
- One visible legend only where needed. Direct stage labels already explain stage colors and do not need a second legend.
- One selected domain detail area at a time, initially closed. A deliberate click or tap opens it; hover never rearranges the page.
- Default tooltips contain only the selected item, value/unit and, when relevant, its comparator. Report details and full denominators belong in the open detail area.

This applies [progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/): frequent tasks stay immediately available and specialized information has a clearly named route. It must not become a sequence of mandatory dialogs before a user can see useful data.

For the visual character, use the actual policy taxonomy as the structure: aligned domain labels, fine comparison tracks, confident colored markers and selectable topic cells. Preserve the current font and brand. Use whitespace and alignment to connect sections; avoid repeating rounded KPI cards, decorative gradients, oversized icons, generic generated summaries or an unrelated illustration. Distinctiveness should come from this tracker's data and the way it responds to selection.

## What already works

Retain these capabilities and reuse their implementation where possible:

- The home-topic model, related-topic links and stable taxonomy IDs.
- Detailed statement types and the eight climate/disaster label families.
- Grouped claims, source quotations and expandable evidence.
- The five enabled analytical measures and existing normalization rules.
- Country/domain/topic regional references and exclusions for incomplete or demo assessments.
- Matrix cells that open domain evidence, focused-domain comparisons and shared-scale bars.
- URL-backed Claims filters, grouping, sorting, pagination and CSV export.
- Saved reports, main-report selection and `ReportLink` preservation of report identity.
- Document processing details, document timeline and source-finding heatmaps.
- Responsive navigation, accessible HTML tables and existing loading/empty-state patterns.

The existing matrix and bars already supply useful interaction. Their labels, density and hierarchy need alignment. There is no reason to rebuild the analytical application or replace every chart.

## Audit findings and required corrections

The following register combines earlier findings with the deeper presentation audit. References identify active source locations; dormant components are explicitly separated.

| ID | Finding | Required correction |
|---|---|---|
| N01 | Claims, findings, statements and items are used for both grouped claims and individual source records | Use **Claims** for the grouped counting entity; **Source findings** for extracted document records; **Quotes** for quotations. Explain a claim as a grouped policy statement |
| N02 | Action claims, actions, responses, action groups and reported action are used as interchangeable counts | Use **Action claims** for the default positive-stage subset; **Reported action stages** for its distribution. Retain “response” only in technical IDs |
| N03 | `Action definition` exposes stage numbers and permits non-action selection while retaining an action label | Rename the control **Stages included**. Default is Action claims; custom selection is **Claims at selected stages** |
| N04 | Context/non-action wording collapses concern, projection, proposal, result reported and other types | Use **Other claims** for the non-action aggregate. Keep each detailed statement type unchanged |
| N05 | An unclassified group can be included in a residual “context” count | Never describe every residual claim as Context. Separate known other claims from unknown classification where the data supports it |
| N06 | Delivered, Output delivered and implementation language differ across surfaces | Use **Output delivered** consistently; keep **Underway**. Both describe what sources report |
| N07 | “Implementation reported” counts only unambiguous underway/delivered groups | Label **Claims reporting implementation**; explain mixed-group treatment in detail. Do not call this verified implementation |
| N08 | Count/Total points/Topic average vs Regional score competes with Raw/Standardized controls | Use **Original / Normalized** everywhere, alongside the selected metric name |
| N09 | Normalized values are presented as an independent “Regional score” | Title them **[measure] · Normalized**. Preserve the underlying measure identity |
| N10 | “Country totals” also appears when the measure is an average or percentage | Use **All topics** for the comparison scope |
| N11 | Average action stage is also called topic score, documentation score and generic score | Use **Average action stage** on all active surfaces; use **Stage points** for an individual claim's assigned points |
| N12 | The Targets result count counts grouped claims, not independent targets | Keep the Targets tab; change the result caption to **N claims with targets** |
| N13 | Targets pagination and accessibility labels still refer generically to claims | Make captions agree with the current view and distinguish unique claims from group entries |
| N14 | Source counts, quotes and supporting findings are placed together without a clear counting entity | Keep their units explicit. Audit `relatedCount`, which currently counts additional grouped units rather than the complete source-finding inventory |
| N15 | “Text matched,” “quotes matched” and internal “verified” terminology vary | Use **Quote matched** at quotation level and **Quotes matched** for an aggregate. Preserve the existing explanatory text about the cited page |
| N16 | Complete, analysed, done, provisional, pending and not assessed mix processing and analytical eligibility | Use the separate status rules below; never apply one generic status formatter to every meaning |
| N17 | “No findings,” “No findings yet,” “Not found” and “No action” can obscure assessment completeness | Distinguish assessed absence, incomplete assessment, missing classification and empty filters |
| N18 | “Label coverage” is easily confused with topic coverage | Use **Classification status** for the existing label-completeness filter |
| N19 | “Not stated / not extracted” is a combined missing-label state | Present **Label unavailable** with its existing uncertainty in help. Do not infer that the source did not state it |
| N20 | “Outside current topics,” “Outside assessed topics,” and untagged are inconsistent | Use **Outside assessed topics**; keep the evidence accessible |
| N21 | A plus sign on stage-point badges resembles improvement/change | Show **2 stage points**, without a leading plus; place points inside claim detail rather than beside every collapsed stage badge |
| N22 | Country Regional position and regional Regional average open the same comparison component | Use **Regional comparison** in both locations; retain URLs |
| V01 | The country panel repeats the same distribution in a stack, list and detailed bars | Keep one stage chart. Details add source/denominator/method information, not a second chart |
| V02 | Sixteen equally prominent domain cards create a long wall of metrics | Use a selected-domain profile and compact all-domain detail; retain all 16 domains |
| V03 | Comparison, stage, coverage, source volume and legacy scoring share one set of aliases | Separate semantic color mappings while retaining the requested color family |
| V04 | Deviation numbers appear in matrix cells, comparison tables, legends, descriptions and accessible labels | Remove them from every presentation channel; retain internal calculations and plain-language comparison categories |
| V05 | Raw bar length and comparison color encode different quantities | Keep this useful combination; use one concise cue in the chart key when needed: **Colors compare with the region** |
| V06 | Current code has five comparison categories; the requested color family contains six colors | Preserve all five thresholds; use the six-color family across roles without inventing a sixth statistical category |
| V07 | A topic table shows several metrics even when another metric was selected | Show the selected measure and essential context; put other measures in expandable detail |
| D01 | Domain/topic details use Claim points references even after another metric is selected | Carry the selected metric and scale through to the corresponding reference and detail presentation |
| D02 | Stage charts and Claims filters can use different inclusion rules for mixed groups | Add a shared chart-selection predicate so the opened evidence count matches the chart |
| D03 | Regional “topics without action” sums country–topic pairs and can include unfinished assessments | Use the correct unit; distinguish assessed gaps from incomplete assessment before presenting them as gaps |
| D04 | Domain and topic totals overlap, while the country inventory deduplicates | Preserve counting rules; never sum displayed domain values into a country total |
| D05 | Source heatmaps count document findings, including broader topic placements | Keep them labeled **Source findings by document**; do not relabel their values as national claims or topic coverage |
| D06 | Source-profile filters affect the displayed average but not the full-region color/normalization reference | State the two scopes once when a source filter is active; preserve the current calculations |
| D07 | Claims state is URL-backed; Reported figures state is local | Reuse the existing state approach for figures when adding chart drill-through; avoid a new global state framework |
| D08 | Client CSVs do not consistently carry selected-report and filter context | Add compatible scope metadata; preserve machine IDs and existing integrations |
| L01 | Dormant radial/score components retain older highest-stage and response-signal concepts | Do not revive them as the new score display; reuse only suitable geometry after replacing the data adapter |

Main source locations are mapped to implementation work near the end of this plan.

## One common language

### Entities and counts

| Term | Definition and use |
|---|---|
| Claim | One existing grouped policy statement; several sources or topic placements can support it |
| Action claim | A claim with at least one in-scope member at Commitment, Planned action, Underway or Output delivered |
| Other claims | Known statements outside those four action stages; includes the existing non-action types |
| Mixed statement types | A group with different statement types. It can still qualify as an Action claim |
| Unclassified | A statement type is unavailable; this is different from the classified type Other |
| Source finding | An extracted record from a document before country-level grouping |
| Quote | A quoted passage linked to a document/page |
| Domain / Topic | Existing taxonomy terms and labels; unchanged |
| Topics covered | Topics containing any claim, including context and other non-action types |
| Topics with action claims | Topics containing a positive-stage action claim |
| Claims with targets | Grouped claims classified as containing targets; one can contain several target facts |
| Reported figures | Values retained with their stated units, periods and conditions |

Do not globally replace “finding” in source material, model output, technical schemas or quoted evidence. Standardize interface chrome according to the entity actually being counted.

Keep the existing grouping limitation in count-method details: differently worded restatements can remain separate, even after analysis finishes. Processing complete must not imply perfect extraction or semantic deduplication. This needs one concise explanation, not another permanent warning on every count.

### Measures and scales

| Internal ID | Canonical display name | Unit | Definition and required context |
|---|---|---|---|
| `claims` | Claims | count | Distinct groups in scope |
| `actions` | Action claims | count | Default stage subset; rename dynamically for custom stages |
| `coverage` | Topics covered | fraction; optional percentage | Covered home topics / enabled home topics |
| `claim_points` | Claim points | points | Sum of resolved group stage points; no fixed maximum |
| `detail` | Average action stage | index /100 | Source-matched positive stages averaged within topics, then equally across scored home topics |
| `responses` | Topics with action claims | fraction; optional percentage | Existing supported action-coverage measure; remains a secondary breakdown |
| `scale=normalized` | Normalized | /100 | A display transformation of the chosen eligible measure, using the existing regional reference |

Use one metric catalog for full names, short labels where necessary, units, help, valid scales, comparison labels and chart support. Do not create a synonym for the same measure on a small screen.

For an index, “/100” is not “%.” Claim points are not a bounded score. Count differences use claims; claim-point differences use points; average-stage differences use index points; percentage differences use percentage points.

The scale control has only **Original** and **Normalized**. Show it where supported. A plotted reference labeled **Regional average** can carry the value 50 when normalized. If no reference is drawn, place that explanation in the control's help. Keep the calculation in Methodology; do not add a standing paragraph or repeat the explanation in every cell or card.

### Preserve the existing scoring contract

The four positive action stages remain 1, 2, 3 and 4. Concern, Context, Projection, Result reported, Proposal and Other remain zero-point types. This redesign does not reinterpret Result reported as Output delivered.

Claim points can include a resolved saved classification even when quotation matching is incomplete. Average action stage requires matched quotations and excludes topics without a positive stage from its numerical mean. Show the relevant match/completeness detail and scored-topic denominator when inspecting those values.

Regional normalization retains the current formula, eligible-country rules, minimum cohort requirement, domain/topic reference scope and equal-values convention. Preserve exact calculations and unrounded color classification. Do not add weights, a composite “climate score,” new bands or statistical annotations.

Specifically, normalization needs at least two complete, non-demo countries in the relevant scope. Equal values, including all-zero totals, map to 50 by convention. A normalized value is neither an observed percentile rank nor a percentage of implementation. Explain these distinctions in Methodology; the overview needs only the measure name, scale and reference context.

Keep the legacy response-signal rubric as a compatibility concern. It is not an active overview KPI. The proposed four-check specificity score is not enabled and must not appear as a new display measure.

## Color specification

Keep the visual philosophy **dark red → red → orange → yellow → light green → dark green** for ordered values and comparison. Blue remains the existing navigation/action accent. Color names do not imply policy effectiveness.

### Base palette and semantic mapping

| Family color | Initial token value | Main use |
|---|---|---|
| Dark red | `#991B1B` | Lowest comparison category; strong low-end display where a corresponding category exists |
| Red | `#DC2626` | Existing zero-point/non-action classification and low absolute band |
| Orange | `#FB923C` | Commitment and lower comparison band |
| Yellow | `#FDE047` | Planned action and central comparison band |
| Light green | `#86EFAC` | Underway and higher comparison band |
| Dark green | `#15803D` | Output delivered and highest comparison band |

These are implementation starting tokens, largely preserving the current values. Test actual foreground/background pairs and dark mode. Keep dark ink on orange, yellow and light green; use tested light ink on dark red, red and dark green. Avoid white labels on pale fills.

**Comparison mapping:** keep the existing five categories and thresholds. Display them, when a legend is needed, as **Much lower · Lower · Near average · Higher · Much higher**. Map them to dark red, orange, yellow, light green and dark green. Red remains available in the stage/absolute-value system. This uses the requested six-color family without changing comparison mathematics.

**Stage mapping:** Other claims with resolved zero points use red; Commitment orange; Planned action yellow; Underway light green; Output delivered dark green. Mixed/unclassified/unresolved states use neutral patterned treatments. “Other claims” means classification outside the action stages, not a failed policy.

**Absolute index and coverage:** preserve current numerical band boundaries for this release, but give coverage and action-stage indices separate semantic functions and correctly named legends. Coverage percentages must never inherit stage names or “No action” wording. Keep the coverage fraction visible so the color is supplementary.

**Source-finding heatmaps:** preserve existing count buckets and label them as finding counts. Use their own tokens, even if they draw from the same family. More source findings means more documented material, not better implementation.

### Identity colors for paired comparisons and optional radar

A radar's axes represent domains; its lines represent country profiles. Color the **lines by country identity**, not each domain axis by score. Otherwise a viewer cannot tell which polygon belongs to which country.

For paired dots and optional radar, start with existing brand blue `#006EB5` and contrasting magenta `#B51B76` on a light surface; use tested lighter equivalents on dark surfaces. Use circle markers for the focused country and diamond markers for the comparator. If radar is adopted, use solid/dashed lines and very light optional fills; lines and markers carry identity.

Keep the same country-to-series mapping while a comparison is open, even when values or sorting change. A neutral dashed regional reference is an alternative to the second country, not a third polygon.

For a categorical chart that truly encodes domains, use the existing stable domain IDs/hues and test the selected subset for collisions. Domain name and position remain available. Do not assign a random new color each render or repurpose the score ramp as a categorical palette.

### Lean color explanation

At most one legend per analytical section, only if the marks need it. Remove numerical deviation strings from visible text, hover text, accessible names, captions, comparison thresholds and user-facing methodology copy. Keep the mathematical implementation and machine-level diagnostic data.

Color remains usable without those annotations: show exact metric values, one qualitative legend when needed, and a short qualitative comparison description for screen readers or focused detail. Selected states use an outline, marker or existing blue interaction accent; selection must not recolor a value into another score band.

Yellow and light green against white require particular care. Keep exact values outside bars, use sufficient boundaries where essential to distinguish marks, and test in grayscale and color-vision simulations. Removing numeric deviation labels does not require making color the sole source of information.

## Page structure without a navigation rebuild

Retain the current tabs and routes. Only unify the inconsistent Regional comparison label. Keep document-specific tabs, Reports and management tools available; use the existing responsive overflow rather than creating another navigation model.

### Country Overview

Reading order:

1. Country and selected report; source inventory through the existing report control. Show a concise status only when it affects the current result.
2. Compact coverage and action-claim summary. Keep total Claims as context.
3. Domain comparison tracks as the main visual, with the chosen analytical measure, compact value summary and Original/Normalized control.
4. One compact reported-stage section, directly labeled and using the established stage colors. On wide screens it can sit beside the domain profile; on narrow screens it follows it.
5. **View all 16 domains**; selecting a domain opens its topic tiles and evidence actions in place.

Reduce the selected metric's giant number block. The selected value still appears once, with its correct unit; it does not need a separate large blank column. Keep the existing metric and scale URL values. All five measures stay reachable through the current selector, restyled consistently.

The stage chart answers the same question irrespective of the selected analytical measure. Its heading and count unit remain explicit; it does not silently become a topic-score-band chart when a user chooses an index. Use counts by default. If percentages are requested, expose their denominator in that view. Existing score distributions can remain under **Measure details**.

Use **Details** only for further information. Prefer precise links such as **View claims**, **View all domains**, **Show data table**, **Stages included** and **How this is calculated** when the action is known.

### Regional Overview

Keep the current country list and regional reported-stage panel. Make each country row show one primary selected measure as a slim comparison track, its value and a profile link. Keep source scope in the existing report/detail access. Coverage and action-claim counts are secondary, consistently ordered; do not add every secondary measure to each row.

Keep regional counts clearly labeled as pooled claims across the included reports. Remove a naked “topics without action” headline unless its counting entity and assessment eligibility are correct. Prefer a short **Topics to inspect** list, ordered by the number of fully assessed countries without documented action, with country links. Start with at most five topics and a View all link. “To inspect” is an evidence task, not a policy recommendation.

Offer **Compare domains** using the existing Compare route. Selecting two countries can use paired-dot comparison within that view. Radar remains a candidate for the same focused task, not a simultaneous set of polygons for every country.

### Compare and Regional comparison

Keep the country-by-domain matrix as the comprehensive comparison view. Show one chosen measure per cell, correct units at the heading and concise missing states. Remove the numerical deviation subline and repeated explanations.

Keep focused-domain bars and the comparison table. Display the active comparison scope and source filter when present. Put eligible-country counts in comparison details; reveal a short local message if there is insufficient data. If source filtering affects the displayed mean but not normalization/colors, show **Average: selected sources · Colors: full region** once while that filter is active.

Keep each raw/normalized control local to the analytical panel it affects. Do not make a page-wide control appear to change the fixed stage distribution or topic inventory.

### Domains and topics

Keep the Domains / All topics switch and the home/related-topic structure.

The default topic table contains **Topic · Claims · selected measure**. Omit the Claims column when Claims itself is selected. Show only relevant non-routine status next to a topic; expose other measures in row detail. Preserve an explicit full-data table for analysts. In the overview's selected-domain area, use the topic tiles specified below as the visual entry into this same data.

Domain and topic detail must inherit the selected metric and scale. The current hardcoded Claim points comparison must not override a different selected measure. Home-topic context remains available; related topics stay separately identified.

### Claims, Targets and Reported figures

Keep the existing filtering and classification model. Make collapsed claim rows show title, statement type and concise source counts. Move stage-point badges and analytical explanations into expanded detail.

Keep advanced filters collapsed, with active-filter counts/chips visible. Label the existing classification-completeness filter correctly. Targets shows **claims with targets**; grouped pagination shows **group entries** where duplication is intentional. Reported figures retains its useful **figures / statements** distinction.

A small optional facet bar chart can summarize one selected family, such as Hazards or Risk functions. Its click filters the existing list, carries the current report and exposes a clear reset. Labels overlap, so counts need not sum to the total.

## Visual concepts and final selection

Use a small family of visual forms. The user's [visualization guide](D:/indirme/interactive-dashboard-visualization-guide.md) supplies ideas and evaluation criteria, not a checklist of mandatory charts.

| Question | Chosen visual | Why it fits |
|---|---|---|
| What stages are reported? | Four ordered horizontal bars; mixed action groups separately when present; remaining inventory in Details | Direct comparison with familiar labels, clear count units and stage colors |
| How broadly are topics covered? | One fraction and short coverage bar | Exact denominator with little visual overhead |
| What is the profile across selected domains? | Aligned comparison tracks with a colored value marker and a quiet regional reference | One readable visual works across existing metrics and retains exact comparison |
| Which topics explain a domain? | Labeled topic tiles revealed on domain selection | Makes the taxonomy tangible and turns the chart into an evidence navigator |
| How do all domains/countries compare? | Existing heatmap matrix; paired dots for two-country comparison | Scales to 16 domains, with a precise view of a selected pair |
| Which climate/disaster subjects recur? | One selected facet's horizontal bars | Uses existing labels and links directly to evidence |
| What is in the sources? | Existing document timeline and source-finding heatmap in details | Fits source dates and document/domain counts |
| What exact figures and targets are stated? | Source-linked tables; limited categorical summaries | Preserves units, conditions and meaning |

Do not introduce a flow diagram for stage totals: the current data does not trace the same actions moving between stages. Do not use a pie for overlapping domains, a real-world risk map from policy mentions, or a trend from incompatible report editions.

**Stage-chart calculation contract:** the four positive-stage bars plus the mixed-action row partition the default Action claims count. Show absolute counts by default. Mixed groups in this chart contain at least one positive-stage member; this is narrower than the general Mixed statement types filter. Put the remaining inventory in Details: known Other claims and claims with incomplete classification but no classified action member. Those counts plus Action claims must reconcile with total Claims. Do not color unknown classification red or silently merge it into known non-action. When custom stages are selected, only the selected-measure summary changes; the fixed reported-action chart retains its stated definition. This paragraph defines implementation behavior and must not be copied into the default chart.

### Alternatives considered

Brainstorming should result in a small coherent visual system, not a menu containing every attractive chart. These are alternatives or contextual views; they are not seven new dashboard panels.

| Idea | What the user sees and does | Fit and decision |
|---|---|---|
| Comparison tracks with reference markers | Domain names beside fine horizontal tracks; colored endpoint, exact value and a quiet regional tick. Select a row to explore | **Recommended primary domain view.** Supports the current count/index measures and preserves the palette without large filled cards |
| Topic tile grid | A selected domain opens a compact grid of named topics with one value and a colored edge. Select a topic to open its claims | **Recommended detail interaction.** Uses the existing taxonomy and creates a visual connection between overview and evidence |
| Paired dots / dumbbell comparison | Two selected countries appear as contrasting markers joined across each domain row | **Recommended focused Compare treatment.** Reuses the track geometry; the connector represents a difference, not a time trend |
| Radar | A small, fixed domain set forms one or two recognizable profiles | **Conditional prototype.** Retain only if it adds useful profile recognition without slowing value reading or evidence access; not required for the first release |
| Domain stage strips | One short stacked strip per domain shows the reported-stage composition; selecting a segment opens its claims | **Conditional specialist view.** Could replace a detailed stage table when comparing mixes; do not add beside a chart showing the same values |
| Coverage versus average-stage scatterplot | One point per domain; horizontal coverage and vertical Average action stage | **Defer.** Uses existing KPIs, but requires two-axis interpretation. No “good/bad” quadrants, causal claim or new composite score |
| Compact domain color strips by country | A short fixed-order strip gives each country a visual domain pattern; a selected cell opens the labeled detail | **Defer.** Only useful as a compact alternative to the matrix. Small unlabeled cells must not become the only way to identify a domain |

The implementation target is comparison tracks, topic tiles and the existing matrix, with paired dots when two countries are selected. The radar and other candidates should not expand the initial scope merely because they appear in this review.

### Comparison track specification

Use a shared label column, a shared horizontal scale and a right-aligned value column. Each row has a thin stem or compact bar from zero to the value, a clear endpoint and, when available, a short neutral tick for the regional reference. Give the whole row a generous interaction target; the visible mark can remain fine. A zero retains its endpoint at zero; an unavailable value has no plotted endpoint.

Use one shared zero-based count/point maximum across the displayed rows and comparator values. Include reference ticks in that range. Bounded indices and coverage use 0–100. For normalized measures the regional-mean reference is 50; for original measures use the existing eligible reference for that domain. Do not rescale each row independently. Keep the scale stable during hover/focus and disclose it once for the chart.

Apply the existing measure-specific color role: regional bands for counts and normalized measures, existing absolute bands for the original stage index/coverage. The reference tick is a comparison reference, not a policy target. If no eligible reference exists, omit the tick and keep an available original value; do not add a warning paragraph to every row.

Start with six domain rows using the preset below. Selecting one row opens only its topic grid. View all domains reveals all 16 through the existing domain view, retaining the selected measure. On narrow screens keep labels and values readable; shorten the track before shrinking the text.

For a selected country pair, use two contrasting identity colors and different marker shapes. Join the values with a neutral line; do not recolor the countries red/green by identity. Keep the semantic score colors in the standard one-country track view. The comparison header identifies the two countries once. Selecting a domain opens its evidence actions for either country without losing the pair.

### Topic tile specification

Render only the selected domain's home topics initially. Each tile shows its real topic name, the selected metric's value/unit or concise unavailable state, and a small colored edge or marker using the same metric-specific color rule. Equal-size cells are navigation targets; their area does not encode importance. Use a compact responsive grid with readable labels rather than a tiny unlabelled mosaic of every topic.

Selecting a tile opens the existing topic detail or matching claims with the current report and metric preserved. Keep related-topic links in detail. Do not substitute the highest statement stage for the selected topic metric. No new topic score, categorical priority or aggregation is introduced. If tiles wrap into tall repeated cards, use compact labeled rows instead.

The [Observable Plot dot documentation](https://observablehq.com/plot/marks/dot) illustrates dot-and-rule/lollipop encodings, while its [cell documentation](https://observablehq.com/plot/marks/cell) illustrates categorical grids. These are visual references; the native React/SVG implementation remains the selected tool approach.

### Six selected domains

The proposed default preset is:

1. Climate
2. Disaster Risk Management
3. Agriculture & Food
4. Water
5. Nature, Forests & Land
6. Energy

Reason: retain the two explicit cross-cutting anchors, then select four domains with broad home-topic inventories. In the repository seed taxonomy these six contain 36 of 64 home topics. That is an inventory observation, not a statement that they are universally the most important national priorities.

Use the same preset and row/axis order across countries. Do not choose the best-scoring domains or each country's highest claim counts. Read labels and eligibility from the selected reports; do not hardcode the 36/64 figure in the UI. Recalculate any displayed inventory fraction against the actual report taxonomy.

Label the view **Domains** with a compact **6 of 16** indicator, derived at runtime. **View all domains** reveals the full matrix/list. Keep the initial preset fixed for the lean first release; do not add a new domain-configuration control by default. If the radar prototype is adopted, an advanced Choose domains control can allow 3–6 explicit axes and store them in the URL. Selecting six never changes the overall country KPIs or score.

This is a display subset, not six newly combined domain scores. No “Other domains” aggregate axis.

### Conditional radar contract

Use radar only for:

- Original **Average action stage**, on its existing fixed 0–100 index scale.
- **Normalized** values of measures that already support normalization, on the existing fixed 0–100 scale.

Keep Original Claims, Action claims and Claim points as zero-based aligned bars. Do not divide each axis by its own maximum to make an unbounded count fit a radar. Keep Topics covered as coverage bars for precise denominator reading.

The default remains comparison tracks. A radar prototype competes for a focused comparison slot; it does not automatically appear when Normalized is selected. If adopted, keep it to one secondary entry point and retain the precise track/table view. Do not add a large chart-type picker or implement every brainstormed variant.

Radar specification:

- Six axes by default, three minimum, six maximum; fixed taxonomy order.
- One focused country plus at most one comparator, or one regional reference.
- Fixed range and common radial scale; three or four unobtrusive grid rings.
- Never interpret polygon area as a total, rank, or quality score.
- Full domain names in an adjacent compact key or wrapped labels; no unexplained abbreviations.
- On focus/tap, show domain and value/unit. Put report and denominator detail in the opened evidence/detail area.
- The adjacent details list opens the exact domain evidence. Axes may offer the same action, but the list is the keyboard/touch equivalent.
- For Average action stage, keep scored-topic counts in detail; no-action and unavailable values remain distinct.
- Missing or incomplete values must not become zeros or a completed polygon. Fall back to the aligned list/bars for that view, with the same selected domains.
- On narrow containers or enlarged text where labels do not fit, use the aligned list automatically.
- If a historical taxonomy lacks an axis, identify that absence; do not substitute a different domain for one country.
- Comparison reference values use the existing eligible-domain calculations. Do not average normalized country values and call the result the normalized regional average.

Prototype the radar with actual report aggregates and missing-data cases before enabling it. It earns its place if users can identify a domain difference, understand the measure and open its evidence as readily as from the bar view.

## Interaction and data contract

### A chart click must explain the displayed value

Current stage filtering matches a claim when any member has the chosen statement type. Stage distributions can instead require a resolved or unanimous stage. A mixed group can therefore produce different chart and list totals.

Introduce a small shared presentation selector with explicit selection kinds:

- `action-subset`: current any-member stage-set membership.
- `resolved-stage`: the exact group rule used by the displayed distribution.
- `mixed-type`: mixed statement types.
- `unclassified`: missing statement classification.
- `topic-presence`: covered/with action/other-only/no claims, with assessment status.

Use the existing classification functions as the source of truth. The selector should return the same grouped IDs for a displayed count and its evidence link. Do not alter ordinary Statement type filtering; identify a chart-origin selection in the Claims view when its rule is narrower.

For the primary chart, the `mixed-type` selection also requires a positive-stage member. For the remaining inventory in Details, missing classification takes precedence over the known-other category when a group has no positive-stage member. Encode these conditions in the selector, not ad hoc JSX predicates.

Do not pass numeric dashboard stages straight into the Claims view's type filter. It uses `c_stage` with classification IDs; the presentation adapter must translate the intended selection and preserve scoped membership.

For the final stage chart, use one shared action-stage distribution at country, region and domain level. Reuse the existing regional unanimity/mixed semantics for the primary chart, and preserve progression-point distributions under Claim points details. This is a presentation derivation, not a change to point totals.

### Scope and recovery

Selecting a domain focuses the profile/detail; an explicit evidence link opens the corresponding Claims or topic page. Selecting a chart subset does not silently change country coverage or the reference cohort.

Preserve country, selected report, metric, scale, stages and domain/topic through links. Add only the small URL state needed for the selected domain, comparator and chart-origin evidence selection. Add configurable radar axes only if that view is adopted. Reuse `ReportLink`, `ReportInput` and the Claims state helpers.

Clarify page filters versus local selections. Clearing a stage selection should not switch the report. Back and refresh should retain the intended state. Prevent older asynchronous results from replacing a newer selection.

### Missing and processing states

| Condition | Interface label | Treatment |
|---|---|---|
| Assessed scope has zero claims | No claims found | Real zero/empty finding, with assessed scope |
| Assessed topic has claims but no positive action type | No action documented | Separate from missing data |
| Processing not finished | Assessment incomplete | Show available values as provisional; exclude according to existing comparison rules |
| No usable assessment | Not assessed | Dash/pattern; no fabricated zero |
| Processing queued | Analysis pending | Operational status |
| Processing failed | Analysis failed | Operational error with recovery access |
| Statement type missing | Unclassified | Neutral classification state |
| Conflicting progression points | Points unresolved | Preserve group evidence; exclude from sum as currently defined |
| Quote not located | Quote not matched | Evidence check; not proof the source is false |
| Filters return nothing | No claims match these filters | Visible filters and Clear filters |
| Labels incomplete | Classification incomplete | Preserve searchability and existing known labels |

These are state labels for the places where the state matters, not a checklist of badges to render. In the overview, use a dash for an unavailable cell and one concise Partial/Unavailable indication when the displayed result needs it. Explain the reason on selection or in detail. Keep operational recovery messages in the relevant processing/source view. “Complete,” when shown, should specify analysis, classification or quotation matching; routine success does not need a repeated badge.

## Implementation architecture and tools

Use the current React, Next.js, Tailwind and HTML/SVG foundation. The inspected package has no charting dependency. Comparison tracks, paired dots, topic tiles, four stage bars and the existing matrix fit small native components. An optional radar would also have at most twelve plotted points.

Implement a small shared presentation layer:

| Piece | Responsibility |
|---|---|
| Metric catalog | Names, units, help, supported scales, chart eligibility and context-specific differences |
| Color mapping | Stage, absolute value, regional comparison, identity, selection and unavailable roles |
| Metric presentation result | Value, unit, completeness, denominator, report/scope identity, reference and evidence selector |
| Common components | Metric control, compact value, chart heading, legend, status, stage bars, domain profile and data table |
| Link/state adapter | Carry existing report and filter context; translate chart selection into matching evidence |

This is an adapter around existing calculations, not a new metric service. Keep aggregation on the server where it already exists. Charts receive prepared aggregates; avoid loading all quotations into the overview.

A compact proposed result shape for implementation planning:

```text
metricId, scale, label, value, unit
scope: country/report/domain/topic/filter identifiers
countingEntity, numerator, denominator, scoredTopics, totalTopics
status: processing, classification, quotationMatch, metricEligibility
colorRole, colorCategory
reference: scope identifier, eligibleCountries, totalCountries
selection: kind, scope, stage/domain/topic identifiers
methodVersion
```

Only supply applicable fields. A count does not need an invented denominator or score status. Keep stable IDs separate from translated/display copy. This adapter is an internal contract: do not automatically render all its fields as visible metadata or tooltip text.

**Tool decision:** native React/SVG for the initial implementation. If the radar prototype needs reusable polar geometry, a narrow `d3-shape` import is a reasonable option; [D3 documents radial-line geometry](https://d3js.org/d3-shape/radial-line). Do not introduce D3-managed page state.

[Apache ECharts includes radar and heatmap series](https://echarts.apache.org/en/cheat-sheet.html) and [optional descriptions and decal support](https://echarts.apache.org/handbook/en/best-practices/aria/). Keep it as a fallback if the prototype demonstrates a real need for a broader renderer. Its accessibility features do not replace equivalent keyboard controls and tables. Do not add several chart libraries or a separate BI platform.

Read the installed Next.js guides before implementation, as required by this repository. Keep server aggregation and small client interaction boundaries explicit.

## Visual composition and usability parameters

| Parameter | Implementation rule |
|---|---|
| Hierarchy | One primary domain graphic, one compact stage section and at most two supporting summaries on the overview |
| Repetition | Show a measure once in its immediate context; do not duplicate a chart in Details |
| Surface | Preserve the existing brand, sidebar and panels; reduce unnecessary borders and nested boxes |
| Vibrancy | Use saturated semantic marks, a clear focal chart and deliberate identity contrast; keep surrounding surfaces quiet |
| Typography | Existing font; 14–16px body/control text; readable 12–14px chart labels at actual size; tabular aligned values |
| Density | Compact rows for exact lookup; comfortable chart spacing; no giant empty metric column |
| Labels | Sentence case; canonical names; units at heading/value; direct labels where practical |
| Precision | Integer counts; existing whole-number overview formatting; more precision only in focused detail; color from unrounded values |
| Scales | Zero baseline for counts/points; fixed 0–100 for bounded indices; identical scales for simultaneous comparisons |
| Legend | At most one contextual legend when needed; direct labels replace repeated keys; no statistical deviation annotations |
| Motion | Short state transitions where useful; no animated counters or autoplay; respect reduced motion |
| Interaction | Consistent hover, focus, selected and disabled states; exact count-to-evidence continuity |
| Responsive | Shorten tracks and stack selected-topic tiles; optional radar falls back to tracks/list; do not shrink labels to fit |
| Accessibility | Color plus values/names/line styles; visible focus; touch targets; structured table equivalent |
| Source context | Selected report at page level; source inventory and quote provenance in detail |
| Explanations | No standing methodology paragraphs; short focus content; detailed definitions in Methodology |
| Export | Same selected scope and values; preserve machine fields and formula versions |
| Performance | Aggregate once, reuse references, lazy-load evidence; measure actual interaction latency |

Color should have text or shape equivalents, as specified by [W3C use-of-color guidance](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html). Keep this practical: exact values, direct labels and solid/dashed comparison lines generally do more for understanding than a lengthy statistical legend.

## File level work packages

| Order | Files or components | Work |
|---|---|---|
| 1 | `src/lib/dashboard-metrics.ts`, `src/lib/statement-types.ts`, `src/lib/colors.ts`; proposed `src/lib/metric-presentation.ts` | Shared display catalog, scale labels, qualitative comparison labels and semantic color roles; preserve calculations/IDs |
| 2 | `src/app/globals.css`, `src/components/charts/metric-controls.tsx` | Palette tokens, consistent Original/Normalized control, Stages included disclosure and compact legends |
| 3 | `src/components/charts/documentation-dashboard.tsx`, `distribution-summary.tsx`, `comparison-bars.tsx` | Remove repeated distributions and oversized hero; shared reported-stage bars; coherent units/statuses |
| 4 | `src/components/charts/country-matrix.tsx`, `src/components/regional-dashboard.tsx` | Lean matrix cells, consistent comparisons, gap unit/eligibility, source-filter/reference context |
| 5 | `src/components/domains-view.tsx`, country route reference plumbing | Selected-measure propagation, lean topic table, home/related detail and evidence continuity |
| 6 | Proposed `src/components/charts/domain-profile.tsx`; existing domain/topic components | Comparison tracks, paired dots, selected-topic tiles and full-domain access; radar only after a successful optional prototype |
| 7 | `src/lib/claim-explorer.ts`, `src/lib/claim-view-state.ts`, `src/components/claim-explorer.tsx`, `claim-details.tsx`, `result-card.tsx` | Chart-origin selection adapter, precise count labels, target captions and less crowded collapsed rows |
| 8 | `src/components/regional-figures.tsx`, `charts/coverage-heatmap.tsx`, document/source displays | Consistent units, source-finding terminology, state preservation and evidence links |
| 9 | Country/regional route tab definitions, `methodology-content.tsx`, methodology page | Shared Regional comparison label, short explanations and complete removal of deviation annotations from presentation |
| 10 | `src/lib/country-export.ts`, client CSV builders, report-link helpers | Scope/label consistency; compatibility checks; report-aware exports |

Do not reuse `DomainRadial` as if it were a radar: it is a count-based radial wedge chart. Its older stage/status/score dependencies are not the current analytical model. `ScoreChip`, `TrendBadge`, legacy domain tiles, `ScoreReading` and `FiguresTable` need an explicit usage check before any cleanup. Dormant code removal is optional and separate from the display rollout.

## Sequence and review gates

### First pass

Freeze a baseline of representative report values and links. Complete the metric/term catalog, palette-role contract, normalization wording and status rules. Remove presentation-only statistical clutter. These changes should preserve numbers and behavior.

### Second pass

Refactor the existing country/regional panels and matrix to consume the shared presentation layer. Remove repeated chart/detail content. Carry the selected measure into domain/topic detail. Reconcile gaps and chart evidence selections.

### Third pass

Validate the comparison-track composition, selected-topic grid and two-country paired dots using actual aggregates. Inspect one clean complete case and one incomplete case on desktop/mobile. A single radar alternative may be prototyped for the same comparison task if it offers a clear visual benefit; it is not required for release. Do not build the deferred brainstorm concepts.

### Final pass

Apply the shared wording to Claims, Targets, source detail, exports and methodology. Verify desktop/mobile and keyboard workflows. Make the new presentation default only after the acceptance checks below.

Each pass should produce a reviewable screenshot set and a short numeric-parity report. Avoid a full application rewrite or an indefinite general design-system project.

## Acceptance checks before release

1. **Metric parity:** same report/scope yields the same Claims, Action claims, Claim points, coverage and stage index as before. Presentation corrections to gap eligibility are named and tested separately.
2. **Terminology:** every active title, dropdown, legend, tooltip, empty state, table heading and accessible name uses the catalog. Keep original source quotations unchanged.
3. **No statistical clutter:** automated rendered-copy checks cover matrix cells, comparison panels, chart details, legends, hover text, accessibility names and methodology. Internal calculation identifiers are not a user-facing failure.
4. **Color parity:** stage, absolute, comparison and missing-state mappings are consistent across overview, matrix and detail. Current comparison thresholds remain unchanged.
5. **Evidence parity:** selecting a chart stage/topic opens the exact counted groups, including mixed/unclassified edge cases. Domain/topic scoping does not silently broaden to unrelated members.
6. **Report continuity:** saved reports remain selected through charts, source links, forms, Back, refresh and export. A historical report is visibly distinct from current peer reports where applicable.
7. **Custom stages:** positive defaults, implementation subset, zero-point selection and empty selection all have correct labels/counts; none changes the score formulas.
8. **Missing states:** complete zero, context-only, unclassified, unresolved, unmatched quote, partial, failed, pending and demo cases remain distinguishable.
9. **Regional reference:** test zero, one, two and several eligible countries; equal values; all-zero values; source filters; incomplete peers; and different report taxonomies.
10. **Visual contract:** shared track scales, correct references, zero distinct from unavailable, stable domain order, useful selected-topic tiles and all 16 domains reachable. If radar is adopted, enforce maximum six axes/two profiles and no aggregate area score.
11. **Counts and denominators:** source findings, grouped claims, quotes, target-bearing claims and figures are not interchanged. Overlapping categories do not imply a partition.
12. **Responsive and accessible:** test 320px, tablet and desktop widths, long labels, zoom, keyboard, touch, reduced motion and light/dark appearances. Inspect contrast on actual colored surfaces.
13. **Interaction coherence:** a filter changes only its declared scope; active selection is visible; clearing it preserves unrelated report/metric state.
14. **Exports:** values and rounding reconcile with the screen; scope/report/method context travels with the output; established machine fields remain compatible.
15. **Task test:** users can identify coverage and the most common reported stage, compare a domain and open its evidence without learning the scoring formula. Use a small formative session to find misunderstanding, not to claim universal usability.
16. **Lean default:** complete reports show no repeated success badges, formula paragraphs, quote-match audit or deduplication notices. The primary task works without opening Methodology. Advanced information remains available through a clear link; a material exception uses one concise indication.

For implementation, run the affected semantic/selection tests, then the repository-required type, lint and relevant test checks. Verify visual and interaction behavior in the browser; passing source tests alone cannot validate the new hierarchy.

## Evidence basis and boundaries

This plan uses the supplied visualization guide for brainstorming, particularly task-first chart selection, color roles, linked-view interaction contracts and limited-profile radar use. It does not adopt the guide's illustrative data, full chart catalog or platform list.

The research informs the following decisions:

| Primary source | What it supports | Application here |
|---|---|---|
| [Brehmer and Munzner, A Multi-Level Typology of Abstract Visualization Tasks](https://www.cs.ubc.ca/labs/imager/tr/2013/MultiLevelTaskTypology/) | Separate the purpose, inputs/outputs and interaction method of a visualization task | Specify “compare domains” and “inspect supporting claims” before choosing a chart |
| [Heer and Bostock, Crowdsourcing Graphical Perception](https://idl.cs.washington.edu/files/2010-MTurk-CHI.pdf) | Their proportional-judgment experiments found position encoding more accurate than angle or circular area | Keep aligned bars and exact values for precise comparisons; do not treat radar area as a score |
| [Sarikaya and colleagues, What Do We Talk About When We Talk About Dashboards?](https://alper.datav.is/publications/dashboards/) | Dashboard design depends on audience, analysis goals and decision support | Give the overview a clear reading order and keep deeper investigation accessible |
| [W3C, Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html) | Information cannot depend on color alone | Preserve the requested palette with values, names, line styles and a table equivalent |

The six-domain preset, track composition, tile interaction and optional two-profile radar are design judgments to validate with this tracker’s users and data. These sources do not establish that one chart is universally superior, or that the proposed six domains are national priorities.

The audit inspected active route composition, metric/classification and score adapters, regional aggregation, comparison and domain/topic components, Claims/Targets/figures, source evidence, exports, status copy and color tokens. It also traced legacy chart references to distinguish dormant presentation from active calculations.

The six-domain inventory example comes from `fresh-start/config/taxonomy.json`, the repository seed. The live taxonomy is stored in the database and saved reports can carry earlier versions; implementation must resolve the actual selected report inventory.

The previous screenshot provides a useful numeric regression case: 124 claims, 67 action claims, 42/64 covered topics and 163 claim points. It does not provide the six domain scores needed to draw a real radar. Use actual report aggregates for the implementation prototype rather than inventing values.

No application code, taxonomy, classification data, scores or report snapshots are changed by this planning deliverable.
