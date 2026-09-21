import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { pathToFileURL } from "node:url";
import { FileBlob, PresentationFile } from "@oai/artifact-tool";

const root = process.cwd();
const skillDir = "C:\\Users\\lubw1\\.codex\\plugins\\cache\\openai-primary-runtime\\presentations\\26.909.12148\\skills\\presentations";
const source = path.join(root, "deliverables", "练了么-ClawHive世界级黑客松路演.pptx");
const buildDir = path.join(root, ".codex-ppt-original-adapt-20260921");
const draft = path.join(buildDir, "candidate.pptx");
const output = path.join(root, "deliverables", "练了么-2026全球智能体大赛-A赛道-原版风格修订-v2.pptx");
await fs.mkdir(buildDir, { recursive: true });
const presentation = await PresentationFile.importPptx(await FileBlob.load(source));
const inspected = await presentation.inspect({ kind: "slide,textbox,shape,image,layout", maxChars: 300000 });
const rows = inspected.ndjson.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
await fs.writeFile(path.join(buildDir, "source-inspect.ndjson"), inspected.ndjson);

function change(slide, before, after) {
  const matches = rows.filter(r => r.kind === "textbox" && r.slide === slide && r.text === before);
  if (matches.length !== 1) throw new Error(`Expected one text box on slide ${slide}: ${before}; found ${matches.length}`);
  const shape = presentation.resolve(matches[0].id);
  if (before.includes("\n")) shape.text = after;
  else shape.text.replace(before, after);
}
function apply(slide, pairs) { for (const [before, after] of pairs) change(slide, before, after); }
function notes(slide, value) { presentation.slides.getItem(slide - 1).speakerNotes.textFrame.setText(value); }

apply(1, [
  ["CLAW HIVE × ENTERPRISE VISION SKILL", "2026 GLOBAL AGENT COMPETITION"],
  ["让 ClawHive 的数字员工\n真正看见现场", "让企业数字员工\n看懂现场动作"],
  ["练了么｜企业体能与岗位动作评估数字员工", "练了么｜企业现场动作数字员工"],
  ["普通摄像头完成实时计数、即时纠错、结果留痕与人工复核；一套 Skill 贯穿训练、沉淀、复用与升级。", "普通摄像头完成实时计数、即时纠错和风险提醒；训练与安全事件留下可复核记录。"],
  ["网易智企帝王蟹 ClawHive 大赛 · 镇江站", "2026 全球智能体大赛"],
  ["AI-开发主赛道｜AI-视听为核心引擎", "A 赛道｜智能体搭建赛"],
]);
notes(1, "基于原版 ClawHive 路演母版修订。比赛信息来自用户提供的 2026 全球智能体大赛通知；报名平台最新细则未能独立核验。项目当前核心是本地实时教练与安全监测模块，平台智能体空间仍需发布验收。\n依据：README.md；deliverables/A赛道-设计文档.md；web_app.py；src/pipeline_safety/。");

apply(2, [
  ["BUSINESS BOTTLENECK", "FIELD BOTTLENECK"],
  ["招聘高峰里，考官是最稀缺的“传感器”", "企业现场缺的，是持续看动作的人"],
  ["30 × 50", "3 × 1"],
  ["名候选人 × 次深蹲", "三段现场任务 × 一套视觉能力"],
  ["虚构演示批次，用来还原招聘现场的吞吐瓶颈", "招聘、在岗训练与安全巡检共享动作观察需求"],
  ["价值验证不靠口号", "采购前先测现场指标"],
  ["每百人考官工时\nAI / 人工计数一致性\n需复核率与争议处理时长", "人工观察工时\n有效动作判断一致性\n每摄像头小时误报率"],
  ["逐次计数", "招聘筛选"],
  ["完整动作才有效", "考官逐人观察与登记"],
  ["判断幅度", "在岗训练"],
  ["不同考官尺度不同", "动作错误缺少即时反馈"],
  ["纸面登记", "工业安全"],
  ["过程证据容易丢失", "异常往往事后才被发现"],
  ["解释争议", "事后复核"],
  ["候选人为何没被计数", "缺少同一规则下的过程记录"],
  ["授权人员仍负责最终录用；练了么接管的是重复观察、计数和记录。", "录用、安全处置仍由授权人员决定；系统承担重复观察和事件记录。"],
  ["技术失败、遮挡和低置信度统一转人工复核。", "遮挡、低置信度和模型不可用时，明确转人工核查。"],
]);
notes(2, "用户提供的三个场景是招聘筛选、在岗训练、工业安全。此页不使用尚无现场实测支持的 3 倍吞吐或 40% 周期缩短。\n依据：用户提供的场景思路；README.md；config/safety/default.json。");

