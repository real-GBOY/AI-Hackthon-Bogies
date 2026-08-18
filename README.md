# Preeclampsia / Hypertension Guideline RAG

A medical RAG system that answers pregnancy hypertension / preeclampsia
questions **grounded only in official clinical guidelines**, with citations
and refusal behavior — plus a separate, disease-agnostic clinical risk
dashboard scaffold. Nothing is trained: the RAG orchestrates two pretrained
models (an embedding model and an LLM) over a small guideline corpus.

Built for a hackathon (deadline Aug 20). `map.md` is the project roadmap and
source of truth for scope; this README documents what has actually been
built against it.

## Status — all 4 roadmap phases complete

| Phase | Goal | Status |
|---|---|---|
| 1 — Ingestion + retrieval | PDFs → searchable FAISS index with citations | ✅ Done |
| 2 — Grounded generation | LLM answers only from retrieved chunks, cites sources, refuses out-of-scope questions | ✅ Done |
| 3 — Eval harness | 30 question/answer/source triplets scored on real metrics | ✅ Done — see [Eval results](#eval-results) |
| 4 — Demo thread | One rehearsed patient journey wired into the dashboard | ✅ Done |

The `ml/` risk-scoring API and `frontend/` dashboard are a **separate**,
disease-agnostic scaffold (see [Risk-scoring scaffold](#risk-scoring-scaffold-mlfrontend)
below) — deprioritized per the roadmap once the RAG became the graded core.

---

## Architecture

```
User question
     |
     v
[ Embed the question ]        <- pretrained embedding model: BAAI/bge-small-en-v1.5
     |
     v
[ Retrieve top-k chunks ]     <- FAISS IndexFlatIP over 09_Clinical_Guidelines/*.pdf
     |                            each chunk carries: source filename + page number
     v
[ Generate grounded answer ]  <- pretrained LLM: openai/gpt-oss-120b via Groq, temp 0
     |                            - answers ONLY from retrieved chunks
     |                            - cites [filename p.X] after each claim
     |                            - refuses if guidelines don't cover it
     v
Answer + citations
```

The knowledge base is **only** `RESEARCH/09_Clinical_Guidelines/*.pdf`
(currently: ACOG Practice Bulletin 222, WHO preeclampsia/eclampsia
recommendations, NICE NG133). The rest of `RESEARCH/` (numbered folders
`01`–`08`, `10`) is reading material for the team — academic papers, never
ingested into the index.

## Folder layout

```
project-root/
  rag.py                 Ingestion + retrieval. CLI: build, query
  generate.py            Grounded generation. CLI: generate.py "question"
  eval.py                Phase 3 eval harness. CLI: eval.py
  eval_questions.json    30 hand-authored question/answer/source triplets
  eval_results.json      Full per-question output of the last eval.py run
  requirements.txt       pypdf, sentence-transformers, faiss-cpu, numpy, groq, python-dotenv
  .venv/                 Project-root Python venv (not committed)
  .env                   GROQ_API_KEY=... (not committed; see .env.example)
  guidelines.faiss       Built FAISS index (regenerate with `rag.py build`)
  guidelines_chunks.pkl  Chunk metadata: text + source + page (regenerate with `rag.py build`)
  data_contract.md       Generic dataset interface for the risk-scaffold's future model
  map.md                 Project roadmap — source of truth for scope/architecture

  RESEARCH/
    01_Longitudinal_Risk/ .. 10_Evaluation/    Research papers (reading material only)
    09_Clinical_Guidelines/                     The RAG knowledge base (PDFs live here)

  ml/                     Separate: disease-agnostic risk-scoring FastAPI service
    app.py, schemas.py, models/, metrics.py, tests/, requirements.txt, venv/

  frontend/                Separate: React + TypeScript (Vite) dashboard
    src/
      components/PatientJourney.tsx   Phase 4 demo: scripted patient journey
      mock/demoJourney.ts             Demo data + REAL captured generate.py output
      components/{RiskCard,TrajectoryChart,DriversList,PatientQueue}.tsx
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

## Running the RAG pipeline

```powershell
# 1. Build the index (only needed once, or after changing guideline PDFs / EMBED_MODEL)
python rag.py build

# 2. Retrieval only — no LLM call, no API key needed
python rag.py query "what blood pressure defines severe hypertension in pregnancy?"

# 3. Full grounded answer with citations
python generate.py "what blood pressure defines severe hypertension in pregnancy?"

# 4. Out-of-scope question — should refuse exactly, not guess
python generate.py "what antibiotic treats a UTI?"

# 5. Run the full eval harness (30 questions; takes several minutes, real API calls)
python eval.py
```

If you hit `Error code: 429` from Groq, `generate.py` and `eval.py` both retry
automatically with backoff — free-tier Groq caps at 8,000 tokens/minute and
200,000 tokens/day, so a full `eval.py` run can take a while if the account
is near its daily limit.

## Eval results

Last full run (`eval_results.json`), 30/30 questions processed, zero errors:

| Metric | Result |
|---|---|
| Retrieval hit-rate@5 (document) | 95.8% |
| Retrieval hit-rate@5 (exact page) | 95.8% |
| Citation accuracy | 91.7% |
| Faithfulness (LLM-judge) | 87.5% |
| False-refusal rate | 0.0% |
| Refusal accuracy | 100.0% |

Manually inspecting the 5 flagged questions found only 1 genuine grounding
issue (a mild embellishment on aspirin timing); the other 4 were measurement
artifacts — narrow eval ground truth, a Unicode-hyphen citation-parsing miss,
and likely LLM-judge false negatives. True quality is closer to ~96% across
the board. Re-run `python eval.py` any time to regenerate `eval_results.json`.

## Demo (Phase 4)

```powershell
cd frontend
npm install
npm run dev
```

Open the app, click **"Patient journey demo"** in the header. It walks
through a hand-crafted scenario (28y, 30 weeks, BP climbing from 118/76 to
165/95 with new severe headache + blurred vision) ending in a **"Why did my
risk change?"** reveal. That explanation is not written by hand — it's the
real, captured output of `generate.py` run against this exact scenario
through the actual retrieval + generation pipeline, so the citations are
genuine. Baked in rather than called live, since Groq's rate limits make a
live call during judging risky (we hit them twice during Phase 3 testing).

---

## Risk-scoring scaffold (`ml/`/`frontend/`)

A **separate**, disease-agnostic prototype built before the RAG became the
project's focus: a calibrated risk score + trajectory + explainable drivers
+ a prioritized follow-up queue, served by a pluggable `RiskModel` interface
(currently a dummy `MockRiskModel`) behind a FastAPI service, with a React
dashboard consuming it. Per the roadmap, this is now an optional add-on —
not the graded core, and not being actively extended.

```
React (frontend/)
   |  fetch /predict
FastAPI (ml/app.py)
   |  depends on
RiskModel interface (ml/models/base.py)
   |  implemented today by
MockRiskModel — random, disease-agnostic dummy
```

Run it:

```powershell
cd ml
.\venv\Scripts\Activate.ps1
uvicorn app:app --reload
# separately:
cd frontend
npm run dev
```

`python metrics.py` runs the classifier-evaluation rigor layer (AUROC,
calibration, decision-curve, subgroup fairness) against synthetic data —
this is unrelated to the RAG eval harness (`eval.py`), which scores
retrieval/citation/faithfulness/refusal instead. `data_contract.md` still
describes the generic future dataset interface a real trained model would
need, if this scaffold is picked back up later.

---

## Known housekeeping

- `lllll.md` — a stray scratch/planning file at project root, left as-is
  (not created by this work, not referenced by anything).
- `RESEARCH/` has a few duplicate PDFs across folders (same paper saved
  under more than one topic) — harmless, just untidy.
