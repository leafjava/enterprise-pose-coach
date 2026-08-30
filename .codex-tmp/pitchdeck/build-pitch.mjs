import fs from "node:fs/promises";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const ROOT = "D:/0-Document/University/PKU/Phd/Society/Blockchain/Competition/202608_ClawHive/enterprise-pose-coach";
const TMP = `${ROOT}/.codex-tmp/pitchdeck`;
const OUT = `${ROOT}/deliverables/练了么-ClawHive世界级黑客松路演.pptx`;

const C = {
  canvas: "#F7F8FA",
  white: "#FFFFFF",
  ink: "#0B1324",
  navy: "#071427",
  muted: "#667085",
  rule: "#D5D9E2",
  panel: "#ECEFF3",
  blue: "#2155D9",
  blueSoft: "#EAF1FF",
  green: "#12B981",
  greenSoft: "#E9FBF4",
  orange: "#F59E0B",
  orangeSoft: "#FFF5E6",
  red: "#E5484D",
  redSoft: "#FFF0F0",
};

const FONT = "Microsoft YaHei";

function noLine() {
  return { style: "solid", fill: "none", width: 0 };
}

function addBox(slide, x, y, w, h, fill = C.white, opts = {}) {
  const geometry = opts.geometry || "rect";
  const config = {
    geometry,
    name: opts.name,
    position: { left: x, top: y, width: w, height: h },
    fill,
    line: opts.line || noLine(),
    shadow: opts.shadow,
  };
  if (["rect", "textbox", "roundRect"].includes(geometry) && opts.radius) {
    config.borderRadius = opts.radius;
  }
  return slide.shapes.add(config);
}

function addText(slide, text, x, y, w, h, opts = {}) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    name: opts.name,
    position: { left: x, top: y, width: w, height: h },
    fill: opts.fill || "none",
    line: opts.line || noLine(),
    borderRadius: opts.radius || 0,
  });
  shape.text = text;
  shape.text.style = {
    fontSize: opts.size || 18,
    color: opts.color || C.ink,
    bold: Boolean(opts.bold),
    italic: Boolean(opts.italic),
    typeface: FONT,
    alignment: opts.align || "left",
    verticalAlignment: opts.valign || "top",
    autoFit: opts.autoFit || "shrinkText",
  };
  return shape;
}

function addRule(slide, x, y, w, color = C.rule, weight = 1) {
  return slide.shapes.add({
    geometry: "line",
    position: { left: x, top: y, width: w, height: 0 },
    fill: "none",
    line: { style: "solid", fill: color, width: weight },
  });
}

function addArrow(slide, x, y, w, color = C.rule) {
  addBox(slide, x, y + 3, w - 9, 2, color);
  addBox(slide, x + w - 12, y, 12, 8, color, { geometry: "chevron" });
}

function addPill(slide, text, x, y, w, color = C.blue, fill = C.blueSoft) {
  addBox(slide, x, y, w, 30, fill, { geometry: "roundRect", radius: "rounded-full" });
  addText(slide, text, x, y + 2, w, 25, { size: 13, bold: true, color, align: "center", valign: "middle" });
}

function addHeader(slide, title, kicker, page, dark = false) {
  const ink = dark ? C.white : C.ink;
  const muted = dark ? "#9FB1C7" : C.muted;
  addText(slide, kicker.toUpperCase(), 64, 34, 640, 24, { size: 13, bold: true, color: muted });
  addText(slide, title, 64, 68, 1120, 58, { size: 40, bold: true, color: ink, autoFit: "shrinkText" });
  addText(slide, String(page).padStart(2, "0"), 1180, 38, 36, 20, { size: 13, color: muted, align: "right" });
  addRule(slide, 64, 132, 1152, dark ? "#284058" : C.rule, 1);
}

function addMetric(slide, value, label, x, y, w, color = C.blue, note = "") {
  addText(slide, value, x, y, w, 60, { size: 46, bold: true, color });
  addText(slide, label, x, y + 64, w, 30, { size: 18, bold: true, color: C.ink });
  if (note) addText(slide, note, x, y + 98, w, 52, { size: 14, color: C.muted });
}

function notes(slide, body, sources) {
  const sourceLines = sources.map((s) => `- ${s}`).join("\n");
  slide.speakerNotes.textFrame.setText(`${body}\n\n[Sources]\n${sourceLines}\n[/Sources]`);
  slide.speakerNotes.setVisible(true);
}

async function img(path) {
  const b = await fs.readFile(path);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
}

async function addImage(slide, path, x, y, w, h, alt, crop) {
  const panel = addBox(slide, x - 2, y - 2, w + 4, h + 4, C.white, {
    geometry: "roundRect",
    radius: "rounded-xl",
    line: { style: "solid", fill: C.rule, width: 1 },
    shadow: "shadow-sm",
  });
  panel.sendToBack();
  return slide.images.add({
    blob: await img(path),
    contentType: "image/png",
    alt,
    fit: "cover",
    crop,
    geometry: "roundRect",
    borderRadius: "rounded-xl",
    position: { left: x, top: y, width: w, height: h },
  });
}

