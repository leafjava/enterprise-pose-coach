---
name: enterprise-pose-coach
description: 面向企业招聘、转岗与在岗训练的 AI 体能/动作评估 Skill。接收标准化的招聘检测请求，调用本地 RTMPose + ST-GCN + 专项规则引擎完成候选人摄像头动作的自动计数、动作有效性判断、Top 错误汇总与达标/未达标结论，并把结构化结果回写给 ClawHive 编排层。适用于工厂、仓储与服务业的批量招聘体能初筛、入职前标准化动作验收，以及 EHS 在岗动作合规复训。
allowed-tools:
  - python.exec
  - file.read
  - webhook.notify
  - data.write
  - audit.emit
---

# Enterprise Pose Coach · 企业级实时姿态评估 Skill

## 1. 这是一个什么样的 Skill

`enterprise-pose-coach` 是一个面向企业场景的视觉 Skill，主链路为：

```text
ClawHive 编排层发起招聘/转岗/在岗训练任务
        ↓
Skill 接收标准输入（见 §3）
        ↓
浏览器/移动端推流 → RTMPose 关键点 → ST-GCN 动作分类
        ↓
专项规则引擎：完整动作周期计数 + 错误去抖 + 语音冷却
        ↓
结构化评估报告（decision / valid_rep_count / top_errors / model_version / rule_version）
        ↓
Webhook 回写或数据落库，供 HR / EHS 复核
```

第一阶段切入点是**招聘/转岗体能筛选**：自动计数、动作有效性判断、达标认证与人工复核闭环。
第二阶段为**在岗动作合规与工效风险训练**：复用同一引擎，叠加 EHS 专家确认的岗位标准。

## 2. 何时调用本 Skill

| 触发场景 | 标准 | 输入动作 |
|---|---|---|
| 招聘高峰批量体能初筛 | `RECRUIT_*_V1`（如 `RECRUIT_SQUAT_50_V1`） | squats / pushups / situps |
| 入职前标准化动作验收 | `ONBOARD_*_V1` | squats / lunges / pushups |
| 在岗安全搬运姿势复训 | `SAFE_LIFT_V1`（代理动作：深蹲） | squats |
| 工间恢复训练 | `WELLNESS_*_V1` | squats / shoulder_press |

下列场景**不要**调用本 Skill（避免越权与误导）：

- 疾病诊断、康复处方、伤病预测
- 与岗位无关的体能项目（如以健身塑形为目的）
- 单帧静态姿势判断（仅支持完整动作周期评估）
- 不提供摄像头权限的远程候选人

## 3. 输入契约（Input）

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `request_id` | string | 是 | 幂等请求 ID，防止重复创建任务 |
| `tenant_id` | string | 是 | 企业租户标识 |
| `batch_id` | string | 否 | 招聘/转岗批次 |
| `assignee_id` | string | 是 | 候选人临时 ID 或员工内部 ID |
| `standard_id` | string | 是 | 如 `RECRUIT_SQUAT_50_V1` |
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
| 姿态估计 | RTMPose ONNX | COCO 17 关键点 |
| 动作分类 | PyTorch ST-GCN | 48 帧窗口、11 类动作 |
| 辅助检测 | YOLOv8n | 仓库内含本地权重 |
| 规则引擎 | NumPy + 可解释几何规则 | 6 类专项 + 5 类通用 |
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

## 8. 资产清单

Skill 包内：

- `prompts/coach-feedback-system.txt`：本地生成式教练反馈的系统提示词模板
- `examples/`：四组契约示例（输入 1 + 输出 3）
- `references/asset-metadata.json`：API 资产依赖声明（ClawHive 解析）
- `references/contract.md`：完整契约字段表与边界条款
- `references/api-mapping.md`：本 Skill 字段与仓库现有 `/api/session/*` 的映射

Skill 包外（仓库内，**不在 ZIP 内**）：

- 真实模型权重（`model/*.onnx`、`model/*.pth`、`yolov8n.pt`）— 部署时挂载
- `src/` 推理与规则引擎源码
- `web_app.py` Flask Web 与会话管理
- `data/demo/enterprise_demo.json` 脱敏 Demo 种子数据

## 9. 复用建议

新接入方使用本 Skill 时，推荐按下列顺序验证：

1. 用 `examples/input-request.json` 跑通一次端到端，确认 `decision: pass`。
2. 用 `examples/output-inconclusive.json` 模拟摄像头权限被拒，确认回写路径。
3. 参考 `references/contract.md` 接入真实租户与批次。
4. 上线前阅读仓库 `docs/acceptance.md` 完成所有 P0 自动验收。
