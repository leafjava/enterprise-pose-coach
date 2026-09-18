from __future__ import annotations

from typing import Iterable, List, Tuple

import cv2
import numpy as np

from .types import ObjectDetection, PersonPose, SKELETON


def draw_scene(
    frame: np.ndarray,
    poses: Iterable[PersonPose],
    polygons: Iterable[List[Tuple[float, float]]],
    keypoint_confidence: float,
    objects: Iterable[ObjectDetection] = (),
) -> np.ndarray:
    for polygon in polygons:
        points = np.array(polygon, dtype=np.int32)
        overlay = frame.copy()
        cv2.fillPoly(overlay, [points], (0, 0, 200))
        cv2.addWeighted(overlay, 0.16, frame, 0.84, 0, frame)
        cv2.polylines(frame, [points], True, (0, 0, 255), 2)

    for pose in poses:
        x1, y1, x2, y2 = (int(value) for value in pose.bbox)
        cv2.rectangle(frame, (x1, y1), (x2, y2), (30, 210, 60), 2)
        cv2.putText(
            frame,
            f"ID {pose.track_id} {pose.confidence:.2f}",
            (x1, max(18, y1 - 8)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.55,
            (30, 210, 60),
            2,
            cv2.LINE_AA,
        )
        for start, end in SKELETON:
            a = pose.keypoints.get(start)
            b = pose.keypoints.get(end)
            if a and b and a.confidence >= keypoint_confidence and b.confidence >= keypoint_confidence:
                cv2.line(frame, (int(a.x), int(a.y)), (int(b.x), int(b.y)), (255, 180, 30), 2)
        for point in pose.keypoints.values():
            if point.confidence >= keypoint_confidence:
                cv2.circle(frame, (int(point.x), int(point.y)), 3, (0, 255, 255), -1)

    colors = {
        "hardhat": (50, 220, 80),
        "helmet": (50, 220, 80),
        "head": (40, 170, 255),
        "no_helmet": (20, 20, 240),
    }
    for item in objects:
        x1, y1, x2, y2 = (int(value) for value in item.bbox)
        color = colors.get(item.label, (190, 100, 220))
        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
        cv2.putText(
            frame,
            f"{item.label} {item.confidence:.2f}",
            (x1, max(18, y1 - 6)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.48,
            color,
            1,
            cv2.LINE_AA,
        )
    return frame
