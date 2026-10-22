# Data dictionary: source records, combined claims and calculated coverage

**Presentation revision:** the [v4 scoring method](../ui-scoring/METHOD.md) adds visible response-claim points and topic/domain means. Raw source and LLM contracts below remain the baseline. Earlier statements that claim scores are hidden diagnostics describe the v3 presentation and are superseded for the new dashboard.

**Review specification 3.0.0 — not active application models.** This is the proposed data contract, not a database migration. The preserved application and runtime inputs are described in [the preserved-files guide](../preserved/README.md).

A document supplies quotations; quotations support source records; compatible records form common claims; relationships connect distinct claims. Code then calculates topic documentation bands and coverage. Keep the original assertions alongside every combined view.

## Three distinct contracts

| Layer | Authority | Purpose |
|---|---|---|
| Raw LLM output | [llm-contracts.json](../pipeline/llm-contracts.json), compiled using [taxonomy.json](../pipeline/taxonomy.json) and [labels.json](../pipeline/labels.json) | Small extraction and organization responses, with temporary references and evidence. |
| Normalized logical objects | This dictionary | Code-owned identities, source provenance, compatible claims and immutable snapshots. |
| Calculation input/output | [score-bands.mjs](score-bands.mjs) and [scoring.json](../pipeline/scoring.json) | Source-scoped, topic-qualified assessments and reproducible coverage. |

The raw response is not a database row or a scoring input. The reference calculator is not a source verifier. Production adapters between these contracts remain implementation work. None of these review files is loaded by the present application.

`id` means a persistent code-assigned identifier. `null` means unknown/not stated, not zero. `[]` means no supported entries extracted, not proof of absence. Every `evidence_ids` reference must resolve in the allowed source scope. Preserve raw wording beside any normalization. No model confidence percentage, human approval status or extra manually assigned policy-status enum is needed.

## 1. Document and source unit

| Object / fields | Meaning |
|---|---|
| Document `id`, `country_iso3`, `title`, `kind` | Code identity, source country, printed title and document role. Initial comparable roles are `NDC` and `NAP`; other roles require a later explicit configuration/profile change. Country metadata does not establish national scope for every assertion. |
| `edition_date`, `language` | Source edition date/language, nullable if unresolved. Publication date is not an action deadline. |
| `original_name`, `sha256`, `page_count` | Original filename, content hash and physical PDF page count. A page count is not a model-read count. |
| `document_family_id`, `source_url`, `supersedes_document_id` | Optional series identity, recorded source address and source-evidenced replacement. A shared family or later date alone does not establish replacement. |
| `source_manifest_id`, `processing` | Comparison document inventory plus code-maintained indexing status, readable/unreadable pages and errors. |
| SourceUnit `source_unit_id`, `document_id`, physical-page mapping, text, `context_unit_ids` | Code-owned bounded source text. The model cites supplied unit IDs; code resolves physical pages. Context units preserve table headings, units and footnotes where needed. Source units are retrieval inputs, not new policy entities. |

Keep the source-role/date rule and exact included editions with the snapshot. “All supplied documents” is useful exploration but does not imply that countries have comparable source profiles.

## 2. Evidence

Raw extraction returns `evidence[]` entries with **`local_ref`, `source_unit_id`, `quote`**. The quote is short exact source text in its original language. The model does not assign a persistent evidence ID or certify a physical page.

Normalized Evidence fields are `id`, `document_id`, `source_unit_id`, `page`, `page_label`, `quote`, `automatic_state`, `check_reason`, `page_text_hash` and `source_span`. The last two are optional code-derived locating data. Keep a cited-page/correction history if importing legacy records; the new raw contract uses source-unit mapping instead.

Automatic source checks establish whether the quotation occurs in its allowed source. They do not prove policy effectiveness or the truth of every inference. Evidence that cannot be used is retained with a limitation and excluded from qualifying checks. No human approval queue is created.

## 3. Record: one source assertion

