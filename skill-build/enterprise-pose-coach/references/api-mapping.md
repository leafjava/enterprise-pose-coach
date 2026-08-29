# API 字段映射（api-mapping.md）

本文件说明 `enterprise-pose-coach` Skill 契约字段与仓库现有 Flask API（`/api/session/*`、`/api/certifications`）的字段对应关系。

## 1. 现状

仓库现有 Web 主链路以 Flask 实现，路由：

| 路由 | 方法 | 作用 |
|---|---|---|
| `/api/session/start` | POST | 创建会话，绑定动作与模式 |
| `/api/session/frame` | POST | 接收帧，返回阶段、计数、纠错 |
| `/api/session/stop` | POST | 停止会话，返回结构化总结 |
| `/api/certifications` | GET | 查询认证历史 |
| `/api/certifications` | POST | 写入达标认证 |

这套 API 只要求动作和图像帧，**没有**租户、批次、标准版本、幂等键、复核状态等企业级字段。

## 2. Skill 字段 → Flask 字段映射

| Skill 字段 | 现有 Flask 字段 | 备注 |
|---|---|---|
| `request_id` | （无） | 新增：写入会话存储；webhook 回写时原样回传 |
| `tenant_id` | （无） | 新增：从会话存储读取；审计事件分组维度 |
| `batch_id` | （无） | 新增：汇总与统计 |
| `assignee_id` | （无） | 新增：候选人临时 ID；与 `/api/certifications.worker_id` 对齐 |
| `standard_id` | （无） | 新增：规则版本号；写入 `certifications.rule_version` |
| **`vertical_base_id`** | （无） | 新增：基座训练 Skill 产出的垂直基座 ID；写入 `session.vertical_base_id`，审计事件必带 |
| `exercise` | `session.exercise` | 直接复用 |
| `target_reps` | `session.target_reps` | 新增字段；`/api/session/start` 接收 |
| `due_at` | （无） | 可选；用于超时控制 |
| `retention_policy` | （无） | 未来字段；MVP 先固定 `structured_events_days: 365` |
| `voice_enabled` | 客户端 `voiceToggle` | 服务端不存；浏览器本地控制 |
| `notify_url` | （无） | 新增：完成后 webhook 回写 |
| `decision` | `/api/session/stop` 总结中的 `pass` 判定 | 新增字段；服务端推导 |
| `valid_rep_count` | `/api/session/frame` 中的 `rep_count` | 直接复用 |
| `invalid_rep_count` | `summary.invalid_reps` | 新增：服务端累计 |
| `target_reps` | `session.target_reps` | 同上 |
| `score` | `summary.score` | 新增：客观评分公式 `100 - 错误次数*2` |
| `top_errors` | `/api/session/frame` 中的 `errors` | 直接复用；按 count 倒序取 3 |
| `review_status` | （无） | 新增：根据 `decision` 自动推导 |
| `model_version` | 启动时锁定 | 服务端常量，写入总结 |
| `rule_version` | 启动时锁定 | 服务端常量，与 `standard_id` 一致 |
| `completed_at` | `/api/session/stop` 返回时生成 | 新增 |
| `certificate_id` | `/api/certifications` POST 响应 | 仅 `pass` 时生成 |
| `recommendation` | （无） | 新增：仅 `not_met` 时可选 |
| `inconclusive_reason` | （无） | 新增：仅 `inconclusive` 时返回 |
| `candidate_message` | `summary.next_focus` | 直接复用 |

## 3. 接入步骤建议

新接入方按下列顺序把现有 Flask API 升级到 Skill 契约：

