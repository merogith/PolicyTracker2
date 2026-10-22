import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';

export const rules = JSON.parse(readFileSync(new URL('./scoring.json', import.meta.url), 'utf8'));
export const defaultTaxonomy = JSON.parse(readFileSync(new URL('../pipeline/taxonomy.json', import.meta.url), 'utf8'));
const clone = value => JSON.parse(JSON.stringify(value));
const unique = values => [...new Set(values)];
const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
const key = value => JSON.stringify(value);
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const string = (value, name) => assert(typeof value === 'string' && value.trim(), `${name} must be a non-empty string`);
const bool = (value, name) => assert(typeof value === 'boolean', `${name} must be boolean`);
const list = (value, name) => assert(Array.isArray(value), `${name} must be an array`);
const exactUnique = (values, name) => assert(unique(values).length === values.length, `${name} contains duplicate IDs`);
const noChange = label => ({ symbol: '—', delta: null, label: label || 'No comparable previous snapshot' });

export function levelFor(score) {
  if (score === null) return { level: rules.unavailable.label, color: rules.unavailable.color };
  assert(Number.isFinite(score) && score >= 0 && score <= 100, 'Score must be within 0..100');
  const band = rules.levels.find(item => score >= item.minimum && (item.maximum_exclusive !== undefined ? score < item.maximum_exclusive : score <= item.maximum_inclusive));
  return { level: band.label, color: band.color };
}

function assessVariant(variant, recordMap) {
  string(variant.id, 'variant.id');
  const response = rules.claim.response_types.includes(variant.statement_type);
  assert(response || rules.claim.context_types.includes(variant.statement_type), 'Unknown statement type');
  if (response || variant.policy_object_id !== null) string(variant.policy_object_id, 'variant.policy_object_id');
  list(variant.evidence_ids, 'variant.evidence_ids');
  assert(variant.evidence_ids.length > 0, 'A variant needs evidence'); exactUnique(variant.evidence_ids, 'variant.evidence_ids');
  variant.evidence_ids.forEach(id => assert(recordMap.has(id), `Unknown admitted evidence ${id}`));
  assert(variant.details && typeof variant.details === 'object', 'Variant details must be explicit');
  const detail = (name, enumField, allowed, qualifying) => {
    assert(Object.prototype.hasOwnProperty.call(variant.details, name), `Missing explicit ${name} detail`);
    const value = variant.details[name];
    if (value === null) return false;
    string(value.text, `${name}.text`);
    assert(value.policy_object_id === variant.policy_object_id, `Cannot borrow ${name} from another policy object`);
    list(value.evidence_ids, `${name}.evidence_ids`);
    assert(value.evidence_ids.length > 0, `${name} needs evidence`); exactUnique(value.evidence_ids, `${name}.evidence_ids`);
    value.evidence_ids.forEach(id => assert(variant.evidence_ids.includes(id), `${name} evidence is not admitted by its variant`));
    assert(allowed.includes(value[enumField]), `Invalid ${name} ${enumField}`);
    return qualifying.includes(value[enumField]);
  };
  const who = detail('actor', 'role', rules.claim.actor_roles, rules.claim.qualifying_actor_roles);
  const when = detail('timeframe', 'anchor', rules.claim.time_anchors, [rules.claim.qualifying_time_anchor]);
  const what = detail('deliverable', 'kind', rules.claim.deliverable_kinds, rules.claim.qualifying_deliverables);
  const checks = { response, who: response && who, when: response && when, what: response && what };
  return { id: variant.id, checks, points: response ? 1 + Number(who) + Number(when) + Number(what) : null };
}