apply(3, [
  ["PRODUCT LOOP", "PRODUCT LOOP"],
  ["一句任务，交付一份可复核结果", "一次动作检测，贯通任务与记录"],
  ["“给今天的一线招聘批次创建深蹲 50 次检测，18:00 前完成。”", "“安排深蹲 50 次检测，并记录需要复训的动作问题。”"],
  ["ClawHive 选择标准、检查权限并发送任务链接", "比赛空间拟负责选标准、分发任务和汇总异常"],
  ["任务发起", "任务入口"],
  ["普通摄像头完成实时识别、纠错与完整周期计数", "浏览器摄像头完成识别、纠错与完整周期计数"],
  ["pass / not_met / inconclusive\n结果绑定模型、规则与权重版本", "会话总结与认证记录已在本地实现\n企业系统回写仍待接入"],
]);
notes(3, "中间和右侧保留原版真实产品截图。当前 Web 已实现 /coach、/certification 和会话 API；智能体任务分发、企业台账回写仍是接入计划。\n依据：web_app.py；templates/coach.html；templates/certification.html。");

apply(4, [
  ["LIVE PROOF", "LIVE PROOF"],
  ["错误发生的当下，系统就解释为什么没计数", "动作出错时，画面指出该怎么调整"],
  ["膝内扣、深度不足即时提示", "膝内扣、深度不足及时提示"],
  ["视觉、文字、语音三条反馈通道同时工作", "画面标注、短句提示与语音播报同步工作"],
]);
notes(4, "此页沿用原版 Ghost Coach 界面截图，展示实时纠错与完整周期计数。截图是产品界面证据，不代表工业现场准确率。\n依据：src/live_coach.py；src/ghost_coach.py；templates/index.html。");

apply(5, [
  ["CORE INNOVATION", "MODEL & RULE ASSETS"],
  ["一个 Skill，管理一项可持续进化的模型资产", "本地模型与规则，组成可复用的现场能力"],
  ["首次调用", "当前离线链路"],
  ["数据与标准", "公开样本"],
  ["许可检查\n48 帧切窗", "MM-Fit 数据\n48 帧切窗"],
  ["训练", "模型训练"],
  ["通用模型起点\n企业脱敏样本", "ST-GCN 训练脚本\n本地运行"],
  ["评估", "训练选优"],
  ["验证指标比较\n选择最优 checkpoint", "比较验证指标\n保存 checkpoint"],
  ["Best 权重", "本地权重"],
  ["tenant + standard\nversion + hash", "模型文件落盘\n供推理加载"],
  ["best_weight_id", "当前边界"],
  ["调用、审计、回滚\n共用同一资产锚点", "租户注册与回滚\n尚未打通"],
  ["后续调用", "企业增量流程"],
  ["任务", "授权样本"],
  ["传入 best_weight_id", "企业许可与标注"],
  ["直接加载", "候选版本"],
  ["无需重新训练", "参数或权重更新"],
  ["实时推理", "离线回放"],
  ["识别 · 计数 · 纠错", "对比误判与漏判"],
  ["结构化报告", "人工批准"],
  ["结论 · 版本 · 复核", "EHS 确认岗位标准"],
  ["更优才升级", "发布回滚"],
  ["旧版保留可回滚", "旧版保留可恢复"],
  ["这套生命周期把个人经验、企业数据和模型权重沉淀为可复用资产。", "规则调参普通电脑即可；ST-GCN 可用 CPU 训练，RTMPose 微调建议 GPU。"],
]);
notes(5, "呼应当前对话的调参问题：ClawHive 或比赛智能体可辅助分析错误、提出参数候选和编排评测；现有仓库只有离线训练脚本和本地权重，尚无按租户自动训练、注册、回滚的运行时链路。规则调参不需要 GPU，小型 ST-GCN 可用 CPU，RTMPose 微调建议 GPU。\n依据：src/train.py；model/mmfit_pose11cls_stride48_best.pth；config/posture_standards/recruit_squat_50_v1.json；deliverables/练了么-评委问答手册.md。");

