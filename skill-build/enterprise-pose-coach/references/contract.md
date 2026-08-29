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
| `best_weight_id` | string | 否（**首次调用不填**） | — | 已沉淀的 Best 权重 ID；首次调用不填，Skill 内部走训练链路并生成该 ID；后续调用必须传入才能直接加载 Best 权重。 |
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
| `best_weight_id` | string | 是 | **Best 权重 ID**（首次调用回传新生成的；后续调用回传已沉淀的，例如 `bw-factory-A-20260807-v1`）。每次响应必须原样回传，便于审计可追溯。 |
| `best_weight_version` | string | 是 | **Best 权重版本号**（同一 Best 权重的多次迭代，例如 `v1` / `v2`），用于迭代回滚。 |
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
## 8. 训练 + 沉淀 + 复用 生命周期

本 Skill 在 ClawHive Agent 视角下是单一 Skill，但内部覆盖两条调用路径：

### 8.1 首次调用（训练 + 沉淀）

`best_weight_id` 不填。Skill 内部按下列流程执行：

| 步骤 | 说明 |
|---|---|
| 数据获取 | Skill 指导 Agent 检索并筛选开源数据集（或接入企业上传的脱敏样本），检查数据许可、动作类别和数据格式 |
| 数据处理 | 清洗、人体关键点转换、48 帧序列切分、训练集和验证集划分；典型 shape `(N, 2, 48, 17)` |
| 模型训练 | 以成熟通用模型（`stgcn-mmfit-11cls-stride48`）为起点，用训练集做有监督学习 |
| 效果评估 | 在验证集上计算 `train_loss` / `val_accuracy` / `val_top3`，与历史 Best 权重比较 |
| 选择 Best 权重 | 选择验证集表现最优的 checkpoint，保存为该企业的 Best 权重 |
| 沉淀 | 写入 `model/bw_<tenant>_<date>_<version>.pth`，记入版本表（含 `trained_from` / `metrics` / `sha256`） |
| 输出 `best_weight_id` | Skill 响应中回传，供 Agent 持久化保存 |

### 8.2 后续调用（直接复用 Best 权重）

`best_weight_id` **必须填**。Skill 内部按下列流程执行：

1. Agent 把 `best_weight_id` 传入 Skill；
2. Skill 加载对应的 `model/bw_<tenant>_<date>_<version>.pth`，无需重训练；
3. 候选人摄像头前完成动作 → 实时监测 / 实时纠正 / 实时计数 / 实时反馈；
4. 返回 `decision` + `best_weight_id` + `best_weight_version`，供 HR / EHS 复核。

### 8.3 再次训练与版本回滚

未来新样本积累后，Agent 可再次进入训练链路：

```text
当前 Best 权重（v1）
       ↓
新增授权数据 → 再训练 → 新旧权重评估
                         ↓
              新权重更优 → 升级为 v2，旧 v1 保留可回滚
              新权重未更优 → 保留 v1
```

只有当新 Best 权重在验证集上优于当前版本时，才升级为新的 `best_weight_version`；旧版本保留可回滚。

### 8.4 训练链路示例

完整示例见：

- [`examples/base-train-request.json`](../examples/base-train-request.json)：首次调用（训练）的入参（`best_weight_id` 不填）
- [`examples/base-train-response.json`](../examples/base-train-response.json)：训练完成后 Skill 回传的 Best 权重信息
