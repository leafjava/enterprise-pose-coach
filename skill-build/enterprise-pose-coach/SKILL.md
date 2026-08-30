---
name: enterprise-pose-coach
display_name: 练了么 · AI 体能数字员工
version: 1.1.0
vendor: lian-le-ma
category: computer-vision
track: ai-development
description: |
  面向工厂、仓储等制造企业招聘 / 转岗 / 在岗训练的 **AI 体能数字员工 Skill**。
  把"靠人多 / 标准不一 / 事后无法复核 / 跟 HR 系统割裂"的现场体能考官，
  升级成"同一规则 / 自动计数 / 即时纠错 / 可解释复核 / 回写招聘台账"的标准化 AI 数字员工。

  本 Skill 自带 **训练 + 沉淀 + 复用** 生命周期：当 ClawHive Agent 第一次调用时，
  Skill 指导 Agent 完成 **数据获取 → 数据处理 → 模型训练 → 效果评估 → 选择 Best 权重 → 沉淀**；
  后续每一次调用都直接加载这个 Best 权重，不需要重新训练。

  Best 权重按 `bw_<tenant>_<date>_<version>.pth` 命名并按租户命名空间隔离，
  **可下载、可私有部署、可重复调用、可持续进化（旧版可回滚）**。

  运行时的实时链路是 **四个"实时"在同一画面上同时可见**：
  实时监测（毫秒级阶段切换）+ 实时纠正（即时提示 + 语音播报）+ 实时计数（完整动作周期 +1）+ 实时反馈。

  输出 `decision ∈ {pass, not_met, needs_retraining, inconclusive}` 与 `best_weight_id`，
  供 HR / EHS 复核与回写招聘台账。

  **核心金句**：传统 Skill 编排已有能力；练了么 Skill 帮助 Agent 训练、沉淀并持续调用新的垂直能力。
allowed-tools:
  - python.exec
  - file.read
  - webhook.notify
  - data.write
  - audit.emit
  - best_weight.load
  - best_weight.retrain
---

# 练了么 · AI 体能数字员工 Skill（训练 + 沉淀 + 复用 · v1.1.0）

## 0. 这是什么：AI 体能数字员工，不止是一个 Skill

`enterprise-pose-coach` 是面向**制造 / 仓储企业**招聘、转岗、在岗训练场景的 AI 体能数字员工 Skill，对应"**训练 + 沉淀 + 复用**"完整生命周期。它把现场考官**逐人盯 / 尺度不一 / 事后无法解释 / 系统割裂**的人力工作，升级成同一规则下的**自动计数、即时纠错、可解释复核、回写招聘台账**。

### 0.1 现场痛点 → 数字员工解法

| 现场痛点 | 业务后果 | AI 数字员工解法 |
|---|---|---|
| 招聘高峰必须人工盯着数次数 | 吞吐量被考官人数卡住，候选人排队时间长 | 摄像头自动识别完整动作周期并实时计数 |
| 不同���官判断尺度不同 | 漏数、误数、动作幅度争议多 | 同一规则版本 + 毫秒级阶段判定 + 几何规则可解释 |
| 纸面只记最终结果 | 事后无法解释、无法复核 | 结构化会话事件 + Top 错误码 + 错误 cue 文案可回放 |
| 检测工具与 HR 系统割裂 | HR 手工录入和通知 | 通过 `notify_url` 把 `decision + best_weight_id` 回写到招聘台账 |

### 0.2 ClawHive 五层能力对齐

本 Skill 直接落到 ClawHive 的五层能力，不只是文档贴标：

| ClawHive 能力层 | 本 Skill 的落地形态 |
|---|---|
| 模型层 | 成熟通用模型（RTMPose + ST-GCN + YOLOv8n）+ 训练出来的垂直模型（Best 权重）；训练起点是 `stgcn-mmfit-11cls-stride48@2026-05-29` |
| 连接层 | 从飞书 / 钉钉 / 企微 / OA 发起检测；通过 `notify_url` 把 `decision + best_weight_id` 回写到招聘台账 |
| 安全层 | 等保三级 + ISO27001；租户权限隔离、最小数据回传、人工复核、全链路审计；原始帧默认不长期保存，不上传给生成式大模型 |
| 知识层 | 企业版本化招聘体能标准与 EHS 岗位标准作为 Skill 训练输入；Best 权重命名按 `tenant + standard + version` |
| 资产层 | 单 Skill 自带 训练 + 沉淀 + 复用 生命周期；Best 权重按租户沉淀为企业专属资产，可下��、可私有部署、可重复调用、可持续进化（旧版可回滚） |

