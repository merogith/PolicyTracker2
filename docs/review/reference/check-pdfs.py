"""Render each final PDF page and create contact sheets for visual inspection."""
from pathlib import Path
import json
import pypdfium2 as pdfium
from pypdf import PdfReader
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[3];OUT=ROOT/'tmp/pdfs/v3';OUT.mkdir(parents=True,exist_ok=True)
report=[]
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',16)
for file in sorted((ROOT/'output/pdf').glob('policy-tracker-v3-*.pdf')):
    pdf=pdfium.PdfDocument(str(file));reader=PdfReader(file);thumbs=[]
    for i in range(len(pdf)):
        text=reader.pages[i].extract_text()
        assert len(text.strip())>45 and (len(text.strip())>90 or len(reader.pages[i].images)>0), (file.name,i,'Nearly blank page')
        image=pdf[i].render(scale=1.4).to_pil().convert('RGB')
        image.save(OUT/f'{file.stem}-p{i+1:02d}.png')
        image.thumbnail((300,425));tile=Image.new('RGB',(320,457),'#dce5eb');tile.paste(image,((320-image.width)//2,23))
        ImageDraw.Draw(tile).text((10,3),f'Page {i+1}',font=font,fill='#17374b');thumbs.append(tile)
    for start in range(0,len(thumbs),12):
        subset=thumbs[start:start+12];sheet=Image.new('RGB',(1280,457*((len(subset)+3)//4)),'white')
        for j,t in enumerate(subset):sheet.paste(t,((j%4)*320,(j//4)*457))
        sheet.save(OUT/f'{file.stem}-contact-{start//12+1}.png')
    report.append({'file':file.name,'pages':len(pdf),'bytes':file.stat().st_size,'all_pages_rendered':True})
(OUT/'pdf-report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2))
