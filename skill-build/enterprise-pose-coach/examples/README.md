# Examples · 契约示例说明（v1.1.0）

本目录给出 6 个契约示例，覆盖练了么 Skill（`enterprise-pose-coach`）的 **训练 + 沉淀 + 复用** 完整生命周期：首次调用训练并沉淀 Best 权重，后续调用直接加载 Best 权重做实时反馈。

## 1. 文件清单

| 文件 | 角色 | 关键字段 |
|---|---|---|
| `base-train-request.json` | 首次调用输入（训练） | `tenant_id` / `standard_id` / `best_weight_id=null` / `training_data` |
| `base-train-response.json` | 首次调用输出（沉淀） | `best_weight_id` / `metrics` / `artifact` |
| `input-request.json` | 后续调用完整入参 | 必填 + 可选字段全演示，含 `retention_policy` 与 `notify_url`，**绑定 `best_weight_id`** |
| `output-pass.json` | 达标结论 | `decision: pass`，`review_status: not_required`，附 `certificate_id`、`best_weight_id` / `best_weight_version` |
| `output-not-met.json` | 未达标结论 | `decision: not_met`，`recommendation: needs_retraining` |
| `output-inconclusive.json` | 技术故障 | `decision: inconclusive`，`review_status: required`，附 `inconclusive_reason` |

## 2. 验收要点

- `decision` 只允许 `pass / not_met / needs_retraining / inconclusive` 四种枚举值。
- `request_id` 在所有响应中必须**原样回传**。
- 任何技术故障（关键点无效、模型超时、摄像头权限被拒、Ollama 不可用、Best 权重文件缺失）必须返回 `inconclusive`，**不得伪造为 `not_met`**。
- `top_errors` 数组按出现次数倒序，最多 3 条；每条含 `code`、`count`、`cue`。
- `model_version` / `rule_version` / `best_weight_id` / `best_weight_version` 必须每次返回，便于审计与版本回滚。
- 首次调用必须显式置空 `best_weight_id`（或置为 `null`），由 Skill 内部训练链路产出新的 `best_weight_id` 并沉淀。
- 后续调用必须传入 `best_weight_id`，Skill 直接加载沉淀的 Best 权重，不再经过数据下载 / 训练链路。

## 3. 复用方式

新接入方按下列顺序接入：

1. **首次调用（训练 + 沉淀）**：把 `base-train-request.json` 的租户 / 标准 / 数据源字段填好，发起训练；等回调拿到 `best_weight_id`。
2. **后续调用（直接复用）**：把 `input-request.json` 的 `best_weight_id` 字段填入第一步拿到的值，再发起一次评估。
3. 用 `output-pass.json` / `output-not-met.json` / `output-inconclusive.json` 做契约测试与回归测试的期望值。
4. 生产部署时把 `output-pass.json` 的 `best_weight_version` 与企业 CI/CD 的版本号对齐。
5. 持续进化：积累新授权脱敏样本后可再次触发训练，只有当新权重评估优于当前版本时才升级；旧版本保留可回滚。

## 4. 演示场景对应（路演时怎么用）

| 示例文件 | 路演对应镜头 | 关键口播 |
|---|---|---|
| `base-train-request.json` + `base-train-response.json` | 第三幕镜头 7-11（首次调用训练 + 沉淀） | "首次调用 Skill 内部走完整训练链路，返回 best_weight_id + sha256" |
| `input-request.json` | 第五幕镜头 14-15（后续调用直接加载 Best 权重） | "请求里只多了一个 best_weight_id，Skill 不再走训练链路，直接加载沉淀的 Best 权重" |
| `output-pass.json` | 第六幕镜头 19-20（实时计数 + 实时反馈） + 第八幕镜头 23（资产层叙事） | "decision: pass，best_weight_id 原样回传，HR / EHS 可反查到当时加载的权重版本" |
| `output-not-met.json` | 第九幕镜头 25（决策四态边界） | "decision: not_met，recommendation: needs_retraining，供 HR 复核" |
| `output-inconclusive.json` | 第九幕镜头 25（决策四态边界） + 附录 B 失败兜底 | "技术故障一律返回 inconclusive，不伪造为 not_met" |

## 5. 业务痛点 → 示例字段对应（评委提问预案）

| 评委关心 | 示例文件 | 字段证据 |
|---|---|---|
| 怎么知道 AI 不是在猜？ | `output-pass.json` | `valid_rep_count: 50` / `invalid_rep_count: 3` / `score: 92` / `top_errors` 可复现 |
| 候选人有疑问怎么复核？ | `output-pass.json` + `output-not-met.json` | `top_errors[].cue` 中文 cue 文案 + `best_weight_id` 反查权重版本 |
| 摄像头画面会上云吗？ | `input-request.json` | `retention_policy.raw_frames: "none"` + `retention_policy.audio: "none"` |
| 跨企业的权重会冲突吗？ | `base-train-response.json` | `best_weight_id: "bw-factory-A-20260807-v1"` 含 `factory-A` 租户段 |
| 训练真的跑过吗？ | `base-train-response.json` | `metrics: {train_loss: 0.18, val_accuracy: 0.94, val_top3: 0.99}` + `artifact.sha256` |

完整契约字段表见 [`references/contract.md`](../references/contract.md)，与现有 Flask API 的字段映射见 [`references/api-mapping.md`](../references/api-mapping.md)。
