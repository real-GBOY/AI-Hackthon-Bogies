# DB_MIGRATION.md — Migrate the patient store to Postgres (SAFE, SCOPED)

**For:** Claude Code. Read this whole file first, then implement.
**Goal:** replace the in-memory patient dict with a real Postgres-backed store,
WITHOUT changing the API surface and WITHOUT touching the RAG pipeline.

---

## SCOPE — what this task does and does NOT touch

**Migrate:** only the patient data store (currently the in-memory `PATIENTS` dict in
`ml/patient_store.py`) to PostgreSQL.

**DO NOT TOUCH (hard constraint):**
- `rag.py`, `generate.py`, `eval.py` — the entire RAG pipeline stays exactly as is.
- `guidelines.faiss`, `guidelines_chunks.pkl` — the guideline vectors STAY in FAISS.
  Do NOT move them to pgvector. The retrieval path works and is graded; do not risk it.
- The FastAPI route signatures and JSON response shapes in `ml/app.py` — must not change.
  The frontend must keep working with zero changes.

If completing this task would require changing anything in the "DO NOT TOUCH" list, STOP
and report instead of proceeding.

---

## STEP 0 — inspect before writing (required)

Read these files first and mirror their EXACT shapes — do not invent a schema:
- `ml/patient_store.py` — note the exact class/functions and method names the store
  exposes (e.g. how `app.py` fetches a patient and its assessments), and the exact
  fields of the `Assessment` type and the two seeded patients (`demo-1`, `demo-2`).
- `ml/schemas.py` (or wherever `Assessment` is defined) — note every field and type.
- `ml/app.py` — note exactly which store methods the routes call. The new store MUST
  expose the SAME method names and return the SAME types.

---

## IMPLEMENTATION

1. **Dependencies** — add to `ml/requirements.txt` and install into `ml/venv`:
   `sqlalchemy>=2.0`, `psycopg[binary]`.

2. **`ml/db.py`** — SQLAlchemy 2.x engine + session factory, reading the connection
   string from env var `DATABASE_URL`. Provide a `get_session()` helper.

3. **SQLAlchemy models** (in `ml/db.py` or `ml/db_models.py`):
   - `patients` table: `id` (string PK), plus any patient-level fields the current
     seeded patients carry.
   - `assessments` table: `id` PK, `patient_id` FK -> patients.id, and one column per
     field of the existing `Assessment` type (blood pressure, week, timestamp/order, etc.).
   Mirror the existing `Assessment` fields exactly — same names where possible.

4. **`PostgresPatientStore`** — a class implementing the SAME interface the current
   in-memory store exposes (same method names, same return types: e.g. returns
   `list[Assessment]` for a patient). `app.py` must be able to use it as a drop-in.

5. **Seeding** — an idempotent `init_db()` that creates tables if absent and inserts the
   two demo patients (`demo-1`, `demo-2`) with their exact existing assessments. Running
   it twice must not duplicate rows.

6. **Env toggle + fallback (REQUIRED — do not skip):**
   - Env var `PATIENT_STORE` = `postgres` or `memory`. Default `memory`.
   - In `app.py`, select the store based on this var.
   - If `PATIENT_STORE=postgres` but the DB connection fails at startup, log a clear
     WARNING and fall back to the in-memory store so the app still boots. The demo must
     never hard-crash because Postgres is down.
   - KEEP the existing in-memory store class intact — it is the fallback. Do not delete it.

---

## RUNNING POSTGRES (document in output, user will run)

Easiest local option (Docker):
```
docker run --name hackpg -e POSTGRES_PASSWORD=pass -e POSTGRES_DB=hackathon -p 5432:5432 -d postgres:16
```
Then:
```
set DATABASE_URL=postgresql+psycopg://postgres:pass@localhost:5432/hackathon
set PATIENT_STORE=postgres
python -c "from ml.db import init_db; init_db()"   # create tables + seed demo patients
```
If the user has no Docker/Postgres, they leave `PATIENT_STORE=memory` and everything
works as before (fallback).

---

## ACCEPTANCE TESTS — run and show output

1. With Postgres up and `PATIENT_STORE=postgres`: start the API, fetch `demo-1` and
   `demo-2`, confirm the returned data matches the previous in-memory data exactly.
2. **Persistence proof:** restart the API (and/or the Postgres container), fetch the
   patients again — data is still there. (This is the entire point of the migration.)
3. **Fallback proof:** stop Postgres, set `PATIENT_STORE=postgres`, start the API —
   it must boot on the in-memory fallback with a clear warning, not crash.
4. Confirm `rag.py build` / `rag.py query` / `generate.py` / `eval.py` are UNCHANGED
   and still run.
5. Confirm the FastAPI JSON response shapes are identical to before (frontend unaffected).

---

## WHEN DONE

STOP. Report: files created/changed, the exact run commands, and the acceptance-test
output. Explicitly confirm the RAG pipeline and FAISS files were not modified.
```
```