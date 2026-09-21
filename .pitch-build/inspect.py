import zipfile,xml.etree.ElementTree as E,json,pathlib
p=next(pathlib.Path('deliverables').glob('*.pptx'))
z=zipfile.ZipFile(p); ns={'a':'http://schemas.openxmlformats.org/drawingml/2006/main'}
slides=sorted([n for n in z.namelist() if __import__('re').match(r'ppt/slides/slide\d+.xml$',n)],key=lambda n:int(__import__('re').search(r'slide(\d+)',n).group(1)))
for i,n in enumerate(slides):
 r=E.fromstring(z.read(n)); print(str(i+1)+': '+' / '.join(t.text or '' for t in r.findall('.//a:t',ns)))
print('size',z.read('ppt/presentation.xml').decode()[-1500:])
assets=pathlib.Path('.pitch-build/source-media');assets.mkdir(exist_ok=True)
for n in z.namelist():
 if n.startswith('ppt/media/'): (assets/pathlib.Path(n).name).write_bytes(z.read(n))