function assessVariants(variants, records) {
  list(variants, 'variants'); assert(variants.length > 0, 'A claim needs at least one variant');
  exactUnique(variants.map(v => v.id), 'variant IDs');
  assert(unique(variants.map(v => v.policy_object_id)).length === 1, 'Claim variants must describe one coherent policy object');
  const assessed = variants.map(variant => assessVariant(variant, records));
  assert(unique(assessed.map(v => v.checks.response)).length === 1, 'Resolve response/context identity before assessment; do not silently count ambiguous identity');
  const response = assessed[0].checks.response;
  const unresolved = unique(assessed.map(v => key(v.checks))).length > 1;
  const checks = Object.fromEntries(['response', 'who', 'when', 'what'].map(name => [name, unique(assessed.map(v => v.checks[name])).length === 1 ? assessed[0].checks[name] : null]));
  return {
    kind: response ? 'response' : 'context',
    points: !response || unresolved ? null : assessed[0].points,
    possible_points: unique(assessed.map(v => v.points)).filter(value => value !== null).sort(),
    score: !response || unresolved ? null : assessed[0].points * 25,
    checks, status: unresolved ? 'unresolved' : 'complete'
  };
}

function validateProjection(projection, claim) {
  list(projection.variants, 'projection variants');
  assert(projection.variants.length === claim.variants.length, 'Projection must retain every alternative variant');
  projection.variants.forEach(variant => {
    const original = claim.variants.find(item => item.id === variant.id);
    assert(original && original.policy_object_id === variant.policy_object_id, 'Projection must use its original variant and policy object');
    assert(variant.evidence_ids.every(id => original.evidence_ids.includes(id)), 'Projection cannot introduce evidence');
    assert(variant.statement_type === original.statement_type || rules.claim.context_types.includes(variant.statement_type), 'Projection cannot invent response credit');
    ['actor', 'timeframe', 'deliverable'].forEach(name => {
      const value = variant.details[name], source = original.details[name];
      if (value !== null) assert(source !== null && value.text === source.text && value.policy_object_id === source.policy_object_id && value.role === source.role && value.anchor === source.anchor && value.kind === source.kind && value.evidence_ids.every(id => source.evidence_ids.includes(id)), `Projection cannot invent ${name}`);
    });
  });
}

export function assessClaim(input, documentMap, topicIds) {
  string(input.id, 'claim.id'); string(input.title, 'claim.title');
  assert(topicIds.has(input.primary_topic_id), 'Unknown primary topic');
  list(input.secondary_topic_ids, 'secondary_topic_ids'); exactUnique(input.secondary_topic_ids, 'secondary_topic_ids');
  input.secondary_topic_ids.forEach(id => assert(topicIds.has(id) && id !== input.primary_topic_id, 'Invalid secondary topic'));
  assert(rules.claim.conditionalities.includes(input.conditionality), 'Invalid conditionality');
  list(input.source_records, 'source_records'); assert(input.source_records.length > 0, 'Claim needs source records');
  const recordMap = new Map();
  input.source_records.forEach(record => {
    string(record.id, 'record.id'); string(record.quote, 'record.quote');
    assert(documentMap.has(record.document_id), 'Record document is outside the selected scope');
    assert(!recordMap.has(record.id), 'Duplicate record ID within claim'); recordMap.set(record.id, record);
  });
  const primary = assessVariants(input.variants, recordMap);
  const projections = new Map([[input.primary_topic_id, primary]]);
  list(input.topic_projections, 'topic_projections');
  assert(input.topic_projections.length === input.secondary_topic_ids.length, 'Every secondary topic needs one explicit projection');
  exactUnique(input.topic_projections.map(item => item.topic_id), 'topic projection IDs');
  input.topic_projections.forEach(projection => {
    assert(input.secondary_topic_ids.includes(projection.topic_id), 'Unexpected topic projection');
    validateProjection(projection, input);
    projections.set(projection.topic_id, assessVariants(projection.variants, recordMap));
  });
  const source_ids = unique(input.source_records.map(record => record.document_id));
  return {
    id: input.id, title: input.title, primary_topic_id: input.primary_topic_id,
    secondary_topic_ids: input.secondary_topic_ids, ...primary,
    source_ids, source_records: clone(input.source_records), sources: source_ids.map(id => clone(documentMap.get(id))),
    stage: input.stage, conditionality: input.conditionality,
    detail_text: Object.fromEntries([['who', 'actor'], ['when', 'timeframe'], ['what', 'deliverable']].map(([label, field]) => [label, unique(input.variants.map(variant => variant.details[field] && variant.details[field].text).filter(Boolean)).join(' / ') || null])),
    conflicts: clone(input.conflicts || []), related_context_ids: clone(input.related_context_ids || []),
    topic_assessments: [...projections].map(([topic_id, assessment]) => ({ topic_id, ...assessment }))
  };
}

