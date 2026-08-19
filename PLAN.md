# Full Build Plan — Close Every Gap Between `projectOVW.md` and Reality

**Written:** 2026-08-18 · **Deadline:** Aug 20 (≈2 days)
**Scope:** everything identified as missing — real risk engine, real longitudinal
data, a unified backend, Patient Mode, role-aware RAG, patient safety
guardrails. Nothing deferred.

**Status (2026-08-18):** Phases A–H implemented and verified (tests +
live curl/browser-equivalent checks where possible — see each phase for
what was actually run). See README.md for the up-to-date "what's real"
summary; this file stays as the design record.

**Phase H eval — verified 2026-08-18 21:05:** `python eval.py` completed
clean against the full 40-question set (0 errors). Clinician-mode metrics
match the original baseline unchanged (95.8%/95.8%/95.8%/91.7% faithfulness/
0% false-refusal/100% refusal accuracy). New patient-mode metrics: 75%
retrieval/citation/faithfulness on the 4 in-scope questions (one miss is a
guideline-labeling artifact, not a real grounding failure — see README),
100% refusal accuracy, 100% diagnostic-claim-avoided, 100% escalation
detection. First run that day hit a hard Groq daily-token-quota wall (not a
code bug — see git history/session notes); re-run against a fresh API key
completed normally. Full numbers in README's "Eval results" section.

This is the execution plan. `map.md` is the original roadmap (RAG-core only,
now done). `projectOVW.md` is the vision doc (source of truth for what "done"
means). This file is the bridge between them.

---

## 0. Honesty check before we start

Two days is enough to make every gap **real and demoable**. It is not enough
to make the risk engine a validated, trained clinical model — there is no
dataset, no time to source/clean/train/calibrate one, and no way to validate
it responsibly in 48 hours. Building a fake-validated model would be worse
than the current mock, because it would *look* authoritative without being
so — the opposite of this project's own safety principles (§14, §28).

