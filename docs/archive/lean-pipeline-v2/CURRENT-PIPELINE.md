# Current pipeline: what actually runs

**Repository audit, 19 October 2026.** This describes the existing application, not the proposed replacement configuration. It is based on source-code inspection; it does not measure deployed accuracy, extraction recall, latency or cost. The files elsewhere in this proposal folder are not connected to the runtime.

## The present flow

`Country → PDFs → page text → per-document/domain extraction → per-country/domain synthesis → topic views → scores and dashboard`

1. A country has one OpenAI vector store. Uploading a PDF saves its metadata and hash, rejects identical uploads within that country, and queues ingestion.
2. Ingestion extracts page text, uploads each readable page with document/page attributes, waits for indexing, then queues one extraction job for every enabled domain. There is no OCR fallback.
3. Stage 1 asks the domain question separately for each document. File search is filtered to that document. The model returns findings, topic IDs, stages, figures and page quotes. Code checks the JSON and matches quotes against stored text.
4. Stage 2 waits for ingestion and pending extraction jobs, then combines the completed answers for the same country and domain in edition order. Missing answers are recorded. Failed jobs do not require human approval or prevent all synthesis.
5. Country findings reference document findings. Code copies their quotes and inherits their topic tags. Topic views additionally merge items sharing an identical normalized quote on the same document/page.
6. Code computes topic scores, domain totals and charts. Document answers remain separately accessible.

## Runtime file map

| Responsibility | Active files |
|---|---|
| Countries, PDFs and local storage | [countries.ts](../../../src/lib/countries.ts), [documents.ts](../../../src/lib/documents.ts), [storage.ts](../../../src/lib/storage.ts) |
| Text extraction and indexing | [pdf.ts](../../../src/lib/pdf.ts), [ingest.ts](../../../src/lib/ingest.ts) |
| Queue, retries and execution | [jobs.ts](../../../src/lib/jobs.ts), [worker/index.ts](../../../src/worker/index.ts), [worker/handlers.ts](../../../src/worker/handlers.ts) |
| Stage 1 extraction | [analysis/run.ts](../../../src/lib/analysis/run.ts) |
| Stage 2 country synthesis | [analysis/synthesise.ts](../../../src/lib/analysis/synthesise.ts) |
| All active prompts | [analysis/prompt.ts](../../../src/lib/analysis/prompt.ts): extraction, synthesis, retagging and retry wording; version `2026-10-18.4` |
| JSON contracts and checks | [analysis/schemas.ts](../../../src/lib/analysis/schemas.ts), [analysis/call.ts](../../../src/lib/analysis/call.ts), [analysis/verify.ts](../../../src/lib/analysis/verify.ts) |
| LLM gateway and costs | [openai.ts](../../../src/lib/openai.ts), [analysis/pricing.ts](../../../src/lib/analysis/pricing.ts), [cost.ts](../../../src/lib/cost.ts) |
| Taxonomy and edits | [taxonomy.ts](../../../src/lib/taxonomy.ts), [taxonomy-edit.ts](../../../src/lib/taxonomy-edit.ts), [analysis/retag.ts](../../../src/lib/analysis/retag.ts) |
| Combined topic views and scores | [topics.ts](../../../src/lib/topics.ts), [topic-merge.ts](../../../src/lib/topic-merge.ts), [scoring.ts](../../../src/lib/scoring.ts), [rubric.json](../../../config/scoring/rubric.json) |
| Persistence | [schema.prisma](../../../prisma/schema.prisma): SQLite models for documents, pages, taxonomy, results, citations and jobs |

The gateway uses the OpenAI Responses API. Extraction selects `OPENAI_MODEL`; synthesis and retagging select `OPENAI_MODEL_CHEAP`, falling back to the extraction model. [openai-fake.ts](../../../src/lib/openai-fake.ts) supports demo runs through `OPENAI_FAKE=1`. Environment examples are not evidence of deployed model settings.

