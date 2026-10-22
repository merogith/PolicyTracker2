# Verification and delivery status

19 October 2026 · review specification v2.0.0

## Completed in this pack

- Updated proposed configuration, prompts, scoring, grouping, data dictionary and implementation guides.
- Preserved 16 domains and 64 topic codes; documented every configured field/choice, including optional specialist facets.
- Added exact current runtime copies and rendered prompt-builder examples, clearly separated from proposed replacements.
- Added two editable draw.io pages, SVG previews and an interactive local dashboard example.
- Regenerated the seven-page handbook PDF and visually inspected every page.

## Checks performed

- **36 deterministic scoring tests pass**, including incompatible variants, foreign evidence, source-local document history, partial processing, malformed inputs and fixed denominators.
- The water fixture passes: combined topic band 3; NDC 2025 band 2; NAP 2024 band 1; NAP 2026 band 3. Target conflict remains; context is not achievement.
- JSON files parse; topic IDs/homes and scoring/label vocabularies agree. Water provenance pointers resolve and every record has one owner.
- All 15 runtime reference source/config copies match their unchanged application originals byte-for-byte.
- Local Markdown links resolve; two draw.io pages and both SVG files parse with valid cell references.
- Dashboard tabs, context toggle, coverage scenarios, unknown cells and mobile width were checked in an isolated headless browser. Desktop/mobile layouts and flow diagrams were visually inspected.
- Bundle hashes identify the proposed files. The archive contains the review folder and handbook PDF.

Run the reference checks with Node.js from the repository root:

```text
node docs/proposals/lean-pipeline/reference/score-bands.test.mjs
node docs/proposals/lean-pipeline/reference/check-water.mjs
```

After changing the synthetic water fixture, `check-water.mjs --write` regenerates its saved normalized scoring input/output. Ordinary execution checks them without writing. The runtime-reference export script reproduces illustrative current prompts offline; consult its README for the exact command.

## Boundary of this delivery

This is a completed methodology/review pack with executable reference rules. It is **not runtime activation**, a database migration, a live country extraction, a production cost benchmark or proof of LLM accuracy. No application build is claimed; installed application dependencies and live database/environment configuration were unavailable in this checkout. PLANNED-CHANGES.md maps the remaining integration work.

Normal operation in the proposed design still publishes automatically: software regression checks do not introduce a human country-result review queue.