1. 在 `src/live_coach.py` 的 `LiveCoachSession` 增加 `tenant_id / batch_id / standard_id / target_reps / request_id / notify_url` 字段。
2. 在 `/api/session/start` 接收上述新字段，并写入会话存储。
3. 在 `/api/session/stop` 把 `summary` 扩成 Skill 输出契约字段（含 `decision`、`review_status`、`model_version`、`rule_version`）。
4. 新增 `/api/skill/callback/<task_id>` 接收 Skill 完成后的回写（仅当 ClawHive 主动推）。
5. 加幂等：同 `request_id` 二次调用返回首次的 `task_id` 与最终 `decision`。

## 4. 测试矩阵

| 测试 | 期望 |
|---|---|
| `examples/input-request.json` 入参跑通 | `decision: pass`，`valid_rep_count: 50` |
| 候选人被故意遮挡 30 秒 | `decision: inconclusive`，`review_status: required`，`inconclusive_reason: keypoints_invalid_after_30s` |
| 同 `request_id` 二次调用 | 返回同一 `task_id`，不重复创建 |
| Ollama 关闭 | 视觉分类与规则纠错继续，提示文案降级 |
| 无 GPU | harness 路径生效，返回同样的 `decision` |
## 5. 基座训练 Skill `pose-coach-trainer` 的字段映射

`pose-coach-trainer` 是配套的基座训练 Skill，调用的是仓库内另一组 Flask 路由（48 小时 MVP 待接入）：

| 路由 | 方法 | 作用 |
|---|---|---|
| `/api/skill/train_base` | POST | 启动一次垂直基座微调 |
| `/api/skill/vertical_bases` | GET | 查询租户下所有垂直基座列表 |
| `/api/skill/vertical_base/<vertical_base_id>` | GET | 查询单个垂直基座的训练指标与权重元数据 |

| Skill 字段 | Flask 字段 | 备注 |
|---|---|---|
| `request_id` | `train_job.request_id` | 幂等键 |
| `tenant_id` | `train_job.tenant_id` | 租户隔离 |
| `standard_id` | `train_job.standard_id` | 规则版本号；与本 Skill 输出对齐 |
| `base_checkpoint` | `train_job.base_checkpoint` | 固定为 `stgcn-mmfit-11cls-stride48` |
| `training_data` | `train_job.data_manifest` | 含 subjects/windows/shape/synthetic_allowed |
| `hyperparameters` | `train_job.hparams` | 不填走默认 |
| `notify_url` | `train_job.notify_url` | 训练完成后 webhook |
| `vertical_base_id` | `artifact.vertical_base_id` | 产出 ID |
| `trained_from` | `artifact.trained_from` | 实际微调起点 |
| `metrics` | `artifact.metrics` | `train_loss` / `val_accuracy` / `val_top3` |
| `artifact.path` | `model/vbase_<tenant>_<date>.pth` | 实际落盘路径 |
| `artifact.sha256` | `artifact.sha256` | 权重哈希，便于审计 |
| `completed_at` | `artifact.completed_at` | ISO 8601 |

### 5.1 训练 Skill 与实时纠错 Skill 的串联

```text
HR → ClawHive Agent → pose-coach-trainer.train_base
                       ↓ 返回 vertical_base_id
                       ↓ 部署到企业私有推理环境
HR → ClawHive Agent → enterprise-pose-coach.task.create
                       ↓ 传 vertical_base_id
                       ↓ 候选人摄像头前完成动作
                       ↓ 实时纠错 Skill 返回结构化评估
                       ↓ 回写招聘台账 / EHS 工单
```

### 5.2 接入步骤（48 小时 MVP 待办）

1. 新增 `src/train_base.py`：加载通用基座权重 → 接收企业脱敏样本 → 跑微调 → 产出 `vertical_base_id` 与权重；
2. 新增 `/api/skill/train_base` 与 `/api/skill/vertical_bases` Flask 路由；
3. 在本 Skill 的 `/api/session/start` 接收 `vertical_base_id` 并加载对应垂直基座权重；
4. `/api/session/stop` 把 `vertical_base_id` / `vertical_base_version` 写入响应体（已经在契约 §2 输出表中定义）。
