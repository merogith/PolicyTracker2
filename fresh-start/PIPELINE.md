# Pipeline and architecture

Status: proposal, 2026-10-18, revision 2. The diagrams are Mermaid; GitHub renders them.

## 1. What runs where

The whole thing is one small Python command-line tool (working name `pt`), one subcommand per step, plus JSON files in git. The model is Claude, called through the official Anthropic Python SDK. There is no database and no server in the first version: a country is a folder, every step reads and writes files in it, and the views are static pages built from those files. A web app can come later and read the same files.

| Step | Command | Who | Reads | Writes |
|---|---|---|---|---|
| 1 Register | edit by hand | people | the PDFs | `countries/<ISO3>/country.json` |
| 2 Prepare | `pt prepare KAZ` | code | each PDF | `work/<doc>/pages.jsonl` (text per page), chunk list, unreadable pages |
| 3 Extract | `pt extract KAZ [doc]` | model, per chunk | chunk text + taxonomy + vocabulary + extract prompt | chunk outputs, merged by code into `<doc>.extraction.json` |
| 4 Check | `pt check KAZ` | code | everything in the folder | validation report; this is `scripts/check.py` |
| 5 Review | edit `review_status` (later a small form) | people | an extraction file | the same file |
| 6 Pack | `pt pack KAZ` | code | all extraction files | `work/packs/<topic>.json` |
| 7 Topics | `pt topics KAZ` | model, per pack | one pack + topic definition + claims rules + topic prompt | `topics/<topic>.json` (claims + brief) |
| 8 Derive | `pt derive KAZ` | code | topics + manifest + extractions | `derived/claims.json`: merged claims, stable IDs, stages, counts |
| 9 Views | `pt views KAZ` | code | derived + briefs + coverage | `site/KAZ/index.html`, one page per document, one per domain |
| 10 Score | `pt score KAZ` (reserved) | model or people | derived claims + rubric | `scores.json` |

Steps 2, 4, 6, 8 and 9 are plain Python with no model call. Steps 3 and 7 are the only model calls.

**Model calls.** Python with the `anthropic` SDK, model `claude-opus-5-5`. Each call gets the output JSON schema as a structured-output format, so the reply is valid JSON before the checker sees it. The stable part of the prompt (system text, taxonomy, vocabulary, claim rules) goes first and is cached; the chunk or pack goes last. Extraction of a whole country is not time-critical, so the chunks go through the Message Batches endpoint, which runs them asynchronously at half price. Every output records the taxonomy, vocabulary, claim-rule, prompt and model versions it was made with.

**Size per country.** Four documents of 50 pages in chunks of 8 give about 25 extraction calls. Thirty to forty topics with records give as many pack calls. Re-running one step never requires re-running the ones before it.

## 2. Activity: who does what

```mermaid
flowchart TD
  subgraph People
    A["1. Register country<br/>country.json: PDFs, dates"]
    E["5. Review records<br/>accept or reject (optional)"]
    J["Read, compare, score later"]
  end
  subgraph Code
    B["2. Prepare pages<br/>text per page, chunks of ~8"]
    D["4. Check and merge chunks<br/>schema + vocabulary"]
    F["6. Pack by topic<br/>all documents of the country"]
    H["8. Derive<br/>merge shared records, stable IDs, stages"]
    I["9. Views<br/>country, document, domain"]
  end
  subgraph Model
    C["3. Extract records<br/>per chunk: quote, page, type, topics"]
    G["7. Claims + brief<br/>per pack: one claim per distinct thing"]
  end
  A --> B --> C --> D --> E --> F --> G --> H --> I --> J
  E -. "rejected: fix prompt, re-run" .-> C
```

## 3. Components

```mermaid
flowchart LR
  subgraph Inputs
    PDF[(PDFs)]
    CFG[(config/<br/>taxonomy, vocabulary, claims)]
    PR[(prompts/<br/>extract, topic)]
    SCH[(schemas/)]
  end
  subgraph CLI["pt (Python CLI)"]
    prep[prepare]
    ext[extract]
    chk[check]
    pack[pack]
    top[topics]
    der[derive]
    vw[views]
  end
  API[Anthropic API<br/>Claude]
  subgraph Country["countries/ISO3/ (JSON in git)"]
    MAN[country.json]
    EXT[*.extraction.json]
    TOP[topics/*.json]
    DER[derived/claims.json]
    SC[scores.json<br/>reserved]
  end
  SITE[site/ISO3/<br/>static HTML]
  PDF --> prep --> ext
  CFG --> ext
  PR --> ext
  ext <--> API
  ext --> EXT
  MAN --> chk
  EXT --> chk
  TOP --> chk
  SCH --> chk
  CFG --> chk
  EXT --> pack --> top
  CFG --> top
  PR --> top
  top <--> API
  top --> TOP
  TOP --> der
  MAN --> der
  EXT --> der
  der --> DER
  DER --> vw
  TOP --> vw
  EXT --> vw
  vw --> SITE
  DER -. later .-> SC
```

## 4. Data model

```mermaid
classDiagram
  class Country {
    country ISO3
    name
  }
  class Document {
    document_id
    kind
    edition_date
    file
    supersedes
  }
  class Page {
    page
    disposition
  }
  class Record {
    record_id
    statement_type
    statement_en
    topic_ids
    review_status
  }
  class Evidence {
    evidence_id
    page
    quote_original
  }
  class Fact {
    fact_id
    fact_type
    value_as_stated
    period
    conditionality
  }
  class Topic {
    id
    label
    definition
  }
  class Domain {
    id
    prefix
    label
  }
  class Pack {
    country
    topic_id
    record_ids
  }
  class PackClaim {
    claim_id provisional
    claim_text_en
    member_record_ids
    status
  }
  class Brief {
    core_idea_en
    concerns
    responses
    numbers
    changes_between_editions
    gaps
  }
  class Claim {
    stable_id C-anchor
    topics
    stage
    stage_latest
    documents
  }
  class Score {
    claim_id
    score
    rubric_version
    rationale
  }
  Country "1" --> "*" Document
  Document "1" --> "*" Page : coverage
  Document "1" --> "*" Record
  Record "1" --> "1..*" Evidence
  Record "1" --> "*" Fact
  Record "*" --> "*" Topic : topic_ids
  Topic "*" --> "1..*" Domain : placements
  Country "1" --> "*" Pack : code, one per topic
  Pack "1" --> "1..*" PackClaim : model
  Pack "1" --> "1" Brief : model
  Brief ..> PackClaim : cites
  PackClaim "*" --> "1" Claim : code merges shared records
  Claim "1" --> "*" Score : reserved
```

## 5. What the checker already does

`scripts/check.py` is step 4, step 6 and step 8 in miniature: it validates the manifest, the extractions and the topic outputs, rebuilds the packs and refuses a topic file whose pack differs, merges claims that share records, assigns stable IDs, derives both stages, and prints the country view and the document view. The `pt` tool will grow out of it.