function countsFor(owned, related, topicCount, scoredTopics) {
  return { total_claims: owned.length, response_claims: owned.filter(c => c.kind === 'response').length,
    context_claims: owned.filter(c => c.kind === 'context').length, related_claims: related.length,
    topics: topicCount, scored_topics: scoredTopics };
}

function rollup(topics, claims, topicIds) {
  const owned = claims.filter(c => topicIds.has(c.primary_topic_id));
  const related = claims.filter(c => !topicIds.has(c.primary_topic_id) && c.secondary_topic_ids.some(id => topicIds.has(id)));
  const known = topics.filter(t => t.score !== null);
  const status = topics.some(t => t.status === 'partial') ? 'partial' : topics.some(t => t.status === 'unresolved') ? 'unresolved' : 'complete';
  const score = known.length === topics.length ? mean(known.map(t => t.score)) : null;
  return {
    score, status, ...levelFor(score),
    bounds: { lower: topics.reduce((sum, t) => sum + (t.score === null ? 0 : t.score), 0) / topics.length,
      upper: topics.reduce((sum, t) => sum + (t.score === null ? 100 : t.score), 0) / topics.length },
    provisional_observed_mean: score === null && known.length ? mean(known.map(t => t.score)) : null,
    counts: countsFor(owned, related, topics.length, known.length),
    total_points: owned.filter(c => c.points !== null).reduce((sum, c) => sum + c.points, 0),
    topics_with_responses: topics.filter(t => t.scoring_response_count > 0).length,
    change: noChange()
  };
}

