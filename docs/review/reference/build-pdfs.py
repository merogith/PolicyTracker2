"""Build four readable PDF review books from the editable Markdown and preserved bytes.
Requires reportlab and rendered diagram PNGs. ZIP is preservation authority.
"""
from pathlib import Path
from html import escape
import re,json,zipfile,textwrap,shutil
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Preformatted, KeepTogether, Image
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from PIL import Image as PILImage

ROOT=Path(__file__).resolve().parents[3]
REVIEW=ROOT/'docs/review'; OUT=ROOT/'output/pdf'; OUT.mkdir(parents=True,exist_ok=True)
for n,f in [('Body','arial.ttf'),('Bold','arialbd.ttf'),('Italic','ariali.ttf'),('Mono','consola.ttf')]:
    pdfmetrics.registerFont(TTFont(n,str(Path('C:/Windows/Fonts')/f)))
pdfmetrics.registerFontFamily('Body',normal='Body',bold='Bold',italic='Italic',boldItalic='Bold')
W,H=A4;M=44;CW=W-2*M
INK=colors.HexColor('#17374b'); TEAL=colors.HexColor('#176d69')
styles={
 'title':ParagraphStyle('title',fontName='Bold',fontSize=25,leading=30,textColor=INK,spaceAfter=15,keepWithNext=True),
 'h1':ParagraphStyle('h1',fontName='Bold',fontSize=21,leading=26,textColor=INK,spaceAfter=14,keepWithNext=True),
 'h2':ParagraphStyle('h2',fontName='Bold',fontSize=14,leading=18,textColor=INK,spaceBefore=14,spaceAfter=8,keepWithNext=True),
 'h3':ParagraphStyle('h3',fontName='Bold',fontSize=11,leading=15,textColor=TEAL,spaceBefore=12,spaceAfter=6,keepWithNext=True),
 'body':ParagraphStyle('body',fontName='Body',fontSize=10.2,leading=14.2,textColor=colors.HexColor('#253e4c'),spaceAfter=8),
 'small':ParagraphStyle('small',fontName='Body',fontSize=9,leading=12.4,textColor=colors.HexColor('#526b79'),spaceAfter=8),
 'cell':ParagraphStyle('cell',fontName='Body',fontSize=8.6,leading=11.5,textColor=colors.HexColor('#253e4c'),splitLongWords=True),
 'head':ParagraphStyle('head',fontName='Bold',fontSize=8.6,leading=11.5,textColor=colors.white),
 'code':ParagraphStyle('code',fontName='Mono',fontSize=7.5,leading=10.1,textColor=colors.HexColor('#253e4c'),spaceAfter=8),
}
def inline(text):
    text=text.replace('\u2013','-').replace('\u2014','-').replace('\u2011','-')
    # Relative links are package navigation, not actionable filesystem links in PDF.
    links=[]
    def link(m):
        label,url=m.groups()
        if url.startswith('https://'):
            links.append(f'<link href="{escape(url,quote=True)}" color="#176d69">{escape(label)}</link>')
            return f'LINKTOKEN{len(links)-1}TOKEN'
        return label
    text=re.sub(r'\[([^\]]+)\]\(([^)]+)\)',link,text)
    text=escape(text)
    text=re.sub(r'\*\*([^*]+)\*\*',r'<b>\1</b>',text)
    text=re.sub(r'`([^`]+)`',r'<font name="Mono">\1</font>',text)
    for i,l in enumerate(links):text=text.replace(f'LINKTOKEN{i}TOKEN',l)
    return text
def code(text):
    wrapped=[]
    for line in text.expandtabs(2).splitlines():
        wrapped.extend(textwrap.wrap(line,width=108,replace_whitespace=False,drop_whitespace=False,break_long_words=True,break_on_hyphens=False) or [''])
    return Preformatted('\n'.join(wrapped),styles['code'])
def table(lines):
    rows=[]
    for line in lines:
        cells=[s.strip() for s in line.strip().strip('|').split('|')]
        if all(re.fullmatch('[: -]+',s) for s in cells):continue
        rows.append(cells)
    n=len(rows[0]); cols={2:[.29,.71],3:[.24,.37,.39],4:[.14,.25,.35,.26],5:[.14,.22,.22,.22,.20]}.get(n,[1/n]*n)
    if n==4 and rows[0][0]=='Code':cols=[.13,.23,.39,.25]
    if n==4 and rows[0][-1]=='Every allowed choice':cols=[.20,.18,.14,.48]
    data=[[Paragraph(inline(t),styles['head' if i==0 else 'cell']) for t in row] for i,row in enumerate(rows)]
    if n==4 and rows[0][-1]=='Every allowed choice':
        for i,row in enumerate(rows[1:],1):data[i][-1]=Paragraph('<br/>'.join(inline(t.strip()) for t in row[-1].split(',')),styles['cell'])
    t=Table(data,colWidths=[CW*c for c in cols],repeatRows=1,hAlign='LEFT',splitByRow=1)
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),INK),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,colors.HexColor('#f1f5f7')]),('LINEBELOW',(0,0),(-1,-1),.3,colors.HexColor('#ccd9e1')),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7)]))
    return t