| Raw Stage 1 field | Normalized field / handling |
|---|---|
| `local_ref` | Code assigns Record `id`; preserve the temporary reference with the run for traceability. |
| `statement`, `statement_type` | Short English assertion and one allowed assertion type; quotes remain in their original language. |
| `primary_topic_id`, `secondary_topic_ids` | One canonical topic or null, plus substantively supported additional topics. Domains and organizational homes come from taxonomy. Tags alone do not qualify for a topic's score. |
| `unmapped_concepts` | Source-grounded concepts outside the vocabulary. Keep original assertion type and visible unmapped evidence; never create an Other domain or auto-add topics. |
| `policy_object_as_stated` | Preserve this source wording; normalized `policy_object` may hold the same description. Code may assign nullable `policy_object_id` after association checks. |
| `scope_as_stated`, `conditionality` | Source scope and one allowed conditionality; never infer scope from upload metadata. |
| `labels` | Enabled facets only. Disabled fields are omitted, not negative findings. |
| `facts` | Compact source number objects described below. |
| `delivery` | Nullable who/when/what details described below. |
| `priority_evidence` | Null or `{text, evidence_refs}` quoting explicit priority wording. Normalize references to `evidence_ids`; no ranking or scoring weight. |
| `evidence_refs` | Map response-local evidence references to persistent `evidence_ids`. |
| `field_evidence` | Raw array of `{path, evidence_refs}`; normalize to a JSON Pointer → evidence-ID map. Validate that each pointer identifies a real populated field. |

Code also stores `document_id`, `automatic_state`, `extraction_run_id` and `config_bundle_id`. Store model/settings metadata once per run, not on every statement. The raw response's top-level `limitations[]` can describe difficulties but cannot certify retrieval completion.

One quotation can support several distinct assertions. Shared wording does not make those assertions equivalent. `result_reported` alone is context, not proof that an attributable policy response occurred. “Drought is a national priority” may be a concern; the priority field does not turn it into a commitment.

## 4. Fact: what does a number mean?

The lean raw fact contains all of these fields:

| Fields | Meaning |
|---|---|
| `fact_type`, `metric`, `value_as_stated` | Quantity kind, source-defined measure and exact number wording, including ranges and qualifications. |
| `unit`, `period` | Stated measurement unit and applicable target/observation period, or null. |
| `baseline_as_stated`, `geography_or_system`, `scenario` | Nullable source wording for baseline, scope/boundary and pathway. |
| `comparator`, `direction`, `basis`, `total_or_additional`, `conditionality` | Allowed qualifiers; keep them with the quantity. |
| `finance_status` | Allowed status for finance facts; null for other facts. Allocated and spent are different assertions. |
| `evidence_refs` | Local evidence supporting the fact, mapped to `evidence_ids`. |

Normalized storage **may additionally** expose `value` as an unambiguous decimal string, `baseline_value`, `baseline_period`, `baseline_relevance`, `geography`, `system_boundary` and `denominator`. These are not additional raw model fields. Populate only from explicit source wording through a documented adapter; retain null when unresolved. Do not invent a conversion, split a range arbitrarily or borrow another measure's baseline. Keep the original compact fields alongside any parsed values.

A target “20% below 2010 emissions by 2030, conditional on support” keeps its basis, baseline, period and condition together. It cannot be averaged with an unconditional 15% target or a change against a different scenario.

## 5. Actor and delivery details

The lean raw contract structures the **delivery actor only**, not a full `actors[]` inventory. Other actors remain in source assertions and quotations. A logical Actor projection can use `name` from delivery actor text, `role`, nullable code-resolved `policy_object_id` and `evidence_ids`. Complete structured actor coverage would require a later explicit schema change.

`delivery` contains exactly `actor`, `timeframe` and `deliverable`; each is null or the raw object below. Code adds `policy_object_id` and maps evidence references when building normalized detail objects.

| Detail | Raw object | What can qualify |
|---|---|---|
| Actor | `{text, role, evidence_refs}` | Named organization explicitly responsible for or implementing this response. A financier alone is insufficient. |
| Timeframe | `{text, anchor, evidence_refs}` | Action deadline, delivery period or dated milestone. Publication date alone fails. |
| Deliverable | `{text, kind, evidence_refs}` | Quantified output, identified asset, named legal instrument or identifiable milestone. A generic action fails. |

