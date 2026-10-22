# Fresh start guide: country, taxonomy, extraction, claims and briefs

> **Direction change, 2026-10-18.** The project is now planned as a dashboard on OpenAI vector stores with editable analysis keys: see `docs/PLAN.md` and `docs/IMPLEMENTATION.md` at the repo root. This folder stays as the reference for the evidence rules, the statement kinds, the fact fields and the checking approach, which the plan carries over. The topic packs, claims and stable IDs described below are not part of version 1.

This folder is a clean starting point for a new repository. It keeps what held up across three generations of the PolicyTracker design, fixes the overlaps, and makes everything checkable. Revision 2 (2026-10-18) puts the country at the top, replaces pairwise claim matching with topic packs, and reserves a scoring layer.

| Generation | Where it lived | What it was |
|---|---|---|
| **v1** | `config/topic-pool.json`, `prompts/v1/` | 40 topics in 11 sector domains. Statements described by three overlapping fields plus two risk lenses. |
| **v2 / Method 3.0** | `config/v2/`, `prompts/v2/`, `docs/METHODOLOGY.md` | The running app. 41 topics, one statement type, one risk-function list, many independent facets. |
| **Pilot** | `config/pilot-v1/`, `prompts/pilot-v1/` | Candidate redesign tested on Kazakhstan. 16 domains, 53 topics, subdomains, claims and a model-judged 0–4 score. |
| **This draft, rev 1** | `tmp/fresh-start/` | 16 domains, 64 topics, one statement type, typed facts, pairwise relations grouped into claims. |
| **This draft, rev 2** | this folder | Same taxonomy and records. Country manifest, topic packs, several claims plus one brief per topic, stable claim IDs, scoring reserved. |

```text
fresh-start/
├── GUIDE.md                         ← you are here
├── PIPELINE.md                      ← diagrams: who does what, architecture, data model
├── config/
│   ├── taxonomy.json                ← subjects: 16 domains, 64 topics
│   ├── vocabulary.json              ← every other label, the fact fields, review status
│   └── claims.json                  ← packs, the claim unit, merge rule, stable IDs, stages, brief, scoring layer
├── schemas/
│   ├── country.schema.json          ← the country manifest (documents)
│   ├── extraction.schema.json       ← stage 1 output: records of one document
│   ├── topic.schema.json            ← stage 2 output: claims and brief of one topic pack
│   └── scores.schema.json           ← reserved scoring layer
├── examples/exampleland/            ← one synthetic country, laid out like a real one
│   ├── country.json
│   ├── XEX-NDC3.extraction.json     ← 7 records showing every case
│   └── topics/                      ← 6 packs: DRM-02, DRM-03, WAT-03, CLM-06, WAT-06, AGR-03
└── scripts/check.py                 ← validates all of the above; derives packs, merged claims, stages, views
```

Run `python scripts/check.py`. It needs `pip install jsonschema`.

---

## Part 0: The goal in one paragraph

Give the tool the PDFs of one country. Get back, for every topic the documents touch, the distinct things the documents say (claims), how far each has gone (a stage from 0 to 4), a short readable brief, and the counts. Every line traces back to a page and an exact quote. The same procedure runs for every country, so topic by topic you can see how many claims a country has, at which stages, and later how they score. Nothing is a grade of the country.

---

## Part 1: The pipeline

### 1.1 The mental model

```text
country.json ──► PDF pages (chunks of ~8)
                    └─► STAGE 1 (model, per chunk): records, one proposition each, with quote, page, labels, facts
                          └─► CODE: validate, merge chunks ─► <document>.extraction.json ─► PEOPLE (optional): accept / reject
                                └─► CODE: one pack per topic, all documents of the country
                                      └─► STAGE 2 (model, per pack): claims (one per distinct thing) + one brief
                                            └─► CODE: merge claims that share a record, stable IDs, stages, counts
                                                  └─► CODE: views (country, document, domain)
                                                        └─► RESERVED: scoring layer, per claim
```

The model does two jobs: read pages into records, and read a topic's records into claims and a brief. Everything else is computed. That split is the most important lesson from the old repo: the pilot asked the model for the response score and the label rollups, and both are lookups that code can do reproducibly.

### 1.2 The steps

