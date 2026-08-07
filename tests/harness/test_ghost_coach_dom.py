from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[2]


class GhostCoachDomContractTests(unittest.TestCase):
    def test_both_live_pages_mount_the_overlay_and_demo_hook(self):
        for relative in ("templates/index.html", "templates/certification.html"):
            with self.subTest(template=relative):
                markup = (ROOT / relative).read_text(encoding="utf-8")
                for token in (
                    "/static/ghost-coach.css",
                    "/static/ghost-coach.js",
                    'id="ghostCoachCanvas"',
                    'id="ghostCoachStatus"',
                    "payload.ghost_coach",
                    'get("ghost_demo")',
                    "window.GhostCoachDemo.start",
                ):
                    self.assertIn(token, markup)

    def test_renderer_enforces_visual_safety_contract(self):
        script = (ROOT / "static/ghost-coach.js").read_text(encoding="utf-8")
        stylesheet = (ROOT / "static/ghost-coach.css").read_text(encoding="utf-8")

        self.assertIn("slice(0, Number(payload.max_guides || 2))", script)
        self.assertIn("Math.min(1.5, Math.max(0.5", script)
        self.assertIn("prefers-reduced-motion", script)
        self.assertIn("setLineDash(style.dashed ? [8, 7] : [])", script)
        self.assertIn('@media (prefers-reduced-motion: reduce)', stylesheet)

    def test_demo_contains_reproducible_error_correct_counted_states(self):
        script = (ROOT / "static/ghost-coach.js").read_text(encoding="utf-8")
        for step in ('"error"', '"correct"', '"counted"'):
            self.assertIn(step, script)
        self.assertIn('demo_rep_count: count', script)
        self.assertIn('dataset.ghostDemoStep', script)


if __name__ == "__main__":
    unittest.main()