function makeSlide(p, fill = C.canvas) {
  const slide = p.slides.add();
  slide.background.fill = fill;
  return slide;
}

const p = Presentation.create({ slideSize: { width: 1280, height: 720 } });

// 01 Cover
{
  const s = makeSlide(p, C.canvas);
  addPill(s, "CLAW HIVE × ENTERPRISE VISION SKILL", 64, 54, 292, C.blue, C.blueSoft);
  addText(s, "让 ClawHive 的数字员工\n真正看见现场", 64, 145, 570, 170, { size: 62, bold: true, color: C.ink, autoFit: "shrinkText" });
  addText(s, "练了么｜企业体能与岗位动作评估数字员工", 64, 350, 520, 46, { size: 25, bold: true, color: C.blue });
  addText(s, "普通摄像头完成实时计数、即时纠错、结果留痕与人工复核；一套 Skill 贯穿训练、沉淀、复用与升级。", 64, 420, 500, 105, { size: 19, color: C.muted });
  addRule(s, 64, 560, 500, C.rule, 1);
  addText(s, "网易智企帝王蟹 ClawHive 大赛 · 镇江站", 64, 580, 500, 30, { size: 16, bold: true, color: C.ink });
  addText(s, "AI-开发主赛道｜AI-视听为核心引擎", 64, 616, 500, 28, { size: 14, color: C.muted });
  await addImage(s, `${TMP}/screens/home.png`, 676, 48, 540, 610, "练了么首页实时姿态演示", { left: 0.48, top: 0.03, right: 0.02, bottom: 0.03 });
  notes(s, "开场只讲一件事：ClawHive 已经能管理数字员工，练了么让数字员工获得对物理动作的实时感知能力。", ["README.md", "本地产品截图：.codex-tmp/pitchdeck/screens/home.png", "用户提供的大赛介绍"]);
}

// 02 Problem
{
  const s = makeSlide(p);
  addHeader(s, "招聘高峰里，考官是最稀缺的“传感器”", "BUSINESS BOTTLENECK", 2);
  addText(s, "30 × 50", 64, 176, 360, 100, { size: 78, bold: true, color: C.blue });
  addText(s, "名候选人 × 次深蹲", 68, 278, 350, 36, { size: 22, bold: true, color: C.ink });
  addText(s, "虚构演示批次，用来还原招聘现场的吞吐瓶颈", 68, 326, 372, 62, { size: 17, color: C.muted });
  addBox(s, 64, 420, 356, 170, C.navy, { geometry: "roundRect", radius: "rounded-xl" });
  addText(s, "价值验证不靠口号", 88, 446, 300, 32, { size: 22, bold: true, color: C.white });
  addText(s, "每百人考官工时\nAI / 人工计数一致性\n需复核率与争议处理时长", 88, 492, 300, 80, { size: 18, color: "#C9D5E4" });
  const steps = [
    ["01", "逐次计数", "完整动作才有效"],
    ["02", "判断幅度", "不同考官尺度不同"],
    ["03", "纸面登记", "过程证据容易丢失"],
    ["04", "解释争议", "候选人为何没被计数"],
  ];
  steps.forEach((d, i) => {
    const x = 492 + i * 176;
    addText(s, d[0], x, 192, 48, 24, { size: 14, bold: true, color: C.blue });
    addText(s, d[1], x, 232, 150, 36, { size: 24, bold: true, color: C.ink });
    addText(s, d[2], x, 282, 150, 64, { size: 16, color: C.muted });
    if (i < 3) addRule(s, x + 164, 188, 1, C.rule, 1);
  });
  addRule(s, 492, 378, 688, C.rule, 1);
  addText(s, "授权人员仍负责最终录用；练了么接管的是重复观察、计数和记录。", 492, 418, 680, 70, { size: 23, bold: true, color: C.ink });
  addText(s, "技术失败、遮挡和低置信度统一转人工复核。", 492, 514, 680, 40, { size: 18, color: C.green, bold: true });
  notes(s, "用一个具体批次让评委感受工作量。强调最终录用权仍在人手中，产品接管重复性、可标准化的观察和记录。", ["docs/PRD.md §3–4", "data/demo/enterprise_demo.json"]);
}

