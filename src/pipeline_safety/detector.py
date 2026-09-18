from __future__ import annotations

from typing import Any, List

from .types import COCO_KEYPOINTS, Keypoint, ObjectDetection, PersonPose


class DetectorUnavailable(RuntimeError):
    pass


class UltralyticsPoseDetector:
    def __init__(self, model_config: dict[str, Any]):
        try:
            from ultralytics import YOLO
        except ImportError as exc:
            raise DetectorUnavailable(
                "未安装 ultralytics。请先运行：python -m pip install -e ."
            ) from exc

        self.confidence = float(model_config.get("confidence", 0.45))
        self.device = model_config.get("device", "auto")
        self.tracker = str(model_config.get("tracker", "bytetrack.yaml"))
        self.model = YOLO(str(model_config.get("weights", "yolo11n-pose.pt")))

    def detect(self, frame: Any) -> List[PersonPose]:
        kwargs = {
            "source": frame,
            "persist": True,
            "verbose": False,
            "conf": self.confidence,
            "tracker": self.tracker,
        }
        if self.device and self.device != "auto":
            kwargs["device"] = self.device
        results = self.model.track(**kwargs)
        if not results:
            return []
        result = results[0]
        if result.boxes is None or result.keypoints is None:
            return []

        boxes = result.boxes.xyxy.cpu().numpy()
        box_confidences = result.boxes.conf.cpu().numpy()
        track_ids = result.boxes.id
        ids = track_ids.int().cpu().tolist() if track_ids is not None else list(range(1, len(boxes) + 1))
        coordinates = result.keypoints.xy.cpu().numpy()
        confidences = result.keypoints.conf
        confidence_rows = confidences.cpu().numpy() if confidences is not None else None

        poses: List[PersonPose] = []
        for index, bbox in enumerate(boxes):
            points = {}
            for point_index, name in enumerate(COCO_KEYPOINTS):
                x, y = coordinates[index][point_index]
                confidence = float(confidence_rows[index][point_index]) if confidence_rows is not None else 1.0
                points[name] = Keypoint(float(x), float(y), confidence)
            poses.append(
                PersonPose(
                    track_id=int(ids[index]),
                    bbox=tuple(float(value) for value in bbox),
                    confidence=float(box_confidences[index]),
                    keypoints=points,
                )
            )
        return poses


class UltralyticsObjectDetector:
    """加载独立 PPE 权重并返回统一的目标框。"""

    def __init__(self, model_config: dict[str, Any]):
        try:
            from ultralytics import YOLO
        except ImportError as exc:
            raise DetectorUnavailable("未安装 ultralytics。请先运行：python -m pip install -e .") from exc

        weights = str(model_config.get("weights", ""))
        if not weights:
            raise DetectorUnavailable("启用 PPE 检测时必须配置 ppe_model.weights")
        self.confidence = float(model_config.get("confidence", 0.35))
        self.device = model_config.get("device", "auto")
        self.model = YOLO(weights)

    def detect(self, frame: Any) -> List[ObjectDetection]:
        kwargs = {"source": frame, "verbose": False, "conf": self.confidence}
        if self.device and self.device != "auto":
            kwargs["device"] = self.device
        results = self.model.predict(**kwargs)
        if not results or results[0].boxes is None:
            return []
        result = results[0]
        boxes = result.boxes.xyxy.cpu().numpy()
        confidences = result.boxes.conf.cpu().numpy()
        classes = result.boxes.cls.int().cpu().tolist()
        names = result.names
        return [
            ObjectDetection(
                label=_normalize_label(str(names[class_id])),
                bbox=tuple(float(value) for value in boxes[index]),
                confidence=float(confidences[index]),
            )
            for index, class_id in enumerate(classes)
        ]


def _normalize_label(label: str) -> str:
    return label.strip().lower().replace("-", "_").replace(" ", "_")
