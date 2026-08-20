# How to run everything

One-stop guide to running every piece of this project: the RAG CLI, the
unified backend, the web frontend, the mobile app, the eval harness, and the
optional Postgres store. For architecture/product context see `README.md`
and `projectOVW.md` — this file is just the run commands.

All commands assume PowerShell on Windows from the repo root
(`E:\Clients\AI-Hackthon`) unless a `cd` is shown.

---

## 0. One-time setup

### 0.1 Root Python env (RAG pipeline: `rag.py`, `generate.py`, `eval.py`)

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
# edit .env and set GROQ_API_KEY=... (free key at console.groq.com)
```

### 0.2 Backend Python env (`ml/`)

```powershell
cd ml
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
cd ..
```

The backend imports `rag.py` / `generate.py` from the repo root, so it also
needs the root `.env` (`GROQ_API_KEY`) — no separate `ml/.env` required
unless you're opting into Postgres (see §4).

### 0.3 Frontend (web, React + Vite)

```powershell
cd frontend
npm install
cd ..
```

### 0.4 Mobile (Expo / React Native)

```powershell
cd Mobile
npm install
copy .env.example .env
cd ..
```

`Mobile/.env` only needs `EXPO_PUBLIC_API_URL` if the default guess in
`src/api/config.ts` is wrong for your setup (see §3.4).

---

## 1. RAG pipeline only (no server, CLI)

Requires §0.1. Useful for quick checks without starting anything.

```powershell
.\.venv\Scripts\Activate.ps1

# Build the FAISS index (only needed once, or after changing guideline PDFs)
python rag.py build

# Retrieval only, no LLM call, no API key needed
python rag.py query "what blood pressure defines severe hypertension in pregnancy?"

# Full grounded answer, clinician register (default)
python generate.py "what blood pressure defines severe hypertension in pregnancy?"

# Same question, patient register (plain language + safety guardrails)
python generate.py "what blood pressure defines severe hypertension in pregnancy?" patient

# Out-of-scope question - should refuse, not guess
python generate.py "what antibiotic treats a UTI?"
```

If you hit `Error code: 429` from Groq: free tier caps at 8,000 tokens/min
and 200,000 tokens/day. `generate.py`/`eval.py` retry with backoff
automatically.

---

## 2. Full stack: backend + web frontend

Two terminals.

**Terminal 1 — backend** (serves `/predict`, `/patients`, `/rag/query`, etc.)

```powershell
cd ml
.\venv\Scripts\Activate.ps1
uvicorn app:app --reload --port 8000
```

**Terminal 2 — frontend**

```powershell
cd frontend
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

- The **Clinician / Patient** switch is in the header.
- Clinician mode auto-loads seeded patients `demo-1`/`demo-2` from the
  backend; a badge shows "live backend" vs "mock data" if the backend is
  unreachable.
- Patient mode has a live chat wired to `/rag/query` — try *"I have a severe
  headache and blurred vision"* (escalation banner) or *"do I have
  preeclampsia?"* (declines to diagnose).
- In Clinician mode, click **"Patient journey demo"** for a scripted
  captured-vs-live demo scenario.

Backend health check: `http://localhost:8000/health`.

---

## 3. Mobile app (Expo)

Requires §0.4 and the backend running (§2, terminal 1) — the mobile app
talks to the same `ml/app.py` service, not a separate backend.

```powershell
cd Mobile
npm start
```

Then, from the Expo CLI menu that opens:

- Press `w` for web
- Press `a` for Android (emulator or connected device)
- Press `i` for iOS (simulator, macOS only)

Or directly:

```powershell
npm run web
npm run android
npm run ios
```

### 3.4 Pointing the mobile app at the right backend URL

`Mobile/src/api/config.ts` picks a default automatically:

| Runtime | Default backend URL |
|---|---|
| Android emulator | `http://10.0.2.2:8000` |
| iOS simulator / web | `http://localhost:8000` |
| Physical device | none of the above work |

For a physical device, set your machine's LAN IP in `Mobile/.env`:

```
EXPO_PUBLIC_API_URL=http://192.168.1.23:8000
```

(Find your LAN IP with `ipconfig` on Windows.) Restart `npm start` after
editing `.env`.

> Note: Expo SDK is pinned to 56 for this project (see `Mobile/AGENTS.md`) —
> use `npx expo install <pkg>` rather than `npm install <pkg>` when adding
> packages so versions stay SDK-56-compatible.

---

## 4. Optional: Postgres-backed patient store

By default the backend uses an in-memory patient store (2 seeded patients,
reset on restart). To persist patients across restarts, switch on Postgres
(see `dbMigration.md` for the full design).

```powershell
# 1. Start Postgres (Docker)
docker run --name hackpg -e POSTGRES_PASSWORD=pass -e POSTGRES_DB=hackathon -p 5432:5432 -d postgres:16

# 2. Point the backend at it and opt in
$env:DATABASE_URL = "postgresql+psycopg://postgres:pass@localhost:5432/hackathon"
$env:PATIENT_STORE = "postgres"

# 3. Create tables + seed demo-1/demo-2 (from the ml venv)
cd ml
.\venv\Scripts\Activate.ps1
python -c "from db import init_db; init_db()"

# 4. Start the backend as usual (same terminal, env vars still set)
uvicorn app:app --reload --port 8000
```

If `PATIENT_STORE=postgres` is set but Postgres is unreachable at startup,
the backend logs a warning and falls back to the in-memory store rather than
crashing. Leave `PATIENT_STORE` unset (or `memory`) to skip Postgres
entirely — everything else works unchanged.

---

## 5. Eval harness and metrics

```powershell
.\.venv\Scripts\Activate.ps1

# RAG eval — 40 questions, clinician + patient metrics, real API calls (takes several minutes)
python eval.py
```

Results land in `eval_results.json` (gitignored, regenerate locally); the
current baseline numbers are in `README.md`.

```powershell
# Classifier-evaluation rigor layer (AUROC, calibration, decision-curve,
# subgroup fairness) against synthetic data — unrelated to eval.py above
cd ml
.\venv\Scripts\Activate.ps1
python metrics.py
```

---

## Quick reference: what needs what

| Piece | Needs running | Env |
|---|---|---|
| `rag.py` / `generate.py` (CLI) | nothing else | root `.env` (`GROQ_API_KEY`) |
| `eval.py` | nothing else | root `.env` |
| `ml/app.py` (backend) | nothing else (Postgres optional) | root `.env`; optionally `DATABASE_URL` + `PATIENT_STORE` |
| `frontend` (web) | backend on `:8000` | none required |
| `Mobile` (Expo) | backend on `:8000` | `Mobile/.env` only for physical devices |
| `ml/metrics.py` | nothing else | none |
