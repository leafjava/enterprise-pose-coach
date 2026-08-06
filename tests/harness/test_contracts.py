import json
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[2]


class HarnessContractTests(unittest.TestCase):
    def test_required_package_scripts_exist(self):
        package = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
        self.assertTrue({"install", "dev", "test", "check", "demo"}.issubset(package["scripts"]))

    def test_demo_seed_is_synthetic_and_matches_current_api(self):
        seed = json.loads((ROOT / "data/demo/enterprise_demo.json").read_text(encoding="utf-8"))
        self.assertEqual(seed["data_classification"], "synthetic")
        self.assertEqual(seed["current_api_adapter"]["start_session"]["exercise"], "squats")
        self.assertGreaterEqual(seed["current_api_adapter"]["certification"]["rep_count"], 50)

    def test_prd_has_all_requested_sections(self):
        prd = (ROOT / "docs/PRD.md").read_text(encoding="utf-8")
        sections = [
            "项目一句话描述", "目标用户", "用户痛点", "Demo 场景", "MVP 功能列表",
            "明确不做什么", "数据模型", "API 列表", "页面列表", "成功验收标准",
            "48 小时开发计划", "最大技术风险和备选方案",
        ]
        for section in sections:
            with self.subTest(section=section):
                self.assertIn(section, prd)


if __name__ == "__main__":
    unittest.main()
