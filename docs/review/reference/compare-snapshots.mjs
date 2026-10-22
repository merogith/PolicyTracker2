/** Review-only documentation-change comparison. Never a climate-performance trend. */
import { defaultRules, metricNames } from './score-bands.mjs';

const demand = (condition, message) => { if (!condition) throw new Error(message); };
const text = value => typeof value === 'string' && value.trim().length > 0;
const day = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const sorted = values => [...values].sort();
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const basisKeys = ['method_signature', 'taxonomy_version', 'scoring_version', 'topic_profile_id', 'topic_profile_version', 'source_profile_id', 'source_profile_version', 'source_role_coverage_signature', 'source_date_rule'];

function validateSnapshot(snapshot, rules) {
  demand(snapshot && text(snapshot.snapshot_id) && text(snapshot.country_id), 'Snapshot and country IDs required');
  demand(day(snapshot.cutoff_date) && text(snapshot.ingested_at) && !Number.isNaN(Date.parse(snapshot.ingested_at)), 'Separate cutoff_date and ingested_at required');
  demand(snapshot.basis && basisKeys.every(key => text(snapshot.basis[key])), 'Frozen comparison basis required');
  demand(typeof snapshot.source_profile_complete === 'boolean', 'source_profile_complete must be explicit');
  const assessment = snapshot.assessment;
  demand(assessment && assessment.scope.kind === 'country' && assessment.national, 'Country assessment required');
  demand(assessment.scope.source_profile_complete === snapshot.source_profile_complete, 'Snapshot and assessment source completeness disagree');
  demand(assessment.scoring_version === snapshot.basis.scoring_version, 'Assessment/rubric version mismatch');
  demand(assessment.profile.profile_id === snapshot.basis.topic_profile_id, 'Assessment/profile mismatch');
  const profile = rules.comparison.source_profiles[snapshot.basis.source_profile_id];
  demand(profile && profile.version === snapshot.basis.source_profile_version, 'Unknown source-profile version');
  demand(Array.isArray(snapshot.source_manifest) && snapshot.source_manifest.length > 0, 'Exact source manifest required');
  const families = new Map();
  for (const source of snapshot.source_manifest) {
    demand(text(source.family_id) && text(source.document_id) && text(source.role) && day(source.edition_date), 'Source family, ID, role and edition date required');
    demand(source.edition_date <= snapshot.cutoff_date, 'Source edition is after snapshot cutoff');
    demand(!families.has(source.family_id), 'Matched current-corpus manifest needs one selected edition per family');
    families.set(source.family_id, source);
  }
  demand(same(sorted(snapshot.source_manifest.map(source => source.document_id)), sorted(assessment.scope.document_ids)), 'Manifest does not match assessment source IDs');
  return { profile, families };
}

function selectedMetric(snapshot, metric, domainId) {
  const layer = domainId ? snapshot.assessment.domains.find(domain => domain.home_domain_id === domainId) : snapshot.assessment.national;
  demand(layer && layer.metrics && layer.metrics[metric], 'Requested metric/domain unavailable');
  const result = layer.metrics[metric];
  demand(Number.isFinite(result.lower_percent) && Number.isFinite(result.upper_percent) && result.lower_percent >= 0 && result.upper_percent <= 100 && result.lower_percent <= result.upper_percent, 'Invalid metric bounds');
  demand(['P', 'A', 'U', 'N'].every(key => Number.isInteger(result[key]) && result[key] >= 0) && result.N > 0 && result.P + result.A + result.U === result.N, 'Invalid metric counts');
  const expectedN = snapshot.assessment.topics.filter(topic => !domainId || topic.home_domain_id === domainId).length;
  demand(result.N === expectedN, 'Metric denominator differs from topic profile');
  demand(result.exact === (result.U === 0) && Math.abs(result.lower_percent - 100 * result.P / result.N) < 1e-9 && Math.abs(result.upper_percent - 100 * (result.P + result.U) / result.N) < 1e-9, 'Metric percentages/exact flag differ from their counts');
  return result;
}

/**
 * Both assessments must be recomputed on the same frozen method before calling.
 * Source-profile eligibility, canonical family identity and semantic assertions
 * remain upstream responsibilities; metadata assertions are not factual proof.
 */
