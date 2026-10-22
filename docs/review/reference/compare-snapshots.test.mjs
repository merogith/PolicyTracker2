import { strict as assert } from 'assert';
import { assessDataset } from './score-bands.mjs';
import { compareSnapshots } from './compare-snapshots.mjs';

const clone = value => JSON.parse(JSON.stringify(value));
let count = 0;
function test(name, run) { run(); count += 1; process.stdout.write(`ok ${count} - ${name}\n`); }

function snapshot(year, responseCount) {
  const docId = `NDC-${year}`;
  const topicIds = ['T-1', 'T-2', 'T-3', 'T-4'];
  const input = {
    scope: { kind: 'country', document_ids: [docId], source_profile_complete: true },
    profile: { profile_id: 'shared-topics', topic_ids: topicIds },
    evidence: [{ evidence_id: 'E-1', document_id: docId }],
    claims: topicIds.slice(0, responseCount).map((id, index) => ({
      claim_id: `C-${index}`, topic_ids: [id], variants: [{
        variant_id: `V-${index}`, policy_object_id: `P-${index}`, statement_type: 'commitment', conditionality: 'not_stated', evidence_ids: ['E-1'], details: { actor: null, timeframe: null, deliverable: null }
      }]
    })),
    topics: topicIds.map(id => ({ topic_id: id, home_domain_id: 'water', processing_complete: true }))
  };
  return {
    snapshot_id: `S-${year}`, country_id: 'XEX', cutoff_date: `${year}-12-31`, ingested_at: `${year}-12-31T12:00:00Z`,
    basis: { method_signature: 'same-frozen-method', taxonomy_version: '3.0.0', scoring_version: '3.0.0', topic_profile_id: 'shared-topics', topic_profile_version: '3.0.0', source_profile_id: 'ndc_only', source_profile_version: '3.0.0', source_role_coverage_signature: 'NDC-one-national-family', source_date_rule: 'latest_eligible_edition_as_of_cutoff' },
    source_profile_complete: true,
    source_manifest: [{ document_id: docId, family_id: 'XEX-NDC', role: 'NDC', edition_date: `${year}-06-01` }],
    assessment: assessDataset(input)
  };
}

