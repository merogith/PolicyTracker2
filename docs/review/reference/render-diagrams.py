"""Regenerate the editable draw.io and SVG diagrams. Standard library only."""
from pathlib import Path
from html import escape
import xml.etree.ElementTree as ET

OUT = Path(__file__).resolve().parents[1] / 'visuals'
OUT.mkdir(exist_ok=True)
INK = '#17374b'
def node(i, x, y, w, title, lines, kind='code', h=110):
    return dict(i=i, x=x, y=y, w=w, h=h, title=title, lines=lines, kind=kind)

simple = [
 node('s1',50,155,300,'1  Prepare every source',['Text + layout + targeted OCR','Conditional image recovery']),
 node('s2',400,155,300,'2  Extract records - LLM 1',['Every packet, across all topics','Titles + facts + exact evidence'],'llm'),
 node('s3',750,155,300,'3  Check and pool - code',['Recover omissions / errors','Select source scope; retain all']),
 node('s4',750,345,300,'4  Organize claims - LLM 2',['Group the same proposition','Keep variants, context and links'],'llm'),
 node('s5',400,345,300,'5  Calculate scores - code',['Four checks per response','Topic means + distinct counts']),
 node('s6',50,345,300,'6  Publish automatically',['Country, region and documents','Flag / hide / restore afterward'])
]
detailed = [
 node('d1',45,165,360,'1  Freeze source + config manifest',['Country, roles, editions, as-of date','Exact bundle hashes; fixed run identity']),
 node('d2',455,165,360,'2  Prepare every page + region',['Text / layout; local OCR if needed','Conditional vision; retain crops']),
 node('d3',865,165,360,'3  Extract - LLM 1',['Every owned packet; all-topic labels','Atomic statements, titles, cited fields'],'llm'),
 node('d4',865,350,360,'4  Check + conditional recovery',['Evidence, unit accounting, omissions','Persist records; split exhausted output']),
 node('d5',455,350,360,'5  Account for selected sources',['Complete only when work resolves','Publish partial; no completion cutoff']),
 node('d6',45,350,360,'6  Select scope + pool records',['Document / current / historical scope','Owned records + read-only context']),
 node('d7',45,535,360,'7  Organize - LLM 2',['Same proposition, compatible scope','Keep conflicts; account every record'],'llm'),
 node('d8',455,535,360,'8  Check organization - code',['Ownership, references, group boundaries','Bounded repair / reconciliation']),
 node('d9',865,535,360,'9  Build source-qualified views',['No details from excluded documents','Unresolved groups: scores unavailable']),
 node('d10',865,720,360,'10  Score responses and topics',['Four checks; fixed-topic averages','Counts + coverage; stage separate']),
 node('d11',455,720,360,'11  Compare frozen snapshots',['Same basis: documentation pp change','Backfill / method change: refresh']),
 node('d12',45,720,360,'12  Atomic publication',['Keep prior snapshot during processing','Publish partial when needed; no queue'])
]

def connections(nodes):
    result=[]
    for a,b in zip(nodes,nodes[1:]):
        if a['y']==b['y']:
            direction=1 if b['x']>a['x'] else -1
            p=(a['x']+(a['w'] if direction==1 else 0),a['y']+a['h']/2)
            q=(b['x']+(0 if direction==1 else b['w']),b['y']+b['h']/2)
        else:
            p=(a['x']+a['w']/2,a['y']+a['h']);q=(b['x']+b['w']/2,b['y'])
        result.append((a,b,p,q))
    return result

