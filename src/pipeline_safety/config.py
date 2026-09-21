from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path
from typing import Any, Dict


class ConfigError(ValueError):
    pass


def load_config(path: str | Path) -> Dict[str, Any]:
    config_path = Path(path).expanduser().resolve()
    try:
        data = json.loads(config_path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise ConfigError(f"配置文件不存在：{config_path}") from exc
    except json.JSONDecodeError as exc:
        raise ConfigError(f"配置文件不是有效 JSON：{exc}") from exc

    _validate(data)
    result = deepcopy(data)
    # 配置文件路径可能是 config/safety/default.json（两层深），也可能在 config/ 根；
    # 往上找到第一个含 src/ 的目录作为项目根。
    project_root = config_path.parent
    for _ in range(4):
        if (project_root / "src").is_dir():
            break
        project_root = project_root.parent
    alerts = result["alerts"]
    for key in ("database", "snapshot_directory"):
        candidate = Path(str(alerts[key])).expanduser()
        if not candidate.is_absolute():
            candidate = project_root / candidate
        alerts[key] = str(candidate.resolve())
    ppe = result.get("ppe_model", {})
    if ppe.get("weights"):
        weights = Path(str(ppe["weights"])).expanduser()
        if not weights.is_absolute():
            weights = project_root / weights
        ppe["weights"] = str(weights.resolve())
    model = result.get("model", {})
    if model.get("weights"):
        weights = Path(str(model["weights"])).expanduser()
        if not weights.is_absolute():
            weights = project_root / weights
        model["weights"] = str(weights.resolve())
    return result


def _validate(config: Dict[str, Any]) -> None:
    for section in ("camera", "model", "alerts", "rules"):
        if section not in config:
            raise ConfigError(f"缺少配置项：{section}")
    if not isinstance(config["rules"], list) or not config["rules"]:
        raise ConfigError("rules 必须是非空数组")

    rule_ids = set()
    supported = {"bend", "fall", "danger_zone", "no_helmet", "drowsy", "unconscious"}
    for index, rule in enumerate(config["rules"]):
        if not isinstance(rule, dict):
            raise ConfigError(f"rules[{index}] 必须是对象")
        for key in ("id", "type", "message"):
            if key not in rule:
                raise ConfigError(f"rules[{index}] 缺少 {key}")
        if rule["id"] in rule_ids:
            raise ConfigError(f"规则 id 重复：{rule['id']}")
        rule_ids.add(rule["id"])
        if rule["type"] not in supported:
            raise ConfigError(f"不支持的规则类型：{rule['type']}")

        duration = float(rule.get("duration_seconds", 0))
        cooldown = float(rule.get("cooldown_seconds", 0))
        if duration < 0 or cooldown < 0:
            raise ConfigError(f"规则 {rule['id']} 的持续时间和冷却时间不能为负数")

        if rule["type"] == "danger_zone":
            polygon = rule.get("polygon", [])
            if len(polygon) < 3:
                raise ConfigError(f"危险区域规则 {rule['id']} 至少需要 3 个顶点")
            if any(len(point) != 2 or not all(0 <= float(v) <= 1 for v in point) for point in polygon):
                raise ConfigError(f"危险区域规则 {rule['id']} 的坐标必须是 0～1 的归一化坐标")