// 03 Product loop
{
  const s = makeSlide(p);
  addHeader(s, "一句任务，交付一份可复核结果", "PRODUCT LOOP", 3);
  addArrow(s, 366, 372, 58, C.rule);
  addArrow(s, 812, 372, 58, C.rule);
  addBox(s, 64, 178, 300, 420, C.navy, { geometry: "roundRect", radius: "rounded-xl" });
  addText(s, "HR / EHS", 88, 204, 220, 24, { size: 14, bold: true, color: "#9FB1C7" });
  addText(s, "“给今天的一线招聘批次创建深蹲 50 次检测，18:00 前完成。”", 88, 250, 250, 150, { size: 25, bold: true, color: C.white });
  addText(s, "ClawHive 选择标准、检查权限并发送任务链接", 88, 452, 250, 72, { size: 17, color: "#C9D5E4" });
  addPill(s, "任务发起", 88, 546, 112, C.green, "#123B34");
  await addImage(s, `${TMP}/screens/coach-counted.png`, 424, 210, 388, 282, "标准动作完成后实时计数为 1", { left: 0.02, top: 0.10, right: 0.25, bottom: 0.05 });
  addText(s, "普通摄像头完成实时识别、纠错与完整周期计数", 424, 518, 388, 60, { size: 18, bold: true, color: C.ink, align: "center" });
  await addImage(s, `${TMP}/screens/certification.png`, 870, 210, 346, 282, "招聘体能认证和结构化记录页面", { left: 0.04, top: 0.05, right: 0.02, bottom: 0.25 });
  addText(s, "pass / not_met / inconclusive\n结果绑定模型、规则与权重版本", 870, 518, 346, 65, { size: 18, bold: true, color: C.ink, align: "center" });
  notes(s, "一条链路讲完：任务从企业工作入口发起，普通摄像头完成检测，ClawHive 接收结构化结果并把异常交给 HR 复核。", ["docs/PRD.md §4", "README.md 企业级 Skill 形态", "本地截图：coach-counted.png、certification.png"]);
}

// 04 Live evidence
{
  const s = makeSlide(p);
  addHeader(s, "错误发生的当下，系统就解释为什么没计数", "LIVE PROOF", 4);
  await addImage(s, `${TMP}/screens/coach-error.png`, 64, 168, 790, 474, "Ghost Coach 展示膝盖和躯干纠正箭头", { left: 0.02, top: 0.10, right: 0.24, bottom: 0.04 });
  const items = [
    ["01", "阶段", "准备 / 下降 / 底部 / 上升"],
    ["02", "纠错", "膝内扣、深度不足即时提示"],
    ["03", "计数", "完整动作周期成立才 +1"],
    ["04", "降级", "低置信度进入人工复核"],
  ];
  items.forEach((d, i) => {
    const y = 176 + i * 112;
    addText(s, d[0], 902, y, 42, 28, { size: 13, bold: true, color: i === 1 ? C.orange : C.blue });
    addText(s, d[1], 954, y - 2, 200, 32, { size: 23, bold: true, color: C.ink });
    addText(s, d[2], 902, y + 40, 290, 48, { size: 16, color: C.muted });
    if (i < 3) addRule(s, 902, y + 94, 290, C.rule, 1);
  });
  addText(s, "视觉、文字、语音三条反馈通道同时工作", 902, 626, 290, 28, { size: 15, bold: true, color: C.green });
  notes(s, "这一页是核心产品证据。请现场指出橙色纠正提示、关节引导箭头和计数区域；随后说明错误动作不会被默默吞掉。", ["src/live_coach.py", "src/ghost_coach.py", "templates/index.html", "本地截图：coach-error.png"]);
}

// 05 Innovation
{
  const s = makeSlide(p);
  addHeader(s, "一个 Skill，管理一项可持续进化的模型资产", "CORE INNOVATION", 5);
  addText(s, "首次调用", 64, 176, 150, 28, { size: 18, bold: true, color: C.blue });
  addArrow(s, 255, 258, 90, C.blue);
  addArrow(s, 493, 258, 90, C.blue);
  addArrow(s, 731, 258, 90, C.blue);
  const top = [
    [64, "数据与标准", "许可检查\n48 帧切窗"],
    [345, "训练", "通用模型起点\n企业脱敏样本"],
    [583, "评估", "验证指标比较\n选择最优 checkpoint"],
    [821, "Best 权重", "tenant + standard\nversion + hash"],
  ];
  top.forEach((d, i) => {
    addBox(s, d[0], 220, i === 0 ? 190 : 190, 112, i === 3 ? C.blue : C.blueSoft, { geometry: "roundRect", radius: "rounded-lg" });
    addText(s, d[1], d[0] + 18, 240, 155, 28, { size: 20, bold: true, color: i === 3 ? C.white : C.ink });
    addText(s, d[2], d[0] + 18, 278, 155, 42, { size: 14, color: i === 3 ? "#DDE8FF" : C.muted });
  });
  addBox(s, 1050, 208, 166, 136, C.navy, { geometry: "roundRect", radius: "rounded-lg" });
  addText(s, "best_weight_id", 1058, 232, 150, 30, { size: 15, bold: true, color: C.green, align: "center" });
  addText(s, "调用、审计、回滚\n共用同一资产锚点", 1064, 278, 138, 52, { size: 14, color: C.white, align: "center" });
  addText(s, "后续调用", 64, 400, 150, 28, { size: 18, bold: true, color: C.green });
  addArrow(s, 255, 486, 90, C.green);
  addArrow(s, 493, 486, 90, C.green);
  addArrow(s, 731, 486, 90, C.green);
  const bottom = [
    [64, "任务", "传入 best_weight_id"],
    [345, "直接加载", "无需重新训练"],
    [583, "实时推理", "识别 · 计数 · 纠错"],
    [821, "结构化报告", "结论 · 版本 · 复核"],
  ];
  bottom.forEach((d, i) => {
    addBox(s, d[0], 448, 190, 96, i === 3 ? C.green : C.greenSoft, { geometry: "roundRect", radius: "rounded-lg" });
    addText(s, d[1], d[0] + 18, 466, 155, 28, { size: 20, bold: true, color: i === 3 ? C.white : C.ink });
    addText(s, d[2], d[0] + 18, 506, 155, 24, { size: 14, color: i === 3 ? "#DDF8EE" : C.muted });
  });
  addBox(s, 1050, 438, 166, 116, C.orangeSoft, { geometry: "roundRect", radius: "rounded-lg" });
  addText(s, "更优才升级", 1062, 462, 142, 28, { size: 19, bold: true, color: C.orange, align: "center" });
  addText(s, "旧版保留可回滚", 1062, 506, 142, 24, { size: 14, color: C.ink, align: "center" });
  addText(s, "这套生命周期把个人经验、企业数据和模型权重沉淀为可复用资产。", 64, 606, 1080, 34, { size: 22, bold: true, color: C.ink });
  notes(s, "这是评委最需要记住的技术创新：一次调用不只返回答案，还能沉淀一份可治理的垂直权重资产；后续调用带着明确版本进入生产流程。", ["README.md：训练 + 沉淀 + 复用", "skill-build/enterprise-pose-coach/SKILL.md §1、§6", "skill-build/enterprise-pose-coach/references/contract.md §8"]);
}

