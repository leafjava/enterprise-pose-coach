import fs from 'node:fs/promises';
import path from 'node:path';
import { FileBlob, PresentationFile } from '@oai/artifact-tool';

const [source, outdir] = process.argv.slice(2);
await fs.mkdir(outdir, { recursive: true });
const deck = await PresentationFile.importPptx(await FileBlob.load(source));
const snapshot = await deck.inspect({
  kind: 'deck,slide,textbox,shape,image,table,chart,notes,layout',
  maxChars: 2_000_000,
});
await fs.writeFile(path.join(outdir, 'inspect.ndjson'), snapshot.ndjson);
const summary = {
  slideCount: deck.slides.items.length,
  masters: deck.masters.items.map((x) => ({ id: x.id, name: x.name })),
  layouts: deck.layouts.items.map((x) => ({ id: x.id, name: x.name, placeholders: x.placeholders.summary() })),
};
await fs.writeFile(path.join(outdir, 'summary.json'), JSON.stringify(summary, null, 2));
for (let i = 0; i < deck.slides.items.length; i++) {
  const slide = deck.slides.getItem(i);
  const png = await deck.export({ slide, format: 'png', scale: 1 });
  await fs.writeFile(path.join(outdir, `slide-${String(i + 1).padStart(2, '0')}.png`), new Uint8Array(await png.arrayBuffer()));
  const layout = await slide.export({ format: 'layout' });
  await fs.writeFile(path.join(outdir, `slide-${String(i + 1).padStart(2, '0')}.json`), await layout.text());
}
console.log(JSON.stringify(summary));
