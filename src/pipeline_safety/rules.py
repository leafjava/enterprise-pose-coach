from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple

from .geometry import (
    angle_from_vertical,
    bbox_center,
    boxes_intersect,
    midpoint,
    normalized_polygon,
    point_in_bbox,
    point_in_polygon,
)
from .types import Alert, ObjectDetection, PersonPose


@dataclass
class Condition:
    active: bool
    details: Dict[str, object]


@dataclass
class TemporalState:
    active_since: Optional[float] = None
    last_seen: Optional[float] = None
    last_alert: Optional[float] = None


class SafetyRule:
    def __init__(self, spec: Dict[str, Any], keypoint_confidence: float, default_cooldown: float):
        self.spec = spec
        self.id = str(spec["id"])
        self.type = str(spec["type"])
        self.name = str(spec.get("name", self.id))
        self.severity = str(spec.get("severity", "medium"))
        self.message = str(spec["message"])
        self.duration = float(spec.get("duration_seconds", 0.0))
        self.cooldown = float(spec.get("cooldown_seconds", default_cooldown))
        self.keypoint_confidence = keypoint_confidence

    def condition(
        self,
        pose: PersonPose,
        frame_size: Tuple[int, int],
        objects: Optional[List[ObjectDetection]] = None,
    ) -> Condition:
        raise NotImplementedError

    def expire_tracks(self, active_track_ids: Set[int]) -> None:
        return None


class BendRule(SafetyRule):
    def condition(self, pose: PersonPose, frame_size: Tuple[int, int], objects=None) -> Condition:
        points = pose.keypoints
        required = ("left_shoulder", "right_shoulder", "left_hip", "right_hip")
        if any(name not in points for name in required):
            return Condition(False, {"reason": "关键点缺失"})
        shoulder = midpoint(points["left_shoulder"], points["right_shoulder"], self.keypoint_confidence)
        hip = midpoint(points["left_hip"], points["right_hip"], self.keypoint_confidence)
        if shoulder is None or hip is None:
            return Condition(False, {"reason": "关键点置信度不足"})
        angle = angle_from_vertical(shoulder, hip)
        threshold = float(self.spec.get("threshold_degrees", 42.0))
        return Condition(angle >= threshold, {"torso_angle": round(angle, 1), "threshold": threshold})


class FallRule(SafetyRule):
    def condition(self, pose: PersonPose, frame_size: Tuple[int, int], objects=None) -> Condition:
        x1, y1, x2, y2 = pose.bbox
        width = max(1.0, x2 - x1)
        height = max(1.0, y2 - y1)
        aspect_ratio = width / height
        required = ("left_shoulder", "right_shoulder", "left_hip", "right_hip")
        points = pose.keypoints
        if any(name not in points for name in required):
            return Condition(False, {"reason": "关键点缺失"})
        shoulder = midpoint(points["left_shoulder"], points["right_shoulder"], self.keypoint_confidence)
        hip = midpoint(points["left_hip"], points["right_hip"], self.keypoint_confidence)
        if shoulder is None or hip is None:
            return Condition(False, {"reason": "关键点置信度不足"})
        angle = angle_from_vertical(shoulder, hip)
        angle_threshold = float(self.spec.get("torso_threshold_degrees", 62.0))
        ratio_threshold = float(self.spec.get("bbox_aspect_ratio", 1.15))
        active = angle >= angle_threshold and aspect_ratio >= ratio_threshold
        return Condition(
            active,
            {
                "torso_angle": round(angle, 1),
                "bbox_aspect_ratio": round(aspect_ratio, 2),
                "angle_threshold": angle_threshold,
                "ratio_threshold": ratio_threshold,
            },
        )


class DangerZoneRule(SafetyRule):
    def condition(self, pose: PersonPose, frame_size: Tuple[int, int], objects=None) -> Condition:
        width, height = frame_size
        polygon = normalized_polygon(self.spec["polygon"], width, height)
        watched = self.spec.get("keypoints", ["left_wrist", "right_wrist"])
        entered: List[str] = []
        for name in watched:
            point = pose.keypoints.get(str(name))
            if point and point.confidence >= self.keypoint_confidence and point_in_polygon((point.x, point.y), polygon):
                entered.append(str(name))
        return Condition(bool(entered), {"entered_keypoints": entered})