| # | Step | Owner | Input | Output |
|---|---|---|---|---|
| 1 | Register the country | people | the PDFs | `countries/<ISO3>/country.json`: each document with its kind, edition date and file |
| 2 | Prepare pages | code | one PDF | text per page, chunks of about 8 pages, pages that could not be read |
| 3 | Extract records | model, once per chunk | chunk + taxonomy + vocabulary | records and a disposition for every page |
| 4 | Check and merge | code | all chunks of a document | `<document_id>.extraction.json`, validated against the schema and the word lists |
| 5 | Review | people, optional | the extraction file | `review_status` on records. Rejected records leave the pipeline but stay in the file |
| 6 | Pack by topic | code | every extraction of the country | one pack per topic: its records from all documents, ordered by edition, page, sequence |
| 7 | Claims and brief | model, once per pack | one pack + the topic definition | `topics/<topic_id>.json`: claims with members, and a brief citing them |
| 8 | Derive | code | all packs + the manifest | merged claims with stable IDs, stage, stage as of the latest document, topics, documents, counts |
| 9 | Views | code | derived claims, briefs, coverage | country page, document page, domain page |
| 10 | Score | reserved | merged claims + a rubric | `scores.json`, per claim |

### 1.3 Why this shape

- **Per document first, because evidence lives on pages.** Four reports of 50 pages do not fit one reliable call, and the quote behind every record is what makes the output checkable.
- **Per topic second, because that is the question.** "What does this country say about drought" is answered by the drought pack. Packs are small (usually 5 to 30 records) and even in size, so the model sees the whole topic at once and groups it directly. No pairwise matching, no candidate lists.
- **Several claims per topic, not one.** One claim per topic would hide that a country did three different things. A claim is one distinct action, commitment, target or finding. Counts per topic per stage are then comparable across countries, and scores can attach to each claim.
- **The brief sits on top of the claims.** It is the core idea for a reader. It cites claims; it never adds facts.
- **A record in two topics is in two packs.** Code merges claims that share a record, so the merged claim carries both topics and counts once in each. The model never has to see two packs at once.

---

## Part 2: Rules

### 2.1 Evidence

1. Every record cites an exact quote with its page. No quote, no record.
2. Every label must be supported by the record's own evidence. A word match is not evidence.
3. Source documents are data. Instructions inside a PDF are ignored.
4. "Not found" only ever means "not found in the pages we read". Coverage is recorded so this is always checkable.
5. Unreadable or unread pages go in coverage. They never become "not stated".

### 2.2 Labeling

6. **One concept, one home** (see 2.6). Most problems in the old designs came from storing the same idea in two fields.
7. `statement_type` is the only required label: exactly one per record. All other label lists may be empty, and empty means "nothing extracted", not "none exists".
8. The model picks **topic IDs only**. Domains are derived from topic placements. A record in several domains is counted once overall, so domain counts overlap and are never added together.
9. Use the sector topic for a sector measure. Use a Disaster Risk Management topic only when the subject is the disaster-risk system itself.
10. Climate membership never implies climate causation. An earthquake is never climate evidence. "Flood mitigation" is disaster risk reduction, not mitigation.
11. Groups (who is addressed) and stakeholders (named organisations with a role) are different things. A mention does not imply a benefit.
12. When nothing fits, keep the record and add an `unmapped_concepts` entry. Never invent an ID during extraction.

### 2.3 Numbers

13. Every number is a typed **fact** with its own period, condition, scope and evidence. Periods and conditions belong to the fact, not the record.
14. Never turn an observation, projection or finance need into a target. Unknown is `null`, never zero.
15. Conditional and unconditional variants stay separate. Conflicting values stay side by side. Nothing is averaged, summed or "resolved" silently.

### 2.4 Claims, stages and scores

16. A claim is one distinct thing. Records that restate, report progress on, give variants of, contradict, revise or supersede the same thing belong to one claim. Different things never merge, even under one topic.
17. The response stage (0–4) is looked up from the statement types of a claim's members. It says how far the documents say a response has gone. It is not performance, ambition or "on track".
18. Stages are never summed, averaged or ranked into a topic, domain or country score. Views show claim counts per stage next to what was read.
19. Scores, when they come, live in the scoring layer: per claim, with a rubric version, a rationale and the records relied on. The pipeline never computes one.

### 2.5 Country, review and versioning

