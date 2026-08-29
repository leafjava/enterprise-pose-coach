# 完整 Skill 契约（contract.md）

本文件是 `enterprise-pose-coach` 的权威契约说明。`SKILL.md` 是简介，`asset-metadata.json` 是机器可解析的依赖声明，本文件是字段级详解。

## 1. 输入字段（Input）

| 字段 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `request_id` | string | 是 | — | 幂等键。同一 `request_id` 重复调用必须返回首次的 `task_id` 与最终 `decision`，不得新建任务。 |
| `tenant_id` | string | 是 | — | 企业租户标识，用于权限隔离与计费。 |
| `batch_id` | string | 否 | — | 招聘/转岗批次，便于汇总。 |
| `assignee_id` | string | 是 | — | 候选人临时 ID 或员工内部 ID。Demo 用 `candidate-c042`，生产建议用脱敏 ID。 |
| `standard_id` | string | 是 | — | 规则版本号，如 `RECRUIT_SQUAT_50_V1`。 |
| **`vertical_base_id`** | string | 是 | — | 由配套的**基座训练 Skill `pose-coach-trainer`** 为该企业微调出来的垂直基座 ID。本 Skill 不在通用基座上裸跑，必须绑定 `vertical_base_id` 才能运行；它保证了"基座 + 基座"架构中第二个基座的来源可审计。 |
| `exercise` | string | 是 | — | 动作 ID：`squats` / `pushups` / `situps` / `lunges` / `shoulder_press` / `rowing` / `bicep_curl`。 |
| `target_reps` | integer | 是 | — | 目标有效次数，1–200。 |
| `due_at` | string (ISO 8601) | 否 | — | 截止时间。 |
| `retention_policy` | object | 否 | `{structured_events_days: 365, raw_frames: "none"}` | 留存策略。 |
| `voice_enabled` | boolean | 否 | `true` | 是否启用 Web Speech API 语音播报。 |
| `notify_url` | string | 否 | — | 完成后回写 webhook 地址。 |

## 2. 输出字段（Output）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `request_id` | string | 是 | **原样回传**入参的 `request_id`，便于编排层对账。 |
| `task_id` | string | 是 | 本次任务的唯一 ID。 |
| `session_id` | string | 是 | 本次会话的唯一 ID。 |
| `decision` | enum | 是 | `pass` / `not_met` / `needs_retraining` / `inconclusive`。 |
| `valid_rep_count` | integer | 是 | 完整动作周期的有效次数。 |
| `invalid_rep_count` | integer | 是 | 检测到但未达标的次数（用于错误统计）。 |
| `target_reps` | integer | 是 | 原样回传入参的 `target_reps`。 |
| `score` | integer \| null | 否 | 0–100 客观评分；技术故障时为 `null`。 |
| `top_errors` | array | 是 | 错误数组，按出现次数倒序，最多 3 条。每条含 `code`、`count`、`cue`。 |
| `review_status` | enum | 是 | `not_required` / `optional` / `required`。`inconclusive` 必为 `required`。 |
| `model_version` | string | 是 | 模型版本号，建议含日期或 hash。 |
| `rule_version` | string | 是 | 规则版本号，与 `standard_id` 对应。 |
| `base_version` | string | 是 | **通用基座**版本号（公共资产，例如 `stgcn-mmfit-11cls-stride48@2026-05-29`）。 |
| `vertical_base_id` | string | 是 | **垂直基座** ID（来自基座训练 Skill，例如 `vbase-factory-A-20260807`）。本 Skill 每次响应都必须原样回传，便于审计可追溯。 |
| `vertical_base_version` | string | 是 | **垂直基座**版本号（同一垂直基座的多次迭代，例如 `v1` / `v2`），用于基座迭代回滚。 |
| `completed_at` | string (ISO 8601) | 是 | 完成时间。 |
| `certificate_id` | string | 否 | 当 `decision: pass` 时生成；否则省略。 |
| `recommendation` | enum | 否 | `needs_retraining` 时建议复训；其他场景省略。 |
| `inconclusive_reason` | string | 否 | 仅 `decision: inconclusive` 时出现，取值见 §4。 |
| `candidate_message` | string | 否 | 给候选人的中文友好提示。 |

## 3. 决策矩阵（Decision Matrix）

| 输入条件 | `decision` | `review_status` | `recommendation` |
|---|---|---|---|
| `valid_rep_count >= target_reps` 且置信度足够 | `pass` | `not_required` | — |
| `valid_rep_count < target_reps` 且置信度足够 | `not_met` | `optional` | `needs_retraining`（可选） |
| 错误率 > 50% 且无法判定进度 | `needs_retraining` | `required` | `needs_retraining` |
| 关键点无效 / 模型超时 / 摄像头拒绝 / 置信度不足 | `inconclusive` | `required` | — |

