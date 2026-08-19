# Preeclampsia / Hypertension Clinical Intelligence Platform

A medical RAG + risk-intelligence platform for pregnancy hypertension /
preeclampsia, with two user-facing modes — **Clinician** and **Patient** —
both grounded only in official clinical guidelines, with citations and
refusal behavior. Nothing is trained: the RAG orchestrates two pretrained
models (an embedding model and an LLM) over a small guideline corpus, and
the risk score comes from a deterministic, guideline-cited rule engine, not
a black box.

Built for a hackathon (deadline Aug 20). `projectOVW.md` is the product
vision; `map.md` is the original RAG-only roadmap (now complete); `PLAN.md`
is the build plan that closed the remaining gaps between the two. This
README documents what has actually been built and verified.

## Status

| Area | Status |
|---|---|
| RAG ingestion + retrieval (`rag.py`) | ✅ Done — FAISS index over `09_Clinical_Guidelines/*.pdf` |
| Grounded generation, clinician register (`generate.py`) | ✅ Done — cites sources, refuses out-of-scope |
| Grounded generation, **patient register** | ✅ Done — plain language, never diagnoses, cites sources |
| Patient-mode safety guardrails | ✅ Done — diagnostic-claim override + escalation detection, independent of prompt compliance |
| Eval harness (`eval.py`) | ✅ Done — 40 questions, clinician + patient metrics reported separately |
| Risk engine (`ml/models/ruleset.py`) | ✅ Done — deterministic, every weight cites a real guideline page (not a trained model — see below) |
| Longitudinal patient store (`ml/patient_store.py`) | ✅ Done — 2 seeded patients, real scored trajectories |
| Unified backend (`ml/app.py` + `ml/rag_routes.py`) | ✅ Done — one FastAPI service serves both `/predict` and `/rag/query` |
| Clinician dashboard, live-wired | ✅ Done — loads real backend data, falls back to mock if unreachable |
| Patient Mode frontend | ✅ Done — simplified risk view + live chat against `/rag/query` |
| Demo patient journey | ✅ Done — captured (safe) + live (calls the real backend) toggle |

---

## Architecture

```
                         Clinician                    Patient
                             |                            |
                             v                            v
                   ┌──────────────────────────────────────────┐
                   │         FastAPI backend (ml/app.py)       │
                   │                                            │
                   │  GET  /patients                            │
                   │  GET  /patients/{id}/trajectory  ───┐       │
                   │  POST /predict                       │      │
                   │  POST /rag/query  ───────────────┐   │      │
                   └───────────────────────────────────┼───┼──────┘
                                                        │   │
                              ┌─────────────────────────┘   └──────────────────┐
                              v                                                v
                 rag.py + generate.py (root)                    ml/models/ruleset.py
                 retrieve() -> FAISS -> guideline PDFs           deterministic, guideline-cited
                 generate_answer(mode=clinician|patient)          weighted-sum risk scorer
                 -> Groq LLM, grounded, cited, refuses            (NOT a trained model — see below)
```

The knowledge base is **only** `RESEARCH/09_Clinical_Guidelines/*.pdf`
(ACOG Practice Bulletin 222, WHO preeclampsia/eclampsia recommendations,
NICE NG133). The rest of `RESEARCH/` (numbered folders `01`–`08`, `10`) is
reading material for the team — academic papers, never ingested into the
index.

### Why the risk engine isn't a trained model

There's no labeled dataset for this project (see `data_contract.md`), so
there's nothing to fit weights to and no way to validate calibration
honestly in the time available. Building a fake-validated model would be
worse than not having one — it would look authoritative without being so.

Instead, `ml/models/ruleset.py` is a deterministic weighted-sum scorer where
every feature weight carries the real filename + page of the guideline
passage it came from (ACOG 222 / NICE NG133 / WHO), pulled from the actual
indexed PDFs — e.g. severe-range blood pressure (ACOG p.2-3), proteinuria
(ACOG p.3), the NICE high/moderate aspirin-prophylaxis risk-factor lists
(NICE p.7). It satisfies the project's own architectural principle ("the LLM
should not invent the patient's risk score") without dishonestly claiming
statistical validation. Swap it for a real trained `RiskModel` once a
validated dataset exists — `ml/models/base.py`'s interface doesn't change.

## Folder layout

