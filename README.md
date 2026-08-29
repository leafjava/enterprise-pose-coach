# Enterprise Pose Coach · 练了么

> 面向企业招聘、转岗与在岗训练的 **AI 体能数字员工**：当 ClawHive Agent 接入时，**第一次调用训练任务专用的垂直模型并沉淀 Best 权重，后续每一次调用都直接复用 Best 权重**。一个 Skill 同时承担 **训练 + 沉淀 + 调��**，帮助 Agent 获得一项 **可下载、可私有部署、可重复调用、可持续进化** 的垂直教练能力。亮点是"**实时**"：监测是实时的、纠错是实时的、反馈也是实时的。

本仓库已实现 "**成熟通用模型 + 训练出来的垂直模型（Best 权重）**" 的双层资产：成熟通用模型（RTMPose / ST-GCN / YOLOv8n）作为微调起点，垂直模型在通用模型之上用企业脱敏样本训练出来，Best 权重沉淀在企业私有环境。参赛产品方向、边界和 48 小时计划见 [PRD](docs/PRD.md)，录屏叙事见 [Demo 视频分镜 v2](docs/练了么-demo分镜口播稿-v2.md)。

## 这不是一个传统 Skill：训练 + 沉淀 + 复用

传统 ClawHive Skill 主要通过 **Markdown 指令**告诉 Agent 应该怎样完成任务，或者让 Agent 调用 **一个已经固定好的 API**——它主要解决的是 **已有能力** 的描述、调用和编排问题。

**练了么 Skill 不止编排一个固定能力**。当 ClawHive Agent 第一次使用它时，Skill 会带着 Agent 完成：

```text
数据获取 → 数据处理（清洗/关键点/48 帧切窗/划分） → 模型训练 → 效果评估 → 选择 Best 权重 → 沉淀为可复用资产
```

后续 Agent 每一次调用，都 **直接加载这个 Best 权重**，不需要重新下载数据，也不需要重新训练。当企业未来积累了新的授权样本，可以再次进入训练链路；只有当新权重通过评估并优于当前版本时，才升级为新的 Best 权重，旧版本保留可回滚。

**核心金句**：**传统 Skill 编排已有能力；练了么 Skill 帮助 Agent 训练、沉淀并持续调用新的垂直能力**。

## 快速开始

> 两种启动方式：先选一个跑起来，再按需进入完整链路。详细环境说明见 [RUNNING.md](RUNNING.md)。

### 方式 A：无 GPU 评审模式（推荐先跑这个）

适合评审、本地快速看页面、无 CUDA/无摄像头的机器。用确定性姿态输入代替模型，保留真实页面、API 和规则引擎。

前置条件：Node.js 18+、Python 3.10+。Windows 上若 `python` 不是有效解释器，先设置：

```powershell
$env:PYTHON = "C:\path\to\python.exe"
```

启动：

```powershell
npm run install      # 创建 .venv 并安装最小依赖（Flask + NumPy）
npm run dev          # 启动评审服务器，默认 http://127.0.0.1:4000
```

打开终端打印的地址即可。其他常用命令：

| 命令 | 作用 |
|---|---|
| `npm run dev` | 启动无 GPU 评审服务器 |
| `npm run test` | 跑最小 `unittest` 测试集 |
| `npm run check` | 编译检查 + 文档契约 + 测试 |
| `npm run demo` | 端到端 smoke，预期输出 `status: passed` |
| `npm run dev:real` | 启动带真实模型的 Flask Web（同 `python web_app.py`） |

### 方式 B：真实模型链路

需要完整视觉依赖（RTMPose ONNX、ST-GCN、YOLOv8n）以及与你 CPU/CUDA 环境匹配的 PyTorch。

```powershell
python -m pip install -r requirements.txt
# 按 https://pytorch.org/ 的环境说明安装匹配的 PyTorch
$env:OLLAMA_MODEL = "gemma4:e2b"        # 可选：本地生成式反馈；不装也能跑分类与规则
python web_app.py                       # 默认 http://127.0.0.1:4000
```

可选演示视频目录：

```powershell
$env:POSE_VIDEO_DIR = "E:\Program\PoseClassifier\配套视频"
python web_app.py
```

页面入口：`/` 首页、`/coach` 实时教练、`/certification` 体能认证。

## 为什么值得做

制造企业批量招聘或转岗时，经常需要人工盯着候选人完成深蹲、俯卧撑等岗位相关体能项目：一个人负责一个个数、判断动作是否有效，招聘高峰成本高，标准也容易因考官而异。员工入职后，安全与工效培训又面临“看过不等于会做”的同一问题。安姿盾先用自动计数和达标报告切入招聘/转岗筛选，再复用同一套视觉、规则和审计资产服务在岗动作合规与复训。

