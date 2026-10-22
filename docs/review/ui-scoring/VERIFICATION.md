# Verification and delivery boundary

20 October 2026. Presentation 4.1.0 / scoring method 4.0.0 is a review proposal, not an active application change.

## Executed checks

- **25 scoring tests passed.** They cover four-check arithmetic, context without a policy ID, unsupported weights, duplicate identities, source ownership, contradictory values, uncertain qualification, incomplete inventories, source profiles, fixed-topic rollups, secondary projections, color boundaries and comparable-edition arrows.
- **15 existing input-contract tests passed again** after refreshing the bundle: scoring/archive files stay outside LLM inputs, source references and numerical meanings remain checked, and snapshot-only changes do not invalidate unchanged extraction requests.
- **18 browser checks passed** using local headless Edge: 16 domain cards, focused domain/topic navigation and back controls, keyboard focus, topic-to-claim-to-source drill-down, direct regional topic links, source-local NDC results, matched-edition arrows, unavailable aggregate scores, shared policy-detail labels, and country/domain/evidence/region/document layouts at 1024, 390 and 320 pixels. No JavaScript runtime errors were observed. Country screens have no visible text below 11 pixels at these widths.
- **13 synthetic assessments reproduce from saved inputs:** three invented countries, current/previous snapshots and seven document-only assessments, using the full 16-domain/64-topic taxonomy.
- Comparing every saved assessment before and after the presentation update confirmed that inputs, numeric values, counts, colors and comparison outcomes are unchanged. Only level-label text changed.
- The irrigation example produces **87.5**, **3 unique claims**, **2 responses** and **1 context claim**. The NDC-only view produces **75** without borrowing the NAP's canal actor or capacity context.
- Light, dark, mobile, source-detail and regional screens were visually inspected. Incomplete regional bars have no quantitative fill and show a dash; possible bounds are supplementary detail.
- The **16-page PDF** was rendered and inspected, including the UN-framework section, worked example, new legend and options table. The simple and technical SVG/draw.io diagrams continue to describe the unchanged two-stage flow and deterministic score layer.
- The inline preview is below 1 MB and embeds calculated synthetic examples. It does not call an LLM or fetch application data.

## Reproduction

From the repository root, with Node and Python available:

```sh
node docs/review/ui-scoring/scoring.test.mjs
node docs/review/ui-scoring/scoring.mjs --recompute-examples
python docs/review/ui-scoring/build-dashboard.py
```

`build-dashboard.py` refreshes embedded data, without recalculating scores. The editable source is `dashboard.fragment.html`; `dashboard.html` is its standalone preview wrapper. Regenerate the wrapper after changing the fragment, using the visualization renderer used for this review.

`check-preview.cjs` runs the local browser checks and refreshes screenshot/diagram image copies. Set `PLAYWRIGHT_PATH` and `BROWSER_BIN` if using a different machine. Then `python docs/review/ui-scoring/build-review-pdf.py` generates the PDF with ReportLab and the locally rendered images. The current helper uses Windows Arial/Consolas fonts from the existing review builder.

`python docs/review/reference/package-review.py` checks every archived application/runtime file, local Markdown links, JSON parsing and archive hashes before rebuilding the complete review ZIP. It also reports current workspace differences from the frozen baseline in `PACK-MANIFEST.json`; it never overwrites or silently recaptures them.

## Limits

These checks establish arithmetic, fixture consistency and prototype behavior. They do not establish live extraction recall, semantic entailment, correct policy-object grouping, model cost or production latency. Source checks and normalized adapter inputs remain prerequisites for integration. There were no model calls, database migrations, deployments or live country assessments in this revision.

This presentation revision changed no application files. The preserved archives still match all 108 application-file and 15 focused runtime-copy hashes. The current workspace has 21 paths differing from the frozen 19 October baseline; these later differences were detected during packaging and are listed in `PACK-MANIFEST.json`. Prior implementation findings therefore require a current-source recheck before activation. The prototype's flags are local interface state, not a moderation queue or database write. Old v3 scoring files/tests remain explicitly historical; the current scoring authority is `ui-scoring/scoring.json` plus its matching calculator.