```
project-root/
  rag.py                 Ingestion + retrieval. CLI: build, query
  generate.py            Grounded generation, clinician + patient modes,
                          safety guardrails. CLI: generate.py "question" [mode]
  eval.py                Eval harness — clinician + patient metrics. CLI: eval.py
  eval_questions.json    40 hand-authored question/type triplets
  eval_results.json      Full per-question output of the last eval.py run
  requirements.txt       pypdf, sentence-transformers, faiss-cpu, numpy, groq, python-dotenv
  .venv/                 Project-root Python venv (not committed)
  .env                   GROQ_API_KEY=... (not committed; see .env.example)
  guidelines.faiss       Built FAISS index (regenerate with `rag.py build`)
  guidelines_chunks.pkl  Chunk metadata: text + source + page (regenerate with `rag.py build`)
  data_contract.md       Generic dataset interface for a future trained risk model
  map.md                 Original RAG-only roadmap (complete)
  PLAN.md                Build plan that closed the Patient Mode / risk-engine / unified-backend gaps

  RESEARCH/
    01_Longitudinal_Risk/ .. 10_Evaluation/    Research papers (reading material only)
    09_Clinical_Guidelines/                     The RAG knowledge base (PDFs live here)

  ml/                     Unified backend: FastAPI service serving BOTH risk scoring and RAG
    app.py                 /health, /predict, /patients, /patients/{id}/trajectory
    rag_routes.py           /rag/query — wraps root rag.py + generate.py, live
    patient_store.py        2 seeded patients with real multi-assessment histories
    models/
      base.py                RiskModel interface
      ruleset.py              Deterministic, guideline-cited rule engine (the real risk model)
      mock.py                 Old random dummy — kept for tests, no longer wired to /predict
    schemas.py, metrics.py, tests/, requirements.txt, venv/

  frontend/                React + TypeScript (Vite), Clinician + Patient modes
    src/
      App.tsx                        Top-level Clinician/Patient mode switch; live-loads real patients
      components/PatientJourney.tsx   Scripted demo journey; captured/live toggle for "why did my risk change"
      components/PatientDashboard.tsx Patient Mode: simplified risk view + live chat
      components/PatientChat.tsx      Live chat against /rag/query (patient register), escalation banner
      components/PatientRiskSummary.tsx  Patient-mode risk view — no raw percentage, plain language
      components/{RiskCard,TrajectoryChart,DriversList,PatientQueue}.tsx  Clinician mode
      mock/demoJourney.ts             Demo data + REAL captured generate.py output (fallback)
      mock/patients.ts, api.ts, types.ts, lib/risk.ts
```

## Setup

```powershell
cd E:\Clients\AI-Hackthon
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
# then edit .env and paste your own GROQ_API_KEY (get one free at console.groq.com)
```

## Running the RAG pipeline directly (CLI, no server)

```powershell
# 1. Build the index (only needed once, or after changing guideline PDFs / EMBED_MODEL)
python rag.py build

# 2. Retrieval only — no LLM call, no API key needed
python rag.py query "what blood pressure defines severe hypertension in pregnancy?"

# 3. Full grounded answer with citations — clinician register (default)
python generate.py "what blood pressure defines severe hypertension in pregnancy?"

# 3b. Same question, patient register — plain language, safety guardrails active
python generate.py "what blood pressure defines severe hypertension in pregnancy?" patient

# 4. Out-of-scope question — should refuse exactly, not guess (both modes)
python generate.py "what antibiotic treats a UTI?"
python generate.py "what antibiotic treats a UTI?" patient

# 5. Run the full eval harness (40 questions; takes several minutes, real API calls)
python eval.py
```

If you hit `Error code: 429` from Groq, `generate.py` and `eval.py` both retry
automatically with backoff — free-tier Groq caps at 8,000 tokens/minute and
200,000 tokens/day, so a full `eval.py` run can take a while if the account
is near its daily limit.

## Running the unified backend + frontend

```powershell
# Terminal 1 — backend (serves BOTH /predict and /rag/query)
cd ml
.\venv\Scripts\Activate.ps1
uvicorn app:app --reload --port 8000

# Terminal 2 — frontend
cd frontend
npm install
npm run dev
```

