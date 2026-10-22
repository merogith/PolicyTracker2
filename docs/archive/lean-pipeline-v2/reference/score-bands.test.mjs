import { strict as assert } from 'assert';
import { readFileSync } from 'fs';
import { assessDataset, assessDatasetSafely } from './score-bands.mjs';

const fixtures = JSON.parse(readFileSync(new URL('../examples/band-cases.json', import.meta.url), 'utf8'));
const clone = value => JSON.parse(JSON.stringify(value));
const input = id => clone(fixtures.cases.find(item => item.id === id).input);
const variant = data => data.claims[0].variants[0];
const topic = data => assessDataset(data).topics[0];
let count = 0;
function test(name, run) {
  run();
  count += 1;
  process.stdout.write(`ok ${count} - ${name}\n`);
}

for (const fixture of fixtures.cases) test(fixture.id, () => {
  const result = topic(fixture.input);
  for (const [key, expected] of Object.entries(fixture.expected)) assert.equal(result[key], expected, key);
});

test('an unadopted proposal does not become a response even when detailed', () => {
  const data = input('delivery_details');
  variant(data).statement_type = 'proposal';
  assert.equal(topic(data).band, 1);
});

test('publication date cannot supply the action timeframe', () => {
  const data = input('delivery_details');
  variant(data).details.timeframe.anchor = 'publication';
  assert.equal(topic(data).band, 2);
});

test('generic action wording cannot supply a verifiable deliverable', () => {
  const data = input('delivery_details');
  variant(data).details.deliverable = { ...variant(data).details.deliverable, text: 'Rehabilitate irrigation canals', kind: 'generic_action' };
  assert.equal(topic(data).band, 2);
});

test('a qualitative named legal instrument can qualify without an invented number', () => {
  const data = input('delivery_details');
  variant(data).details.deliverable = { ...variant(data).details.deliverable, text: 'Adopt the National Drought Management Regulation', kind: 'named_legal_instrument' };
  assert.equal(topic(data).band, 3);
});

test('other valid actor roles do not establish delivery accountability', () => {
  const data = input('delivery_details');
  for (const role of ['financing', 'supporting', 'monitoring_reporting', 'consulted', 'unspecified']) {
    variant(data).details.actor.role = role;
    assert.equal(topic(data).band, 2);
  }
});

test('details belonging to another policy object cannot upgrade the response', () => {
  const data = input('delivery_details');
  variant(data).details.actor.policy_object_id = 'P-unrelated-support-action';
  const output = assessDataset(data);
  assert.equal(output.topics[0].band, 2);
  assert.equal(output.claims[0].variants[0].checks.actor.qualified, false);
});

test('compatible details for the same object can be sourced across documents', () => {
  const data = input('delivery_details');
  data.scope = { kind: 'country', document_ids: ['D-1', 'D-2'] };
  data.evidence.push({ evidence_id: 'E-2', document_id: 'D-2' });
  variant(data).evidence_ids.push('E-2');
  variant(data).details.actor.evidence_ids = ['E-2'];
  assert.equal(topic(data).band, 3);
});

test('conflicting target values do not remove identical documentation qualifications', () => {
  const data = input('delivery_details');
  const alternative = clone(variant(data));
  alternative.variant_id = 'V-action-alternative';
  alternative.details.deliverable.text = 'Rehabilitate 20 km of irrigation canals';
  data.claims[0].variants.push(alternative);
  const output = assessDataset(data);
  assert.equal(output.topics[0].band, 3);
  assert.equal(output.claims[0].details_vary, false);
  // Relationship/conflict metadata is retained upstream, not resolved by this calculator.
});

test('incompatible variants cannot donate missing details to one another', () => {
  const data = input('delivery_details');
  const alternative = clone(variant(data));
  alternative.variant_id = 'V-action-alternative';
  alternative.details.actor = null;
  variant(data).details.timeframe = null;
  data.claims[0].variants.push(alternative);
  assert.equal(topic(data).band, 2);
});

test('qualification disagreement uses the lower label and range, not the best variant', () => {
  const data = input('delivery_details');
  const alternative = clone(variant(data));
  alternative.variant_id = 'V-action-alternative';
  alternative.details.actor = null;
  data.claims[0].variants.push(alternative);
  const output = assessDataset(data);
  assert.deepEqual([output.topics[0].band, output.topics[0].upper_band], [2, 3]);
  assert.equal(output.topics[0].details_vary, true);
  assert.equal(output.topics[0].detail_ready_claim_count, 0);
});

