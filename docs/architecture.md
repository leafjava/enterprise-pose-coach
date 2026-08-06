# 推荐技术栈与目录结构

## 架构决策

黑客松主链路继续使用已有 Flask Web，不迁移框架，不把早期 FastAPI 与 React Native 原型接入主 Demo。原因是现有认证页、固定 50 次深蹲检测、模型调用和会话 API 已经形成招聘体能筛选的最短可交付路径。第二阶段的岗位动作训练仍复用同一视觉内核，以薄适配层补齐企业能力。

## 推荐技术栈

| 层 | 48 小时选型 | 理由 | 赛后演进 |
|---|---|---|---|
| Web 与 Skill API | Python 3.11 + Flask 3 | 复用现有代码，减少集成风险 | 接口稳定后可拆为 FastAPI 服务 |
| 姿态估计 | RTMPose ONNX Runtime | 已有权重与代码，可本地推理 | 按终端选择 CPU/GPU provider |
| 动作分类 | PyTorch ST-GCN | 已有 11 类权重与训练证据 | 采集工业数据后再微调 |
| 规则引擎 | 现有 `LiveCoachEngine` + JSON 标准配置 | 判断可解释、可版本化、便于审计 | 建规则发布与回滚流程 |
| 前端 | 现有 Jinja + 原生 JS/Canvas | 摄像头链路已实现，无构建步骤 | 业务稳定后再组件化 |
| 数据 | MVP JSON 文件；需要并发时 SQLite | Demo 零运维 | 生产迁移 PostgreSQL/对象存储 |
| 企业连接 | ClawHive Skill/Webhook | 复用 IM、OA、权限、审计与知识库 | 增加飞书/企微等连接模板 |
| 测试 | Python `unittest` + Flask test client | 标准库、冷启动快 | 生产加入 pytest、契约与性能测试 |
| Harness | 根目录 package scripts + Node 调度器 | Windows/macOS/Linux 命令一致 | CI 直接复用同一命令 |

## 运行模式

| 模式 | 命令 | 使用场景 | 依赖 |
|---|---|---|---|
| Harness Demo | `npm run dev` | 评审、CI、无 GPU 机器 | Flask + NumPy |
| 自动 Smoke | `npm run demo` | 验证完整业务主流程 | Flask + NumPy |
| 真实模型 | `python web_app.py` | 正式演示机 | requirements + 匹配的 PyTorch/CUDA |

Harness Demo 通过启动脚本在进程内替换重型模型依赖，加载的仍是仓库现有 Flask 路由、模板和 `LiveCoachEngine`。它不会修改产品源代码，也不能作为真实模型精度证据；真实模型证据单独记录在 `docs/real-evidence.md`。

## 目录结构

```text
enterprise-pose-coach/
├── README.md
├── package.json                   # install/dev/test/check/demo
├── requirements-harness.txt       # 无 GPU 最小依赖
├── web_app.py                     # 现有产品入口，不由 harness 修改
├── src/                           # 现有视觉、训练与规则代码
├── templates/                     # 现有 Web 页面
├── model/                         # 模型权重
├── data/
│   └── demo/
│       └── enterprise_demo.json   # 脱敏且确定的主流程输入
├── docs/
│   ├── PRD.md
│   ├── architecture.md
│   ├── acceptance.md
│   └── tasks.md
├── tests/
│   └── harness/
│       ├── test_contracts.py
│       └── test_smoke_flow.py
└── tools/
    ├── harness.mjs                # 跨平台命令编排
    ├── harness_support.py         # 轻量依赖替身与确定性姿态
    ├── dev_server.py              # 无 GPU 开发/评审服务器
    ├── smoke_test.py              # 端到端 smoke
    └── check_docs.py              # 文档与 seed 契约检查
```

## 拟新增产品模块（仅设计，不在本次文档/Harness 改动中实现）

```text
src/
├── skill_contracts.py             # ClawHive 输入输出 schema
├── posture_standards.py           # 招聘体能/岗位规则加载、校验与版本
├── audit.py                       # 结构化只追加审计事件
└── clawhive_adapter.py            # 签名、幂等、回调与错误映射
config/
└── posture_standards/
    ├── recruit_squat_50_v1.json
    └── safe_lift_v1.json           # 第二阶段
```

任何产品模块落地时必须先在 `docs/acceptance.md` 增加可自动化验收，再增加测试；未被 harness 覆盖的新增功能不进入现场 Demo 主路径。
