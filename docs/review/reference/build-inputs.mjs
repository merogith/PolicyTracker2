// Offline reference only. No SDK, network, credential access or application imports.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const REVIEW_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const COMMON = ['pipeline/taxonomy.json', 'pipeline/labels.json', 'pipeline/pipeline.json', 'pipeline/llm-contracts.json'];
const PROMPTS = { extract: 'pipeline/prompts/extract.md', organize: 'pipeline/prompts/organize.md', retag: 'pipeline/maintenance/retag.md' };
export const ALLOWED_FILES = Object.freeze([...COMMON, ...Object.values(PROMPTS)]);
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const json = value => JSON.stringify(value, null, 2);
const fail = message => { throw new Error(message); };
const own = (o, key) => Object.prototype.hasOwnProperty.call(o, key);
const unique = (xs, label) => { if (new Set(xs).size !== xs.length) fail(`Duplicate ${label}`); };
const keys = (o, allowed, label) => {
  if (!o || typeof o !== 'object' || Array.isArray(o)) fail(`${label} must be an object`);
  for (const k of Object.keys(o)) if (!allowed.includes(k)) fail(`${label}: unexpected field ${k}`);
};
const str = (x, label) => { if (typeof x !== 'string' || !x.trim()) fail(`${label} must be a nonempty string`); };

export function loadAllowedFile(relativePath, root = REVIEW_ROOT) {
  if (!ALLOWED_FILES.includes(relativePath)) fail(`File is not on LLM allowlist: ${relativePath}`);
  const filename = path.resolve(root, ...relativePath.split('/'));
  // Do not permit an allowed filename to redirect into an archive through a symlink.
  if (fs.realpathSync(filename).toLowerCase() !== filename.toLowerCase()) fail(`Redirected allowlist file: ${relativePath}`);
  return fs.readFileSync(filename, 'utf8');
}

function load(stage, root) {
  if (!['extract', 'organize'].includes(stage)) fail('The offline builder implements extract and organize only');
  const files = [PROMPTS[stage], ...COMMON];
  const raw = Object.fromEntries(files.map(f => [f, loadAllowedFile(f, root)]));
  const data = {
    taxonomy: JSON.parse(raw['pipeline/taxonomy.json']), labels: JSON.parse(raw['pipeline/labels.json']),
    settings: JSON.parse(raw['pipeline/pipeline.json']), contracts: JSON.parse(raw['pipeline/llm-contracts.json']),
  };
  const declared = data.contracts.input_allowlist[stage];
  if (json([...declared].sort()) !== json([...files].sort())) fail('Input allowlist does not match compiled reader');
  for (const [name, value] of Object.entries(data)) if (value.version !== '3.0.0') fail(`Unexpected ${name} version`);
  unique(data.taxonomy.topics.map(t => t.id), 'topic ID');
  unique(data.taxonomy.domains.map(d => d.id), 'domain ID');
  for (const t of data.taxonomy.topics) if (!data.taxonomy.domains.some(d => d.id === t.home_domain_id)) fail(`Unknown topic home: ${t.id}`);
  return { ...data, prompt: raw[PROMPTS[stage]], file_manifest: files.map(f => ({ path: f, sha256: sha(raw[f]) })) };
}

function enumValues(expression, data) {
  let value = data;
  for (const part of expression.split('.')) value = value?.[part];
  if (!Array.isArray(value) || !value.length) fail(`Empty/unknown vocabulary ${expression}`);
  return value.map(v => typeof v === 'object' ? v.id : v);
}
const objectSchema = properties => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
const nullable = schema => ({ anyOf: [schema, { type: 'null' }] });
const textSchema = { type: 'string' };
const refsSchema = { type: 'array', items: textSchema };