### 0.3 核心金句（路演必说）

- **核心金句**：传统 Skill 编排已有能力；练了么 Skill 帮助 Agent 训练、沉淀并持续调用新的垂直能力。
- **辅助金句（必说三次）**：监测是实时的，纠错是实时的，计数是实时的，反馈也是实时的。
- **帝王蟹定位金句**：个人经验 + 一次活动页面不算企业资产；**带训练流程 + 可沉淀 + 可复用 + 可进化** 的企业 Skill 才是帝王蟹要的企业级数字员工资产。

## 1. 这不是一个传统 Skill：训练 + 沉淀 + 复用

```text
成熟通用模型（RTMPose + ST-GCN + YOLOv8n，本地或仓库内）
        ↓   首次调用：在通用模型之上训练
训练出来的垂直模型（Best 权重，按 tenant + standard + version 沉淀）
        ↓   后续调用：直接加载
实时应用层（本 Skill：实时监测 + 实时纠正 + 实时计数 + 实时反馈）
        ↓
结构化评估报告（decision / valid_rep_count / top_errors / best_weight_id / rule_version）
        ↓
Webhook 回写或数据落库，供 HR / EHS 复核
```

Skill 的两阶段调用：

1. **首次调用（训练 + 沉淀）**：Agent 发起"为新工厂 A 训练深蹲 50 次招聘能力"的请求，Skill 带着 Agent 完成
   *数据获取 → 数据处理（清洗 / 关键点转换 / 48 帧切窗 / 划分） → 模型训练 → 效果评估 → 选择 Best 权重 → 沉淀*，输出 `best_weight_id`。
2. **后续调用（直接复用）**：Agent 发起"今天 A 批候选人创建深蹲 50 次检测"，Skill 直接加载之前沉淀的 `best_weight_id`，进入**实时监测 + 实时纠正 + 实时计数 + 实时反馈**。

**Skill 不是固定推理服务**。能力随着每家企业训练出新的 Best 权重而成长；未来新样本进来可以**再次训练**，只有当新权重通过评估并优于当前版本时，才升级为新的 Best 权重，旧版本保留可回滚。

第一阶段切入点为**招聘 / 转岗体能筛选**：实时计数 + 实时纠错 + 实时认证与人工复核闭环。
第二阶段为**在岗动作合规与工效风险训练**：复用同一 Skill，叠加 EHS 专家确认的岗位标准。

## 2. 实时四层：监测 / 纠正 / 计数 / 反馈

实时链路是**四个"实时"在同一画面上同时可见**——这是本 Skill 最容易被误以为是营销词的部分，因此每一条都给出明确的输入来源与可视信号：

| 实时层 | 数据来源 | 用户可见信号 |
|---|---|---|
| 实时监测 | 摄像头每帧驱动 | 毫秒级阶段徽���切换（站立 → 下蹲 → 起身 → 站立） |
| 实时纠正 | 规则引擎 + 阶段 + 错误码 | 第一次错误仅顶部红字，错误连续 3 次才触发语音（1.5s 冷却） |
| 实时计数 | 完整动作周期判定 | 走完整周期 +1；幅度不足 / 偷快蹲不计数 |
| 实时反馈 | 会话级事件流 | 完成一次完整动作就刷新 Top 错误统计；完成全部动作后会话总结 |

**硬约束**：核心规则链路不依赖任何生成式大模型；Ollama / Gemma 只负责生成式教练文案，不可用时不影响视觉分类与规则纠错。

## 3. 何时调用本 Skill

本 Skill（练了么 Skill）在两种场景下调用：