// 06 ClawHive fit
{
  const s = makeSlide(p);
  addHeader(s, "ClawHive 管企业工作流，练了么负责看懂动作", "PLATFORM FIT", 6);
  addText(s, "ClawHive 能力层", 64, 166, 220, 26, { size: 15, bold: true, color: C.muted });
  addText(s, "练了么的企业视觉能力", 372, 166, 520, 26, { size: 15, bold: true, color: C.muted });
  addText(s, "当前交付", 1030, 166, 170, 26, { size: 15, bold: true, color: C.muted, align: "right" });
  const rows = [
    ["模型层", "RTMPose / ST-GCN / Best 权重按任务加载", "本地模型已就绪", C.blue],
    ["连接层", "IM / OA 发起任务，完成后回写招聘台账", "接口最后接线", C.orange],
    ["安全层", "租户权限、最小回传、人工复核、版本审计", "契约已定义", C.green],
    ["知识层", "岗位体能标准与 EHS 动作标准版本化", "首个标准已落盘", C.green],
    ["资产层", "Skill + 权重 + 规则 + 错误事件持续复用", "Skill 包已完成", C.blue],
  ];
  rows.forEach((r, i) => {
    const y = 208 + i * 82;
    addRule(s, 64, y - 8, 1152, C.rule, 1);
    addText(s, r[0], 64, y + 8, 220, 36, { size: 23, bold: true, color: C.ink });
    addText(s, r[1], 372, y + 8, 590, 42, { size: 18, color: C.ink });
    addText(s, r[2], 1000, y + 8, 216, 36, { size: 16, bold: true, color: r[3], align: "right" });
  });
  addRule(s, 64, 610, 1152, C.rule, 1);
  addText(s, "平台提供企业级治理与分发，Skill 把现实世界的动作转成结构化事件。", 64, 632, 1040, 32, { size: 21, bold: true, color: C.ink });
  notes(s, "把项目嵌入帝王蟹五层能力，主动说明连接层仍在最后接线。这样既能证明平台适配，又不会把原型说成已上线。", ["用户提供的大赛介绍：ClawHive 五层能力", "README.md：大赛定位与能力层映射", "skill-build/enterprise-pose-coach/references/api-mapping.md"]);
}

// 07 Architecture
{
  const s = makeSlide(p);
  addHeader(s, "普通摄像头到审计结论，共五个可替换模块", "TECH ARCHITECTURE", 7);
  const nodes = [
    [64, "摄像头", "浏览器逐帧输入", C.blueSoft],
    [294, "RTMPose", "17 关键点", C.blueSoft],
    [524, "ST-GCN", "11 类 + Best 权重", C.greenSoft],
    [754, "规则引擎", "阶段 · 几何 · 去抖", C.greenSoft],
    [984, "报告与复核", "decision + version", C.orangeSoft],
  ];
  for (let i = 0; i < nodes.length - 1; i++) addArrow(s, nodes[i][0] + 172, 284, 58, i < 2 ? C.blue : C.green);
  nodes.forEach((n, i) => {
    addBox(s, n[0], 224, 172, 122, n[3], { geometry: "roundRect", radius: "rounded-lg" });
    addText(s, String(i + 1).padStart(2, "0"), n[0] + 16, 240, 32, 20, { size: 12, bold: true, color: C.muted });
    addText(s, n[1], n[0] + 16, 270, 140, 30, { size: 22, bold: true, color: C.ink });
    addText(s, n[2], n[0] + 16, 310, 140, 24, { size: 14, color: C.muted });
  });
  addBox(s, 64, 420, 548, 166, C.navy, { geometry: "roundRect", radius: "rounded-xl" });
  addText(s, "核心判定链", 88, 446, 190, 28, { size: 15, bold: true, color: C.green });
  addText(s, "姿态、动作、阶段、计数与错误码", 88, 486, 460, 38, { size: 24, bold: true, color: C.white });
  addText(s, "断网或生成式模型不可用时仍能继续工作", 88, 540, 460, 24, { size: 16, color: "#C9D5E4" });
  addBox(s, 668, 420, 548, 166, C.white, { geometry: "roundRect", radius: "rounded-xl", line: { style: "solid", fill: C.rule, width: 1 } });
  addText(s, "生成式模型的职责", 692, 446, 210, 28, { size: 15, bold: true, color: C.blue });
  addText(s, "解释、编排与友好文案", 692, 486, 460, 38, { size: 24, bold: true, color: C.ink });
  addText(s, "不接收原始人体画面，不独立做录用结论", 692, 540, 460, 24, { size: 16, color: C.muted });
  notes(s, "架构里最重要的边界是：确定性视觉和规则链负责核心判定，生成式模型负责解释与编排。企业可以替换模型或标准，不必重写业务流程。", ["README.md：技术架构", "docs/architecture.md", "src/fitness_infer.py", "src/live_coach.py", "src/local_llm.py"]);
}

