/**
 * v3 review reference calculator, NOT integrated into the application.
 * Input semantics and citations have already passed upstream automatic checks.
 * This module validates the small normalized contract and calculates bands.
 * It does not read PDFs, call an LLM, infer identity, or certify factual truth.
 */
import { readFileSync } from 'fs';

export const defaultRules = JSON.parse(readFileSync(new URL('../pipeline/scoring.json', import.meta.url), 'utf8'));
export const metricNames = ['response', 'delivery_details', 'implementation_reported'];

const demand = (condition, message) => { if (!condition) throw new Error(message); };
const text = value => typeof value === 'string' && value.trim().length > 0;
const unique = values => [...new Set(values)];
const bandLabel = (value, rules) => rules.bands.find(band => band.value === value).label;
const metricState = (lower, upper) => ({ lower, upper, status: lower ? 'evidenced' : upper ? 'undetermined' : 'not_found' });

function stableUnique(items, key) {
  const map = new Map();
  for (const item of items) {
    demand(item && text(item[key]), `Missing ${key}`);
    if (map.has(item[key])) {
      demand(JSON.stringify(map.get(item[key])) === JSON.stringify(item), `Conflicting duplicate ${key}: ${item[key]}`);
    } else map.set(item[key], item);
  }
  return [...map.values()];
}

function checkEvidence(ids, evidence, label) {
  demand(Array.isArray(ids) && ids.length > 0, `${label} requires evidence_ids`);
  for (const id of ids) demand(text(id) && evidence.has(id), `${label} unknown evidence_id: ${id}`);
}

function deliveryCheck(detail, key, variant, evidence, rules) {
  if (detail === null) return { qualified: false, evidence_ids: [], reason: 'Not documented' };
  demand(detail && text(detail.text), `${variant.variant_id}.${key} requires text or null`);
  demand(text(detail.policy_object_id), `${variant.variant_id}.${key} requires policy_object_id`);
  checkEvidence(detail.evidence_ids, evidence, `${variant.variant_id}.${key}`);
  demand(detail.evidence_ids.every(id => variant.evidence_ids.includes(id)), `${variant.variant_id}.${key} cites evidence outside its coherent variant`);
  const rule = rules.delivery_criteria[key];
  const discriminator = { actor: 'role', timeframe: 'anchor', deliverable: 'kind' }[key];
  const acceptedKey = { actor: 'accepted_roles', timeframe: 'accepted_anchors', deliverable: 'accepted_kinds' }[key];
  const otherKey = { actor: 'other_roles', timeframe: 'other_anchors', deliverable: 'other_kinds' }[key];
  demand([...rule[acceptedKey], ...rule[otherKey]].includes(detail[discriminator]), `Invalid ${key}.${discriminator}`);
  const coherent = detail.policy_object_id === variant.policy_object_id;
  const accepted = rule[acceptedKey].includes(detail[discriminator]);
  return {
    qualified: coherent && accepted,
    evidence_ids: unique(detail.evidence_ids),
    reason: !coherent ? 'Different policy object; cannot borrow this detail' : !accepted ? rule.rule : 'Source-supported detail for the same response'
  };
}