class NoHelmetRule(SafetyRule):
    def condition(
        self,
        pose: PersonPose,
        frame_size: Tuple[int, int],
        objects: Optional[List[ObjectDetection]] = None,
    ) -> Condition:
        if objects is None:
            return Condition(False, {"reason": "PPE 检测器未启用"})

        helmet_labels = {_label(value) for value in self.spec.get("helmet_classes", ["hardhat", "helmet"])}
        head_labels = {_label(value) for value in self.spec.get("head_classes", ["head"])}
        missing_labels = {
            _label(value) for value in self.spec.get("no_helmet_classes", ["no_helmet", "nohardhat"])
        }
        x1, y1, x2, y2 = pose.bbox
        upper_body = (x1, y1, x2, y1 + (y2 - y1) * 0.55)

        explicit_missing = [
            item
            for item in objects
            if item.label in missing_labels and point_in_bbox(bbox_center(item.bbox), upper_body)
        ]
        if explicit_missing:
            return Condition(
                True,
                {"method": "explicit_no_helmet", "confidence": round(max(i.confidence for i in explicit_missing), 3)},
            )

        heads = [
            item for item in objects if item.label in head_labels and point_in_bbox(bbox_center(item.bbox), upper_body)
        ]
        if not heads:
            return Condition(False, {"reason": "未可靠检测到头部"})

        reference = pose.keypoints.get("nose")
        target = (reference.x, reference.y) if reference and reference.confidence >= self.keypoint_confidence else (
            (x1 + x2) / 2.0,
            y1 + (y2 - y1) * 0.15,
        )
        head = min(heads, key=lambda item: math.hypot(bbox_center(item.bbox)[0] - target[0], bbox_center(item.bbox)[1] - target[1]))
        hx1, hy1, hx2, hy2 = head.bbox
        margin_x = (hx2 - hx1) * 0.35
        margin_y = (hy2 - hy1) * 0.35
        expanded_head = (hx1 - margin_x, hy1 - margin_y, hx2 + margin_x, hy2 + margin_y)
        helmets = [
            item for item in objects if item.label in helmet_labels and boxes_intersect(item.bbox, expanded_head)
        ]
        if helmets:
            return Condition(False, {"helmet_confidence": round(max(i.confidence for i in helmets), 3)})
        return Condition(True, {"method": "head_without_helmet", "head_confidence": round(head.confidence, 3)})


class _MotionRule(SafetyRule):
    def __init__(self, spec: Dict[str, Any], keypoint_confidence: float, default_cooldown: float):
        super().__init__(spec, keypoint_confidence, default_cooldown)
        self._anchors: Dict[int, Tuple[float, float]] = {}

    def motion_ratio(self, pose: PersonPose, anchor: Tuple[float, float]) -> Optional[float]:
        previous = self._anchors.get(pose.track_id)
        self._anchors[pose.track_id] = anchor
        if previous is None:
            return None
        height = max(1.0, pose.bbox[3] - pose.bbox[1])
        return math.hypot(anchor[0] - previous[0], anchor[1] - previous[1]) / height

    def expire_tracks(self, active_track_ids: Set[int]) -> None:
        for track_id in list(self._anchors):
            if track_id not in active_track_ids:
                del self._anchors[track_id]


class DrowsyRule(_MotionRule):
    def condition(self, pose: PersonPose, frame_size: Tuple[int, int], objects=None) -> Condition:
        points = pose.keypoints
        required = ("nose", "left_shoulder", "right_shoulder", "left_hip", "right_hip")
        if any(name not in points for name in required):
            return Condition(False, {"reason": "关键点缺失"})
        nose = points["nose"]
        shoulder = midpoint(points["left_shoulder"], points["right_shoulder"], self.keypoint_confidence)
        hip = midpoint(points["left_hip"], points["right_hip"], self.keypoint_confidence)
        if nose.confidence < self.keypoint_confidence or shoulder is None or hip is None:
            return Condition(False, {"reason": "头部或躯干关键点置信度不足"})
        torso_length = max(1.0, math.hypot(shoulder[0] - hip[0], shoulder[1] - hip[1]))
        head_drop_ratio = (nose.y - shoulder[1]) / torso_length
        anchor = ((shoulder[0] + hip[0]) / 2.0, (shoulder[1] + hip[1]) / 2.0)
        motion = self.motion_ratio(pose, anchor)
        drop_threshold = float(self.spec.get("head_drop_ratio", -0.08))
        motion_threshold = float(self.spec.get("motion_threshold_ratio", 0.012))
        active = motion is not None and head_drop_ratio >= drop_threshold and motion <= motion_threshold
        return Condition(
            active,
            {
                "head_drop_ratio": round(head_drop_ratio, 3),
                "motion_ratio": None if motion is None else round(motion, 4),
                "drop_threshold": drop_threshold,
                "motion_threshold": motion_threshold,
            },
        )