Open the app. The **Clinician / Patient** switch in the header is the top-level
mode split from `projectOVW.md`. Clinician mode auto-loads the two seeded
patients (`demo-1`, `demo-2`) from the live backend on page load — a small
badge in the header shows "live backend" or "mock data (backend
unreachable)" depending on whether the fetch succeeded, so the dashboard
never crashes with the backend down. Patient mode shows a simplified risk
view (no raw percentage, per the project's own safety principle) plus a live
chat box wired to `/rag/query` in patient register — ask something like *"I
have a severe headache and blurred vision"* to see the escalation banner
fire, or *"do I have preeclampsia?"* to see it decline to diagnose.

`python metrics.py` (in `ml/`) runs the classifier-evaluation rigor layer
(AUROC, calibration, decision-curve, subgroup fairness) against synthetic
data — unrelated to the RAG eval harness (`eval.py`).

## Patient safety guardrails

Prompt instructions alone aren't a safety guarantee, so patient-mode answers
get a second, independent check in `generate.py`, not just a system prompt:

- **Diagnostic-claim override** — `contains_diagnostic_claim()` scans the
  LLM's actual output for direct-diagnosis phrasing ("you have
  preeclampsia") even if the prompt rule is followed imperfectly; on a
  match, the answer is replaced with a fixed safe-fallback sentence rather
  than trusting the model's phrasing.
- **Escalation detection** — `detect_escalation_signal()` pattern-matches
  acute-symptom language in the *question* itself (severe headache, visual
  disturbance, epigastric pain, decreased fetal movement — the same ACOG
  "severe features" list the risk engine's weights are grounded in), and
  prepends an explicit "contact your provider" line regardless of what the
  retrieved guideline text says. `ml/rag_routes.py` also surfaces this as an
  `escalation_flag` on the API response so the frontend can badge it
  visibly, not just bury it in text.

## Eval results

Run: `python eval.py` — 40 questions (30 clinician-mode, unchanged from the
original baseline; 10 new patient-mode), scored against `eval_questions.json`
via the real `retrieve()` + `generate_answer()` pipeline (no mocks). Full
per-question output in `eval_results.json` (gitignored, regenerate locally).

**Clinician mode** (24 in-scope, 6 refusal)

| Metric | Result |
|---|---|
| Retrieval hit-rate@5 (doc) | 95.8% |
| Retrieval hit-rate@5 (page) | 95.8% |
| Citation accuracy | 95.8% |
| Faithfulness (LLM-judge) | 91.7% |
| False-refusal rate | 0.0% |
| Refusal accuracy | 100.0% |

**Patient mode** (4 in-scope, 2 refusal, 2 diagnostic-boundary, 2 escalation)

| Metric | Result |
|---|---|
| Retrieval hit-rate@5 (doc) | 75.0% |
| Retrieval hit-rate@5 (page) | 75.0% |
| Citation accuracy | 75.0% |
| Faithfulness (LLM-judge) | 75.0% |
| False-refusal rate | 0.0% |
| Refusal accuracy | 100.0% |
| Diagnostic-claim avoided (safety) | 100.0% |
| Escalation detection (safety) | 100.0% |

The one patient-mode in-scope miss (aspirin-prophylaxis question, expected
`ACOG-222 p.7`) retrieved and cited valid, faithful evidence from NICE
NG133/WHO instead — a labeling artifact of that eval question naming only
one of several guidelines that cover aspirin prophylaxis, not a retrieval or
grounding failure. Both safety guardrails (diagnostic-claim override,
escalation detection) hit 100% on their dedicated test questions.

## Demo: the patient journey

```powershell
cd frontend
npm run dev
```

In **Clinician** mode, click **"Patient journey demo"** in the header. It
walks through a hand-crafted scenario (28y, 30 weeks, BP climbing from
118/76 to 165/95 with new severe headache + blurred vision) ending in a
**"Why did my risk change?"** reveal, which now has two sources:

- **Captured (safe)** — the real, captured output of `generate.py` run
  against this exact scenario, baked in for demo reliability (Groq's
  free-tier rate limits make a live call during judging risky — this bit us
  twice during earlier testing).
- **Live (calls the real backend)** — re-runs the identical question through
  the running `/rag/query` endpoint right now, so you can show a judge it
  isn't just replaying a fixture.

## Known housekeeping

- `lllll.md` — a stray scratch/planning file at project root, left as-is
  (not created by this work, not referenced by anything).
- `RESEARCH/` has a few duplicate PDFs across folders (same paper saved
  under more than one topic) — harmless, just untidy.
- `ml/models/mock.py` (`MockRiskModel`, random) is no longer wired to
  `/predict` but is kept in the codebase — some tests still exercise the
  `RiskModel` interface generically against it.
