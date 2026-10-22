# Data dictionary and field review

**Recommended specification v2.0.0; not active application models.** This describes the proposed logical data contract. It is a review guide, not a database migration or a claim that the current LLM schemas already support these fields. See [RUNTIME-INPUTS.md](RUNTIME-INPUTS.md) for the real current schemas.

The simple distinction is: **a document contains evidence; evidence supports records; compatible records form claims; relationships connect different claims; code assigns documentation bands.** Keep original document assertions alongside combined views.

## Conventions used everywhere

| Convention | Meaning |
|---|---|
| `id` | Persistent ID assigned by code. The LLM uses temporary local references and supplied IDs. |
| `null` | Unknown or not stated; never silently substitute zero or an empty date. |
| `[]` | No supported entries extracted; not proof that the concept does not exist. |
| `evidence_ids` | References to actual evidence entries supporting the object. Every entry must exist in the same allowed source scope. |
| `field_evidence` | Map of JSON Pointer field paths to evidence IDs. Used to explain each populated factual field. |
| Versions | Immutable configuration/extraction/snapshot references make prior results reproducible. |
| Raw versus derived | Preserve source wording; store code-normalized IDs, dates and calculated bands separately. |

No model-generated numerical confidence, manual approval status or additional policy-status classification is required. Statement type, attribution and source-linked detail express the distinctions the pipeline needs.

## 1. Document: what was supplied?

| Field | Form and meaning |
|---|---|
| `id`, `country_iso3` | Code-assigned document identity and country. Country metadata identifies the source; it does not prove that every statement has national scope. |
| `title`, `kind` | Printed title and source category. Initial upload choices: `NDC`, `NAP`, `LTS`, `DRR`, `NC`, `BTR`, `POL`; retain a supported custom kind without inventing its policy role. |
| `edition_date`, `language` | Source edition date and language; nullable when unresolved. A publication date is not an action deadline. |
| `original_name`, `sha256` | Original filename and content hash; code uses these for provenance and duplicate detection. |
| `page_count` | Number of physical PDF pages, not number read by the model. |
| `document_family_id`, `source_url` | Optional family/series identity and recorded official source address. A shared family does not automatically establish replacement. |
| `supersedes_document_id` | Optional explicit document-level replacement reference; never inferred from edition order or a shared family. |
| `source_manifest_id` | Reference to the configured document-role/date inventory used for a comparison. |
| `processing` | Code-maintained extraction/indexing status, readable/unreadable page counts and errors. Separate from policy evidence. |

## 2. Evidence: where exactly was it stated?

| Field | Form and meaning |
|---|---|
| `id`, `document_id` | Evidence identity and originating document. |
| `page`, `page_label`, `cited_page` | Resolved physical page, optional printed label, and original model-cited number. Preserve correction history. |
| `quote` | Short exact source quotation in its original language. Distinct passages remain distinct evidence entries. |
| `automatic_state`, `check_reason` | Source-check outcome and explanation; allowed states are listed below. A matched quote proves occurrence, not the correctness of every inference. |
| `page_text_hash`, `source_span` | Optional code-derived text hash and located span for reproducibility and highlighting. |

Source checks run automatically. Unusable evidence is excluded from qualifying band evidence and recorded as a coverage limitation; it does not open a human approval queue.

## 3. Record: one source assertion

| Field | Form and meaning |
|---|---|
| `id`, `document_id`, `evidence_ids` | Stable record identity, source document and supporting quotations. `local_ref` is temporary within a Stage 1 response and is mapped by code. |
| `statement` | Short English assertion; quotes retain their original language. One proposition per record. |
| `statement_type` | Exactly one of the ten options below. An unadopted recommendation is `proposal`, not a policy commitment. |
| `primary_topic_id` | One listed topic code or null. Determines canonical organization ownership. |
| `secondary_topic_ids` | Other substantively supported topic IDs; tags alone do not establish scoring evidence. |
| `unmapped_concepts` | Source-grounded descriptions that do not fit the current vocabulary. Never silently create topic codes. |
| `policy_object` | Sourced name or description of the programme, target or intervention. Broad programme names help linking but do not establish assertion identity. |
| `policy_object_id` | Nullable, code-assigned country-scoped identity for the particular proposition/intervention. Not a model-invented global ID. |
| `scope_as_stated` | Source wording about geography, population, asset or system boundary; null when unstated. |
| `labels` | Enabled optional facets from the complete list below. Each selected value needs source support. |
| `facts` | Zero or more quantitative/indicator objects; see section 4. |
| `actors` | Named actors and explicit roles; see section 5. |
| `delivery` | Three source-linked checks—actor, timeframe and deliverable—each populated or null; see section 6. |
| `field_evidence` | Field-level attribution using JSON Pointer paths. Metadata cannot supply unstated scope, timing or responsibility. |
| `automatic_state`, `extraction_run_id`, `config_bundle_id` | Automated check status and provenance. Store run metadata once with the run and reference it. |

