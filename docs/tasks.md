# MVP 任务清单

状态只使用 `done` 与 `todo`。`done` 表示仓库中已有实现或本轮已经加入且可由 harness 验证；不把设计稿、计划或 README 声明当成产品实现。

| ID | 模块 | 小任务 | 状态 | 证据/下一步 |
|---|---|---|---|---|
| T-001 | 产品 | 明确一句话、ICP、核心痛点与不做边界 | done | `docs/PRD.md` |
| T-002 | 产品 | 确定“招聘体能筛选切入、在岗动作训练扩张”的双阶段路线 | done | `docs/PRD.md`；现有功能未改 |
| T-003 | Harness | 提供 install/dev/test/check/demo 统一命令 | done | 根目录 `package.json` |
| T-004 | Harness | 无 GPU 最小测试框架 | done | `tests/harness/`，Python unittest |
| T-005 | Harness | 主流程端到端 smoke | done | `tools/smoke_test.py` |
| T-006 | Harness | 脱敏 seed/demo 数据 | done | `data/demo/enterprise_demo.json` |
| T-007 | Harness | 验收标准与任务状态文档 | done | `docs/acceptance.md`、本文件 |
| T-008 | Web | 产品首页 `/` | done | `templates/home.html`、smoke HTTP 200 |
| T-009 | Web | 实时训练页 `/coach` | done | `templates/index.html`、smoke HTTP 200 |
| T-010 | Web | 认证页 `/certification` | done | `templates/certification.html`、smoke HTTP 200 |
| T-011 | 视觉 | RTMPose 关键点提取代码与 ONNX 权重 | done | `src/rtmpose_tran.py`、`model/*.onnx` |
| T-012 | 视觉 | ST-GCN 动作分类代码与 11 类权重 | done | `src/fitness_infer.py`、`model/mmfit_pose11cls_stride48_best.pth` |
| T-013 | 规则 | 深蹲、弓步、俯卧撑、肩推、划船、弯举专项规则 | done | `src/live_coach.py`、现有单元测试 |
| T-014 | 规则 | 其他 5 类动作通用反馈 | done | `GENERIC_EXERCISES` |
| T-015 | 会话 | 开始、逐帧、停止 API | done | `/api/session/*`、smoke |
| T-016 | 反馈 | 去抖、语音冷却、错误 Top3 与下一重点 | done | `LiveCoachEngine`、现有测试 |
| T-017 | 认证 | 达标认证写入与查询 | done | `/api/certifications`、smoke 临时数据 |
| T-018 | AI | Ollama 本地生成教练反馈与故障提示 | done | `src/local_llm.py`、`generate_feedback` |
| T-019 | 证据 | 模型权重、样本规模、混淆矩阵证据文档 | done | `docs/real-evidence.md` |
| T-020 | 产品 | 创建 `RECRUIT_SQUAT_50_V1` 招聘标准配置与 schema | todo | 先写配置校验测试，再实现；标准须岗位相关 |
| T-021 | 产品 | 会话绑定 `batch_id/task_id/standard_id/target_reps` | todo | 保留 50 次 Demo，同时支持企业配置 |
| T-022 | 产品 | 报告加入 `decision/model_version/rule_version/request_id` | todo | 对应 AC-11 |
| T-023 | ClawHive | 确认官方 Skill 包规范、认证和回调方式 | todo | 获得比赛平台文档/测试租户后执行 |
| T-024 | ClawHive | 实现任务创建与结果通知最小连接 | todo | 只做一个主流程连接 |
| T-025 | ClawHive | 幂等键、签名校验、防重放和错误映射 | todo | 对应 AC-09、AC-13 |
| T-026 | 安全 | 租户隔离与角色权限 | todo | 优先复用 ClawHive 权限，不自建复杂 IAM |
| T-027 | 安全 | 结构化审计事件与留存策略 | todo | 不记录密钥、原始帧和完整健康信息 |
| T-028 | 隐私 | 候选人摄像头用途、留存、重试与人工复核说明 | todo | 复用现有页增加最小告知，不做暗采集 |
| T-029 | 稳定性 | 真实演示机 GPU 冷启动与 10 分钟运行测试 | todo | 记录硬件、FPS、失败率，不凭空写数字 |
| T-030 | 稳定性 | 光线、距离、侧面、遮挡测试矩阵 | todo | 每项保存结果与已知限制 |
| T-031 | 数据 | 先做招聘考场计数一致性测试，再采集安全搬运小样本请 EHS 标注 | todo | 分别验证第一、第二阶段；不得混报精度 |
| T-032 | 页面 | 训练页展示任务名称、岗位标准、目标次数与数据用途 | todo | 只在 Skill 契约稳定后改页面 |
| T-033 | 页面 | 招聘批次最小汇总页 | todo | P1；主流程不稳时直接砍掉 |
| T-034 | 商业 | 访谈 5 名招聘负责人，并补访 EHS/用工合规 | todo | 验证项目真实性、规模、预算和采购阻力 |
| T-035 | 商业 | 建立每百人考官工时 ROI 模板与在岗扩展模型 | todo | 只使用客户输入的人工时长与成本 |
| T-036 | 路演 | 5 分钟 Demo 视频与 PPT | todo | 按 AC-16 彩排并准备离线备份 |
| T-037 | 架构 | 将 FastAPI backend 接入主链路 | todo | 黑客松期间不做；赛后按并发需求决策 |
| T-038 | 移动端 | 将 React Native app 接入主链路 | todo | 黑客松期间不做；Web 已满足摄像头 Demo |

## 48 小时执行顺序

严格按 `T-020 → T-021 → T-022 → T-023 → T-025 → T-032 → T-029 → T-036` 推进。`SAFE_LIFT_V1` 只作为第二阶段扩展故事；T-033、T-037、T-038 不进入 48 小时主计划。