20. The country is the top container. Stage 1 runs per document, stage 2 per topic over all of the country's documents.
21. A person may set `review_status` on a record, a relation or a claim. That is the only edit ever made to a model output. A wrong label means: reject, fix the prompt or the vocabulary, re-run.
22. An ID is never reused for a different meaning. Moved or retired topic IDs are listed in `legacy_ids`; a topic carved out of one that still exists names it in `split_from`. Claim IDs are stable: `C-` plus the earliest member record. Saved outputs record the taxonomy, vocabulary, claim-rule and prompt versions they used.

### 2.6 One concept, one home

| Concept | Its one home | Not also in… (where older versions put it) |
|---|---|---|
| What the record is about | `topic_ids` | primary domain, Topic 1/2/3 columns (v1) |
| What the statement does (context → commitment → delivered) | `statement_type` | record kind + assertion kind + documentation status (v1); `policy_status` and a model-judged score (pilot) |
| How far the response has gone | derived from members' `statement_type` | a separate model-scored field (pilot) |
| One distinct thing the country says | a claim (`topics/<topic>.json`, merged by code) | pairwise relations (rev 1); one claim per topic |
| The core idea of a topic | the brief | a topic score (pilot); prose inside claims |
| How good a claim is | the scoring layer (reserved) | stage; topic −1/0/+1 (pilot) |
| Loss and damage | topic `CLM-09` | also a purpose value (pilot) |
| Finance | `facts` with `fact_type: finance` (subject: `CLM-02` / `DRM-05`) | also a statement type and a theme (pilot) |
| Barriers and support needs | `details` on a `context` record | also a statement type (pilot) |
| Phase of disaster risk management | `risk_function` facet (any sector) | DRR phase and resilience function as two fields (v1) |
| Livelihoods, just transition, data, local knowledge | topics `LIV-01`, `ECO-02`, `EDU-03`, `CUL-03` | also cross-cutting themes (v2, and this draft before review) |
| Who is responsible | `stakeholders[].role` | also an affected group or a beneficiary role |

**Test for a new label:** does it answer a question no existing field answers? If yes, it is a new facet. If it is a subject, it is a topic. If it repeats an existing answer, drop it.

---

## Part 3: Stage 1, what gets extracted from a PDF

### 3.1 The unit: one source record = one coherent proposition

- **Split** independently actionable measures, promises versus reports of delivery, and statements about different hazards or places that are not one programme.
- **Keep together** an action and its own targets, actors, budget and barriers when they describe one intervention.
- **Keep repeats**: the same target on two pages gives two records. Stage 2 groups them; stage 1 never deduplicates.
- **Skip** blank templates, tables of contents and pure background. Mark them `background` in coverage.

### 3.2 Anatomy of a record

