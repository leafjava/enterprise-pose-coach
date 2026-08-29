# Examples · 契约示例说明

本目录给出 4 个契约示例，覆盖招聘深蹲 50 次体能检测主链路最常见的三种结果与一种入参。

| 文件 | 角色 | 关键字段 |
|---|---|---|
| `input-request.json` | 完整入参示例 | 必填 + 可选字段全演示，含 `retention_policy` 与 `notify_url` |
| `output-pass.json` | 达标结论 | `decision: pass`，`review_status: not_required`，附 `certificate_id` |
| `output-not-met.json` | 未达标结论 | `decision: not_met`，`recommendation: needs_retraining` |
| `output-inconclusive.json` | 技术故障 | `decision: inconclusive`，`review_status: required`，附 `inconclusive_reason` |

## 验收要点

- `decision` 只允许 `pass / not_met / needs_retraining / inconclusive` 四种枚举值。
- `request_id` 在所有响应中必须**原样回传**。
- 任何技术故障（关键点无效、模型超时、摄像头权限被拒、Ollama 不可用）必须返回 `inconclusive`，**不得伪造为 `not_met`**。
- `top_errors` 数组按出现次数倒序，最多 3 条；每条含 `code`、`count`、`cue`。
- `model_version` 与 `rule_version` 必须每次返回，便于审计与版本回滚。

## 复用方式

新接入方把 `input-request.json` 替换为真实租户/批次/候选人字段后即可发起调用；用 `output-pass.json` / `output-not-met.json` / `output-inconclusive.json` 做契约测试与回归测试的期望值。

完整契约字段表见 [`references/contract.md`](../references/contract.md)，与现有 Flask API 的字段映射见 [`references/api-mapping.md`](../references/api-mapping.md)。
