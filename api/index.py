import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.main import app
from mangum import Mangum

# Vercel can call the ASGI app directly, or the Mangum handler.
handler = Mangum(app)
