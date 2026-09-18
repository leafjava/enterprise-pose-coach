from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Tuple


COCO_KEYPOINTS = (
    "nose",
    "left_eye",
    "right_eye",
    "left_ear",
    "right_ear",
    "left_shoulder",
    "right_shoulder",
    "left_elbow",
    "right_elbow",
    "left_wrist",
    "right_wrist",
    "left_hip",
    "right_hip",
    "left_knee",
    "right_knee",
    "left_ankle",
    "right_ankle",
)


SKELETON = (
    ("left_shoulder", "right_shoulder"),
    ("left_shoulder", "left_elbow"),
    ("left_elbow", "left_wrist"),
    ("right_shoulder", "right_elbow"),
    ("right_elbow", "right_wrist"),
    ("left_shoulder", "left_hip"),
    ("right_shoulder", "right_hip"),
    ("left_hip", "right_hip"),
    ("left_hip", "left_knee"),
    ("left_knee", "left_ankle"),
    ("right_hip", "right_knee"),
    ("right_knee", "right_ankle"),
)


@dataclass(frozen=True)
class Keypoint:
    x: float
    y: float
    confidence: float


@dataclass
class PersonPose:
    track_id: int
    bbox: Tuple[float, float, float, float]
    confidence: float
    keypoints: Dict[str, Keypoint]


@dataclass(frozen=True)
class ObjectDetection:
    label: str
    bbox: Tuple[float, float, float, float]
    confidence: float


@dataclass
class Alert:
    rule_id: str
    rule_type: str
    rule_name: str
    severity: str
    track_id: int
    message: str
    details: Dict[str, object] = field(default_factory=dict)


@dataclass
class FrameAnalysis:
    poses: List[PersonPose]
    alerts: List[Alert]
