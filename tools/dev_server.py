"""Run the existing Flask UI with deterministic harness dependencies."""

from __future__ import annotations

import os
from pathlib import Path
import socket
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from tools.harness_support import load_harness_app  # noqa: E402


def _available_port(preferred: int = 4000) -> int:
    """Use the preferred port when possible, otherwise ask the OS for a free one."""
    for candidate in (preferred, 0):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as probe:
            try:
                probe.bind(("127.0.0.1", candidate))
            except OSError:
                continue
            return int(probe.getsockname()[1])
    raise RuntimeError("No local TCP port is available for the harness server")


def main() -> None:
    runtime_dir = ROOT / ".pose_runtime" / "harness"
    web_app = load_harness_app(runtime_dir)
    web_app.app.config.update(TESTING=False)
    configured_port = os.getenv("PORT")
    port = int(configured_port) if configured_port else _available_port()
    print("[HARNESS MODE] 页面/API/规则引擎为真实实现；姿态与重型依赖为确定性替身。")
    print("[HARNESS MODE] 此模式只证明业务流程可复现，不证明模型精度。")
    if not configured_port and port != 4000:
        print(f"[HARNESS MODE] 端口 4000 不可用，已自动选择 {port}。")
    web_app.app.run(host="127.0.0.1", port=port, debug=False, use_reloader=False)


if __name__ == "__main__":
    main()
