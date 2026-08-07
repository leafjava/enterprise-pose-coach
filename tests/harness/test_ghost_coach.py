import json
from pathlib import Path
import tempfile
import unittest

import numpy as np

from src.ghost_coach import (
    GhostCoachEngine,
    GhostCoachState,
    align_template_to_pose,
    mirror_coco17_template,
)


class DemoGuideProvider:
    errors = {
        "lift_hips_back": {
            "label": "髋部向后",
            "joints": [11, 12],
            "state": "warn",
        }
    }

    def build_guide(self, code, current, target, width, height):
        if code not in self.errors:
            return None
        start = np.mean(current[[11, 12]], axis=0)
        return {
            "code": code,
            "label": self.errors[code]["label"],
            "arrows": [{
                "start": [float(start[0] / width), float(start[1] / height)],
                "end": [float((start[0] - 20.0) / width), float(start[1] / height)],
            }],
        }


def make_squat_pose(
    knee_angle=170.0,
    knee_span=120.0,
    ankle_span=150.0,
    torso_shift=0.0,
):
    pose = np.zeros((17, 2), dtype=np.float32)
    center_x = 200.0
    knee_y = 280.0
    ankle_y = 360.0
    segment = 82.0
    bend = np.radians(180.0 - knee_angle)
    hip_dx = segment * np.sin(bend)
    hip_dy = segment * np.cos(bend)

    pose[15] = [center_x - ankle_span / 2.0, ankle_y]
    pose[16] = [center_x + ankle_span / 2.0, ankle_y]
    pose[13] = [center_x - knee_span / 2.0, knee_y]
    pose[14] = [center_x + knee_span / 2.0, knee_y]
    pose[11] = [pose[13][0] + hip_dx, knee_y - hip_dy]
    pose[12] = [pose[14][0] - hip_dx, knee_y - hip_dy]
    pose[5] = [pose[11][0] + torso_shift, pose[11][1] - 92.0]
    pose[6] = [pose[12][0] + torso_shift, pose[12][1] - 92.0]
    pose[7] = [pose[5][0] - 18.0, pose[5][1] + 52.0]
    pose[8] = [pose[6][0] + 18.0, pose[6][1] + 52.0]
    pose[9] = [pose[7][0] - 14.0, pose[7][1] + 40.0]
    pose[10] = [pose[8][0] + 14.0, pose[8][1] + 40.0]
    pose[0] = [(pose[5][0] + pose[6][0]) / 2.0, pose[5][1] - 55.0]
    pose[1] = [pose[0][0] - 8.0, pose[0][1] - 3.0]
    pose[2] = [pose[0][0] + 8.0, pose[0][1] - 3.0]
    pose[3] = [pose[0][0] - 15.0, pose[0][1]]
    pose[4] = [pose[0][0] + 15.0, pose[0][1]]
    return pose


