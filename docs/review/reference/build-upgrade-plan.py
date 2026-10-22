"""Build the final upgrade-plan PDF from its authoritative Markdown and reviewed visuals."""
from pathlib import Path
from reportlab.platypus import Paragraph, PageBreak, Spacer, Image, Table, KeepTogether
from PIL import Image as PILImage
import shutil

ROOT = Path(__file__).resolve().parents[3]
source = ROOT / 'docs/review/reference/build-pdfs.py'
ns = {'__file__': str(source), '__name__': 'review_styles'}
exec(compile(source.read_text(encoding='utf-8').split("build('decision-plan',")[0], str(source), 'exec'), ns)
md, styles, Book = ns['md'], ns['styles'], ns['Book']
W, H, M, CW = ns['W'], ns['H'], ns['M'], ns['CW']
blue = ns['colors'].HexColor('#006EB5')
ns['INK'] = blue
for key in ['h1', 'h2', 'h3']:
    styles[key].textColor = blue
    styles[key].keepWithNext = True
styles['body'].spaceAfter = 7
styles['body'].allowWidows = 0
styles['body'].allowOrphans = 0


def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(ns['colors'].HexColor('#c6d6df'))
    canvas.line(M, 39, W-M, 39)
    canvas.setFont('Body', 8)
    canvas.setFillColor(ns['colors'].HexColor('#526b79'))
    canvas.drawString(M, 26, 'Policy Tracker | Final plan 4.2 | 20 October 2026 | Not activated')
    canvas.drawRightString(W-M, 26, str(doc.page))
    canvas.restoreState()


story = md((ROOT/'docs/review/team/FINAL-UPGRADE-PLAN.md').read_text(encoding='utf-8'))
# Small tables should not strand their caption or split across a page.
prepared = []
index = 0
while index < len(story):
    item = story[index]
    if (isinstance(item, Paragraph) and hasattr(item, '_heading')
            and index+1 < len(story) and isinstance(story[index+1], Table)
            and story[index+1]._nrows <= 6):
        prepared.append(KeepTogether(story[index:index+2]))
        index += 2
        continue
    prepared.append(KeepTogether([item]) if isinstance(item, Table) and item._nrows <= 6 else item)
    index += 1
story = prepared

for relative, title, note in [
    ('docs/review/visuals/process-simple.png', 'The process at a glance',
     'Every selected source packet enters extraction. OCR and recovery are conditional; pooling and scoring use code.'),
    ('docs/review/visuals/process-technical.png', 'Engineering flow and boundaries',
     'One country, two shared model-request slots initially. Partial publication does not mark outstanding work complete.'),
    ('tmp/pdfs/ui-v4/country-overview.png', 'Preserve the approved country dashboard',
     'Visual reference, presentation 4.1. All countries and figures in this preview are synthetic. Implementation connects the same layout to source-scoped results.'),
    ('tmp/pdfs/ui-v4/domain-topics.png', 'Focused topics and evidence navigation',
     'Selecting a domain replaces the overview with its topics. Selecting a topic opens claims and evidence; breadcrumbs return to the prior level.'),
]:
    path = ROOT/relative
    with PILImage.open(path) as picture:
        width, height = picture.size
    scale = min(CW/width, 620/height)
    story += [PageBreak()] + md('# '+title)
    story += [Image(str(path), width=width*scale, height=height*scale), Spacer(1, 12), Paragraph(note, styles['body'])]

out = ROOT/'output/pdf/policy-tracker-final-upgrade-plan.pdf'
Book(str(out), pagesize=ns['A4'], leftMargin=M, rightMargin=M,
     topMargin=41, bottomMargin=54, title='Policy Tracker: final upgrade plan and OCR',
     author='Policy Tracker review').build(story, onFirstPage=footer, onLaterPages=footer)
shutil.copy2(out, ROOT/'docs/review/team'/out.name)
print(out)