产品可以按企业预先设定、与岗位直接相关的体能标准输出“达标/未达标/需复核”，帮助 HR 筛选；最终录用或辞退仍由企业授权人员结合完整信息决定。系统不提供医疗诊断，也不使用与岗位无关的敏感特征作判断。

## 当前实现与产品方向

| 范围 | 当前状态 | 说明 |
|---|---|---|
| Web 首页、实时教练、体能认证页 | 已实现 | `/`、`/coach`、`/certification` |
| 摄像头逐帧分析与实时反馈 | 已实现 | 实时监测（毫秒级阶段切换）+ 实时纠正（即时语音）+ 实时计数（完整周期） |
| 动作规则、计数、语音提示、训练总结 | 已实现 | 6 类专项纠错 + 通用反馈；不做未验证的规则包装 |
| 成熟通用模型（RTMPose + ST-GCN + YOLOv8n） | 已实现 | 权重与证据见 [真实模型证据](docs/real-evidence.md) |
| **训练 + 沉淀 + 复用 链路** | 已实现 | 首次调用训练垂直模型并选 Best 权重沉淀；后续调用直接加载 Best 权重；训练证据见 [真实模型证据](docs/real-evidence.md) |
| 练了么 Skill 包（单 Skill，自带训练流程） | 已实现 | `skill-build/enterprise-pose-coach.zip` |
| 认证记录 JSON 持久化 | 已实现 | `/api/certifications` GET/POST |
| ClawHive 连接器、可配置招聘/岗位标准、租户权限、审计事件 | 待开发 | 48 小时 MVP 任务见 [tasks](docs/tasks.md) |

> 仓库中的 React Native `app/` 与 FastAPI `backend/` 是早期应用层原型。黑客松主交付链路以 Flask Web + 双 Skill 包为准，避免同时维护三套运行架构。

## 大赛定位：AI-开发主赛道，AI-视听为核心引擎

网易智企 ClawHive 的价值不是再造一个孤立 AI App，而是把个人助手升级为企业可管控、可复用、可审计的数字员工。本项目最适合以 **AI-开发** 赛道参赛：视觉模型负责“看懂动作”，ClawHive 负责把这项能力嵌入招聘、转岗、培训和复训流程。

| ClawHive 能力层 | 本项目的结合方式 | 当前状态 |
|---|---|---|
| 模型层 | **成熟通用模型 + 训练出来的垂直模型（Best 权重）**：通用模型（RTMPose/ST-GCN/YOLOv8n）作为微调起点，训练出 Best 权重；ClawHive/本地 LLM 只负责解释与编排 | 通用模型 done；训练链路 done；模型调度 todo |
| 连接层 | 从飞书、钉钉、企微或 OA 发起检测，向招聘台账回写结果；首次训练请求走同一通道 | todo |
| 安全层 | 租户权限、最小数据回传、人工复核、全链路审计 | 产品边界已定义；接入 todo |
| 知识层 | 把企业的招聘体能标准和 EHS 岗位标准版本化，作为 Skill 训练的输入 | schema 已设计；配置实现 todo |
| 资产层 | **单 Skill（练了么 Skill）**：自带训练流程，沉淀 Best 权重为企业专属资产 | 本地 API done；Skill 包 done |

参赛亮点不是单一"动作识别准确率"，而是把视觉能力变成**带成长性的企业生产力闭环**：

```text
ClawHive Agent 接入 → 练了么 Skill（首次调用）
   ↓ 数据获取（MM-Fit / 自采脱敏 / 代理搜索开源数据集）
   ↓ 数据处理（清洗 / 关键点转换 / 48 帧切窗 / 划分）
   ↓ 模型训练（以成熟通用模型为起点）
   ↓ 效果评估 → 选择 Best 权重 → 沉淀到企业私有环境

练了么 Skill（后续每一次调用）
   ↓ 直接加载 Best 权重
   ↓ 候选人打开检测链接 → 摄像头输入
   ↓ 实时监测（毫秒级阶段切换）
   ↓ 实时纠正（即时提示 + 语音播报）
   ↓ 实时计数（完整动作周期 +1）
   ↓ 结构化报告：达标 / 未达标 / 需复核
   ↓ 回写招聘台账或触发复训任务
```

## 双阶段产品路线

### 第一阶段：招聘与转岗体能筛选

工厂、仓储和部分一线服务岗位在批量招聘或转岗时，会设置与岗位相关的深蹲、俯卧撑、仰卧起坐等体能项目。传统方式需要考官逐人盯着完成动作，既要计数，又要判断动作幅度是否有效。

