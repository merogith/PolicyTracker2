"""Verify preservation, refresh manifests and create the review ZIP. Standard library only."""
from pathlib import Path
import json,hashlib,re,zipfile
ROOT=Path(__file__).resolve().parents[3];R=ROOT/'docs/review'
def digest(b):return hashlib.sha256(b).hexdigest()
def write(path,data):path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
original=json.loads((R/'preserved/application-manifest.json').read_text(encoding='utf-8'))
workspace_differences=[]
with zipfile.ZipFile(R/'preserved/application-before-update.zip') as z:
    for f in original['files']:
        assert digest(z.read(f['path']))==f['sha256'],f"Archive mismatch: {f['path']}"
        current=ROOT/f['path']
        if not current.exists() or digest(current.read_bytes())!=f['sha256']:
            workspace_differences.append(f['path'])
with zipfile.ZipFile(R/'preserved/current-runtime.zip') as z:
    runtime=json.loads(z.read('manifest.json'))
    for f in runtime['copied_files']:
        assert digest(z.read(f['reference_copy']))==f['sha256'],f['reference_copy']
        current=ROOT/f['original_path']
        if (not current.exists() or digest(current.read_bytes())!=f['sha256']) and f['original_path'] not in workspace_differences:
            workspace_differences.append(f['original_path'])
for f in R.rglob('*.json'):json.loads(f.read_text(encoding='utf-8-sig'))
for f in R.rglob('*.md'):
    for target in re.findall(r'(?<!!)\[[^\]]*\]\(([^)]+)\)',f.read_text(encoding='utf-8')):
        if target.startswith(('https://','http://','#')):continue
        clean=re.sub(r':\d+$','',target.split('#')[0])
        assert (f.parent/clean).resolve().exists(),f'Broken link {f}: {target}'
paths=['pipeline/taxonomy.json','pipeline/labels.json','pipeline/pipeline.json','pipeline/scoring.json','pipeline/llm-contracts.json','pipeline/prompts/extract.md','pipeline/prompts/organize.md','pipeline/maintenance/retag.md','reference/build-inputs.mjs','reference/score-bands.mjs','reference/compare-snapshots.mjs','reference/DATA-DICTIONARY.md']
paths+=['ui-scoring/scoring.json','ui-scoring/scoring.mjs','ui-scoring/METHOD.md']
paths+=['team/FINAL-UPGRADE-PLAN.md','team/PIPELINE.md']
contracts=json.loads((R/'pipeline/llm-contracts.json').read_text(encoding='utf-8'))
write(R/'pipeline/bundle.json',{
 'id':'regional-climate-disaster-policy-tracker','version':'3.0.0','status':'baseline_contracts_awaiting_upgrade','date':'2026-10-20','runtime_loaded':False,
 'path_base':'review_root_parent_of_pipeline_directory',
 'configuration_authority':'Proposed portable bundle; production must freeze an immutable version for each run. UI edits/import/export use this same authority.',
 'component_versions':{'llm_pipeline_baseline':'3.0.0','taxonomy':'3.0.0','ui_scoring':'4.0.0','ui_presentation':'4.1.0','upgrade_plan':'4.2.0'},
 'upgrade_boundary':'The v3 machine files and examples are preserved baseline contracts. The final plan requires packet extraction, recovery, OCR and upgraded schemas before production activation.',
 'current_dashboard_scoring':'ui-scoring/scoring.json',
 'current_dashboard_plan':'ui-scoring/README.md',
 'legacy_scoring_reference':'pipeline/scoring.json; v3 coverage-only headline superseded by ui-scoring/scoring.json',
 'files':[{'path':p,'sha256':digest((R/p).read_bytes())} for p in paths],
 'llm_input_allowlist':contracts['input_allowlist'],
 'loading_rule':'Only stage allowlisted files may contribute to request assembly. This bundle manifest is not an instruction to send every file to the model.',
 'stages':{'extract':'pipeline/prompts/extract.md','organize':'pipeline/prompts/organize.md','maintenance_retag':'pipeline/maintenance/retag.md'},
 'schema_authority':'pipeline/llm-contracts.json; compile enum choices from taxonomy and enabled labels using reference/build-inputs.mjs',
 'implementation_plan':'team/FINAL-UPGRADE-PLAN.md','verification':'ui-scoring/VERIFICATION.md','pipeline_verification':'reference/VERIFICATION.md',
 'normalization_contract':'reference/DATA-DICTIONARY.md',
 'reference_calculators':['ui-scoring/scoring.mjs'],
 'legacy_reference_calculators':['reference/score-bands.mjs','reference/compare-snapshots.mjs'],
 'preserved_current_runtime':'preserved/current-runtime.zip',
 'preserved_application':'preserved/application-before-update.zip'
})
files=sorted(f for f in R.rglob('*') if f.is_file() and f.name!='PACK-MANIFEST.json')
write(R/'PACK-MANIFEST.json',{'version':'4.2.0','status':'review_not_active','date':'2026-10-20','implementation_plan':'team/FINAL-UPGRADE-PLAN.md','current_design':'ui-scoring/README.md','llm_pipeline_baseline_version':'3.0.0','scoring_method_version':'4.0.0','presentation_version':'4.1.0','application_files_changed':False,'checks':{'historical_input_contract_tests':15,'historical_legacy_scoring_tests':49,'historical_legacy_snapshot_tests':20,'historical_legacy_water_example':'passed','ui_scoring_verification':'ui-scoring/VERIFICATION.md','final_plan_verification':'reference/VERIFICATION.md','preserved_application_files_verified':len(original['files']),'current_runtime_copies_verified':len(runtime['copied_files'])},'files':[{'path':f.relative_to(R).as_posix(),'bytes':f.stat().st_size,'sha256':digest(f.read_bytes())} for f in files]})
pack=json.loads((R/'PACK-MANIFEST.json').read_text(encoding='utf-8'))
pack.pop('application_files_changed',None)
pack['application_files_changed_by_this_planning_revision']=False
pack['workspace_differs_from_preserved_snapshot']=sorted(workspace_differences)
pack['preservation_note']='Archive hashes are verified against the frozen 19 October baseline. Later workspace differences are reported, never overwritten or silently recaptured.'
write(R/'PACK-MANIFEST.json',pack)
target=ROOT/'docs/policy-tracker-final-review.zip'
with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for f in sorted(R.rglob('*')):
        if f.is_file():z.write(f,f.relative_to(R).as_posix())
with zipfile.ZipFile(target) as z:
    assert z.testzip() is None
    for f in json.loads((R/'PACK-MANIFEST.json').read_text(encoding='utf-8'))['files']:
        assert digest(z.read(f['path']))==f['sha256'],f['path']
print(json.dumps({'archive':str(target),'bytes':target.stat().st_size,'delivered_files':len(files)+1,'preserved_files':len(original['files']),'runtime_copies':len(runtime['copied_files']),'workspace_differences_reported':len(workspace_differences),'links':'passed','hashes':'passed'},indent=2))
