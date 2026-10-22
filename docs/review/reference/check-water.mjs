/**
 * Reproducible synthetic worked example. No LLM calls or real PDF validation.
 * Run normally to verify the checked-in input/output against water.json.
 * Run with --write to regenerate ONLY water-score-input.json/output.json.
 * This small adapter deliberately supports this fixture's one record per variant;
 * it is not the production claim-normalization implementation.
 */
import { strict as assert } from 'assert';
import { readFileSync, writeFileSync } from 'fs';
import { assessDataset, defaultRules } from './score-bands.mjs';

const readJson = url => JSON.parse(readFileSync(url, 'utf8'));
const clone = value => JSON.parse(JSON.stringify(value));
const unique = values => [...new Set(values)];
const sourceUrl = new URL('../examples/water.json', import.meta.url);
const inputUrl = new URL('../examples/water-score-input.json', import.meta.url);
const outputUrl = new URL('../examples/water-score-output.json', import.meta.url);
const source = readJson(sourceUrl);
assert.equal(source.example_status, 'entirely_synthetic_not_country_evidence');
assert.equal(source.method_version, defaultRules.version);

const records = new Map(source.records.map(record => [record.id, record]));
const evidence = new Map(source.evidence.map(item => [item.id, item]));
assert.equal(records.size, source.records.length, 'Duplicate record IDs');
assert.equal(evidence.size, source.evidence.length, 'Duplicate evidence IDs');
const owners = new Map();
for (const claim of source.claims) {
  for (const recordId of claim.member_record_ids) {
    assert(records.has(recordId), `Unresolved record ${recordId}`);
    assert(!owners.has(recordId), `Duplicate core-record owner ${recordId}`);
    owners.set(recordId, claim.id);
  }
}
assert.equal(owners.size, records.size, 'All source records need exactly one core claim');
for (const record of records.values()) {
  for (const id of record.evidence_ids) {
    const item = evidence.get(id);
    assert(item, `Unresolved evidence ${id}`);
    assert.equal(item.document_id, record.document_id, 'Record evidence belongs to another document');
    assert.equal(item.automatic_state, 'passed', 'Fixture expects source-checked example records');
  }
  for (const fact of record.facts) {
    const quotations = fact.evidence_ids.map(id => evidence.get(id).quote).join('\n');
    assert(quotations.includes(fact.value_as_stated), `Synthetic fact not in quoted evidence: ${record.id}`);
  }
}

function normalizeClaim(claim, documentIds) {
  const sourceVariants = claim.variants.length ? claim.variants : [{ id: `${claim.id}-base`, record_ids: claim.member_record_ids }];
  const variantRecordIds = sourceVariants.flatMap(item => item.record_ids);
  assert.equal(unique(variantRecordIds).length, variantRecordIds.length, 'Fixture record appears in multiple variants');
  assert.deepEqual([...variantRecordIds].sort(), [...claim.member_record_ids].sort(), 'Variant membership differs from core membership');
  const variants = [];
  for (const original of sourceVariants) {
    assert.equal(original.record_ids.length, 1, 'This fixture adapter supports one record per variant only');
    const record = records.get(original.record_ids[0]);
    if (!documentIds.includes(record.document_id)) continue;
    const conditionalities = unique(record.facts.map(fact => fact.conditionality));
    assert.equal(conditionalities.length, 1, 'Fixture needs one consistent conditionality per assertion');
    const admittedEvidenceIds = unique([
      ...record.evidence_ids,
      ...Object.values(record.delivery).flatMap(detail => detail ? detail.evidence_ids : [])
    ]);
    for (const id of admittedEvidenceIds) assert(documentIds.includes(evidence.get(id).document_id), 'Evidence outside requested snapshot');
    variants.push({
      variant_id: original.id,
      policy_object_id: record.policy_object_id,
      statement_type: record.statement_type,
      conditionality: conditionalities[0],
      evidence_ids: admittedEvidenceIds,
      details: clone(record.delivery)
    });
  }
  return variants.length ? { claim_id: claim.id, topic_ids: [claim.primary_topic_id], variants } : null;
}

function normalizeScope(kind, documentIds) {
  return {
    scope: { kind, document_ids: documentIds, source_profile_complete: true },
    profile: { profile_id: 'synthetic-water-example-AGR-01-v3', topic_ids: [source.topic_view.topic_id] },
    evidence: source.evidence.filter(item => documentIds.includes(item.document_id)).map(item => ({ evidence_id: item.id, document_id: item.document_id })),
    claims: source.claims.map(claim => normalizeClaim(claim, documentIds)).filter(Boolean),
    topics: [{ topic_id: source.topic_view.topic_id, home_domain_id: source.topic_view.home_scoring_domain, processing_complete: source.topic_view.processing_complete }]
  };
}