// 08 Evidence
{
  const s = makeSlide(p);
  addHeader(s, "模型、数据、训练与测试都能当场核验", "VERIFIABLE EVIDENCE", 8);
  s.charts.add("line", {
    position: { left: 64, top: 174, width: 650, height: 420 },
    title: "5 轮训练准确率（%）",
    titleTextStyle: { fontSize: 18, fill: C.ink, bold: true },
    categories: ["Epoch 1", "Epoch 2", "Epoch 3", "Epoch 4", "Epoch 5"],
    series: [
      { name: "Train", values: [45.83, 70.78, 83.49, 88.74, 89.46], line: { style: "solid", fill: C.blue, width: 3 }, marker: { symbol: "circle", size: 6 } },
      { name: "Validation", values: [47.75, 73.37, 84.72, 86.18, 93.15], line: { style: "solid", fill: C.green, width: 3 }, marker: { symbol: "diamond", size: 7 } },
    ],
    hasLegend: true,
    legend: { position: "bottom", overlay: false, textStyle: { fontSize: 13, fill: C.muted } },
    chartFill: C.canvas,
    chartLine: { style: "solid", fill: C.canvas, width: 0 },
    plotAreaFill: { type: "none" },
    plotAreaLine: { style: "solid", fill: C.canvas, width: 0 },
    xAxis: { visible: true, line: { style: "solid", fill: C.rule, width: 1 }, textStyle: { fontSize: 12, fill: C.muted } },
    yAxis: { visible: true, min: 40, max: 100, majorUnit: 10, numberFormatCode: "0", majorGridlines: { style: "solid", fill: C.rule, width: 1 }, line: { style: "solid", fill: C.canvas, width: 0 }, textStyle: { fontSize: 12, fill: C.muted } },
  });
  addMetric(s, "21", "名真实受试者", 774, 184, 180, C.blue, "MM-Fit 数据源");
  addMetric(s, "8,898", "个训练窗口", 998, 184, 210, C.blue, "48 帧 × 17 关节");
  addRule(s, 774, 348, 434, C.rule, 1);
  addMetric(s, "11", "类动作", 774, 376, 180, C.green, "ST-GCN 分类模型");
  addMetric(s, "93.15%", "离线验证准确率", 998, 376, 210, C.green, "Epoch 5 / 5");
  addBox(s, 774, 560, 434, 54, C.navy, { geometry: "roundRect", radius: "rounded-lg" });
  addText(s, "23 项自动测试通过 · 无 GPU 端到端 smoke passed", 792, 575, 398, 25, { size: 16, bold: true, color: C.white, align: "center" });
  addText(s, "证据边界：93.15% 来自离线验证集；企业现场泛化仍需并行试点验证。", 64, 636, 1140, 26, { size: 14, color: C.orange, bold: true });
  notes(s, "先讲训练曲线和模型文件都可核验，再主动限定证据边界。自动测试证明业务流程与规则稳定；无 GPU smoke 不替代真实模型精度。", ["docs/mmfit-retrain-summary-2026-05-29.md", "docs/real-evidence.md", "2026-08-30 本地运行 npm run check：23 tests OK", "2026-08-30 本地运行 npm run demo：status=passed"]);
}

