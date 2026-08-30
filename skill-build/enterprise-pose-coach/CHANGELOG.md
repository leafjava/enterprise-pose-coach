# Changelog · enterprise-pose-coach

本文件记录 `enterprise-pose-coach` Skill 包的版本变更。

## v1.1.0（2026-08-30）· 帝王蟹 ClawHive 企业级 Skill 大赛版

### 重大调整

- **删除 `references/asset-metadata.json`**：原机器可解析依赖声明散在 JSON 文件中，与 `contract.md` / `SKILL.md` 重复维护；改为在 `SKILL.md` 与 `contract.md` 中以 Markdown 表格集中声明。
- **SKILL.md 重构**：
  - 新增 §0「这是什么：AI 体能数字员工，不止是一个 Skill」——含 0.1 现场痛点 → 数字员工解法、0.2 ClawHive 五层能力对齐、0.3 核心金句（路演必说）；
  - 新增 §2「实时四层」——把实时监测 / 实时纠正 / 实时计数 / 实时反馈的输入来源与可视信号逐条钉死，回应"四实时是不是营销词"；
  - 新增附录 A「帝王蟹 ClawHive 大赛评审维度对照」——商业价值 / 创新性 / 技能包完整度 / 可复用稳定性 四维逐条映射；
  - 新增附录 B「关键演示金句」——一句话定位 + 三句收尾金句 + 现场痛点口播 + ClawHive 五层一句话；
  - 升级 frontmatter 的 `description`：从单段落改为多行 YAML，命中"靠人多 / 标准不一 / 事后无法复核 / 跟 HR 系统割裂"四大痛点 + "同一规则 / 自动计数 / 即时纠错 / 可解释复核 / 回写招聘台账"四大解法。

### contract.md 调整

- 新增 §0「业务定位与痛点」；
- §4 `inconclusive_reason` 取值表新增 `best_weight_missing`：后续调用传入的 `best_weight_id` 在企业私有推理环境找不到对应权重；
- §5 边界条款新增第 7 条「不得跨租户混用 Best 权重」；
- 新增 §8.5「与 ClawHive 五层能力对齐」；
- 新增 §9「实时四层契约」：每条实时的数据来源、用户可见信号、不可用降级三列。

### api-mapping.md 调整

- 新增 §0「业务定位与痛点对齐」；
- §3 接入步骤建议新增第 6 条「升级 Web Speech 反馈链路：第一次错误只显示在画面顶部，错误连续 3 次才触发语音，同义提示 1.5s 冷却」；
- §4 测试矩阵新增 3 条（故意做膝盖内扣 3 次 / 故意做偷快蹲 / Best 权重文件缺失）；
- 新增 §6「与 ClawHive 五层能力对齐���。

### examples/README.md 调整

- 新增 §4「演示场景对应（路演时怎么用）」：每个示例文件映射到分镜口播稿的具体镜头；
- 新增 §5「业务痛点 → 示例字段对应（评委提问预案）」：把评委可能关心的问题与示例字段对应起来。

### examples/* 字段确认

- `base-train-request.json` / `base-train-response.json`：首次调用训练 + 沉淀，含 `best_weight_id` 生成与 `metrics` / `artifact`；
- `input-request.json`：后续调用完整入参，绑定 `best_weight_id` + `retention_policy.raw_frames: "none"`；
- `output-pass.json` / `output-not-met.json` / `output-inconclusive.json`：三个决策状态枚举的完整响应体，**每个响应都包含 `best_weight_id` + `best_weight_version`**，便于审计可追溯。

### 命名变更

- 文件名 `asset-metadata.json` → 已删除；依赖声明集中到 `SKILL.md` 与 `contract.md`。
- 示例目录结构不变：`examples/base-train-*` / `examples/input-request.json` / `examples/output-*`。
- 参考文档结构不变：`references/contract.md` + `references/api-mapping.md`。

### 不向后兼容的变更

- `references/asset-metadata.json` 被删除；接入方若之前依赖该文件解析依赖，请改读 `SKILL.md` frontmatter 或 `contract.md` §8.5。

## v1.0.0（2026-08-29）· 初版上架

- 首次发布 `enterprise-pose-coach.zip`，含 SKILL.md + examples + references + prompts；
- 6 个契约示例覆盖首次调用（训练）+ 后续调用（复用）+ 三种决策状态；
- 含 `prompts/coach-feedback-system.txt`（Ollama 教练文案 prompt 模板）；
- 含 `references/asset-metadata.json`（机器可解析依赖声明）；
- 含 `references/contract.md` / `references/api-mapping.md`（契约与 API 映射）。