"""Check required hackathon documents, sections, scripts, and demo seed."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

REQUIRED_FILES = [
    "README.md",
    "docs/PRD.md",
    "docs/architecture.md",
    "docs/acceptance.md",
    "docs/tasks.md",
    "data/demo/enterprise_demo.json",
    "requirements-harness.txt",
    "package.json",
]

PRD_SECTIONS = [
    "项目一句话描述",
    "目标用户",
    "用户痛点",
    "Demo 场景",
    "MVP 功能列表",
    "明确不做什么",
    "数据模型",
    "API 列表",
    "页面列表",
    "成功验收标准",
    "48 小时开发计划",
    "最大技术风险和备选方案",
]

REQUIRED_SCRIPTS = {"install", "dev", "test", "check", "demo"}


def main() -> None:
    missing = [name for name in REQUIRED_FILES if not (ROOT / name).is_file()]
    if missing:
        raise SystemExit(f"Missing required files: {', '.join(missing)}")

    prd = (ROOT / "docs" / "PRD.md").read_text(encoding="utf-8")
    missing_sections = [section for section in PRD_SECTIONS if section not in prd]
    if missing_sections:
        raise SystemExit(f"PRD missing sections: {', '.join(missing_sections)}")

    package = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
    scripts = set(package.get("scripts", {}))
    if not REQUIRED_SCRIPTS.issubset(scripts):
        raise SystemExit(f"package.json missing scripts: {sorted(REQUIRED_SCRIPTS - scripts)}")

    seed = json.loads((ROOT / "data" / "demo" / "enterprise_demo.json").read_text(encoding="utf-8"))
    required_seed_keys = {"scenario_id", "data_classification", "proposed_skill_request", "current_api_adapter", "expected"}
    if not required_seed_keys.issubset(seed):
        raise SystemExit(f"demo seed missing keys: {sorted(required_seed_keys - set(seed))}")
    if seed["data_classification"] != "synthetic":
        raise SystemExit("demo seed must be explicitly classified as synthetic")

    tasks = (ROOT / "docs" / "tasks.md").read_text(encoding="utf-8")
    if "| todo |" not in tasks or "| done |" not in tasks:
        raise SystemExit("tasks.md must contain both todo and done rows")

    print(f"Documentation contract passed: {len(REQUIRED_FILES)} files, {len(PRD_SECTIONS)} PRD sections")


if __name__ == "__main__":
    main()