export function compareSnapshots(previous, current, event, options = {}, rules = defaultRules) {
  const metric = options.metric || 'response';
  const noArrow = (status, reason, extra = {}) => ({ status, metric, arrow: null, delta_percentage_points: null, reason, ...extra });
  try {
    demand(metricNames.includes(metric), 'Unknown coverage metric');
    const oldInfo = validateSnapshot(previous, rules);
    const newInfo = validateSnapshot(current, rules);
    demand(previous.country_id === current.country_id, 'Different countries cannot form a time arrow');
    if (!basisKeys.every(key => previous.basis[key] === current.basis[key])) return noArrow('refresh', 'Method or comparison profile changed; recompute both snapshots on the same basis');
    if (!oldInfo.profile.matched_comparison || !newInfo.profile.matched_comparison) return noArrow('refresh', 'Exploratory supplied-document inventory has no comparison arrow');
    const topicHomes = snapshot => sorted(snapshot.assessment.topics.map(topic => `${topic.topic_id}:${topic.home_domain_id}`));
    if (!same(topicHomes(previous), topicHomes(current))) return noArrow('refresh', 'Topic denominator or scoring homes changed');
    if (!previous.source_profile_complete || !current.source_profile_complete) return noArrow('unavailable', 'Required source-role coverage is incomplete');
    const roles = info => sorted([...new Set([...info.families.values()].map(source => source.role))]);
    if (!same(roles(oldInfo), sorted(oldInfo.profile.required_roles)) || !same(roles(newInfo), sorted(newInfo.profile.required_roles))) return noArrow('unavailable', 'Manifest roles do not match the complete required source profile');
    if (!same(sorted([...oldInfo.families.keys()]), sorted([...newInfo.families.keys()]))) return noArrow('refresh', 'Source families changed; treat as a corpus refresh');
    if (!event || event.kind !== rules.change_arrows.eligible_event) return noArrow('refresh', 'Upload, backfill, recalculation or other corpus change is a refresh, not a policy-progress arrow');
    if (current.cutoff_date <= previous.cutoff_date) return noArrow('refresh', 'No later comparable cutoff; treat this as a refresh');
    let updatedFamilies = 0;
    for (const [familyId, oldSource] of oldInfo.families) {
      const newSource = newInfo.families.get(familyId);
      if (oldSource.role !== newSource.role) return noArrow('refresh', 'Source role changed within a family');
      if (oldSource.document_id !== newSource.document_id) {
        if (newSource.edition_date <= previous.cutoff_date || newSource.edition_date <= oldSource.edition_date) return noArrow('refresh', 'Newly ingested source predates the prior cutoff; this is backfill, not a new policy-edition comparison');
        updatedFamilies += 1;
      } else if (newSource.edition_date !== oldSource.edition_date) return noArrow('refresh', 'Edition metadata changed for an unchanged source ID');
    }
    if (!updatedFamilies) return noArrow('refresh', 'No new source edition; treat as a refresh');
    const before = selectedMetric(previous, metric, options.domain_id);
    const after = selectedMetric(current, metric, options.domain_id);
    const fullProcessing = [...previous.assessment.topics, ...current.assessment.topics].every(topic => topic.processing_complete === true);
    if (!fullProcessing || !before.exact || !after.exact) {
      const extra = options.specialist_intervals ? { possible_delta_percentage_points: [after.lower_percent - before.upper_percent, after.upper_percent - before.lower_percent], interval_meaning: 'Possible documentation-coverage difference; not a statistical confidence interval' } : {};
      return noArrow('unavailable', 'Incomplete processing or unresolved qualification; no point arrow', extra);
    }
    const delta = after.lower_percent - before.lower_percent;
    return {
      status: 'comparable', metric,
      arrow: delta > 0 ? 'up' : delta < 0 ? 'down' : 'unchanged',
      delta_percentage_points: delta,
      previous_percent: before.lower_percent,
      current_percent: after.lower_percent,
      label: `${rules.coverage_metrics[metric].label}: documented coverage ${delta > 0 ? '+' : ''}${Number(delta.toFixed(2))} percentage points`,
      interpretation: 'Change in documentation under a matched source profile; not policy adequacy, effectiveness or demonstrated real-world progress',
      source_selection_note: 'A newer selected edition does not establish withdrawal or supersession of older policy assertions'
    };
  } catch (error) {
    return noArrow('unavailable', `Invalid comparison input: ${error.message}`);
  }
}
