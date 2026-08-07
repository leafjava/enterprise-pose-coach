# MVP 任务清单

状态只使用 `done` 与 `todo`。`done` 表示仓库中已有实现或本轮已经加入且可由 harness 验证；设计稿、计划、README 声明和局部原型不能算作产品功能完成。

优先级定义：

- `P0`：黑客松主 Demo 和验收闭环必需；
- `P1`：显著增强产品表达，但主流程不稳定时可以砍掉；
- `P2`：赛后产品化事项，不进入 48 小时主路径。

## 产品定义与企业标准

| ID | 优先级 | 小任务 | 状态 | 证据/完成条件 |
|---|---|---|---|---|
| T-001 | P0 | 明确一句话、ICP、核心痛点与不做边界 | done | `docs/PRD.md` |
| T-002 | P0 | 确定“招聘体能筛选切入、在岗动作训练扩张”的双阶段路线 | done | `docs/PRD.md`；现有功能未改 |
| T-020 | P0 | 创建 `RECRUIT_SQUAT_50_V1` 招聘标准配置与 schema | todo | 先写配置校验测试；标准须岗位相关、版本化、可回滚 |

## Harness 与质量门禁

| ID | 优先级 | 小任务 | 状态 | 证据/完成条件 |
|---|---|---|---|---|
| T-003 | P0 | 提供 `install/dev/test/check/demo` 统一命令 | done | 根目录 `package.json` |
| T-004 | P0 | 建立无 GPU 最小测试框架 | done | `tests/harness/`，Python `unittest` |
| T-005 | P0 | 建立主流程端到端 smoke | done | `tools/smoke_test.py` |
| T-006 | P0 | 提供脱敏 seed/demo 数据 | done | `data/demo/enterprise_demo.json` |
| T-007 | P0 | 建立验收标准与任务状态文档 | done | `docs/acceptance.md`、本文件 |

## Web 页面与用户流程

| ID | 优先级 | 小任务 | 状态 | 证据/完成条件 |
|---|---|---|---|---|
| T-008 | P0 | 产品首页 `/` | done | `templates/home.html`、smoke HTTP 200 |
| T-009 | P0 | 实时训练页 `/coach` | done | `templates/index.html`、smoke HTTP 200 |
| T-010 | P0 | 认证页 `/certification` | done | `templates/certification.html`、smoke HTTP 200 |
| T-032 | P0 | 训练/认证页展示任务名称、批次、标准、目标次数与数据用途 | todo | Skill 契约稳定后实现；主流程不超过 5 次点击 |
| T-033 | P1 | 招聘批次最小汇总页 | todo | 展示完成、达标、未达标、需复核人数；主流程不稳时砍掉 |

## 视觉模型与数据

| ID | 优先级 | 小任务 | 状态 | 证据/完成条件 |
|---|---|---|---|---|
| T-011 | P0 | RTMPose 关键点提取代码与 ONNX 权重 | done | `src/rtmpose_tran.py`、`model/*.onnx` |
| T-012 | P0 | ST-GCN 动作分类代码与 11 类权重 | done | `src/fitness_infer.py`、`model/mmfit_pose11cls_stride48_best.pth` |
| T-029 | P0 | 真实演示机 GPU 冷启动与 10 分钟运行测试 | todo | 记录硬件、FPS、失败率和模型加载时间，不凭空写数字 |
| T-030 | P0 | 建立光线、距离、机位、遮挡与动作节奏测试矩阵 | todo | 每项保存计数结果、需复核率和已知限制 |
| T-031 | P1 | 先做招聘考场计数一致性测试，再采集安全搬运小样本请 EHS 标注 | todo | 第一、第二阶段分别报告，禁止混报精度 |

## 动作规则、计数与反馈

| ID | 优先级 | 小任务 | 状态 | 证据/完成条件 |
|---|---|---|---|---|
| T-013 | P0 | 深蹲、弓步、俯卧撑、肩推、划船、弯举专项规则 | done | `src/live_coach.py`、现有单元测试 |
| T-014 | P1 | 其他 5 类动作通用反馈 | done | `GENERIC_EXERCISES` |
| T-016 | P0 | 去抖、语音冷却、错误 Top3 与下一重点 | done | `LiveCoachEngine`、现有测试 |
| T-018 | P1 | Ollama 本地生成教练反馈与故障提示 | done | `src/local_llm.py`、`generate_feedback`；LLM 不影响核心判断 |

## Ghost Coach 视觉纠正场

目标：在摄像头画面中以实线显示员工当前骨架，以半透明虚线显示同阶段、按人体比例对齐的目标骨架，再用低频闪烁的方向箭头指出最重要的修正方向。MVP 只覆盖深蹲，不做真正的 3D AR，也不一次显示超过两个纠正箭头。