apply(6, [
  ["PLATFORM FIT", "A-TRACK DESIGN"],
  ["ClawHive 管企业工作流，练了么负责看懂动作", "A 赛道：一个空间协同现场动作任务"],
  ["ClawHive 能力层", "智能体职责组"],
  ["练了么的企业视觉能力", "可复用的本地能力"],
  ["当前交付", "提交状态"],
  ["模型层", "任务与标准"],
  ["RTMPose / ST-GCN / Best 权重按任务加载", "任务拆解、岗位标准、训练计划、设备检查"],
  ["本地模型已就绪", "角色待上架"],
  ["连接层", "动作教练"],
  ["IM / OA 发起任务，完成后回写招聘台账", "RTMPose、ST-GCN、阶段计数与即时纠错"],
  ["接口最后接线", "本地链路可演示"],
  ["安全层", "安全提醒"],
  ["租户权限、最小回传、人工复核、版本审计", "六类规则、持续门控、同类冷却与事件留档"],
  ["契约已定义", "PPE 权重待补"],
  ["知识层", "复核与报告"],
  ["岗位体能标准与 EHS 动作标准版本化", "会话总结、事件确认与认证记录"],
  ["首个标准已落盘", "业务适配待验收"],
  ["资产层", "模型资产"],
  ["Skill + 权重 + 规则 + 错误事件持续复用", "离线训练选优、本地权重与版本登记方案"],
  ["Skill 包已完成", "注册回滚待实现"],
  ["平台提供企业级治理与分发，Skill 把现实世界的动作转成结构化事件。", "A 赛道要求同一空间至少 10 个有效智能体；当前为职责设计，以平台验收为准。"],
]);
notes(6, "根据用户提供的比赛通知，A 赛道提交一个智能体空间，空间内至少 10 个有效智能体。仓库无法证明 19 个智能体已经在比赛平台发布。此页明确区分本地能力和待上架角色。若转投 B 赛道，需要另行封装至少 6 个有效 Skill。\n依据：用户提供的比赛通知；deliverables/A赛道-设计文档.md；web_app.py；src/pipeline_safety/。");

apply(7, [
  ["TECH ARCHITECTURE", "TECH ARCHITECTURE"],
  ["普通摄像头到审计结论，共五个可替换模块", "两条本地视觉链路，共用规则与事件思路"],
  ["浏览器逐帧输入", "浏览器与工位视频"],
  ["RTMPose", "姿态估计"],
  ["17 关键点", "RTMPose / YOLO Pose"],
  ["ST-GCN", "动作理解"],
  ["11 类 + Best 权重", "11 类动作 / 人员跟踪"],
  ["阶段 · 几何 · 去抖", "计数 / 六类风险 / 去抖"],
  ["报告与复核", "记录与复核"],
  ["decision + version", "会话总结 / SQLite 事件"],
  ["核心判定链", "训练与考核"],
  ["姿态、动作、阶段、计数与错误码", "阶段、次数、Top 错误与短句反馈"],
  ["断网或生成式模型不可用时仍能继续工作", "逐帧计数以确定性规则为准"],
  ["生成式模型的职责", "工业安全"],
  ["解释、编排与友好文案", "六类风险事件、截图与确认记录"],
  ["不接收原始人体画面，不独立做录用结论", "独立 PPE 权重缺失时，头盔检测不可用"],
]);
notes(7, "训练链路使用 RTMPose + ST-GCN + 几何规则。工业安全模块单独使用 YOLO Pose、独立 PPE 模型接口和六类规则；当前仓库没有配置路径所指向的 PPE 权重文件。两条链路共用业务场景，但并非同一个已整合的模型推理管线。\n依据：web_app.py；src/live_coach.py；src/pipeline_safety/monitor.py；src/pipeline_safety/detector.py；config/safety/default.json。");

apply(8, [
  ["VERIFIABLE EVIDENCE", "VERIFIABLE EVIDENCE"],
  ["模型、数据、训练与测试都能当场核验", "本地权重可核验，现场准确率仍待测"],
  ["离线验证准确率", "窗口验证选模指标"],
  ["23 项自动测试通过 · 无 GPU 端到端 smoke passed", "23 项流程测试通过 · 安全模块配置六类规则"],
  ["证据边界：93.15% 来自离线验证集；企业现场泛化仍需并行试点验证。", "93.15% 的随机滑窗划分可能泄漏；不能当作企业现场准确率。"],
]);
notes(8, "源图为五轮训练曲线，沿用原版可编辑图表。MM-Fit 数据有 21 名受试者、8,898 个训练窗口、11 类动作。93.15% 是随机滑窗划分上的选模指标，邻近窗口可能跨训练与验证集；没有按受试者独立测试，不得对外称现场准确率。23 项 harness 测试已在本次任务重新运行通过。\n依据：docs/real-evidence.md；docs/mmfit-retrain-summary-2026-05-29.md；npm run test 本次输出。");