export function calculate(input, taxonomy = defaultTaxonomy) {
  assert(key(Object.keys(rules.claim.points).sort()) === key(['response', 'who', 'when', 'what'].sort()) && Object.values(rules.claim.points).every(value => value === 1), 'Version 4 supports exactly four equal one-point checks; changing weights requires a new method and calculator version');
  string(input.snapshot_id, 'snapshot_id'); string(input.country_id, 'country_id');
  bool(input.source_profile_complete, 'source_profile_complete');
  list(input.documents, 'documents'); list(input.topics, 'topics'); list(input.claims, 'claims');
  assert(input.documents.length > 0, 'No source documents: unavailable, not a completed empty assessment');
  const topicIds = new Set(taxonomy.topics.map(topic => topic.id));
  assert(topicIds.size === taxonomy.topics.length && topicIds.size > 0, 'Taxonomy topic IDs must be unique');
  const domainIds = new Set(taxonomy.domains.map(domain => domain.id));
  taxonomy.topics.forEach(topic => assert(domainIds.has(topic.home_domain_id), 'Topic home domain is unknown'));
  exactUnique(input.topics.map(topic => topic.id), 'input topic IDs');
  assert(input.topics.length === topicIds.size && input.topics.every(topic => topicIds.has(topic.id)), 'Input must cover the complete fixed topic profile');
  input.topics.forEach(topic => bool(topic.processing_complete, 'topic.processing_complete'));
  const documentMap = new Map();
  input.documents.forEach(document => { string(document.id, 'document.id'); assert(!documentMap.has(document.id), 'Duplicate document ID'); documentMap.set(document.id, document); });
  const canonical = new Map();
  input.claims.forEach(claim => {
    if (canonical.has(claim.id)) assert(key(canonical.get(claim.id)) === key(claim), 'Conflicting duplicate claim ID');
    else canonical.set(claim.id, claim);
  });
  const claims = [...canonical.values()].map(claim => assessClaim(claim, documentMap, topicIds));
  const owners = new Map();
  [...canonical.values()].forEach(claim => claim.source_records.forEach(record => {
    assert(!owners.has(record.id) || owners.get(record.id) === claim.id, 'A source record cannot be owned by two canonical claims; link it as supporting evidence instead'); owners.set(record.id, claim.id);
  }));
  claims.forEach(claim => claim.related_context_ids.forEach(id => assert(canonical.has(id) && id !== claim.id, 'Unknown related context claim')));
  const topics = taxonomy.topics.map(topic => {
    const processing_complete = input.topics.find(item => item.id === topic.id).processing_complete;
    const complete = processing_complete && input.source_profile_complete;
    const owned = claims.filter(claim => claim.primary_topic_id === topic.id);
    const related = claims.filter(claim => claim.secondary_topic_ids.includes(topic.id));
    const assessments = [...owned, ...related].map(claim => claim.topic_assessments.find(item => item.topic_id === topic.id));
    const responses = assessments.filter(item => item.kind === 'response');
    const unresolved = responses.some(item => item.status === 'unresolved');
    const knownResponses = responses.filter(item => item.points !== null);
    const observed = knownResponses.length ? mean(knownResponses.map(item => item.score)) : null;
    const status = !complete ? 'partial' : unresolved ? 'unresolved' : 'complete';
    const score = status === 'complete' ? responses.length ? observed : 0 : null;
    return { id: topic.id, label: topic.label, home_domain_id: topic.home_domain_id,
      score, status, ...levelFor(score), bounds: { lower: score === null ? 0 : score, upper: score === null ? 100 : score },
      provisional_observed_mean: score === null ? observed : null,
      counts: countsFor(owned, related, 1, score === null ? 0 : 1),
      scoring_response_count: responses.length,
      total_points: owned.filter(claim => claim.points !== null).reduce((sum, claim) => sum + claim.points, 0),
      qualification_range: unresolved && complete ? { lower: mean(responses.map(item => Math.min(...item.possible_points))) * 25,
        upper: mean(responses.map(item => Math.max(...item.possible_points))) * 25 } : null,
      processing_complete, source_profile_complete: input.source_profile_complete,
      change: noChange() };
  });
  const domains = taxonomy.domains.map(domain => {
    const members = topics.filter(topic => topic.home_domain_id === domain.id);
    assert(members.length > 0, 'Every selected domain needs home topics');
    return { id: domain.id, label: domain.label, ...rollup(members, claims, new Set(members.map(topic => topic.id))) };
  });
  return {
    snapshot_id: input.snapshot_id, country_id: input.country_id, scope_label: input.scope_label,
    cutoff_date: input.cutoff_date, source_profile_complete: input.source_profile_complete,
    basis: clone(input.basis || {}), documents: clone(input.documents),
    national: rollup(topics, claims, topicIds), domains, topics, claims
  };
}

export function calculateSafely(input, taxonomy = defaultTaxonomy) {
  try { return { status: 'ok', assessment: calculate(input, taxonomy), errors: [] }; }
  catch (error) { return { status: 'unavailable', assessment: null, errors: [error.message] }; }
}

function isoDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