| 调用类型 | 触发场景 | 标准 | 输入动作 |
|---|---|---|---|
| **首次调用（训练）** | 新企业 / 新标准首次建立教练能力 | `RECRUIT_*_V1` 等 | squats / pushups / situps |
| **后续调用（复用）** | 招聘高峰批量体能初筛、在岗复训 | 同上 | 同上 |

下列场景**不要**调用本 Skill（避免越权与误导）：

- 疾病诊断、康复处方、伤病预测
- 与岗位无关的体能项目（如以健身塑形为目的）
- 单帧静态姿势判断（仅支持完整动作周期评估）
- 不提供摄像头权限的远程候选人
- 把传统 Skill 误以为是"调用固定 API 的能力"——本 Skill 不止于此

## 4. 输入契约（Input）

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `request_id` | string | 是 | 幂等请求 ID，防止重复创建任务 |
| `tenant_id` | string | 是 | 企业租户标识 |
| `batch_id` | string | 否 | 招聘 / 转岗批次 |
| `assignee_id` | string | 是 | 候选人临时 ID 或员工内部 ID |
| `standard_id` | string | 是 | 如 `RECRUIT_SQUAT_50_V1` |
| `best_weight_id` | string | 否（**首次调用不填**） | 已沉淀的 Best 权重 ID；首次调用不填，Skill 内部走训练链路并生成该 ID |
| `exercise` | string | 是 | `squats` / `pushups` / `situps` / `lunges` / `shoulder_press` / `rowing` / `bicep_curl` 等 |
| `target_reps` | integer | 是 | 目标有效次数 |
| `due_at` | datetime | 否 | 截止时间（ISO 8601） |
| `retention_policy` | object | 否 | 结构化事件和证据的留存策略 |
| `voice_enabled` | boolean | 否 | 是否启用 Web Speech API 语音纠错（默认 `true`） |
| `notify_url` | string | 否 | 完成后回写的 webhook 地址 |

完整示例见 [`examples/input-request.json`](examples/input-request.json)。

## 5. 输出契约（Output）

`decision` 字段只允许四个枚举值，**任何技术故障都必须返回 `inconclusive`，不得伪造为 `not_met`**：

| `decision` | 含义 |
|---|---|
| `pass` | 有效次数 ≥ 目标次数 |
| `not_met` | 有效次数 < 目标次数，但置信度足够给出明确结论 |
| `needs_retraining` | 错误率过高，建议再次培训后重测 |
| `inconclusive` | 技术故障、关键点无效、超时、置信度不足，需人工复核 |

**关键输出字段**：

- `decision`：四态枚举之一
- `valid_rep_count` / `invalid_rep_count` / `target_reps` / `score`：客观评估
- `top_errors`：按出现次数倒序，最多 3 条
- **`best_weight_id`**：本次评估加载的 Best 权重 ID（首次调用会回传新生成的；后续调用回传已沉淀的）；用于审计可追溯
- **`best_weight_version`**：Best 权重版本号（例如 `v1` / `v2`），用于版本迭代回滚
- `rule_version`：与 `standard_id` 对应
- `model_version`：综合模型版本字符串（含通用模型版本号），便于审计聚合
- `review_status` / `recommendation` / `certificate_id`：人工复核与认证相关

完整示例见 [`examples/output-pass.json`](examples/output-pass.json) 与 [`examples/output-inconclusive.json`](examples/output-inconclusive.json)。

## 6. 安全与隐私边界

本 Skill 在产品定义上**明确不做**：

- 医疗诊断、康复处方、伤病预测
- 用与岗位无关的敏感特征判断体能
- 替代 HR / EHS 授权人员做最终录用、辞退、绩效或薪酬决定
- 把原始摄像头帧上传给生成式大模型
- 在没有告知、访问权限与留存策略的情况下保存视频证据

技术失败与模型超时一律返回 `inconclusive` 或进入人工复核。详细条款见仓库 [`README.md`](../../README.md)「数据、安全与使用边界」与 [`docs/PRD.md`](../../docs/PRD.md)「8.1 评估口径」。

## 7. 模型与版本

