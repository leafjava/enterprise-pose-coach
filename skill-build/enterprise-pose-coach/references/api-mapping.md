# API 字段映射（api-mapping.md · v1.1.0）

本文件说明 `enterprise-pose-coach` Skill 契约字段与仓库现有 Flask API（`/api/session/*`、`/api/certifications`）的字段对应关系。

## 0. 业务定位与痛点对齐

`enterprise-pose-coach` 是面向制造 / 仓储企业招聘、转岗、在岗训练的 AI 体能数字员工 Skill。本文件描述的 API 升级路径，正是把现有 Flask Web 从"页面 + 单次会话"升级到 ClawHive 上的"训练 + 沉淀 + 复用"完整生命周期。

现有 Flask API 只要求动作和图像帧，**没有**租户、批次、标准版本、幂等键、复核状态等企业级字段——这正是 Skill 包需要补齐的部分。

## 1. 现状

仓库现有 Web 主链路以 Flask 实现，路由：

| 路由 | 方法 | 作用 |
|---|---|---|
| `/api/session/start` | POST | 创建会话，绑定动作与模式 |
| `/api/session/frame` | POST | 接收帧，返回阶段、计数、纠错 |
| `/api/session/stop` | POST | 停止会话，返回结构化总结 |
| `/api/certifications` | GET | 查询认证历史 |
| `/api/certifications` | POST | 写入达标认证 |

## 2. Skill 字段 → Flask 字段映射

| Skill 字段 | 现有 Flask 字段 | 备注 |
|---|---|---|
| `request_id` | （无） | 新增：写入会话存储；webhook 回写时原样回传 |
| `tenant_id` | （无） | 新增：从会话存储读取；审计事件分组维度 |
| `batch_id` | （无） | 新增：汇总与统计 |
| `assignee_id` | （无） | 新增：候选人临时 ID；与 `/api/certifications.worker_id` 对齐 |
| `standard_id` | （无） | 新增：规则版本号；写入 `certifications.rule_version` |
| `best_weight_id` | （无） | 新增：Skill 内部训练或复用的 Best 权重 ID；首次调用为空并由 Skill 内部生成，后续调用必填并加载对应权重；写入 `session.best_weight_id` |
| `exercise` | `session.exercise` | 直接复用 |
| `target_reps` | `session.target_reps` | 新增字段；`/api/session/start` 接收 |
| `due_at` | （无） | 可选；用于超时控制 |
| `retention_policy` | （无） | 未来字段；MVP 先固定 `structured_events_days: 365` |
| `voice_enabled` | 客户端 `voiceToggle` | 服务端不存；浏览器本地控制 |
| `notify_url` | （无） | 新增：完成后 webhook 回写 |
| `decision` | `/api/session/stop` 总结中的 `pass` 判定 | 新增字段；服务端推导；与 contract.md §3 决策矩阵对齐 |
| `valid_rep_count` | `/api/session/frame` 中的 `rep_count` | 直接复用 |
| `invalid_rep_count` | `summary.invalid_reps` | 新增：服务端累计 |
| `target_reps` | `session.target_reps` | 同上 |
| `score` | `summary.score` | 新增：客观评分公式 `100 - 错误次数*2` |
| `top_errors` | `/api/session/frame` 中的 `errors` | 直接复用；按 count 倒序取 3 |
| `review_status` | （无） | 新增：根据 `decision` 自动推导（`pass` → `not_required`；`not_met` → `optional`；`inconclusive` / `needs_retraining` → `required`） |
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
3. 在 `/api/session/stop` 把 `summary` 扩成 Skill 输出契约字段（含 `decision`、`review_status`、`model_version`、`rule_version`、`best_weight_id`、`best_weight_version`）。
4. 新增 `/api/skill/callback/<task_id>` 接收 Skill 完成后的回写（仅当 ClawHive 主动推）。
5. 加幂等：同 `request_id` 二次调用返回首次的 `task_id` 与最终 `decision`。
6. 升级 Web Speech 反馈链路：第一次错误只显示在画面顶部，错误连续 3 次才触发语音，同义提示 1.5s 冷却。

## 4. 测试矩阵

| 测试 | 期望 |
|---|---|
| `examples/input-request.json` 入参跑通 | `decision: pass`，`valid_rep_count: 50` |
| 候选人被故意遮挡 30 秒 | `decision: inconclusive`，`review_status: required`，`inconclusive_reason: keypoints_invalid_after_30s` |
| 同 `request_id` 二次调用 | 返回同一 `task_id`，不重复创建 |
| Ollama 关闭 | 视觉分类与规则纠错继续，提示文案降级 |
| 无 GPU | harness 路径生效，返回同样的 `decision` |
| 故意做膝盖内扣 3 次 | 第一次错误仅顶部红字；第 3 次才触发语音"膝盖打开一点" |
| 故意做偷快蹲 | 不计入 `valid_rep_count`；画面提示"幅度不足，未计入" |
| 后续调用传入不存在的 `best_weight_id` | `decision: inconclusive`，`inconclusive_reason: best_weight_missing` |

