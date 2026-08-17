import sys
from pathlib import Path

# Tests import top-level modules (app, metrics, models) as if run from ml/,
# regardless of the actual working directory pytest was invoked from.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
