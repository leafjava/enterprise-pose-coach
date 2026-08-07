from contextlib import redirect_stdout
import io
import json
from pathlib import Path
import tempfile
import unittest

from tools.ghost_coach_study import evaluate_study, main, validate_record


def participant(index, environment="quiet", *, fatigue=False, understood=True, comfort=4):
    return {
        "participant_code": f"P{index:02d}",
        "environment": environment,
        "understanding_seconds_text": 8.0,
        "understanding_seconds_visual": 3.0,
        "corrected_text": True,
        "corrected_visual": True,
        "arrows_understood": understood,
        "occlusion_reported": False,
        "visual_fatigue_reported": fatigue,
        "pulse_comfort": comfort,
        "notes": "",
        "attestation": "recorded_from_real_participant",
    }


class GhostCoachStudyHarnessTests(unittest.TestCase):
    def test_empty_template_is_truthfully_incomplete(self):
        result = evaluate_study({"records": []})
        self.assertEqual(result["status"], "incomplete")
        self.assertEqual(result["participant_count"], 0)

    def test_five_valid_people_with_required_environments_pass(self):
        records = [
            participant(1, "silent"),
            participant(2, "noisy"),
            participant(3),
            participant(4),
            participant(5),
        ]
        result = evaluate_study({"records": records})
        self.assertEqual(result["status"], "passed")
        self.assertTrue(all(result["checks"].values()))

    def test_fatigue_or_missing_scene_prevents_false_pass(self):
        records = [participant(index, fatigue=(index == 3)) for index in range(1, 6)]
        result = evaluate_study({"records": records})
        self.assertEqual(result["status"], "incomplete")
        self.assertFalse(result["checks"]["silent_environment_covered"])
        self.assertFalse(result["checks"]["no_visual_fatigue_reported"])

    def test_personal_name_like_code_and_bad_comfort_are_rejected(self):
        record = participant(1)
        record["participant_code"] = "张 三"
        record["pulse_comfort"] = 6
        problems = validate_record(record)
        self.assertTrue(any("anonymous code" in problem for problem in problems))
        self.assertTrue(any("pulse_comfort" in problem for problem in problems))

    def test_record_command_appends_observation_without_claiming_early_pass(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "study.json"
            path.write_text(json.dumps({"study_id": "test", "records": []}), encoding="utf-8")
            arguments = [
                "--input", str(path), "record",
                "--participant", "P01",
                "--environment", "silent",
                "--understanding-text", "8",
                "--understanding-visual", "3",
                "--corrected-text", "yes",
                "--corrected-visual", "yes",
                "--arrows-understood", "yes",
                "--occlusion", "no",
                "--visual-fatigue", "no",
                "--pulse-comfort", "4",
            ]
            with redirect_stdout(io.StringIO()):
                exit_code = main(arguments)
            saved = json.loads(path.read_text(encoding="utf-8"))

        self.assertEqual(exit_code, 1)
        self.assertEqual(len(saved["records"]), 1)
        self.assertEqual(saved["records"][0]["attestation"], "recorded_from_real_participant")


if __name__ == "__main__":
    unittest.main()