export function assessClaim(claim, evidence, rules = defaultRules) {
  demand(text(claim.claim_id), 'Missing claim_id');
  demand(Array.isArray(claim.topic_ids) && claim.topic_ids.length > 0 && claim.topic_ids.every(text), `${claim.claim_id} requires topic_ids`);
  demand(Array.isArray(claim.variants) && claim.variants.length > 0, `${claim.claim_id} requires variants`);
  const rawVariants = stableUnique(claim.variants, 'variant_id');
  demand(unique(rawVariants.map(variant => variant.policy_object_id)).length === 1, `${claim.claim_id} mixes different policy objects across variants`);
  const variants = rawVariants.map(variant => {
    checkEvidence(variant.evidence_ids, evidence, variant.variant_id);
    demand(rules.conditionality_options.includes(variant.conditionality), `Invalid conditionality in ${variant.variant_id}`);
    const response = rules.response_statement_types.includes(variant.statement_type);
    demand(response || rules.context_statement_types.includes(variant.statement_type), `Invalid statement_type in ${variant.variant_id}`);
    demand(response ? text(variant.policy_object_id) : variant.policy_object_id === null || text(variant.policy_object_id), `Invalid policy_object_id in ${variant.variant_id}`);
    demand(variant.details && ['actor', 'timeframe', 'deliverable'].every(key => Object.prototype.hasOwnProperty.call(variant.details, key)), `${variant.variant_id} requires all three details (null allowed)`);
    const checks = Object.fromEntries(['actor', 'timeframe', 'deliverable'].map(key => [key, deliveryCheck(variant.details[key], key, variant, evidence, rules)]));
    const ready = response && Object.values(checks).every(check => check.qualified);
    return {
      variant_id: variant.variant_id,
      policy_object_id: variant.policy_object_id,
      statement_type: variant.statement_type,
      conditionality: variant.conditionality,
      band: response ? ready ? 3 : 2 : 1,
      delivery_checks_applicable: response,
      checks,
      stage: rules.stages[variant.statement_type] || null,
      evidence_ids: unique(variant.evidence_ids)
    };
  });
  const lower = Math.min(...variants.map(variant => variant.band));
  const upper = Math.max(...variants.map(variant => variant.band));
  const predicates = {
    response: variant => variant.band >= 2,
    delivery_details: variant => variant.band >= 3,
    implementation_reported: variant => rules.implementation_statement_types.includes(variant.statement_type)
  };
  const metrics = Object.fromEntries(metricNames.map(name => [name, metricState(variants.every(predicates[name]), variants.some(predicates[name]))]));
  const result = { claim_id: claim.claim_id, topic_ids: unique(claim.topic_ids), lower_band: lower, upper_band: upper, label: bandLabel(lower, rules), details_vary: lower !== upper, metrics, variants };
  if (result.topic_ids.length > 1 || claim.topic_projections !== undefined) {
    demand(Array.isArray(claim.topic_projections), `${claim.claim_id} requires explicit topic_projections for multiple topics`);
    const projections = stableUnique(claim.topic_projections, 'topic_id');
    demand(projections.length === result.topic_ids.length && projections.every(item => result.topic_ids.includes(item.topic_id)), `${claim.claim_id} projections must equal its topic_ids`);
    const canonical = new Map(rawVariants.map(item => [item.variant_id, item]));
    result.topic_assessments = {};
    for (const projection of projections) {
      demand(Array.isArray(projection.variants), `${claim.claim_id}.${projection.topic_id} requires variants`);
      const projectedVariants = stableUnique(projection.variants, 'variant_id');
      demand(projectedVariants.length === canonical.size && projectedVariants.every(item => canonical.has(item.variant_id)), 'Topic projection must retain all canonical variant IDs');
      for (const projected of projectedVariants) {
        const original = canonical.get(projected.variant_id);
        demand(projected.policy_object_id === original.policy_object_id && projected.conditionality === original.conditionality, 'Topic projection changed policy identity or conditionality');
        demand(projected.statement_type === original.statement_type || rules.context_statement_types.includes(projected.statement_type), 'Topic projection cannot invent a response or implementation stage');
        demand(Array.isArray(projected.evidence_ids) && projected.evidence_ids.every(id => original.evidence_ids.includes(id)), 'Topic projection cites evidence outside its canonical variant');
        demand(projected.details && ['actor', 'timeframe', 'deliverable'].every(key => Object.prototype.hasOwnProperty.call(projected.details, key)), 'Topic projection requires explicit delivery details');
        for (const key of ['actor', 'timeframe', 'deliverable']) {
          const detail = projected.details[key], originalDetail = original.details[key];
          if (detail === null) continue;
          demand(originalDetail && ['text', 'policy_object_id', 'role', 'anchor', 'kind'].every(field => detail[field] === originalDetail[field]), 'Topic projection cannot add or alter delivery qualifications');
          demand(Array.isArray(detail.evidence_ids) && detail.evidence_ids.every(id => originalDetail.evidence_ids.includes(id)), 'Topic projection detail cites new evidence');
        }
      }
      result.topic_assessments[projection.topic_id] = assessClaim({ claim_id: claim.claim_id, topic_ids: [projection.topic_id], variants: projectedVariants }, evidence, rules);
    }
  }
  return result;
}

