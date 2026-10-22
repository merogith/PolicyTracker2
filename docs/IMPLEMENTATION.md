# Policy Tracker: implementation plan

For the implementing agent. Read `docs/PLAN.md` first. Work phase by phase; each phase ends with its acceptance check passing. Commit at the end of each phase.

## 0. Before writing code

1. Verify the OpenAI API shapes against the current documentation and the installed `openai` npm package types. Do not rely on memory for these:
   - Files: upload with the purpose that vector stores and Responses input accept.
   - Vector stores: create; add a file with `attributes` (string, number or boolean values); list files with their indexing status; delete a file; delete a store.
   - Responses API: `input` with text and an input file; `tools: [{ type: "file_search", vector_store_ids, max_num_results, filters }]` with a comparison filter on an attribute; `include` to return the retrieved chunks; structured output through a JSON schema with `strict: true`.
   - The current flagship reasoning model id and a cheaper model id; put both in environment variables, do not hard-code them.
   Record what you verified at the top of `src/lib/openai.ts` as a comment with the documentation URLs.
2. Confirm Node 20+, and pick the package manager already present in the repo (none yet: use npm).

## 1. Project setup

- `npx create-next-app@latest` at the repo root with TypeScript, App Router, Tailwind, ESLint, `src/` directory. Keep `fresh-start/` and `docs/` as they are.
- Add: `prisma`, `@prisma/client`, `openai`, `pdf-parse` (or `pdfjs-dist` if page-level text is more reliable; test both on one real NDC and keep one), `zod`, `shadcn/ui` components as needed.
- `.env.example` with `DATABASE_URL`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_MODEL_CHEAP`, `STORAGE_DIR`, `MAX_USD_PER_RUN`. Never commit `.env`.
- Scripts: `dev`, `build`, `start`, `worker` (`tsx src/worker/index.ts`), `db:migrate`, `db:seed`, `check`.

Acceptance: `npm run dev` serves an empty home page; `npm run worker` starts and idles.

## 2. Database

Prisma schema with the entities in PLAN.md Part 5: `Country`, `Document`, `Page`, `AnalysisKey`, `AnalysisResult`, `Citation`, `Job`. Notes:

- `Document.status`: `uploaded`, `extracting`, `indexing`, `analysing`, `analysed`, `failed`.
- `Page.disposition`: `extracted`, `unreadable`.
- `AnalysisKey`: `id` is a slug chosen by the user (validated `[a-z0-9-]`), plus `label`, `question`, `scope`, `outputType`, `mode`, `searchHints` (string array), `enabled`, `order`, `version`, `deletedAt`.
- `AnalysisResult`: `keyId`, `keyVersion`, `documentId` nullable, `countryId`, `status` (`queued`, `running`, `done`, `failed`), `output` JSON, `model`, `promptVersion`, `inputTokens`, `outputTokens`, `costUsd`, `error`.
- `Citation`: `resultId`, `documentId`, `page`, `quote`, `verified`.
- `Job`: `type` (`ingest_document`, `analyse_document_key`, `synthesise_country_key`, `delete_document`, `delete_country`), `payload` JSON, `status` (`queued`, `running`, `done`, `failed`), `attempts`, `error`, `runAfter`.
- Unique: one live result per (`keyId`, `keyVersion`, `documentId`) and per (`keyId`, `keyVersion`, `countryId`) for country scope.

Seed: the twelve starter keys from PLAN.md Part 6 with sensible questions and search hints.

Acceptance: `npm run db:migrate && npm run db:seed` creates the schema and twelve enabled keys.

## 3. Countries and documents

- Pages: `/countries` (list, create form), `/countries/[iso3]` (documents list, upload form, status).
- Upload route: accept a PDF, store it under `STORAGE_DIR/<iso3>/<document_id>.pdf`, compute sha256, create the `Document` row with `status: uploaded`, enqueue `ingest_document`.
- `document_id` format: `<ISO3>-<KIND><n>` where n increments per kind within the country, e.g. `KAZ-NDC1`. Shown in the UI.
- Creating a country creates its OpenAI vector store (name `policy-tracker-<iso3>`) and saves the id. Deleting a country enqueues `delete_country`, which deletes results, documents, page files, the vector store and the uploaded files at OpenAI, then the row.

Acceptance: create a country, upload a PDF, see it listed with status `uploaded` and a queued job on `/runs`.

## 4. Worker and ingestion

- `src/worker/index.ts`: loop that claims one queued job at a time (`runAfter <= now`, atomic update to `running`), runs the handler, marks done or failed with the error, and retries up to 3 times with backoff. Concurrency 2 by default (`WORKER_CONCURRENCY`).
- `ingest_document` handler:
  1. Upload the PDF to OpenAI Files; save `openaiFileId`.
  2. Extract text per page; save `Page` rows; pages with fewer than 20 characters of text are `unreadable`.
  3. For each extracted page, upload a text file named `<document_id>-p<page>.txt` to the country's vector store with attributes `{ country, document_id, page, kind, edition_date }`; save the file id on the page.
  4. Poll the vector store file list until every page file is indexed or failed; fail the job if any failed after retries.
  5. Set `status: analysing` and enqueue `analyse_document_key` for every enabled key with document or both scope. Enqueue a final `synthesise_country_key` per country-scope key, with `runAfter` set so it runs after the document jobs (or make the synthesis job check that all document results exist and requeue itself otherwise).

Acceptance: after upload, the document reaches `analysing`, its pages appear on `/countries/[iso3]/documents/[id]`, and the vector store shows one file per readable page.

## 5. Analysis engine

`src/lib/analysis/`:

- `schemas.ts`: zod schemas and JSON schemas for the four output types. All share `{ not_found: boolean, note: string | null, citations: Citation[] }` where `Citation = { page: number, quote: string }`.
  - `text`: `{ answer: string, confidence: "high" | "medium" | "low" }`
  - `list`: `{ items: { text: string, citations: Citation[] }[] }`
  - `findings`: `{ findings: { text: string, kind: "concern" | "commitment" | "planned_action" | "underway" | "delivered" | "other", numbers: { value_as_stated: string, unit: string | null, period: string | null }[], citations: Citation[] }[] }`
  - `facts`: `{ facts: { metric: string, value_as_stated: string, value: string | null, unit: string | null, period: string | null, conditionality: "unconditional" | "conditional" | "not_stated", citations: Citation[] }[] }`
  - Country scope adds `{ by_document: { document_id: string, summary: string }[], changes_between_editions: { text: string, document_ids: string[] }[] }`.
- `prompt.ts`: `PROMPT_VERSION` constant; a system text with the evidence rules (quote exactly as printed, give the page number from the file you cite, write `not_found: true` when the pages contain nothing on the question, never invent numbers, keep conditional and unconditional figures separate); a user text with the key's question and the output expectations. Keep these short and in one place.
- `run.ts`: `analyseDocumentKey(documentId, keyId)`:
  1. Load document, key, pages.
  2. Build the Responses request: model from env; structured output with the key's JSON schema (`strict`); in `retrieval` mode the `file_search` tool over the country's vector store with `filters: { type: "eq", key: "document_id", value }`, `max_num_results: 20`, and the search hints appended to the question; in `full_document` mode the PDF as an input file instead of the tool.
  3. Parse and validate with zod; on validation failure retry once with the error appended, then fail the result.
  4. Verify citations: normalise (lowercase, collapse whitespace, strip quotes and dashes) and test `pageText.includes(quote)`; also accept a match on any page if the cited page is off by one (PDF page labels differ from physical pages); set `verified`.
  5. Save the result, citations, usage and cost (price table in `pricing.ts`, editable).
- `synthesise.ts`: `synthesiseCountryKey(countryId, keyId)`: input is the document results for the key in edition order as JSON; same system rules; output is the country-scope schema; citations are copied from the document results it names, not generated.

Acceptance: run the engine on one real NDC for the twelve keys; every result validates; the verified rate is printed; at least the mitigation targets fact matches the document.

## 6. Dashboard

- `/countries/[iso3]`: document tabs; per document a grid of cards, one per enabled key, each with the answer rendered by output type, citations as "p. 12: 'quote'" links to the page viewer, an unverified badge where needed, a stale badge when `keyVersion` is behind the key, and a re-run button. Country summary section below with the country-scope cards.
- `/countries/[iso3]/documents/[id]`: the same cards plus a page viewer (page text with the cited sentence highlighted; link to the PDF at that page) and a raw JSON toggle.
- `/keys`: table with add, edit (modal with all fields), remove (soft delete), enable toggle, reorder. Editing `question`, `outputType`, `mode` or `scope` bumps `version` and enqueues re-runs for all documents and countries; editing `label`, `order`, `searchHints` does not bump the version (hints change retrieval, so offer a "re-run" button instead of forcing it).
- `/runs`: jobs table with filters, retry and cancel.
- Status polling: pages refresh job and document status every few seconds while anything is running.

Acceptance: the definition of done in PLAN.md Part 2 passes end to end on a fresh database with two real documents.

## 7. Hardening

- Deletion cascades to OpenAI (files, vector store files, store).
- Cost cap: refuse to enqueue a run that would exceed `MAX_USD_PER_RUN` based on page counts and key count; show the estimate before running.
- Rate limiting and 429 backoff in the OpenAI client wrapper.
- Export: `/api/countries/[iso3]/export.json` with documents, keys, results and citations.
- `npm run check`: typecheck, lint, and a script that validates every stored result against its schema and reports the verified-citation rate per key.

## 8. Optional, after version 1

- "Ask this country" box: Responses with `file_search` over the country's store, answer with citations.
- Mirror results as text files into the store with attribute `type: analysis`, so the ask box can search analyses too.
- OCR for unreadable pages.
- Cross-country comparison page per key.
- Scores per result, as a separate table, if wanted later.

## 9. Test scenario for acceptance

1. Fresh database. `npm run db:migrate && npm run db:seed`.
2. Create country Kazakhstan (KAZ). Upload NDC 3.0 (kind NDC, edition date) and the NAP (kind NAP, edition date).
3. Both documents reach `analysed` with no manual action; `/runs` shows no failed jobs.
4. Country page shows twelve cards per document and twelve country summaries; citations open the page viewer at the right page; the verified rate is above 90 percent.
5. Add a key "Glacier and cryosphere" (findings, retrieval). Only that key runs, for both documents and the country.
6. Remove "Groups addressed". Its cards disappear; nothing else re-runs.
7. Delete the NAP. Its results disappear; the country summaries re-run; the vector store no longer lists its page files.