const update = { kind: 'same_family_edition_update' };
test('a matched new edition shows percentage-point documentation change', () => {
  const result = compareSnapshots(snapshot(2024, 1), snapshot(2025, 3), update);
  assert.equal(result.arrow, 'up'); assert.equal(result.delta_percentage_points, 50);
  assert(result.interpretation.includes('not policy adequacy'));
});
test('decreased documentation is a neutral downward change, not inferred withdrawal', () => {
  const result = compareSnapshots(snapshot(2024, 3), snapshot(2025, 1), update);
  assert.equal(result.arrow, 'down'); assert.equal(result.delta_percentage_points, -50);
  assert(result.source_selection_note.includes('does not establish withdrawal'));
});
test('unchanged exact coverage can be labelled unchanged', () => {
  assert.equal(compareSnapshots(snapshot(2024, 2), snapshot(2025, 2), update).arrow, 'unchanged');
});
test('ordinary uploads, backfill and recalculation never create an improvement arrow', () => {
  for (const kind of ['ordinary_upload', 'source_backfill', 'method_change', 'profile_change', 'recalculation', 'source_removed', 'unknown']) {
    const result = compareSnapshots(snapshot(2024, 1), snapshot(2025, 3), { kind });
    assert.equal(result.arrow, null); assert.equal(result.status, 'refresh');
  }
});
test('changed method requires both snapshots to be recomputed before comparison', () => {
  const current = snapshot(2025, 3); current.basis.method_signature = 'new-method';
  assert.equal(compareSnapshots(snapshot(2024, 1), current, update).status, 'refresh');
});
test('profile identifiers cannot hide a changed topic denominator or home', () => {
  const current = snapshot(2025, 3); current.assessment.topics[0].home_domain_id = 'different-home';
  assert.equal(compareSnapshots(snapshot(2024, 1), current, update).status, 'refresh');
});
test('missing required source-role coverage suppresses the arrow', () => {
  const current = snapshot(2025, 3); current.source_profile_complete = false;
  assert.equal(compareSnapshots(snapshot(2024, 1), current, update).arrow, null);
});
test('partial processing suppresses even an exact already-positive coverage delta', () => {
  const current = snapshot(2025, 3); current.assessment.topics[0].processing_complete = false;
  const result = compareSnapshots(snapshot(2024, 1), current, update);
  assert.equal(result.arrow, null); assert.equal(result.delta_percentage_points, null);
});
test('specialist interval is optional and does not restore a point arrow', () => {
  const current = snapshot(2025, 3);
  current.assessment.topics[3].processing_complete = false;
  current.assessment.national.metrics.response = { P: 3, A: 0, U: 1, N: 4, lower_percent: 75, upper_percent: 100, exact: false };
  const result = compareSnapshots(snapshot(2024, 1), current, update, { specialist_intervals: true });
  assert.equal(result.arrow, null); assert.deepEqual(result.possible_delta_percentage_points, [50, 75]);
});
test('an edition predating the previous cutoff is backfill despite a misleading event label', () => {
  const current = snapshot(2025, 3); current.source_manifest[0].edition_date = '2024-10-01';
  const result = compareSnapshots(snapshot(2024, 1), current, update);
  assert.equal(result.status, 'refresh'); assert(result.reason.includes('backfill'));
});
test('a changed source family is a refresh rather than a same-family trend', () => {
  const current = snapshot(2025, 3); current.source_manifest[0].family_id = 'different-family';
  assert.equal(compareSnapshots(snapshot(2024, 1), current, update).status, 'refresh');
});
test('source manifests must match actual assessment source IDs', () => {
  const current = snapshot(2025, 3); current.source_manifest[0].document_id = 'wrong-file';
  assert.equal(compareSnapshots(snapshot(2024, 1), current, update).status, 'unavailable');
});
test('source editions after the cutoff cannot contribute to an arrow', () => {
  const current = snapshot(2025, 3); current.source_manifest[0].edition_date = '2026-01-01';
  assert.equal(compareSnapshots(snapshot(2024, 1), current, update).status, 'unavailable');
});
test('supplied-all inventory remains exploratory', () => {
  const previous = snapshot(2024, 1), current = snapshot(2025, 3);
  for (const item of [previous, current]) item.basis.source_profile_id = 'supplied_all';
  assert.equal(compareSnapshots(previous, current, update).status, 'refresh');
});
test('roles cannot be silently substituted within a matched source profile', () => {
  const current = snapshot(2025, 3); current.source_manifest[0].role = 'NAP';
  assert.equal(compareSnapshots(snapshot(2024, 1), current, update).status, 'unavailable');
});
test('different countries are not time snapshots of one another', () => {
  const current = snapshot(2025, 3); current.country_id = 'OTHER';
  assert.equal(compareSnapshots(snapshot(2024, 1), current, update).status, 'unavailable');
});
test('delivery and implementation metrics compare independently', () => {
  const previous = snapshot(2024, 1), current = snapshot(2025, 3);
  assert.equal(compareSnapshots(previous, current, update, { metric: 'delivery_details' }).delta_percentage_points, 0);
  assert.equal(compareSnapshots(previous, current, update, { metric: 'implementation_reported' }).delta_percentage_points, 0);
});
test('invalid comparison input fails closed', () => {
  for (const invalid of [null, undefined, {}]) assert.equal(compareSnapshots(invalid, snapshot(2025, 3), update).status, 'unavailable');
  assert.equal(compareSnapshots(snapshot(2024, 1), snapshot(2025, 3), update, { metric: 'policy_quality' }).status, 'unavailable');
});
test('invalid percentage arithmetic cannot fabricate an exact arrow', () => {
  const current = snapshot(2025, 3);
  current.assessment.national.metrics.response.lower_percent = 100;
  current.assessment.national.metrics.response.upper_percent = 100;
  assert.equal(compareSnapshots(snapshot(2024, 1), current, update).status, 'unavailable');
});
test('invalid calendar dates are rejected instead of rolled into another month', () => {
  const current = snapshot(2025, 3);
  current.source_manifest[0].edition_date = '2025-02-30';
  assert.equal(compareSnapshots(snapshot(2024, 1), current, update).status, 'unavailable');
});
process.stdout.write(`\n${count} documentation-change comparison cases passed. No factual source validation or policy-performance inference.\n`);