A source can contain several propositions in the same quotation. Shared text is not a reason to merge them. Funding allocation is a finance fact; it does not automatically mean physical implementation. A `result_reported` record alone remains context unless separate evidence establishes an attributable response.

## 4. Fact: what does the number mean?

| Field | Form and meaning |
|---|---|
| `fact_type`, `metric` | One allowed fact type and the source-defined quantity/indicator. |
| `value_as_stated` | Exact wording, including ranges, qualifications and units where printed. |
| `value` | Unambiguous decimal string, otherwise null. Never invent a converted or calculated value. |
| `unit`, `period` | Source unit and applicable target/observation period, or null. Preserve a range in `value_as_stated` even if `value` is null. |
| `comparator`, `direction`, `basis` | Listed qualifiers below. These distinguish “at least”, decreases, shares, absolute totals and reductions against a baseline. |
| `baseline_value`, `baseline_period`, `baseline_relevance` | Stated baseline details and a short explanation of whether a baseline is required for this comparison. Never borrow a differently defined context figure as a baseline. |
| `total_or_additional`, `conditionality`, `scenario` | Whether the quantity is a total/addition, its conditions, and stated pathway. Unknown scenario is null. |
| `geography`, `system_boundary`, `denominator` | Exact scope and denominator needed to interpret or compare a quantity, when stated. |
| `finance_status` | Listed status for finance facts; null for a non-finance fact. Allocated and spent are different assertions. |
| `evidence_ids` | Quotes supporting this fact; specific subfields also appear in the record's `field_evidence`. |

Example: “20% below 2010 emissions by 2030, conditional on support” keeps the historical-reduction basis, 2010 baseline, 2030 period and conditional pathway together. It cannot be averaged with an unconditional 15% target.

## 5. Actor: who is involved?

Each `actors[]` entry has `name`, `role`, `policy_object_id` and `evidence_ids`. The role comes from the seven allowed options below. Null identity is retained when the text does not establish which action the actor is attached to. Do not infer responsibility from a ministry appearing elsewhere in the document.

Only an explicitly responsible or implementing **organization** can satisfy the delivery actor check. A financier, consulted stakeholder or mentioned person does not satisfy it by itself.

## 6. Delivery detail: three transparent checks

`delivery` contains `actor`, `timeframe` and `deliverable`. Each is **null** or an object with `text`, `policy_object_id` and `evidence_ids`, plus the discriminator below. The LLM supplies source wording and proposed associations; code resolves IDs and checks coherence before calculation.

| Detail | Additional field | Qualifying meaning |
|---|---|---|
| `actor` | `role` from actor roles | A named responsible or implementing organization for this response. |
| `timeframe` | `anchor` from timeframe anchors | A stated action deadline, delivery period or dated milestone. Publication date alone is insufficient. |
| `deliverable` | `kind` from deliverable kinds | A quantified output, identified asset, named legal instrument or identifiable milestone. A generic action is insufficient. |

All three must attach to the **same coherent response and compatible variant**. Multiple documents may supply details for that response. A shared programme name, a `supports` link or a common topic cannot join an actor for one measure to a date and output for another.

```json
{
  "delivery": {
    "actor": {
      "text": "Ministry of Agriculture",
      "role": "implementing",
      "policy_object_id": "XEX:response:canal-17-rehabilitation",
      "evidence_ids": ["E17"]
    },
    "timeframe": {
      "text": "by December 2030",
      "anchor": "action",
      "policy_object_id": "XEX:response:canal-17-rehabilitation",
      "evidence_ids": ["E17"]
    },
    "deliverable": {
      "text": "rehabilitate Canal 17",
      "kind": "named_asset",
      "policy_object_id": "XEX:response:canal-17-rehabilitation",
      "evidence_ids": ["E17"]
    }
  },
  "field_evidence": {
    "/delivery/actor/text": ["E17"],
    "/delivery/actor/role": ["E17"],
    "/delivery/timeframe/text": ["E17"],
    "/delivery/timeframe/anchor": ["E17"],
    "/delivery/deliverable/text": ["E17"],
    "/delivery/deliverable/kind": ["E17"]
  }
}
```