export function compareSnapshots(previous, current, event = { kind: 'ordinary_upload' }) {
  const refresh = label => ({ eligible: false, symbol: '↻', delta: null, label });
  if (event.kind !== rules.comparison.eligible_event) return refresh('Refresh: source intake, backfill or method change');
  if (!previous || previous.country_id !== current.country_id) return refresh('No matched country snapshot');
  if (current.basis.source_profile_id === 'supplied_all' || previous.basis.source_profile_id === 'supplied_all') return refresh('Refresh: exploratory supplied-document scope');
  if (previous.national.status !== 'complete' || current.national.status !== 'complete' || !previous.source_profile_complete || !current.source_profile_complete) return refresh('Unavailable: incomplete or unresolved comparison scope');
  if (rules.comparison.required_basis_fields.some(field => typeof current.basis[field] !== 'string' || !current.basis[field] || previous.basis[field] !== current.basis[field])) return refresh('Refresh: comparison basis differs');
  if (key(previous.topics.map(t => [t.id, t.home_domain_id]).sort()) !== key(current.topics.map(t => [t.id, t.home_domain_id]).sort())) return refresh('Refresh: topic profile differs');
  if (!isoDate(previous.cutoff_date) || !isoDate(current.cutoff_date) || current.cutoff_date <= previous.cutoff_date) return refresh('Refresh: invalid assessment cutoff');
  const manifest = snapshot => snapshot.documents.filter(d => d.comparison_eligible !== false);
  const before = manifest(previous), after = manifest(current);
  if (!before.length || before.length !== after.length) return refresh('Refresh: source coverage differs');
  if ([...before, ...after].some(document => typeof document.family_id !== 'string' || !document.family_id || typeof document.role !== 'string' || !document.role)) return refresh('Refresh: missing source family metadata');
  const families = docs => docs.map(d => `${d.family_id}|${d.role}`).sort();
  if (new Set(families(before)).size !== before.length || key(families(before)) !== key(families(after))) return refresh('Refresh: source family or role differs');
  let changed = false;
  for (const document of after) {
    const old = before.find(item => item.family_id === document.family_id && item.role === document.role);
    if (!isoDate(document.edition_date) || !isoDate(old.edition_date) || document.edition_date > current.cutoff_date || old.edition_date > previous.cutoff_date) return refresh('Refresh: invalid source edition dates');
    if (old.id === document.id) {
      if (old.edition_date !== document.edition_date) return refresh('Refresh: inconsistent source metadata');
    } else {
      if (document.edition_date <= old.edition_date || document.edition_date <= previous.cutoff_date) return refresh('Refresh: backfilled or non-new edition');
      changed = true;
    }
  }
  if (!changed) return refresh('Refresh: no new source edition');
  const change = (oldScore, newScore) => {
    const delta = newScore - oldScore;
    return { symbol: delta > 0 ? '↑' : delta < 0 ? '↓' : '→', delta, label: 'Documentation score change (points); not implementation progress' };
  };
  return { eligible: true, ...change(previous.national.score, current.national.score),
    national: change(previous.national.score, current.national.score),
    domains: current.domains.map(domain => ({ id: domain.id, ...change(previous.domains.find(d => d.id === domain.id).score, domain.score) })),
    topics: current.topics.map(topic => ({ id: topic.id, ...change(previous.topics.find(t => t.id === topic.id).score, topic.score) })) };
}

export function attachChanges(previous, current, event) {
  const result = clone(current), comparison = compareSnapshots(previous, current, event);
  const generic = { symbol: comparison.symbol, delta: comparison.delta, label: comparison.label };
  result.national.change = comparison.eligible ? comparison.national : generic;
  result.domains.forEach(domain => { domain.change = comparison.eligible ? comparison.domains.find(item => item.id === domain.id) : generic; });
  result.topics.forEach(topic => { topic.change = comparison.eligible ? comparison.topics.find(item => item.id === topic.id) : generic; });
  return result;
}

function demoClaim({ id, topic, document, points = 1, title, context = false, stage = 'planned', quote, actorText, timeText, whatText }) {
  const recordId = `${id}-R-${document.id}`, objectId = `${id}-object`;
  const actor = points >= 4 ? actorText || 'Ministry responsible for the programme' : null;
  const timeframe = points >= 3 ? timeText || (stage === 'delivered' ? `in ${document.year}` : stage === 'underway' ? `from ${document.year} to 2030` : 'during 2026–2030') : null;
  const deliverable = points >= 2 ? whatText || `the first ${topic.label.toLowerCase()} implementation protocol` : null;
  const detail = (text, extra) => text ? { text, policy_object_id: objectId, evidence_ids: [recordId], ...extra } : null;
  const statement = title || (context ? `Documented climate/disaster context for ${topic.label.toLowerCase()}` : `Adopt measures for ${topic.label.toLowerCase()}`);
  return {
    id, title: statement, primary_topic_id: topic.id, secondary_topic_ids: [],
    stage: context ? 'not_applicable' : stage, conditionality: context ? 'not_stated' : 'unconditional',
    source_records: [{ id: recordId, document_id: document.id, page: 3, quote: quote || (context ? `Climate and disaster risks affect ${topic.label.toLowerCase()}.` : `${actor || 'The country'} ${stage === 'delivered' ? 'completed' : stage === 'underway' ? 'is working to complete' : 'will complete'} ${deliverable || 'a broad programme of measures for ' + topic.label.toLowerCase()}${timeframe ? ' ' + timeframe : ''}.`) }],
    variants: [{ id: `${id}-V-${document.id}`, policy_object_id: objectId, statement_type: context ? 'context' : stage === 'underway' ? 'implementation_underway' : stage === 'delivered' ? 'output_delivered' : 'planned_action', evidence_ids: [recordId],
      details: { actor: detail(actor, { role: 'responsible' }), timeframe: detail(timeframe, { anchor: 'action' }), deliverable: detail(deliverable, { kind: 'named_milestone' }) } }],
    topic_projections: [], conflicts: [], related_context_ids: []
  };
}

