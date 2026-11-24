import sys, zipfile, xml.etree.ElementTree as ET
from pathlib import Path
from openpyxl import load_workbook
from pptx import Presentation
p=Path(sys.argv[1])
for name in ['sample.xlsx','sample.pptx']:
    with zipfile.ZipFile(p/name) as z:
        assert z.testzip() is None
        for entry in z.namelist():
            if entry.endswith(('.xml','.rels')): ET.fromstring(z.read(entry))
w=load_workbook(p/'sample.xlsx')
s=w.active
assert s['A2'].value=='打印纸' and s['B2'].value==42.5
assert s['A3'].data_type=='s' and s['A3'].value.startswith('=HYPERLINK')
assert s.freeze_panes=='A2' and s.auto_filter.ref=='A1:C4'
r=Presentation(p/'sample.pptx')
assert len(r.slides)==2
assert r.slides[0].shapes.title.text=='季度工作汇报'
assert '这是第一页讲稿' in r.slides[0].notes_slide.notes_text_frame.text
assert r.slide_width/r.slide_height>1.7
print('Independent Office verification passed: ZIP/XML, workbook values, safe strings, freeze/filter, slides, speaker notes.')
