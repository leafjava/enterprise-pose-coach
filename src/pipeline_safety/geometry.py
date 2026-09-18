from __future__ import annotations

import math
from typing import Iterable, Optional, Sequence, Tuple

from .types import Keypoint


Point = Tuple[float, float]
BBox = Tuple[float, float, float, float]


def midpoint(a: Keypoint, b: Keypoint, min_confidence: float) -> Optional[Point]:
    if a.confidence < min_confidence or b.confidence < min_confidence:
        return None
    return ((a.x + b.x) / 2.0, (a.y + b.y) / 2.0)


def angle_from_vertical(top: Point, bottom: Point) -> float:
    """返回躯干轴相对竖直方向的 0～90 度夹角。"""
    dx = top[0] - bottom[0]
    dy = top[1] - bottom[1]
    length = math.hypot(dx, dy)
    if length <= 1e-6:
        return 0.0
    cosine = max(-1.0, min(1.0, abs(dy) / length))
    return math.degrees(math.acos(cosine))


def point_in_polygon(point: Point, polygon: Sequence[Point]) -> bool:
    """射线法判断点是否位于多边形内部；边界点视为内部。"""
    x, y = point
    inside = False
    count = len(polygon)
    for i in range(count):
        x1, y1 = polygon[i]
        x2, y2 = polygon[(i + 1) % count]
        cross = (x - x1) * (y2 - y1) - (y - y1) * (x2 - x1)
        if abs(cross) < 1e-8 and min(x1, x2) <= x <= max(x1, x2) and min(y1, y2) <= y <= max(y1, y2):
            return True
        if (y1 > y) != (y2 > y):
            intersect_x = (x2 - x1) * (y - y1) / (y2 - y1) + x1
            if x <= intersect_x:
                inside = not inside
    return inside


def normalized_polygon(polygon: Iterable[Iterable[float]], width: int, height: int) -> list[Point]:
    return [(float(x) * width, float(y) * height) for x, y in polygon]


def bbox_center(box: BBox) -> Point:
    return ((box[0] + box[2]) / 2.0, (box[1] + box[3]) / 2.0)


def point_in_bbox(point: Point, box: BBox) -> bool:
    return box[0] <= point[0] <= box[2] and box[1] <= point[1] <= box[3]


def boxes_intersect(a: BBox, b: BBox) -> bool:
    return max(a[0], b[0]) <= min(a[2], b[2]) and max(a[1], b[1]) <= min(a[3], b[3])