This is synthetic and assumes E17 explicitly supports those details. IDs are illustrative code outputs, not ID strings the model should manufacture. For a number in the first fact, use a pointer such as `/facts/0/value_as_stated`; for scope, use `/labels/geographic_scope` or `/scope_as_stated`, whichever field is actually present.

## 7. Claim, variant and membership: what is the common proposition?

| Logical object | Fields and interpretation |
|---|---|
| `Claim` | `id`, `country_iso3`, `title`, `primary_topic_id`, `secondary_topic_ids`, `policy_object_id`, `member_record_ids`, `variants`, `version`, `lineage`. The title summarizes one proposition; original records remain unchanged. |
| `ClaimVariant` | `id`, `claim_id`, `record_ids`, `policy_object_id`, `statement_type`, `conditionality`, `facts`, `delivery`, `evidence_ids`. Preserve materially different values, periods, scopes, baselines or conditions. Assess compatible details within each variant. All variants of one claim share the identified proposition/intervention; their qualifications can differ. |
| `ClaimMember` | `claim_id`, `record_id`, `variant_id` (nullable), `snapshot_id`. Code ensures every owned eligible record belongs to exactly one core claim or an explicitly retained unclassified entry. Context-only references never create duplicate ownership. |
| Derived claim view | Documentation band/bounds and delivery-check results; evidence IDs for every check; source assertion stages; conflict indicators or `current_target_state`; `resolved_value` nullable where values conflict. These are computed fields governed by [config/scoring.json](config/scoring.json), not LLM judgments or an additional manually assigned policy-status label. |

A sourced claim has band 1, 2 or 3. “No evidence found” is a complete topic-search outcome, not a band for an existing sourced claim. Do not average variant bands. Preserve compatible qualifiers and show when details vary. Current implementation status requires an evidenced update relationship; a later document's stage does not overwrite older source assertions.

### Adapter to the small reference calculator

[examples/water.json](examples/water.json) is a readable logical example with source records and relationships. It is not directly the calculator's input shape. [examples/band-cases.json](examples/band-cases.json) contains normalized calculator inputs. The production adapter must preserve the following mapping:

| Logical data | Reference-calculator input |
|---|---|
| Selected country/document view | `scope.kind` (`country` or `document`) and explicit `scope.document_ids`. A document view admits only its own evidence. |
| Shared topic profile | `profile.profile_id` and all fixed `profile.topic_ids`, including topics whose processing is incomplete. |
| Eligible Evidence | `evidence_id` from `id`, plus `document_id`. Upstream checks establish source fidelity and eligibility; the calculator only checks the normalized contract. |
| Claim identity and supported topics | `claim_id` from `id`, and `topic_ids` containing substantively supported primary/secondary topics. A display placement alone does not add a topic ID. |
| Claim variants | At least one normalized variant with `variant_id`, `policy_object_id`, `statement_type`, `conditionality` and `evidence_ids`. An unambiguous logical claim with `variants: []` receives one code-assigned assessment variant assembled from its compatible member evidence. |
| `delivery` | Normalize to variant `details`, with the same `actor`, `timeframe` and `deliverable` null/object contract. Every detail's evidence must be included in that variant's admitted `evidence_ids`. |
| Topic coverage and taxonomy | `topics[]` entries with `topic_id`, authoritative `home_domain_id` and `processing_complete`. Preserve every fixed-profile topic; do not infer completeness from an empty claim list. |

The adapter selects source-local assertions and compatible details for the requested view; it cannot import another document's detail into a document-only assessment. It must not infer policy identity, qualifying actor roles or delivery specificity from missing fields. Policy-object IDs are required for response variants; a non-response variant may use null. A variant has one claim owner. Field names used in the normalized input are implementation boundaries, not additional labels the LLM must choose.

## 8. Relationship: how do different assertions connect?

| Field | Form and meaning |
|---|---|
| `id`, `type` | Code-assigned link ID and one of nine allowed relationship types. |
| Endpoint pair | Either `from_record_id`/`to_record_id` or `from_claim_id`/`to_claim_id`; endpoints must exist. Keep source direction clear. |
| `evidence_record_ids`, `rationale` | Supporting source records and a concise reason. A broad common subject alone is not enough. |
| `comparability` | `comparable`, `not_comparable` or `insufficient_detail`. Check quantity, scope, unit, period, basis and conditions before declaring conflicting numbers. |

`supports` and `contextualizes` preserve separate claim identity. `supersedes` requires explicit source evidence of replacement; date order alone is insufficient. `not_comparable` preserves both assertions when a comparison would mislead.