## 4. `inconclusive_reason` 取值

| 取值 | 含义 |
|---|---|
| `keypoints_invalid_after_30s` | 关键点连续 30 秒未达到有效阈值 |
| `camera_permission_denied` | 浏览器拒绝摄像头权限 |
| `model_timeout` | 模型推理超过 5 秒 |
| `ollama_unavailable` | LLM 不可用（仅文案降级，不影响核心判定） |
| `duplicate_request_id_with_conflict` | 同 `request_id` 但参数冲突 |

## 5. 边界条款

1. **不得伪造结果**：技术故障一律 `inconclusive`，不得伪造为 `not_met` 或 `pass`。
2. **不得越权决定**：最终录用、辞退、绩效、薪酬由企业授权人员结合完整信息决定，本 Skill 只给结论。
3. **不得长期保存原始帧**：默认不留存；如需留存必须显式声明并取得告知同意。
4. **不得上传原始帧给生成式大模型**：视觉模型在本地推理；只有脱敏的结构化事件可参与 LLM 文案生成。
5. **不得用于医疗/康复**：本 Skill 不提供疾病诊断、康复处方、伤病预测。
6. **规则版本不可热改**：`rule_version` 必须每次响应，规则变更需发布新 `standard_id`。

## 6. 幂等与并发

- 同一 `tenant_id + request_id` 的并发请求必须返回同一 `task_id`，不重复创建任务。
- 单租户最大并发会话数：`4`（参见 `asset-metadata.json`）。
- 单租户每分钟最大任务创建数：`30`。
- 任务创建后 30 分钟未完成自动进入 `inconclusive`，`inconclusive_reason: model_timeout`。

## 7. 审计与可追溯

每次响应必须可被第三方独立复算：

- 输入侧：`request_id` + `tenant_id` + `assignee_id` + `standard_id` + `model_version` + `rule_version` 决定了一次评估的边界。
- 输出侧：`valid_rep_count` + `top_errors` + `score` 必须能用同一份脱敏事件日志复现。

隐私不进审计事件：候选人姓名、邮箱、原始视频帧、模型 prompt 不进入日志或审计字段。
## 8. 配套基座训练 Skill `pose-coach-trainer` 契约（草图）

`enterprise-pose-coach` 是"基座 + 基座"双层架构中的**实时纠错 Skill**。
它**必须**运行在垂直基座之上；垂直基座由配套的基座训练 Skill `pose-coach-trainer` 产出。
下面是基座训练 Skill 的草图契约，便于 ClawHive Agent 串联两个 Skill��

### 8.1 基座训练 Skill 输入

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `request_id` | string | 是 | 幂等键 |
| `tenant_id` | string | 是 | 企业租户标识 |
| `standard_id` | string | 是 | 规则版本号（如 `RECRUIT_SQUAT_50_V1`），与本 Skill 输出对齐 |
| `base_checkpoint` | string | 是 | 微调起点，固定为通用基座 ID（如 `stgcn-mmfit-11cls-stride48`） |
| `training_data` | object | 是 | 数据来源：`tenant-uploaded` / `public-proxy`，含 `subjects` / `windows` / `shape` / `synthetic_allowed` |
| `hyperparameters` | object | 否 | `epochs` / `batch_size` / `learning_rate`；不填走默认 |
| `notify_url` | string | 否 | 训练完成后 webhook 回写 |

### 8.2 基座训练 Skill 输出

| 字段 | 类型 | 说明 |
|---|---|---|
| `request_id` | string | 原样回传 |
| `vertical_base_id` | string | 新生成的垂直基座 ID（例：`vbase-factory-A-20260807`） |
| `tenant_id` | string | 原样回传 |
| `standard_id` | string | 原样回传 |
| `trained_from` | string | 实际微调起点（一般是入参 `base_checkpoint`，可能因兼容性问题被替换） |
| `metrics` | object | `train_loss` / `val_accuracy` / `val_top3` |
| `artifact` | object | `path` / `size_mb` / `sha256` |
| `completed_at` | string | ISO 8601 |

### 8.3 ClawHive Agent 编排顺序

1. HR 发起训练请求 → Agent 调用 `pose-coach-trainer`，拿到 `vertical_base_id`；
2. HR 发起实时检测 → Agent 调用 `enterprise-pose-coach`，入参里传 `vertical_base_id`；
3. 本 Skill 在该垂直基座上做实时监测 / 实时纠正 / 实时计数 / 实时反馈；
4. 返回结构化评估结果（包含 `vertical_base_id` 与 `vertical_base_version`），HR 复核后回写招聘台账。

完整示例见 [`examples/base-train-request.json`](../examples/base-train-request.json) 与 [`examples/base-train-response.json`](../examples/base-train-response.json)。
