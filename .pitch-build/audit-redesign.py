import json
import pathlib
import re
import zipfile
import xml.etree.ElementTree as ET

root = pathlib.Path(__file__).resolve().parent.parent
deck = root / 'deliverables' / '练了么-全球智能体大赛A赛道路演-视觉升级版.pptx'
ns = {'a': 'http://schemas.openxmlformats.org/drawingml/2006/main'}
with zipfile.ZipFile(deck) as z:
    slides = sorted((n for n in z.namelist() if re.fullmatch(r'ppt/slides/slide\d+\.xml', n)), key=lambda n: int(re.search(r'slide(\d+)', n).group(1)))
    notes = [n for n in z.namelist() if re.fullmatch(r'ppt/notesSlides/notesSlide\d+\.xml', n)]
    assert len(slides) == 17, len(slides)
    assert len(notes) == 17, len(notes)
    expected_notes = json.loads((root / '.pitch-build' / 'content.json').read_text(encoding='utf-8'))
    for i, expected in enumerate(expected_notes, 1):
        note_root = ET.fromstring(z.read(f'ppt/notesSlides/notesSlide{i}.xml'))
        note_text = '\n'.join(e.text or '' for e in note_root.findall('.//a:t', ns))
        assert expected['notes'] in note_text, f'Changed or omitted speaker notes on slide {i}'
    xml = '\n'.join(z.read(n).decode('utf-8') for n in z.namelist() if n.endswith('.xml'))
    for forbidden in ['ClawHive', 'CLAW HIVE', '网易', '塘栖', 'XX%']:
        assert forbidden.lower() not in xml.lower(), forbidden
    output = []
    for n in slides:
        tree = ET.fromstring(z.read(n))
        strings = [e.text or '' for e in tree.findall('.//a:t', ns)]
        output.append({'slide': int(re.search(r'slide(\d+)', n).group(1)), 'text': strings})
    merged = '\n'.join(t for s in output for t in s['text'])
    for required in ['PPE', '23', '19', '4,800']:
        assert required in merged, required
    (root / '.pitch-build' / 'redesign-text-audit.json').write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding='utf-8')
    print('PASS: 17 slides, 17 notes, legacy terms absent; extracted text ready for review.')