function documentInput(input, document) {
  const scoped = clone(input);
  scoped.snapshot_id = `${input.snapshot_id}-document-${document.id}`;
  scoped.scope_label = document.title; scoped.documents = [clone(document)];
  scoped.source_profile_complete = true;
  scoped.basis.source_profile_id = 'single_document';
  scoped.basis.source_role_coverage_signature = document.role;
  scoped.claims = scoped.claims.filter(claim => claim.source_records.some(record => record.document_id === document.id)).map(claim => {
    claim.source_records = claim.source_records.filter(record => record.document_id === document.id);
    const ids = new Set(claim.source_records.map(record => record.id));
    claim.variants = claim.variants.filter(variant => variant.evidence_ids.some(id => ids.has(id))).map(variant => {
      variant.evidence_ids = variant.evidence_ids.filter(id => ids.has(id));
      Object.keys(variant.details).forEach(name => { if (variant.details[name] && !variant.details[name].evidence_ids.every(id => ids.has(id))) variant.details[name] = null; });
      return variant;
    });
    claim.topic_projections.forEach(projection => { projection.variants = projection.variants.filter(variant => claim.variants.some(item => item.id === variant.id)); });
    claim.conflicts = claim.conflicts.filter(conflict => conflict.source_record_ids.every(id => ids.has(id)));
    return claim;
  });
  const availableIds = new Set(scoped.claims.map(claim => claim.id));
  scoped.claims.forEach(claim => { claim.related_context_ids = claim.related_context_ids.filter(id => availableIds.has(id)); });
  return scoped;
}

