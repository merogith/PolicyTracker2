# Policy Tracker

A dashboard for national climate and disaster-risk policy documents. Create a country, upload its PDFs, and every document is asked one question per domain of the taxonomy (16 domains, 64 topics, seeded from `fresh-start/config/taxonomy.json`). Each answer lists findings with their response stage, the figures they state and quotes with page numbers, checked automatically against the page text. Each domain also gets a combined summary across the country's documents, and each country gets an overview of charts.

Every finding is tagged with topic IDs; domains come from the topics' placements. The Domains & topics tab of a country shows findings by domain and topic, merging matching statements and figures that cite the same quote. Different statements sharing a quotation remain separate. A topic can sit in two domains, so domain counts overlap and are never added up.

Domains and topics are edited on the Domains & topics page (sidebar). Each edit shows what it will re-run before you save:

- A domain's label or definition, or a topic's label or placement, changes the question of the domains involved: those domains get a new question version and are asked again of every document. All other stored answers are re-tagged.
- A topic's definition or routing hints only change tagging: stored answers are re-tagged with the cheaper model, without reading pages again.
- Topic IDs are never reused. Moving a topic to another home domain gives it a new ID and keeps the old one as a legacy ID. Every edit raises the taxonomy revision (`0.1.0-draft+r3`), and each answer records the revision it was tagged with.

The regional dashboard has **Overview, Compare, Claims, Targets, Reported figures, and Regional average**. The main metrics are **Score, Claims, Actions, and Coverage**. Score and counts also have a region-normalized view; Actions defaults to editable claim stages 1–4. A claim is a grouped document statement; an action claim is its commitment/plan/implementation subset. Country cards, domain cells and topic details use the same language.

The active **policy documentation score** uses existing source-matched statement labels: 0 no evidence after complete processing, 1 concern/context, 2 commitment, 3 plan, 4 reported implementation. Topic levels are averaged over the fixed inventory and scaled to 100. Partial results are labelled provisional minima and excluded from benchmarks. This measures documentary stages, not policy quality or verified delivery. The editable rubric is `config/scoring/documentation.json`; code is `src/lib/documentation-stage.ts` and `src/lib/documentation-score.ts`. The earlier four-check proposal and older backend rubric are not the headline score.

Country overviews use a strong UN-inspired blue score panel, compact clickable domain cards and expandable evidence. The Targets view exposes source figures without pretending every figure is a target. Regional comparisons exclude demo/partial assessments and show source scope. No trend arrows are displayed. See the [current dashboard and score guide](docs/DASHBOARD-GUIDE.md). OCR remains deferred; the Luna document/domain extraction and country/domain organization pipeline is unchanged.

Design: [docs/PLAN.md](docs/PLAN.md). Build steps and acceptance checks: [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md).

## Run it

Use Node 24 (or 22.19+) for system-certificate support (`.nvmrc` pins 22).

```bash
npm install
cp .env.example .env        # then set OPENAI_API_KEY, or OPENAI_FAKE=1 to try it without a key
npm run db:migrate
npm run db:seed             # the taxonomy (domains and topics)
npm run dev                 # the dashboard, http://localhost:3000
npm run worker              # in a second terminal: reads, indexes and analyses documents
```

### Static snapshot (GitHub Pages)

A read-only copy of the current reports is published at https://merogith.github.io/PolicyTracker2/. It is built from the local database: uploading, re-running and editing are hidden, and the worker is not needed.

```bash
node scripts/export-static.mjs      # builds into .next-static/, crawls the app, writes out-static/
```

In Git Bash, prefix it with `MSYS_NO_PATHCONV=1`. To keep the site small, the crawl saves each country's main report with the default action stages, up to two clicks from the main pages (`--depth`); other views open the closest saved one. Publish by pushing the contents of `out-static/` to the `gh-pages` branch.

With `OPENAI_FAKE=1` the whole pipeline runs against a local stand-in for OpenAI: answers are made up from the page text, so they exercise the app but say nothing about the documents. The sidebar shows "Demo mode" while it is on.

Runs shows a **recorded API estimate**, not payments or an invoice. Demo responses contribute zero cost and zero API tokens; jobs retain their execution mode across configuration changes. New worker attempts accumulate response usage, including invalid answers, retries and cancelled work that completes. The estimate excludes storage and scripts outside the job queue. Historical jobs without mode evidence remain marked as unrecorded rather than being assumed live or demo.

To repair historical demo costs, first preview `node --import tsx scripts/repair-demo-usage.ts --demo-backup PATH_TO_PRE_LIVE_DB --demo-log PATH_TO_DEMO_WORKER_LOG`. Add `--apply` to apply the repair. It requires both an unchanged completed job in the backup and a matching log explicitly identifying demo mode; it leaves ambiguous or subsequently rerun jobs alone. Before changing anything it saves a SQLite backup and a row-level audit under `output/demo-usage-repair/`. Run migrations and regenerate Prisma before restarting the web app and worker.

