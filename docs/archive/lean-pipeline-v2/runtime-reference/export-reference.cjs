// Offline review exporter. Requires Node >=24; no network, database or model call.
// Exact source copies remain unchanged. TypeScript is stripped only in memory to render prompts.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');

const root = path.resolve(__dirname, '../../../..');
const folder = __dirname;
const definitions = [
  ['src/lib/analysis/prompt.ts', 'active_prompt_builder', 'All extraction, synthesis, retag and retry wording.'],
  ['src/lib/analysis/schemas.ts', 'active_output_schema_builder', 'Zod schemas converted to strict JSON schema by the gateway.'],
  ['src/lib/analysis/run.ts', 'active_extraction_assembly', 'Document metadata, taxonomy, schema and document-only search filter.'],
  ['src/lib/analysis/synthesise.ts', 'active_synthesis_assembly', 'Serializes prior findings; removes quotes/topic tags; restores citations by reference.'],
  ['src/lib/analysis/retag.ts', 'active_maintenance_assembly', 'Current-taxonomy relabeling of stored finding text and quotes.'],
  ['src/lib/analysis/call.ts', 'active_call_and_repair', 'JSON/schema parsing and one repair attempt.'],
  ['src/lib/openai.ts', 'active_gateway', 'Responses API request settings, model environment variables, file search and structured output.'],
  ['src/lib/taxonomy.ts', 'active_taxonomy_assembly', 'Loads DB taxonomy; renders topic text, domain question and search hints.'],
  ['fresh-start/config/taxonomy.json', 'seed_not_live_taxonomy_snapshot', 'Initial 16-domain, 64-topic seed. Runtime topic/domain data comes from the database after seeding.'],
  ['src/lib/ingest.ts', 'active_source_preparation', 'Page file names/text/metadata; upload and indexing; queues domain jobs.'],
  ['src/lib/pdf.ts', 'active_page_extraction', 'PDF page text extraction before upload; no OCR.'],
  ['src/lib/domain.ts', 'active_source_enumerations', 'Document kinds and page readability threshold.'],
  ['src/lib/analysis/verify.ts', 'active_post_model_check_not_prompt', 'Normalized source quote matching and page correction; not sent to the LLM.'],
  ['src/lib/scoring.ts', 'active_post_model_scoring_not_prompt', 'Existing numeric topic scores and domain sums; not sent to the LLM.'],
  ['config/scoring/rubric.json', 'active_post_model_rubric_not_prompt', 'Existing rubric v2.0.2 (-1/0/+1), not the proposed four bands.'],
];
const manifest = {
  id: 'current-runtime-reference',
  captured_on: '2026-10-19',
  source_workspace: 'D:/Policy-tracker-main',
  purpose: 'Read-only reference copies of current source; application does not load this folder.',
  prompt_version: '2026-10-18.4',
  taxonomy_seed_version: '0.1.0-draft',
  database_snapshot_available: false,
  deployed_environment_available: false,
  actual_country_request_available: false,
  live_configuration_warning: 'DB taxonomy and environment model/settings values may differ. These exports are synthetic seed renders, not captured production requests.',
  copied_files: [],
};
for (const [relative, role, description] of definitions) {
  const source = path.join(root, relative);
  const dest = path.join(folder, 'source', relative);
  const bytes = fs.readFileSync(source);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, bytes);
  manifest.copied_files.push({
    original_path: relative,
    reference_copy: 'source/' + relative,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    bytes: bytes.length,
    role,
    description,
  });
}
const seed = JSON.parse(fs.readFileSync(path.join(folder, 'source/fresh-start/config/taxonomy.json'), 'utf8'));
const context = vm.createContext({ taxonomyJson: seed, cache: x => x, JSON, Map, Set });
for (const file of ['src/lib/taxonomy.ts', 'src/lib/analysis/prompt.ts']) {
  const source = fs.readFileSync(path.join(folder, 'source', file), 'utf8')
    .replace(/^import .*;\r?\n/gm, '')
    .replace(/\bexport /g, '');
  vm.runInContext(stripTypeScriptTypes(source), context, { filename: file });
}
const doc = { id: 'XXX-NDC1', title: 'Synthetic example for prompt review', kind: 'NDC', editionDate: '2025-01-01', pageCount: 12 };
context.reviewDoc = doc;
context.reviewSynthesis = {
  domain: { label: 'Water', definition: seed.domains.find(d => d.id === 'water').definition },
  documents: [{
    document_id: doc.id, title: doc.title, kind: doc.kind, edition_date: doc.editionDate,
    not_found: false, note: null,
    findings: [{ ref: 'XXX-NDC1#findings.0', text: 'The policy targets flood-protection works by 2030.', kind: 'commitment', figures: [] }],
  }],
  documents_without_answer: [],
};
context.reviewRetag = [{ index: 0, text: 'The policy targets flood-protection works by 2030.', quotes: ['Flood-protection works are targeted for 2030.'] }];
const outputs = vm.runInContext(`(() => {
  const tax = taxonomyFromFile();
  const water = tax.domain('water');
  return {
    'extraction-system.seed.txt': documentInstructions(tax),
    'extraction-user.synthetic.txt': documentUserText(reviewDoc, water, tax),
    'synthesis-system.txt': synthesisInstructions(),
    'synthesis-user.synthetic.txt': synthesisUserText(water, tax, JSON.stringify(reviewSynthesis, null, 1)),
    'retag-system.seed.txt': retagInstructions(tax),
    'retag-user.synthetic.txt': retagUserText(reviewRetag),
    'retry-suffix.synthetic.txt': retryText('synthetic example: findings.0.kind is invalid'),
    'taxonomy-prompt.seed.txt': taxonomyPromptText(tax),
  };
})()`, context);
const renderDir = path.join(folder, 'rendered');
fs.mkdirSync(renderDir, { recursive: true });
manifest.generated_prompt_exports = [];
for (const [name, text] of Object.entries(outputs)) {
  fs.writeFileSync(path.join(renderDir, name), text, 'utf8');
  manifest.generated_prompt_exports.push({ file: 'rendered/' + name, sha256: crypto.createHash('sha256').update(text).digest('hex'), generation: name === 'synthesis-system.txt' ? 'Exact current static builder return.' : 'Actual current builders executed offline with seed taxonomy and/or synthetic example data; not a production request.' });
}
fs.writeFileSync(path.join(folder, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ copied: manifest.copied_files.length, prompt_exports: Object.keys(outputs).length, prompt_version: manifest.prompt_version }));
