# MVP 验收标准

## 使用方式

首次运行：

```powershell
$env:PYTHON = "C:\path\to\python.exe"  # python 可直接使用时可省略
npm run install
npm run check
npm run demo
```

`npm run check` 是提交前唯一总闸门。真实摄像头/GPU 验收必须在目标演示机另行执行，因为 CI 的确定性替身不能证明模型精度。

## 自动验收

| ID | Given | When | Then | 命令/证据 | 当前状态 |
|---|---|---|---|---|---|
| AC-01 | Node 18+ 与 Python 3.10+ | 执行安装和检查 | 退出码为 0 | `npm run install`; `npm run check` | done |
| AC-02 | 无 GPU、摄像头、Ollama | 执行 Demo | JSON 含 `"status": "passed"` | `npm run demo` | done |
| AC-03 | Harness Flask 应用已加载 | 请求 `/`、`/coach`、`/certification` | 三个响应均为 200 | `test_smoke_flow.py` | done |
| AC-04 | 已创建深蹲会话 | 顺序输入底部与站立姿态 | `rep_count == 1` | `smoke_test.py` | done |
| AC-05 | 已完成一轮动作 | 停止会话 | 总结含次数、错误列表和下一重点 | `smoke_test.py` | done |
| AC-06 | 动作为 `burpee` | 创建会话 | HTTP 400 且响应含 `error` | `test_smoke_flow.py` | done |
| AC-07 | 认证次数为 50 | 写入后查询 | 新记录可查询，正式数据文件未改变 | 临时目录中的 smoke | done |
| AC-10 | 关键点无效 | 调用规则引擎 | 返回调整站位/需复核提示，不把技术失败记为体能未达标 | 现有 `test_live_coach.py` | done |
| AC-19 | 四阶段版本化深蹲模板 | 构建 Ghost Coach payload | 返回同阶段 COCO-17 目标骨架和标准版本 | `test_ghost_coach.py` | done |
| AC-20 | 深蹲出现三个已知错误 | 错误持续达到阈值 | 箭头方向正确、最多两个问题、稳定两帧后清除 | `test_ghost_coach.py` | done |
| AC-21 | 低置信度、无人或非支持动作 | 构建视觉提示 | 隐藏目标与箭头并返回明确降级原因 | `test_ghost_coach.py` | done |
| AC-22 | 训练页与认证页 | 使用 `ghost_demo` 打开固定状态 | Canvas、状态 DOM 与 error/correct/counted 一致 | `test_ghost_coach_dom.py` + 浏览器截图 | done |
| AC-23 | 其他动作的模板与 provider | 注入临时动作配置 | 无需修改渲染协议即可产生该动作方向提示 | `test_ghost_coach.py` | done |

## 产品接入后必须新增的自动验收

| ID | Given | When | Then | 计划测试 | 当前状态 |
|---|---|---|---|---|---|
| AC-09 | 相同 tenant 与 `Idempotency-Key` | 连续创建两次任务 | 返回同一 `task_id`，只有一条任务 | `test_skill_contract.py` | todo |
| AC-11 | 一次已完成训练 | 查询报告 | 包含标准、规则、模型、操作者和时间版本 | `test_report_audit.py` | todo |
| AC-13 | Webhook 签名错误或时间戳过期 | 请求 ClawHive 回调 | HTTP 401/403 且不改变数据 | `test_clawhive_webhook.py` | todo |
| AC-14 | 未授权主管查询其他租户报告 | 发起请求 | HTTP 403，审计记录不含敏感原文 | `test_tenant_scope.py` | todo |
| AC-15 | 模型超时/不可用 | 完成任务 | 返回可重试错误或降级结果，不返回伪造分数 | `test_provider_fallback.py` | todo |

## 人工验收

| ID | 检查项 | 通过条件 | 当前状态 |
|---|---|---|---|
| AC-08 | 真实模型演示机 | 冷启动加载权重，摄像头连续完成 1 次深蹲并正确计数 | todo（需目标硬件） |
| AC-12 | 筛选与合规表述 | 说明标准与岗位相关、低置信度/争议转人工、最终录用由授权人员决定；不声称医疗诊断 | todo（提交前复核） |
| AC-16 | 5 分钟路演 | 30 秒痛点、2 分钟真 Demo、1 分钟 ClawHive、1 分钟商业、30 秒收尾 | todo |
| AC-17 | 断网演示 | 核心姿态与规则链路继续运行；LLM 不可用有明确提示 | todo |
| AC-18 | 数据隔离 | Harness/彩排不写入正式认证数据，Demo 数据均为虚构 | done |
| AC-24 | Ghost Coach 五人可用性与舒适度 | 5 名真实参与者，覆盖静音/嘈杂；`npm run usability -- status` 返回 `passed` | todo（待真人参与） |

## Smoke 覆盖的主流程

```text
GET 首页/训练/认证页
        ↓
POST 创建深蹲会话
        ↓
POST 底部姿态 → POST 站立姿态
        ↓
有效计数 = 1
        ↓
POST 停止并生成总结
        ↓
POST 达标认证 → GET 查询认证
```

## 失败处理

- `npm run install` 找不到 Python：设置 `PYTHON` 为解释器绝对路径后重试。
- 端口 4000 被占用：harness 会自动选择可用端口并打印地址；也可显式设置，例如 `$env:PORT=4100; npm run dev`。
- 真实模型失败但 smoke 通过：不能宣称真实模型已验收；检查 PyTorch/CUDA/ONNX Runtime 与权重路径。
- smoke 失败：停止增加产品功能，先恢复 `npm run check`。
