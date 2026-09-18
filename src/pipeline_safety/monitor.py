from __future__ import annotations

import logging
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

import cv2

from .detector import UltralyticsObjectDetector, UltralyticsPoseDetector
from .events import EventStore
from .render import draw_scene
from .rules import RuleEngine
from .speaker import Speaker


LOGGER = logging.getLogger(__name__)


def parse_source(value: Any) -> Any:
    if isinstance(value, int):
        return value
    text = str(value)
    return int(text) if text.isdigit() else text


class SafetyMonitor:
    def __init__(self, config: dict[str, Any], source_override: Optional[str] = None, preview: bool = True):
        self.config = config
        camera = config["camera"]
        alerts = config["alerts"]
        model = config["model"]
        self.source = parse_source(source_override if source_override is not None else camera["source"])
        self.station = str(camera.get("name", "未命名工位"))
        self.width = int(camera.get("width", 1280))
        self.height = int(camera.get("height", 720))
        self.reconnect_seconds = float(camera.get("reconnect_seconds", 3.0))
        self.preview = preview
        self.keypoint_confidence = float(model.get("keypoint_confidence", 0.35))
        self.detector = UltralyticsPoseDetector(model)
        ppe_model = config.get("ppe_model", {})
        self.ppe_detector = UltralyticsObjectDetector(ppe_model) if ppe_model.get("enabled", False) else None
        self.ppe_interval = max(1, int(ppe_model.get("inference_interval_frames", 2)))
        self._frame_index = 0
        self._ppe_objects = []
        self.engine = RuleEngine(
            config["rules"],
            self.keypoint_confidence,
            float(alerts.get("default_cooldown_seconds", 8.0)),
        )
        self.store = EventStore(str(alerts["database"]))
        self.snapshot_directory = Path(str(alerts["snapshot_directory"]))
        self.save_snapshots = bool(alerts.get("save_snapshots", True))
        self.speaker = Speaker(bool(alerts.get("voice_enabled", True)), int(alerts.get("voice_rate", 190)))

    def run(self, max_frames: Optional[int] = None) -> None:
        processed = 0
        try:
            while max_frames is None or processed < max_frames:
                capture = self._open_capture()
                while max_frames is None or processed < max_frames:
                    ok, frame = capture.read()
                    if not ok:
                        break
                    processed += 1
                    if self._process_frame(frame):
                        return
                capture.release()
                if not self._is_live_source():
                    return
                LOGGER.warning("视频流中断，%.1f 秒后重连", self.reconnect_seconds)
                time.sleep(self.reconnect_seconds)
        finally:
            self.speaker.close()
            if self.preview:
                cv2.destroyAllWindows()

    def _open_capture(self) -> cv2.VideoCapture:
        capture = cv2.VideoCapture(self.source)
        if self.width:
            capture.set(cv2.CAP_PROP_FRAME_WIDTH, self.width)
        if self.height:
            capture.set(cv2.CAP_PROP_FRAME_HEIGHT, self.height)
        if not capture.isOpened():
            capture.release()
            raise RuntimeError(f"无法打开视频源：{self.source}")
        return capture

    def _process_frame(self, frame: Any) -> bool:
        now = time.monotonic()
        poses = self.detector.detect(frame)
        self._frame_index += 1
        if self.ppe_detector is not None and (
            not self._ppe_objects or self._frame_index % self.ppe_interval == 0
        ):
            self._ppe_objects = self.ppe_detector.detect(frame)
        frame_height, frame_width = frame.shape[:2]
        frame_size = (frame_width, frame_height)
        alerts = []
        active_ids = set()
        for pose in poses:
            active_ids.add(pose.track_id)
            alerts.extend(self.engine.evaluate(pose, frame_size, now, self._ppe_objects))
        self.engine.expire_missing(active_ids, now)

        annotated = draw_scene(
            frame,
            poses,
            self.engine.polygons(frame_size),
            self.keypoint_confidence,
            self._ppe_objects,
        )
        for alert in alerts:
            snapshot = self._save_snapshot(annotated, alert.rule_id) if self.save_snapshots else None
            event_id = self.store.add(self.station, alert, snapshot)
            LOGGER.warning(
                "安全告警 event=%s station=%s track=%s rule=%s details=%s",
                event_id,
                self.station,
                alert.track_id,
                alert.rule_id,
                alert.details,
            )
            self.speaker.speak(alert.message)

        if self.preview:
            cv2.imshow(f"Pipeline Safety - {self.station}", annotated)
            return (cv2.waitKey(1) & 0xFF) in (ord("q"), 27)
        return False

    def _save_snapshot(self, frame: Any, rule_id: str) -> str:
        self.snapshot_directory.mkdir(parents=True, exist_ok=True)
        stamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        target = self.snapshot_directory / f"{stamp}_{rule_id}_{uuid.uuid4().hex[:8]}.jpg"
        cv2.imwrite(str(target), frame)
        return str(target)

    def _is_live_source(self) -> bool:
        if isinstance(self.source, int):
            return True
        return str(self.source).lower().startswith(("rtsp://", "rtmp://", "http://", "https://"))
