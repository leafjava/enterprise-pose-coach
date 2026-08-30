"""Route and session-API contracts for the Flask app.

These exercise routing, request validation and the live-session payload shape —
not model accuracy — so they load `web_app` through the harness substitutes and
run on the minimal review environment (Flask + NumPy) as well as the full one.
"""

import io
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from tools.harness_support import load_harness_app  # noqa: E402


class FakeRecognizer:
    def __init__(self, result=None):
        self.result = result

    def push_frame(self, _frame):
        return self.result


class WebAppRouteTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls._runtime = tempfile.TemporaryDirectory(ignore_cleanup_errors=True)
        cls.web_app = load_harness_app(Path(cls._runtime.name))

    @classmethod
    def tearDownClass(cls):
        sys.modules.pop("web_app", None)
        cls._runtime.cleanup()

    def setUp(self):
        self.client = self.web_app.app.test_client()

    def test_webcam_upload_requires_video_field(self):
        response = self.client.post("/webcam-upload", data={}, content_type="multipart/form-data")
        self.assertEqual(response.status_code, 200)
        self.assertIn("未选择文件".encode("utf-8"), response.data)

    def test_webcam_upload_uses_shared_processor(self):
        with patch.object(self.web_app, "process_video_file", create=True) as mock_process:
            mock_process.return_value = {
                "action_name": "测试动作",
                "action_id": 0,
                "score": 0.9,
                "heart_rate": 90,
                "duration": 1.0,
                "frame_count": 10,
                "feedback": {
                    "evaluation": "",
                    "analysis": "",
                    "hr_eval": "",
                    "suggestion": "",
                    "encouragement": "",
                },
                "vis_image": "",
            }
            response = self.client.post(
                "/webcam-upload",
                data={"video": (io.BytesIO(b"fake-video"), "clip.webm")},
                content_type="multipart/form-data",
            )
            self.assertEqual(response.status_code, 200)
            self.assertTrue(mock_process.called)

    def test_start_session_requires_known_exercise(self):
        response = self.client.post("/api/session/start", json={"exercise": "burpee"})

        self.assertEqual(response.status_code, 400)
        self.assertIn("error", response.get_json())

    def test_frame_endpoint_returns_live_feedback(self):
        start = self.client.post("/api/session/start", json={"exercise": "squats"})
        self.assertEqual(start.status_code, 200)
        session_id = start.get_json()["session_id"]

        with patch.object(
            self.web_app,
            "extract_live_pose",
            return_value=np.zeros((17, 2), dtype=np.float32),
            create=True,
        ):
            response = self.client.post(
                "/api/session/frame",
                json={
                    "session_id": session_id,
                    "image_data": "data:image/jpeg;base64,ZmFrZQ==",
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertIn("rep_count", response.get_json())
        self.assertIn("primary_cue", response.get_json())
        self.assertEqual(response.get_json()["mode"], "manual")
        self.assertEqual(response.get_json()["active_exercise"], "squats")
        self.assertEqual(response.get_json()["active_exercise_label"], "深蹲")

    def test_frame_endpoint_uses_auto_recognition_when_available(self):
        start = self.client.post("/api/session/start", json={"exercise": "squats"})
        self.assertEqual(start.status_code, 200)
        session_id = start.get_json()["session_id"]

        with patch.object(
            self.web_app,
            "extract_live_pose",
            return_value=np.ones((17, 2), dtype=np.float32),
            create=True,
        ):
            with patch.object(
                self.web_app,
                "fitness_action_recognizer",
                FakeRecognizer({"action": "dumbbell_shoulder_press", "label": 4, "confidence": 0.91}),
                create=True,
            ):
                response = self.client.post(
                    "/api/session/frame",
                    json={
                        "session_id": session_id,
                        "image_data": "data:image/jpeg;base64,ZmFrZQ==",
                        "mode": "auto",
                    },
                )

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["mode"], "auto")
        self.assertEqual(payload["recognized_action"], "dumbbell_shoulder_press")
        self.assertEqual(payload["active_exercise"], "dumbbell_shoulder_press")
        self.assertEqual(payload["recognition_state"], "recognized")
        self.assertEqual(payload["coaching_mode"], "specialized")
        self.assertEqual(payload["active_exercise_label"], "哑铃肩推")

    def test_frame_endpoint_auto_mode_falls_back_while_warming_up(self):
        start = self.client.post("/api/session/start", json={"exercise": "lunges"})
        self.assertEqual(start.status_code, 200)
        session_id = start.get_json()["session_id"]

        with patch.object(
            self.web_app,
            "extract_live_pose",
            return_value=np.ones((17, 2), dtype=np.float32),
            create=True,
        ):
            with patch.object(
                self.web_app,
                "fitness_action_recognizer",
                FakeRecognizer(None),
                create=True,
            ):
                response = self.client.post(
                    "/api/session/frame",
                    json={
                        "session_id": session_id,
                        "image_data": "data:image/jpeg;base64,ZmFrZQ==",
                        "mode": "auto",
                    },
                )

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["mode"], "auto")
        self.assertEqual(payload["recognized_action"], "")
        self.assertEqual(payload["active_exercise"], "lunges")
        self.assertEqual(payload["recognition_state"], "warming_up")
        self.assertEqual(payload["active_exercise_label"], "弓步")

    def test_frame_endpoint_auto_mode_returns_generic_state_for_non_specialized_action(self):
        start = self.client.post("/api/session/start", json={"exercise": "situps"})
        self.assertEqual(start.status_code, 200)
        session_id = start.get_json()["session_id"]

        with patch.object(
            self.web_app,
            "extract_live_pose",
            return_value=np.ones((17, 2), dtype=np.float32),
            create=True,
        ):
            with patch.object(
                self.web_app,
                "fitness_action_recognizer",
                FakeRecognizer({"action": "situps", "label": 6, "confidence": 0.88}),
                create=True,
            ):
                response = self.client.post(
                    "/api/session/frame",
                    json={
                        "session_id": session_id,
                        "image_data": "data:image/jpeg;base64,ZmFrZQ==",
                        "mode": "auto",
                    },
                )

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["active_exercise"], "situps")
        self.assertEqual(payload["recognition_state"], "recognized")
        self.assertEqual(payload["coaching_mode"], "generic")
        self.assertEqual(payload["active_exercise_label"], "仰卧起坐")
        self.assertTrue("节奏" in payload["primary_cue"] or "稳定" in payload["primary_cue"])

    def test_stop_session_returns_summary(self):
        start = self.client.post("/api/session/start", json={"exercise": "squats"})
        self.assertEqual(start.status_code, 200)

        response = self.client.post(
            "/api/session/stop",
            json={"session_id": start.get_json()["session_id"]},
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("summary", response.get_json())


if __name__ == "__main__":
    unittest.main()