All three must describe the **same coherent response and compatible variant**. A shared broad programme or topic does not establish identity. Supporting capacity, a nearby ministry name and an unrelated project deadline cannot be combined into a detailed response.

Raw source-linked example, assuming local evidence `e1` explicitly states every detail:

```json
{
  "delivery": {
    "actor": {"text": "Ministry of Agriculture", "role": "implementing", "evidence_refs": ["e1"]},
    "timeframe": {"text": "by December 2030", "anchor": "action", "evidence_refs": ["e1"]},
    "deliverable": {"text": "rehabilitate Canal 17", "kind": "named_asset", "evidence_refs": ["e1"]}
  },
  "field_evidence": [
    {"path": "/delivery/actor/text", "evidence_refs": ["e1"]},
    {"path": "/delivery/actor/role", "evidence_refs": ["e1"]},
    {"path": "/delivery/timeframe/text", "evidence_refs": ["e1"]},
    {"path": "/delivery/timeframe/anchor", "evidence_refs": ["e1"]},
    {"path": "/delivery/deliverable/text", "evidence_refs": ["e1"]},
    {"path": "/delivery/deliverable/kind", "evidence_refs": ["e1"]}
  ]
}
```

This synthetic fragment omits the other required record fields. After reference mapping, a normalized pointer map can be `{"/delivery/actor/text": ["E17"]}`. `/facts/0/value_as_stated` attributes the first fact; `/labels/geographic_scope` attributes a selected scope label. Code-generated IDs are not invented source facts and do not require a quotation describing the ID string.

## 6. Claim, variant and membership

Stage 2 receives immutable eligible records, relevant read-only context and allowed previous IDs. It proposes group membership; it does not re-extract document text or return scores.

| Raw Stage 2 field | Interpretation |
|---|---|
| `claims[].local_ref`, `title` | Temporary proposed claim identity and a concise common proposition. |
| `claims[].variants[].local_ref`, `record_ids` | Temporary variant identity and owned source assertions representing one compatible version. |
| `detail_record_ids`, `association_evidence_ids` | References proposed to supply compatible details, and supplied evidence supporting that association. A reference does not itself establish coherence. |
| `suggested_prior_claim_id` | Nullable existing ID suggestion; code determines lineage. |
| `retained_records[].record_id`, `reason` | Eligible owned records retained outside a successful common group. Nothing silently disappears. |

Normalized logical objects:

| Object | Fields |
|---|---|
| Claim | `id`, `country_iso3`, `title`, `primary_topic_id`, `secondary_topic_ids`, `policy_object_id`, `member_record_ids`, `variants`, `version`, `lineage`. |
| ClaimVariant | `id`, `claim_id`, `record_ids`, `detail_record_ids`, `association_evidence_ids`, `policy_object_id`, source assertion `statement_type`, `conditionality`, `facts`, `delivery`, `evidence_ids`. |
| ClaimMember | `claim_id`, `record_id`, nullable `variant_id`, `snapshot_id`. |

Code assigns persistent identities scoped to the country and identified proposition/intervention. A broad programme can contain many policy objects. Each owned eligible record has one core claim owner or an explicit retained entry; read-only context links do not duplicate ownership.

Keep materially different values, periods, scopes, baselines and conditions as variants. Claim histories retain source-local assertion types and evidence of any update/replacement. An arbitrary maximum stage or later publication must not overwrite older assertions or flow back into an older document's view. Unresolved target values remain unresolved.

**History-to-assessment adapter rule (required implementation, not an implemented selector):** retain every original record in history, but do not pass all dated stages as competing assessment variants. Within the selected source scope, an explicitly evidenced `progress_of` update can establish the later reported stage for the same response when the source establishes the sequence. `revises` or `supersedes` changes only the proposition/fields the evidence explicitly updates or replaces. Retain the supporting update edge and source IDs. Compatible history can therefore produce one assessment interpretation; materially incompatible, unresolved alternatives remain separate variants. If sequence, identity or replacement is unclear, retain alternatives rather than choose the latest publication or highest stage. `supports`, `contextualizes` and mere non-repetition cannot resolve history. A document-only assessment uses only its local evidence; a later document's update never alters the older document's result.