test('repeated stable claim identity does not add count or score', () => {
  const data = input('delivery_details');
  data.claims.push(clone(data.claims[0]));
  const output = assessDataset(data);
  assert.equal(output.claims.length, 1);
  assert.equal(output.topics[0].response_claim_count, 1);
  assert.equal(output.domains[0].response_topic_count, 1);
});

test('a complete search with disputed response qualification remains undetermined', () => {
  const data = input('response_no_delivery_details');
  const alternative = clone(variant(data));
  alternative.variant_id = 'V-unadopted-alternative';
  alternative.statement_type = 'proposal';
  data.claims[0].variants.push(alternative);
  const output = assessDataset(data);
  assert.deepEqual([output.topics[0].band, output.topics[0].upper_band, output.topics[0].response_status], [1, 2, 'undetermined']);
  assert.deepEqual([output.domains[0].P, output.domains[0].A, output.domains[0].U, output.domains[0].processed_topics], [0, 0, 1, 1]);
  assert.deepEqual(output.domains[0].response_coverage, { lower_percent: 0, upper_percent: 100, exact: false });
});

test('different qualifying claims cannot add beyond the topic band', () => {
  const data = input('delivery_details');
  const second = clone(data.claims[0]);
  second.claim_id = 'C-distinct-action';
  second.variants[0].variant_id = 'V-distinct-action';
  second.variants[0].policy_object_id = 'P-distinct-action';
  data.evidence.push({ evidence_id: 'E-distinct-action', document_id: 'D-1' });
  second.variants[0].evidence_ids = ['E-distinct-action'];
  for (const detail of Object.values(second.variants[0].details)) {
    detail.policy_object_id = 'P-distinct-action';
    detail.evidence_ids = ['E-distinct-action'];
  }
  data.claims.push(second);
  const output = assessDataset(data);
  assert.equal(output.topics[0].band, 3);
  assert.equal(output.topics[0].response_claim_count, 2);
  assert.equal(output.domains[0].response_topic_count, 1);
});

test('six positive, two absent, two unknown topics yield 60-80 percent with fixed N', () => {
  const data = input('empty_complete');
  data.scope.kind = 'country';
  data.profile.topic_ids = Array.from({ length: 10 }, (_, i) => `T-${i + 1}`);
  data.topics = data.profile.topic_ids.map((id, i) => ({ topic_id: id, home_domain_id: 'synthetic-domain', processing_complete: i < 8 }));
  data.evidence = [{ evidence_id: 'E-1', document_id: 'D-1' }];
  data.claims = Array.from({ length: 6 }, (_, i) => {
    const claim = input('response_no_delivery_details').claims[0];
    claim.claim_id = `C-${i + 1}`;
    claim.topic_ids = [`T-${i + 1}`];
    claim.variants[0].variant_id = `V-${i + 1}`;
    return claim;
  });
  const output = assessDataset(data).domains[0];
  assert.deepEqual([output.P, output.A, output.U, output.total_topics, output.processed_topics], [6, 2, 2, 10, 8]);
  assert.deepEqual(output.response_coverage, { lower_percent: 60, upper_percent: 80, exact: false });
});

test('certified response survives other missing material while processing remains incomplete', () => {
  const data = input('response_no_delivery_details');
  data.topics[0].processing_complete = false;
  const output = assessDataset(data);
  assert.deepEqual([output.topics[0].band, output.topics[0].upper_band], [2, 3]);
  assert.deepEqual([output.domains[0].P, output.domains[0].U, output.domains[0].processed_topics], [1, 0, 0]);
  assert.equal(output.domains[0].response_coverage.exact, true);
});

test('a secondary topic can receive direct evidence but each topic has one home denominator', () => {
  const data = input('delivery_details');
  data.profile.topic_ids.push('WAT-01');
  data.topics.push({ topic_id: 'WAT-01', home_domain_id: 'water', processing_complete: true });
  data.claims[0].topic_ids.push('WAT-01');
  const output = assessDataset(data);
  assert.deepEqual(output.topics.map(item => item.band), [3, 3]);
  assert.deepEqual(output.domains.map(item => item.total_topics), [1, 1]);
});

test('later delivered assertion never changes an earlier document stage', () => {
  const early = input('response_no_delivery_details');
  const combined = clone(early);
  combined.scope = { kind: 'country', document_ids: ['D-1', 'D-2'] };
  combined.evidence.push({ evidence_id: 'E-2', document_id: 'D-2' });
  const later = clone(variant(combined));
  later.variant_id = 'V-delivered';
  later.statement_type = 'output_delivered';
  later.evidence_ids = ['E-2'];
  combined.claims[0].variants.push(later);
  assert.equal(assessDataset(early).claims[0].variants[0].stage, 'Commitment');
  assert.deepEqual(assessDataset(combined).claims[0].variants.map(item => item.stage), ['Commitment', 'Delivered']);
  assert.equal(assessDataset(early).claims[0].variants[0].stage, 'Commitment');
});

