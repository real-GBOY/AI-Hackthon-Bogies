# Clinical Risk Dashboard — Hackathon Scaffold

A disease-agnostic prototype for a longitudinal, explainable clinical risk
score: a calibrated risk value, a risk trajectory over time, explainable
drivers behind the score, and a prioritized follow-up queue for clinicians.
The disease and dataset are not chosen yet — this scaffold only wires up the
serving layer, the evaluation/rigor layer, and the dashboard shell, all
running on mock/dummy data so both halves are demoable immediately. Model
architecture, data loading, and preprocessing come later once a disease and
dataset are picked (see `data_contract.md` for the interface they'll need to
match).

## Folder layout

```
project-root/
  ml/                      Python FastAPI service + rigor/metrics layer
    venv/                  Python virtual environment (not committed)
    app.py                 FastAPI app: POST /predict, GET /health
    schemas.py             Pydantic RiskResult contract (disease-agnostic)
    models/
      base.py              RiskModel interface (predict_proba/explain/predict)
      mock.py              MockRiskModel — dummy stand-in for a trained model
    metrics.py              evaluate_model() + individual rigor functions
    tests/                 pytest: API contract tests + metrics edge cases
    plots/                 PNGs written by `python metrics.py` (not committed)
    requirements.txt
  frontend/                React + TypeScript (Vite) dashboard shell
    src/
      types.ts             RiskResult contract, mirrors ml/schemas.py
      lib/risk.ts           Risk-category/trend constants, mirrors ml/app.py
      components/          RiskCard, TrajectoryChart, DriversList, PatientQueue
      mock/patients.ts      Single source of mock data (RiskResult-shaped)
      api.ts                predict()/checkHealth() with timeout + error handling
  data_contract.md          Generic future-dataset interface (no disease terms)
  README.md
```

## Architecture

```
React (frontend/)
   ↓ fetch /predict
FastAPI (ml/app.py)
   ↓ depends on
RiskModel interface (ml/models/base.py)
   ↓ implemented today by
MockRiskModel (ml/models/mock.py)
   ↓ will be swapped for
A real trained model, once a disease/dataset is chosen
```

`app.py` never generates risk values itself — it calls `model.predict_proba()`
and `model.explain()` through the `RiskModel` interface. Swapping in a real
model later is a one-line change in `get_model()`; nothing else in the API,
metrics, or frontend needs to change as long as the new model implements the
same interface.

No database, auth, Docker, or message queue — this is a hackathon prototype
and stays that way until there's a concrete reason to add one.

## Running ml/ (FastAPI service)

Windows (PowerShell):

```powershell
cd ml
.\venv\Scripts\Activate.ps1
uvicorn app:app --reload
```

macOS/Linux (bash/zsh):

```bash
cd ml
source venv/bin/activate
uvicorn app:app --reload
```

The API listens on `http://localhost:8000`. Check it:

```
GET  http://localhost:8000/health
POST http://localhost:8000/predict   body: {"features": {"age": 60}}
```

Run the rigor/metrics layer standalone against synthetic data:

```powershell
.\venv\Scripts\python.exe metrics.py
```

Run the test suite:

```powershell
.\venv\Scripts\python.exe -m pytest tests/ -v
```

## Running frontend/ (React dashboard)

```powershell
cd frontend
npm run dev
```

Opens on `http://localhost:5173` (or the next free port). The dashboard
renders entirely from mock data in `src/mock/patients.ts`, so it works with
or without the FastAPI service running. Click "Check live ML service" in the
header to demo the real `/predict` call — on failure it reports the error
inline and the dashboard keeps rendering from mock data.

Type-check and production build (also serve as the frontend's tests — see
"Do not build a huge testing framework" in project notes):

```powershell
npx tsc -b --noEmit
npm run build
```

## Next steps (not part of this scaffold)

- Pick a disease + dataset and reshape it to match `data_contract.md`.
- Write a preprocessing step from the real data onto that contract.
- Implement a `RiskModel` subclass backed by a trained model; swap it in via
  `get_model()` in `ml/app.py`.
- Feed the trained model's `(y_true, y_prob)` output through
  `metrics.evaluate_model()` to get the full rigor report before trusting it.
