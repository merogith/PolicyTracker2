"""Build the standalone review mockup from preserved v2 visual styles and v3 taxonomy."""
from pathlib import Path
import json,re
ROOT=Path(__file__).resolve().parents[3]
V3=ROOT/'docs/review'
source=ROOT/'docs/archive/lean-pipeline-v2/dashboard-preview.html'
if not source.exists(): source=ROOT/'docs/proposals/lean-pipeline/dashboard-preview.html'
s=source.read_text(encoding='utf-8')
tax=json.loads((V3/'pipeline/taxonomy.json').read_text(encoding='utf-8'))
domains=[]
for i,d in enumerate(tax['domains']):
    topics=[t for t in tax['topics'] if t['home_domain_id']==d['id']]
    counts=[0]*5
    for j,t in enumerate(topics): counts[3 if t['id']=='AGR-01' else (i+j)%4]+=1
    domains.append([d['label'],len(topics),counts])
s=s.replace('Review specification v2.0.0','Review specification v3.0.0').replace('See SCORING.md and DASHBOARD.md','See ../team/SCORING.md and ../team/DASHBOARDS.md')
s=s.replace('Documentation bands · source evidence · separate progress and disagreement','Response coverage · delivery details · source evidence')
s=s.replace('Selected domain examples below. Production uses all 16 domains and the fixed 64-topic profile. Display filters do not change comparison denominators.','All 16 domains below use the real home-topic counts. Counts are illustrative. The national denominator is 64 unique topics; display filters never change it.')
s=s.replace('<div id="tiles" class="tiles"></div>','''<div id="headlines" class="tiles"></div><details><summary>Explore all 16 domain summaries</summary><div id="tiles" class="tiles"></div></details><p class="muted">Select a topic to see the four bands and source-backed details. This mockup shows irrigation below.</p>''')
start=s.index('const domains=');end=s.index("document.getElementById('tiles')",start)
s=s[:start]+'const domains='+json.dumps(domains,ensure_ascii=False)+';\n'+s[end:]
start=s.index('<section id="region"');end=s.index('<section id="documents"',start)
s=s[:start]+'''<section id="region" class="view" hidden><div class="panel"><div class="bar"><div><h2>Regional documentation coverage</h2><p class="muted">Three synthetic countries · NDC + NAP profile · common edition/date rules</p></div><label>Measure <select id="regionalMetric"><option value="response">Response coverage</option><option value="detail">Delivery-detail coverage</option></select></label></div><p>Selected domains from the 64-topic comparison. Alphabetical order; no overall league table. Darker blue means more topics with the selected evidence, not greater climate success.</p><div class="scroll"><table class="heat"><thead id="heatHead"></thead><tbody id="heatRows"></tbody></table></div><p id="heatDetail" class="detail" aria-live="polite">Select a cell to inspect its denominator and source limitations.</p><div class="detail"><h3>Changes need a comparable basis</h3><p><strong>↑ +6.3 percentage points</strong> can mean 4 additional response topics out of 64 in a comparable new edition.</p><p><strong>↻ Updated evidence</strong> marks a document backfill or extraction-method change. It is not a progress arrow. Incomplete comparisons do not receive a directional arrow.</p></div></div></section>
'''+s[end:]
start=s.index('const matrix=');end=s.index('</script>',start)
s=s[:start]+'''
const total=domains.reduce((a,[name,n,c])=>[a[0]+n,a[1]+c[2]+c[3],a[2]+c[3]],[0,0,0]);
document.getElementById('headlines').innerHTML=`<article class="tile"><h3>Response coverage</h3><strong>${(100*total[1]/total[0]).toFixed(1)}%</strong><small>${total[1]} of ${total[0]} common topics</small></article><article class="tile"><h3>Delivery-detail coverage</h3><strong>${(100*total[2]/total[0]).toFixed(1)}%</strong><small>${total[2]} of ${total[0]} common topics</small></article><article class="tile"><h3>Implementation reported</h3><strong>5 / 64</strong><small>Source-reported activity, not verified outcomes</small></article>`;
function regional(){
 const metric=document.getElementById('regionalMetric').value,selected=domains.slice(0,6);
 document.getElementById('heatHead').innerHTML='<tr><th>Country</th>'+selected.map(d=>'<th>'+d[0]+'</th>').join('')+'</tr>';
 document.getElementById('heatRows').innerHTML=['Example A','Example B','Example C'].map((country,row)=>'<tr><td><strong>'+country+'</strong></td>'+selected.map(([name,n,c],col)=>{
   let p=Math.max(0,Math.min(n,(metric==='response'?c[2]+c[3]:c[3])+row-1));
   const u=row===2&&col===1?1:0;p=Math.min(p,n-u);
   const lo=Math.round(100*p/n),hi=Math.round(100*(p+u)/n);
   const label=(u?lo+'–'+hi:lo)+'%';
   return `<td><button style="background:hsl(207 45% ${96-lo*.45}%);color:${lo>65?'white':'#17374b'}" data-country="${country}" data-domain="${name}" data-p="${p}" data-n="${n}" data-u="${u}"><strong style="font-size:21px">${label}</strong><br>${p}/${n} topics${u?'<br>1 unresolved':''}</button></td>`;
 }).join('')+'</tr>').join('');
 document.querySelectorAll('[data-p]').forEach(b=>b.addEventListener('click',()=>{document.getElementById('heatDetail').textContent=`${b.dataset.country} · ${b.dataset.domain}: ${b.dataset.p} of ${b.dataset.n} home topics have ${metric==='response'?'a documented response':'complete delivery details for at least one response'}. ${b.dataset.u==='1'?'One unresolved topic creates a range; it is not a zero.':'This illustrative source profile is complete.'} Open topic bands and exact sources in the production drawer.`}));
}
document.getElementById('regionalMetric').addEventListener('change',regional);regional();
'''+s[end:]
s=s.replace('<p class="foot">','<p class="foot">The country and regional panels are separate illustrative scenarios. Settings, source profiles and post-publication controls are specified in the guide, not connected in this local mockup. </p><p class="foot">')
(V3/'visuals/dashboard-preview.html').write_text(s,encoding='utf-8')
print('Built v3 dashboard mockup with real home-topic denominators:',sum(d[1] for d in domains))
