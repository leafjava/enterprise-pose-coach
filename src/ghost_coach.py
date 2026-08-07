"""Explainable 2D visual guidance for live pose correction.

The engine converts a live COCO-17 pose and rule errors into a renderer-neutral
payload: a solid current skeleton, a phase-matched dashed target skeleton, and
at most two prioritized correction guides. It intentionally does not claim 3D
world alignment or medical correctness.
"""

from __future__ import annotations

from dataclasses import dataclass, field
import json
from pathlib import Path
from typing import Iterable, Mapping, Protocol

import numpy as np


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_STANDARD_PATH = (
    REPO_ROOT / "config" / "posture_standards" / "recruit_squat_50_v1.json"
)

COCO17_SKELETON = [
    [0, 1], [0, 2], [1, 3], [2, 4], [5, 6], [5, 7], [7, 9],
    [6, 8], [8, 10], [5, 11], [6, 12], [11, 12], [11, 13],
    [13, 15], [12, 14], [14, 16],
]

LEFT_RIGHT_PAIRS = [
    (1, 2), (3, 4), (5, 6), (7, 8), (9, 10),
    (11, 12), (13, 14), (15, 16),
]

SQUAT_VISUAL_ERRORS = {
    "squat_knees_out": {
        "label": "膝盖向外打开",
        "joints": [13, 14],
        "state": "alert",
    },
    "squat_depth": {
        "label": "髋部继续下沉",
        "joints": [11, 12, 13, 14],
        "state": "warn",
    },
    "squat_chest_up": {
        "label": "胸口抬起，躯干回正",
        "joints": [5, 6, 11, 12],
        "state": "warn",
    },
}

CORE_ALIGNMENT_JOINTS = [5, 6, 11, 12]
REQUIRED_LEG_JOINTS = [13, 14, 15, 16]


class CorrectionGuideProvider(Protocol):
    """Exercise plug-in contract for error metadata and correction vectors."""

    @property
    def errors(self) -> Mapping[str, Mapping[str, object]]:
        ...

    def build_guide(
        self,
        code: str,
        current: np.ndarray,
        target: np.ndarray,
        width: int,
        height: int,
    ) -> dict | None:
        ...


def _normalized_arrow(
    start: np.ndarray,
    end: np.ndarray,
    width: int,
    height: int,
) -> dict:
    return {
        "start": [round(float(start[0] / width), 5), round(float(start[1] / height), 5)],
        "end": [round(float(end[0] / width), 5), round(float(end[1] / height), 5)],
    }


class SquatCorrectionGuideProvider:
    """MVP implementation of the extension contract for recruitment squats."""

    @property
    def errors(self) -> Mapping[str, Mapping[str, object]]:
        return SQUAT_VISUAL_ERRORS

    def build_guide(
        self,
        code: str,
        current: np.ndarray,
        target: np.ndarray,
        width: int,
        height: int,
    ) -> dict | None:
        meta = self.errors.get(code)
        if not meta:
            return None
        body_height = max(float(np.ptp(current[:, 1])), height * 0.2)
        hip_center = _midpoint(current, 11, 12)
        arrows = []

        if code == "squat_knees_out":
            knees = sorted([13, 14], key=lambda index: current[index, 0])
            for direction, index in zip((-1.0, 1.0), knees):
                start = current[index]
                desired = target[index]
                delta_x = desired[0] - start[0]
                if direction * delta_x < body_height * 0.045:
                    delta_x = direction * body_height * 0.11
                end = np.asarray([start[0] + delta_x, start[1]], dtype=np.float32)
                arrows.append(_normalized_arrow(start, end, width, height))
        elif code == "squat_depth":
            end = hip_center + np.asarray([0.0, body_height * 0.11], dtype=np.float32)
            arrows.append(_normalized_arrow(hip_center, end, width, height))
        elif code == "squat_chest_up":
            shoulder_center = _midpoint(current, 5, 6)
            end = shoulder_center + np.asarray(
                [(hip_center[0] - shoulder_center[0]) * 0.35, -body_height * 0.09],
                dtype=np.float32,
            )
            arrows.append(_normalized_arrow(shoulder_center, end, width, height))

        return {
            "code": code,
            "label": str(meta["label"]),
            "arrows": arrows,
        }