apply(9, [
  ["ENTERPRISE TRUST", "RISK & REVIEW"],
  ["把错误送去复核，比给出自信的错判更重要", "现场告警先降误报，关键结论留给人"],
  ["FAIL CLOSED", "HUMAN REVIEW"],
  ["看不清，\n就不下结论。", "看不清，\n交给人判断。"],
  ["遮挡、无人入镜、模型超时或低置信度统一返回 inconclusive，并要求人工复核", "遮挡、无人入镜或模型不可用时，记录技术失败并提示人工核查"],
  ["最终录用、处分与医疗决定由授权人员作出", "录用、安全处置和医疗判断由授权人员负责"],
  ["本地推理", "本地推理"],
  ["原始人体画面不发送给生成式大模型", "视觉模型和规则在本地运行"],
  ["最小留存", "持续门控"],
  ["实时帧默认不长期保存，只回传必要事件", "风险持续达到配置时间才触发告警"],
  ["版本审计", "同类冷却"],
  ["模型、规则、Best 权重和结论一一绑定", "同一风险在冷却期内不重复轰炸"],
  ["人工兜底", "跟踪复位"],
  ["争议、低置信度和技术失败进入复核", "人员丢失时清理规则状态，避免残留误报"],
  ["pass", "已完成"],
  ["not_met", "需纠正"],
  ["needs_retraining", "需核查"],
  ["inconclusive", "无法判定"],
]);
notes(9, "三层去抖来自安全规则的 duration_seconds、cooldown_seconds 与 expire_tracks。跌倒、低头静止、倒地静止均属于风险信号，不得宣称医学诊断或零误报。截图留档由配置控制，需按企业隐私政策使用。\n依据：src/pipeline_safety/rules.py；config/safety/default.json；src/pipeline_safety/events.py。");

apply(10, [
  ["BUSINESS MODEL", "BUSINESS MODEL"],
  ["招聘筛选是付费入口，在岗训练打开续费空间", "单点部署，从招聘延伸到在岗与安全"],
  ["首个 ICP", "首个客户"],
  ["有明确岗位体能项目、招聘旺季需要批量检测的一线制造、仓储与服务企业", "有岗位动作培训和批量考核需求的制造、仓储企业"],
  ["买方：招聘负责人\n共同决策：EHS / IT / 用工合规", "买方：培训或 EHS 负责人\n部署与合规由 IT 参与"],
  ["ROI 用现场数据计算", "价值用试点数据计算"],
  ["每百人节省考官工时\n单次检测成本\nAI / 双人复核计数一致性", "人工观察工时\n复训后错误率\n每摄像头小时误报率"],
  ["招聘 / 转岗", "招聘 / 转岗"],
  ["按检测次数\n或私有化年费", "单点部署费\n按检测量服务"],
  ["入职动作 SOP", "在岗训练"],
  ["岗位标准订阅\n与周期复训", "年度服务费\n岗位规则适配"],
  ["安全与工效训练", "现场安全"],
  ["活跃员工 / 岗位\nSkill 调用结算", "按工位扩展\n持续规则维护"],
  ["同一终端、账号、权限、Skill 与审计资产持续复用；新增的是经过专家确认的岗位标准。", "先验证一个训练点的准确性与使用率，再扩展到相邻岗位和安全工位。"],
  ["长期壁垒：版本化标准 + 真实错误事件数据 + 复核闭环 + 企业连接资产", "收费方式是商业假设；目前没有付费客户，也没有 3 倍或 40% 的现场实测。"],
]);
notes(10, "此页是商业化假设，不应表述为已签约或已产生收入。用户提出的招聘吞吐约 3 倍、新人上手周期缩短约 40% 没有可核验试点数据，因此不写成成果。\n依据：用户提供的落地价值设想；README.md；deliverables/练了么-投资人尽调意见书.md。");

