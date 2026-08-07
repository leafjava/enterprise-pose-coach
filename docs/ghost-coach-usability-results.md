# Ghost Coach 五人可用性测试记录

> 状态：待真实参与者测试。不得用自动测试、开发者自测或 AI 角色扮演冒充真人反馈。

## 可运行录入与验收

先启动 `npm run dev`，让参与者分别比较 A/B 两种方式。可用固定视觉场景 `/coach?ghost_demo=error` 解释任务，但修正成功与舒适度必须来自参与者实际观察，不能由主持人代填。

每完成一名参与者，使用匿名代码录入；以下数值只展示命令格式，必须替换为现场观察值：

```powershell
npm run usability -- record `
  --participant P01 `
  --environment silent `
  --understanding-text 8 `
  --understanding-visual 3 `
  --corrected-text yes `
  --corrected-visual yes `
  --arrows-understood yes `
  --occlusion no `
  --visual-fatigue no `
  --pulse-comfort 4 `
  --notes "现场匿名观察摘要"
```

完成后验证：

```powershell
npm run usability -- status
```

5 人完成前该命令故意返回非零退出码和 `incomplete`。通过门槛为：至少 5 个唯一匿名参与者、至少一个静音和一个嘈杂场景、箭头理解率不低于 80%、无人报告视觉疲劳、脉冲舒适度中位数不低于 4/5。若不通过，应先调整视觉规范再复测，不得改写反馈。

## 测试环境

- 版本/Commit：
- 设备与浏览器：
- 摄像头机位：
- 光线与背景：
- 动作：深蹲
- A 方案：文字 + 语音
- B 方案：实线当前骨架 + 虚线目标骨架 + 方向箭头

## 参与者记录

| 参与者 | 场景（安静/嘈杂/静音） | 首次理解时间 A/B | 修正成功 A/B | 箭头可理解 | 遮挡 | 视觉疲劳 | 备注 |
|---|---|---|---|---|---|---|---|
| P01 | | | | | | | |
| P02 | | | | | | | |
| P03 | | | | | | | |
| P04 | | | | | | | |
| P05 | | | | | | | |

## 结论与修改

- 是否所有参与者都理解三个方向提示：
- 是否有人报告闪烁不适：
- 是否需要降低线条/箭头密度：
- 修改项与负责人：
- T-050 最终状态：`todo`

原始匿名结构化记录位于 `data/usability/ghost-coach-study.json`，只允许匿名代码，不录入姓名、工号或人脸数据。
