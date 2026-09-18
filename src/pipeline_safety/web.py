from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from . import __version__
from .events import EventStore

LOGGER = logging.getLogger(__name__)

WEB_DIR = Path(__file__).resolve().parents[2]
TEMPLATES_DIR = WEB_DIR / "templates"
STATIC_DIR = WEB_DIR / "static"


def create_app(config: dict[str, Any]) -> Any:
    store = EventStore(str(config["alerts"]["database"]))
    snapshot_root = Path(str(config["alerts"]["snapshot_directory"])).resolve()
    camera_cfg = config.get("camera", {})
    ppe_cfg = config.get("ppe_model", {})
    rules_cfg = config.get("rules", [])

    app = FastAPI(
        title="流水线高危作业",
        version=__version__,
        description="姿态监测与实时语音预警 MVP",
    )

    # ───────────── 静态资源 ─────────────
    if STATIC_DIR.is_dir():
        app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
    else:
        LOGGER.warning("static 目录不存在：%s", STATIC_DIR)

    templates = Jinja2Templates(directory=str(TEMPLATES_DIR)) if TEMPLATES_DIR.is_dir() else None

    # ───────────── 页面路由 ─────────────
    @app.get("/", response_class=HTMLResponse)
    def home(request: Request) -> Any:
        if templates is None:
            return HTMLResponse("<h1>templates 目录缺失</h1>", status_code=500)
        return templates.TemplateResponse(
            request,
            "home.html",
            {
                "app_name": "流水线高危作业",
                "app_subtitle": "姿态监测与实时语音预警 MVP",
                "version": __version__,
                "camera_name": camera_cfg.get("name", "未命名工位"),
                "ppe_enabled": bool(ppe_cfg.get("enabled", False)),
                "ppe_weights": Path(str(ppe_cfg.get("weights", ""))).name if ppe_cfg.get("weights") else "—",
                "rules_count": sum(1 for rule in rules_cfg if rule.get("enabled", True)),
                "rules_total": len(rules_cfg),
            },
        )

    @app.get("/monitor", response_class=HTMLResponse)
    def monitor(request: Request) -> Any:
        if templates is None:
            return HTMLResponse("<h1>templates 目录缺失</h1>", status_code=500)
        return templates.TemplateResponse(
            request,
            "monitor.html",
            {
                "app_name": "流水线高危作业",
                "version": __version__,
                "camera_name": camera_cfg.get("name", "未命名工位"),
                "source_label": _format_source(camera_cfg.get("source", "—")),
                "alerts_voice": bool(config.get("alerts", {}).get("voice_enabled", True)),
                "alerts_save_snapshots": bool(config.get("alerts", {}).get("save_snapshots", True)),
                "rules_active": [
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
            },
        )

    @app.get("/events", response_class=HTMLResponse)
    def events_page(request: Request) -> Any:
        if templates is None:
            return HTMLResponse("<h1>templates 目录缺失</h1>", status_code=500)
        return templates.TemplateResponse(
            request,
            "events.html",
            {
                "app_name": "流水线高危作业",
                "version": __version__,
                "camera_name": camera_cfg.get("name", "未命名工位"),
            },
        )

    # ───────────── JSON API ─────────────
    @app.get("/api/health")
    def health() -> dict[str, Any]:
        return {"status": "ok", "version": __version__}

    @app.get("/api/config")
    def config_summary() -> dict[str, Any]:
        """暴露只读配置摘要供前端展示，不含敏感字段。"""
        return {
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

    @app.get("/api/events")
    def events(limit: int = 100, offset: int = 0) -> list[dict[str, Any]]:
        return store.list(limit, offset)

    @app.get("/api/summary")
    def summary() -> dict[str, Any]:
        return store.summary()

    @app.post("/api/events/{event_id}/acknowledge")
    def acknowledge(event_id: str) -> dict[str, bool]:
        if not store.acknowledge(event_id):
            raise HTTPException(status_code=404, detail="事件不存在")
        return {"ok": True}

    @app.get("/snapshots/{filename:path}", response_class=FileResponse)
    def snapshot(filename: str) -> Any:
        target = (snapshot_root / filename).resolve()
        try:
            target.relative_to(snapshot_root)
        except ValueError:
            raise HTTPException(status_code=404, detail="截图不存在") from None
        if not target.is_file():
            raise HTTPException(status_code=404, detail="截图不存在")
        return FileResponse(str(target))

    @app.exception_handler(404)
    def not_found_handler(request: Request, exc: HTTPException) -> Any:
        if templates is None:
            return JSONResponse({"detail": "Not Found"}, status_code=404)
        return templates.TemplateResponse(
            request,
            "404.html",
            {"app_name": "流水线高危作业", "path": request.url.path},
            status_code=404,
        )

    return app


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