| 传统痛点 | 业务后果 | 安姿盾的 MVP 价值 |
|---|---|---|
| 招聘高峰需要大量人工计数 | 吞吐量受考官数量限制，候选人等待时间长 | 摄像头自动识别完整动作周期并计数 |
| 不同考官判断尺度不同 | 漏数、误数和动作幅度争议 | 使用同一规则版本，立即解释为什么没计数 |
| 纸面只记录最终结果 | 事后难以复核和解释 | 保存结构化会话、错误类型和认证记录 |
| 检测工具与招聘系统割裂 | HR 需要手工录入和通知 | 由 ClawHive 发起、催办并回写结果（todo） |

第一阶段的核心闭环是：**降低重复计数成本、提高标准一致性、缩短争议处理时间**。系统可以输出岗位项目的达标结果，但最终录用仍由企业授权人员结合完整招聘信息决定；技术失败或低置信度不能被当作候选人体能未达标。

### 第二阶段：在岗动作合规与工效风险训练

候选人入职后，同一套摄像头、会话、规则、通知和审计能力可以继续服务：

1. 安全搬运姿势训练与周期复训；
2. 重复劳动后的工间恢复训练；
3. 上岗动作 SOP 考核；
4. 企业健身挑战与部门健康活动。

第二阶段的优势是无需重新销售一个完全不同的产品：企业已经部署的终端、账号、权限和 Skill 可以继续使用，只需增加经过 EHS 专家确认的岗位标准。当前深蹲只能作为“屈髋屈膝搬运”的代理演示，工业场景模型和阈值仍需真实数据校准。

## 核心功能全景

| 能力 | 当前实现 | 48 小时 MVP | 赛后路线 |
|---|---|---|---|
| 摄像头/视频输入 | 浏览器摄像头逐帧输入、视频上传 | 固定演示机位与入镜说明 | 受控终端与边缘推理 |
| 姿态估计 | RTMPose ONNX，COCO 17 关键点 | 记录演示机 FPS 与失败率 | CPU/GPU 多 Provider |
| 动作识别 | ST-GCN 11 类动作分类 | 固定招聘项目动作映射 | 企业数据增量微调 |
| 专项纠错 | 6 类专项规则：深蹲、弓步、俯卧撑、肩推、划船、弯举 | 冻结招聘深蹲规则版本 | EHS 岗位规则库 |
| 通用反馈 | 其余 5 类动作提供节奏/稳定性提示 | 明确专项与通用能力边界 | 逐动作补齐专项规则 |
| 自动计数 | 专项动作完整周期计数 | 目标次数从任务读取 | 多项目组合标准 |
| 实时反馈 | 文字、状态色、Web Speech API 语音、冷却去抖 | 招聘场景短句与复核提示 | 多语言与无障碍反馈 |
| 会话总结 | 次数、Top 错误、下一次重点 | 增加规则/模型版本与结果状态 | 趋势与批次对比 |
| 认证记录 | Canvas PNG 证书、JSON 历史记录 | 绑定批次与虚构 Demo 身份 | 可配置模板与授权复核 |
| 批次处理 | 当前单会话/单浏览器 | ClawHive 创建批次任务 | 多终端并行、批次看板 |
| 视频证据 | 上传视频处理后删除；实时帧默认不持久化 | 只保存必要结构化事件 | 经授权、按留存策略保存证据片段 |
| ClawHive 集成 | 尚未接入 | 一个任务创建与结果通知闭环 | OA/招聘系统/培训系统连接模板 |
| **训练 + 沉淀 + 复用** | 成熟通用模型（MM-Fit 微调的 ST-GCN）+ 训练出来的垂直模型（Best 权重） | 单 Skill 上架 ClawHive 市场，自带训练流程 | 跨企业 Best 权重资产网络 + 持续迭代（旧版可回滚） |

## 企业级 Skill 形态（单 Skill · 训练 + 沉淀 + 复用）

练了么向 ClawHive 市场提交的是 **一个 Skill**，自带 **训练 + 沉淀 + 复用** 的完整生命周期：

- **首次调用**：Skill 带着 Agent 完成数据获取 → 数据处理 → 模型训练 → 效果评估 → 选择 Best 权重，沉淀为企业专属资产。
- **后续调用**：直接加载 Best 权重，不再重新训练；新样本进来后可再次进入训练链路，新 Best 权重通过评估才升级，旧版可回滚。

HR 在飞书 / 钉钉 / 企微 / OA 里的工作流：