def md(text):
    result=[];lines=text.splitlines();i=0
    while i<len(lines):
        line=lines[i].strip();i+=1
        if not line or line.startswith('<!--'):continue
        if line.startswith('```'):
            block=[]
            while i<len(lines) and not lines[i].startswith('```'):block.append(lines[i]);i+=1
            i+=1;result.append(code('\n'.join(block)));continue
        if line.startswith('|'):
            block=[line]
            while i<len(lines) and lines[i].strip().startswith('|'):block.append(lines[i]);i+=1
            result.extend([table(block),Spacer(1,9)]);continue
        match=re.match(r'^(#{1,6})\s+(.*)',line)
        if match:
            level=len(match[1]);style='h1' if level==1 else 'h2' if level==2 else 'h3'
            p=Paragraph(inline(match[2]),styles[style]);p._heading=(min(level,2),match[2]);result.append(p);continue
        if line.startswith('- '):line='• '+line[2:]
        if line.startswith('> '):line=line[2:]
        result.append(Paragraph(inline(line),styles['body']))
    return result
class Book(SimpleDocTemplate):
    def afterFlowable(self,flowable):
        if hasattr(flowable,'_heading'):
            level,title=flowable._heading;key='h'+str(self.seq.nextf('heading'))
            self.canv.bookmarkPage(key);self.canv.addOutlineEntry(title,key,level=0 if level==1 else 1,closed=False)
def footer(c,doc):
    c.saveState();c.setStrokeColor(colors.HexColor('#c6d6df'));c.line(M,39,W-M,39)
    c.setFont('Body',8);c.setFillColor(colors.HexColor('#526b79'))
    c.drawString(M,26,'Policy tracker | Review 3.0.0 | Proposed, not active');c.drawRightString(W-M,26,str(doc.page));c.restoreState()
def cover(title,subtitle,body):
    p=Paragraph(title,styles['title']);p._heading=(1,title)
    return [Spacer(1,32),Paragraph('REGIONAL CLIMATE & DISASTER POLICY TRACKER',styles['small']),p,Paragraph(subtitle,styles['h2']),Paragraph('19 October 2026 · Review specification 3.0.0',styles['small'])]+md(body)+[PageBreak()]
def svg(name,width=CW):
    filename=REVIEW/'visuals'/name.replace('.svg','.png')
    with PILImage.open(filename) as image: w,h=image.size
    return Image(str(filename),width=width,height=width*h/w)
def build(slug,story):
    filename=OUT/f'policy-tracker-v3-{slug}.pdf'
    Book(str(filename),pagesize=A4,leftMargin=M,rightMargin=M,topMargin=41,bottomMargin=54,title='Policy tracker: '+slug.replace('-',' '),author='Policy Tracker review').build(story,onFirstPage=footer,onLaterPages=footer)
    shutil.copy2(filename,REVIEW/'pdf'/filename.name);print(filename)
def section(path):return md((REVIEW/path).read_text(encoding='utf-8'))

build('decision-plan',cover('The update decision','Start here: what to change and why',
'''Keep two model stages, the existing domain/topic system and automatic publication. Tighten source handling and replace confusing stage-based comparisons with clear documentation coverage.

This short decision book lists the proposed changes, implementation order and approval scope. The application has not been changed. The full editable package includes current source archives, proposed templates, JSON files, examples and reference tests.

**Read next:** Team handbook for the process; Taxonomy and fields for every choice; Prompt sourcebook for the exact current and proposed prompts.''')+section('team/DECISION.md'))

handbook=cover('The team handbook','Method, scoring and dashboard priorities',
'''Use this book for a team discussion. The main flow is two LLM stages with code-owned pooling, evidence checks, scoring and publication. Topic bands describe source documentation, while country/domain percentages count common topics.

The chapters cover the end-to-end process, numerical scoring, screen priorities and failure cases. Technical details can be skipped on first reading. PDF bookmarks navigate chapters and sections.

**Reading path:** process diagram → scoring example → dashboard priorities → deeper audit. No recurring manual moderation gate is proposed.''')
handbook+=md('# The process at a glance')+[svg('process-simple.svg'),Spacer(1,15)]+md('Two logical LLM stages run as bounded tasks. Independent extraction units run in parallel. Organization starts only after the contributing input snapshot is frozen, then independent packs can run in parallel.')+[PageBreak()]
handbook+=md('# Engineering flow')+[svg('process-technical.svg')]+[PageBreak()]
for name in ['team/PIPELINE.md','team/SCORING.md','team/DASHBOARDS.md','reference/REVIEW-FINDINGS.md','reference/SOURCES.md']:
    handbook+=section(name)+[PageBreak()]
