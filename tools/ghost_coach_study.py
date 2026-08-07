"""Record and validate the T-050 Ghost Coach real-participant study.

The tool deliberately starts with zero records and never generates participant
answers. Participant IDs must be anonymous codes rather than names or employee
IDs. A passing result requires five unique real participants plus the required
silent/noisy coverage and comfort thresholds.
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import re
import sys
from typing import Iterable


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_STUDY_PATH = ROOT / "data" / "usability" / "ghost-coach-study.json"
PARTICIPANT_PATTERN = re.compile(r"^[A-Za-z][A-Za-z0-9_-]{1,19}$")
ENVIRONMENTS = {"quiet", "noisy", "silent"}


def _boolean(value: str) -> bool:
    normalized = value.strip().lower()
    if normalized in {"yes", "y", "true", "1"}:
        return True
    if normalized in {"no", "n", "false", "0"}:
        return False
    raise argparse.ArgumentTypeError("Expected yes/no")


def load_study(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def validate_record(record: dict) -> list[str]:
    errors = []
    participant = str(record.get("participant_code", ""))
    if not PARTICIPANT_PATTERN.fullmatch(participant):
        errors.append("participant_code must be a 2-20 character anonymous code")
    if record.get("environment") not in ENVIRONMENTS:
        errors.append("environment must be quiet, noisy, or silent")
    for key in ("understanding_seconds_text", "understanding_seconds_visual"):
        value = record.get(key)
        if not isinstance(value, (int, float)) or isinstance(value, bool) or value < 0:
            errors.append(f"{key} must be a non-negative number")
    for key in (
        "corrected_text",
        "corrected_visual",
        "arrows_understood",
        "occlusion_reported",
        "visual_fatigue_reported",
    ):
        if not isinstance(record.get(key), bool):
            errors.append(f"{key} must be true or false")
    comfort = record.get("pulse_comfort")
    if not isinstance(comfort, int) or isinstance(comfort, bool) or not 1 <= comfort <= 5:
        errors.append("pulse_comfort must be an integer from 1 to 5")
    if len(str(record.get("notes", ""))) > 200:
        errors.append("notes must be no longer than 200 characters")
    if record.get("attestation") != "recorded_from_real_participant":
        errors.append("attestation must confirm a real participant observation")
    return errors


def evaluate_study(study: dict) -> dict:
    records = study.get("records", [])
    record_errors = []
    for index, record in enumerate(records):
        for message in validate_record(record):
            record_errors.append(f"record[{index}]: {message}")

    participant_codes = [str(record.get("participant_code", "")) for record in records]
    unique_codes = set(participant_codes)
    environments = {record.get("environment") for record in records}
    valid_records = not record_errors and len(unique_codes) == len(records)
    arrow_rate = (
        sum(bool(record.get("arrows_understood")) for record in records) / len(records)
        if records else 0.0
    )
    fatigue_count = sum(bool(record.get("visual_fatigue_reported")) for record in records)
    comforts = sorted(
        int(record["pulse_comfort"])
        for record in records
        if isinstance(record.get("pulse_comfort"), int)
        and not isinstance(record.get("pulse_comfort"), bool)
    )
    median_comfort = comforts[len(comforts) // 2] if comforts else 0

    checks = {
        "records_are_valid": valid_records,
        "five_unique_real_participants": len(records) >= 5 and len(unique_codes) >= 5,
        "silent_environment_covered": "silent" in environments,
        "noisy_environment_covered": "noisy" in environments,
        "arrows_understood_by_at_least_80_percent": arrow_rate >= 0.8,
        "no_visual_fatigue_reported": fatigue_count == 0 and len(records) >= 5,
        "median_pulse_comfort_at_least_4_of_5": median_comfort >= 4,
    }
    return {
        "status": "passed" if all(checks.values()) else "incomplete",
        "participant_count": len(records),
        "unique_participant_count": len(unique_codes),
        "environments": sorted(value for value in environments if value),
        "arrow_understanding_rate": round(arrow_rate, 3),
        "visual_fatigue_reports": fatigue_count,
        "median_pulse_comfort": median_comfort,
        "checks": checks,
        "record_errors": record_errors,
    }


def _save_study(path: Path, study: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(
        json.dumps(study, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    temporary.replace(path)


def _record_from_args(args: argparse.Namespace) -> dict:
    return {
        "participant_code": args.participant,
        "environment": args.environment,
        "understanding_seconds_text": args.understanding_text,
        "understanding_seconds_visual": args.understanding_visual,
        "corrected_text": args.corrected_text,
        "corrected_visual": args.corrected_visual,
        "arrows_understood": args.arrows_understood,
        "occlusion_reported": args.occlusion,
        "visual_fatigue_reported": args.visual_fatigue,
        "pulse_comfort": args.pulse_comfort,
        "notes": args.notes,
        "recorded_at": datetime.now(timezone.utc).isoformat(),
        "attestation": "recorded_from_real_participant",
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Ghost Coach T-050 real-user study harness")
    parser.add_argument("--input", type=Path, default=DEFAULT_STUDY_PATH)
    subparsers = parser.add_subparsers(dest="command")
    subparsers.add_parser("status", help="Validate the current study data")
    record = subparsers.add_parser("record", help="Append one anonymous real-participant result")
    record.add_argument("--participant", required=True, help="Anonymous code such as P01; never enter a name")
    record.add_argument("--environment", choices=sorted(ENVIRONMENTS), required=True)
    record.add_argument("--understanding-text", type=float, required=True)
    record.add_argument("--understanding-visual", type=float, required=True)
    record.add_argument("--corrected-text", type=_boolean, required=True)
    record.add_argument("--corrected-visual", type=_boolean, required=True)
    record.add_argument("--arrows-understood", type=_boolean, required=True)
    record.add_argument("--occlusion", type=_boolean, required=True)
    record.add_argument("--visual-fatigue", type=_boolean, required=True)
    record.add_argument("--pulse-comfort", type=int, choices=range(1, 6), required=True)
    record.add_argument("--notes", default="")
    return parser


def main(argv: Iterable[str] | None = None) -> int:
    args = build_parser().parse_args(list(argv) if argv is not None else None)
    command = args.command or "status"
    study = load_study(args.input)
    if command == "record":
        record = _record_from_args(args)
        problems = validate_record(record)
        if problems:
            print(json.dumps({"status": "invalid", "errors": problems}, ensure_ascii=False, indent=2))
            return 2
        codes = {item.get("participant_code") for item in study.get("records", [])}
        if record["participant_code"] in codes:
            print(json.dumps({"status": "invalid", "errors": ["participant code already exists"]}, ensure_ascii=False, indent=2))
            return 2
        study.setdefault("records", []).append(record)
        _save_study(args.input, study)

    result = evaluate_study(study)
    result["study_id"] = study.get("study_id")
    result["input"] = str(args.input)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result["status"] == "passed" else 1


if __name__ == "__main__":
    sys.exit(main())