class UnconsciousRule(_MotionRule):
    def condition(self, pose: PersonPose, frame_size: Tuple[int, int], objects=None) -> Condition:
        points = pose.keypoints
        required = ("left_shoulder", "right_shoulder", "left_hip", "right_hip")
        if any(name not in points for name in required):
            return Condition(False, {"reason": "关键点缺失"})
        shoulder = midpoint(points["left_shoulder"], points["right_shoulder"], self.keypoint_confidence)
        hip = midpoint(points["left_hip"], points["right_hip"], self.keypoint_confidence)
        if shoulder is None or hip is None:
            return Condition(False, {"reason": "关键点置信度不足"})
        torso_angle = angle_from_vertical(shoulder, hip)
        x1, y1, x2, y2 = pose.bbox
        aspect_ratio = max(1.0, x2 - x1) / max(1.0, y2 - y1)
        anchor = ((shoulder[0] + hip[0]) / 2.0, (shoulder[1] + hip[1]) / 2.0)
        motion = self.motion_ratio(pose, anchor)
        angle_threshold = float(self.spec.get("torso_threshold_degrees", 62.0))
        ratio_threshold = float(self.spec.get("bbox_aspect_ratio", 1.05))
        motion_threshold = float(self.spec.get("motion_threshold_ratio", 0.015))
        lying = torso_angle >= angle_threshold and aspect_ratio >= ratio_threshold
        active = motion is not None and lying and motion <= motion_threshold
        return Condition(
            active,
            {
                "torso_angle": round(torso_angle, 1),
                "bbox_aspect_ratio": round(aspect_ratio, 2),
                "motion_ratio": None if motion is None else round(motion, 4),
            },
        )


def _label(value: object) -> str:
    return str(value).strip().lower().replace("-", "_").replace(" ", "_")


RULE_TYPES = {
    "bend": BendRule,
    "fall": FallRule,
    "danger_zone": DangerZoneRule,
    "no_helmet": NoHelmetRule,
    "drowsy": DrowsyRule,
    "unconscious": UnconsciousRule,
}


class RuleEngine:
    def __init__(self, rules: Iterable[Dict[str, Any]], keypoint_confidence: float, default_cooldown: float):
        self.rules: List[SafetyRule] = [
            RULE_TYPES[str(spec["type"])](spec, keypoint_confidence, default_cooldown)
            for spec in rules
            if spec.get("enabled", True)
        ]
        self._states: Dict[Tuple[int, str], TemporalState] = {}

    def evaluate(
        self,
        pose: PersonPose,
        frame_size: Tuple[int, int],
        now: float,
        objects: Optional[List[ObjectDetection]] = None,
    ) -> List[Alert]:
        alerts: List[Alert] = []
        for rule in self.rules:
            result = rule.condition(pose, frame_size, objects)
            key = (pose.track_id, rule.id)
            state = self._states.setdefault(key, TemporalState())

            if not result.active:
                state.active_since = None
                state.last_seen = now
                continue

            if state.active_since is None or (state.last_seen is not None and now - state.last_seen > 1.0):
                state.active_since = now
            state.last_seen = now
            active_duration = now - state.active_since
            cooled_down = state.last_alert is None or now - state.last_alert >= rule.cooldown
            if active_duration >= rule.duration and cooled_down:
                state.last_alert = now
                details = dict(result.details)
                details["active_duration"] = round(active_duration, 2)
                alerts.append(
                    Alert(
                        rule_id=rule.id,
                        rule_type=rule.type,
                        rule_name=rule.name,
                        severity=rule.severity,
                        track_id=pose.track_id,
                        message=rule.message,
                        details=details,
                    )
                )
        return alerts

    def expire_missing(self, active_track_ids: Set[int], now: float, max_age: float = 2.0) -> None:
        for rule in self.rules:
            rule.expire_tracks(active_track_ids)
        expired = [
            key
            for key, state in self._states.items()
            if key[0] not in active_track_ids and state.last_seen is not None and now - state.last_seen > max_age
        ]
        for key in expired:
            del self._states[key]

    def polygons(self, frame_size: Tuple[int, int]) -> List[List[Tuple[float, float]]]:
        width, height = frame_size
        return [
            normalized_polygon(rule.spec["polygon"], width, height)
            for rule in self.rules
            if isinstance(rule, DangerZoneRule)
        ]