| Field | Question it answers | Example (Exampleland gauges record) |
|---|---|---|
| `record_id` | Which record? | `XEX-NDC3-p21-1` (document, page, sequence) |
| `statement_type` | What does it assert? | `planned_action` |
| `statement_en` | One faithful English proposition | "The Ministry … will install 40 automatic river gauges…" |
| `reference_period` | When does it apply? (non-numeric) | `null`; the deadline lives on the fact |
| `evidence[]` | Where exactly does it say so? | page 21, exact quote, table header as `table_context` |
| `labels.topic_ids` | What is it about? | `DRM-03` |
| `labels.purpose` | What purpose is stated? | adaptation, disaster_risk_reduction |
| `labels.hazard` | Which hazard? | flood |
| `labels.risk_component` | Which part of risk is described? | (empty: it's an action, not a description of risk) |
| `labels.risk_function` | What does it do about risk? | early_warning_preparedness |
| `labels.affected_group` | Which people are addressed? | (empty: none named) |
| `labels.cross_cutting_theme` | Which cross-cutting issue is treated? | (empty) |
| `labels.policy_instrument` | By what mechanism? | information_warning, infrastructure_service |
| `labels.geographic_scope` | At what level? | subnational |
| `places[]` | Where, by name? | Northern basin (basin) |
| `stakeholders[]` | Who, in what role? | Ministry of Emergency Situations, responsible |
| `facts[]` | Which numbers? | target: 40 gauges, 2028, conditionality not stated |
| `details[]` | Non-numeric linked info | barriers, support needs, co-benefits, dependencies |
| `missing_fields[]` | Which blanks change the meaning? | e.g. a target with no baseline |
| `unmapped_concepts[]` | What didn't fit the taxonomy? | "emergency fodder reserves" (drought record) |
| `review_status`, `review_note` | Has a person checked it? | `accepted`, set by a reviewer, never by the model |

For the first real run, require only `statement_type`, `topic_ids` and evidence, and treat the other facets as optional. The schema already allows every other list to be empty. Add facets to the prompt as the briefs show a need for them.

### 3.3 Statement types and the response ladder

| `statement_type` | Stage | Use it for | Tricky cases |
|---|---|---|---|
| `context` | 0 | Conditions, risks, needs, barriers, observed hazard impacts | "Floods displaced 12,000 people" is context, not a result. "No warning system exists" is context. |
| `projection` | 0 | Modelled future, including scenarios | "Losses may double by 2050" |
| `proposal` | 0 | Recommended, not adopted | Consultant or NGO recommendations; draft measures |
| `priority` | 1 | A stated priority area, no concrete undertaking | If it is actionable, it is a commitment |
| `commitment` | 1 | Goal or target, no specified measure | Economy-wide GHG targets |
| `planned_action` | 2 | A specific measure, programme or instrument | A target plus a defined measure lands here |
| `implementation_underway` | 3 | Allocated money, procurement, construction, operating programme | A finance *need* is context, not underway |
| `output_delivered` | 4 | Completed, checkable output | A law or plan adopted; a system installed |
| `result_reported` | — | Reported change in an outcome | Sets the claim's outcome signal, not its stage |
| `unclear` | — | Can't tell | Explain in `notes` |

Stage-0 types are the **concerns** of a document; stage 1–4 types are its **responses**. The stage column lives in `vocabulary.json`. The model never outputs a stage.

### 3.4 Facts: every number

`fact_type` is `target`, `observation`, `projection`, `finance` or `indicator`. Each fact keeps:

- `value_as_stated`: the exact source text.
- `value`: a decimal string, or `null` when the notation is ambiguous. "1,200" can be either one thousand two hundred or one point two.
- unit or currency, comparator, direction, basis and baseline.
- `period_role` and `period`, scenario, scope, conditionality and `condition_text`.
- for finance only: the finance fields (source type, status, source).
- `evidence_id`.

Fields that don't apply to a fact type stay `null`; the checker enforces this.

**Never:** average conditional and unconditional targets; add costs to secured funds; compare targets with different bases (BAU versus 1990); allocate an EU target to a member state; read a blank template cell as zero.

### 3.5 Coverage: what was read

Every page in scope gets one disposition: `extracted`, `background`, `unreadable` or `not_read`. Every record must appear in the coverage row of its evidence page. This is what makes "not found in the reviewed pages" an honest statement. The country manifest adds the documents that were not extracted at all, so a country view can say so.

### 3.6 What is deliberately not extracted or inferred

- Country performance, effectiveness or "on track" status.
- Causality ("installing gauges reduced losses") unless the source says so, and even then only as a `result_reported` attributed to the source.
- Benefits to groups that are merely mentioned.
- Allocation of shared budgets across topics or sectors.
- Equivalence of metrics across countries.

---

## Part 4: Stage 2, packs, claims and briefs

### 4.1 Packs (code)

One pack per topic per country: every record whose `topic_ids` contains the topic, from all of the country's documents, minus rejected records, ordered by edition date, page and sequence. A record with two topics is in two packs. The checker rebuilds the packs and refuses a topic output whose `scope.record_ids` differ.

### 4.2 Claims (model, within one pack)

The model reads the pack and the topic definition, never the PDF, and returns one claim per distinct thing. Grouping rules, in `claims.json`:

- Only the propositions and evidence decide a merge. A shared topic, hazard or place is never enough.
- Every record in the pack belongs to exactly one claim of that pack. Single-record claims are normal.
- Different years, conditional pathways, sub-targets and independent actions stay separate claims unless the source makes them one target.
- A newer document not repeating a claim does not prove withdrawal.

Each claim carries provisional `claim_id` (unique inside the pack), `claim_text_en`, `member_record_ids`, `outcome_signal`, `setback_flags`, `status` (active, contested, superseded), `review_status` and `open_issue`. Typed relations between the pack's records (`restates`, `progress_of`, `fact_variant`, `contradicts`, `revises`, `supersedes`, `part_of`, `related`, `unresolved`) are optional detail; when given, the checker verifies that grouping types connect records of one claim and the others connect different claims.

### 4.3 The brief (model, same call)

One brief per pack: `core_idea_en` (two to four sentences) plus bullets under `concerns`, `responses`, `numbers`, `changes_between_editions` and `gaps`. Every bullet cites the provisional claim IDs it rests on; only `gaps` may cite none. The brief never states a stage or a score, and never adds a fact that no cited claim supports. Code remaps the citations to stable IDs.

### 4.4 What code derives

- **Merge:** claims that share a record, across packs, become one claim. The merged claim keeps every topic of its members.
- **Stable ID:** `C-` plus the anchor record, the member from the earliest edition, then lowest page, then lowest sequence. Adding a document never renumbers claims it does not touch.
- **Stage:** the highest stage among member statement types. **Stage as of the latest document:** the same, restricted to members from the newest edition among the members. A drop between the two is something to read, not a score.
- **Counts:** distinct merged claims per topic per stage. A multi-topic claim appears once in each of its topics.

### 4.5 Exampleland walk-through

Seven records in one document give six packs. The DRM-02 pack groups the two displacement figures into one contested claim; the WAT-03 pack holds the p. 8 record alone; code merges them because they share that record. The same happens for the drought plan, which sits in both WAT-06 and AGR-03. `check.py` prints:

```text
claim                 stage latest topics          docs      text
C-XEX-NDC3-p8-1       0     0      DRM-02,WAT-03   XEX-NDC3  The 2024 spring floods displaced people...  [contested]
C-XEX-NDC3-p12-1      1     1      CLM-06          XEX-NDC3  Reduce economy-wide GHG emissions by 15%...
C-XEX-NDC3-p21-1      3     3      DRM-03          XEX-NDC3  Install 40 automatic river gauges...        ← planned (2) + procurement underway (3)
C-XEX-NDC3-p21-3      0     0      DRM-03          XEX-NDC3  Limited hydrological data on small tributaries...
C-XEX-NDC3-p30-1      4     4      AGR-03,WAT-06   XEX-NDC3  A national drought management plan was adopted...
```

Two countries are compared topic by topic: Exampleland shows two DRM-03 claims (one at stage 3, one concern at stage 0); another country might show one commitment at stage 1. Both counts are shown next to the documents and pages read.

### 4.6 Views

- **Country view:** per topic, the brief, the claims per stage, and the documents each claim draws on. Domain tabs group topics; a topic in two domains appears in both, and the page says so.
- **Document view:** per document, records by topic split into concerns and responses, plus the coverage ledger and limitations.
- **Comparison view:** per topic, claim counts per stage per country, always with documents and pages read. Counts say what was written, not what was done.

### 4.7 Scoring layer (reserved)

`schemas/scores.schema.json` and the `scoring_layer` block in `claims.json` reserve the shape: scores on stable claim IDs, each with a rubric version, a rationale, the records relied on, who scored (model or person) and a review status. Views will show score distributions per topic next to claim counts. Any aggregation to a topic or country number must be an explicit, versioned rule.

---

## Part 5: The files

### 5.1 Who owns what

| File | Edited by | Rule |
|---|---|---|
| `config/taxonomy.json` | People, deliberately | The only place topics and domains exist |
| `config/vocabulary.json` | People, deliberately | The only place label values and the review status exist |
| `config/claims.json` | People, deliberately | The only place the pack rule, claim unit, merge rule, stages, brief sections and scoring rule exist |
| `countries/<ISO3>/country.json` | People | The documents of a country, with edition dates |
| `schemas/*.json` | People | Structure only; **no value lists**, so they can't drift from the config |
| prompts (to write next) | People | Refer to the config files; never restate their lists by hand |
| model outputs | Never edited, except `review_status` | Re-run with a new version instead |

### 5.2 `taxonomy.json`

```jsonc
{
  "version": "0.1.0-draft",
  "rules": [ "...the subject rules, in the file itself..." ],
  "domains": [
    { "id": "disaster_risk", "prefix": "DRM", "label": "Disaster Risk Management",
      "definition": "...",
      "groups": [ { "id": "reduction_preparedness", "label": "Risk reduction, warning and preparedness" } ] }
  ],
  "topics": [
    { "id": "WAT-03", "label": "Flood and coastal protection",
      "definition": "Structural and nature-based flood, river-bank and coastal protection…",
      "placements": [ { "domain": "water", "group": "hazards" },                       // home (matches WAT prefix)
                      { "domain": "disaster_risk", "group": "reduction_preparedness" } ],
      "routing": [ { "when": "flood warning systems", "use": "DRM-03" } ],          // boundary rules with neighbours
      "legacy_ids": [ "WAT-03" ] }
  ]
}
```

Every topic has a definition, placements (the first is home), routing rules naming its neighbours, legacy IDs, and `split_from` when carved out of a topic that still exists. Groups (the old "subdomains") are for display only; the model never selects them.

### 5.3 `vocabulary.json`

```jsonc
{
  "principles": [ "...one home per concept, empty means nothing extracted, code derives, review_status is the only edit..." ],
  "record_facets": [                       // labels on a record
    { "id": "hazard", "question": "Which potentially damaging process is discussed?",
      "cardinality": "zero_or_more", "value_set": "closed_with_other",
      "rule": "…", "values": [ { "id": "dust_sand_storm", "onset": "sudden", "label": "…", "definition": "…" } ] }
  ],
  "linked_fields": [ ... ],                // stakeholder role, place type, detail kind, page disposition, document kind, review status
  "fact_fields":   { ... }                 // fact_type, comparator, basis, conditionality, finance status…
}
```

Every facet carries the **question it answers**. That makes overlaps visible: if two facets answer the same question, one should go.

### 5.4 `claims.json`

`pack_rule`, `claim_unit`, `grouping_rules`, `merge_rule`, `claim_identity`, the optional `relation_types`, `response_stages` (with both derivations), `claim_fields`, the `brief` sections and the reserved `scoring_layer`. The checker reads its value lists; the topic schema holds only structure.

### 5.5 A country folder

```text
countries/KAZ/
├── country.json                     ← documents: KAZ-NDC3, KAZ-NAP1, ... with edition dates
├── KAZ-NDC3.pdf, KAZ-NAP1.pdf       ← sources (or a pointer to where they live)
├── KAZ-NDC3.extraction.json         ← stage 1, one per document
├── KAZ-NAP1.extraction.json
├── topics/
│   ├── DRM-03.json                  ← stage 2, one per topic that has records
│   └── ...
├── derived/claims.json              ← code output: merged claims, stable IDs, stages, counts (never hand-edited)
└── scores.json                      ← reserved
```

`examples/exampleland/` has this layout, minus the PDFs and the derived file (the checker prints what the derived file will hold).

### 5.6 What changed from the earlier versions, and why

| Decision | v1 | v2 (runtime) | Pilot | Rev 1 | **Rev 2** | Why |
|---|---|---|---|---|---|---|
| Top container | document | document | document | document | **country**, with a manifest | Several documents per country is the normal case |
| Hierarchy | domain → topic | domain → topic | domain → subdomain → topic | domain → topic; groups display-only | same | Model picks one thing (topic); code derives the rest |
| Domains | 11 | 11 | 16 | 16 | 16 | Clearer for social-policy readers |
| Disaster risk | inside Climate | `CLM-08` catch-all | own domain, mostly `CLM-04` + `CLM-08` | own domain, 7 topics | same | The team's core subject |
| Statement type | 3 overlapping fields | 9 values | 11 values + `policy_status` | 10 values; 8 map to a stage | same | One axis, one field |
| Second stage | – | – | pairwise relate-and-group, one document | pairwise relate-and-group, all records | **one pack per topic; several claims + one brief** | Small even inputs; no pairwise explosion; the brief is the deliverable |
| Claim identity | – | – | per run | per run | **stable: `C-` + anchor record** | Adding a document must not renumber |
| Response score | – | – | model-judged 0–4 per claim | derived max stage | derived max stage **and** stage as of the latest document | Reproducible, free, checkable; editions visible |
| Quality score | – | – | topic −1/0/+1 summed, red→blue | forbidden | **reserved layer per claim, rubric-versioned** | Scores wanted later; never mixed into stages |
| Human corrections | – | – | – | none | `review_status` on records, relations, claims | Model-first review instead of hand-labelling |
| Allowed values | in prompts | config + schema enums | in config | config only; schemas structural | same, plus `claims.json` | No drift |
| Dashboard | – | record counts | summed, coloured domain scores | counts per stage | counts per stage, per document, per country; briefs | Comparable without grading |

### 5.7 Decisions log

| # | Question | Decision | Consequence to watch |
|---|---|---|---|
| 1 | What happens to the `priority` statement type? | **Keep it, at stage 1**, the same as a commitment. | The model may blur priority and commitment. Rule: if the priority is actionable, it is a commitment. |
| 2 | One domain for economy and livelihoods, or two? | **Two:** Economy & Transition (`ECO-01`, `ECO-02`) and Livelihoods & Social Protection (`LIV-01`…`03`). | Both domains are small. Domain size is not a quality target. |
| 3 | Keep `DRM-04`, the multi-hazard risk-reduction topic? | **Keep it and monitor.** | If more than about 10% of disaster records land in `DRM-04` in early runs, tighten its routing rules. |
| 4 | Does `result_reported` get a response stage? | **No.** Outcomes set the claim's `outcome_signal` instead. | Views show "did they act" (stage) separately from "did it work" (outcome signal). |
| 5 | When is the topic list reviewed? | **Done once, domain by domain** (drought split out as `WAT-06`, `ENE-07` added, `SET-04` folded into `SET-02`, `CUL-02` into `CUL-01`, `TOU-03` retired). 64 topics. | Re-check after the first model run on real pages. |
| 6 | Does every label carry its own evidence pointer? | **No.** Labels are supported by the record's evidence; facts, stakeholders and details cite an `evidence_id`. | Add it back only if reviewers need per-label citations. |
| 7 | Do records carry structured `risk_contexts`? | **No.** Hazard and risk-component facets, places, facts and details cover the need. | Revisit if risk-profile views need structured exposure detail. |
| 8 | What is the top container? | **The country**, with a manifest listing its documents and edition dates. Stage 2 runs per country. | Document IDs must be unique across countries; they prefix every record ID. |
| 9 | How are records sent to stage 2? | **One pack per topic.** Not all records at once (too big), not per domain (uneven, double processing). | A record in two topics is in two packs; code merges claims that share a record. |
| 10 | One claim per topic, or several? | **Several: one per distinct thing**, plus one brief per topic. | Watch for over-splitting (variants of one target) and under-splitting (two measures in one claim). The grouping rules decide. |
| 11 | How do claims keep their identity across runs? | **Stable ID from the anchor record.** | If a re-run moves the anchor to another claim, the ID moves with it; the checker will show the change. |
| 12 | Where do scores go? | **A reserved layer on stable claim IDs**, rubric-versioned, never computed by the pipeline. | Decide the rubric only after real briefs exist. |
| 13 | Hand-label pages before the first model run? | **No.** Model-first: run, review against the PDF, accept or reject, fix the prompt, re-run. | Less stress-testing of the taxonomy than hand-labelling gives; compensate by reviewing the first run carefully. |

---

## Part 6: Starting the new repo

### Suggested order

1. **Settle the files.** Keep `check.py` passing. Decide the first-run facet set (3.2).
2. **Pick one real country with two documents**, Kazakhstan NDC 3.0 and NAP, and write its `country.json`.
3. **Write the extract prompt** from the config files. Good material to carry over: `prompts/v2/04-extract.md` (record boundaries, numeric notation rules, synthetic guard examples) and `prompts/v2/01-labeling-rules.md` (label reasoning).
4. **Run stage 1 on 10 to 15 pages**, review the output next to the PDF, set `review_status`, fix the prompt or the vocabulary, re-run. That is the first quality check. Then run the full documents.
5. **Write the topic prompt** (claims + brief) from `claims.json`. Carry over the grouping workflow in `prompts/pilot-v1/02-relate-and-group-claims.md`.
6. **Run the packs**, read the merged claims the checker prints, and check the merges across packs.
7. **Build views** from the derived file, starting with the two tables `check.py` already prints.
8. **Scoring last**, once real briefs show what a rubric should ask.

### Carry over from the old repo

- Definitions in `config/v2/label-guide.json`. Much of `vocabulary.json` reuses them.
- The "do not infer" examples in `docs/METHODOLOGY.md` (worked labeling examples table).
- `integrations/fixtures/kazakhstan-taxonomy-demo.json` as a reference for what one sampled NDC yields (40 records, 38 claims).
- The original PDFs and their `Source.txt` provenance files.

### Leave behind

- The −1/0/+1 topic scoring and summed, coloured domain scores.
- Model-judged scores and model-built label rollups.
- Pairwise relation lists as the primary stage-2 output, and candidate-pair generation.
- Value lists copied into schemas and prompts.
- The v1 three-field statement description, and the pilot's `policy_status`.
- Release, moderation, publication and multi-route AI machinery. Add it only when a real need appears.