// 09 Trust
{
  const s = makeSlide(p);
  addHeader(s, "把错误送去复核，比给出自信的错判更重要", "ENTERPRISE TRUST", 9);
  addBox(s, 64, 172, 374, 458, C.navy, { geometry: "roundRect", radius: "rounded-xl" });
  addText(s, "FAIL CLOSED", 92, 204, 310, 30, { size: 15, bold: true, color: C.green });
  addText(s, "看不清，\n就不下结论。", 92, 270, 300, 120, { size: 46, bold: true, color: C.white });
  addText(s, "遮挡、无人入镜、模型超时或低置信度统一返回 inconclusive，并要求人工复核", 92, 430, 292, 116, { size: 19, color: "#C9D5E4" });
  addText(s, "最终录用、处分与医疗决定由授权人员作出", 92, 570, 292, 42, { size: 14, color: C.orange });
  const trust = [
    ["01", "本地推理", "原始人体画面不发送给生成式大模型"],
    ["02", "最小留存", "实时帧默认不长期保存，只回传必要事件"],
    ["03", "版本审计", "模型、规则、Best 权重和结论一一绑定"],
    ["04", "人工兜底", "争议、低置信度和技术失败进入复核"],
  ];
  trust.forEach((d, i) => {
    const y = 184 + i * 110;
    addText(s, d[0], 500, y, 42, 22, { size: 13, bold: true, color: C.blue });
    addText(s, d[1], 558, y - 4, 230, 32, { size: 23, bold: true, color: C.ink });
    addText(s, d[2], 800, y - 2, 390, 56, { size: 17, color: C.muted });
    if (i < 3) addRule(s, 500, y + 78, 690, C.rule, 1);
  });
  addPill(s, "pass", 500, 618, 92, C.green, C.greenSoft);
  addPill(s, "not_met", 604, 618, 112, C.blue, C.blueSoft);
  addPill(s, "needs_retraining", 728, 618, 154, C.orange, C.orangeSoft);
  addPill(s, "inconclusive", 894, 618, 138, C.red, C.redSoft);
  notes(s, "高影响招聘场景需要主动展示失败处理。评委会更相信一个知道何时不作判断的系统。", ["skill-build/enterprise-pose-coach/references/contract.md §3–7", "docs/PRD.md §6、§12", "README.md：数据、安全与使用边界"]);
}

// 10 Business
{
  const s = makeSlide(p);
  addHeader(s, "招聘筛选是付费入口，在岗训练打开续费空间", "BUSINESS MODEL", 10);
  addText(s, "首个 ICP", 64, 176, 180, 26, { size: 15, bold: true, color: C.blue });
  addText(s, "有明确岗位体能项目、招聘旺季需要批量检测的一线制造、仓储与服务企业", 64, 216, 510, 92, { size: 28, bold: true, color: C.ink });
  addText(s, "买方：招聘负责人\n共同决策：EHS / IT / 用工合规", 64, 336, 430, 70, { size: 18, color: C.muted });
  addBox(s, 64, 448, 510, 142, C.blueSoft, { geometry: "roundRect", radius: "rounded-xl" });
  addText(s, "ROI 用现场数据计算", 88, 472, 350, 28, { size: 20, bold: true, color: C.blue });
  addText(s, "每百人节省考官工时\n单次检测成本\nAI / 双人复核计数一致性", 88, 514, 400, 66, { size: 17, color: C.ink });
  addText(s, "LAND", 664, 176, 100, 24, { size: 14, bold: true, color: C.blue });
  addText(s, "EXPAND", 1092, 176, 100, 24, { size: 14, bold: true, color: C.green, align: "right" });
  addArrow(s, 684, 278, 130, C.rule);
  addArrow(s, 884, 278, 130, C.rule);
  const stages = [
    [632, 214, "招聘 / 转岗", "按检测次数\n或私有化年费", C.blue],
    [832, 214, "入职动作 SOP", "岗位标准订阅\n与周期复训", C.blue],
    [1032, 214, "安全与工效训练", "活跃员工 / 岗位\nSkill 调用结算", C.green],
  ];
  stages.forEach((d) => {
    addBox(s, d[0], d[1], 160, 154, d[4] === C.green ? C.greenSoft : C.white, { geometry: "roundRect", radius: "rounded-lg", line: { style: "solid", fill: d[4], width: 2 } });
    addText(s, d[2], d[0] + 16, d[1] + 24, 128, 50, { size: 20, bold: true, color: C.ink, align: "center" });
    addText(s, d[3], d[0] + 14, d[1] + 90, 132, 48, { size: 14, color: C.muted, align: "center" });
  });
  addRule(s, 632, 420, 560, C.rule, 1);
  addText(s, "同一终端、账号、权限、Skill 与审计资产持续复用；新增的是经过专家确认的岗位标准。", 632, 454, 560, 88, { size: 22, bold: true, color: C.ink });
  addText(s, "长期壁垒：版本化标准 + 真实错误事件数据 + 复核闭环 + 企业连接资产", 632, 570, 560, 54, { size: 17, color: C.green, bold: true });
  notes(s, "投资人关注谁付钱、为什么续费。招聘筛选提供清晰预算入口，入职后复用终端、权限和 Skill，扩展到持续训练。", ["README.md：商业价值与落地路径", "docs/PRD.md §2–3、商业化附录"]);
}

