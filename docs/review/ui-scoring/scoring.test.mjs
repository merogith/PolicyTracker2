import { strict as assert } from 'assert';
import { readFileSync } from 'fs';
import { calculate, calculateSafely, compareSnapshots, levelFor, rules, defaultTaxonomy } from './scoring.mjs';

const copy = value => JSON.parse(JSON.stringify(value));
const taxonomy = { domains: [{ id: 'd1', label: 'First' }, { id: 'd2', label: 'Second' }], topics: [
  { id: 'T1', label: 'One', home_domain_id: 'd1' }, { id: 'T2', label: 'Two', home_domain_id: 'd1' }, { id: 'T3', label: 'Three', home_domain_id: 'd2' }
] };
const basis = Object.fromEntries(rules.comparison.required_basis_fields.map(field => [field, field === 'source_profile_id' ? 'ndc_nap' : 'test-1']));
function input() {
  return { snapshot_id: 'now', country_id: 'TEST', scope_label: 'Synthetic test', source_profile_complete: true, cutoff_date: '2026-09-01', basis: copy(basis),
    documents: [{ id: 'D1', title: 'Synthetic source', role: 'NDC', family_id: 'NDC-family', edition_date: '2026-06-01' }],
    topics: taxonomy.topics.map(topic => ({ id: topic.id, processing_complete: true })), claims: [] };
}
function claim(points = 4, id = 'C1', topic = 'T1', type = 'planned_action') {
  const object = `${id}-object`, evidence = `${id}-R`;
  const detail = (text, enumValue) => ({ text, policy_object_id: object, evidence_ids: [evidence], ...enumValue });
  return { id, title: 'Synthetic response', primary_topic_id: topic, secondary_topic_ids: [], conditionality: 'not_stated', stage: 'planned',
    source_records: [{ id: evidence, document_id: 'D1', quote: 'The Ministry will rehabilitate 30 km of canals by 2030.' }],
    variants: [{ id: `${id}-V`, policy_object_id: object, statement_type: type, evidence_ids: [evidence], details: {
      actor: points >= 4 ? detail('Ministry', { role: 'responsible' }) : null,
      timeframe: points >= 3 ? detail('by 2030', { anchor: 'action' }) : null,
      deliverable: points >= 2 ? detail('30 km canals', { kind: 'quantified_output' }) : null
    } }], topic_projections: [], conflicts: [], related_context_ids: [] };
}
const assess = data => calculate(data, taxonomy);
const tests = [];
const test = (name, run) => tests.push({ name, run });

