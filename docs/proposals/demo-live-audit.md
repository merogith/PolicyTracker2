# Demo limits and live API audit

20 October 2026. Companion to [the pipeline update handoff](pipeline-update-handoff.md). This records implemented changes separately from the comprehensive pipeline still specified in that handoff.

## Why every domain showed six

The application was running with `OPENAI_FAKE=1`. Its local simulator deliberately returns at most six document findings, uses at most four findings per document for country synthesis, selects at most two topic tags, and shortens finding text to 200 characters. These are simulated examples, not evidence that the model found exactly six claims. Those fixture restrictions are confined to `src/lib/openai-fake.ts`; the live response schema has no finding, citation or topic array quota.

The local configuration now uses `OPENAI_FAKE=0`, `gpt-6-luna` for analysis and synthesis/tagging, and low reasoning effort. The real API accepted the saved key and confirmed access to this model. Credentials are never copied into this report.

## Implemented changes

| Area | Previous behavior | Current behavior |
|---|---|---|
| AI mode | Local fake responses enabled | Live API configured; missing credentials fail explicitly; no fake fallback |
| Saved answers | Demo origins not persisted explicitly | All 64 existing demo answers labeled; new answers record mode and response ID |
| Demo index migration | Fake store/file IDs could reach the API | Document re-runs rebuild a real index; live synthesis rejects demo input |
| PDF upload | Application rejected files over 50 MiB | That application quota removed; actual memory/deployment constraints still apply |
| Original PDF upload | Unused original also uploaded to OpenAI | Original stays local; page text is uploaded for retrieval |
| PDF pages | All pages parsed, but fewer than 20 non-whitespace characters excluded | Any nonempty extracted page text is eligible; old short-page dispositions corrected during re-ingestion |
| Cost gate | Default USD 25 estimate rejection | Disabled by default (`MAX_USD_PER_RUN=0` or unset); explicit positive user cap still respected |
| Quote length | Prompt asked for about 40 words maximum | No word quota; preserve necessary conditions, dates, units and qualifications |
| Topic labeling | Prompt encouraged one or two tags | Every supported topic allowed; no topic-count quota |
| Finding count | No live schema quota, but concise prompt | Explicit instruction to retain every distinct useful statement in retrieved evidence |
| Unmapped results | Only first 60 shown | Full retained list accessible |
| Untagged results | Only first 20 shown | Full retained list accessible |
| Run history | Latest 300 jobs only | All jobs accessible with 100-row pagination and filters |

Topic summary cards still show three preview highlights. Their full detail view remains accessible, so this is a preview rather than an extraction or retention limit. File attachment batches of 500 and API listing pages of 100 iterate through the whole collection; they are not total-file caps.

The database was backed up before adding demo provenance at `output/demo-limit-audit/before-live-configuration.db`. Existing answers were preserved. Switching the configuration does not turn saved demo answers into real model results; document re-analysis is required to replace them.

## Real API test

The reproducible test is `scripts/test-live.ts` (`npm run test:live -- --document KAZ-NDC1 --domain water`). Its report is [live-api-test.json](../../output/demo-limit-audit/live-api-test.json).

It uses a temporary real vector store, uploads all text-bearing pages from the stored 93-page Kazakhstan document, checks that every uploaded page is indexed, then uses the application's real request builder and structured-output gateway for the water domain. It records provider response ID, actual token usage, search calls, estimated inference/search cost, retrieved pages, full output and source-quote checks. It deletes its temporary store and files afterward and does not overwrite saved app answers.

Indexing failures are recorded per file. Failed/missing attachments get one automatic recovery attempt; still-pending work is polled with a finite deadline. An incomplete index fails the test instead of silently analyzing fewer pages. The first attempt stopped at this guard and cleaned up; the subsequent attempt indexed all 93 pages successfully and completed the real request.

| Observed result | Value |
|---|---|
| Status | `passed_api` |
| Model | `gpt-6-luna`, low reasoning |
| Uploaded and successfully indexed | 93 / 93 text-bearing pages |
| Findings | 14 |
| Source quotes matched | 14 / 14, using NFC and whitespace normalization only |
| File-search calls | 2 |
| Distinct retrieved pages | 25, including PDF pages 90, 92 and 93 |
| Input tokens | 26,372; zero cached tokens reported |
| Output tokens | 2,865, including 348 reasoning tokens |
| Estimated inference + search cost | USD 0.0090697; excludes storage and provider adjustments |
| Provider response ID | `resp_0c8c6bfe60654d81016ad6a04aa85887d29cbc218582a333b3` |
| Temporary API resources | Store and all uploaded files deleted; no cleanup errors |

This is a successful live integration test for one domain, not a full-country run or a model-quality benchmark. Fourteen findings demonstrate that the six-finding limit was a simulator restriction. They do not establish complete semantic recall. Keep Luna as the inexpensive starting configuration and evaluate extraction/organization with automatic coverage and grounding checks in the new pipeline.

Exact quote checks normalize Unicode NFC and whitespace only. They preserve numeric signs and other content. A successful provider response is separate from source-check success and does not establish that the model found every claim or correctly interpreted every statement.

The local connection required Windows' trusted certificate store. TLS verification remains enabled. Both the dashboard and worker were restarted with that configuration. The dashboard's stale build cache also had to be refreshed after its compiler selected the computer's old Node 14; the preserved cache is `.next/dev-before-node24`. The running app uses bundled Node 24.

## Remaining limits and required pipeline work

There is no application page-count or live finding-count quota. However, the current runtime is still selective retrieval, with one request per document/domain followed by country/domain synthesis. It has not yet become exhaustive chunk-by-chunk extraction.

| Current mechanism | Meaning and required update |
|---|---|
| 20 passages per search by default; configurable 1–50 | All indexed pages are searchable, but only retrieved passages reach this request. Comprehensive extraction must enumerate every source packet instead. |
| Search chunks 2,000 tokens / 200 overlap inside each page file | Existing retrieval setting. The handoff recommends separate 800-token search chunks / 100 overlap and larger owned extraction packets. |
| 32,000 output tokens per request | Finite request capacity. Truncation currently triggers one retry then failure; the new pipeline must subdivide and resume, never silently drop claims. |
| No OCR/table-layout recovery | Text-only processing cannot establish full coverage of scanned pages, figures or complex tables. A little extracted text does not prove a whole page was read. |
| One country synthesis payload per domain | Large country inputs need partitioned, durable organization with complete record accounting. |
| Existing finding schema and quote-based merging | Separate readable titles, structured claim identities, variants and evidence-linked claim organization remain part of the broader handoff. |
| Existing citation normalization | The application's tolerant highlighter/quote matcher is not a complete factual validator. The new evidence layer must preserve numbers and qualifications. |
| Provider/network/server constraints | Context, output, rate, storage, account and memory limits still exist. Queue, split, stream or retain visibly incomplete work when they are reached. |

Preserve the agreed methodology. Do not add manual validation or approval steps. The comprehensive update must automatically account for source units and retained statements, repair failures, organize claims, attach understandable titles and evidence, and run single documents or the full corpus country by country. This audit does not certify that migration as implemented.

## Verification

- TypeScript check and lint of `src` and the live-test script passed.
- 42 automated tests passed, including all-page extraction and short-note retention.
- Dashboard, demo provenance and run-history navigation were checked locally.
- Live provider test passed with the usage, quote checks and cleanup results recorded above and in the machine-readable report.