// 11 Pilot + status
{
  const s = makeSlide(p);
  addHeader(s, "两到四周，把技术演示变成采购证据", "PILOT & DELIVERY", 11);
  addArrow(s, 380, 306, 72, C.rule);
  addArrow(s, 810, 306, 72, C.rule);
  const pilot = [
    [64, "01", "并行运行", "单考场 · 单项目 · 单批次\nAI 与人工同时计数"],
    [452, "02", "验证指标", "考官工时 · 一致性 · 需复核率\n争议时长 · 候选人完成时长"],
    [882, "03", "进入采购", "达到双方约定门槛后\n再进入正式筛选与岗位扩展"],
  ];
  pilot.forEach((d, i) => {
    addBox(s, d[0], 202, i === 1 ? 358 : 326, 220, i === 1 ? C.blueSoft : C.white, { geometry: "roundRect", radius: "rounded-xl", line: { style: "solid", fill: i === 1 ? C.blue : C.rule, width: 1 } });
    addText(s, d[1], d[0] + 22, 224, 40, 28, { size: 14, bold: true, color: i === 1 ? C.blue : C.muted });
    addText(s, d[2], d[0] + 22, 270, i === 1 ? 310 : 280, 34, { size: 24, bold: true, color: C.ink });
    addText(s, d[3], d[0] + 22, 324, i === 1 ? 310 : 280, 70, { size: 16, color: C.muted });
  });
  addText(s, "赛场可核验", 64, 474, 150, 26, { size: 15, bold: true, color: C.green });
  const done = ["Web 实时教练与认证页", "本地模型权重", "规则与 Ghost Coach", "Skill 包与契约", "自动测试与 smoke"];
  done.forEach((t, i) => {
    addText(s, "●", 64 + i * 207, 516, 20, 24, { size: 14, color: C.green });
    addText(s, t, 86 + i * 207, 514, 174, 48, { size: 16, bold: true, color: C.ink });
  });
  addRule(s, 64, 584, 1152, C.rule, 1);
  addText(s, "最后接线：ClawHive 任务创建 · request_id 幂等 · 租户审计 · 结果回写", 64, 610, 1152, 32, { size: 18, bold: true, color: C.orange });
  notes(s, "把下一步变成一个低风险、可采购的并行试点。当前完成度也要讲清楚：核心技术闭环可核验，平台连接和企业治理字段正在最后接线。", ["README.md：建议试点、当前实现与产品方向", "docs/tasks.md", "docs/PRD.md §10–12"]);
}

// 12 Close
{
  const s = makeSlide(p, C.navy);
  addPill(s, "THE ASK", 64, 58, 110, C.green, "#123B34");
  addText(s, "让第一个“看得懂动作”的\nClawHive 数字员工上岗", 64, 148, 880, 160, { size: 58, bold: true, color: C.white });
  addText(s, "进入 ClawHive 企业级安全技能市场\n与一家制造 / 仓储企业完成首个并行试点", 64, 372, 720, 92, { size: 28, bold: true, color: "#C9D5E4" });
  addRule(s, 64, 518, 820, "#284058", 1);
  addText(s, "一个 Skill 进场，沉淀一套企业可复用的视觉能力。", 64, 550, 880, 44, { size: 25, bold: true, color: C.green });
  addText(s, "练了么 · Enterprise Pose Coach", 64, 642, 460, 26, { size: 16, color: "#9FB1C7" });
  addBox(s, 1004, 90, 144, 540, "#0B2039", { geometry: "roundRect", radius: "rounded-xl" });
  ["看见", "判断", "纠正", "计数", "留痕"].forEach((t, i) => {
    addText(s, t, 1022, 126 + i * 98, 108, 40, { size: 24, bold: true, color: i === 4 ? C.green : C.white, align: "center" });
    if (i < 4) addRule(s, 1034, 184 + i * 98, 84, "#284058", 1);
  });
  notes(s, "收尾给出明确行动：进入技能市场并完成一个并行试点。最后一句要停顿，让评委记住资产沉淀，而不是只记住一个动作识别页面。", ["README.md", "docs/PRD.md", "用户提供的大赛介绍"]);
}

// A01 Samples
{
  const s = makeSlide(p);
  addHeader(s, "备份｜三组 Sample 覆盖落地、复用与扩张", "APPENDIX · SAMPLES", 13);
  const samples = [
    [64, "S1", "招聘深蹲 50 次", "实时阶段\n即时纠错\n完整周期计数\n认证记录", "当前最强闭环", C.green],
    [458, "S2", "多项目体能组合", "11 类识别\n6 类专项规则\n通用反馈降级\nBest 权重复用", "组合判定待补", C.blue],
    [852, "S3", "入职后动作复训", "深蹲代理动作\n会话总结\n同一终端与权限\nClawHive 任务编排", "工业数据待校准", C.orange],
  ];
  samples.forEach((d) => {
    addText(s, d[1], d[0], 176, 50, 28, { size: 14, bold: true, color: d[5] });
    addText(s, d[2], d[0], 220, 320, 42, { size: 25, bold: true, color: C.ink });
    addBox(s, d[0], 286, 330, 250, C.white, { geometry: "roundRect", radius: "rounded-xl", line: { style: "solid", fill: C.rule, width: 1 } });
    addText(s, d[3], d[0] + 24, 316, 280, 160, { size: 18, color: C.ink });
    addPill(s, d[4], d[0] + 24, 486, 160, d[5], d[5] === C.green ? C.greenSoft : d[5] === C.blue ? C.blueSoft : C.orangeSoft);
  });
  addText(s, "演示纪律：S3 只展示扩张路径，不把健身数据训练的模型包装成生产级工业安全识别。", 64, 606, 1152, 40, { size: 17, bold: true, color: C.orange });
  notes(s, "三个 Sample 对应比赛要求。S1 证明落地，S2 证明复用，S3 证明市场扩张；每个样例都明确当前边界。", ["README.md：三组比赛 Sample", "docs/PRD.md §4"]);
}