export function assessTopic(topic, claims, rules = defaultRules) {
  demand(text(topic.topic_id) && text(topic.home_domain_id), 'Topic requires topic_id and home_domain_id');
  demand(typeof topic.processing_complete === 'boolean', `${topic.topic_id} requires processing_complete`);
  const relevant = claims.filter(claim => claim.topic_ids.includes(topic.topic_id)).map(claim => claim.topic_assessments ? claim.topic_assessments[topic.topic_id] : claim);
  const lower = relevant.length ? Math.max(...relevant.map(claim => claim.lower_band)) : 0;
  const evidenceUpper = relevant.length ? Math.max(...relevant.map(claim => claim.upper_band)) : 0;
  const upper = topic.processing_complete ? evidenceUpper : 3;
  const band = !relevant.length && !topic.processing_complete ? null : lower;
  const metrics = Object.fromEntries(metricNames.map(name => [name, metricState(
    relevant.some(claim => claim.metrics[name].lower),
    !topic.processing_complete || relevant.some(claim => claim.metrics[name].upper)
  )]));
  return {
    topic_id: topic.topic_id,
    home_domain_id: topic.home_domain_id,
    band,
    label: band === null ? 'Unavailable' : bandLabel(band, rules),
    lower_band: lower,
    upper_band: upper,
    details_vary: lower !== evidenceUpper,
    search_incomplete: !topic.processing_complete,
    processing_complete: topic.processing_complete,
    response_status: metrics.response.status,
    metrics,
    response_claim_count: relevant.filter(claim => claim.lower_band >= 2).length,
    detail_ready_claim_count: relevant.filter(claim => claim.lower_band === 3).length,
    implementation_reported_claim_count: relevant.filter(claim => claim.metrics.implementation_reported.lower).length,
    claim_ids: relevant.map(claim => claim.claim_id)
  };
}

function coverageSummary(home) {
  demand(home.length > 0, 'Coverage requires a nonempty fixed topic profile');
  const counts = { '0': 0, '1': 0, '2': 0, '3': 0, unavailable: 0 };
  for (const topic of home) counts[topic.band === null ? 'unavailable' : String(topic.band)] += 1;
  const P = home.filter(topic => topic.response_status === 'evidenced').length;
  const A = home.filter(topic => topic.response_status === 'not_found').length;
  const U = home.length - P - A;
  const metrics = Object.fromEntries(metricNames.map(name => {
    const positive = home.filter(topic => topic.metrics[name].lower).length;
    const absent = home.filter(topic => !topic.metrics[name].upper).length;
    const unknown = home.length - positive - absent;
    return [name, { P: positive, A: absent, U: unknown, N: home.length, lower_percent: 100 * positive / home.length, upper_percent: 100 * (positive + unknown) / home.length, exact: unknown === 0 }];
  }));
  return {
    total_topics: home.length,
    processed_topics: home.filter(topic => topic.processing_complete).length,
    job_processed_topics: home.filter(topic => topic.job_processing_complete).length,
    demonstrated_band_counts: counts,
    provisional_topic_count: home.filter(topic => topic.search_incomplete || metricNames.some(name => topic.metrics[name].lower !== topic.metrics[name].upper)).length,
    P, A, U,
    metrics,
    response_coverage: { lower_percent: 100 * P / home.length, upper_percent: 100 * (P + U) / home.length, exact: U === 0 },
    response_topic_count: P,
    detail_ready_topic_count: home.filter(topic => topic.lower_band === 3).length,
    implementation_reported_topic_count: home.filter(topic => topic.metrics.implementation_reported.lower).length
  };
}