```text
Step 1：HR 发起训练请求
  "为新工厂 A 训练深蹲 50 次招聘能力，使用近 3 个月脱敏样本"
    ↓
Step 2：ClawHive Agent 调用练了么 Skill（首次调用）
    ↓ 数据获取 + 数据处理 + 模型训练 + 评估
    ↓ 选择 Best 权重 + 沉淀到企业私有推理环境

Step 3：HR 发起实时检测
  "今天 A 批候选人创建深蹲 50 次检测，完成后通知需复核人员"
    ↓
Step 4：ClawHive Agent 调用练了么 Skill（后续调用 · 直接加载 Best 权重）
    ↓ 候选人摄像头前完成动作
    ↓ 实时监测（毫秒级阶段切换）
    ↓ 实时纠正（即时提示 + 语音播报）
    ↓ 实时计数（完整动作周期 +1）
    ↓ 汇总 pass / not_met / inconclusive
    ↓ 通知 HR，授权后回写招聘台账
```

Skill 的完整契约见 [`skill-build/enterprise-pose-coach/SKILL.md`](skill-build/enterprise-pose-coach/SKILL.md)、[`references/contract.md`](skill-build/enterprise-pose-coach/references/contract.md)。

### 练了么 Skill 的输入契约

Skill 在每次调用时接收一份结构化请求；下列为目标输入契约，对应仓库内 `enterprise-pose-coach` Skill 包：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `request_id` | string | 是 | 幂等请求 ID，防止重复创建任务 |
| `tenant_id` | string | 是 | 企业租户标识 |
| `batch_id` | string | 否 | 招聘/转岗批次 |
| `assignee_id` | string | 是 | 候选人临时 ID 或员工内部 ID |
| `standard_id` | string | 是 | 如 `RECRUIT_SQUAT_50_V1` |
| `best_weight_id` | string | 是 | 已沉淀的 Best 权重 ID；首次调用不填，Skill 内部走训练链路并生成该 ID |
| `exercise` | string | 是 | `squats` / `pushups` / `situps` / `lunges` / `shoulder_press` / `rowing` / `bicep_curl` |
| `target_reps` | integer | 是 | 目标有效次数 |
| `due_at` | datetime | 否 | 截止时间 |
| `retention_policy` | object | 否 | 结构化事件和证据的留存策略 |

示例：

```json
{
  "request_id": "req-demo-001",
  "tenant_id": "factory-demo",
  "batch_id": "recruit-20260807-a",
  "assignee_id": "candidate-c042",
  "standard_id": "RECRUIT_SQUAT_50_V1",
  "best_weight_id": "bw-factory-A-20260807-v1",
  "exercise": "squats",
  "target_reps": 50,
  "due_at": "2026-08-07T18:00:00+08:00"
}
```

### 练了么 Skill 的输出契约

```json
{
  "request_id": "req-demo-001",
  "task_id": "task-demo-001",
  "session_id": "session-demo-001",
  "decision": "pass",
  "valid_rep_count": 50,
  "invalid_rep_count": 3,
  "target_reps": 50,
  "score": 92,
  "top_errors": [
    {
      "code": "squat_depth",
      "count": 3,
      "cue": "再蹲深一点，起身前把重心坐下去"
    }
  ],
  "review_status": "not_required",
  "model_version": "rtmpose+stgcn-mmfit-11cls-stride48@2026-05-29",
  "rule_version": "RECRUIT_SQUAT_50_V1",
  "best_weight_id": "bw-factory-A-20260807-v1"
}
```

`decision` 只允许 `pass`、`not_met`、`needs_retraining` 或 `inconclusive`。无人入镜、遮挡、模型超时和置信度不足���须返回 `inconclusive` 或进入人工复核，不能伪造成 `not_met`。`best_weight_id` 用于审计可追溯：任何结论都能反查到当时加载的 Best 权重版本。

### 首次调用（训练）的输入契约（草图）

首次调用 `best_weight_id` 不填，Skill 内部走训练链路：

```json
{
  "request_id": "req-train-001",
  "tenant_id": "factory-demo",
  "standard_id": "RECRUIT_SQUAT_50_V1",
  "training_data": {
    "source": "tenant-uploaded-or-public",
    "subjects": 21,
    "windows": 8898,
    "shape": [8898, 2, 48, 17],
    "synthetic_allowed": false
  },
  "hyperparameters": {
    "epochs": 30,
    "batch_size": 64,
    "learning_rate": 0.001
  },
  "notify_url": "https://example.invalid/clawhive/callback"
}
```

### 现有 API 与目标 Skill 的映射