Internal claim/variant bands and check results are calculation diagnostics, not headline claim ratings. The UI shows assertion types, who/when/what checks, variants and evidence. A single detailed project does not imply that the whole topic is adequately addressed.

**Provisional singleton fallback (deterministic adapter rule, implementation planned):** if Stage 2 fails, remains partial or returns an owned record in `retained_records`, code retains each verified source-local record as a provisional one-record claim/assessment. Its stable provisional identity refers back to that record and the snapshot. Direct source-supported response and delivery predicates remain positive; no details, actor, time, quantities or identities are borrowed from another record. Records whose source checks do not establish those predicates remain unavailable for qualification rather than being promoted. No extra LLM call is required.

Set `organization_complete=false` for the affected topic/pack, so its supplied-job `processing_complete` is false even if extraction succeeded. Already demonstrated positive predicates survive; missing predicates stay unknown through the ordinary coverage bounds. Keep provisional records and exact sources visible, label any common-claim counts provisional and avoid headline counts. Successful organization later creates a newer snapshot with explicit lineage from provisional records to organized claims; it does not rewrite the earlier snapshot. This fallback does not claim that duplicates, relationships or contradictions have been resolved.

## 7. Relationship

The raw Stage 2 relationship has `type`, `from_record_id`, `to_record_id`, `evidence_ids`, `comparability` and `rationale`. All endpoints and evidence must be supplied IDs. Normalized storage adds `id`; derived claim links may also carry `from_claim_id`/`to_claim_id` while retaining original record endpoints. Legacy logical examples may use `evidence_record_ids`; those record references do not replace quote-level `evidence_ids` in the new wire contract.

