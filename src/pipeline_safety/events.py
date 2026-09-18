from __future__ import annotations

import json
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from .types import Alert


class EventStore:
    def __init__(self, database: str):
        self.database = str(Path(database))
        Path(self.database).parent.mkdir(parents=True, exist_ok=True)
        self._initialize()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.database, timeout=10)
        connection.row_factory = sqlite3.Row
        return connection

    def _initialize(self) -> None:
        with self._connect() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS safety_events (
                    id TEXT PRIMARY KEY,
                    created_at TEXT NOT NULL,
                    station TEXT NOT NULL,
                    track_id INTEGER NOT NULL,
                    rule_id TEXT NOT NULL,
                    rule_type TEXT NOT NULL,
                    rule_name TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    message TEXT NOT NULL,
                    details_json TEXT NOT NULL,
                    snapshot_path TEXT,
                    acknowledged INTEGER NOT NULL DEFAULT 0,
                    acknowledged_at TEXT
                )
                """
            )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS idx_safety_events_created_at ON safety_events(created_at DESC)"
            )

    def add(self, station: str, alert: Alert, snapshot_path: Optional[str] = None) -> str:
        event_id = uuid.uuid4().hex
        created_at = datetime.now(timezone.utc).isoformat()
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO safety_events (
                    id, created_at, station, track_id, rule_id, rule_type,
                    rule_name, severity, message, details_json, snapshot_path
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    event_id,
                    created_at,
                    station,
                    alert.track_id,
                    alert.rule_id,
                    alert.rule_type,
                    alert.rule_name,
                    alert.severity,
                    alert.message,
                    json.dumps(alert.details, ensure_ascii=False),
                    snapshot_path,
                ),
            )
        return event_id

    def list(self, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
        limit = min(max(int(limit), 1), 500)
        offset = max(int(offset), 0)
        with self._connect() as connection:
            rows = connection.execute(
                "SELECT * FROM safety_events ORDER BY created_at DESC LIMIT ? OFFSET ?",
                (limit, offset),
            ).fetchall()
        return [self._row(row) for row in rows]

    def summary(self) -> Dict[str, Any]:
        with self._connect() as connection:
            total = connection.execute("SELECT COUNT(*) FROM safety_events").fetchone()[0]
            unacknowledged = connection.execute(
                "SELECT COUNT(*) FROM safety_events WHERE acknowledged = 0"
            ).fetchone()[0]
            grouped = connection.execute(
                "SELECT rule_name, COUNT(*) AS count FROM safety_events GROUP BY rule_name ORDER BY count DESC"
            ).fetchall()
        return {
            "total": total,
            "unacknowledged": unacknowledged,
            "by_rule": [{"name": row["rule_name"], "count": row["count"]} for row in grouped],
        }

    def acknowledge(self, event_id: str) -> bool:
        acknowledged_at = datetime.now(timezone.utc).isoformat()
        with self._connect() as connection:
            cursor = connection.execute(
                "UPDATE safety_events SET acknowledged = 1, acknowledged_at = ? WHERE id = ?",
                (acknowledged_at, event_id),
            )
        return cursor.rowcount > 0

    @staticmethod
    def _row(row: sqlite3.Row) -> Dict[str, Any]:
        result = dict(row)
        result["acknowledged"] = bool(result["acknowledged"])
        result["details"] = json.loads(result.pop("details_json"))
        return result

