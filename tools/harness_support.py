"""Test-only dependency substitutes for loading the existing Flask app without GPU.

This module deliberately lives in the harness. It does not alter production modules and
must never be presented as evidence of model accuracy.
"""

from __future__ import annotations

import os
from pathlib import Path
import sys
import types

import numpy as np


FITNESS_LABELS = {
    0: "other",
    1: "squats",
    2: "lunges",
    3: "pushups",
    4: "dumbbell_shoulder_press",
    5: "dumbbell_rows",
    6: "situps",
    7: "tricep_extensions",
    8: "bicep_curls",
    9: "lateral_shoulder_raises",
    10: "jumping_jacks",
}


def make_squat_pose(knee_angle: float) -> np.ndarray:
    """Return deterministic COCO-17 points used to exercise the real rule engine."""
    pose = np.zeros((17, 2), dtype=np.float32)
    center_x, knee_y, ankle_y, segment = 200.0, 280.0, 360.0, 82.0
    knee_span, ankle_span = 120.0, 150.0
    bend = np.radians(180.0 - knee_angle)
    hip_dx = segment * np.sin(bend)
    hip_dy = segment * np.cos(bend)

    pose[15] = [center_x - ankle_span / 2.0, ankle_y]
    pose[16] = [center_x + ankle_span / 2.0, ankle_y]
    pose[13] = [center_x - knee_span / 2.0, knee_y]
    pose[14] = [center_x + knee_span / 2.0, knee_y]
    pose[11] = [pose[13][0] + hip_dx, knee_y - hip_dy]
    pose[12] = [pose[14][0] - hip_dx, knee_y - hip_dy]
    pose[5] = [pose[11][0], pose[11][1] - 92.0]
    pose[6] = [pose[12][0], pose[12][1] - 92.0]
    pose[7] = [pose[5][0] - 18.0, pose[5][1] + 52.0]
    pose[8] = [pose[6][0] + 18.0, pose[6][1] + 52.0]
    pose[9] = [pose[7][0] - 14.0, pose[7][1] + 40.0]
    pose[10] = [pose[8][0] + 14.0, pose[8][1] + 40.0]
    return pose


class _AlternatingPoseEstimator:
    def __init__(self) -> None:
        self.calls = 0

    def __call__(self, _frame):
        self.calls += 1
        angle = 95.0 if self.calls % 2 else 170.0
        points = make_squat_pose(angle)
        return np.asarray([points]), np.ones((1, 17), dtype=np.float32)


class _FakeSTGCN:
    def __init__(self, *args, **kwargs):
        pass

    def load_state_dict(self, _state):
        return self

    def to(self, _device):
        return self

    def eval(self):
        return self

    def predict(self, _input):
        return np.asarray([[1]]), np.asarray([[0.99]])


class _FakeCapture:
    def __init__(self, _path):
        pass

    def get(self, _prop):
        return 1

    def set(self, _prop, _value):
        return True

    def read(self):
        return False, None

    def release(self):
        return True


def _install_dependency_substitutes() -> None:
    fake_cv2 = types.ModuleType("cv2")
    fake_cv2.CAP_PROP_FOURCC = 6
    fake_cv2.CAP_PROP_FRAME_COUNT = 7
    fake_cv2.CAP_PROP_POS_FRAMES = 1
    fake_cv2.IMREAD_COLOR = 1
    fake_cv2.VideoCapture = _FakeCapture
    fake_cv2.imdecode = lambda *_args, **_kwargs: np.zeros((8, 8, 3), dtype=np.uint8)
    fake_cv2.line = lambda *_args, **_kwargs: None
    fake_cv2.circle = lambda *_args, **_kwargs: None
    fake_cv2.imwrite = lambda *_args, **_kwargs: True

    fake_torch = types.ModuleType("torch")
    fake_torch.cuda = types.SimpleNamespace(is_available=lambda: False)
    fake_torch.device = lambda name: name
    fake_torch.load = lambda *_args, **_kwargs: {}

    fake_ffmpeg = types.ModuleType("imageio_ffmpeg")
    fake_ffmpeg.get_ffmpeg_exe = lambda: "ffmpeg"

    fake_datapro = types.ModuleType("src.datapro")
    fake_datapro.PreProcess = lambda _keypoints: np.zeros((2, 250, 17), dtype=np.float32)

    fake_infer = types.ModuleType("src.fitness_infer")
    fake_infer.FITNESS_LABELS = FITNESS_LABELS
    fake_infer.load_fitness_action_recognizer = lambda *_args, **_kwargs: None

    fake_model = types.ModuleType("src.model")
    fake_model.ST_GCN = _FakeSTGCN

    fake_score = types.ModuleType("src.score")
    fake_score.Score = lambda *_args, **_kwargs: 0.9

    fake_llm = types.ModuleType("src.local_llm")
    fake_llm.chat_with_ollama_model = lambda *_args, **_kwargs: {
        "message": {"content": "[动作评价] Harness 模式\n[改进建议] 保持稳定"}
    }

    estimator = _AlternatingPoseEstimator()
    fake_rtmpose = types.ModuleType("src.rtmpose_tran")
    fake_rtmpose.body = estimator
    fake_rtmpose.RTM_Pose_Tran = lambda *_args, **_kwargs: (
        True,
        np.asarray([make_squat_pose(95.0), make_squat_pose(170.0)]),
    )

    sys.modules.update(
        {
            "cv2": fake_cv2,
            "torch": fake_torch,
            "imageio_ffmpeg": fake_ffmpeg,
            "src.datapro": fake_datapro,
            "src.fitness_infer": fake_infer,
            "src.model": fake_model,
            "src.score": fake_score,
            "src.local_llm": fake_llm,
            "src.rtmpose_tran": fake_rtmpose,
        }
    )


def load_harness_app(runtime_dir: Path):
    """Load the unmodified web_app module with deterministic heavy dependencies."""
    runtime_dir = Path(runtime_dir).resolve()
    runtime_dir.mkdir(parents=True, exist_ok=True)
    video_dir = runtime_dir / "videos"
    video_dir.mkdir(exist_ok=True)
    os.environ["POSE_RUNTIME_DIR"] = str(runtime_dir)
    os.environ["POSE_VIDEO_DIR"] = str(video_dir)

    _install_dependency_substitutes()
    sys.modules.pop("web_app", None)
    import web_app  # pylint: disable=import-outside-toplevel

    web_app.app.config.update(TESTING=True)
    web_app.CERTIFICATIONS_FILE = str(runtime_dir / "certifications.json")
    return web_app