test('Response checklist yields exactly 1–4 points; context remains unscored', () => {
  for (const points of [1, 2, 3, 4]) {
    const data = input(); data.claims = [claim(points)]; const result = assess(data);
    assert.equal(result.claims[0].points, points); assert.equal(result.topics[0].score, points * 25);
  }
  for (const type of rules.claim.context_types) {
    const data = input(); data.claims = [claim(4, 'context', 'T1', type)]; const result = assess(data);
    assert.equal(result.claims[0].points, null); assert.equal(result.topics[0].score, 0); assert.equal(result.national.counts.context_claims, 1);
  }
});
test('Publication dates, support-only actors and generic actions earn no detail point', () => {
  const data = input(); const c = claim();
  c.variants[0].details.actor.role = 'supporting'; c.variants[0].details.timeframe.anchor = 'publication'; c.variants[0].details.deliverable.kind = 'generic_action';
  data.claims = [c]; assert.equal(assess(data).claims[0].points, 1);
});
test('Conditionality and reported implementation do not alter the specification rubric', () => {
  const data = input(); const c = claim(3); c.conditionality = 'conditional'; c.stage = 'delivered'; c.variants[0].statement_type = 'output_delivered';
  data.claims = [c]; assert.equal(assess(data).claims[0].points, 3);
});
test('Actor/time/output evidence cannot be borrowed from a different policy object', () => {
  const data = input(); data.claims = [claim()]; data.claims[0].variants[0].details.actor.policy_object_id = 'other-action';
  assert.throws(() => assess(data), /Cannot borrow/);
});
test('Malformed false or missing detail never turns into a valid zero', () => {
  const data = input(); data.claims = [claim()]; data.claims[0].variants[0].details.actor = false;
  const result = calculateSafely(data, taxonomy); assert.equal(result.status, 'unavailable'); assert.equal(result.assessment, null);
  data.claims[0].variants[0].details.actor = null; delete data.claims[0].variants[0].details.timeframe;
  assert.throws(() => assess(data), /Missing explicit/);
});
test('Context can have no policy object; responses require one', () => {
  const data = input(); const c = claim(1, 'context-no-object', 'T1', 'concern'); c.variants[0].policy_object_id = null; data.claims = [c];
  assert.equal(assess(data).claims[0].points, null); assert.equal(assess(data).topics[0].score, 0);
  c.variants[0].statement_type = 'planned_action'; assert.throws(() => assess(data), /policy_object_id/);
});
test('Unsupported custom check weights fail rather than silently keeping old arithmetic', () => {
  const original = rules.claim.points.who;
  try { rules.claim.points.who = 2; assert.throws(() => assess(input()), /four equal one-point/); }
  finally { rules.claim.points.who = original; }
  assert.equal(assess(input()).national.score, 0);
});
test('Stable IDs deduplicate exact repeated claims; contradictory duplicate IDs fail', () => {
  const data = input(); data.claims = [claim(), claim()]; assert.equal(assess(data).national.counts.total_claims, 1);
  data.claims[1].title = 'Different identity'; assert.throws(() => assess(data), /Conflicting duplicate/);
});
test('One atomic source record cannot be counted as two owned claims', () => {
  const data = input(); const first = claim(), second = copy(first); second.id = 'C2';
  data.claims = [first, second]; assert.throws(() => assess(data), /owned by two/);
});
test('Unresolved numeric target values keep equal qualification and one claim count', () => {
  const data = input(); const c = claim(3), variant = copy(c.variants[0]); variant.id = 'alternative'; variant.details.deliverable.text = '80,000 instead of 100,000 hectares';
  c.variants.push(variant); c.conflicts = [{ description: 'Conflicting values', source_record_ids: ['C1-R'] }]; data.claims = [c];
  const result = assess(data); assert.equal(result.topics[0].score, 75); assert.equal(result.national.counts.total_claims, 1); assert.equal(result.claims[0].conflicts.length, 1);
});
test('Unresolved detail qualification yields gray, not the best alternative', () => {
  const data = input(); const c = claim(), variant = copy(c.variants[0]); variant.id = 'alternative'; variant.details.actor.role = 'supporting'; c.variants.push(variant); data.claims = [c];
  const result = assess(data); assert.equal(result.topics[0].score, null); assert.equal(result.topics[0].color, 'gray'); assert.equal(result.claims[0].points, null);
  assert.deepEqual(result.topics[0].qualification_range, { lower: 75, upper: 100 }); assert.equal(result.national.score, null);
});
test('Partial inventory shows observed mean only as detail and uses broad aggregate bounds', () => {
  const data = input(); data.claims = [claim()]; data.topics[0].processing_complete = false;
  const result = assess(data); assert.equal(result.topics[0].score, null); assert.equal(result.topics[0].provisional_observed_mean, 100);
  assert.deepEqual(result.topics[0].bounds, { lower: 0, upper: 100 }); assert.deepEqual(result.national.bounds, { lower: 0, upper: 100 / 3 });
});
test('Missing required profile role makes scores unavailable while preserving extracted claims', () => {
  const data = input(); data.source_profile_complete = false; data.claims = [claim()];
  const result = assess(data); assert.equal(result.claims[0].points, 4); assert(result.topics.every(topic => topic.score === null)); assert.deepEqual(result.national.bounds, { lower: 0, upper: 100 });
});
test('Complete topic with no response is zero; no source at all is unavailable', () => {
  const data = input(); assert.equal(assess(data).national.score, 0); data.documents = [];
  assert.equal(calculateSafely(data, taxonomy).status, 'unavailable');
});
test('Distinct response mean uses 100 and 25 to produce 62.5, not max or point total', () => {
  const data = input(); data.claims = [claim(4, 'detailed'), claim(1, 'broad')]; const result = assess(data);
  assert.equal(result.topics[0].score, 62.5); assert.equal(result.topics[0].total_points, 5); assert.equal(result.topics[0].counts.response_claims, 2);
});
test('Domain fixed-home mean includes zeros; national mean uses unique topics, not mean of domains', () => {
  const data = input(); data.claims = [claim(4, 'one', 'T1'), claim(4, 'three', 'T3')]; const result = assess(data);
  assert.equal(result.domains[0].score, 50); assert.equal(result.domains[1].score, 100); assert.equal(result.national.score, 200 / 3); assert.notEqual(result.national.score, 75);
});
test('Secondary context cannot inherit the primary response score from a tag', () => {
  const data = input(); const c = claim(); c.secondary_topic_ids = ['T2'];
  assert.throws(() => assess({ ...data, claims: [c] }), /explicit projection/);
  c.topic_projections = [{ topic_id: 'T2', variants: c.variants.map(v => ({ ...copy(v), statement_type: 'context', details: { actor: null, timeframe: null, deliverable: null } })) }];
  data.claims = [c]; const result = assess(data); assert.equal(result.topics[1].score, 0); assert.equal(result.topics[1].counts.related_claims, 1); assert.equal(result.topics[1].counts.total_claims, 0);
});
test('Explicit secondary response projection scores its topic without duplicating owned totals', () => {
  const data = input(); const c = claim(); c.secondary_topic_ids = ['T2']; c.topic_projections = [{ topic_id: 'T2', variants: copy(c.variants) }]; data.claims = [c];
  const result = assess(data); assert.equal(result.topics[1].score, 100); assert.equal(result.national.counts.total_claims, 1); assert.equal(result.domains[0].counts.total_claims, 1); assert.equal(result.topics[1].scoring_response_count, 1);
  c.topic_projections[0].variants[0].details.actor.text = 'Invented actor'; assert.throws(() => assess(data), /cannot invent/);
});
test('Evidence IDs and selected source scope must resolve before scoring', () => {
  const data = input(); data.claims = [claim()]; data.claims[0].variants[0].details.actor.evidence_ids = ['unadmitted']; assert.throws(() => assess(data), /not admitted/);
  data.claims[0] = claim(); data.claims[0].source_records[0].document_id = 'another-source'; assert.throws(() => assess(data), /outside the selected scope/);
});
test('Unknown statement types and missing profile topics fail closed', () => {
  const data = input(); data.claims = [claim(4, 'x', 'T1', 'unknown_response')]; assert.equal(calculateSafely(data, taxonomy).status, 'unavailable');
  data.claims = []; data.topics.pop(); assert.throws(() => assess(data), /complete fixed topic profile/);
});
test('Shared colors have exact and stable numeric boundaries', () => {
  [[0, 'red'], [24.99, 'red'], [25, 'orange'], [49.99, 'orange'], [50, 'amber'], [74.99, 'amber'], [75, 'green'], [100, 'green'], [null, 'gray']].forEach(([score, color]) => assert.equal(levelFor(score).color, color));
});
const bundle = JSON.parse(readFileSync(new URL('./examples.json', import.meta.url), 'utf8'));
test('Water example and document-local results keep independent sources and counts', () => {
  const country = bundle.countries[0], topic = country.current.topics.find(t => t.id === 'AGR-01');
  assert.equal(topic.score, 87.5); assert.equal(topic.counts.total_claims, 3); assert.equal(topic.counts.response_claims, 2); assert.equal(topic.counts.context_claims, 1); assert.equal(topic.total_points, 7);
  assert.deepEqual(country.documents.map(d => d.assessment.topics.find(t => t.id === 'AGR-01').score), [75, 87.5, 0]);
  assert.equal(country.documents[0].assessment.claims.find(c => c.id === 'SYN-A-water-target').checks.who, false);
});
function comparablePair() {
  const old = input(), now = input(); old.snapshot_id = 'before'; old.cutoff_date = '2024-12-31'; old.documents[0].edition_date = '2024-06-01'; old.documents[0].id = 'D0';
  old.claims = [claim(1)]; old.claims[0].source_records[0].document_id = 'D0'; now.claims = [claim(4)];
  return [assess(old), assess(now)];
}
test('New matched editions can show up, unchanged and down documentation arrows', () => {
  const [old, now] = comparablePair(); const event = { kind: 'same_family_edition_update' };
  const result = compareSnapshots(old, now, event); assert(result.eligible); assert.equal(result.symbol, '↑'); assert.equal(result.topics[1].symbol, '→');
  const lower = copy(now); lower.national.score = 0; lower.topics[0].score = 0; lower.domains[0].score = 0;
  assert.equal(compareSnapshots(old, lower, event).symbol, '↓');
});
test('Backfill, changed method, exploratory profile, partial scope and invalid dates suppress arrows', () => {
  const [old, now] = comparablePair(); const event = { kind: 'same_family_edition_update' };
  assert.equal(compareSnapshots(old, now).eligible, false);
  for (const mutate of [x => { x.basis.method_version = 'new'; }, x => { x.national.status = 'partial'; }, x => { x.documents[0].edition_date = '2024-07-01'; }, x => { x.documents[0].edition_date = '2026-02-30'; }, x => { x.basis.source_profile_id = 'supplied_all'; }]) {
    const changed = copy(now); mutate(changed); assert.equal(compareSnapshots(old, changed, event).eligible, false);
  }
});
test('All saved synthetic assessments recompute from inputs with the real 16/64 taxonomy', () => {
  assert.equal(defaultTaxonomy.domains.length, 16); assert.equal(defaultTaxonomy.topics.length, 64); assert.equal(bundle.countries.length, 3); assert.equal(bundle.inputs.length, 13);
  const outputs = bundle.countries.flatMap(country => [country.previous, country.current, ...country.documents.map(document => document.assessment)]);
  bundle.inputs.forEach(data => {
    const expected = outputs.find(output => output.snapshot_id === data.snapshot_id), actual = calculate(data);
    assert.equal(actual.national.score, expected.national.score); assert.deepEqual(actual.topics.map(t => [t.id, t.score, t.counts]), expected.topics.map(t => [t.id, t.score, t.counts]));
  });
});

let passed = 0;
for (const item of tests) {
  try { item.run(); passed += 1; process.stdout.write(`PASS ${item.name}\n`); }
  catch (error) { process.stderr.write(`FAIL ${item.name}\n${error.stack}\n`); process.exitCode = 1; }
}
process.stdout.write(`${passed}/${tests.length} tests passed\n`);