class GhostCoachGeometryTests(unittest.TestCase):
    def setUp(self):
        self.engine = GhostCoachEngine()
        self.pose = make_squat_pose(knee_angle=110.0)
        self.confidence = np.ones(17, dtype=np.float32)

    def test_standard_has_four_versioned_coco17_phase_templates(self):
        self.assertEqual(self.engine.standard_id, "RECRUIT_SQUAT_50_V1")
        self.assertTrue(self.engine.version)
        for phase, expected in (
            ("ready", "ready"),
            ("lowering", "descending"),
            ("bottom", "bottom"),
            ("rising", "rising"),
        ):
            name, points = self.engine.template_for_phase(phase)
            self.assertEqual(name, expected)
            self.assertEqual(points.shape, (17, 2))

    def test_alignment_anchors_hips_and_scales_to_body(self):
        _, template = self.engine.template_for_phase("bottom")
        aligned = align_template_to_pose(template, self.pose)
        current_hip = np.mean(self.pose[[11, 12]], axis=0)
        target_hip = np.mean(aligned[[11, 12]], axis=0)

        np.testing.assert_allclose(target_hip, current_hip, atol=1e-4)
        self.assertGreater(np.linalg.norm(aligned[5] - aligned[6]), 20.0)
        self.assertGreater(np.linalg.norm(aligned[11] - aligned[15]), 50.0)

    def test_mirror_preserves_left_right_semantics(self):
        _, template = self.engine.template_for_phase("ready")
        asymmetric = template.copy()
        asymmetric[9, 0] -= 0.05
        mirrored = mirror_coco17_template(asymmetric)

        self.assertAlmostEqual(float(mirrored[9, 0]), float(template[9, 0]), places=5)
        self.assertNotAlmostEqual(float(mirrored[10, 0]), float(template[10, 0]), places=5)

    def test_guides_require_persistence_and_are_limited_to_two_problems(self):
        state = GhostCoachState()
        errors = [
            {"code": "squat_knees_out", "severity": 0.95},
            {"code": "squat_depth", "severity": 0.75},
            {"code": "squat_chest_up", "severity": 0.70},
        ]
        first = self.engine.build_payload(
            exercise="squats",
            phase="bottom",
            keypoints=self.pose,
            errors=errors,
            state=state,
            frame_size=(400, 420),
            confidences=self.confidence,
        )
        second = self.engine.build_payload(
            exercise="squats",
            phase="bottom",
            keypoints=self.pose,
            errors=errors,
            state=state,
            frame_size=(400, 420),
            confidences=self.confidence,
        )

        self.assertEqual(first["guides"], [])
        self.assertEqual([guide["code"] for guide in second["guides"]], ["squat_knees_out", "squat_depth"])
        self.assertLessEqual(len(second["guides"]), 2)

    def test_knee_depth_and_chest_arrows_point_in_expected_directions(self):
        cases = [
            ("squat_knees_out", 0.95),
            ("squat_depth", 0.75),
            ("squat_chest_up", 0.70),
        ]
        for code, severity in cases:
            with self.subTest(code=code):
                state = GhostCoachState()
                error = [{"code": code, "severity": severity}]
                self.engine.build_payload(
                    exercise="squats", phase="bottom", keypoints=self.pose,
                    errors=error, state=state, frame_size=(400, 420), confidences=self.confidence,
                )
                payload = self.engine.build_payload(
                    exercise="squats", phase="bottom", keypoints=self.pose,
                    errors=error, state=state, frame_size=(400, 420), confidences=self.confidence,
                )
                arrows = payload["guides"][0]["arrows"]
                if code == "squat_knees_out":
                    self.assertEqual(len(arrows), 2)
                    directions = sorted(arrow["end"][0] - arrow["start"][0] for arrow in arrows)
                    self.assertLess(directions[0], 0.0)
                    self.assertGreater(directions[1], 0.0)
                elif code == "squat_depth":
                    self.assertGreater(arrows[0]["end"][1], arrows[0]["start"][1])
                else:
                    self.assertLess(arrows[0]["end"][1], arrows[0]["start"][1])

    def test_guides_clear_only_after_two_stable_frames(self):
        state = GhostCoachState()
        error = [{"code": "squat_knees_out", "severity": 0.95}]
        for _ in range(2):
            active = self.engine.build_payload(
                exercise="squats", phase="bottom", keypoints=self.pose,
                errors=error, state=state, frame_size=(400, 420), confidences=self.confidence,
            )
        first_clear = self.engine.build_payload(
            exercise="squats", phase="bottom", keypoints=self.pose,
            errors=[], state=state, frame_size=(400, 420), confidences=self.confidence,
        )
        second_clear = self.engine.build_payload(
            exercise="squats", phase="bottom", keypoints=self.pose,
            errors=[], state=state, frame_size=(400, 420), confidences=self.confidence,
        )

        self.assertTrue(active["guides"])
        self.assertTrue(first_clear["guides"])
        self.assertEqual(second_clear["guides"], [])

    def test_low_confidence_hides_target_and_arrows(self):
        confidence = np.ones(17, dtype=np.float32)
        confidence[[5, 6, 11, 12, 13, 14, 15, 16]] = 0.1
        payload = self.engine.build_payload(
            exercise="squats", phase="ready", keypoints=self.pose,
            errors=[], state=GhostCoachState(), frame_size=(400, 420), confidences=confidence,
        )

        self.assertFalse(payload["available"])
        self.assertEqual(payload["reason"], "low_confidence")
        self.assertNotIn("target_keypoints", payload)
        self.assertEqual(payload["guides"], [])

    def test_unsupported_exercise_uses_extension_fallback(self):
        payload = self.engine.build_payload(
            exercise="pushups", phase="ready", keypoints=self.pose,
            errors=[], state=GhostCoachState(), frame_size=(400, 420), confidences=self.confidence,
        )

        self.assertFalse(payload["available"])
        self.assertEqual(payload["reason"], "unsupported_exercise")

    def test_other_exercises_can_inject_templates_and_arrow_provider(self):
        config = dict(self.engine.config)
        config["standard_id"] = "SAFE_LIFT_DEMO_V1"
        config["exercise"] = "safe_lift"
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "safe_lift.json"
            path.write_text(json.dumps(config), encoding="utf-8")
            engine = GhostCoachEngine(path, guide_provider=DemoGuideProvider())
            state = GhostCoachState()
            error = [{"code": "lift_hips_back", "severity": 0.8}]
            engine.build_payload(
                exercise="safe_lift", phase="ready", keypoints=self.pose,
                errors=error, state=state, frame_size=(400, 420), confidences=self.confidence,
            )
            payload = engine.build_payload(
                exercise="safe_lift", phase="ready", keypoints=self.pose,
                errors=error, state=state, frame_size=(400, 420), confidences=self.confidence,
            )

        self.assertTrue(payload["available"])
        self.assertEqual(payload["standard_id"], "SAFE_LIFT_DEMO_V1")
        self.assertEqual(payload["guides"][0]["code"], "lift_hips_back")


if __name__ == "__main__":
    unittest.main()