| 组件 | 当前实现 | 说明 |
|---|---|---|
| 姿态估计 | RTMPose ONNX | COCO 17 关键点，**成熟通用模型** |
| 动作分类 | PyTorch ST-GCN | 48 帧窗口、11 类动作；**训练 Best 权重的起点** |
| 辅助检测 | YOLOv8n | 仓库内含本地权重 |
| 规则引擎 | NumPy + 可解释几何规则 | 6 类专项 + 5 类通用；其余动作只给节奏 / 稳定性通用反馈，不包装为未验证的规则 |
| 可选生成式反馈 | Ollama `gemma4:e2b` | 仅文案层，规则链路不依赖 |

模型权重、训练样本、混淆矩阵与演示机日志见仓库 [`docs/real-evidence.md`](../../docs/real-evidence.md)。

## 8. 失败与降级

| 场景 | 行为 |
|---|---|
| Ollama 不可用 | 视觉分类与规则纠错继续运行，生成式教练文案降级 |
| 模型超时 / 关键点无效 | 返回 `decision: inconclusive`，`review_status: required` |
| 无 GPU | 走 harness CPU 路径（`npm run dev`） |
| 摄像头权限被拒 | 终止会话，回写 `error: camera_permission_denied` |
| 重复 `request_id` | 返回首次的 `task_id` 与 `decision`，不重复创建任务 |
| Best 权重文件缺失 | 返回 `decision: inconclusive`，`reason: best_weight_missing` |

## 9. 资产清单

Skill 包内：

- `prompts/coach-feedback-system.txt`：本地生成式教练反馈的系统提示词模板
- `examples/`：四组契约示例（输入 1 + 输出 3）+ 一组首次调用（训练）示例
- `references/contract.md`：完整契约字段表与边界条款
- `references/api-mapping.md`：本 Skill 字段与仓库现有 `/api/session/*` 的映射
- `CHANGELOG.md`：版本变更记录

Skill 包外（仓库内，**不在 ZIP 内**）：

- 真实模型权重（`model/*.onnx`、`model/*.pth`、`yolov8n.pt`）— 部署时挂载
- `src/` 推理与规则引擎源码
- `web_app.py` Flask Web 与会话管理
- `data/demo/enterprise_demo.json` 脱敏 Demo 种子数据
- 训练出的 Best 权重（首次调用沉淀后落在 `model/bw_<tenant>_<date>_<version>.pth`）

## 10. 复用建议

新接入方使用本 Skill 时，推荐按下列顺序验证：

1. 用 `examples/base-train-request.json`（首次调用，`best_weight_id` 不填）跑通一次端到端，确认产出 `best_weight_id`。
2. 用 `examples/input-request.json`（后续调用，`best_weight_id` 已填）跑通一次实时评估，确认 Skill 直接加载 Best 权重。
3. 用 `examples/output-inconclusive.json` 模拟摄像头权限被拒，确认回写路径与 `review_status: required`。
4. 参考 `references/contract.md` 接入真实租户与批次。
5. 上线前阅读仓库 `docs/acceptance.md` 完成所有 P0 自动验收。

---

## 附录 A：帝王蟹 ClawHive 大赛评审维度对照

> 对照 ClawHive 官方公布的 **商业价值 / 创新性 / 技能包完整度 / 可复用稳定性** 四维，逐条映射到本 Skill 的对应能力。

### A1. 商业价值

| 评委关心 | 本 Skill 对应能力 |
|---|---|
| 谁愿意付费？ | HR（招聘 / 转岗）+ EHS（在岗训练）；按检测次数 / 私有化部署 / 订阅 / 平台分发四种模式 |
| 为什么不是又一个健身 App？ | 0.1 节"现场痛点 → 数字员工解法"：解决吞吐量、尺度、复核、系统割裂四个真实业务痛点 |
| ROI 怎么算？ | 每百人节省考官工时 / 单次检测成本 / 计数一致性三项可测量指标 |
| 不夸大百分比 | 承诺先签 2–4 周单考场单项目试点，与人工并列计数后再谈扩张 |

### A2. 创新性