## Where definitions live

**Taxonomy:** the database is the runtime authority for domains, topics, placements and routing. [taxonomy.json](../../../fresh-start/config/taxonomy.json) seeds 16 domains and 64 topics through [seed.ts](../../../prisma/seed.ts); seeding returns without replacing an existing taxonomy. The seed's general rules are also imported by `taxonomy.ts`. Editing seed topic definitions does not update existing database topics. Domain questions are generated from current definitions and topic labels.

**Results:** `AnalysisResult.output` stores document/country JSON; `Citation` stores quotes and verification flags; `sources` records retrieved pages or source-result references. There is no persistent `Claim`/`Record` model. Finding references use array positions such as `findings.2`, rather than durable semantic identities.

**Scoring:** the active rubric gives −1 for no findings, 0 for concerns/unstaged material, and +1 for any response stage. Domain scores sum their placed topics. Multi-domain topics contribute to multiple totals.

## Dashboard entry points

- [Regional matrix](../../../src/app/countries/page.tsx): country/domain stage or score comparison.
- [Country page](../../../src/app/countries/[iso3]/page.tsx): overview, documents, combined summaries and topics.
- [Document page](../../../src/app/countries/[iso3]/documents/[id]/page.tsx): document answers and cited pages.
- [Result cards](../../../src/components/result-card.tsx), [domain/topic view](../../../src/components/domains-view.tsx), [page viewer](../../../src/components/page-viewer.tsx): evidence presentation.
- [overview.ts](../../../src/lib/overview.ts) and [views.ts](../../../src/lib/views.ts): dashboard data assembly.
- [Taxonomy UI](../../../src/app/taxonomy/page.tsx) and [Runs UI](../../../src/app/runs/page.tsx): configuration and operations.

## Confirmed structural weaknesses and proposed correction

| Current behavior, visible in code | Proposed correction |
|---|---|
| Stage 2 selects answers by the question that found them. A water-tagged finding discovered under Agriculture is not first pooled into Water synthesis. | Pool stable source records by taxonomy before organization. |
| Stage 2 removes quotes/topic tags from its input; it receives extracted text and references. Quote-match failures do not exclude findings. Unknown returned references can still be saved as a completed summary. | Enforce automated source/reference eligibility; retain supporting evidence and visible diagnostics. |
| Shared-quote merging can combine different propositions, while equivalent propositions with different quotes remain separate. | Explicit claim membership and typed relationships. |
| Merged findings retain the highest stage and all source documents. Historical comparisons then reuse that stage for both earlier and later documents. | Preserve source-specific stages and dated updates. |
| Missing/failed processing can leave no findings and therefore a negative score. | Separate unavailable work from completed searches; publish coverage and score bounds. |
| “Pages read” counts extractable pages; cards show the configured result limit as “pages searched.” | Label extracted, retrieved and cited pages separately. |

## Historical material

[fresh-start/PIPELINE.md](../../../fresh-start/PIPELINE.md), [GUIDE.md](../../../fresh-start/GUIDE.md), [claims.json](../../../fresh-start/config/claims.json), [vocabulary.json](../../../fresh-start/config/vocabulary.json), the [JSON schemas](../../../fresh-start/schemas), and [check.py](../../../fresh-start/scripts/check.py) describe a richer earlier record/claim design. They are not the active extraction contracts or runtime claim engine. The taxonomy seed is the important exception.

[docs/PLAN.md](../../../docs/PLAN.md) and [IMPLEMENTATION.md](../../../docs/IMPLEMENTATION.md) also contain earlier design assumptions. Use the runtime map above to determine current behavior. [check-results.ts](../../../scripts/check-results.ts), [scenario.ts](../../../scripts/scenario.ts) and [make-sample-pdfs.ts](../../../scripts/make-sample-pdfs.ts) are supporting checks/demo scripts, not production prompt definitions.
