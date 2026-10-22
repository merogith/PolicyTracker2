# Verification and implementation boundary

## Final plan 4.2: 20 October 2026

The [final upgrade plan](../team/FINAL-UPGRADE-PLAN.md) is the controlling implementation proposal. Its eleven-page PDF was rendered and visually inspected, including the OCR table, updated simple/technical flows and approved dashboard references. The SVG and draw.io diagrams parse as XML. Packaging checks local Markdown links, JSON parsing, archive integrity and file hashes; it preserves the original 108 application files and 15 runtime reference copies and reports subsequent workspace drift without overwriting it.

Presentation 4.1 and scoring method 4.0 remain unchanged. The v3 prompt/contract files are explicitly marked as baselines awaiting phase-1 migration. No new application integration, OCR installation, live model call or runtime test was performed by this planning revision. Historical checks below are not evidence that the newly planned OCR and packet-extraction path is implemented.

## Earlier reference verification

**This file records the LLM pipeline and historical v3 scoring checks.** Current UI/scoring verification is maintained in [revision 4.0](../ui-scoring/VERIFICATION.md); the earlier band calculator is not the proposed dashboard score.

19 October 2026. All checks below concern the review artifacts and offline reference code. The application was not migrated, deployed or activated.

## Executed checks

- **15 input-contract tests:** explicit file allowlist, strict taxonomy enums, untrusted source instructions, context/output budget checks, numeric signs/ranges/comparators and cropped values, factual units/periods, source roles, record accounting, context-only ownership and stable request keys across snapshot-only changes.
- **49 scoring tests:** four bands, independent response/detail/implementation predicates, uncertainty bounds, unique-topic country totals, source-local evidence, multi-topic projections, missing required document roles, invalid inputs and no unsupported field borrowing.
- **20 snapshot tests:** comparable new editions, percentage-point arithmetic, source/method/profile mismatches, backfills, incomplete scope and invalid dates.
- **Water example reproduced:** combined band 3; NDC 2025 band 2; NAP 2024 band 1; NAP 2026 band 3. Capacity stays context; incompatible targets stay variants. The tiny profile's 100% coverage is not a national quality score.
- **Dashboard mockup:** desktop interactions, source detail toggle, uncertainty scenarios, regional metric switching and all four mobile views checked headlessly. Synthetic data only.
- **Diagrams/PDFs:** editable two-page draw.io XML, two SVGs and their PNG renders; four final PDF books rendered page by page and inspected for layout.
- **Preservation and packaging:** SHA-256 checks against all 108 preserved application files and their archive bytes; local links, JSON parsing and final package hashes checked.

The references require no provider SDK or network for tests. The current checkout has no installed application dependencies or available live database configuration; production integration and a real-document LLM accuracy/cost benchmark were not performed.

## Repeat the core checks

Use Node 24 or later from the repository root:

```text
node docs/review/reference/input-contract.test.mjs
node docs/review/reference/score-bands.test.mjs
node docs/review/reference/compare-snapshots.test.mjs
node docs/review/reference/check-water.mjs
node docs/review/reference/build-inputs.mjs --write-examples
```

The first three files contain **84 tests in total**. The water command separately checks the complete worked fixture against saved input/output. Rebuilding requests intentionally updates their source hashes. Rebuild bundle/package hashes afterward.

The illustration builders are `render-diagrams.py` and `build-preview.py`; the latter reuses archived v2 visual styles. `check-preview.cjs` uses Playwright and installed Edge, with the Playwright module location supplied by `POLICY_PLAYWRIGHT_MODULE` if necessary. `build-pdfs.py` uses ReportLab and Windows Arial/Consolas; diagram PNGs must exist first. `check-pdfs.py` uses pypdfium2, pypdf and Pillow to render pages. These are artifact-authoring utilities, not production dependencies or LLM input.

## What these checks do not prove

Strict schemas and source matching do not prove semantic entailment, claim identity, national applicability or complete retrieval. The scoring reference consumes qualified normalized facts; it cannot make those factual judgments itself. Production adapters still need to enforce evidence provenance, current-versus-historical selection, explicit per-topic projections and the provisional-singleton fallback.

Reference token values are character-based estimates. They are not measured provider tokens or cost savings. Initial budget/concurrency values need evaluation against representative NAP/NDC material before activation. No claim of zero hallucinations or nationally verified implementation is made.

Production acceptance means automated software and representative-source tests, not a human approval gate for each country result. Outputs publish automatically as complete or explicitly partial, with recoverable post-publication flags and visibility controls.
