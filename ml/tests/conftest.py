import sys
from pathlib import Path

# Tests import top-level modules (app, metrics, models) as if run from ml/,
# regardless of the actual working directory pytest was invoked from.
ML_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ML_DIR))

# Some tests (test_generate_safety.py) import generate.py directly, which
# lives at the project root, not under ml/ — same path rag_routes.py adds
# at runtime, added here too so it doesn't depend on import order.
sys.path.insert(0, str(ML_DIR.parent))