test('an evidence reference from a later document is rejected in a single-document snapshot', () => {
  const data = input('delivery_details');
  data.evidence.push({ evidence_id: 'E-2', document_id: 'D-2' });
  variant(data).details.actor.evidence_ids = ['E-2'];
  assert.throws(() => assessDataset(data), /outside snapshot scope/);
});

test('unresolved evidence IDs fail rather than awarding credit', () => {
  const data = input('delivery_details');
  variant(data).details.actor.evidence_ids = ['E-missing'];
  assert.throws(() => assessDataset(data), /unknown evidence_id/);
});

test('missing profile topics cannot silently shrink the denominator', () => {
  const data = input('delivery_details');
  data.profile.topic_ids.push('WAT-01');
  assert.throws(() => assessDataset(data), /must equal the fixed profile/);
});

test('result reporting alone does not infer an attributable policy response', () => {
  const data = input('context_only');
  variant(data).statement_type = 'result_reported';
  assert.equal(topic(data).band, 1);
});

test('a claim cannot group variants from different policy objects', () => {
  const data = input('response_no_delivery_details');
  const alternative = clone(variant(data));
  alternative.variant_id = 'V-unrelated';
  alternative.policy_object_id = 'P-unrelated';
  data.claims[0].variants.push(alternative);
  assert.throws(() => assessDataset(data), /different policy objects/);
});

test('the same variant cannot be owned by two distinct claims', () => {
  const data = input('response_no_delivery_details');
  const duplicate = clone(data.claims[0]);
  duplicate.claim_id = 'C-another-owner';
  data.claims.push(duplicate);
  assert.throws(() => assessDataset(data), /belongs to multiple claims/);
});

test('globally valid evidence cannot be borrowed from outside the coherent variant', () => {
  const data = input('delivery_details');
  data.evidence.push({ evidence_id: 'E-other-interpretation', document_id: 'D-1' });
  variant(data).details.actor.evidence_ids = ['E-other-interpretation'];
  assert.throws(() => assessDataset(data), /outside its coherent variant/);
});

test('processing_complete must be an explicit boolean, never a truthy string', () => {
  const data = input('empty_complete');
  for (const invalid of [undefined, null, 'false', 'true', 0, 1]) {
    data.topics[0].processing_complete = invalid;
    assert.equal(assessDatasetSafely(data).status, 'unavailable');
  }
});

test('unknown statement types and conditionality cannot silently become a band', () => {
  const badType = input('response_no_delivery_details');
  variant(badType).statement_type = 'unknown_response';
  assert.equal(assessDatasetSafely(badType).assessment, null);
  const badCondition = input('response_no_delivery_details');
  variant(badCondition).conditionality = 'unknown';
  assert.equal(assessDatasetSafely(badCondition).assessment, null);
});

test('missing scope and empty inputs return unavailable through the safe adapter', () => {
  for (const invalid of [undefined, null, {}, []]) {
    const result = assessDatasetSafely(invalid);
    assert.equal(result.status, 'unavailable');
    assert.equal(result.assessment, null);
  }
  const emptyScope = input('empty_complete');
  emptyScope.scope.document_ids = [];
  assert.equal(assessDatasetSafely(emptyScope).status, 'unavailable');
});

test('conflicting duplicate IDs are rejected rather than selecting the first', () => {
  const data = input('delivery_details');
  const duplicate = clone(data.claims[0]);
  duplicate.variants[0].details.actor = null;
  data.claims.push(duplicate);
  assert.equal(assessDatasetSafely(data).status, 'unavailable');
});

test('a response cannot omit its policy-object identity', () => {
  const data = input('response_no_delivery_details');
  variant(data).policy_object_id = null;
  assert.equal(assessDatasetSafely(data).status, 'unavailable');
});

test('delivery fields must explicitly use null for missing information', () => {
  const data = input('response_no_delivery_details');
  delete variant(data).details.actor;
  assert.equal(assessDatasetSafely(data).status, 'unavailable');
});

test('non-taxonomy actor roles and timeframe anchors are rejected', () => {
  const badRole = input('delivery_details');
  variant(badRole).details.actor.role = 'mentioned';
  assert.equal(assessDatasetSafely(badRole).status, 'unavailable');
  const badAnchor = input('delivery_details');
  variant(badAnchor).details.timeframe.anchor = 'context';
  assert.equal(assessDatasetSafely(badAnchor).status, 'unavailable');
});

process.stdout.write(`\n${count} reference scoring cases passed. No LLM or live application integration tested.\n`);
