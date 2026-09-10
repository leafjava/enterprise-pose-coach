# 真实性证据 —— 这不是一个纯演示

> 本项目内置**真实可运行的本地 AI 模型**。以下证据全部在本机可当场复现，
> 评审可打开页面、核对模型文件、查看 GPU 推理日志，无需信任任何口头承诺。

---

## 一、模型权重（仓库内已提交）

| 文件 | 大小 | 用途 |
|---|---|---|
| `model/mmfit_pose11cls_stride48_best.pth` | ~700 KB | ST-GCN 健身动作分类权重（11 类，真实训练产出） |
| `model/best_model_7_exchange_val_and_test.pth` | ~700 KB | ST-GCN 动作分类权重（`web_app.py` 默认加载） |
| `model/rtmo-s_8xb32-600e_body7-640x640-dac2bf74_20231211.onnx` | ~39.6 MB | RTMPose 人体关键点检测（ONNX Runtime） |
| `model/TRA_confusion_matrix.png` / `model/VAL_confusion_matrix.png` | — | **遗留 15 类模型**的混淆矩阵，非 11 类 MM-Fit 权重的结果 |

## 二、真实训练数据（MM-Fit）

- **11 类动作**：深蹲 / 弓步 / 俯卧撑 / 哑铃肩推 / 哑铃划船 / 仰卧起坐 / 肱三头肌屈伸 / 二头弯举 / 侧平举 / 开合跳 / 其他
- **21 名受试者**真实采集（MM-Fit 公开数据集；原始 bundle 体积较大，未随仓库提交，可现场提供下载）
- **训练集 8898 个样本窗口**，shape `(8898, 2, 48, 17)`；导出目录 `tools/mmfit_pose_11cls_stride48` 未随仓库提交，由导出脚本重建
- 17 关节 COCO 风格布局，与 webcam 姿态输入格式一致
- 详细训练与数据说明：`docs/mmfit-retrain-summary-2026-05-29.md`

## 三、混淆矩阵与评估口径（必须照此表述）

仓库里的混淆矩阵图（`model/TRA_confusion_matrix.png`、`model/VAL_confusion_matrix.png`、`static/validation_confusion_matrix.png`、`doc/*.png`）**全部属于遗留的 15 类模型**（`best_model_7_exchange_val_and_test.pth`，八段锦／五禽戏分类），**不是 11 类 MM-Fit 权重的评估结果**。

因此：

- **不要**把这些图当作 11 类动作识别的精度证据展示；首页已移除该图，改为可逐条核对的证据台账。
- `model/VAL_confusion_matrix.png` 与 `model/model7Test_confusion_matrix.png` 内容完全相同（md5 一致），说明该模型的验证集与测试集未分离。
- 11 类权重目前**没有**对应的混淆矩阵产出。需要时用 `src/test.py` 对 `mmfit_pose11cls_stride48_best.pth` 重新生成。

评估划分的已知局限：`src/train.py` 使用 `train_test_split(test_size=0.1)` 对**滑窗**随机划分，同一受试者的相邻窗口会同时落入训练集与验证集，属于数据泄漏；且 best checkpoint 按验证集选取、没有独立测试集。**因此 93.15% 是选模指标，不是泛化估计，对外不得表述为现场准确率。** 上台前应补一次 leave-subjects-out（如 17 人训练 / 4 人验证）并使用那个更低的数字。

## 四、本地 GPU 推理（可复现）

```powershell
venv\Scripts\python -c "import torch; print(torch.__version__, torch.cuda.is_available())"
```

实测输出：

```
torch 2.11.0+cu128 | CUDA: True | device: NVIDIA GeForce RTX 5070 Ti Laptop GPU
```

启动模型层服务的真实日志：

```
使用 cuda 加载模型
准备加载模型权重: model/best_model_7_exchange_val_and_test.pth
加载模型权重成功
已加载 MM-Fit 健身识别权重: model\mmfit_pose11cls_stride48_best.pth
 * Running on all addresses (0.0.0.0)
 * Running on http://127.0.0.1:4000
```

## 五、实时功能可验证入口

| 入口 | 验证点 |
|---|---|
| `http://127.0.0.1:4000/` | 首页（REAL ENGINE 区块 + 证据台账） |
| `http://127.0.0.1:4000/coach` | 实时深蹲 / 俯卧撑等纠错 + 自动计数（摄像头） |
| `http://127.0.0.1:4000/certification` | 体能检测：50 次达标 → 生成证书 → 下载 / 分享 |
| `POST/GET /api/certifications` | 认证记录持久化（`data/certifications.json`） |
| `POST /api/session/start → frame → stop` | 实时姿态推理会话全链路 |

## 六、结论

模型权重、训练日志、GPU 推理日志和 23 项自动化测试**全部本机可当场验证**，
不依赖任何云端 API、无 mock 数据、无占位地址。

同时明确两条尚未成立的事项，不在路演中回避：

1. 11 类权重的混淆矩阵尚未产出，仓库内现有矩阵图属于遗留的 15 类模型；
2. 离线准确率的验证划分非按受试者切分，因此不能作为企业现场精度。

真实的技术资产是**本地可复现的推理链路 + 可解释的版本化规则**，不是任何单一的准确率数字。