`supports` and `contextualizes` connect separate assertions without donating a score or establishing shared identity. `supersedes` needs explicit replacement evidence. Before asserting a contradiction, compare quantity, scope, unit, period, baseline/basis and conditions. The full nine relationship choices and three comparability choices are in the [taxonomy choice guide](../team/TAXONOMY.md#relationships).

## 8. Adapter to the reference calculator

[water.json](../examples/water.json) is a readable logical example. [water-score-input.json](../examples/water-score-input.json) is its calculation input. The adapter must create the following explicit boundary; the LLM is not asked to return it.

| Normalized calculator field | Adapter responsibility |
|---|---|
| `scope.kind`, `scope.document_ids`, `scope.source_profile_complete` | Select country or single-document scope, admitted source IDs and an explicit Boolean for required source-role completeness. A missing required role sets false; it does not erase positive evidence. |
| `profile.profile_id`, `profile.topic_ids` | Fixed common topic basket, including incomplete topics. Never drop silent topics for an individual country. |
| `evidence[]` | Map code-checked source evidence to `evidence_id` and `document_id`; perform source fidelity checks upstream. |
| `claims[].claim_id`, `topic_ids` | Canonical claim identity and substantive topics; a display placement is not a topic tag or scoring qualification. |
| `variants[]` | At least one assessment variant with `variant_id`, `policy_object_id`, `statement_type`, `conditionality`, `evidence_ids` and `details`. Unambiguous logical claims with no explicit competing variant still get one code-assigned assessment variant. |
| Variant `details` | Normalize delivery to actor/timeframe/deliverable; every populated detail has source text, discriminator, code-resolved `policy_object_id` and admitted `evidence_ids`. |
| `topic_projections[]` | Required when a claim has multiple `topic_ids`. Each `{topic_id, variants}` carries that topic's own qualified assertion types and details for the same canonical variant IDs. The engine checks topic/variant coverage, identity and admitted evidence. |
| `topics[]` | Each profile topic's `topic_id`, authoritative `home_domain_id` and input `processing_complete` for supplied-job success, including required organization work. Code outputs `job_processing_complete` and effective `processing_complete = job_processing_complete AND scope.source_profile_complete`. Empty records never imply completed searching. |

A secondary topic must not inherit a claim-wide response or delivery band merely because it is tagged. The adapter creates per-topic projections after source and association checks. For example, a water project can be a detailed response for irrigation while merely supplying context for an energy topic; the latter projection keeps context and null delivery. One ministry cannot be reused as the actor for an unrelated secondary measure. Projection validation constrains IDs and evidence but does not replace the upstream semantic check.

A document-only adapter selects that document's assertions and details. The combined country view may combine compatible details across documents; those details must not leak back into a single-document score. Non-response variants may have null policy-object identity; response variants require a resolved coherent identity.

## 9. TopicCoverage and calculated metrics

Keep one logical coverage object per snapshot, country, topic and source scope. Fields are `topic_id`, `snapshot_id`, `source_scope_id`, `processing_complete`, `organization_complete`, `source_profile_complete`, `attempted_queries`, `retrieved_pages`, `unreadable_pages`, `missing_document_ids`, `limitations`, `claim_ids`, `response_claim_count` and `detail_ready_claim_count`.

Derived topic fields include demonstrated documentation band/bounds, reported implementation, conflicts and comparison eligibility. Keep supplied-job success (`job_processing_complete`) separate from required-source presence (`source_profile_complete`). The calculator's effective topic `processing_complete` requires both. A supplied-file search can succeed while a required NAP is missing; unproved predicates then remain unknown. An effectively incomplete search with no qualifying evidence is Unavailable, not “No evidence found.” Positive evidence remains visible during partial processing.

The three calculated metrics are **`response`**, **`delivery_details`** and **`implementation_reported`**. For a coherent assessment variant, response means band ≥2; delivery details means band ≥3; implementation reported means `implementation_underway` or `output_delivered`, independently of band 3. Claim lower qualification requires all its relevant variants; upper qualification needs any. A topic's lower qualification needs any qualifying claim lower; its upper qualification needs any claim upper or incomplete processing.

For each metric, count P established topics, A resolved nonqualifying topics and U unresolved topics; **N = P + A + U**. Output `P`, `A`, `U`, `N`, `lower_percent = 100P/N`, `upper_percent = 100(P+U)/N` and `exact` (U = 0). Outputs are under `assessment.national.metrics.*` and `assessment.domains[].metrics.*` in the safe result wrapper. Processing completeness is separate from the metric's unresolved count.

Country calculations use the unique common topic basket, 64 by default. Domain calculations use its home-topic subset. They are not averages of ordinal bands or unweighted domain percentages. The [scoring guide](../team/SCORING.md) is the readable method authority.

## 10. Snapshot and ConfigBundle

| Object | Fields |
|---|---|
| ConfigBundle | `id`, `version`, `taxonomy_version`, `labels_version`, `scoring_version`, `prompt_versions`, `model_settings`, `retrieval_settings`, `comparison_profile_id`, `source_profile_id`, `file_hashes`, `created_at`. Save no credentials. |
| Snapshot | `id`, `country_iso3`, `config_bundle_id`, `source_manifest_id`, `document_ids`, `record_version_ids`, `claim_version_ids`, `coverage_ids`, `created_at`, `published_at`, `processing_complete`, `source_profile_complete`, `limitations`, `prior_snapshot_id`. |

Publish a coherent result automatically after bounded machine checks. A refresh does not erase the prior snapshot. Partial results state limitations. Scoring-only edits can recompute from retained checked inputs; taxonomy/model changes record affected reruns.

Documentation arrows need comparable method/topic/source profiles, genuine editions in the same families, complete relevant processing/source profiles and exact metric values. Source backfill and method changes use a refresh symbol rather than a policy-improvement arrow.

## 11. UserOverlay

Fields are `id`, `snapshot_id`, `claim_id`, `claim_version`, `visibility`, `flags`, `reason`, `actor`, `created_at` and `updated_at`. These are recoverable post-publication controls. Hiding changes presentation by default, not the generated regional comparison. An analytical exclusion creates an explicitly labelled adjusted snapshot. No human flag, approval or moderation is required for ordinary publication.

## Where all choices are listed

The complete domain/topic, facet, statement-type, fact, actor, delivery, relationship, automatic-state and overlay choices appear once in [TAXONOMY.md](../team/TAXONOMY.md). The editable machine authorities are [taxonomy.json](../pipeline/taxonomy.json) and [labels.json](../pipeline/labels.json); the builder compiles them into the strict raw schemas. This dictionary defines the fields rather than duplicating a second option catalog.