handbook.pop();build('team-handbook',handbook)

build('taxonomy-and-fields',cover('Taxonomy and data fields','All choices, stable codes and evidence rules',
'''The proposed structure retains all 16 domains and 64 topics. This book prints every topic and label choice, then explains source records, claims, relationships and calculated outputs.

Four core facets are enabled initially. Other existing choices remain available as optional modules. Relevant evidence that does not fit a topic stays visible in an unmapped bucket, preserving its actual statement type.

JSON files are the machine vocabulary. The raw LLM contract, stored logical objects and scoring inputs are different layers; the data dictionary explains each. The running application does not yet load these proposed files.''')+section('team/TAXONOMY.md')+[PageBreak()]+section('reference/DATA-DICTIONARY.md'))

book=cover('Prompt sourcebook','Current prompts preserved; proposed prompts separated',
'''Part A prints the real current prompt-builder source, output-schema source and all eight existing rendered examples. The rendered examples use repository seed taxonomy and invented document metadata; they are not captured production requests. Live database edits and model environment values were not available.

Part B prints the proposed v3 templates and explains their exact inputs. The two normal stages are extraction and organization; retagging is occasional maintenance.

**Preservation authority:** application-before-update.zip, current-runtime.zip and their hash manifests. PDF wrapping changes presentation only. The archives preserve exact bytes. No credentials, uploaded policy files or database are included.

The full JSON request examples and strict wire contracts are in the editable package. They are intentionally not all repeated in this PDF: the same vocabulary/schema would appear many times without adding methodological clarity.''')
book+=md('# Part A: current application\n\nThe application currently builds prompts in src/lib/analysis/prompt.ts. Domain extraction passes document metadata and an active taxonomy. Synthesis passes simplified records per country/domain. The gateway is src/lib/openai.ts; schemas are built in src/lib/analysis/schemas.ts. See the preserved archives for all worker, API and UI files.')
with zipfile.ZipFile(REVIEW/'preserved/current-runtime.zip') as z:
    for filename in ['source/src/lib/analysis/prompt.ts','source/src/lib/analysis/schemas.ts']+sorted(n for n in z.namelist() if n.startswith('rendered/') and n.endswith('.txt')):
        book+=[PageBreak()]+md('# '+filename)+[code(z.read(filename).decode('utf-8-sig'))]
book+=[PageBreak()]+md('# Part B: proposed v3 inputs\n\nThese templates are review artifacts, not active runtime files. An explicit builder reads the prompt, taxonomy, labels, processing settings and strict contract. It renders only enabled choices and relevant context. It never loads team guides, archives or previous scores into the model request.\n\nFull reproducible requests: examples/extraction-request.json and examples/organization-request.json. Each contains synthetic inputs, messages, schema, source hashes and estimated token diagnostics. reference/build-inputs.mjs produces them without network access.')
for filename in ['pipeline/prompts/extract.md','pipeline/prompts/organize.md','pipeline/maintenance/retag.md']:
    book+=[PageBreak()]+md('# '+filename)+[code((REVIEW/filename).read_text(encoding='utf-8'))]
book+=[PageBreak()]+md('# Which files can enter each stage?\n\n| Layer | Files / data | Why |\n|---|---|---|\n| LLM 1 | extract.md, compiled taxonomy/labels/schema, source metadata, source units | Extract sourced records |\n| Code pooling | Stored records, topic homes, frozen manifest | Ownership and partitioning |\n| LLM 2 | organize.md, relevant vocabulary/schema, source-linked records | Common claims and typed links |\n| Scoring code | scoring.json, source-qualified topic projections, coverage | Repeatable bands and percentages |\n| Dashboard | Published snapshot and user overlays | Explain results and expose sources |\n| Maintenance only | retag.md, saved evidence, changed vocabulary | Reassign labels; scope expansion also requires new searches |\n\nA file read by the builder is not automatically pasted into the prompt. Processing settings determine limits; the schema is passed in the structured-output parameter. The generated request examples are the exact offline assembly to inspect. Production provider adapters and source-verification logic still need implementation.')
build('prompt-sourcebook',book)