const inputs = {
  version: defaultRules.version,
  status: 'review_not_active',
  example_status: 'synthetic_reference_inputs_not_country_results',
  source_file: 'water.json',
  combined_source_profile: 'supplied_all',
  note: 'Combined example includes both NAP editions as an exploratory supplied-all inventory, not the matched current NDC/NAP corpus. The one-topic demonstration is not a full Agriculture-domain or national assessment. Production semantic checks are not implemented by this fixture adapter.',
  combined: normalizeScope('country', source.documents.map(item => item.id)),
  documents: source.document_views.map(view => ({ document_id: view.document_id, input: normalizeScope('document', [view.document_id]) }))
};
const outputs = {
  version: defaultRules.version,
  status: 'review_not_active',
  example_status: 'synthetic_reference_outputs_not_country_results',
  source_file: 'water-score-input.json',
  combined_source_profile: 'supplied_all',
  note: 'Calculated deterministically with score-bands.mjs. Combined results are exploratory supplied-all documentation, including both NAP editions, in a synthetic one-topic profile. No source PDFs or LLM output were evaluated.',
  combined: assessDataset(inputs.combined),
  documents: inputs.documents.map(view => ({ document_id: view.document_id, assessment: assessDataset(view.input) }))
};

assert.equal(outputs.combined.topics[0].band, 3);
assert.equal(outputs.combined.topics[0].band, source.topic_view.documentation_band.code);
assert.equal(outputs.combined.topics[0].response_claim_count, 2);
assert.equal(outputs.combined.topics[0].detail_ready_claim_count, 1);
assert.deepEqual([
  outputs.combined.national.metrics.response.lower_percent,
  outputs.combined.national.metrics.delivery_details.lower_percent,
  outputs.combined.national.metrics.implementation_reported.lower_percent
], [100, 100, 0], 'One-topic demonstration percentages must remain separate');
const assessedClaims = new Map(outputs.combined.claims.map(claim => [claim.claim_id, claim]));
assert.deepEqual(source.claims.map(claim => assessedClaims.get(claim.id).lower_band), [2, 1, 3]);
for (const original of source.claims) {
  const assessed = assessedClaims.get(original.id);
  assert.equal(assessed.lower_band, original.documentation_band.code);
  assert.equal(assessed.upper_band, original.documentation_band.possible_upper);
  assert.equal(original.documentation_band.rule_version, defaultRules.version);
}
assert.deepEqual(assessedClaims.get('C1').variants.map(item => item.variant_id), ['V1', 'V2']);
assert(assessedClaims.get('C1').variants.every(item => !item.checks.actor.qualified), 'Target must not borrow its supporting project actor');
assert(assessedClaims.get('C1').variants.every(item => item.stage === 'Commitment'));
assert.equal(assessedClaims.get('C2').variants[0].stage, null, 'Existing capacity must not become implementation');
assert.equal(assessedClaims.get('C3').variants[0].stage, 'Planned');
assert.equal(source.claims.find(claim => claim.id === 'C1').resolved_value, null, 'Target conflict must remain unresolved');
assert.equal(source.relationships.find(item => item.id === 'L1').type, 'contradicts');

const stages = { 1: 'Commitment', 2: 'Planned', 3: 'Underway', 4: 'Delivered' };
for (const view of outputs.documents) {
  const expected = source.document_views.find(item => item.document_id === view.document_id);
  assert.equal(view.assessment.topics[0].band, expected['AGR-01_band'].code);
  assert.deepEqual(view.assessment.scope.document_ids, [view.document_id]);
  const scopedInput = inputs.documents.find(item => item.document_id === view.document_id).input;
  assert(scopedInput.evidence.every(item => item.document_id === view.document_id), 'Document evidence leaked across editions');
  assert.deepEqual(view.assessment.claims.map(item => item.claim_id).sort(), expected.claims.map(item => item.claim_id).sort());
  for (const claim of view.assessment.claims) {
    const expectedClaim = expected.claims.find(item => item.claim_id === claim.claim_id);
    const expectedStage = expectedClaim.response_stage === null ? null : stages[expectedClaim.response_stage];
    assert(claim.variants.every(item => item.stage === expectedStage), 'Later response stage leaked into a document view');
  }
}
const ndc = outputs.documents.find(item => item.document_id === 'XEX-NDC1').assessment;
assert.deepEqual(ndc.claims[0].variants.map(item => item.variant_id), ['V1']);
assert.equal(ndc.claims[0].variants[0].checks.actor.qualified, false);
assert.equal(ndc.topics[0].detail_ready_claim_count, 0);
assert.deepEqual(outputs.documents.map(view => view.assessment.topics[0].band), [2, 1, 3]);

assert(process.argv.slice(2).every(argument => argument === '--write'), 'Only --write is supported');
if (process.argv.includes('--write')) {
  writeFileSync(inputUrl, `${JSON.stringify(inputs, null, 2)}\n`, 'utf8');
  writeFileSync(outputUrl, `${JSON.stringify(outputs, null, 2)}\n`, 'utf8');
}
assert.deepEqual(readJson(inputUrl), inputs, 'Saved input differs: run check-water.mjs --write after an intentional fixture change');
assert.deepEqual(readJson(outputUrl), outputs, 'Saved output differs: run check-water.mjs --write after an intentional rule change');
process.stdout.write('Water example verified: combined band 3; NDC 2025 band 2; NAP 2024 band 1; NAP 2026 band 3.\n');
process.stdout.write('Claims: target 2, capacity 1, planned canal action 3. Conflict retained; document evidence and stages do not leak.\n');
process.stdout.write('One-topic demonstration coverage: response 100%, delivery details 100%, implementation reported 0%; not a national policy-quality score.\n');
process.stdout.write('No LLM calls, real PDF validation, application integration or national assessment performed.\n');