## 5. 训练 + 沉淀 + 复用 · 接入步骤

48 小时 MVP 待接入。本节给出把现有 Flask API 升级到"首次调用训练 + 后续调用复用"两条路径的步骤。

### 5.1 首次调用（训练 + 沉淀）· 新增路由

| 路由 | 方法 | 作用 |
|---|---|---|
| `/api/skill/init` | POST | 首次调用：训练垂直模型，按 contract.md §8.1 流程跑完后沉淀 Best 权重并返回 `best_weight_id` |
| `/api/skill/best_weights` | GET | 按 tenant 列出所有 Best 权重（含旧版本，可回滚） |
| `/api/skill/retrain` | POST | 再次训练：新样本进来后按 contract.md §8.3 流程评估新 Best 权重，优于当前版本才升级 |

### 5.2 首次调用入参字段映射

| Skill 字段 | Flask 字段 | 备注 |
|---|---|---|
| `request_id` | `train_job.request_id` | 幂等键 |
| `tenant_id` | `train_job.tenant_id` | 租户隔离 |
| `standard_id` | `train_job.standard_id` | 规则版本号；与本 Skill 输出对齐 |
| `training_data` | `train_job.data_manifest` | 含 subjects/windows/shape/synthetic_allowed |
| `hyperparameters` | `train_job.hparams` | 不填走默认 |
| `notify_url` | `train_job.notify_url` | 训练完成后 webhook |
| `best_weight_id` | `train_job.best_weight_id` | 首次调用不填；响应中生成 |
| `trained_from` | `artifact.trained_from` | 实际微调起点（一般是 `stgcn-mmfit-11cls-stride48@2026-05-29`） |
| `metrics` | `artifact.metrics` | `train_loss` / `val_accuracy` / `val_top3` |
| `artifact.path` | `model/bw_<tenant>_<date>_<version>.pth` | 实际落盘路径 |
| `artifact.sha256` | `artifact.sha256` | 权重哈希，便于审计 |
| `completed_at` | `artifact.completed_at` | ISO 8601 |

### 5.3 后续调用（直接复用 Best 权重）· 现有路由升级

| 路由 | 方法 | 改动 |
|---|---|---|
| `POST /api/session/start` | POST | 新增接收 `best_weight_id` 字段；服务端加载对应 Best 权重 |
| `POST /api/session/stop` | POST | 在响应中回传 `best_weight_id` + `best_weight_version` |

### 5.4 两条路径串联（ClawHive Agent 视角）

```text
HR → ClawHive Agent → 练了么 Skill.init （首次）
                       ↓ 返回 best_weight_id
                       ↓ 沉淀到企业私有推理环境
HR → ClawHive Agent → 练了么 Skill.session.start （传 best_weight_id）
                       ↓ 直接加载 Best 权重
                       ↓ 候选人摄像头前完成动作
                       ↓ 实时监测 / 实时纠正 / 实时计数 / 实时反馈
                       ↓ Skill 返回结构化评估
                       ↓ 回写招聘台账 / EHS 工单

未来：HR → ClawHive Agent → 练了么 Skill.retrain（新样本）
                       ↓ 评估新 Best 权重
                       ↓ 更优才升级为 v2，旧 v1 保留可回滚
```

### 5.5 接入步骤（48 小时 MVP 待办）

1. 新增 `src/train_vertical.py`：加载成熟通用模型权重 → 接收企业脱敏样本 → 跑微调 → 产出 `best_weight_id` 与权重；
2. 新增 `/api/skill/init` / `/api/skill/best_weights` / `/api/skill/retrain` Flask 路由；
3. 在 `/api/session/start` 接收 `best_weight_id` 并加载对应 Best 权重；
4. `/api/session/stop` 把 `best_weight_id` / `best_weight_version` 写入响应体（已在 contract.md §2 输出表中定义）。

## 6. 与 ClawHive 五层能力对齐

| ClawHive 能力层 | 现有 Flask API 映射 | Skill 包需要的改动 |
|---|---|---|
| 模型层 | `/api/session/start` + `/api/session/frame` 走 RTMPose + ST-GCN + YOLOv8n | 增加 `best_weight_id` 加载路径；新增 `/api/skill/init` 训练垂直模型 |
| 连接层 | （无） | 新增 `notify_url` 接收与 webhook 推送；预留飞书 / 钉钉 / 企微 / OA 适配器 |
| 安全层 | （无） | 接入租户权限隔离、最小数据回传、人工复核、全链路审计事件 |
| 知识层 | `/api/certifications.rule_version` 字段（已有雏形） | 把 `standard_id` 版本化为可配置 `PostureStandard` |
| 资产层 | （无） | 新增 `/api/skill/best_weights` 与 `/api/skill/retrain`；Best 权重按租户命名空间隔离 |