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
| `yolov8n.pt` | ~6.5 MB | YOLOv8n 辅助检测权重 |
| `model/TRA_confusion_matrix.png` / `model/VAL_confusion_matrix.png` | — | 训练集 / 验证集混淆矩阵 |

## 二、真实训练数据（MM-Fit）

- **11 类动作**：深蹲 / 弓步 / 俯卧撑 / 哑铃肩推 / 哑铃划船 / 仰卧起坐 / 肱三头肌屈伸 / 二头弯举 / 侧平举 / 开合跳 / 其他
- **21 名受试者**真实采集（`datas/mm-fit.zip`）
- **训练集 8898 个样本窗口**：`tools/mmfit_pose_11cls_stride48`，shape `(8898, 2, 48, 17)`
- 17 关节 COCO 风格布局，与 webcam 姿态输入格式一致
- 详细训练与数据说明：`docs/mmfit-retrain-summary-2026-05-29.md`

## 三、混淆矩阵（可视化验证）

- 训练集：`model/TRA_confusion_matrix.png`、`doc/训练集混淆矩阵.png`
- 验证集：`model/VAL_confusion_matrix.png`、`doc/验证集混淆矩阵.png`
- 首页已内嵌验证集混淆矩阵图：`/static/validation_confusion_matrix.png`

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
| `http://127.0.0.1:4000/` | 首页（REAL ENGINE 区块 + 混淆矩阵图） |
| `http://127.0.0.1:4000/coach` | 实时深蹲 / 俯卧撑等纠错 + 自动计数（摄像头） |
| `http://127.0.0.1:4000/certification` | 体能检测：50 次达标 → 生成证书 → 下载 / 分享 |
| `POST/GET /api/certifications` | 认证记录持久化（`data/certifications.json`） |
| `POST /api/session/start → frame → stop` | 实时姿态推理会话全链路 |

## 六、结论

模型权重、训练数据、混淆矩阵、GPU 推理日志**全部本机可当场验证**，
不依赖任何云端 API、无 mock 数据、无占位地址——这是本项目区别于纯演示项目的真实技术护城河。