| 当前接口 | 当前作用 | 目标适配（练了么 Skill） |
|---|---|---|
| `POST /api/session/start` | 按动作创建会话 | 绑定 task、标准、Best 权重、目标次数与同意版本 |
| `POST /api/session/frame` | 返回阶段、计数、纠错 | 增加 Best 权重版本、规则版本和有效性事件 |
| `POST /api/session/stop` | 返回总结 | 生成结构化评估报告（`decision` / `review_status` / `best_weight_id`）与复核状态 |
| `POST /api/certifications` | 固定 50 次达标记录 | 由标准配置决定阈值并绑定批次 + Best 权重 |
| `GET /api/certifications` | 查询历史记录 | 增加租户、角色和分页权限 |
| （新增）`POST /api/skill/init` | 首次调用：训练垂直模型 | 接收数据集 + 超参，跑训练链路，沉淀 Best 权重并返回 `best_weight_id` |
| （新增）`GET /api/skill/best_weights` | 列出 Best 权重 | 按 tenant 列出所有 Best 权重与版本指标（含可回滚的旧版本） |
| （新增）`POST /api/skill/retrain` | 再次训练：新数据进来后 | 接收新样本，按训练链路评估新 Best 权重；优于当前版本才升级 |

详细的数据模型和完整 API 计划见 [PRD](docs/PRD.md)。

## 技术架构

主链路采用"**成熟通用模型 + Best 权重 + 实时应用层**"的资产层结构，保留替换模型、规则和企业连接器的空间：

```text
┌─────────────────────────────────────────────────────────────┐
│  ClawHive 企业编排层（48 小时接入目标）                     │
│  IM/OA 触发 · 企业知识标准 · 权限 · 审计 · 结果回写         │
│  ── 调用一个 Skill ──                                      │
│    练了么 Skill（自带 训练 + 沉淀 + 复用）                  │
│    首次：训练 + 选 Best 权重 + 沉淀                          │
│    后续：直接加载 Best 权重                                  │
├─────────────────────────────────────────────────────────────┤
│  实时应用层（已实现）                                       │
│  Flask Web · 首页 · 摄像头 · start/frame/stop · 认证记录   │
│  Web Speech API 实时语音 · 毫秒级阶段徽标 · 实时计数       │
├─────────────────────────────────────────────────────────────┤
│  成熟通用模型 + Best 权重（已实现）                          │
│  通用模型：ST-GCN 11 类 · RTMPose 17 关键点 · YOLOv8n      │
│  Best 权重：通用模型之上用企业脱敏样本训练 → 选最优 → 沉淀  │
├─────────────────────────────────────────────────────────────┤
│  规则引擎（已实现）                                         │
│  角度·距离·阶段·错误去抖·周期计��·Web Speech 语音冷却     │
└─────────────────────────────────────────────────────────────┘
```

| 模块 | 技术选型 | 说明 |
|---|---|---|
| 成熟姿态通用模型 | RTMPose + ONNX Runtime | 17 关键点，本地推理，公共资产 |
| 成熟动作分类通用模型 | PyTorch ST-GCN（MM-Fit 11 类微调） | 48 帧窗口、11 类动作，**训练 Best 权重的起点** |
| **Best 权重训练管线** | 在通用模型上用企业脱敏样本训练 → 选最优 → 沉淀为 Best | 按 tenant 沉淀；这是"训练 + 沉淀 + 复用"的"沉淀"层 |
| 人体辅助检测 | YOLOv8n | 仓库内含本地权重 |
| 规则引擎 | NumPy + 可解释几何规则 | 角度、距离、阶段、错误去抖和计数 |
| 实时反馈层 | Web Speech API + 毫秒级阶段徽标 | 监测/纠正/计数三层"实时"在画面上同时可见 |
| Web 后端 | Flask 3 | 当前比赛唯一主链路 |
| Web 前端 | Jinja + HTML5 Video/Canvas + 原生 JS | 无额外前端构建即可访问摄像头 |
| 生成式反馈 | 本地 Ollama/Gemma | 可选依赖；不可用不影响核心规则判断 |
| 数据存储 | JSON（MVP） | 认证历史；生产需租户权限和并发存储 |
| Harness | Node package scripts + Python unittest | 无 GPU 复现页面/API/规则闭环 |
| Skill 包 | `skill-build/enterprise-pose-coach/` | 上架 ClawHive 市场的练了么 Skill（训练 + 沉淀 + 复用） |

`backend/` 的 FastAPI 与 `app/` 的 React Native 是早期原型，不纳入 48 小时主路径。推荐架构决策见 [architecture.md](docs/architecture.md)。

## 真实模型与数据证据

这不是只有 UI 和 Mock 的概念演示。仓库已经包含可核验的 **成熟通用模型** 与 **Best 权重训练证据**：

