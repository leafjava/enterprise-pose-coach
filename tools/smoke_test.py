"""Deterministic end-to-end smoke test for the current Flask business flow."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from tools.harness_support import load_harness_app  # noqa: E402


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def run_smoke() -> dict:
    seed_path = ROOT / "data" / "demo" / "enterprise_demo.json"
    seed = json.loads(seed_path.read_text(encoding="utf-8"))
    adapter = seed["current_api_adapter"]
    steps = []

    with tempfile.TemporaryDirectory(prefix="pose-coach-smoke-") as temp_dir:
        web_app = load_harness_app(Path(temp_dir))
        client = web_app.app.test_client()

        for route in ("/", "/coach", "/certification"):
            response = client.get(route)
            _require(response.status_code == 200, f"{route} returned {response.status_code}")
            steps.append({"step": f"GET {route}", "status": response.status_code})

        unknown = client.post("/api/session/start", json={"exercise": "burpee"})
        _require(unknown.status_code == 400, "unknown exercise must return HTTP 400")
        steps.append({"step": "reject unknown exercise", "status": unknown.status_code})

        started = client.post("/api/session/start", json=adapter["start_session"])
        _require(started.status_code == 200, "session start failed")
        session_id = started.get_json()["session_id"]
        steps.append({"step": "start session", "session_id": session_id})

        frame_payload = {**adapter["frame"], "session_id": session_id}
        bottom = client.post("/api/session/frame", json=frame_payload)
        ready = client.post("/api/session/frame", json=frame_payload)
        _require(bottom.status_code == 200 and ready.status_code == 200, "frame evaluation failed")
        bottom_json = bottom.get_json()
        ready_json = ready.get_json()
        _require(ready_json["rep_count"] == 1, "bottom-to-ready cycle did not count one rep")
        for payload in (bottom_json, ready_json):
            ghost = payload.get("ghost_coach")
            _require(ghost is not None, "frame response missing ghost_coach payload")
            _require(ghost["available"], f"Ghost Coach unavailable: {ghost.get('reason')}")
            _require(ghost["standard_id"] == "RECRUIT_SQUAT_50_V1", "wrong pose standard")
            _require(len(ghost["target_keypoints"]) == 17, "target skeleton is not COCO-17")
        steps.append({
            "step": "evaluate bottom-to-ready with Ghost Coach",
            "rep_count": 1,
            "standard_id": ready_json["ghost_coach"]["standard_id"],
        })

        stopped = client.post("/api/session/stop", json={"session_id": session_id})
        _require(stopped.status_code == 200, "session stop failed")
        summary = stopped.get_json()["summary"]
        for key in ("rep_count", "top_mistakes", "next_focus"):
            _require(key in summary, f"summary missing {key}")
        _require(summary["rep_count"] == 1, "summary rep count mismatch")
        steps.append({"step": "stop and summarize", "summary": summary})

        certified = client.post("/api/certifications", json=adapter["certification"])
        _require(certified.status_code == 200, "certification creation failed")
        records = client.get("/api/certifications")
        _require(records.status_code == 200, "certification query failed")
        record_list = records.get_json()["records"]
        _require(len(record_list) == seed["expected"]["certification_record_count"], "record count mismatch")
        _require(record_list[0]["worker_id"] == adapter["certification"]["worker_id"], "record payload mismatch")
        steps.append({"step": "persist and query certification", "records": len(record_list)})

    return {
        "status": "passed",
        "scenario_id": seed["scenario_id"],
        "mode": "deterministic-harness-no-gpu",
        "steps": steps,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--pretty", action="store_true")
    args = parser.parse_args()
    result = run_smoke()
    print(json.dumps(result, ensure_ascii=False, indent=2 if args.pretty else None))


if __name__ == "__main__":
    main()