apply(11, [
  ["PILOT & DELIVERY", "PILOT & DELIVERY"],
  ["两到四周，把技术演示变成采购证据", "四周试点，量出准确性与人工成本"],
  ["并行运行", "第 1 周：定标准"],
  ["单考场 · 单项目 · 单批次\nAI 与人工同时计数", "选一个岗位动作\n记录人工基线"],
  ["验证指标", "第 2–3 周：并行"],
  ["考官工时 · 一致性 · 需复核率\n争议时长 · 候选人完成时长", "AI 与人工同步观察\n保留分歧和遮挡样例"],
  ["进入采购", "第 4 周：复盘"],
  ["达到双方约定门槛后\n再进入正式筛选与岗位扩展", "对照预先约定指标\n决定是否扩到更多工位"],
  ["赛场可核验", "当前可核验"],
  ["Web 实时教练与认证页", "Web 实时教练与认证页"],
  ["本地模型权重", "本地模型权重"],
  ["规则与 Ghost Coach", "安全六类规则与事件接口"],
  ["Skill 包与契约", "版本化动作标准配置"],
  ["自动测试与 smoke", "23 项流程测试与 smoke"],
  ["最后接线：ClawHive 任务创建 · request_id 幂等 · 租户审计 · 结果回写", "A 赛道提交前还需：发布至少 10 个有效智能体，并保存协作运行记录。"],
]);
notes(11, "试点计划不是客户承诺。建议预设人工计数一致性、需复核率、每摄像头小时误报率、观察工时与复训后错误率等指标。报名平台有效智能体数量必须以平台反馈核验。\n依据：用户提供赛事要求；README.md；src/pipeline_safety/。");

apply(12, [
  ["THE ASK", "THE ASK"],
  ["让第一个“看得懂动作”的\nClawHive 数字员工上岗", "让现场每一次动作\n都有标准和证据"],
  ["进入 ClawHive 企业级安全技能市场\n与一家制造 / 仓储企业完成首个并行试点", "寻找一家制造 / 仓储试点企业\n选一个岗位动作，做四周并行验证"],
  ["一个 Skill 进场，沉淀一套企业可复用的视觉能力。", "先量出误判、工时和复训效果，再决定扩展。"],
  ["练了么 · Enterprise Pose Coach", "练了么 · AI 现场动作数字员工"],
  ["看见", "感知"],
  ["判断", "纠错"],
  ["纠正", "计数"],
  ["计数", "预警"],
  ["留痕", "复核"],
]);
notes(12, "收束到具体试点请求：一家企业、一个岗位动作、四周并行验证。避免承诺已经具备生产级安全告警或自动招聘决策。\n依据：用户提供的新赛事方向；项目当前实现。");

apply(13, [
  ["APPENDIX · SAMPLES", "APPENDIX · SCENARIOS"],
  ["备份｜三组 Sample 覆盖落地、复用与扩张", "备份｜三类场景共享动作观察能力"],
  ["多项目体能组合", "在岗动作训练"],
  ["11 类识别\n6 类专项规则\n通用反馈降级\nBest 权重复用", "11 类动作识别\n6 类专项纠错\n实时语音提示\n会话训练总结"],
  ["组合判定待补", "项目组合待补"],
  ["入职后动作复训", "工业安全预警"],
  ["深蹲代理动作\n会话总结\n同一终端与权限\nClawHive 任务编排", "6 类风险规则\n三层去抖\nSQLite 事件留档\nPPE 权重待补"],
  ["工业数据待校准", "现场数据待校准"],
  ["演示纪律：S3 只展示扩张路径，不把健身数据训练的模型包装成生产级工业安全识别。", "安全事件可展示规则与留档流程；误报、漏报和 PPE 模型需现场验证。"],
]);
notes(13, "S1、S2 属于当前训练 Web 主链能力。S3 源码已包含安全监测、六类规则和事件接口，但独立 PPE 权重缺失，现场误报漏报尚未评估。\n依据：web_app.py；src/live_coach.py；src/pipeline_safety/；config/safety/default.json。");

apply(14, [
  ["CONTRACT", "CURRENT APIS"],
  ["Skill 契约让任务可编排、可对账、可审计", "两个本地接口链路，支撑训练与安全演示"],
  ["INPUT", "训练会话"],
  ["request_id       req-demo-001\ntenant_id        factory-demo\nstandard_id      RECRUIT_SQUAT_50_V1\nbest_weight_id   bw-factory-A-v1\nexercise         squats\ntarget_reps      50\nretention_policy raw_frames: none", "POST /api/session/start\n  exercise: squats\nPOST /api/session/frame\n  session_id + image_data\nPOST /api/session/stop\n  summary: 次数 / 错误 / 时长"],
  ["OUTPUT", "安全事件"],
  ["decision            pass\nvalid_rep_count     50\ninvalid_rep_count   3\nreview_status       not_required\nmodel_version       ...\nrule_version        RECRUIT_SQUAT_50_V1\nbest_weight_id      bw-factory-A-v1", "POST /safety/api/frame\n  frame: JPEG / PNG\nGET /safety/api/events\n  规则 / 工位 / 时间 / 截图\nPOST /safety/api/events/{id}/acknowledge\n  人工确认事件"],
  ["同一 tenant_id + request_id 重复调用返回同一 task_id；inconclusive 必须进入 required review。", "上图为当前运行时接口；租户鉴权、幂等回写与 Best 权重注册尚未实现。"],
]);
notes(14, "此页特意把原版中仅存在于契约示例、尚无运行时代码的 best_weight_id 和 decision 移除。左侧是 web_app.py 当前会话 API；右侧是 safety_web.py 当前安全事件 API。生产级鉴权、幂等、租户隔离待实现。\n依据：web_app.py；src/pipeline_safety/safety_web.py。");

