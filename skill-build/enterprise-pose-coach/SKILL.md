---
name: enterprise-pose-coach
description: 面向企业招聘、转岗与在岗训练的 **AI 体能数字员工 Skill**。本 Skill 自带 **训练 + 沉淀 + 复用** 生命周期：当 ClawHive Agent 第一次调用时，Skill 指导 Agent 完成数据获取 → 数据处理 → 模型训练 → 效果评估 → **选择效果最好的 Best 权重并沉淀**；后续每一次调用都直接加载这个 Best 权重，不需要重新训练。Best 权重保存在用户电脑或企业私有环境中，可下载、可私有部署、可重复调用、可持续进化（旧版可回滚）。运行时的实时链路是：**实时监测（毫秒级阶段切换）+ 实时纠正（即时提示 + 语音播报）+ 实时计数（完整动作周期 +1）+ 实时反馈**。输出 `decision ∈ {pass, not_met, needs_retraining, inconclusive}` 与 `best_weight_id`，供 HR / EHS 复核与回写。**核心金句**：传统 Skill 编排已有能力；练了么 Skill 帮助 Agent 训练、沉淀并持续调用新的垂直能力。
allowed-tools:
  - python.exec
  - file.read
  - webhook.notify
  - data.write
  - audit.emit
  - best_weight.load
  - best_weight.retrain
---

# 练了么 · AI 体能数字员工 Skill（训练 + 沉淀 + 复用）

## 1. 这不是一个传统 Skill：训练 + 沉淀 + 复用

`enterprise-pose-coach` 是一个 ClawHive Skill，对应"**训练 + 沉淀 + 复用**"完整生命周期：

```text
成熟通用模型（RTMPose + ST-GCN + YOLOv8n，本地或仓库内）
        ↓   首次调用：在通用模型之上训练
训练出来的垂直模型（Best 权重，按 tenant + standard 沉淀）
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
2. **后续调用（直接复用）**：Agent 发起"今天 A 批候选人创建深蹲 50 次检测"，Skill 直接加载之前沉淀的 `best_weight_id`，进入实时监测 + 实时纠正 + 实时计数 + 实时反馈。

**Skill 不是固定推理服务**。能力随着每家企业训练出新的 Best 权重而成长；未来新样本进来可以**再次训练**，只有当新权重通过评估并优于当前版本时，才升级为新的 Best 权重，旧版本保留可回滚。

第一阶段切入点为**招聘/转岗体能筛选**：实时计数 + 实时纠错 + 实时认证与人工复核闭环。
第二阶段为**在岗动作合规与工效风险训练**：复用同一 Skill，叠加 EHS 专家确认的岗位标准。

## 2. 何时调用本 Skill

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

## 3. 输入契约（Input）

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `request_id` | string | 是 | 幂等请求 ID，防止重复创建任务 |
| `tenant_id` | string | 是 | 企业租户标识 |
| `batch_id` | string | 否 | 招聘/转岗批次 |
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

## 4. 输出契约（Output）

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

## 5. 安全与隐私边界

本 Skill 在产品定义上**明确不做**：

- 医疗诊断、康复处方、伤病预测
- 用与岗位无关的敏感特征判断体能
- 替代 HR / EHS 授权人员做最终录用、辞退、绩效或薪酬决定
- 把原始摄像头帧上传给生成式大模型
- 在没有告知、访问权限与留存策略的情况下保存视频证据

技术失败与模型超时一律返回 `inconclusive` 或进入人工复核。详细条款见仓库 [`README.md`](../../README.md)「数据、安全与使用边界」与 [`docs/PRD.md`](../../docs/PRD.md)「8.1 评估口径」。

## 6. 模型与版本

| 组件 | 当前实现 | 说明 |
|---|---|---|
| 姿态估计 | RTMPose ONNX | COCO 17 关键点，**成熟通用模型** |
| 动作分类 | PyTorch ST-GCN | 48 帧窗口、11 类动作；**训练 Best 权重的起点** |
| 辅助检测 | YOLOv8n | 仓库内含本地权重 |
| 规则引擎 | NumPy + 可解释几何规则 | 6 类专项 + 5 类通用；其余动作只给节奏/稳定性通用反馈，不包装为未验证的规则 |
| 可选生成式反馈 | Ollama `gemma4:e2b` | 仅文案层，规则链路不依赖 |

模型权重、训练样本、混淆矩阵与演示机日志见仓库 [`docs/real-evidence.md`](../../docs/real-evidence.md)。

## 7. 失败与降级

| 场景 | 行为 |
|---|---|
| Ollama 不可用 | 视觉分类与规则纠错继续运行，生成式教练文案降级 |
| 模型超时 / 关键点无效 | 返回 `decision: inconclusive`，`review_status: required` |
| 无 GPU | 走 harness CPU 路径（`npm run dev`） |
| 摄像头权限被拒 | 终止会话，回写 `error: camera_permission_denied` |
| 重复 `request_id` | 返回首次的 `task_id` 与 `decision`，不重复创建任务 |
| Best 权重文件缺失 | 返回 `decision: inconclusive`，`reason: best_weight_missing` |

## 8. 资产清单

Skill 包内：

- `prompts/coach-feedback-system.txt`：本地生成式教练反馈的系统提示词模板
- `examples/`：四组契约示例（输入 1 + 输出 3）+ 一组首次调用（训练）示例
- `references/asset-metadata.json`：API 资产依赖声明（ClawHive 解析）
- `references/contract.md`：完整契约字段表与边界条款
- `references/api-mapping.md`：本 Skill 字段与仓库现有 `/api/session/*` 的映射

Skill 包外（仓库内，**不在 ZIP 内**）：

- 真实模型权重（`model/*.onnx`、`model/*.pth`、`yolov8n.pt`）— 部署时挂载
- `src/` 推理与规则引擎源码
- `web_app.py` Flask Web 与会话管理
- `data/demo/enterprise_demo.json` 脱敏 Demo 种子数据
- 训练出的 Best 权重（首次调用沉淀后落在 `model/bw_<tenant>_<date>_<version>.pth`）

## 9. 复用建议

新接入方使用本 Skill 时，推荐按下列顺序验证：

1. 用 `examples/input-request.json`（首次调用，`best_weight_id` 不填）跑通一次端到端，确认产出 `best_weight_id`。
2. 用 `examples/output-inconclusive.json` 模拟摄像头权限被拒，确认回写路径。
3. 参考 `references/contract.md` 接入真实租户与批次。
4. 再次调用时传入 `best_weight_id`，确认 Skill 直接加载 Best 权重进入实时监测 / 实时纠正 / 实时计数 / 实时反馈。
5. 上线前阅读仓库 `docs/acceptance.md` 完��所有 P0 自动验收。