Select several PDFs under **Add documents**, then set each document's title, kind, edition date and language. Uploads are sent one at a time; successful files stay accepted if another fails, and retrying only sends the remaining files. The worker completes ingestion and all domain questions for one document before starting the next document in that country. Domain questions within that document and work for other countries can still run concurrently.

The overview waits for the country's document analyses to finish. When there is one usable document, its findings and citations supply the overview directly, with no synthesis LLM call or synthesis cost. Multiple documents still receive a combined overview. This also applies to reruns and when deletion leaves one document.

To make two synthetic test PDFs: `npx tsx scripts/make-sample-pdfs.ts data/samples`.

## Low-cost full-PDF retrieval test

The test configuration uses `gpt-6-luna` for analysis, synthesis and tagging, with `OPENAI_REASONING_EFFORT="low"`. Model pricing is tracked in `src/lib/analysis/pricing.ts`; [OpenAI's model page](https://developers.openai.com/api/docs/models/gpt-6-luna) documents file search and structured output support.

PDF extraction and indexing have no page-count cutoff. Every readable page, including annexes, is indexed once. Each question must search that document's vector store; only relevant passages are sent to the model. The domain setting **Passages per search** (1–50, default 20) is the number of retrieved passages per search, not a limit on searchable PDF pages. The model can make additional focused searches. Retrieval does not guarantee that every relevant passage will be found. There is no application file-size quota; uploads/parsing still depend on server memory and deployment limits. Original PDFs remain local, and ingestion uploads page text rather than an unused original. Scanned pages still need OCR before they can be searched.

Live analysis requires `OPENAI_FAKE=0` and a configured `OPENAI_API_KEY`. Missing credentials produce an error, never simulated answers. `MAX_USD_PER_RUN=0` (or unset) disables the optional application estimate gate; provider billing limits still apply. Saved demo results are explicitly labeled and cannot supply a live country synthesis. Re-running a demo document rebuilds its index with real API files before analysis.

Run `npm run test:live -- --document KAZ-NDC1 --domain water` for an isolated live integration test. It indexes every locally readable page in a temporary real vector store, makes one domain request with the configured low-cost model, records response ID, usage, estimated cost, search results and exact quote checks in `output/live-api-test.json`, and deletes its temporary API resources. It does not overwrite saved answers or claim exhaustive extraction. The comprehensive extraction/organization architecture remains specified in `docs/proposals/pipeline-update-handoff.md` and is a separate pipeline update.

On this Windows setup, use Node 24 on `PATH` for the app and its compiler subprocesses. The OpenAI gateway now includes the operating system's trusted certificates while retaining TLS verification. Check API connectivity without a model call using `node --import tsx scripts/check-connection.ts`; restart an existing worker after updating the gateway. For a direct live test: `node --use-system-ca --import tsx scripts/test-live.ts --document KAZ-NDC1 --domain water`. See [the demo/live audit](docs/proposals/demo-live-audit.md) for remaining pipeline work.

Run one question against an already indexed document without replacing saved answers:

```bash
npm run test:retrieval -- --document KAZ-NDC1 --domain water
```

The report includes indexed-page coverage, pages returned, search queries, token usage, estimated API cost and verified quotes. With `OPENAI_FAKE=1`, it is a local plumbing test, not a model-quality evaluation. For a live test, set `OPENAI_API_KEY` and `OPENAI_FAKE=0`, restart the app and worker, and upload the PDF into a real vector store: demo store IDs cannot be used with the live API. Existing saved answers remain unchanged until re-run.

## Checks

```bash
npm run check               # typecheck, lint, unit tests, and every stored result validated against its schema
npx tsx scripts/check-results.ts --country KAZ --show water
npx tsx scripts/scenario.ts --base http://localhost:3000 --iso3 KAZ --name Kazakhstan \
  --doc "path/ndc3.pdf|NDC|2025-11-26|NDC 3.0" --doc "path/nap.pdf|NAP|2024-01-01|National Adaptation Plan"
```

`scenario.ts` runs the acceptance scenario of IMPLEMENTATION.md Part 9 against a running app and worker on a fresh database, and prints PASS or FAIL for each step. Since domains replaced analysis keys, its steps 5 and 6 add a domain with a topic (only that domain is asked; other answers are re-tagged) and edit a topic definition (re-tags only).

## Where things are

| Path | What |
|---|---|
| `src/lib/openai.ts` | The only place that calls OpenAI; the verified API shapes are noted at the top. `openai-fake.ts` is the stand-in. |
| `src/lib/ingest.ts` | PDF upload, page extraction, one text file per page in the country's vector store |
| `src/lib/analysis/` | Schemas, prompts (`prompt.ts`), the per-document run, citation checks, the country synthesis, the re-tag pass, prices |
| `src/lib/taxonomy.ts`, `src/lib/taxonomy-edit.ts`, `src/lib/topics.ts` | Reads the taxonomy from the database; edits it and plans what re-runs; builds the domain and topic views |
| `config/scoring/rubric.json`, `src/lib/scoring.ts` | The scoring rubric and how it is applied |
| `src/lib/documentation-score.ts`, `src/components/charts/documentation-dashboard.tsx` | Current dashboard coverage/count adapter, four-band legend and overview visuals; legacy detail scores remain unavailable |
| `src/lib/regional-dashboard.ts`, `src/components/regional-dashboard.tsx` | Regional observed totals, mixed-stage handling, source-profile eligibility, mean/SD/z-score calculations and regional views |
| `src/components/regional-figures.tsx` | Searchable source figures with filters, expandable statements and CSV export; no inferred target/finance classifications |
| `src/components/claim-details.tsx` | Compact claims with full evidence and original-page links on click |
| `src/worker/` | The job loop and its handlers |
| `src/app/`, `src/components/` | Pages, API routes, cards and charts |
| `prisma/` | Schema, migrations, seed |

## Claim titles and supporting findings

A closed claim displays a separate short title and one-sentence summary. Expanding it shows the complete statement, every linked supporting finding, each finding's own stage and labeled figures, and the original quotations and page links. Different supporting stages display as **Mixed stages**. Title wording never determines claim identity, and no supporting-finding quota is imposed.

New analysis and synthesis requests include title, summary and figure-label fields. Existing JSON without these fields remains readable, with its original statement as the fallback. Prompt version `2026-10-20.2` changes presentation only; `2026-10-20.1` remains compatible for evidence scoring. Restart a long-running worker to load the new schema and prompts.

To update saved presentation fields without re-reading PDFs or re-running extraction:

```bash
npm run refresh:titles -- --dry-run
npm run refresh:titles
# Optionally restrict the update to one saved analysis result:
npm run refresh:titles -- --result RESULT_ID
```

This command sends saved findings, figures and their quotations to the configured synthesis model. It uses bounded batches and automatic validation, caches successful responses in `output/claim-presentation/`, and can resume after interruption. It preserves complete text, stage, topic tags, references, figure values and citations. It checks for concurrent result changes before writing. The report records completion and conflicts; presentation token/cost metadata stays separate from the original analysis costs. No OCR or human-validation stage is added. This presentation change does not alter retrieval coverage, synthesis batching, quote-based grouping, or the publication rules for unresolved references.

## Detailed classification

`config/labels.json` is the active full catalogue. All eight facets are enabled: purpose, geographic scope, hazards, themes, affected groups, policy instruments, risk component and risk function. Statement type, factual role, actors and explicit source priority are separate fields. This activates the reviewed vocabulary; it does not activate the separate comprehensive-pipeline proposal.

Document evidence is extracted, checked against the original page text and saved before classification. Invalid quotation spelling can be repaired against the cited pages without changing the finding. Classification then uses verified source quotations in small batches; valid siblings survive a failed batch, and unresolved findings receive individual retries. Allowed values, actors and quotation containment remain strict. A classification failure leaves the evidence available with an explicit incomplete status instead of discarding an entire domain answer. These checks do not prove semantic correctness. Country claims inherit the classifications of their referenced source findings; mixed types remain separate and stale references with changed evidence are rejected. Topic retagging preserves the added fields.

Both regional and country Claims offer text search, categorical filters, grouping and sorting. Multilabel groups can overlap; CSV exports count each claim once and retain source classifications and evidence. Targets uses `fact_type: target`, including quantitative, deliverable and qualitative targets; it never infers targets from dates or keywords. Missing classification is shown explicitly. Source labels and catalogue metadata are included in country JSON exports.

Prompt `2026-10-20.6` separates extraction from classification, uses source-language retrieval hints and preserves distinct programmes, figures and conditions. Search-coverage statements belong in notes rather than findings. Actors retain their exact original-language spelling and grammatical case; unambiguous decimal commas can be normalized without changing the source value. Failed domain answers or incomplete classification keep document status partial. Raw attempts and validation errors are retained locally in `output/analysis-attempts/` for diagnosis. Restart a long-running worker to load these changes. Existing findings remain readable. To classify their already-matched source quotations without changing original content:

```bash
npm run refresh:labels -- --dry-run
npm run refresh:labels
# Optional scope:
npm run refresh:labels -- --result RESULT_ID
```

The dry run is read-only and makes no model calls. The actual run sends finding text and verified quotations to the configured synthesis service. The model returns local quotation references; code resolves these to the original text. It saves a local snapshot, caches validated batches and checks for concurrent changes before updating JSON. Validation failures receive the previous answer and all field errors for automatic correction; remaining failed batches subdivide down to individual findings. Resume with the same command after failures or interruption. Findings with no verified quotations remain unclassified. Costs and errors are recorded separately in `output/claim-labels/`. No response stages, topic tags, figure values or scores are changed by recovery.

Run `tsx scripts/check-labels.ts --baseline output/claim-labels/before-TIMESTAMP.json --save-report` to verify every recovered classification against its matched source quotations, compare all original output fields with a recovery snapshot, and report country-level label and target coverage.
