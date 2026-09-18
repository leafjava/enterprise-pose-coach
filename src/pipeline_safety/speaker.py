from __future__ import annotations

import platform
import queue
import shutil
import subprocess
import threading
from typing import Optional


class Speaker:
    def __init__(self, enabled: bool = True, rate: int = 190):
        self.enabled = enabled
        self.rate = int(rate)
        self._queue: "queue.Queue[Optional[str]]" = queue.Queue(maxsize=20)
        self._thread: Optional[threading.Thread] = None
        if enabled:
            self._thread = threading.Thread(target=self._worker, name="voice-alerts", daemon=True)
            self._thread.start()

    def speak(self, message: str) -> None:
        if not self.enabled:
            return
        try:
            self._queue.put_nowait(message)
        except queue.Full:
            pass

    def close(self) -> None:
        if self._thread is None:
            return
        try:
            self._queue.put_nowait(None)
        except queue.Full:
            pass
        self._thread.join(timeout=3)

    def _worker(self) -> None:
        while True:
            message = self._queue.get()
            if message is None:
                return
            command = self._command(message)
            if command:
                try:
                    subprocess.run(command, check=False, timeout=30)
                except (OSError, subprocess.TimeoutExpired):
                    continue

    def _command(self, message: str) -> Optional[list[str]]:
        system = platform.system()
        if system == "Darwin" and shutil.which("say"):
            return ["say", "-r", str(self.rate), message]
        if shutil.which("espeak-ng"):
            return ["espeak-ng", "-s", str(self.rate), message]
        if shutil.which("espeak"):
            return ["espeak", "-s", str(self.rate), message]
        if system == "Windows":
            escaped = message.replace("'", "''")
            script = (
                "Add-Type -AssemblyName System.Speech; "
                "$s = New-Object System.Speech.Synthesis.SpeechSynthesizer; "
                f"$s.Speak('{escaped}')"
            )
            return ["powershell", "-NoProfile", "-Command", script]
        return None

