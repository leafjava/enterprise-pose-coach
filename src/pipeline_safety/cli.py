from __future__ import annotations

import argparse
import logging
import threading
from pathlib import Path
from typing import Optional

from .config import ConfigError, load_config
from .events import EventStore
from .types import Alert


DEFAULT_CONFIG = str(Path(__file__).resolve().parents[2] / "config" / "default.json")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="流水线高危作业姿态监测与实时预警")
    parser.add_argument("--config", default=DEFAULT_CONFIG, help="JSON 配置文件")
    parser.add_argument("--log-level", default="INFO", choices=["DEBUG", "INFO", "WARNING", "ERROR"])
    subparsers = parser.add_subparsers(dest="command", required=True)

    monitor = subparsers.add_parser("monitor", help="启动摄像头或视频监测")
    monitor.add_argument("--source", help="覆盖配置中的视频源，例如 0、sample.mp4 或 RTSP 地址")
    monitor.add_argument("--headless", action="store_true", help="不显示本地预览窗口")
    monitor.add_argument("--max-frames", type=int, help="最多处理帧数，便于测试")

    serve = subparsers.add_parser("serve", help="启动事件管理页面")
    _add_server_arguments(serve)

    start = subparsers.add_parser("start", help="同时启动监测和事件管理页面")
    start.add_argument("--source", help="覆盖配置中的视频源")
    start.add_argument("--headless", action="store_true", help="不显示本地预览窗口")
    _add_server_arguments(start)

    subparsers.add_parser("check", help="检查配置和运行环境")
    demo = subparsers.add_parser("seed-demo", help="写入演示告警，便于检查管理页面")
    demo.add_argument("--count", type=int, default=3)
    return parser


def _add_server_arguments(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", default=8000, type=int)


def main(argv: Optional[list[str]] = None) -> int:
    args = build_parser().parse_args(argv)
    logging.basicConfig(
        level=getattr(logging, args.log_level),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
    try:
        config = load_config(args.config)
    except ConfigError as exc:
        raise SystemExit(str(exc)) from exc

    if args.command == "check":
        return _check(config)
    if args.command == "seed-demo":
        return _seed_demo(config, args.count)
    if args.command == "serve":
        return _serve(config, args.host, args.port)
    if args.command == "monitor":
        from .monitor import SafetyMonitor

        SafetyMonitor(config, args.source, preview=not args.headless).run(args.max_frames)
        return 0
    if args.command == "start":
        return _start(config, args.source, not args.headless, args.host, args.port)
    return 2


def _check(config: dict) -> int:
    print("配置：有效")
    print(f"工位：{config['camera'].get('name')}")
    print(f"规则：{sum(1 for rule in config['rules'] if rule.get('enabled', True))} 个已启用")
    missing = []
    for name in ("cv2", "fastapi", "uvicorn", "ultralytics"):
        try:
            __import__(name)
            print(f"依赖：{name} 已安装")
        except ImportError:
            missing.append(name)
            print(f"依赖：{name} 未安装")
    ppe = config.get("ppe_model", {})
    if ppe.get("enabled", False):
        weights = Path(str(ppe.get("weights", "")))
        if weights.is_file():
            print(f"PPE 权重：已安装（{weights.name}）")
        else:
            missing.append("ppe_weights")
            print(f"PPE 权重：缺失（{weights}）")
    if missing:
        print("请运行：python -m pip install -e .")
        return 1
    return 0


def _seed_demo(config: dict, count: int) -> int:
    store = EventStore(config["alerts"]["database"])
    samples = [
        Alert("missing_safety_helmet", "no_helmet", "未佩戴安全头盔", "high", 1, "请佩戴安全头盔", {"method": "head_without_helmet"}),
        Alert("excessive_bend", "bend", "过度弯腰", "high", 1, "请保持背部挺直", {"torso_angle": 55.2}),
        Alert("danger_zone_entry", "danger_zone", "进入危险区域", "critical", 2, "请立即撤离", {"entered_keypoints": ["right_wrist"]}),
        Alert("fall_detected", "fall", "疑似跌倒", "critical", 3, "请立即检查", {"torso_angle": 78.0}),
        Alert("possible_drowsiness", "drowsy", "疑似睡着", "high", 4, "请确认人员状态", {"head_drop_ratio": -0.02}),
        Alert("possible_unconsciousness", "unconscious", "疑似晕倒", "critical", 5, "请立即救援", {"motion_ratio": 0.002}),
    ]
    for index in range(max(0, count)):
        store.add(config["camera"].get("name", "1号工位"), samples[index % len(samples)])
    print(f"已写入 {max(0, count)} 条演示事件")
    return 0


def _serve(config: dict, host: str, port: int) -> int:
    try:
        import uvicorn
    except ImportError as exc:
        raise SystemExit("未安装 uvicorn。请运行：python -m pip install -e .") from exc
    from .web import create_app

    uvicorn.run(create_app(config), host=host, port=port)
    return 0


def _start(config: dict, source: Optional[str], preview: bool, host: str, port: int) -> int:
    try:
        import uvicorn
    except ImportError as exc:
        raise SystemExit("未安装 uvicorn。请运行：python -m pip install -e .") from exc
    from .monitor import SafetyMonitor
    from .web import create_app

    server = uvicorn.Server(uvicorn.Config(create_app(config), host=host, port=port, log_level="info"))
    thread = threading.Thread(target=server.run, name="event-dashboard", daemon=True)
    thread.start()
    print(f"事件管理页面：http://{host}:{port}")
    try:
        SafetyMonitor(config, source, preview=preview).run()
    finally:
        server.should_exit = True
        thread.join(timeout=5)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