mx=ET.Element('mxfile',host='app.diagrams.net',version='24.7.17')
for slug,title,subtitle,nodes,width,height,footer in [
 ('process-simple','Two model stages. One traceable result.','Final plan / 20 October 2026 / proposed, not active',simple,1100,615,
  ['One country at a time; two shared request slots initially. Recovery runs only where needed.',
   'Scoring and pooling use code. Incomplete work stays visible; it never becomes a false zero.']),
 ('process-technical','From every selected source to traceable response scores','Final engineering plan / scoring 4.0 / presentation 4.1 / no human acceptance gate',detailed,1270,1020,
  ['MODEL ALLOWLIST: prompt + enabled vocabulary + strict schema + authorized source / record units only.',
   'No team guides, archives, previous scores, unrelated files or arbitrary folder scans enter model context.',
   'One country / two shared request slots. Usage ledger + resume. Stale jobs cannot replace newer snapshots.'])
]:
    svg=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">',
      '<defs><marker id="arrow" markerWidth="9" markerHeight="9" refX="8" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" fill="#587b90"/></marker></defs>',
      f'<rect width="{width}" height="{height}" fill="#f4f7fa"/>',
      f'<text x="45" y="56" font-family="Arial" font-size="29" font-weight="bold" fill="{INK}">{escape(title)}</text>',
      f'<text x="45" y="87" font-family="Arial" font-size="17" fill="#536c7c">{escape(subtitle)}</text>',
      '<text x="45" y="121" font-family="Arial" font-size="16" fill="#176d69">Teal = LLM reasoning   /   Blue-gray = deterministic code and stored data</text>']
    diagram=ET.SubElement(mx,'diagram',name=slug,id=slug)
    model=ET.SubElement(diagram,'mxGraphModel',dx=str(width),dy=str(height),grid='1',gridSize='10',page='1',pageWidth=str(width),pageHeight=str(height))
    root=ET.SubElement(model,'root');ET.SubElement(root,'mxCell',id='0');ET.SubElement(root,'mxCell',id='1',parent='0')
    def cell(id,value,x,y,w,h,style):
        c=ET.SubElement(root,'mxCell',id=id,value=value,style=style,vertex='1',parent='1')
        ET.SubElement(c,'mxGeometry',x=str(x),y=str(y),width=str(w),height=str(h),**{'as':'geometry'})
    cell('title',title+'<br>'+subtitle,45,25,width-90,65,'text;html=1;align=left;verticalAlign=middle;fontSize=24;fontColor=#17374b;')
    for n in nodes:
        fill='#e4f3ef' if n['kind']=='llm' else '#ffffff'
        stroke='#2b847b' if n['kind']=='llm' else '#abc0cd'
        svg.append(f'<rect x="{n["x"]}" y="{n["y"]}" width="{n["w"]}" height="{n["h"]}" rx="9" fill="{fill}" stroke="{stroke}" stroke-width="1.5"/>')
        for j,text in enumerate([n['title']]+n['lines']):
            yy=n['y']+29+(0 if j==0 else 11+j*25)
            svg.append(f'<text x="{n["x"]+17}" y="{yy}" font-family="Arial" font-size="{17 if j==0 else 16}" font-weight="{"bold" if j==0 else "normal"}" fill="{INK}">{escape(text)}</text>')
        cell(n['i'],'<b>'+n['title']+'</b><br><br>'+'<br>'.join(n['lines']),n['x'],n['y'],n['w'],n['h'],f'rounded=1;whiteSpace=wrap;html=1;fontSize=16;align=left;spacingLeft=16;fillColor={fill};strokeColor={stroke};fontColor={INK};')
    for i,(a,b,p,q) in enumerate(connections(nodes)):
        svg.append(f'<path d="M{p[0]} {p[1]} L{q[0]} {q[1]}" stroke="#587b90" fill="none" stroke-width="2" marker-end="url(#arrow)"/>')
        edge=ET.SubElement(root,'mxCell',id=f'e{i}',style='edgeStyle=orthogonalEdgeStyle;rounded=0;endArrow=block;strokeColor=#587b90;',edge='1',parent='1',source=a['i'],target=b['i'])
        ET.SubElement(edge,'mxGeometry',relative='1',**{'as':'geometry'})
    top=height-len(footer)*27-22
    for i,t in enumerate(footer):
        svg.append(f'<text x="45" y="{top+i*27}" font-family="Arial" font-size="16" fill="#536c7c">{escape(t)}</text>')
    cell('notes','<br>'.join(footer),45,top-15,width-90,len(footer)*27,'text;html=1;align=left;fontSize=15;fontColor=#536c7c;')
    svg.append('</svg>');(OUT/f'{slug}.svg').write_text('\n'.join(svg),encoding='utf-8')
ET.indent(mx)
(OUT/'pipeline.drawio').write_text(ET.tostring(mx,encoding='unicode'),encoding='utf-8')
print('Created 2 SVGs and a two-page editable draw.io file.')