| 评委关心 | 本 Skill 对应能力 |
|---|---|
| 这件事是不是"已有 API"？ | §0.1 + §1：传统 Skill 是 Markdown + 固定 API；本 Skill 自带训练 + 沉淀 + 复用 |
| 实时四层是不是营销词？ | §2：每条实时都给出独立的输入来源（摄像头每帧 / 规则引擎 / 完整周期 / 事件流） |
| 不把"已有"包装成"专项" | §7：6 类专项纠错 + 5 类通用反馈边界明确，不假装所有动作都有专项规则 |

### A3. 技能包完整度

| 评委关心 | 本 Skill 对应能力 |
|---|---|
| 包含多少个 Sample？ | 招聘深蹲 + 多项目复用 + 在岗复训三个 Sample 都跑在 Best 权重之上 |
| Skill 包自带训练流程吗？ | §1：单 Skill 同时承担 训练 + 沉淀 + 复用，对应帝王蟹"个人经验 → 企业资产" |
| 错误反馈是否完整？ | §2 + §7：6 类专项 + 5 类通用 + Top 错误 + 下一次重点 |
| 输入输出契约是否结构化？ | §4 + §5：含 `request_id` / `tenant_id` / `best_weight_id` / `decision` / `top_errors` 等 18+ 字段 |
| ClawHive 五层对齐？ | §0.2：五层全部对齐 |

### A4. 可复用稳定性

| 评委关心 | 本 Skill 对应能力 |
|---|---|
| 训练真的跑过吗？ | §7 + 仓库 `docs/real-evidence.md`：MM-Fit 21 受试者 / 8898 窗口 / RTX 5070 Ti 日志 |
| Best 权重可重复调用吗？ | §1 + 命名规则 `bw_<tenant>_<date>_<version>.pth`：可下载 / 可私有部署 / 可重复调用 / 可再训练升级 |
| 计数是否一致？ | §2：错误连续 3 次才语音；幅度不足不计数；完整周期才 +1 |
| 失败兜底怎么做？ | §8：Ollama / GPU / 摄像头 / Best 权重缺失 / 重复 request_id 五种降级 |
| 跨企业复用冲突吗？ | §1 + 命名规则：Best 权重按租户命名空间隔离 |
| 退出 / 回滚如何？ | §1：Best 权重保留旧版本，可回滚到 `v1` |

## 附录 B：关键演示金句（路演必说）

### B1. 一句话定位

> 练了么是面向工厂招聘与转岗场景的 **AI 体能数字员工**——用一个 ClawHive Skill 把"靠人多、标准不一、事后无法复核、跟 HR 系统割裂"的现场体能考官，升级成"同一规则、自动计数、即时纠错、可解释复核、回写招聘台账"的标准化 AI 数字员工；首次调用训练并沉淀 Best 权重为企业专属资产，后续每一次实时检测都直接复用这个权重。

### B2. 三句收尾金句

1. **传统 ClawHive Skill 编排已有能力；练了么 Skill 帮助 Agent 训练、沉淀并持续调用新的垂直能力。**
2. **监测是实时的，纠错是实时的，��数是实时的，反馈也是实时的。**
3. **个人经验 + 一次活动页面不算企业资产；带训练流程、可沉淀、可复用、可进化的企业 Skill，才是帝王蟹要的企业级数字员工资产。**

### B3. 现场痛点口播（路演开头用）

> 工厂、仓储批量招聘或转岗时，往往要候选人完成深蹲、俯卧撑等岗位相关体能项目。传统做法是考官逐人盯着数次数、判断动作幅度是否有效。**招聘高峰吞吐量被考官人数卡住，不同考官尺度不同造成漏数误数，纸面只记结果事后无法复核，检测工具和 HR 系统割裂要手工录入**。我们做的不是又一个健身 App，而是把这件事升级成标准化、可解释、可回写流程的 AI 体能数字员工。

### B4. ClawHive 五层一句话

> ClawHive 给企业带来模型、连接、安全、知识和资产五层打通。练了么 Skill 不是一个孤立 App，它直接落到这五层里：模型层是成熟通用模型 + Best 权重的双层资产；连接层在飞书、钉钉、企微、OA 里发起检测、回写结果；安全层提供租户权限、最小数据回传和全链路审计；知识层把企业招聘体能标准、EHS 岗位标准版本化；资产层就是单 Skill 自带训练流程 + 沉淀 Best 权重。