export function compileSchema(template, data) {
  if (Array.isArray(template)) return template.map(v => compileSchema(v, data));
  if (!template || typeof template !== 'object') return template;
  if (template.$enum_from) return { type: 'string', enum: enumValues(template.$enum_from, data) };
  if (template.$enabled_facets) {
    const props = {};
    for (const [name, facet] of Object.entries(data.labels.facets)) {
      if (!facet.enabled) continue;
      const values = { type: 'string', enum: facet.options.map(v => typeof v === 'object' ? v.id : v) };
      props[name] = facet.selection === 'one_or_null' ? nullable(values) : { type: 'array', items: values };
    }
    return objectSchema(props);
  }
  if (template.$priority_evidence) {
    return data.labels.priority_evidence?.enabled
      ? nullable(objectSchema({ text: textSchema, evidence_refs: refsSchema })) : { type: 'null' };
  }
  return Object.fromEntries(Object.entries(template).map(([k, v]) => [k, compileSchema(v, data)]));
}

export function renderTemplate(template, variables) {
  // One pass: source text containing {{...}} is never reinterpreted as a template.
  return template.replace(/\{\{([^{}]+)\}\}/g, (_, rawName) => {
    const name = rawName.trim();
    if (!own(variables, name)) fail(`Unfilled placeholder ${name}`);
    return String(variables[name]);
  });
}
function sections(markdown) {
  const match = markdown.match(/## System instructions\s*\n([\s\S]*?)\n## User input\s*\n([\s\S]*)$/);
  if (!match) fail('Prompt must have System instructions and User input sections');
  return { instructions: match[1].trim(), user: match[2].trim() };
}

function topicView(taxonomy, domainId, global = true) {
  const domain = taxonomy.domains.find(d => d.id === domainId);
  if (!domain) fail(`Unknown domain ${domainId}`);
  const detailed = taxonomy.topics.filter(t => t.home_domain_id === domainId || t.placements.some(p => p.domain === domainId));
  const adjacentIds = new Set(detailed.flatMap(t => (t.routing ?? []).flatMap(r => String(r.use).match(/[A-Z]{3}-\d{2}/g) ?? [])));
  const details = [...detailed, ...taxonomy.topics.filter(t => adjacentIds.has(t.id) && !detailed.some(d => d.id === t.id))];
  const detailObject = {
    scope: taxonomy.rules[0],
    current_domain: { id: domain.id, label: domain.label, definition: domain.definition },
    detailed_topics: details.map(t => ({ id: t.id, definition: t.definition, routing: t.routing ?? [] })),
  };
  if (!global) return json(detailObject);
  return [taxonomy.rules[0], 'All allowed topic IDs (including other domains):',
    ...taxonomy.topics.map(t => `${t.id} ${t.label}: ${t.definition}`),
    'Current-domain and adjacent detail:', JSON.stringify(detailObject)].join('\n');
}
function enabledLabels(labels) {
  return {
    statement_type: labels.statement_type.options, facets: Object.fromEntries(Object.entries(labels.facets).filter(([, v]) => v.enabled)),
    fact_enums: labels.fact_enums, actor_roles: labels.actor_roles, delivery_enums: labels.delivery_enums,
    priority_evidence: labels.priority_evidence?.enabled ? { enabled: true, meaning: 'Explicit unranked source wording only; not a score or undertaking.' } : { enabled: false },
  };
}

function validateManifest(manifest, settings) {
  keys(manifest, ['id', 'country_iso3', 'source_document_ids', 'documents', 'required_document_roles', 'as_of_date'], 'manifest');
  str(manifest.id, 'manifest.id'); str(manifest.country_iso3, 'country_iso3'); str(manifest.as_of_date, 'as_of_date');
  if (!/^[A-Z]{3}$/.test(manifest.country_iso3)) fail('country_iso3 must be three letters');
  if (!Array.isArray(manifest.documents) || !manifest.documents.length) fail('Explicit document inventory required');
  if (!Array.isArray(manifest.source_document_ids)) fail('Explicit source_document_ids required');
  unique(manifest.source_document_ids, 'source document ID');
  const allowed = settings.source_scope.initial_document_roles;
  const docKeys = ['document_id', 'title', 'kind', 'edition_date', 'language'];
  for (const d of manifest.documents) {
    keys(d, docKeys, 'document'); str(d.document_id, 'document_id'); str(d.title, 'document title');
    if (!allowed.includes(d.kind)) fail(`Document role requires an opt-in profile: ${d.kind}`);
    for (const k of ['edition_date', 'language']) if (d[k] !== null && typeof d[k] !== 'string') fail(`Invalid document ${k}`);
  }
  const ids = manifest.documents.map(d => d.document_id); unique(ids, 'inventory document ID');
  if (json([...ids].sort()) !== json([...manifest.source_document_ids].sort())) fail('Manifest inventory must match selected source_document_ids exactly');
  if (!Array.isArray(manifest.required_document_roles)) fail('Explicit required document roles needed; supplied-all exploration may use []');
  if (manifest.required_document_roles.some(r => !allowed.includes(r))) fail('Unsupported required document role');
  return manifest.required_document_roles.filter(role => !manifest.documents.some(d => d.kind === role));
}

function validateSourceUnits(units, documentId) {
  if (!Array.isArray(units)) fail('source_units must be an array');
  if (!units.length) fail('No source units: code records the bounded-search outcome without an LLM call');
  unique(units.map(u => u.source_unit_id), 'source-unit ID');
  const ids = new Set(units.map(u => u.source_unit_id));
  for (const u of units) {
    keys(u, ['source_unit_id', 'document_id', 'page', 'kind', 'text', 'context_unit_ids'], 'source unit');
    str(u.source_unit_id, 'source_unit_id'); str(u.text, 'source text');
    if (u.document_id !== documentId) fail('Source unit belongs to another document');
    if (!Number.isInteger(u.page) || u.page < 1) fail('Source unit needs a physical page number');
    if (!['body', 'section_header', 'table_header', 'footnote'].includes(u.kind)) fail('Unknown source-unit kind');
    if (!Array.isArray(u.context_unit_ids) || u.context_unit_ids.some(id => !ids.has(id))) fail('Missing source context unit');
  }
}

const RECORD_KEYS = ['record_id', 'document_id', 'statement', 'statement_type', 'primary_topic_id', 'secondary_topic_ids', 'policy_object_as_stated', 'scope_as_stated', 'conditionality', 'labels', 'facts', 'delivery', 'priority_evidence', 'evidence'];
function validatePack(options, data) {
  const owned = options.owned_records, context = options.context_only_records;
  if (!Array.isArray(owned) || !Array.isArray(context)) fail('Explicit owned_records and context_only_records arrays required');
  if (!owned.length) fail('No owned records: skip this organization call in code');
  const records = [...owned, ...context]; unique(records.map(r => r.record_id), 'record ID / ownership');
  const topics = new Map(data.taxonomy.topics.map(t => [t.id, t]));
  const evidenceIds = [];
  for (const record of records) {
    keys(record, RECORD_KEYS, 'record'); str(record.record_id, 'record_id'); str(record.statement, 'record statement');
    if (!options.manifest.source_document_ids.includes(record.document_id)) fail('Record outside selected source manifest');
    if (!topics.has(record.primary_topic_id)) fail(`Unknown/unmapped record topic ${record.primary_topic_id}; retain unmapped in the code bucket`);
    for (const id of record.secondary_topic_ids ?? []) if (!topics.has(id)) fail(`Unknown secondary topic ${id}`);
    const isOwned = owned.includes(record);
    if (isOwned && topics.get(record.primary_topic_id).home_domain_id !== options.domain_id) fail('Owned record belongs to another home domain');
    if (!data.labels.statement_type.options.some(t => t.id === record.statement_type)) fail('Unknown statement_type');
    const facetKeys = Object.entries(data.labels.facets).filter(([, f]) => f.enabled).map(([key]) => key);
    keys(record.labels ?? {}, facetKeys, 'enabled record labels');
    for (const [key, value] of Object.entries(record.labels ?? {})) {
      const facet = data.labels.facets[key];
      const values = Array.isArray(value) ? value : value === null ? [] : [value];
      if (values.some(v => !facet.options.includes(v))) fail('Unknown facet choice');
    }
    if (!Array.isArray(record.facts)) fail('facts must be an array');
    for (const fact of record.facts) keys(fact, ['fact_type', 'metric', 'value_as_stated', 'unit', 'period', 'baseline_as_stated', 'geography_or_system', 'scenario', 'comparator', 'direction', 'basis', 'total_or_additional', 'conditionality', 'finance_status', 'evidence_ids'], 'organization fact');
    keys(record.delivery, ['actor', 'timeframe', 'deliverable'], 'delivery');
    for (const [kind, value] of Object.entries(record.delivery)) if (value !== null) {
      keys(value, ['text', 'evidence_ids', ...(kind === 'actor' ? ['role'] : kind === 'timeframe' ? ['anchor'] : ['kind'])], 'delivery detail');
    }
    if (record.priority_evidence !== null) keys(record.priority_evidence, ['text', 'evidence_ids'], 'priority evidence');
    if (!Array.isArray(record.evidence) || !record.evidence.length) fail('Organization requires eligible source evidence');
    for (const e of record.evidence) {
      keys(e, ['evidence_id', 'document_id', 'source_unit_id', 'page', 'quote'], 'evidence');
      str(e.evidence_id, 'evidence_id'); str(e.quote, 'evidence quote');
      if (e.document_id !== record.document_id) fail('Source record contains evidence from another document');
      if (!Number.isInteger(e.page) || e.page < 1) fail('Invalid evidence page');
      evidenceIds.push(e.evidence_id);
    }
  }
  const byEvidence = new Map();
  for (const r of records) for (const e of r.evidence) {
    if (byEvidence.has(e.evidence_id) && json(byEvidence.get(e.evidence_id)) !== json(e)) fail('Conflicting evidence identity');
    byEvidence.set(e.evidence_id, e);
  }
  if (!Array.isArray(options.prior_claim_candidates)) fail('prior_claim_candidates must be explicit');
  unique(options.prior_claim_candidates.map(c => c.claim_id), 'prior claim ID');
  for (const c of options.prior_claim_candidates) {
    keys(c, ['claim_id', 'title', 'record_ids'], 'prior identity candidate'); str(c.claim_id, 'claim_id');
    if (!Array.isArray(c.record_ids) || c.record_ids.some(id => !records.some(r => r.record_id === id))) fail('Prior candidate references an absent record');
  }
  return { records, evidenceIds: [...new Set(evidenceIds)] };
}

export function buildRequest(options, { root = REVIEW_ROOT } = {}) {
  const common = ['stage', 'manifest', 'domain_id', 'model_context_window_tokens'];
  const allowed = options.stage === 'extract' ? [...common, 'document_id', 'source_units', 'queries'] : [...common, 'owned_records', 'context_only_records', 'prior_claim_candidates'];
  keys(options, allowed, 'builder options');
  const data = load(options.stage, root);
  if (!Number.isInteger(options.model_context_window_tokens) || options.model_context_window_tokens <= 0) fail('Explicit model_context_window_tokens required for the offline estimate');
  const missingRoles = validateManifest(options.manifest, data.settings);
  const schema = compileSchema(data.contracts.schema_templates[options.stage], data);
  const variables = {};
  let payloadCharacters;
  let context;
  if (options.stage === 'extract') {
    const doc = options.manifest.documents.find(d => d.document_id === options.document_id);
    if (!doc) fail('Extraction document outside selected manifest');
    validateSourceUnits(options.source_units, doc.document_id);
    if (!Array.isArray(options.queries) || options.queries.some(q => typeof q !== 'string')) fail('Explicit code-selected queries required');
    variables.taxonomy_extract_view = topicView(data.taxonomy, options.domain_id, true);
    variables.enabled_labels_json = JSON.stringify(enabledLabels(data.labels));
    // Country snapshot IDs/cutoffs are provenance, not changing extraction semantics.
    variables.document_metadata_json = json({ country_iso3: options.manifest.country_iso3, document: doc });
    variables.domain_question_and_queries = json({ domain_id: options.domain_id, question: `What does this source say about ${data.taxonomy.domains.find(d => d.id === options.domain_id).label}?`, queries: options.queries });
    variables.source_units_json = json(options.source_units);
    payloadCharacters = variables.source_units_json.length;
    context = { source_units: options.source_units };
  } else {
    const pack = validatePack(options, data);
    variables.organization_taxonomy_and_labels = json({ taxonomy: JSON.parse(topicView(data.taxonomy, options.domain_id, false)), relationship_types: data.labels.relationship_types, comparability: data.labels.comparability });
    const usedDocumentIds = new Set(pack.records.map(r => r.document_id));
    variables.country_and_documents_json = json({ country_iso3: options.manifest.country_iso3, domain_id: options.domain_id, documents: options.manifest.documents.filter(d => usedDocumentIds.has(d.document_id)) });
    variables.prior_claim_candidates_json = json(options.prior_claim_candidates);
    variables.record_pack_json = json({ owned_records: options.owned_records, context_only_records: options.context_only_records });
    payloadCharacters = variables.record_pack_json.length + variables.prior_claim_candidates_json.length;
    context = { records: pack.records, owned_record_ids: options.owned_records.map(r => r.record_id), evidence_ids: pack.evidenceIds, prior_claim_ids: options.prior_claim_candidates.map(c => c.claim_id) };
  }
  const parts = sections(data.prompt);
  const instructions = renderTemplate(parts.instructions, variables);
  const user = renderTemplate(parts.user, variables);
  const config = options.stage === 'extract' ? data.settings.extraction : data.settings.organization;
  const divisor = data.settings.budgets.chars_per_token_estimate;
  const schemaCharacters = JSON.stringify(schema).length;
  const inputEstimate = Math.ceil((instructions.length + user.length + schemaCharacters) / divisor);
  const payloadEstimate = Math.ceil(payloadCharacters / divisor);
  const hard = options.stage === 'extract' ? config.source_tokens_hard : config.input_tokens_hard;
  const target = options.stage === 'extract' ? config.source_tokens_target : config.input_tokens_target;
  if (payloadEstimate > hard) fail(`Split required: ${options.stage} source/record estimate ${payloadEstimate} exceeds hard ${hard}; no silent truncation`);
  const totalEstimate = inputEstimate + config.max_output_tokens + data.settings.budgets.safety_margin_tokens;
  if (totalEstimate > options.model_context_window_tokens) fail(`Split required: estimated full context ${totalEstimate} exceeds supplied model window ${options.model_context_window_tokens}`);
  const request = {
    instructions, input: [{ role: 'user', content: [{ type: 'input_text', text: user }] }],
    text: { format: { type: 'json_schema', name: `${options.stage}_records_v3`, strict: true, schema } },
    max_output_tokens: config.max_output_tokens, store: false,
  };
  return {
    version: '3.0.0', status: 'offline_reference_not_active', stage: options.stage, model_role: options.stage,
    model_selection: 'Dispatch must add the configured supported model; no model or SDK is invoked by this builder.',
    request, provenance: {
      input_files: data.file_manifest, prompt_sha256: sha(instructions + '\n' + user), schema_sha256: sha(json(schema)),
      request_sha256: sha(json(request)), source_manifest_id: options.manifest.id,
      source_document_ids: options.manifest.source_document_ids,
    },
    diagnostics: {
      character_estimate_only: true, chars_per_token_estimate: divisor,
      prompt_and_schema_characters: instructions.length + user.length + schemaCharacters,
      estimated_input_tokens: inputEstimate, estimated_source_or_record_tokens: payloadEstimate,
      target_tokens: target, hard_tokens: hard, above_target: payloadEstimate > target,
      reserved_output_tokens: config.max_output_tokens, safety_margin_tokens: data.settings.budgets.safety_margin_tokens,
      estimated_total_context: totalEstimate, supplied_model_window_tokens: options.model_context_window_tokens,
      missing_required_roles: missingRoles, source_profile_complete: missingRoles.length === 0,
      matched_comparison_certified: false,
      processing_complete: null, coverage_owner: 'Application job/source manifest; never a model output.',
      production_requirement: 'Use the chosen model tokenizer and provider limits before dispatch; these character estimates are not exact token counts.',
    },
    validation_context: context,
  };
}

// Small validator for the deliberately small JSON Schema keyword set emitted above.
export function assertMatchesSchema(value, schema, where = '$') {
  if (schema.anyOf) {
    for (const branch of schema.anyOf) { try { assertMatchesSchema(value, branch, where); return; } catch {} }
    fail(`${where}: does not match any allowed type`);
  }
  const type = schema.type;
  if (type === 'null') { if (value !== null) fail(`${where}: expected null`); return; }
  if (type === 'object') {
    keys(value, Object.keys(schema.properties), where);
    for (const key of schema.required) if (!own(value, key)) fail(`${where}: missing ${key}`);
    for (const [key, child] of Object.entries(schema.properties)) assertMatchesSchema(value[key], child, `${where}/${key}`);
  } else if (type === 'array') {
    if (!Array.isArray(value)) fail(`${where}: expected array`);
    value.forEach((item, i) => assertMatchesSchema(item, schema.items, `${where}/${i}`));
  } else if (type === 'string') {
    if (typeof value !== 'string') fail(`${where}: expected string`);
    if (schema.enum && !schema.enum.includes(value)) fail(`${where}: unknown enum value ${value}`);
  } else fail(`Unsupported reference schema type ${type}`);
}
// NFC preserves compatibility characters such as superscript digits; never strip signs/ranges.
const normalizedQuote = s => s.normalize('NFC').replace(/\s+/g, ' ').trim();
// Recognize common numeric expressions before allowing a quoted subspan. A raw
// substring must not cut off an adjacent sign, comparator, percent or range end.
// This is a conservative reference guard, not a universal multilingual quantity parser.
function numericSpans(text) {
  const number = String.raw`[+−-]?\s*\d+(?:(?:[.,]\d+)|(?:[ \u00a0]\d{3}(?!\d)))*(?:[eE][+−-]?\d+)?`;
  const percent = String.raw`(?:\s*(?:%|percent\b|per\s+cent\b))?`;
  const comparator = String.raw`(?:(?:no\s+less\s+than|at\s+least|at\s+most|less\s+than|more\s+than|up\s+to|approximately|about|over|under|[<>≤≥])\s*)?`;
  const expression = new RegExp(String.raw`(?:between\s+${number}${percent}\s+and\s+${number}${percent}|${comparator}${number}${percent}(?:\s*(?:[–—−-]|to\b)\s*${number}${percent})?)`, 'gi');
  const spans = [];
  for (const match of text.matchAll(expression)) {
    const leading = match[0].length - match[0].trimStart().length;
    const trailing = match[0].length - match[0].trimEnd().length;
    spans.push([match.index + leading, match.index + match[0].length - trailing]);
  }
  return spans;
}
export function preservesSourceSpan(source, quotation) {
  const whole = normalizedQuote(source), part = normalizedQuote(quotation);
  if (!part) return false;
  const spans = numericSpans(whole);
  let start = whole.indexOf(part);
  while (start >= 0) {
    const end = start + part.length;
    const cutsNumber = spans.some(([left, right]) => left < end && right > start && (left < start || right > end));
    if (!cutsNumber) return true;
    start = whole.indexOf(part, start + 1);
  }
  return false;
}
export function factualLeafPaths(record) {
  const result = [];
  const walk = (value, pointer) => {
    if (value === null) return;
    if (Array.isArray(value)) { value.forEach((v, i) => walk(v, `${pointer}/${i}`)); return; }
    if (typeof value === 'object') {
      for (const [key, v] of Object.entries(value)) {
        if (['local_ref', 'evidence_refs', 'field_evidence'].includes(key)) continue;
        walk(v, `${pointer}/${key.replace(/~/g, '~0').replace(/\//g, '~1')}`);
      }
    } else if (typeof value === 'string' && value !== 'not_stated') result.push(pointer);
  };
  walk(record, ''); return result;
}
const pointerValue = (o, pointer) => {
  if (typeof pointer !== 'string' || !pointer.startsWith('/')) fail('Invalid provenance JSON Pointer');
  let value = o;
  for (const token of pointer.slice(1).split('/').map(x => x.replace(/~1/g, '/').replace(/~0/g, '~'))) {
    if (['__proto__', 'prototype', 'constructor'].includes(token) || value === null || !own(value, token)) fail(`Unresolved provenance pointer ${pointer}`);
    value = value[token];
  }
  if (value === null) fail(`Provenance points to null: ${pointer}`);
  return value;
};

export function validateOutput(built, output) {
  assertMatchesSchema(output, built.request.text.format.schema);
  if (built.stage === 'extract') {
    const units = new Map(built.validation_context.source_units.map(u => [u.source_unit_id, u]));
    unique(output.evidence.map(e => e.local_ref), 'local evidence reference');
    unique(output.records.map(r => r.local_ref), 'local record reference');
    const evidence = new Map(output.evidence.map(e => [e.local_ref, e]));
    for (const e of output.evidence) {
      str(e.local_ref, 'local evidence ref'); str(e.quote, 'quote');
      if (!units.has(e.source_unit_id)) fail('Unknown source_unit_id');
      if (!preservesSourceSpan(units.get(e.source_unit_id).text, e.quote)) fail('Quote does not preserve the supplied source text or complete numeric span');
    }
    for (const r of output.records) {
      str(r.local_ref, 'record local_ref'); str(r.statement, 'statement');
      if (!r.evidence_refs.length) fail('Record has no supporting evidence');
      if (r.primary_topic_id === null && !r.unmapped_concepts.length) fail('Relevant unmapped record needs an unmapped concept');
      unique(r.secondary_topic_ids, 'secondary topic');
      if (r.secondary_topic_ids.includes(r.primary_topic_id)) fail('Primary topic duplicated as secondary');
      const checkRefs = refs => { if (!refs.length || refs.some(id => !evidence.has(id) || !r.evidence_refs.includes(id))) fail('Invalid field/evidence reference'); };
      if (r.evidence_refs.some(id => !evidence.has(id))) fail('Unknown record evidence reference');
      for (const f of r.field_evidence) { pointerValue(r, f.path); checkRefs(f.evidence_refs); }
      unique(r.field_evidence.map(f => f.path), 'field provenance path');
      for (const pointer of factualLeafPaths(r)) {
        str(pointerValue(r, pointer), `Factual field ${pointer}`);
        if (!r.field_evidence.some(f => f.path === pointer)) fail(`Factual provenance missing: ${pointer}`);
      }
      const checkStatedText = (value, pointer) => {
        if (value === null) return;
        const refs = r.field_evidence.find(f => f.path === pointer)?.evidence_refs ?? [];
        if (!refs.some(id => preservesSourceSpan(evidence.get(id).quote, value))) fail(`As-stated field changes its source wording: ${pointer}`);
      };
      for (const field of ['policy_object_as_stated', 'scope_as_stated']) checkStatedText(r[field], `/${field}`);
      for (const [index, fact] of r.facts.entries()) {
        checkRefs(fact.evidence_refs);
        if (!fact.evidence_refs.some(id => preservesSourceSpan(evidence.get(id).quote, fact.value_as_stated))) fail('Figure changes or crops source value/sign/range/comparator');
        for (const field of ['value_as_stated', 'unit', 'period', 'baseline_as_stated', 'geography_or_system', 'scenario']) checkStatedText(fact[field], `/facts/${index}/${field}`);
      }
      for (const detail of [...Object.values(r.delivery), r.priority_evidence]) if (detail !== null) {
        checkRefs(detail.evidence_refs);
        if (!detail.evidence_refs.some(id => preservesSourceSpan(evidence.get(id).quote, detail.text))) fail('Detail wording not present in its quote with complete numeric span');
      }
    }
  } else {
    const c = built.validation_context, owned = new Set(c.owned_record_ids), known = new Set(c.records.map(r => r.record_id)), evidence = new Set(c.evidence_ids);
    const used = [];
    unique(output.claims.map(x => x.local_ref), 'local claim ref');
    const variantRefs = [];
    for (const claim of output.claims) {
      str(claim.local_ref, 'claim local ref'); str(claim.title, 'claim title');
      if (!claim.variants.length) fail('Claim has no variants');
      if (claim.suggested_prior_claim_id !== null && !c.prior_claim_ids.includes(claim.suggested_prior_claim_id)) fail('Unknown prior claim ID');
      for (const variant of claim.variants) {
        variantRefs.push(variant.local_ref);
        if (!variant.record_ids.length) fail('Variant has no owned record');
        for (const id of variant.record_ids) { if (!owned.has(id)) fail('Context-only/unknown record cannot gain ownership'); used.push(id); }
        if (variant.detail_record_ids.some(id => !known.has(id))) fail('Unknown detail record');
        if (variant.association_evidence_ids.some(id => !evidence.has(id))) fail('Unknown association evidence');
        if (variant.detail_record_ids.some(id => !variant.record_ids.includes(id)) && !variant.association_evidence_ids.length) fail('Cross-record detail admission requires association evidence');
      }
    }
    unique(variantRefs, 'local variant ref');
    for (const r of output.retained_records) { if (!owned.has(r.record_id)) fail('Unknown retained record'); str(r.reason, 'retained reason'); used.push(r.record_id); }
    unique(used, 'owned record membership');
    if (used.length !== owned.size || c.owned_record_ids.some(id => !used.includes(id))) fail('Owned record accounting incomplete');
    for (const relation of output.relationships) {
      if (!known.has(relation.from_record_id) || !known.has(relation.to_record_id)) fail('Unknown relationship endpoint');
      if (relation.from_record_id === relation.to_record_id) fail('Self relationship');
      if (!relation.evidence_ids.length || relation.evidence_ids.some(id => !evidence.has(id))) fail('Relationship evidence missing');
      if (relation.type === 'contradicts' && relation.comparability !== 'comparable') fail('Contradiction requires explicit comparable status');
    }
  }
  return output;
}

export function syntheticOptions() {
  const manifest = { id: 'SYNTHETIC-MANIFEST-1', country_iso3: 'XEX', source_document_ids: ['XEX-NDC-2025', 'XEX-NAP-2026'], required_document_roles: ['NDC', 'NAP'], as_of_date: '2026-10-19', documents: [
    { document_id: 'XEX-NDC-2025', title: 'Synthetic NDC', kind: 'NDC', edition_date: '2025-01-01', language: 'en' },
    { document_id: 'XEX-NAP-2026', title: 'Synthetic NAP', kind: 'NAP', edition_date: '2026-01-01', language: 'en' },
  ] };
  const q1 = 'The government will expand efficient irrigation to a total of 100,000 hectares countrywide by 2030, without conditions.';
  const q2 = 'The government will expand efficient irrigation to a total of 80,000 hectares countrywide by 2030, without conditions.';
  const makeRecord = (record_id, document_id, evidence_id, quote, amount) => ({
    record_id, document_id, statement: `Efficient irrigation target: ${amount} hectares countrywide by 2030.`, statement_type: 'commitment', primary_topic_id: 'AGR-01', secondary_topic_ids: [], policy_object_as_stated: 'efficient irrigation', scope_as_stated: 'countrywide', conditionality: 'unconditional', labels: {},
    facts: [{ metric: 'total efficient irrigation area', value_as_stated: `${amount} hectares`, unit: 'hectares', period: '2030', basis: 'absolute', total_or_additional: 'total', conditionality: 'unconditional' }], delivery: { actor: null, timeframe: null, deliverable: null }, priority_evidence: null,
    evidence: [{ evidence_id, document_id, source_unit_id: `${document_id}:p10:body`, page: 10, quote }],
  });
  return {
    extract: { stage: 'extract', manifest, domain_id: 'agriculture', document_id: 'XEX-NDC-2025', model_context_window_tokens: 64000, queries: ['efficient irrigation climate adaptation targets'], source_units: [{ source_unit_id: 'XEX-NDC-2025:p10:body', document_id: 'XEX-NDC-2025', page: 10, kind: 'body', text: q1, context_unit_ids: [] }] },
    organize: { stage: 'organize', manifest, domain_id: 'agriculture', model_context_window_tokens: 64000, owned_records: [makeRecord('R1', 'XEX-NDC-2025', 'E1', q1, '100,000'), makeRecord('R2', 'XEX-NAP-2026', 'E2', q2, '80,000')], context_only_records: [], prior_claim_candidates: [] },
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.slice(2).join(' ') !== '--write-examples') fail('Usage: node reference/build-inputs.mjs --write-examples');
  const options = syntheticOptions();
  for (const [stage, filename] of [['extract', 'extraction-request.json'], ['organize', 'organization-request.json']]) {
    const built = buildRequest(options[stage]);
    fs.writeFileSync(path.join(REVIEW_ROOT, 'examples', filename), json({ synthetic: true, warning: 'Invented source text; offline request preview, not a provider call or runtime capture.', builder_input: options[stage], ...built }) + '\n');
    process.stdout.write(`${filename}: estimated input ${built.diagnostics.estimated_input_tokens}; actual measured provider tokens unavailable\n`);
  }
}
