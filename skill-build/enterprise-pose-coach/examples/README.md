# Examples · 契约示例说明

本目录给出 6 个契约示例，覆盖"基座 + 基座"双层架构在 ClawHive 上的完整编排：
**基座训练 Skill `pose-coach-trainer`** 产出垂直基座 →
**实时纠错 Skill `enterprise-pose-coach`** 在垂直基座上做实时反馈。

| 文件 | 角色 | 关键字段 |
|---|---|---|
| `base-train-request.json` | 基座训练 Skill 输入 | `tenant_id` / `standard_id` / `base_checkpoint` / `training_data` |
| `base-train-response.json` | 基座训练 Skill 输出 | `vertical_base_id` / `metrics` / `artifact` |
| `input-request.json` | 实时纠错 Skill 完整入参 | 必填 + 可选字段全演示，含 `retention_policy` 与 `notify_url`，**绑定 `vertical_base_id`** |
| `output-pass.json` | 达标结论 | `decision: pass`，`review_status: not_required`，附 `certificate_id`、**`base_version` / `vertical_base_id` / `vertical_base_version`** |
| `output-not-met.json` | 未达标结论 | `decision: not_met`，`recommendation: needs_retraining` |
| `output-inconclusive.json` | 技术故障 | `decision: inconclusive`，`review_status: required`，附 `inconclusive_reason` |

## 验收要点

- `decision` 只允许 `pass / not_met / needs_retraining / inconclusive` 四种枚举值���
- `request_id` 在所有响应中必须**原样回传**。
- 任何技术故障（关键点无效、模型超时、摄像头权限被拒、Ollama 不可用）必须返回 `inconclusive`，**不得伪造为 `not_met`**。
- `top_errors` 数组按出现次数倒序，最多 3 条；每条含 `code`、`count`、`cue`。
- `model_version` / `rule_version` / `base_version` / `vertical_base_id` / `vertical_base_version` 必须每次返回，便于审计与版本回滚。
- 本 Skill 不在通用基座上裸跑：调用前必须存在对应的 `vertical_base_id`（由 `pose-coach-trainer` 产出）。

## 复用方式

新接入方按下列顺序接入：

1. **先调基座训练 Skill**：把 `base-train-request.json` 替换为真实租户/标准/数据源字段，发起训练；等回调拿到 `vertical_base_id`。
2. **再调实时纠错 Skill**：把 `input-request.json` 的 `vertical_base_id` 字段填入，再发起一次评估。
3. 用 `output-pass.json` / `output-not-met.json` / `output-inconclusive.json` 做契约测试与回归测试的期望值。
4. 生产部署时把 `output-pass.json` 的 `base_version` / `vertical_base_version` 与企业 CI/CD 的版本号对齐。

完整契约字段表见 [`references/contract.md`](../references/contract.md)，与现有 Flask API 的字段映射见 [`references/api-mapping.md`](../references/api-mapping.md)。