## 9. TopicCoverage: what was searched and what is known?

Keep one assessment per snapshot, country, topic and source scope. Fields are `topic_id`, `snapshot_id`, `source_scope_id`, `processing_complete`, `source_profile_complete`, `attempted_queries`, `retrieved_pages`, `unreadable_pages`, `missing_document_ids`, `limitations`, `claim_ids`, `response_claim_count` and `detail_ready_claim_count`.

Derived fields hold the topic's demonstrated band, uncertainty bounds, reported-progress/conflict indicators and comparison eligibility. A failed or incomplete search with no evidence has **Unavailable**, not “No evidence found.” A positive response remains visible even if another document fails. The source profile can be incomplete while processing of the supplied files is complete; keep these different conditions separate.

For domain summaries, code counts fixed unique home topics in each band and reports response coverage with an uncertainty range when necessary. Band numbers are ordinal categories; do not average them or compute z-scores from them.

## 10. Snapshot and ConfigBundle: which version produced this view?

| Object | Fields and interpretation |
|---|---|
| `ConfigBundle` | `id`, `version`, `taxonomy_version`, `labels_version`, `scoring_version`, `prompt_versions`, `model_settings`, `retrieval_settings`, `comparison_profile_id`, `source_profile_id`, `file_hashes`, `created_at`. Save settings without credentials. |
| `Snapshot` | `id`, `country_iso3`, `config_bundle_id`, `source_manifest_id`, `document_ids`, `record_version_ids`, `claim_version_ids`, `coverage_ids`, `created_at`, `published_at`, `processing_complete`, `source_profile_complete`, `limitations`, `prior_snapshot_id`. Publish one coherent output view automatically. |

An unfinished refresh does not erase the previous snapshot. A published partial snapshot states its limitations. Scoring-only changes can build a new snapshot from retained checked evidence without another extraction call. Model or taxonomy changes record their version and affected reruns.

## 11. UserOverlay: what did a user change after publication?

Fields are `id`, `snapshot_id`, `claim_id`, `claim_version`, `visibility`, `flags`, `reason`, `actor`, `created_at` and `updated_at`. Use the visibility/flag choices below. These are presentation controls and annotations after publication; they do not rewrite source evidence.

Hiding a claim does not silently alter the generated regional comparison. An explicit analytical exclusion creates a separately labelled adjusted snapshot. No flag waits for moderation before the ordinary dashboard is published.

<!-- BEGIN GENERATED CHOICES -->
## Complete label choices

This inventory mirrors [config/labels.json](config/labels.json). The pipeline should compile enabled choices into its strict output schema and generate this review section from the same bundle. These proposal documents are not yet synchronized by the running app.

### Statement type

Select one per atomic record. Response stages are separate from documentation bands; the model returns the type and code derives the stage. A reported effect alone remains context without an attributable response assertion.

| Code | Meaning | Source assertion stage |
|---|---|---|
| `concern` | A stated risk, vulnerability, impact, need, barrier or gap | None |
| `context` | A current or historical condition, capacity or baseline | None |
| `projection` | A modeled or expected future condition, not a policy undertaking | None |
| `commitment` | An attributable policy goal, priority or target | Commitment |
| `planned_action` | A specific planned measure, programme or instrument | Planned |
| `implementation_underway` | Explicit implementation, procurement, construction or operation of the identified action | Underway |
| `output_delivered` | Explicitly completed, installed or adopted output of the identified action | Delivered |
| `result_reported` | A reported outcome or effect; does not by itself prove causation or target achievement | None |
| `proposal` | A recommendation without an attributable adopted undertaking | None |
| `other` | Relevant sourced statement that no listed type fits | None |

### Context labels

Only select supported options. “Many” means zero or more. “One or null” permits unknown. Empty arrays do not mean absent. A climate/disaster document title alone does not establish purpose. Mitigation means reducing greenhouse-gas emissions or increasing removals; flood mitigation belongs to disaster risk reduction.