apply(15, [
  ["APPENDIX · READINESS", "APPENDIX · READINESS"],
  ["备份｜当前证据、最后缺口与风险处置", "备份｜赛道交付与技术边界"],
  ["工作流", "交付项"],
  ["当前证据", "当前状态"],
  ["最后缺口 / 处置", "提交前验收"],
  ["真实模型", "动作教练"],
  ["权重、训练日志、GPU 启动证据", "本地权重、训练脚本与实时页面"],
  ["目标演示机补 10 分钟稳定性与 FPS 记录", "真机记录 FPS、失败率与持续运行表现"],
  ["无 GPU Harness", "安全监测"],
  ["23 tests OK；端到端 smoke passed", "六类规则、事件库与确认接口"],
  ["明确只证明流程，不替代模型精度", "补齐 PPE 权重，测误报与漏报"],
  ["ClawHive 适配", "智能体空间"],
  ["Skill 包、字段契约、API 映射", "本地工具与 19 角色职责方案"],
  ["任务创建、幂等回写、租户审计接线", "至少 10 个有效智能体和协作日志"],
  ["企业泛化", "现场精度"],
  ["MM-Fit 离线验证 93.15%", "窗口验证仅用于选模"],
  ["固定考场并行试点，统计误拒与改判", "按人员和场地独立测试，再定阈值"],
  ["可用性", "企业治理"],
  ["Ghost Coach 测试协议已建", "单机会话和本地记录已有"],
  ["当前真人参与者 0；完成 5 人测试后再主张", "补鉴权、租户隔离、审计与人工复核"],
  ["可信度来自清楚区分：已经跑通的、可以核验的、仍需试点的。", "赛道门槛与模型性能均需独立验收；演示功能不等于生产级部署。"],
]);
notes(15, "A 赛道官方门槛来自用户提供信息：1 个智能体空间内至少 10 个有效智能体。仓库当前只有角色方案，未见平台空间的核验证据。安全帽 PPE 模型配置路径对应权重缺失。93.15% 不是现场精度。\n依据：用户提供通知；deliverables/A赛道-设计文档.md；docs/real-evidence.md；config/safety/default.json；web_app.py。");

// Preserve the imported 15-slide structure, masters, images, colors, and geometry.
await (await PresentationFile.exportPptx(presentation)).save(draft);
const sourceHash = crypto.createHash("sha256").update(await fs.readFile(source)).digest("hex");
const { finalizePresentation } = await import(pathToFileURL(path.join(skillDir, "container_tools", "artifact_tool_utils.mjs")).href);
const result = await finalizePresentation({
  workspaceDir: root,
  candidatePath: draft,
  finalPath: output,
  pythonExecutable: "C:\\Users\\lubw1\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe",
  integrityValidatorPath: path.join(skillDir, "container_tools", "inspect_presentation_package_integrity.py"),
  layoutValidatorPath: path.join(skillDir, "container_tools", "inspect_presentation_layout_geometry.py"),
  layoutArgs: ["--expected-slide-size-emu", "12192000,6858000", "--validate-heading-fit", "--validate-bullet-geometry"],
  explicitTotalSlideCount: 15,
  requiredNativeTableOwnerSlides: [],
  requiredNativeChartOwnerSlides: [],
  materializeLiteralChartWorkbooks: true,
  fontPolicy: { basis: "reference", families: ["Microsoft YaHei", "Calibri"], referencePath: source, referenceSha256: sourceHash },
  verifyArtifactToolImport: true,
  receiptPath: path.join(buildDir, "validation-v2.json"),
});
console.log(JSON.stringify({ output, result }, null, 2));
