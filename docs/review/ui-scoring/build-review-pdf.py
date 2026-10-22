"""Build the concise UI/scoring revision book from the editable guide and calculator method."""
from pathlib import Path
from reportlab.platypus import PageBreak,Paragraph,Spacer,Image,Table,KeepTogether
from PIL import Image as PILImage
import shutil,re

ROOT=Path(__file__).resolve().parents[3]
builder=ROOT/'docs/review/reference/build-pdfs.py'
# Reuse formatting helpers only; do not rebuild historical v3 books.
ns={'__file__':str(builder),'__name__':'review_styles'}
exec(compile(builder.read_text(encoding='utf-8').split("build('decision-plan',")[0],str(builder),'exec'),ns)
md,styles,Book=ns['md'],ns['styles'],ns['Book'];W,H,M,CW=ns['W'],ns['H'],ns['M'],ns['CW']
styles['h2'].keepWithNext=True
styles['h3'].keepWithNext=True
styles['body'].spaceAfter=6.5
styles['body'].allowWidows=0
styles['body'].allowOrphans=0
styles['h2'].spaceBefore=12
ns['INK']=ns['colors'].HexColor('#006EB5')
for name in ['h1','h2','h3']:
    styles[name].textColor=ns['colors'].HexColor('#006EB5')
def footer(c,doc):
    c.saveState();c.setStrokeColor(ns['colors'].HexColor('#c6d6df'));c.line(M,39,W-M,39)
    c.setFont('Body',8);c.setFillColor(ns['colors'].HexColor('#526b79'))
    c.drawString(M,26,'Policy tracker | Presentation 4.1 / score method 4.0 | Proposed, not active');c.drawRightString(W-M,26,str(doc.page));c.restoreState()

folder=ROOT/'docs/review/ui-scoring'
overview=(folder/'README.md').read_text(encoding='utf-8')
# File navigation belongs in the editable index, not on an otherwise empty PDF page.
overview=re.sub(r'## Read and try\n.*?(?=## Integration plan)', '', overview, flags=re.S)
story=md(overview)
for slug,title in [('process-simple','The pipeline in six steps'),('process-technical','The engineering flow')]:
    diagram=ROOT/f'docs/review/visuals/{slug}.png'
    with PILImage.open(diagram) as im:w,h=im.size
    scale=min(CW/w,630/h)
    story+=[PageBreak()]+md('# '+title)+[Image(str(diagram),width=w*scale,height=h*scale),Spacer(1,9),Paragraph('Two LLM stages; code pools, checks, calculates and publishes. No manual acceptance queue.',styles['small'])]
for name,title in [('country-overview','The country overview'),('domain-topics','A focused domain and its topics'),('topic-detail','From topic score to exact claims'),('regional-overview','Regional comparison')]:
    screenshot=ROOT/f'tmp/pdfs/ui-v4/{name}.png'
    if screenshot.exists():
        with PILImage.open(screenshot) as im:w,h=im.size
        scale=min(CW/w,650/h)
        story+=[PageBreak()]+md('# '+title)+[Image(str(screenshot),width=w*scale,height=h*scale),Spacer(1,9),Paragraph('Interactive review mockup. All countries and figures are synthetic.',styles['small'])]
method=md((folder/'METHOD.md').read_text(encoding='utf-8'))
# Keep the small worked-example/checklist tables together when a page turns.
for index,item in enumerate(method):
    if isinstance(item,Table) and index and isinstance(method[index-1],Paragraph):
        method[index-1].keepWithNext=True
grouped=[]; index=0
while index<len(method):
    item=method[index]
    title=item.getPlainText() if isinstance(item,Paragraph) else ''
    if title=='A worked irrigation example' and isinstance(method[index+2],Table):
        grouped.append(KeepTogether(method[index:index+3]));index+=3
    elif title in ['Recommendation and tradeoffs','1. Score each distinct response with four questions'] and isinstance(method[index+1],Table):
        grouped.append(KeepTogether(method[index:index+2]));index+=2
    else:
        grouped.append(KeepTogether([item]) if isinstance(item,Table) and item._nrows<=5 else item);index+=1
story+=[PageBreak()]+grouped
out=ROOT/'output/pdf/policy-tracker-ui-scoring-revision.pdf'
Book(str(out),pagesize=ns['A4'],leftMargin=M,rightMargin=M,topMargin=41,bottomMargin=54,title='Policy tracker: layered dashboard and scoring revision',author='Policy Tracker review').build(story,onFirstPage=footer,onLaterPages=footer)
shutil.copy2(out,folder/out.name)
print(out)