export function generateExamples() {
  const taxonomy = { version: defaultTaxonomy.version, domains: defaultTaxonomy.domains.map(({ id, label }) => ({ id, label })), topics: defaultTaxonomy.topics.map(({ id, label, home_domain_id }) => ({ id, label, home_domain_id })) };
  const inputs = [], countries = [];
  ['A', 'B', 'C'].forEach((letter, countryIndex) => {
    const countryId = `SYN-${letter}`;
    const createInput = current => {
      const era = current ? 'current' : 'previous';
      const documents = [
        { id: `${countryId}-NDC-${current ? 2025 : 2023}`, title: `Country ${letter} synthetic NDC ${current ? 2025 : 2023}`, role: 'NDC', year: current ? 2025 : 2023, family_id: `${countryId}-NDC`, edition_date: current ? '2025-06-01' : '2023-06-01' },
        { id: `${countryId}-NAP-${current ? 2026 : 2024}`, title: `Country ${letter} synthetic NAP ${current ? 2026 : 2024}`, role: 'NAP', year: current ? 2026 : 2024, family_id: `${countryId}-NAP`, edition_date: current ? '2026-06-01' : '2024-06-01' }
      ];
      if (letter === 'A') documents.push({ id: 'SYN-A-NAP-context-2024', title: 'Country A synthetic NAP 2024 capacity context', role: 'NAP', year: 2024, family_id: 'SYN-A-NAP', edition_date: '2024-12-01', comparison_eligible: false });
      const input = {
        snapshot_id: `${countryId}-${era}`, country_id: countryId, scope_label: letter === 'A' ? 'All supplied synthetic documents (exploratory)' : 'Matched synthetic NDC + NAP',
        cutoff_date: current ? '2026-09-01' : '2024-12-31', source_profile_complete: true,
        basis: { method_version: rules.version, taxonomy_version: taxonomy.version, scoring_version: rules.version, topic_profile_id: 'all_64', topic_profile_version: '3.0.0', source_profile_id: letter === 'A' ? 'supplied_all' : 'ndc_nap', source_profile_version: '1.0.0', source_role_coverage_signature: 'NDC+NAP', source_date_rule: 'latest_eligible_edition_as_of_cutoff' },
        documents, topics: taxonomy.topics.map(topic => ({ id: topic.id, processing_complete: !(letter === 'C' && current && ['ENE-01', 'TOU-01'].includes(topic.id)) })), claims: []
      };
      taxonomy.topics.forEach((topic, index) => {
        if (letter === 'A' && topic.id === 'AGR-01') return;
        const sequence = [0, 1, 2, 3, 4, 4, 3, 2, 0];
        const points = sequence[(index * 2 + countryIndex * 3 + (current ? 2 : 0)) % sequence.length];
        if (points > 0) input.claims.push(demoClaim({ id: `${countryId}-${topic.id}-response`, topic, document: documents[index % 2], points,
          stage: index % 11 === 0 ? 'delivered' : index % 7 === 0 ? 'underway' : 'planned' }));
        if (index % 4 === 0 || points === 0 && index % 2 === 0) input.claims.push(demoClaim({ id: `${countryId}-${topic.id}-context`, topic, document: documents[1], context: true }));
        if (points === 4 && index % 3 === 0) input.claims.push(demoClaim({ id: `${countryId}-${topic.id}-second-response`, topic, document: documents[1], points: 1, title: `Prepare a separate local adaptation initiative for ${topic.label.toLowerCase()}` }));
      });
      if (letter === 'A') {
        const topic = taxonomy.topics.find(item => item.id === 'AGR-01');
        const target = demoClaim({ id: 'SYN-A-water-target', topic, document: documents[0], points: 3, title: 'Efficient irrigation target: 100,000 or 80,000 hectares by 2030', quote: 'Under the Efficient Irrigation Programme, countrywide efficient irrigation will cover a total of 100,000 hectares by 2030, without conditions.', timeText: 'by 2030', whatText: '100,000 hectares of efficient irrigation' });
        target.variants[0].statement_type = 'commitment'; target.variants[0].details.deliverable.kind = 'quantified_output';
        const alternative = demoClaim({ id: target.id, topic, document: documents[1], points: 3, title: target.title, quote: 'Under the Efficient Irrigation Programme, countrywide efficient irrigation will cover a total of 80,000 hectares by 2030, without conditions.', timeText: 'by 2030', whatText: '80,000 hectares of efficient irrigation' });
        alternative.variants[0].statement_type = 'commitment'; alternative.variants[0].details.deliverable.kind = 'quantified_output';
        target.source_records.push(...alternative.source_records); target.variants.push(...alternative.variants);
        target.conflicts = [{ description: 'The same countrywide 2030 target is stated as 100,000 ha in the NDC and 80,000 ha in the NAP. No explicit revision resolves the difference.', source_record_ids: target.source_records.map(record => record.id) }];
        const capacity = demoClaim({ id: 'SYN-A-water-context', topic, document: documents[2], context: true, title: 'Existing irrigation network served 60,000 hectares in 2024', quote: 'The national irrigation network used by the Efficient Irrigation Programme served 60,000 hectares in 2024.' });
        const action = demoClaim({ id: 'SYN-A-water-canals', topic, document: documents[1], points: current ? 4 : 2, title: current ? 'Rehabilitate 30 km of irrigation canals during 2026–2030' : 'Rehabilitate 30 km of irrigation canals', actorText: 'Ministry of Agriculture', timeText: 'during 2026–2030', whatText: '30 km of irrigation canals', quote: current ? 'The Ministry of Agriculture will rehabilitate 30 km of irrigation canals under the Efficient Irrigation Programme during 2026–2030.' : 'The country will rehabilitate 30 km of irrigation canals under the Efficient Irrigation Programme.' });
        action.variants[0].details.deliverable.kind = 'quantified_output';
        target.related_context_ids = [capacity.id]; action.related_context_ids = [capacity.id];
        input.claims.push(target, capacity, action);
      }
      if (letter === 'B') {
        const climate = input.claims.find(claim => claim.primary_topic_id === 'CLM-03' && claim.variants[0].statement_type !== 'context');
        if (climate) {
          climate.secondary_topic_ids = ['DRM-02'];
          climate.topic_projections = [{ topic_id: 'DRM-02', variants: climate.variants.map(variant => ({ ...clone(variant), statement_type: 'context', details: { actor: null, timeframe: null, deliverable: null } })) }];
        }
      }
      if (letter === 'C' && current) {
        const topic = taxonomy.topics.find(item => item.id === 'AGR-01');
        input.claims = input.claims.filter(claim => claim.primary_topic_id !== topic.id);
        const unresolved = demoClaim({ id: 'SYN-C-water-uncertain-actor', topic, document: documents[1], points: 4, title: 'Canal programme: responsibility differs between source assertions', actorText: 'Ministry of Agriculture', whatText: '30 km of irrigation canals' });
        const alternative = clone(unresolved.variants[0]); alternative.id += '-alternative'; alternative.details.actor.role = 'supporting';
        const alternativeRecord = { id: `${unresolved.id}-R-alternative`, document_id: documents[1].id, page: 4, quote: 'The Ministry of Agriculture will support the rehabilitation of 30 km of irrigation canals during 2026–2030; the responsible implementing institution is not specified here.' };
        unresolved.source_records.push(alternativeRecord); alternative.evidence_ids = [alternativeRecord.id];
        Object.values(alternative.details).filter(Boolean).forEach(detail => { detail.evidence_ids = [alternativeRecord.id]; });
        unresolved.variants.push(alternative); unresolved.conflicts = [{ description: 'One source assertion assigns responsibility; the other identifies only a supporting role. Qualification is unresolved.', source_record_ids: unresolved.source_records.map(record => record.id) }];
        input.claims.push(unresolved);
      }
      return input;
    };
    const previousInput = createInput(false), currentInput = createInput(true);
    inputs.push(previousInput, currentInput);
    const previous = calculate(previousInput), current = calculate(currentInput);
    const change_event = { kind: letter === 'A' ? 'ordinary_upload' : 'same_family_edition_update' };
    const documents = currentInput.documents.map(document => {
      const localInput = documentInput(currentInput, document); inputs.push(localInput);
      return { id: document.id, title: document.title, role: document.role, year: document.year, assessment: calculate(localInput) };
    });
    countries.push({ id: countryId, name: `Country ${letter}`, description: 'Invented demonstration; no real country assessment', change_event, previous, current: attachChanges(previous, current, change_event), documents });
  });
  return { version: rules.version, status: rules.status, synthetic: true, description: 'Entirely invented evidence for reviewing the calculation and dashboard. All country comparisons are demonstrations.', taxonomy, countries, inputs };
}

