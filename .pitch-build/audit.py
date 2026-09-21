import zipfile,pathlib,re,json,xml.etree.ElementTree as E
p=pathlib.Path('deliverables/练了么-全球智能体大赛A赛道路演.pptx')
z=zipfile.ZipFile(p)
ns={'a':'http://schemas.openxmlformats.org/drawingml/2006/main'}
alltext='\n'.join(z.read(n).decode('utf-8') for n in z.namelist() if n.endswith('.xml'))
for word in ['ClawHive','CLAW HIVE','网易','塘栖','XX%']:
 assert word.lower() not in alltext.lower(),word
notes=[n for n in z.namelist() if re.fullmatch(r'ppt/notesSlides/notesSlide\d+.xml',n)]
assert len(notes)==17
assert len([n for n in z.namelist() if re.fullmatch(r'ppt/media/.*',n)])==2
print('17 speaker notes; forbidden legacy terms absent; 2 inspected product images only')