// A02 Contract
{
  const s = makeSlide(p);
  addHeader(s, "Skill 契约让任务可编排、可对账、可审计", "CONTRACT", 14);
  addText(s, "INPUT", 64, 174, 120, 26, { size: 14, bold: true, color: C.blue });
  addBox(s, 64, 214, 530, 370, C.navy, { geometry: "roundRect", radius: "rounded-xl" });
  addText(s, `request_id       req-demo-001\ntenant_id        factory-demo\nstandard_id      RECRUIT_SQUAT_50_V1\nbest_weight_id   bw-factory-A-v1\nexercise         squats\ntarget_reps      50\nretention_policy raw_frames: none`, 92, 246, 474, 300, { size: 19, color: C.white });
  addText(s, "OUTPUT", 686, 174, 120, 26, { size: 14, bold: true, color: C.green });
  addBox(s, 686, 214, 530, 370, C.greenSoft, { geometry: "roundRect", radius: "rounded-xl" });
  addText(s, `decision            pass\nvalid_rep_count     50\ninvalid_rep_count   3\nreview_status       not_required\nmodel_version       ...\nrule_version        RECRUIT_SQUAT_50_V1\nbest_weight_id      bw-factory-A-v1`, 714, 246, 474, 300, { size: 19, color: C.ink });
  addText(s, "同一 tenant_id + request_id 重复调用返回同一 task_id；inconclusive 必须进入 required review。", 64, 616, 1152, 34, { size: 17, bold: true, color: C.ink });
  notes(s, "契约页用于回答 Skill 完整度问题。输入解决幂等、租户与标准选择；输出解决回写、复核和审计追溯。", ["skill-build/enterprise-pose-coach/references/contract.md", "skill-build/enterprise-pose-coach/references/api-mapping.md", "skill-build/enterprise-pose-coach/examples/"]);
}

// A03 Readiness / risks
{
  const s = makeSlide(p);
  addHeader(s, "备份｜当前证据、最后缺口与风险处置", "APPENDIX · READINESS", 15);
  const hdr = [64, 340, 770, 1050];
  addText(s, "工作流", hdr[0], 166, 220, 24, { size: 14, bold: true, color: C.muted });
  addText(s, "当前证据", hdr[1], 166, 360, 24, { size: 14, bold: true, color: C.muted });
  addText(s, "最后缺口 / 处置", hdr[2], 166, 430, 24, { size: 14, bold: true, color: C.muted });
  const rows = [
    ["真实模型", "权重、训练日志、GPU 启动证据", "目标演示机补 10 分钟稳定性与 FPS 记录", C.green],
    ["无 GPU Harness", "23 tests OK；端到端 smoke passed", "明确只证明流程，不替代模型精度", C.green],
    ["ClawHive 适配", "Skill 包、字段契约、API 映射", "任务创建、幂等回写、租户审计接线", C.orange],
    ["企业泛化", "MM-Fit 离线验证 93.15%", "固定考场并行试点，统计误拒与改判", C.orange],
    ["可用性", "Ghost Coach 测试协议已建", "当前真人参与者 0；完成 5 人测试后再主张", C.red],
  ];
  rows.forEach((r, i) => {
    const y = 204 + i * 82;
    addRule(s, 64, y - 8, 1152, C.rule, 1);
    addText(s, r[0], 64, y + 8, 230, 34, { size: 21, bold: true, color: C.ink });
    addText(s, r[1], 340, y + 8, 370, 45, { size: 17, color: C.ink });
    addText(s, r[2], 770, y + 8, 400, 48, { size: 17, color: C.muted });
    addText(s, "●", 1180, y + 10, 22, 22, { size: 14, color: r[3], align: "right" });
  });
  addRule(s, 64, 618, 1152, C.rule, 1);
  addText(s, "可信度来自清楚区分：已经跑通的、可以核验的、仍需试点的。", 64, 636, 1152, 28, { size: 18, bold: true, color: C.ink });
  notes(s, "如果评委追问完成度，用这页正面回答。真人可用性研究当前没有参与者，因此不能声称已经验证。", ["docs/tasks.md", "docs/acceptance.md", "docs/ghost-coach-usability-results.md", "data/usability/ghost-coach-study.json", "2026-08-30 本地验证日志"]);
}

await fs.mkdir(`${TMP}/rendered`, { recursive: true });
const pptx = await PresentationFile.exportPptx(p);
await pptx.save(OUT);

const snapshot = await p.inspect({ kind: "slide,textbox,shape,image,chart,notes", maxChars: 24000 });
await fs.writeFile(`${TMP}/deck-inspect.ndjson`, snapshot.ndjson, "utf8");

console.log(`Created ${OUT}`);