if (process.argv.includes('--generate-examples')) {
  const bundle = generateExamples();
  writeFileSync(new URL('./examples.json', import.meta.url), JSON.stringify(bundle, null, 2) + '\n');
  process.stdout.write(`Generated ${bundle.countries.length} synthetic countries, ${bundle.taxonomy.domains.length} domains, ${bundle.taxonomy.topics.length} topics and ${bundle.inputs.length} assessments.\n`);
}

// Recompute saved normalized examples without calling an LLM or fetching any data.
if (process.argv.includes('--recompute-examples')) {
  const path = new URL('./examples.json', import.meta.url);
  const bundle = JSON.parse(readFileSync(path, 'utf8'));
  const assessed = new Map(bundle.inputs.map(input => [input.snapshot_id, calculate(input)]));
  bundle.countries.forEach(country => {
    const previous = assessed.get(country.previous.snapshot_id), current = assessed.get(country.current.snapshot_id);
    country.previous = previous; country.current = attachChanges(previous, current, country.change_event);
    country.documents.forEach(document => { document.assessment = assessed.get(document.assessment.snapshot_id); });
  });
  writeFileSync(path, JSON.stringify(bundle, null, 2) + '\n');
  process.stdout.write(`Recomputed ${bundle.inputs.length} synthetic assessments at ${fileURLToPath(path)}\n`);
}