| ID | 优先级 | 小任务 | 状态 | 证据/完成条件 |
|---|---|---|---|---|
| T-039 | P0 | 冻结 Ghost Coach 视觉规范 | done | `docs/ghost-coach-design.md`：颜色、线型、透明度、频率、出现/消失与降级规范 |
| T-040 | P0 | 盘点并筛选深蹲标准姿态数据 | done | 已审计既有 NPY；不冒充深蹲标准，采用注明来源/边界的项目自有合成工程模板 |
| T-041 | P0 | 建立深蹲分阶段目标模板 | done | `config/posture_standards/recruit_squat_50_v1.json`：4 阶段、COCO-17、版本号 |
| T-042 | P0 | 实现目标姿势人体比例对齐 | done | `align_template_to_pose`：髋锚点、多身体尺度、异常比例限制与左右镜像测试 |
| T-043 | P0 | 绘制当前姿势实线骨架与节点 | done | `static/ghost-coach.js`：绿/黄/红/灰实线和节点；训练页与认证页浏览器验收通过 |
| T-044 | P0 | 绘制半透明虚线目标骨架 | done | 阶段模板经人体比例对齐后先绘制青色 8/7 虚线；Canvas cover 映射通过浏览器验收 |
| T-045 | P0 | 实现深蹲三类方向箭头 | done | 膝向外、髋向下、胸口向上/回正的方向测试通过 |
| T-046 | P0 | 建立视觉提示优先级、平滑与迟滞机制 | done | EMA 平滑、严重度排序、最多 2 个问题、连续 2 帧出现/清除均有测试 |
| T-047 | P0 | 实现置信度、遮挡与无人入镜降级 | done | 核心/腿部关节置信度门禁；无人、低置信度与对齐失败均隐藏目标和箭头 |
| T-048 | P0 | 为 Ghost Coach 增加可自动验证的几何测试 | done | `tests/harness/test_ghost_coach.py`：模板、对齐、镜像、箭头、迟滞、降级、扩展共 9 项 |
| T-049 | P0 | 增加 Ghost Coach Demo smoke 与视觉验收 | done | `npm run demo` 验证 API/计数/COCO-17；两页查询 Demo 的 error/correct/counted DOM、截图和控制台均通过 |
| T-050 | P1 | 做可理解性与视觉舒适度测试 | todo | `npm run usability -- status` 会验证匿名 5 人、静音/嘈杂、理解率、疲劳与舒适度；当前 0/5，必须真人完成 |
| T-051 | P2 | 抽象其他动作的目标模板与箭头接口 | done | `CorrectionGuideProvider` + 可注入版本化配置；测试用安全搬运代理配置验证扩展契约 |

## 会话、认证与报告

| ID | 优先级 | 小任务 | 状态 | 证据/完成条件 |
|---|---|---|---|---|
| T-015 | P0 | 开始、逐帧、停止 API | done | `/api/session/*`、smoke |
| T-017 | P0 | 达标认证写入与查询 | done | `/api/certifications`、smoke 临时数据 |
| T-021 | P0 | 会话绑定 `batch_id/task_id/standard_id/target_reps` | todo | 保留 50 次 Demo，同时支持标准配置和幂等任务 |
| T-022 | P0 | 报告加入 `decision/model_version/rule_version/request_id` | todo | 对应 AC-11；技术失败必须是 `inconclusive` |

## ClawHive 与企业系统连接

| ID | 优先级 | 小任务 | 状态 | 证据/完成条件 |
|---|---|---|---|---|
| T-023 | P0 | 确认官方 Skill 包规范、认证和回调方式 | todo | 获得比赛平台文档或测试租户后记录确定契约 |
| T-024 | P0 | 实现任务创建与结果通知最小连接 | todo | 只做一个“创建招聘检测→完成→通知 HR”闭环 |
| T-025 | P0 | 实现幂等键、签名校验、防重放和错误映射 | todo | 对应 AC-09、AC-13；重复请求不重复建任务 |

## 安全、隐私与审计

| ID | 优先级 | 小任务 | 状态 | 证据/完成条件 |
|---|---|---|---|---|
| T-026 | P0 | 租户隔离与角色权限 | todo | 优先复用 ClawHive 权限，不自建复杂 IAM |
| T-027 | P0 | 结构化审计事件与留存策略 | todo | 不记录密钥、无必要的原始帧和完整健康信息 |
| T-028 | P0 | 候选人摄像头用途、留存、重试与人工复核说明 | todo | 增加最小告知；不得暗采集；技术失败不计为未达标 |

## 证据、商业验证与路演

| ID | 优先级 | 小任务 | 状态 | 证据/完成条件 |
|---|---|---|---|---|
| T-019 | P0 | 模型权重、样本规模、混淆矩阵证据文档 | done | `docs/real-evidence.md` |
| T-034 | P0 | 访谈 5 名招聘负责人，并补访 EHS/用工合规 | todo | 验证项目真实性、规模、预算、流程和采购阻力 |
| T-035 | P1 | 建立每百人考官工时 ROI 模板与在岗扩展模型 | todo | 只使用客户输入的人工时长与成本，不编造降本比例 |
| T-036 | P0 | 制作 5 分钟 Demo 视频与 PPT | todo | 展示招聘主闭环、Ghost Coach WOW Moment、ClawHive 和扩展商业价值 |

## 赛后架构与暂缓事项

| ID | 优先级 | 小任务 | 状态 | 证据/完成条件 |
|---|---|---|---|---|
| T-037 | P2 | 将 FastAPI backend 接入主链路 | todo | 黑客松期间不做；赛后按并发和团队边界决策 |
| T-038 | P2 | 将 React Native app 接入主链路 | todo | 黑客松期间不做；Web 已满足摄像头主 Demo |

## 48 小时执行顺序

第一优先级是跑通“招聘检测 + Ghost Coach + 结构化结果”的现场闭环：

```text
T-020 招聘标准
  → T-039～T-041 视觉规范与目标模板
  → T-042～T-047 对齐、绘制、箭头与降级
  → T-048～T-049 自动测试与视觉验收
  → T-021～T-022 任务绑定与报告契约
  → T-023～T-025 ClawHive 最小连接
  → T-032 页面任务信息
  → T-029～T-030 演示机与环境稳定性
  → T-036 视频、PPT 与离线备份
```

如果时间不足，按顺序砍掉 `T-050` 用户测试扩展、`T-033` 批次看板和所有 `P2` 任务；不得砍掉 `T-047` 置信度降级、`T-048` 自动测试或人工复核边界。`SAFE_LIFT_V1` 只作为第二阶段扩展故事，不抢占招聘深蹲与 Ghost Coach 主 Demo 的 P0 时间。
