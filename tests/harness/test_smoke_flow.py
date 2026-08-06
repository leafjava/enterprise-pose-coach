import unittest

from tools.smoke_test import run_smoke


class SmokeFlowTests(unittest.TestCase):
    def test_current_main_flow_runs_without_gpu(self):
        result = run_smoke()

        self.assertEqual(result["status"], "passed")
        self.assertEqual(result["mode"], "deterministic-harness-no-gpu")
        self.assertGreaterEqual(len(result["steps"]), 8)


if __name__ == "__main__":
    unittest.main()
