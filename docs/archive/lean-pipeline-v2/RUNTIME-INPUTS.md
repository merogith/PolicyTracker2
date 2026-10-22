# Real files used by the current LLM pipeline

Captured **19 October 2026** from this checkout. This is a source audit, not a deployed-request capture. The application still uses prompt version **2026-10-18.4** and numeric scoring rubric **2.0.2**. The four-band recommendation elsewhere in this package is a planned update.

The [reference manifest](runtime-reference/manifest.json) records every original path, role and SHA-256 hash. Files under `runtime-reference/source/` are byte-for-byte copies for review. **The application does not load them.** Editing a copy changes neither the application nor its prompts.

## Read the actual prompts

These plain-text exports run the actual current prompt builders offline. `seed` means the repository's initial taxonomy; `synthetic` means invented example input. Neither represents a country run or the database's current settings.

| Call | Instruction text | Example user message |
|---|---|---|
| Document/domain extraction | [Actual builder with seed taxonomy](runtime-reference/rendered/extraction-system.seed.txt) | [Synthetic Water question](runtime-reference/rendered/extraction-user.synthetic.txt) |
| Country/domain synthesis | [Exact static current instructions](runtime-reference/rendered/synthesis-system.txt) | [Synthetic extracted findings](runtime-reference/rendered/synthesis-user.synthetic.txt) |
| Maintenance retagging | [Actual builder with seed taxonomy](runtime-reference/rendered/retag-system.seed.txt) | [Synthetic findings and quotes](runtime-reference/rendered/retag-user.synthetic.txt) |
| Failed-output retry | [Exact retry builder with a synthetic error](runtime-reference/rendered/retry-suffix.synthetic.txt) | Appended to the original user message |

The [rendered seed taxonomy](runtime-reference/rendered/taxonomy-prompt.seed.txt) shows the topic definitions and routing hints in the form the model reads. Retagging is maintenance after taxonomy changes, not a third routine extraction stage.

## Which files assemble each request?

Paths below refer to current application files; links open the frozen review copies.

| Original file | Role |
|---|---|
| [src/lib/analysis/prompt.ts](runtime-reference/source/src/lib/analysis/prompt.ts) | All active prompt wording and retry wording. |
| [src/lib/analysis/schemas.ts](runtime-reference/source/src/lib/analysis/schemas.ts) | Output fields, allowed finding kinds and schema construction. |
| [src/lib/analysis/run.ts](runtime-reference/source/src/lib/analysis/run.ts) | Extraction inputs, document filter, schema and citation persistence. |
| [src/lib/analysis/synthesise.ts](runtime-reference/source/src/lib/analysis/synthesise.ts) | Country input assembly and source-reference resolution. |
| [src/lib/analysis/retag.ts](runtime-reference/source/src/lib/analysis/retag.ts) | Input/output assembly for relabeling stored findings. |
| [src/lib/analysis/call.ts](runtime-reference/source/src/lib/analysis/call.ts) | JSON/schema validation; one retry for invalid, refused or truncated output. |
| [src/lib/openai.ts](runtime-reference/source/src/lib/openai.ts) | Responses API envelope, models, tool settings and schema serialization. |
| [src/lib/taxonomy.ts](runtime-reference/source/src/lib/taxonomy.ts) | Database taxonomy loader; topic text, domain questions and search hints. |
| [fresh-start/config/taxonomy.json](runtime-reference/source/fresh-start/config/taxonomy.json) | Initial seed: 16 domains and 64 topics, version `0.1.0-draft`. |
| [src/lib/ingest.ts](runtime-reference/source/src/lib/ingest.ts) | Prepares and indexes page files used by file search. |
| [src/lib/pdf.ts](runtime-reference/source/src/lib/pdf.ts) | Extracts PDF page text before indexing. |
| [src/lib/domain.ts](runtime-reference/source/src/lib/domain.ts) | Document-kind choices and readable-page threshold. |
| [src/lib/analysis/verify.ts](runtime-reference/source/src/lib/analysis/verify.ts) | Checks quote occurrence after output; not an LLM input. |
| [src/lib/scoring.ts](runtime-reference/source/src/lib/scoring.ts) | Calculates existing numeric scores after output; not an LLM input. |
| [config/scoring/rubric.json](runtime-reference/source/config/scoring/rubric.json) | Existing −1/0/+1 rubric; not an LLM input. |

