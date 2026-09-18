"""Smoke test for the embedded pipeline_safety blueprint."""
import os
import sys

# Run from project root so Flask resolves templates/ relative to lian_le_ma
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(PROJECT_ROOT)
sys.path.insert(0, os.path.join(PROJECT_ROOT, "src"))

from flask import Flask
from pipeline_safety.config import load_config
from pipeline_safety.safety_web import register_safety

print("CWD:", os.getcwd())
print("safety/ exists?", os.path.isdir("templates/safety"))

cfg = load_config("config/safety/default.json")
app = Flask(__name__,
            template_folder=os.path.join(PROJECT_ROOT, "templates"),
            static_folder=os.path.join(PROJECT_ROOT, "static"))
register_safety(app, cfg)
print("template_folder resolved:", app.template_folder)
print("jinja_loader searchpath:", app.jinja_loader.searchpath)
client = app.test_client()

cases = [
    ("GET", "/safety/"),
    ("GET", "/safety/monitor"),
    ("GET", "/safety/events"),
    ("GET", "/safety/api/health"),
    ("GET", "/safety/api/config"),
    ("GET", "/safety/api/summary"),
    ("GET", "/safety/api/events?limit=5"),
    ("GET", "/safety/snapshots/nope.jpg"),
    ("POST", "/safety/api/events/missing/acknowledge"),
]
for method, path in cases:
    r = client.open(path, method=method)
    ctype = r.headers.get("Content-Type", "-")
    snippet = ""
    if "text/html" in ctype:
        snippet = r.data[:30].decode("utf-8", errors="replace").replace("\n", " ").strip()
    elif "application/json" in ctype:
        try:
            snippet = str(r.get_json())[:60]
        except Exception:
            snippet = r.data[:60].decode("utf-8", errors="replace")
    print(f"{r.status_code}  {method:<5} {path:<48}  [{ctype[:30]}] {snippet}")