| 证据 | 仓库内容 | 可验证结论 |
|---|---|---|
| 成熟姿态通用模型 | `model/rtmo-*.onnx`，约 39.6 MB | RTMPose 通用关键点提取 |
| 成熟动作分类通用模型 | `model/mmfit_pose11cls_stride48_best.pth`，约 700 KB | ST-GCN 11 类通用分类权重（**训练 Best 权重的起点**） |
| 辅助检测 | `yolov8n.pt`，约 6.5 MB | YOLOv8n 本地权重 |
| Best 权重训练数据 | MM-Fit 21 名受试者 + 仓库自采/脱敏企业样本 | 在成熟通用模型上训练出企业专属垂直模型 |
| 训练样本窗口 | 8898 个训练窗口，shape `(8898, 2, 48, 17)` | 48 帧、17 关���序列输入 |
| 训练结果 | 训练/验证混淆矩阵 + 微调日志 | 可查看类别表现、混淆情况与 Best 权重收敛过程 |
| 演示机日志 | RTX 5070 Ti Laptop GPU 推理记录 | 已有真实 GPU 启动证据 |

"训练 + 沉淀 + 复用"的含义在这张表里就是：**成熟通用模型（公共资产）+ 训练出来的垂直模型 / Best 权重（企业专属资产）**。通用模型权重可复用，Best 权重由练了么 Skill 首次调用时在通用模型上为企业训练出来；后续每一次调用都直接加载这个 Best 权重，不重新训练。

完整文件、日志和入口见 [真实模型证据](docs/real-evidence.md) 与 [MM-Fit 重训总结](docs/mmfit-retrain-summary-2026-05-29.md)。Harness 模式只证明业务流程可复现，不能替代真实基座精度与演示机验收。

## 三组比赛 Sample

每个 Sample 都跑在"成熟通用模型 + 训练出来的垂直模型（Best 权重）"之上。Sample 1 是当前最强、最真实的闭环；Sample 2 展示一个 Best 权重的多项目复用；Sample 3 展示市场扩张，不把尚未校准的工业基座伪装成已完成能力。

| # | Sample | 企业场景 | 当前可演示 | 待补齐 |
|---|---|---|---|---|
| 1 | 招聘深蹲 50 次实时监测 + 实时纠正 | 招聘高峰体能初筛 | 实时阶段切换、膝/躯干即时纠错、即时语音、计数、认证记录 | 批次与目标次数配置 |
| 2 | 多项目体能组合（Best 权重复用） | 深蹲、俯卧撑、仰卧起坐等岗位标准 | 11 类识别、6 类专项实时纠错 | 多项目汇总判定与标准版本 |
| 3 | 入职后安全搬运复训（通用模型 + EHS 标准） | 招聘能力向职业安全延伸 | 深蹲代理动作 + 实时反馈 + 会话总结 | `SAFE_LIFT_V1`、ClawHive 通知与回写 |

演示时应明确：

- 三个 Sample 都跑在 Best 权重之上；成熟通用模型（MM-Fit 上微调的 ST-GCN）作为训练起点。
- Sample 1 是当前**实时监测 + 实时纠正**最强、最真实的闭环。
- Sample 2 展示同一个 Best 权重如何被多项目复用。
- Sample 3 展示市场扩张，不把尚未校准的工业基座伪装成已完成能力。

## 稳定性与可复用性

姿态识别会受机位、光线、遮挡、服装、体型和硬件影响。稳定性不是路演附录，而是招聘筛选能否进入企业生产环境的核心。

### 推荐拍摄规范

- 全身进入画面，深蹲优先使用正面或轻微侧面机位；
- 光线均匀，避免逆光和人体与背景颜色完全融合；
- 摄像头与身体中心高度接近，预留完整起身和下蹲空间；
- 一次只检测一个人，避免他人进入关键点识别区域；
- 检测前完成站立、画面范围和关键点可见性检查。

### 已有稳定机制

- 无人或关键点无效时提示调整站位；
- 错误连续出现达到阈值后才语音播报；
- 同一提示具有冷却时间，避免语音轰炸；
- 动作必须经过完整阶段周期才增加次数；
- 模型不可用时保留手动选择动作的路径；
- 无 GPU harness 使用同一页面、API 与真实规则引擎验证主流程。

### 提交前仍需完成

| 测试维度 | 至少覆盖 | 关键指标 |
|---|---|---|
| 机位 | 正面、侧面、斜侧面 | 计数一致性、需复核率 |
| 光线 | 正常、弱光、逆光 | 关键点有效帧比例 |
| 人群 | 不同身高、体型、服装 | 漏计率、人工改判率 |
| 节奏 | 慢速、正常、快速 | 重复计数和漏数 |
| 稳态 | 10 分钟连续运行 | FPS、内存、错误率 |
| 故障 | 无 GPU、断网、Ollama 不可用、摄像头拒绝 | 是否有明确降级而非空白页 |

动作扩展当前依赖代码中的动作目录和几何规则；下一步将阈值、纠正文案和版本迁移为企业可配置的 `PostureStandard`。新增动作必须有专家标准、样本、回归测试和版本号，不能只增加一个名称。

