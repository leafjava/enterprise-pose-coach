import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
import { FileBlob, PresentationFile } from "@oai/artifact-tool";

const workspaceDir = process.cwd();
const skillDir = "C:\\Users\\lubw1\\.codex\\plugins\\cache\\openai-primary-runtime\\presentations\\26.909.12148\\skills\\presentations";
const sourcePath = path.join(workspaceDir, "deliverables", "练了么-ClawHive世界级黑客松路演.pptx");
const adaptedDraftPath = path.join(workspaceDir, ".pitch-build", "redesign-candidate.pptx");
const buildDir = path.join(workspaceDir, ".codex-ppt-final-20260921");
const outputPath = path.join(workspaceDir, "deliverables", "练了么-2026全球智能体大赛-A赛道路演-v2.pptx");
const stagingPath = path.join(buildDir, "candidate.pptx");

const presentation = await PresentationFile.importPptx(await FileBlob.load(adaptedDraftPath));
for (const [slideIndex, rowCount] of [[12, 11], [13, 10]]) {
  const table = presentation.slides.getItem(slideIndex).tables.items[0];
  table.cells.block({ row: 0, column: 0, rowCount, columnCount: 3 }).assign({
    margins: { left: 12, right: 12, top: 5, bottom: 5 },
    anchor: "center",
  });
  for (let row = 0; row < rowCount; row++) {
    for (let column = 0; column < 3; column++) {
      table.getCell(row, column).text.style = {
        typeface: "Microsoft YaHei",
        fontSize: 17,
        color: row === 0 ? "#FFFFFF" : "#0B1324",
        bold: row === 0 || column === 0,
      };
    }
  }
}
await fs.mkdir(buildDir, { recursive: true });
await (await PresentationFile.exportPptx(presentation)).save(stagingPath);

const sourceHash = crypto.createHash("sha256").update(await fs.readFile(sourcePath)).digest("hex");
const { finalizePresentation } = await import(
  pathToFileURL(path.join(skillDir, "container_tools", "artifact_tool_utils.mjs")).href
);
const result = await finalizePresentation({
  workspaceDir,
  candidatePath: stagingPath,
  finalPath: outputPath,
  pythonExecutable: "C:\\Users\\lubw1\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe",
  integrityValidatorPath: path.join(skillDir, "container_tools", "inspect_presentation_package_integrity.py"),
  layoutValidatorPath: path.join(skillDir, "container_tools", "inspect_presentation_layout_geometry.py"),
  layoutArgs: [
    "--expected-slide-size-emu", "12192000,6858000",
    "--validate-bullet-geometry",
    "--validate-heading-fit",
    ...[5, 13, 14, 15, 16, 17].flatMap(n => ["--require-native-table-slide", String(n)]),
  ],
  explicitTotalSlideCount: 17,
  requiredNativeTableOwnerSlides: [5, 13, 14, 15, 16, 17],
  requiredNativeChartOwnerSlides: [],
  fontPolicy: {
    basis: "reference",
    families: ["Microsoft YaHei"],
    referencePath: sourcePath,
    referenceSha256: sourceHash,
  },
  verifyArtifactToolImport: true,
  receiptPath: path.join(buildDir, "validation-v2.json"),
});
console.log(JSON.stringify({ outputPath, result }, null, 2));