@dataclass
class GhostCoachState:
    smoothed_keypoints: np.ndarray | None = None
    error_streaks: dict[str, int] = field(default_factory=dict)
    clear_streaks: dict[str, int] = field(default_factory=dict)
    active_codes: set[str] = field(default_factory=set)
    last_severity: dict[str, float] = field(default_factory=dict)

    def reset(self) -> None:
        self.smoothed_keypoints = None
        self.error_streaks.clear()
        self.clear_streaks.clear()
        self.active_codes.clear()
        self.last_severity.clear()


def _distance(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.linalg.norm(a - b))


def _midpoint(points: np.ndarray, first: int, second: int) -> np.ndarray:
    return (points[first] + points[second]) / 2.0


def _safe_ratio(numerator: float, denominator: float) -> float | None:
    if numerator <= 1e-6 or denominator <= 1e-6:
        return None
    return numerator / denominator


def mirror_coco17_template(template: np.ndarray) -> np.ndarray:
    """Mirror a template while preserving semantic left/right joint indexes."""
    mirrored = np.asarray(template, dtype=np.float32).copy()
    center_x = float((mirrored[11, 0] + mirrored[12, 0]) / 2.0)
    mirrored[:, 0] = 2.0 * center_x - mirrored[:, 0]
    for left, right in LEFT_RIGHT_PAIRS:
        mirrored[[left, right]] = mirrored[[right, left]]
    return mirrored


def align_template_to_pose(
    template: np.ndarray,
    keypoints: np.ndarray,
    *,
    mirrored: bool = False,
) -> np.ndarray:
    """Scale and anchor a normalized COCO-17 template to a live pixel pose."""
    current = np.asarray(keypoints, dtype=np.float32)
    target = np.asarray(template, dtype=np.float32)
    if current.shape != (17, 2) or target.shape != (17, 2):
        raise ValueError("Expected current and template shapes to both be (17, 2)")

    if mirrored:
        target = mirror_coco17_template(target)

    current_hip = _midpoint(current, 11, 12)
    target_hip = _midpoint(target, 11, 12)
    current_shoulder = _midpoint(current, 5, 6)
    target_shoulder = _midpoint(target, 5, 6)
    current_knee = _midpoint(current, 13, 14)
    target_knee = _midpoint(target, 13, 14)
    current_ankle = _midpoint(current, 15, 16)
    target_ankle = _midpoint(target, 15, 16)

    x_ratios = [
        _safe_ratio(_distance(current[5], current[6]), _distance(target[5], target[6])),
        _safe_ratio(_distance(current[11], current[12]), _distance(target[11], target[12])),
        _safe_ratio(_distance(current[15], current[16]), _distance(target[15], target[16])),
    ]
    y_ratios = [
        _safe_ratio(_distance(current_shoulder, current_hip), _distance(target_shoulder, target_hip)),
        _safe_ratio(_distance(current_hip, current_knee), _distance(target_hip, target_knee)),
        _safe_ratio(_distance(current_knee, current_ankle), _distance(target_knee, target_ankle)),
    ]
    valid_x = [value for value in x_ratios if value is not None]
    valid_y = [value for value in y_ratios if value is not None]
    if not valid_x or not valid_y:
        raise ValueError("Pose does not contain enough body span for alignment")

    scale_x = float(np.median(valid_x))
    scale_y = float(np.median(valid_y))
    # Avoid pathological overlays from an unstable single frame.
    ratio = scale_x / max(scale_y, 1e-6)
    if ratio > 1.8:
        scale_x = scale_y * 1.8
    elif ratio < 0.55:
        scale_x = scale_y * 0.55

    aligned = (target - target_hip) * np.asarray([scale_x, scale_y]) + current_hip
    return aligned.astype(np.float32)