| Field | Selection and initial setting | Allowed options |
|---|---|---|
| `purpose` | Zero or more; enabled | `adaptation`, `mitigation`, `disaster_risk_reduction` |
| `geographic_scope` | One or null; enabled | `local`, `subnational`, `national`, `transboundary`, `regional`, `EU`, `global` |
| `hazards` | Zero or more; enabled | `flood`, `heavy_precipitation`, `drought`, `water_scarcity`, `extreme_heat`, `extreme_cold`, `storm_wind`, `dust_sand_storm`, `wildfire`, `landslide_mudflow`, `avalanche`, `glacial_lake_outburst`, `glacier_permafrost_loss`, `desertification_land_degradation`, `sea_level_rise`, `coastal_hazard`, `disease_biological`, `earthquake`, `tsunami`, `technological`, `compound_cascading` |
| `themes` | Zero or more; enabled | `gender_equality`, `social_inclusion`, `poverty_inequality`, `participation`, `capacity_building`, `technology_transfer`, `transboundary_cooperation`, `nature_based_solutions` |
| `affected_groups` | Zero or more; enabled | `women`, `men`, `children`, `youth`, `older_people`, `persons_with_disabilities`, `low_income_households`, `farmers`, `herders`, `fishers`, `rural_communities`, `urban_communities`, `workers`, `indigenous_local_communities`, `migrants_displaced_people` |
| `policy_instruments` | Zero or more; enabled | `strategy_plan`, `law_regulation`, `standard_code`, `public_investment`, `subsidy_incentive`, `tax_pricing`, `market_mechanism`, `insurance_risk_finance`, `institution_coordination`, `information_warning`, `research_data`, `training_capacity`, `ecosystem_management`, `infrastructure_service` |
| `risk_component` | Zero or more; optional; disabled | `hazard`, `exposure`, `vulnerability`, `capacity`, `impact`, `residual_risk`, `systemic_cascading_risk` |
| `risk_function` | Zero or more; optional; disabled | `risk_understanding`, `risk_prevention_reduction`, `early_warning_preparedness`, `anticipatory_action`, `emergency_response`, `recovery_reconstruction`, `coping_continuity`, `systemic_transformation` |

Specialist `risk_component` and `risk_function` remain optional and disabled. Activating them expands classification output, not topic count or scoring weights. Earthquake and technological hazards remain valid disaster-risk context without implying climate causation.

### Fact qualifiers

These preserve the meaning of numerical statements. Extra populated fields do not earn points. Select the exact listed code; use `not_stated` where supplied, or null for an inapplicable optional field.

| Field | All allowed options |
|---|---|
| `fact_type` | `target`, `observation`, `projection`, `finance`, `indicator` |
| `conditionality` | `unconditional`, `conditional`, `not_stated` |
| `comparator` | `equal`, `at_least`, `at_most`, `range`, `approximate`, `not_stated` |
| `direction` | `increase`, `decrease`, `maintain`, `complete`, `not_stated` |
| `basis` | `absolute`, `historical_reduction`, `BAU_reduction`, `intensity`, `share`, `other`, `not_stated` |
| `total_or_additional` | `total`, `additional`, `not_stated` |
| `finance_status` | `need_or_estimate`, `requested`, `pledged`, `committed`, `allocated`, `mobilized`, `disbursed`, `spent`, `not_stated` |

### Actor and delivery checks

**Actor roles:** `responsible`, `implementing`, `financing`, `supporting`, `monitoring_reporting`, `consulted`, `unspecified`.

A `responsible` or `implementing` organization may satisfy the actor check. Other roles remain useful context. No separate policy-status enum is needed.

| Field | Allowed options |
|---|---|
| `timeframe_anchor` | `action`, `publication` |
| `deliverable_kind` | `quantified_output`, `named_asset`, `named_legal_instrument`, `named_milestone`, `generic_action` |

`action` means a source-stated action date or period; `publication` never satisfies delivery timing. A generic action such as “rehabilitate canals” is not a specific deliverable. “Rehabilitate Canal 17” names an asset. All three delivery details must concern the same compatible response, not merely the same broad programme.

### Relationships and operational choices

| Field | All allowed options |
|---|---|
| Relationship `type` | `restates`, `progress_of`, `supports`, `contextualizes`, `revises`, `supersedes`, `part_of`, `contradicts`, `not_comparable` |
| `comparability` | `comparable`, `not_comparable`, `insufficient_detail` |
| `automatic_state` | `passed`, `repairing`, `evidence_unavailable`, `organization_partial` |
| Overlay `visibility` | `visible`, `hidden` |
| Overlay `flags` | `incorrect`, `duplicate`, `wrong_topic`, `outdated`, `other` |

Automatic states describe machine checks, not human approval. Supports/contextualizes links retain separate claims; neither upgrades delivery detail or stage. Supersession needs explicit replacement evidence. Contradiction needs a comparable basis.

Visibility and flags are post-publication controls. Hiding changes presentation by default; explicit analytical exclusions create a separately labelled adjusted snapshot. The generated regional benchmark remains reproducible.

<!-- END GENERATED CHOICES -->