Other `fresh-start` prompt/config files and the recommended `prompts/` files in this proposal are **not imported by the current application**. The important exception is the active taxonomy seed above.

## Extraction: exact assembly

1. `loadTaxonomy()` reads current non-retired domains/topics from the database and the taxonomy version from `TaxonomyState`. Domains carry editable search hints, result limits, version and enabled status. The seed initializes an empty taxonomy; changing its topic definitions does not update an already seeded database. The exported `rules` property still comes from the seed, but the prompt's topic-selection rules are written in `prompt.ts`.
2. `documentInstructions(tax)` adds evidence rules and the **whole taxonomy** to the system instructions. It does not restrict labels to the requested domain.
3. `documentUserText()` adds document ID, title, kind, edition date, page count, domain question and search hints.
4. `schemaFor("document", tax.topicIds)` supplies `findings`, `not_found`, `note` and top-level `citations`. Each finding has `text`, `kind`, `figures`, `topic_ids`, `unmapped_concepts` and page/quote citations. The six current kinds are concern, commitment, planned_action, underway, delivered and other. Topic IDs are a schema enum.
5. `run.ts` always supplies file search with the country's vector store and **`document_id == requested document ID`**. `max_num_results` comes from the domain; its database default is 20. This is a search-result limit, not a guarantee that 20 pages were read.

Indexed files are named `<documentId>-p<page>.txt`. Their header names document kind, edition and page. Attributes include country, document ID, page, kind and edition. PDF text is extracted locally; fewer than 20 non-whitespace characters marks a page unreadable. OCR is absent. The original PDF is uploaded but is **not attached by the active extraction call**.

## Pooling and synthesis today

The current synthesis groups completed answers to the **same domain question**, in edition order. It does not yet repool every extracted record by assigned topic across all questions.

The input includes document metadata, notes, `not_found`, missing-answer document IDs and findings. Each finding receives an array-path reference such as `XXX-NDC1#findings.0`. **Quotes, topic IDs and unmapped concepts are removed before the synthesis call.** The output contains finding text/kind/figures/reference citations plus document summaries and edition changes. It has no topic-ID fields. Code restores citations and links to source findings afterward.

There is no file-search tool on synthesis or retag calls. Current synthesis instructions select the furthest stage among cited findings. Persistent claim IDs, linked context, explicit comparable variants and the proposed four bands are not implemented by these schemas.

## Gateway settings and limits of this snapshot

The gateway submits `instructions`, a user `input_text`, and `zodTextFormat(schema, schemaName)` to `responses.create`. Reasoning defaults to `medium`, maximum output to 32,000 tokens and `store` to false. The extraction model comes from `OPENAI_MODEL`; synthesis/retag use `OPENAI_MODEL_CHEAP`, falling back to the first. `OPENAI_FAKE=1` switches to the test gateway. File search is available to extraction but `tool_choice` does not force its use; repeated searches are requested in prompt text, not enforced by a call-count limit.

No environment file, application database or original country documents were available in this checkout. Consequently live model IDs, revised taxonomy values and actual requests cannot be certified here. Zod/OpenAI dependencies are not installed locally, so the exact schema builder source is supplied rather than a purported captured wire schema. Source comments about prices or model capabilities are historical code comments, not newly verified provider information.

To refresh this reference from the checkout, run `node docs/proposals/lean-pipeline/runtime-reference/export-reference.cjs` with Node 24 or later. It copies the listed source files and renders prompts offline; it does not call an LLM.