class GhostCoachEngine:
    """Build stable, phase-aware visual instructions for supported exercises."""

    def __init__(
        self,
        config_path: str | Path = DEFAULT_STANDARD_PATH,
        guide_provider: CorrectionGuideProvider | None = None,
    ):
        self.config_path = Path(config_path)
        self.config = json.loads(self.config_path.read_text(encoding="utf-8"))
        self.guide_provider = guide_provider or SquatCorrectionGuideProvider()
        self._validate_config()
        visual = self.config["visual"]
        self.max_guides = int(visual["max_guides"])
        self.persistence_frames = int(visual["persistence_frames"])
        self.clear_frames = int(visual["clear_frames"])
        self.smoothing_alpha = float(visual["smoothing_alpha"])
        self.min_confidence = float(visual["min_keypoint_confidence"])

    def _validate_config(self) -> None:
        templates = self.config.get("templates", {})
        aliases = self.config.get("phase_aliases", {})
        required = set(aliases.values())
        if not required:
            raise ValueError("Ghost Coach config must declare phase_aliases")
        if not required.issubset(templates):
            raise ValueError(f"Ghost Coach config missing phases: {sorted(required - set(templates))}")
        for name, points in templates.items():
            array = np.asarray(points, dtype=np.float32)
            if array.shape != (17, 2):
                raise ValueError(f"Template {name} must have shape (17, 2), got {array.shape}")
            if not np.all((array >= 0.0) & (array <= 1.0)):
                raise ValueError(f"Template {name} must use normalized coordinates")

    @property
    def standard_id(self) -> str:
        return str(self.config["standard_id"])

    @property
    def version(self) -> str:
        return str(self.config["version"])

    def template_for_phase(self, phase: str) -> tuple[str, np.ndarray]:
        aliases = self.config["phase_aliases"]
        template_name = aliases.get(str(phase), "ready")
        points = np.asarray(self.config["templates"][template_name], dtype=np.float32)
        return template_name, points

    def build_payload(
        self,
        *,
        exercise: str,
        phase: str,
        keypoints: np.ndarray | None,
        errors: Iterable[dict] | None,
        state: GhostCoachState,
        frame_size: tuple[int, int] | None = None,
        confidences: np.ndarray | None = None,
        mirrored: bool = False,
    ) -> dict:
        canonical = "squats" if exercise == "squat" else str(exercise)
        if canonical != self.config["exercise"]:
            state.reset()
            return self._unavailable("unsupported_exercise", "当前动作暂不支持视觉纠正场。")

        current = self._coerce_keypoints(keypoints)
        if current is None:
            state.reset()
            return self._unavailable("no_person", "请站到画面中央，让全身完整入镜。")

        scores = self._coerce_confidences(confidences, current)
        if not self._has_reliable_body(current, scores):
            state.reset()
            return self._unavailable("low_confidence", "关键关节不清晰，请调整站位或光线。")

        smoothed = self._smooth(current, state)
        template_name, template = self.template_for_phase(phase)
        try:
            target = align_template_to_pose(template, smoothed, mirrored=mirrored)
        except ValueError:
            state.reset()
            return self._unavailable("alignment_failed", "身体比例暂时无法对齐，请重新站稳。")

        width, height = self._resolve_frame_size(smoothed, frame_size)
        visible_errors = self._select_guides(list(errors or []), state)
        guides = [
            self.guide_provider.build_guide(code, smoothed, target, width, height)
            for code in visible_errors
        ]
        guides = [guide for guide in guides if guide is not None]
        joint_states = self._joint_states(list(errors or []))

        return {
            "available": True,
            "reason": "",
            "message": "视觉引导已开启" if guides else "动作稳定，继续保持",
            "standard_id": self.standard_id,
            "template_version": self.version,
            "template_phase": template_name,
            "confidence": round(float(np.mean(scores[CORE_ALIGNMENT_JOINTS + REQUIRED_LEG_JOINTS])), 3),
            "frame": {"width": width, "height": height},
            "mirrored": bool(mirrored),
            "skeleton_edges": COCO17_SKELETON,
            "actual_keypoints": self._normalized_points(smoothed, scores, width, height),
            "target_keypoints": self._normalized_points(target, np.ones(17), width, height),
            "joint_states": joint_states,
            "guides": guides[: self.max_guides],
            "max_guides": self.max_guides,
            "arrow_pulse_hz": float(self.config["visual"]["arrow_pulse_hz"]),
        }

    def _coerce_keypoints(self, keypoints: np.ndarray | None) -> np.ndarray | None:
        if keypoints is None:
            return None
        array = np.asarray(keypoints, dtype=np.float32)
        if array.shape != (17, 2) or not np.all(np.isfinite(array)) or not np.any(array):
            return None
        return array

    def _coerce_confidences(self, confidences: np.ndarray | None, keypoints: np.ndarray) -> np.ndarray:
        if confidences is None:
            return np.where(np.any(keypoints != 0.0, axis=1), 1.0, 0.0).astype(np.float32)
        values = np.asarray(confidences, dtype=np.float32).reshape(-1)
        if values.size < 17:
            padded = np.zeros(17, dtype=np.float32)
            padded[: values.size] = values
            values = padded
        return np.clip(values[:17], 0.0, 1.0)

    def _has_reliable_body(self, keypoints: np.ndarray, scores: np.ndarray) -> bool:
        core_ok = sum(scores[index] >= self.min_confidence for index in CORE_ALIGNMENT_JOINTS) >= 4
        legs_ok = sum(scores[index] >= self.min_confidence for index in REQUIRED_LEG_JOINTS) >= 3
        geometry_ok = all(np.any(keypoints[index]) for index in CORE_ALIGNMENT_JOINTS)
        return bool(core_ok and legs_ok and geometry_ok)

    def _smooth(self, keypoints: np.ndarray, state: GhostCoachState) -> np.ndarray:
        if state.smoothed_keypoints is None:
            smoothed = keypoints.copy()
        else:
            alpha = self.smoothing_alpha
            smoothed = alpha * keypoints + (1.0 - alpha) * state.smoothed_keypoints
        state.smoothed_keypoints = smoothed.astype(np.float32)
        return state.smoothed_keypoints

    def _select_guides(self, errors: list[dict], state: GhostCoachState) -> list[str]:
        current = {
            str(error.get("code")): float(error.get("severity", 0.0))
            for error in errors
            if error.get("code") in self.guide_provider.errors
        }
        for code in self.guide_provider.errors:
            if code in current:
                state.error_streaks[code] = state.error_streaks.get(code, 0) + 1
                state.clear_streaks[code] = 0
                state.last_severity[code] = current[code]
                if state.error_streaks[code] >= self.persistence_frames:
                    state.active_codes.add(code)
            else:
                state.error_streaks[code] = 0
                state.clear_streaks[code] = state.clear_streaks.get(code, 0) + 1
                if state.clear_streaks[code] >= self.clear_frames:
                    state.active_codes.discard(code)

        ordered = sorted(
            state.active_codes,
            key=lambda code: state.last_severity.get(code, 0.0),
            reverse=True,
        )
        return ordered[: self.max_guides]

    def _joint_states(self, errors: list[dict]) -> dict[str, str]:
        states = {str(index): "good" for index in range(17)}
        ranked = sorted(errors, key=lambda item: float(item.get("severity", 0.0)))
        for error in ranked:
            meta = self.guide_provider.errors.get(str(error.get("code")))
            if not meta:
                continue
            for joint in meta["joints"]:
                states[str(joint)] = str(meta["state"])
        return states

    def _resolve_frame_size(
        self,
        keypoints: np.ndarray,
        frame_size: tuple[int, int] | None,
    ) -> tuple[int, int]:
        max_x = float(np.max(keypoints[:, 0]))
        max_y = float(np.max(keypoints[:, 1]))
        width = int(frame_size[0]) if frame_size else 0
        height = int(frame_size[1]) if frame_size else 0
        width = max(width, int(max_x * 1.08), 1)
        height = max(height, int(max_y * 1.08), 1)
        return width, height

    def _normalized_points(
        self,
        points: np.ndarray,
        scores: np.ndarray,
        width: int,
        height: int,
    ) -> list[list[float]]:
        result = []
        for index, point in enumerate(points):
            result.append(
                [
                    round(float(np.clip(point[0] / width, 0.0, 1.0)), 5),
                    round(float(np.clip(point[1] / height, 0.0, 1.0)), 5),
                    round(float(scores[index]), 3),
                ]
            )
        return result

    def _unavailable(self, reason: str, message: str) -> dict:
        return {
            "available": False,
            "reason": reason,
            "message": message,
            "standard_id": self.standard_id,
            "template_version": self.version,
            "guides": [],
            "max_guides": self.max_guides,
        }