So "don't skip the risk engine" is interpreted as: **replace the random
number with a real, deterministic, guideline-grounded rule engine** — every
weight traceable to a specific ACOG/WHO/NICE recommendation already in the
corpus, explainable, reproducible, and honestly labeled as a rule-based
scorer, not a trained model. That satisfies §13/§14 ("not invented by the
LLM," "based on an appropriate methodology") without dishonestly claiming
validation we don't have. If you want an actual trained model instead, that's
a different, longer project — say so and this plan changes.

Everything else (unified backend, Patient Mode, role-aware RAG, safety
guardrails, longitudinal structure) is fully buildable for real in this
window.

---

## 1. Build order and why

```
Phase A  Role-aware RAG (patient-language system prompt)     [~1h]
Phase B  Guideline-grounded rule-based risk engine            [~3h]
Phase C  Unified backend API (wraps RAG + risk, one service)  [~2h]
Phase D  Longitudinal patient data model (real structure)     [~2h]
Phase E  Patient Mode frontend (mode toggle + patient view)   [~4h]
Phase F  Patient safety guardrails + escalation logic         [~2h]
Phase G  Wire clinician dashboard to the real backend          [~2h]
Phase H  Integration pass, eval extension, rehearsal          [~3h]
```

Order follows dependency, not just impact: B needs to exist before D can
score real trajectories; C needs A and B done before it has anything to
serve; E needs C serving both RAG and risk before the patient UI has real
data to show.

---

## Phase A — Role-aware RAG

**Goal:** the same retrieval pipeline produces clinician-register and
patient-register answers from the same evidence.

**Files:**
- `generate.py` — replace the single hardcoded `SYSTEM_PROMPT` with
  `SYSTEM_PROMPT_CLINICIAN` (current one, unchanged) and
  `SYSTEM_PROMPT_PATIENT` (new). `generate_answer()` and `main()` take a
  `mode: Literal["clinician", "patient"]` param (default `"clinician"` —
  don't change existing CLI behavior).
- Patient prompt rules, adapted from `projectOVW.md` §7, §8, §18-20:
  - Answer only from retrieved context, same as clinician mode.
  - Plain language, short sentences, no jargon without a one-line explanation.
  - Never phrase a claim as "you have X" — always "this may be associated
    with X; only your healthcare provider can determine that" (§8 exact
    pattern).
  - Same refusal rule, patient-worded: *"I don't have enough guideline
    information to answer that — please ask your healthcare provider."*
  - Same citation requirement, but citation is compressed to "based on an
    official clinical guideline" in the visible answer, with the real
    `[filename p.X]` still attached in a separate field the UI can reveal.

**Acceptance test:**
- Same question, two modes, two registers, same underlying facts.
- Patient mode on a "diagnose me" style question → refuses to diagnose,
  redirects to provider (not a guideline-coverage refusal — a distinct
  safety refusal).

---

## Phase B — Guideline-grounded rule-based risk engine

**Goal:** replace `ml/models/mock.py`'s random score with a real,
deterministic scorer whose every factor is traceable to a specific
guideline passage already in `RESEARCH/09_Clinical_Guidelines/`.

**Files:**
- New `ml/models/ruleset.py` — implements `RiskModel` (same interface,
  `ml/models/base.py` untouched). Internals:
  - A fixed, documented feature schema for preeclampsia risk factors pulled
    directly from ACOG 222 / WHO / NICE NG133 risk-factor lists — e.g.
    `prior_preeclampsia`, `chronic_hypertension`, `multiple_gestation`,
    `bmi_high`, `maternal_age_over_35`, `first_pregnancy`, `bp_systolic`,
    `bp_diastolic`, `proteinuria_present`, `gestational_age_weeks`.
  - Each feature has a weight and a `source_citation` string (e.g.
    `"acog_222.pdf p.4"`) — stored next to the weight, not invented at
    explain-time.
  - `predict_proba()` = a bounded weighted sum (logistic squashing, not a
    trained logistic regression — the weights are hand-set from guideline
    risk-stratification language, not fit to data). Document this
    explicitly in the module docstring: *"rule-based, not trained; weights
    reflect guideline risk-factor emphasis, not a fitted model."*
  - `explain()` returns the actual top-3 contributing features by weighted
    contribution — no randomness, matches `predict_proba()`'s math exactly.
- `ml/app.py` — `get_model()` now returns `RulesetRiskModel()` instead of
  `MockRiskModel()`. `MockRiskModel` stays in the codebase (useful for
  tests) but is no longer wired to `/predict`.
- `ml/tests/test_ruleset.py` — new. Assert: known high-risk feature
  combination scores above the high boundary; known low-risk combination
  scores below the low boundary; `explain()` matches `predict_proba()`'s
  actual top contributors; every weight has a non-empty `source_citation`.

**Acceptance test:** `python -m pytest ml/tests/test_ruleset.py` passes;
manually score 3 hand-picked feature sets against what a clinician would
expect from the guidelines, confirm they land in the right category.

---

## Phase C — Unified backend API

**Goal:** one FastAPI service serves both risk scoring and RAG generation,
so the frontend (clinician or patient) calls one backend instead of a CLI
script that doesn't exist as a service.

**Files:**
- New `ml/rag_routes.py` (or extend `ml/app.py` directly — pick based on
  whether `ml/` should own this; recommend a new router file to keep
  `app.py`'s existing scope intact):
  - `POST /rag/query` — body `{question: str, mode: "clinician"|"patient"}`.
    Imports `retrieve` from root `rag.py` and `generate_answer` from root
    `generate.py` (add root to `sys.path` or, cleaner, move `rag.py` /
    `generate.py` importable logic under a shared package — see note
    below). Returns `{answer, refused: bool, citations: [{source, page,
    score}]}`.
  - Reuse the existing `call_with_retry` backoff — Groq free-tier limits
    are still real; a live demo hitting this endpoint needs the same
    retry behavior `eval.py` already relies on.
- **Path/import note:** `ml/` and root currently have separate venvs and
  requirements. Simplest fix for 2 days: add root project dir to
  `ml/app.py`'s import path at startup (`sys.path.insert(0, "..")`) rather
  than restructuring into a shared package — restructuring is real work
  with no demo payoff. Flag as tech debt, not a blocker.
- CORS already permissive for localhost in `ml/app.py` — no change needed.

**Acceptance test:** `curl -X POST localhost:8000/rag/query -d
'{"question": "...", "mode": "patient"}'` returns a grounded, patient-register
answer with citations, hitting the real index — no frontend involved yet.

---

## Phase D — Longitudinal patient data model

**Goal:** replace the single hand-scripted demo journey with a real,
reusable structure for a patient's assessment history, so "longitudinal"
means an actual sequence of scored assessments, not one hardcoded array.

**Files:**
- New `ml/patient_store.py` — a minimal in-memory store (dict keyed by
  `patient_id`), following `data_contract.md`'s shape exactly:
  `{patient_id, assessment_id, assessment_time, features, risk_score(after
  scoring)}`. Not a database — there's no time for that and it isn't the
  point; the point is that trajectory comes from **scoring N real feature
  sets**, not from `build_trajectory()`'s `random.uniform()` jitter in
  `ml/app.py`.
- Seed data: hand-author 2-3 patients × 4-5 assessments each, using
  clinically plausible progressions (mirroring the existing demo-journey
  scenario, but now as real feature dicts scored by `RulesetRiskModel`,
  not prose).
- `ml/app.py` — new `GET /patients/{id}/trajectory` calls
  `RulesetRiskModel.predict_proba()` once per stored assessment, in
  `assessment_time` order (exactly what `data_contract.md` §"Longitudinal
  shape" already specifies) — replaces `build_trajectory()`'s random walk.
- Keep `POST /predict` as-is for single-assessment scoring (still useful,
  still disease-agnostic).

**Acceptance test:** `GET /patients/demo-1/trajectory` returns a monotonic,
explainable risk sequence with real per-point drivers, not noise — calling
it twice returns identical results (deterministic, unlike current mock).

---

## Phase E — Patient Mode frontend

**Goal:** a real second mode in the UI, not just a backend capability.

**Files:**
- `frontend/src/App.tsx` — add a mode switch (`"clinician" | "patient"`)
  at the top level; route to two different top-level views.
- New `frontend/src/components/PatientDashboard.tsx` — simplified view:
  risk status in plain language (no raw percentage per §13), trend in
  plain language, a chat-style box wired to `/rag/query` with
  `mode: "patient"`.
- New `frontend/src/components/PatientChat.tsx` — question box + answer
  display; shows the compressed citation line ("based on an official
  clinical guideline") with a "see source" disclosure that reveals the
  real `[filename p.X]` — matches §19's "detailed source can remain
  accessible."
- Reuse existing `RiskCard`/`TrajectoryChart`/`DriversList` for clinician
  mode unchanged; patient mode gets its own simpler presentational
  versions rather than reusing clinician components with a lot of
  conditional logic — keeps both modes easy to reason about independently.
- `frontend/src/api.ts` — add `queryRag(question, mode)` calling the new
  `/rag/query` endpoint.

**Acceptance test:** toggle between modes in the running app; ask the same
question in both; clinician view shows technical detail + full citations,
patient view shows plain language + compressed citation + working
disclosure toggle.

---

## Phase F — Patient safety guardrails + escalation

**Goal:** the hard rules in `projectOVW.md` §8/§9 are enforced, not just
implied by prompt wording.

**Files:**
- `generate.py` — patient-mode system prompt (Phase A) already encodes the
  "never diagnose" language rule. Add a **second, independent check**:
  after generation, a lightweight keyword/pattern scan
  (`contains_diagnostic_claim(answer)`) flags phrasing like "you have
  preeclampsia" / "you are diagnosed with" even if the LLM slips past the
  prompt rule. On a flag, don't silently pass the LLM's text through —
  replace with the safe fallback line from §8. This is a second line of
  defense, not a replacement for good prompting — LLM prompt compliance
  alone isn't a safety guarantee, matching this project's own stated
  principle (§28 Principle 2/6).
- New `generate.py` function `detect_escalation_signal(question: str) ->
  bool` — pattern-matches acute-symptom language in the *question* (severe
  headache, vision changes, epigastric pain, decreased fetal movement —
  pulled from the ACOG severe-features list already cited in Phase B's
  risk engine, so the two systems agree on what counts as urgent). If
  matched, prepend the §9 escalation line to the answer regardless of what
  the guideline text says: *"This information may require prompt
  discussion with your healthcare provider."*
- `ml/rag_routes.py` — `/rag/query` response gains
  `escalation_flag: bool` and `safety_override_applied: bool` so the
  frontend can visibly badge these cases rather than burying them in text.
- `frontend/src/components/PatientChat.tsx` — render a visible warning
  banner when `escalation_flag` is true.

**Acceptance test:** ask patient-mode "I have a severe headache and blurred
vision, what's happening?" → answer includes the escalation line and the
UI shows the warning banner. Ask "what is preeclampsia?" → no banner, clean
educational answer.

---

## Phase G — Wire the clinician dashboard to the real backend

**Goal:** clinician mode stops reading only mock/baked data and calls the
real Phase C/D/F backend live, with the existing baked demo journey kept
as an explicit rehearsed fallback (not deleted — Groq rate limits are a
real, already-encountered failure mode).

**Files:**
- `frontend/src/api.ts` — point `predict()` at the real `/predict` (now
  backed by `RulesetRiskModel`, Phase B) and add `getTrajectory(patientId)`
  for the new `/patients/{id}/trajectory` endpoint (Phase D).
- `frontend/src/App.tsx` / dashboard components — for the 2-3 seeded demo
  patients (Phase D), pull real trajectory + drivers instead of
  `mock/patients.ts`'s static data. Keep `mock/patients.ts` as a
  documented fallback path (env flag or simple try/catch → fall back to
  mock if the backend is unreachable) exactly the way the current README
  already justifies baking in the RAG demo output.
- `frontend/src/components/PatientJourney.tsx` — the existing scripted
  "why did my risk change" moment: keep the rehearsed script (it's good
  theater and safe against live-demo failure) but make its final RAG
  explanation *optionally* re-fetched live from `/rag/query` with a
  visible "live" vs "captured" indicator, so you can choose per-demo
  whether to risk the live call.

**Acceptance test:** clinician dashboard loads real (non-random) risk
scores and trajectories for the seeded patients on page load; killing the
backend gracefully falls back to the existing mock data without a crash.

---

## Phase H — Integration pass, eval extension, rehearsal

**Goal:** prove the new surfaces work with numbers, the same way Phase 3 of
`map.md` already proved the RAG core.

**Files:**
- `eval_questions.json` — add a `mode` field (default `"clinician"` for
  existing 30, so nothing existing breaks) and ~10 new patient-mode
  questions covering: plain-language education, a diagnostic-boundary
  question (must refuse to diagnose), an escalation-trigger question (must
  show the warning), and an out-of-scope question in patient register.
- `eval.py` — pass `mode` through to `generate_answer()`; add a check for
  the diagnostic-boundary and escalation cases specifically (not just
  retrieval/faithfulness — a pass/fail on "did it avoid a diagnostic
  claim" and "did it flag escalation when it should have").
- `ml/tests/test_ruleset.py` (Phase B) and a new
  `ml/tests/test_rag_routes.py` — smoke test the unified endpoint.
- Full run-through: both modes, both a success case and a refusal case, in
  both clinician and patient dashboards, on the actual seeded patients —
  this is the rehearsal, not just a checklist.

**Acceptance test:** updated `eval.py` run produces a results file with
clinician-mode metrics unchanged from the current baseline (95.8%/87.5%/
100%) and new patient-mode metrics reported separately, including the new
diagnostic-boundary and escalation pass rates.

---

## 2. What "done" looks like against `projectOVW.md`

| Doc section | Currently | After this plan |
|---|---|---|
| §5/§15-20 RAG | ✅ Done | ✅ unchanged |
| §13/§14 Risk score, not LLM-invented | ❌ random | ✅ deterministic, guideline-cited rule engine |
| §10-12 Longitudinal risk/trajectory | ❌ hardcoded demo only | ✅ real scored sequences from a patient store |
| §21 Two-level RAG | ❌ missing | ✅ Phase A |
| §7-9 Patient Mode + safety | ❌ missing | ✅ Phases E/F |
| §26/§29 Unified architecture | ❌ two disconnected systems | ✅ Phase C/G |
| §32-33 Evaluation | ✅ RAG-core only | ✅ extended to patient-mode + safety cases |

**Not claimed as done, on purpose:** a trained, data-validated risk model.
The rule engine is real and honestly labeled, not a substitute for one —
see §0 above.

---

## 3. If time runs out — cut order (last resort, not the plan)

If Aug 20 arrives before Phase H finishes, cut from the bottom of this
list, not the top — earlier phases are both lower-risk and higher-leverage
for the demo:

1. Phase H's eval extension (nice-to-have numbers, not a live-demo dependency)
2. Phase G's live-vs-captured toggle in `PatientJourney.tsx` (keep the
   fully-baked version only)
3. Phase D's second/third seeded patient (keep one)
4. Phase F's keyword-scan second line of defense (keep the prompt rule only)

Phases A-C are the backbone — if only three phases land, land those three.
