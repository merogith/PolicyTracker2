/**
 * v2 reference calculator, NOT integrated into the application.
 * Input semantics and citations have already passed upstream automatic checks.
 * This module validates the small normalized contract and calculates bands.
 * It does not read PDFs, call an LLM, infer identity, or certify factual truth.
 */
import { readFileSync } from 'fs';

export const defaultRules = JSON.parse(readFileSync(new URL('../config/scoring.json', import.meta.url), 'utf8'));

const demand = (condition, message) => { if (!condition) throw new Error(message); };
const text = value => typeof value === 'string' && value.trim().length > 0;
const unique = values => [...new Set(values)];
const bandLabel = (value, rules) => rules.bands.find(band => band.value === value).label;

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
  return { claim_id: claim.claim_id, topic_ids: unique(claim.topic_ids), lower_band: lower, upper_band: upper, label: bandLabel(lower, rules), details_vary: lower !== upper, variants };
}

export function assessTopic(topic, claims, rules = defaultRules) {
  demand(text(topic.topic_id) && text(topic.home_domain_id), 'Topic requires topic_id and home_domain_id');
  demand(typeof topic.processing_complete === 'boolean', `${topic.topic_id} requires processing_complete`);
  const relevant = claims.filter(claim => claim.topic_ids.includes(topic.topic_id));
  const lower = relevant.length ? Math.max(...relevant.map(claim => claim.lower_band)) : 0;
  const evidenceUpper = relevant.length ? Math.max(...relevant.map(claim => claim.upper_band)) : 0;
  const upper = topic.processing_complete ? evidenceUpper : 3;
  const band = !relevant.length && !topic.processing_complete ? null : lower;
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
    response_status: lower >= 2 ? 'evidenced' : topic.processing_complete && upper < 2 ? 'not_found' : 'undetermined',
    response_claim_count: relevant.filter(claim => claim.lower_band >= 2).length,
    detail_ready_claim_count: relevant.filter(claim => claim.lower_band === 3).length,
    claim_ids: relevant.map(claim => claim.claim_id)
  };
}

export function assessDomain(homeDomainId, topics) {
  const home = topics.filter(topic => topic.home_domain_id === homeDomainId);
  demand(home.length > 0, `No home topics for ${homeDomainId}`);
  const counts = { '0': 0, '1': 0, '2': 0, '3': 0, unavailable: 0 };
  for (const topic of home) counts[topic.band === null ? 'unavailable' : String(topic.band)] += 1;
  const P = home.filter(topic => topic.response_status === 'evidenced').length;
  const A = home.filter(topic => topic.response_status === 'not_found').length;
  const U = home.length - P - A;
  return {
    home_domain_id: homeDomainId,
    total_topics: home.length,
    processed_topics: home.filter(topic => topic.processing_complete).length,
    demonstrated_band_counts: counts,
    provisional_topic_count: home.filter(topic => topic.search_incomplete || topic.details_vary).length,
    P, A, U,
    response_coverage: { lower_percent: 100 * P / home.length, upper_percent: 100 * (P + U) / home.length, exact: U === 0 },
    response_topic_count: P,
    detail_ready_topic_count: home.filter(topic => topic.lower_band === 3).length
  };
}

export function assessDataset(input, rules = defaultRules) {
  demand(input && input.scope && ['country', 'document'].includes(input.scope.kind), 'scope.kind must be country or document');
  demand(Array.isArray(input.scope.document_ids) && input.scope.document_ids.length > 0 && input.scope.document_ids.every(text), 'scope.document_ids required');
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
  const topics = rawTopics.map(topic => assessTopic(topic, claims, rules));
  const domains = unique(topics.map(topic => topic.home_domain_id)).map(id => assessDomain(id, topics));
  return { scoring_version: rules.version, scope: input.scope, profile: input.profile, claims, topics, domains };
}

/** A malformed assessment is unavailable; it is never silently converted to 0. */
export function assessDatasetSafely(input, rules = defaultRules) {
  try {
    return { status: 'available', assessment: assessDataset(input, rules) };
  } catch (error) {
    return { status: 'unavailable', assessment: null, reason: 'Invalid normalized assessment input', detail: error.message };
  }
}