## 商业价值与落地路径

### 为什么企业愿意付费

| 价值 | 第一阶段：招聘/转岗 | 第二阶段：在岗训练 |
|---|---|---|
| 降低重复劳动 | 减少考官逐次计数和纸面登记 | 减少老师傅重复示范与盯练 |
| 提高一致性 | 同一批次使用同一动作标准 | 同一岗位使用同一规则版本 |
| 降低争议成本 | 解释无效次数，提供重试与复核 | 定位常见错误，安排针对性复训 |
| 沉淀企业资产 | 招聘体能标准和批次结果结构化 | EHS 动作标准、错误知识和复训流程复用 |
| 融入现有流程 | ClawHive 通知与招聘台账回写 | IM/OA 任务、催办、培训记录回写 |

不在没有试点数据时承诺“成本下降 70%”或“工伤下降 50%”。首批客户应测量：

```text
每百人节省考官工时
  = 原人工总工时 - AI 后人工复核总工时

单次检测成本
  =（设备折旧 + 推理成本 + 复核人工）/ 完成检测人数

计数一致性
  = AI 与双人复核一致的有效次数 / 总复核次数
```

### 商业模式假设

1. **按检测次数计费**：适合招聘旺季和人力服务供应商；
2. **企业私有化部署 + 年费**：适合对人像和招聘数据敏感的大型制造企业；
3. **活跃员工/岗位订阅**：用于在岗培训与复训扩张；
4. **ClawHive Skill 调用量结算**：上架企业技能市场后的平台分发模式。

### 建议试点

先签一个“单考场、单项目、单招聘批次”的 2–4 周并行试点。AI 和人工同时计数，不直接替代原流程，比较考官工时、AI/人工一致性、需复核率、申诉处理时间和候选人完成时长。达到双方约定门槛后再进入正式筛选，并向安全搬运或工间复训扩展。

长期壁垒不是某一个开源姿态模型，而是：企业版本化体能/岗位标准、真实场景的脱敏错误事件数据、可解释的人工复核闭环，以及嵌入 ClawHive 权限和业务系统的连接资产。

## 数据、安全与使用边界

- 只使用企业已经采用、与岗位直接相关并经过 HR/EHS/合规确认的体能项目；
- 系统输出项目达标状态，最终录用、辞退、绩效和薪酬决定由授权人员作出；
- 低置信度、遮挡和技术故障返回 `inconclusive`，允许重试和人工复核；
- 实时帧默认不长期保存，不把原始人像发送给生成式大模型；
- 需要视频证据时必须有明确告知、访问权限、用途和到期删除策略；
- Demo 一律使用虚构身份；当前 `data/certifications.json` 只是 MVP 本地存储，不是生产数据方案；
- 产品不提供疾病诊断、康复处方或伤病预测。

## 3 分钟可复现 Harness

前置条件：Node.js 18+、Python 3.10+。Windows 如果 `python` 不是有效解释器，先指定：

```powershell
$env:PYTHON = "C:\path\to\python.exe"
```

然后运行：

```powershell
npm run install
npm run check
npm run demo
npm run dev
```

打开终端打印的地址（默认 `http://127.0.0.1:4000`；端口被占用时自动选择可用端口）。默认 `dev` 是评审用轻量模式：加载真实页面、API 和规则引擎，但用确定性的姿态输入替代 GPU 模型，因此无摄像头、无 CUDA 也能复现主流程。它不会改动生产代码，也不会写入正式的 `data/certifications.json`。

### Harness 命令

| 命令 | 作用 | 预期结果 |
|---|---|---|
| `npm run install` | 创建 `.venv` 并安装最小依赖 | Flask 与 NumPy 可用 |
| `npm run dev` | 启动无 GPU 评审服务器 | 端口 4000 可访问 |
| `npm run test` | 运行最小 `unittest` 测试集 | 所有测试通过 |
| `npm run check` | 编译检查、文档契约检查、测试 | 退出码 0 |
| `npm run demo` | 执行确定性端到端 smoke | 输出 `status: passed` |
| `npm run usability -- status` | 检查 T-050 真人研究数据 | 5 人完成前诚实返回 `incomplete` 和非零退出码 |

Ghost Coach 的无摄像头视觉验收入口为 `/coach?ghost_demo=sequence`；也可以将 `sequence` 换成 `error`、`correct` 或 `counted` 固定到某个状态。认证页使用 `/certification?ghost_demo=error`。这些入口用于复现 UI，不替代真人动作和可用性测试。

