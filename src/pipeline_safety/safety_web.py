"""流水线高危作业的 Flask 视图层。

把 lian_le_ma2 中 FastAPI 实现的路由重写成 Flask Blueprint，便于嵌入到 lian_le_ma 现有的 Flask 应用中。
URL 前缀：/safety
- 页面：/safety/  /safety/monitor  /safety/events  /safety/snapshots/<file>
- API： /safety/api/health  /safety/api/config  /safety/api/events  /safety/api/summary
       /safety/api/events/<id>/acknowledge
模板：lian_le_ma/templates/safety/
静态资源由 lian_le_ma/web_app.py 挂载到 /static/safety/
"""

from __future__ import annotations

import logging
import threading
import time
from pathlib import Path
from typing import Any, Optional

from flask import (
    Blueprint,
    Flask,
    abort,
    jsonify,
    render_template,
    request,
    send_from_directory,
)

from . import __version__
from .events import EventStore
from .monitor import SafetyMonitor

LOGGER = logging.getLogger(__name__)

URL_PREFIX = "/safety"
TEMPLATE_SUBDIR = "safety"


def create_blueprint(config: dict[str, Any]) -> Blueprint:
    """根据已加载的安全监测配置构造一个 Flask Blueprint。

    参数:
        config: 通过 ``pipeline_safety.config.load_config`` 加载的 dict。
    """
    store = EventStore(str(config["alerts"]["database"]))
    snapshot_root = Path(str(config["alerts"]["snapshot_directory"])).resolve()
    camera_cfg = config.get("camera", {})
    ppe_cfg = config.get("ppe_model", {})
    rules_cfg = config.get("rules", [])

    # 懒加载单例：第一次 /safety/api/frame 命中时才把 YOLO 模型载入内存。
    monitor_state: dict[str, Any] = {"instance": None, "lock": threading.Lock(), "last_error": None}

    def _get_monitor() -> Optional[SafetyMonitor]:
        if monitor_state["instance"] is not None:
            return monitor_state["instance"]
        with monitor_state["lock"]:
            if monitor_state["instance"] is not None:
                return monitor_state["instance"]
            try:
                # preview=False：不要 cv2.imshow（无桌面 / Flask 后台跑）
                monitor_state["instance"] = SafetyMonitor(config, preview=False)
                LOGGER.info("流水线高危作业 · 推理引擎已初始化（网页摄像头链路）")
            except Exception as exc:  # noqa: BLE001
                monitor_state["last_error"] = repr(exc)
                LOGGER.exception("推理引擎初始化失败：%s", exc)
        return monitor_state["instance"]

    bp = Blueprint(
        "pipeline_safety",
        __name__,
        url_prefix=URL_PREFIX,
    )

    # ───────────── 页面路由 ─────────────
    @bp.route("/", methods=["GET"])
    def home():
        return render_template(
            f"{TEMPLATE_SUBDIR}/home.html",
            app_name="流水线高危作业",
            app_subtitle="姿态监测与实时语音预警 MVP",
            version=__version__,
            camera_name=camera_cfg.get("name", "未命名工位"),
            ppe_enabled=bool(ppe_cfg.get("enabled", False)),
            ppe_weights=Path(str(ppe_cfg.get("weights", ""))).name if ppe_cfg.get("weights") else "—",
            rules_count=sum(1 for rule in rules_cfg if rule.get("enabled", True)),
            rules_total=len(rules_cfg),
        )

    @bp.route("/monitor", methods=["GET"])
    def monitor():
        return render_template(
            f"{TEMPLATE_SUBDIR}/monitor.html",
            app_name="流水线高危作业",
            version=__version__,
            camera_name=camera_cfg.get("name", "未命名工位"),
            source_label=_format_source(camera_cfg.get("source", "—")),
            alerts_voice=bool(config.get("alerts", {}).get("voice_enabled", True)),
            alerts_save_snapshots=bool(config.get("alerts", {}).get("save_snapshots", True)),
            rules_active=[
                {
                    "id": rule.get("id", ""),
                    "name": rule.get("name", rule.get("id", "")),
                    "type": rule.get("type", ""),
                    "severity": rule.get("severity", "medium"),
                    "duration": rule.get("duration_seconds", 0.0),
                    "cooldown": rule.get("cooldown_seconds", 0.0),
                }
                for rule in rules_cfg
                if rule.get("enabled", True)
            ],
        )

    @bp.route("/events", methods=["GET"])
    def events_page():
        return render_template(
            f"{TEMPLATE_SUBDIR}/events.html",
            app_name="流水线高危作业",
            version=__version__,
            camera_name=camera_cfg.get("name", "未命名工位"),
        )

    # ───────────── JSON API ─────────────
    @bp.route("/api/health", methods=["GET"])
    def health():
        return jsonify({"status": "ok", "version": __version__})

    @bp.route("/api/config", methods=["GET"])
    def config_summary():
        """暴露只读配置摘要供前端展示，不含敏感字段。"""
        return jsonify(
            {
                "version": __version__,
                "camera": {
                    "name": camera_cfg.get("name", "未命名工位"),
                    "source": _format_source(camera_cfg.get("source", "—")),
                    "width": camera_cfg.get("width", 1280),
                    "height": camera_cfg.get("height", 720),
                },
                "ppe": {
                    "enabled": bool(ppe_cfg.get("enabled", False)),
                    "weights": Path(str(ppe_cfg.get("weights", ""))).name if ppe_cfg.get("weights") else None,
                    "inference_interval_frames": ppe_cfg.get("inference_interval_frames", 2),
                },
                "rules": [
                    {
                        "id": rule.get("id"),
                        "name": rule.get("name", rule.get("id")),
                        "type": rule.get("type"),
                        "severity": rule.get("severity", "medium"),
                        "duration_seconds": rule.get("duration_seconds", 0.0),
                        "cooldown_seconds": rule.get("cooldown_seconds", 0.0),
                    }
                    for rule in rules_cfg
                    if rule.get("enabled", True)
                ],
                "alerts": {
                    "voice_enabled": bool(config.get("alerts", {}).get("voice_enabled", True)),
                    "save_snapshots": bool(config.get("alerts", {}).get("save_snapshots", True)),
                    "default_cooldown_seconds": config.get("alerts", {}).get("default_cooldown_seconds", 8.0),
                },
            }
        )

    @bp.route("/api/events", methods=["GET"])
    def events_api():
        limit = int(request.args.get("limit", 100))
        offset = int(request.args.get("offset", 0))
        return jsonify(store.list(limit, offset))

    @bp.route("/api/summary", methods=["GET"])
    def summary():
        return jsonify(store.summary())

    @bp.route("/api/events/<event_id>/acknowledge", methods=["POST"])
    def acknowledge(event_id: str):
        if not store.acknowledge(event_id):
            abort(404, description="事件不存在")
        return jsonify({"ok": True})

    # ───────────── 网页摄像头帧接收 ─────────────
    @bp.route("/api/frame", methods=["POST"])
    def ingest_frame():
        """接收浏览器摄像头抓到的 JPEG/PNG 帧，跑一次推理，写库 + 语音播报。

        请求体：multipart/form-data; field="frame"; Content-Type: image/jpeg 或 image/png
        返回：JSON {status, alerts:[{rule_id, rule_name, severity, message, event_id}], processed_ms}
        """
        monitor = _get_monitor()
        if monitor is None:
            return (
                jsonify(
                    {
                        "status": "error",
                        "detail": "推理引擎未就绪",
                        "hint": monitor_state["last_error"] or "请检查 ultralytics / 模型权重是否可用",
                    }
                ),
                503,
            )

        upload = request.files.get("frame")
        if upload is None or not upload.filename:
            return jsonify({"status": "error", "detail": "缺少 frame 字段"}), 400

        try:
            payload = upload.read()
        except Exception as exc:  # noqa: BLE001
            return jsonify({"status": "error", "detail": f"读取上传失败：{exc!r}"}), 400
        if not payload:
            return jsonify({"status": "error", "detail": "上传内容为空"}), 400

        try:
            import cv2
            import numpy as np

            arr = np.frombuffer(payload, dtype=np.uint8)
            frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        except Exception as exc:  # noqa: BLE001
            return jsonify({"status": "error", "detail": f"解码失败：{exc!r}"}), 400
        if frame is None:
            return jsonify({"status": "error", "detail": "解码后为空帧，请检查摄像头输出"}), 400

        started = time.monotonic()
        try:
            should_quit = monitor._process_frame(frame)
        except Exception as exc:  # noqa: BLE001
            LOGGER.exception("单帧推理失败：%s", exc)
            return (
                jsonify({"status": "error", "detail": f"推理失败：{exc!r}"}),
                500,
            )

        # 拉最近一条未确认告警作为本帧的"最新结果"返回，避免每次全量查库
        recent = store.list(limit=1, offset=0)
        latest = recent[0] if recent else None
        elapsed_ms = int((time.monotonic() - started) * 1000)

        return jsonify(
            {
                "status": "ok",
                "processed_ms": elapsed_ms,
                "should_quit": bool(should_quit),
                "latest_event": latest,
            }
        )

    # ───────────── 告警截图 ─────────────
    @bp.route("/snapshots/<path:filename>", methods=["GET"])
    def snapshot(filename: str):
        # 防止路径穿越：解析后必须落在 snapshot_root 之下
        target = (snapshot_root / filename).resolve()
        try:
            target.relative_to(snapshot_root)
        except ValueError:
            abort(404, description="截图不存在")
        if not target.is_file():
            abort(404, description="截图不存在")
        return send_from_directory(str(snapshot_root), filename)

    # ───────────── 错误处理 ─────────────
    @bp.errorhandler(404)
    def not_found_handler(_err):
        if request.path.startswith(f"{URL_PREFIX}/api"):
            return jsonify({"detail": "Not Found"}), 404
        try:
            return render_template(
                f"{TEMPLATE_SUBDIR}/404.html",
                app_name="流水线高危作业",
                path=request.path,
            ), 404
        except Exception:  # pragma: no cover - 模板缺失时退化为 JSON
            return jsonify({"detail": "Not Found"}), 404

    return bp


def register_safety(app: Flask, config: dict[str, Any]) -> Blueprint:
    """把流水线高危作业 Blueprint 注册到一个现有的 Flask 应用。"""
    bp = create_blueprint(config)
    app.register_blueprint(bp)
    LOGGER.info("流水线高危作业 Blueprint 已挂载：%s/*", URL_PREFIX)
    return bp


def _format_source(value: Any) -> str:
    """把摄像头源格式化成人类可读字符串。"""
    if isinstance(value, int):
        return f"USB / 内置摄像头 #{value}"
    text = str(value or "")
    if not text:
        return "—"
    if text.isdigit():
        return f"USB / 内置摄像头 #{text}"
    if text.startswith(("rtsp://", "rtmp://", "http://", "https://")):
        return f"网络流：{text}"
    return f"本地视频：{text}"
