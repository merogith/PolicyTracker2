# Country report history

A completed country analysis is saved as an immutable report. The Reports menu opens any saved
version; **Use as main** selects the version used by country and regional dashboards and the default
JSON export. Viewing a historical report does not change the main selection. Subsequent completed
analyses create new versions without replacing the chosen main report. The first completed report
is selected automatically. Failed or still-running work cannot replace it.

Snapshots contain source findings, classifications, quotations, citations, narrative summaries,
document metadata and extracted pages, the taxonomy and its settings, label/scoring definitions,
computed dashboards for every supported action-stage filter, and a complete JSON export.
Original PDFs are retained by content hash under `storage/report-sources/`. Evidence links in a
saved report use that report's citations and pages, even if working results are replaced or the
working document is removed. Regional comparisons use each country's selected main report;
relative position can change when the peer reports or comparison method change.
Deleting an entire country also deletes its reports and any archived PDFs no remaining report uses.

Report payloads are protected against updates by a database trigger. New reports are saved only
after all current document/domain answers and country summaries finish and no country jobs are
pending. A before/after input signature and a transaction prevent publishing a snapshot assembled
across concurrent edits; identical input state is deduplicated. Completion here means the configured
analysis finished, not proof that retrieval found every relevant assertion.

Existing analyses were saved before the October 20 Kazakhstan/Türkiye repair. Already-overwritten
analyses predating report history cannot be recreated faithfully without an existing backup/export.
The original repair database is retained at `output/report-history-repair/before.db`.

## October 20 targeted repair

The quotation verifier preserves numeric minus signs and range separators, treats ASCII and Unicode
minus as equivalent, and refuses fragments that drop a sign or match inside a different number.
Word hyphenation and typographic quotation marks remain normalized. This is a mechanical source
match, not a semantic entailment check.

The Kazakhstan/Türkiye repair changes only invalid quotations and missing or invalidated labels.
Table facts must cite the relevant column header as well as the data row when units or years come
from the header. Supported finding text is preserved. Two unsupported search-absence statements
are kept as notes rather than scored policy claims. Affected summaries retain their narrative,
rebuild evidence references from saved findings and append previously omitted source assertions.
No whole-document extraction or retrieval rerun is required.

Run `scripts/verify-report-repair.ts` to check saved quotations, classifications, summary references,
unchanged assertions and main-report totals. Machine-readable repair results are saved under
`output/report-history-repair/`.