T-050 必须记录真实参与者，匿名录入示例见 [五人测试记录](docs/ghost-coach-usability-results.md)。录入五人后运行 `npm run usability -- status`，只有静音与嘈杂场景均覆盖、箭头理解率及舒适度达标且无人报告视觉疲劳时才返回 `passed`。

## 真实模型启动

真实模型链路需要较大的计算机视觉依赖以及与你的 CPU/CUDA 环境匹配的 PyTorch：

```powershell
python -m pip install -r requirements.txt
# 按 https://pytorch.org/ 的环境说明安装匹配的 PyTorch
$env:OLLAMA_MODEL = "gemma4:e2b"
python web_app.py
```

更完整的环境说明见 [RUNNING.md](RUNNING.md)。本地 Ollama 不可用时，视觉分类和规则纠错仍可运行，只有生成式教练文案会降级。

## 评委 Demo 流程

1. 在 ClawHive 对话中发起“给今天的工厂招聘批次创建深蹲 50 次体能检测”（ClawHive 编排为 48 小时待接入项）。
2. 打开 `/certification`，录入虚构候选人信息并展示深蹲自动计数、无效动作不计数和达标认证。
3. 展示摄像头关键点、动作阶段、计数、错误提示和语音纠正。
4. 结束会话，展示结构化总结和历史记录；说明结果供 HR 复核并进入下一招聘环节。
5. 再用 30 秒展示增长路径：同一引擎如何变成“安全搬运姿势复训”，由 ClawHive 通知员工并沉淀岗位规则资产。输入输出契约见 [PRD](docs/PRD.md)。

Demo 种子数据位于 [enterprise_demo.json](data/demo/enterprise_demo.json)。完整验收口径见 [acceptance.md](docs/acceptance.md)。

## 目录

```text
enterprise-pose-coach/
├── web_app.py                 # 现有 Flask 主应用（未被 harness 修改）
├── src/                       # 现有模型、推理与规则引擎
├── templates/                 # 现有 Web 页面
├── model/                     # 已有模型权重
├── app/                       # React Native 早期原型，非主链路
├── backend/                   # FastAPI 早期原型，非主链路
├── data/demo/                 # 脱敏 Demo 种子数据
├── data/usability/            # 匿名真人研究记录（初始为空，不生成虚假反馈）
├── docs/                      # PRD、架构、验收与任务清单
├── tests/harness/             # 无 GPU 最小测试
├── tools/harness.mjs          # package scripts 统一入口
└── tools/smoke_test.py        # 端到端 smoke
```

## 文档导航

- [PRD：产品、数据模型、API、页面、风险与 48 小时计划](docs/PRD.md)
- [推荐技术栈与目录结构](docs/architecture.md)
- [可执行验收标准](docs/acceptance.md)
- [MVP 任务与 done/todo 状态](docs/tasks.md)
- [真实模型与数据证据](docs/real-evidence.md)
- [Ghost Coach 设计与姿态数据审计](docs/ghost-coach-design.md)
- [Ghost Coach 五人测试记录](docs/ghost-coach-usability-results.md)
- [原始运行说明](RUNNING.md)

## 大赛提交清单

| 提交项 | 状态 | 证据/下一步 |
|---|---|---|
| 一句话定位与完整 PRD | done | [PRD](docs/PRD.md) |
| 可复现 install/dev/test/check/demo | done | 根目录 `package.json` |
| 无 GPU 主流程 smoke | done | `npm run demo` 输出 `status: passed` |
| 实时 Web Demo | done | `/`、`/coach`、`/certification` |
| 真实模型与权重证据 | done | [real-evidence.md](docs/real-evidence.md) |
| 招聘深蹲 Sample | done（本地） | 现场演示机仍需冷启动彩排 |
| 多项目 Sample | partially done | 动作识别已有；组合标准与汇总 todo |
| 在岗复训 Sample | partially done | 代理动作已有；工业规则和 ClawHive 回写 todo |
| ClawHive Skill/连接器 | todo | 先完成一个任务创建→结果通知闭环 |
| Demo 视频（5 分钟内） | todo | 招聘主 Demo 约 2 分钟，增长路径约 30 秒 |
| 路演 PPT | todo | 痛点、真模型、真闭环、ClawHive、商业化、风险 |
| 截图与离线备份 | todo | 首页、实时纠错、认证、混淆矩阵、smoke JSON |

完整验收标准见 [acceptance.md](docs/acceptance.md)，48 小时任务顺序见 [tasks.md](docs/tasks.md)。

---

> **最终叙事**：安姿盾先成为招聘现场不会疲劳、标准一致、可解释复核的 AI 体能考官；员工入职后，再成为持续纠正岗位动作、沉淀企业安全知识的数字教练。一个视觉引擎，贯穿“入职筛选—上岗训练—在岗复训”的员工全周期。🦀