export function assessDomain(homeDomainId, topics) {
  const home = topics.filter(topic => topic.home_domain_id === homeDomainId);
  demand(home.length > 0, `No home topics for ${homeDomainId}`);
  return { home_domain_id: homeDomainId, ...coverageSummary(home) };
}

export function assessDataset(input, rules = defaultRules) {
  demand(input && input.scope && ['country', 'document'].includes(input.scope.kind), 'scope.kind must be country or document');
  demand(Array.isArray(input.scope.document_ids) && input.scope.document_ids.length > 0 && input.scope.document_ids.every(text), 'scope.document_ids required');
  demand(typeof input.scope.source_profile_complete === 'boolean', 'scope.source_profile_complete must be explicit');
  demand(unique(input.scope.document_ids).length === input.scope.document_ids.length, 'Duplicate scope document');
  demand(input.scope.kind !== 'document' || input.scope.document_ids.length === 1, 'Document scope requires exactly one document');
  demand(input.profile && text(input.profile.profile_id) && Array.isArray(input.profile.topic_ids) && input.profile.topic_ids.length > 0 && input.profile.topic_ids.every(text), 'Fixed profile required');
  demand(unique(input.profile.topic_ids).length === input.profile.topic_ids.length, 'Duplicate profile topic');
  demand(Array.isArray(input.evidence) && Array.isArray(input.claims) && Array.isArray(input.topics), 'evidence, claims and topics arrays required');
  const evidence = new Map(stableUnique(input.evidence, 'evidence_id').map(item => {
    demand(input.scope.document_ids.includes(item.document_id), `Evidence outside snapshot scope: ${item.evidence_id}`);
    return [item.evidence_id, item];
  }));
  const rawTopics = stableUnique(input.topics, 'topic_id');
  demand(rawTopics.length === input.profile.topic_ids.length && rawTopics.every(topic => input.profile.topic_ids.includes(topic.topic_id)), 'Topics must equal the fixed profile; missing topics must be present as incomplete');
  const claims = stableUnique(input.claims, 'claim_id').map(claim => assessClaim(claim, evidence, rules));
  const variantOwners = new Map();
  for (const claim of claims) for (const variant of claim.variants) {
    demand(!variantOwners.has(variant.variant_id), `Variant ${variant.variant_id} belongs to multiple claims`);
    variantOwners.set(variant.variant_id, claim.claim_id);
  }
  for (const claim of claims) for (const topicId of claim.topic_ids) demand(input.profile.topic_ids.includes(topicId), `Claim topic outside profile: ${topicId}`);
  const topics = rawTopics.map(topic => {
    demand(typeof topic.processing_complete === 'boolean', `${topic.topic_id} requires explicit supplied-job processing_complete`);
    return {
      ...assessTopic({ ...topic, processing_complete: topic.processing_complete && input.scope.source_profile_complete }, claims, rules),
      job_processing_complete: topic.processing_complete,
      source_profile_complete: input.scope.source_profile_complete
    };
  });
  const domains = unique(topics.map(topic => topic.home_domain_id)).map(id => assessDomain(id, topics));
  const national = input.scope.kind === 'country' ? { meaning: 'Unique-topic documentation inventory, not policy quality', ...coverageSummary(topics) } : null;
  return { scoring_version: rules.version, scope: input.scope, profile: input.profile, claims, topics, domains, national };
}

/** A malformed assessment is unavailable; it is never silently converted to 0. */
export function assessDatasetSafely(input, rules = defaultRules) {
  try {
    return { status: 'available', assessment: assessDataset(input, rules) };
  } catch (error) {
    return { status: 'unavailable', assessment: null, reason: 'Invalid normalized assessment input', detail: error.message };
  }
}
