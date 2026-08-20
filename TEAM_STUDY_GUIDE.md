# Team study guide — how this system actually works

Everything below is pulled directly from the current code (not the README,
which has some stale numbers — see the eval section). Read this end to end
once, then use it as a reference during Q&A. The AI/RAG section is the
longest on purpose since that's what's being pitched.

---

## 1. The one-paragraph version

A pregnant patient or clinician asks a question. The question is embedded
and matched against 806 pre-embedded chunks of five real clinical
guidelines (ACOG, WHO, NICE×2, SMFM) using exact cosine similarity search.
The top 5 matching chunks are handed to an LLM along with strict
instructions: answer only from these passages, cite every claim as
`[filename p.X]`, and refuse verbatim if the passages don't cover the
question. Two extra safety checks then re-scan the model's actual output
(not just trust the prompt) before anything reaches the patient. Separately,
a **non-LLM, hand-weighted rule engine** — not the language model — computes
the numeric risk score, because there's no labeled dataset to train or
validate a real model on, and the team decided a fake-validated model would
be worse than an honest rule engine.

---

## 2. The AI / RAG pipeline in depth

### 2.1 Ingestion (`rag.py build`)

- **Source of truth:** every PDF in `RESEARCH/09_Clinical_Guidelines/` — currently 5 files. Nothing else in `RESEARCH/` is ever ingested (those folders are team reading material only).
- **Text extraction:** `pypdf.PdfReader`, per-page `.extract_text()`. If a PDF is scanned images with no text layer, this yields nothing for it — worth knowing if someone asks "what if a guideline is a scanned image?"
- **Chunking (`chunk_text`)** — deliberately simple and explainable:
  - Whitespace/newlines collapsed to single spaces first.
  - Sliding character window: **900 characters, 150 character overlap** (`step = 900 - 150 = 750`), so consecutive chunks share their last 150 characters — no sentence is fully lost at a chunk boundary.
  - Chunking happens **per page**, not per document — a chunk never spans two PDF pages, which is what makes exact page-level citation possible later.
  - This is character-based, not token-based or semantic (no sentence-boundary detection). Simple, fast, fully deterministic — a reasonable tradeoff to defend if asked "why not smarter chunking?": guideline PDFs are short (dozens of pages) and citations need to map back to a literal page number, so page-scoped character windows are simpler to reason about than a chunker that could straddle pages.
- **Embedding model:** `BAAI/bge-small-en-v1.5` via `sentence-transformers`. A small (~130MB), fast, English-only bi-encoder.
  - **Asymmetric retrieval trick:** BGE's own convention is that *queries* get a fixed instruction prefix — `"Represent this sentence for searching relevant passages: "` — while *passages* are embedded plain, with no prefix. This is a known BGE-family requirement, not a project invention; get it wrong and retrieval quality drops. `rag.py`'s `QUERY_INSTRUCTION` constant implements this, applied only in `retrieve()`, never at index-build time.
  - Embeddings are **normalized** (`normalize_embeddings=True`) — this is what makes inner product equivalent to cosine similarity in the next step.
- **Index:** `faiss.IndexFlatIP` — **exact** (brute-force) inner-product search, not an approximate index like IVF or HNSW.
  - At 806 vectors this is effectively instant; an exact index is the right choice at this scale and is simpler to reason about (deterministic, no recall/speed tradeoff to tune). If asked "does this scale to millions of documents?" — no, you'd swap to an approximate FAISS index at that point, but nothing else in the architecture would need to change.
- **Output artifacts:** `guidelines.faiss` (the vector index) and `guidelines_chunks.pkl` (a parallel Python list of `{text, source, page}` dicts — `chunks[i]` corresponds to vector `i` in the FAISS index by position).

**Current corpus (verify with `python -c "import pickle; print(len(pickle.load(open('guidelines_chunks.pkl','rb'))))"` before pitching):**

| Guideline | Chunks |
|---|---:|
| WHO — PE/eclampsia recommendations (2011) | 198 |
| ACOG Practice Bulletin 222 | 183 |
| NICE — hypertension in pregnancy (NG133) | 168 |
| SMFM Consult Series 52 — fetal growth restriction | 137 |
| NICE NG3 — diabetes in pregnancy | 120 |
| **Total** | **806** |

### 2.2 Retrieval (`rag.retrieve()`)

1. The question gets the query instruction prefix, gets embedded, gets normalized.
2. `index.search(query_vec, k=5)` returns the top-5 chunks by cosine similarity (`k=5` is `TOP_K` in `generate.py`).
3. Each result carries `text`, `source` (literal PDF filename), `page`, and `score` (the raw cosine similarity, typically 0.75–0.85 for a good match in this corpus).
4. **No threshold is enforced in code** — retrieval always returns its top 5, even for a wildly out-of-scope question (e.g. "what antibiotic treats a UTI?"). Scope enforcement happens downstream, in the LLM's refusal instruction — retrieval always hands over *something*, and the model is trusted (and separately eval'd) to recognize when none of it actually answers the question. Worth knowing precisely if a judge asks "what happens on a low-confidence match" — the honest answer is "the LLM decides to refuse, retrieval doesn't gate it."

### 2.3 Generation (`generate.py`)

- **Model:** `openai/gpt-oss-120b`, served through the **Groq** API (an open-weight OpenAI model, running on Groq's fast inference hardware — not a Groq-native model). `temperature=0` for determinism.
- **Two separate system prompts**, selected by `mode: "clinician" | "patient"` — same retrieved context, different instructions:

  **Clinician prompt** (`SYSTEM_PROMPT_CLINICIAN`) — 4 rules:
  1. Answer strictly from the provided context passages only — no outside/training knowledge.
  2. Cite every claim as `[filename p.X]` — exact format specified, with a worked example in the prompt itself.
  3. If the context doesn't answer the question, reply with an **exact, fixed refusal string** and nothing else.
  4. No guessing — refuse if in doubt.

  **Patient prompt** (`SYSTEM_PROMPT_PATIENT`) — 7 rules, a superset:
  1. Same context-only rule.
  2. Plain language, jargon briefly explained inline.
  3. **Never diagnose** — explicit instruction with a worked bad/good example pair baked into the prompt itself (`"You have preeclampsia."` → forbidden; `"...may be associated with increased risk, but only a qualified healthcare professional can determine..."` → required framing).
  4. Same citation format requirement.
  5. Same fixed-refusal-string rule (different string from clinician mode).
  6. No guessing.
  7. If the question sounds like an urgent/concerning symptom, gently encourage contacting a provider.

  Both prompts share a language instruction: **answer in the same language as the question**, but citations always stay in the original English filename format, and the refusal sentence is always emitted in English by the model itself (see §2.4 for how Arabic refusals actually get translated).

- **Context assembly (`build_context_block`):** the 5 retrieved chunks become a numbered block: `[1] Source: <filename> p.<page>\n<text>`, then `[2]...` etc. This numbered format is what the citation instruction refers back to.
- **Post-processing:** the model occasionally emits full-width CJK-style brackets (`【】`) instead of ASCII `[]` despite the instruction — `generate_answer()` normalizes this with a plain string replace rather than relying on prompt compliance alone. This is a good example of the project's general philosophy: **assume the LLM won't perfectly follow instructions, and add a code-level correction rather than trusting the prompt harder.**

### 2.4 Patient-mode safety guardrails — the most pitch-relevant part

Two independent checks run *after* generation, on the model's actual input/output text — not just prompt instructions. This is the answer to "how do you know it's actually safe, not just told to be":

**Diagnostic-claim override** (`contains_diagnostic_claim`)
```python
_DIAGNOSTIC_CLAIM_PATTERN = re.compile(
    r"\byou(?:'ve| have)\s+(?:been\s+)?(?:diagnosed with\s+)?"
    r"(preeclampsia|eclampsia|gestational hypertension|hellp syndrome|chronic hypertension)\b",
    re.IGNORECASE,
)
```
Scans the model's **output** for direct-diagnosis phrasing ("you have preeclampsia", "you've been diagnosed with..."). If it matches, the entire answer is thrown away and replaced with a fixed safe-fallback sentence — regardless of how well-cited or fluent the original answer was.

**Escalation detector** (`detect_escalation_signal`)
Scans the **question** (not the answer) for acute-symptom language, pattern-matched against six categories pulled from the same ACOG "severe features" list the risk engine's weights are grounded in (§3): severe headache, visual disturbance, epigastric pain, sudden facial/hand swelling, decreased fetal movement, seizure/convulsion. If matched, a fixed line — *"This information may require prompt discussion with your healthcare provider."* — is prepended to the answer, regardless of what the retrieved guideline text says.

Both checks are **regex on literal text**, not another LLM call — fast, deterministic, and auditable in a way "ask another LLM to check the first LLM" wouldn't be. That's a legitimate design answer if asked why guardrails aren't themselves LLM-based.

`ml/rag_routes.py` surfaces both as booleans on the API response (`escalation_flag`, `safety_override_applied`) so the frontend can badge them visibly instead of burying the effect in prose.

### 2.5 Refusal handling

- Each mode has one **fixed refusal string** (English). The model is instructed to output it verbatim; `answer_question()` checks for an *exact string match* to decide `is_refusal` — not a fuzzy "did it seem like a refusal" heuristic.
- Clinician: `"The provided guidelines do not cover this."`
- Patient: `"I don't have enough guideline information to answer that — please ask your healthcare provider."`
- Refusing correctly on an out-of-scope question is treated as a **success**, not a failure, in eval scoring (§5) — "I don't have enough evidence" is the desired safety behavior for a medical system, per the project's own stated principle.

### 2.6 Multilingual (Arabic) support — easy to miss, worth knowing

`answer_question()` in `generate.py` is Arabic-aware end to end:
1. `is_arabic_text()` checks the question against Arabic Unicode block ranges.
2. If Arabic, a **separate Groq call** (`translate_to_english`) produces an English version of the question **used only for retrieval** — the embedding model (`bge-small-en-v1.5`) is English-only, so FAISS and the index never see non-English text. The translation is discarded immediately after retrieval.
3. `generate_answer()` is then called with the **original** (Arabic) question, not the translation, so the model answers in Arabic per the language instruction in the system prompt.
4. **Refusals are special-cased:** the model is always instructed to emit the refusal sentence in English (so the internal exact-string-match check keeps working regardless of question language), and if a refusal fires on an Arabic question, `answer_question()` swaps in a **pre-written, human-authored Arabic translation** of the refusal (`REFUSAL_TEXT_AR` / `REFUSAL_TEXT_PATIENT_AR`) rather than trusting the model to translate its own refusal on the fly. This keeps the safety-critical refusal path deterministic in every language, at the cost of only supporting Arabic as a second language today (the constant-swap approach doesn't generalize to arbitrary languages without adding more pre-written constants).

### 2.7 Reliability: rate-limit handling

`call_with_retry()` wraps every Groq call. Groq's free tier caps at **8,000 tokens/minute and 200,000 tokens/day** — this fires routinely during `eval.py`'s ~50-question runs. On a 429, it parses Groq's own suggested wait time out of the error message when present (`"try again in X(ms|s)"`), otherwise falls back to exponential backoff (`5 * 2^attempt`), up to 6 attempts. If the free-tier daily cap is genuinely exhausted, this cannot be retried around — good to know before a live demo (mitigation: the frontend's "Patient journey demo" has a **captured** answer alongside the **live** one specifically so a rate-limit mid-pitch doesn't kill the demo).

---

## 3. The risk engine (`ml/models/ruleset.py`) — NOT the LLM, on purpose

**Core architectural principle (from `projectOVW.md`):** *"The LLM should not invent the patient's risk score."* The number a clinician sees never comes from the language model — it comes from a separate, deterministic scorer. The LLM's only job downstream is to *explain* a score it didn't generate.

### Why a rule engine and not a trained model

There is no labeled outcome dataset for this project (`data_contract.md`) — no ground truth to fit weights to, and no way to honestly validate calibration in a hackathon timeframe. The team's explicit call: **a fake-validated black-box model would be worse than an honest, inspectable rule engine** — it would look authoritative without being so. `ml/models/base.py` defines a `RiskModel` interface so a real trained model can be swapped in later (`get_model()` in `app.py` is the single point of change) without touching any calling code.

### How it actually scores

```
score = sigmoid(BIAS + sum of weights for every active feature))
BIAS = -3.0   (so a patient with nothing active scores solidly "low", not near a boundary)
```

Every weight is **hand-set by strength of the guideline evidence**, and every single feature carries the literal filename + page it came from, in the same `[filename p.X]` format the RAG side uses:

| Feature group | Weight | Example / source |
|---|---:|---|
| Severe-range BP (≥160 systolic or ≥110 diastolic) | **3.0** | ACOG-222 p.2-3 |
| Thrombocytopenia / elevated liver enzymes | **2.0** each | ACOG-222 p.17 |
| Severe headache / visual disturbance / epigastric pain | **1.8** each | NICE p.43 / p.6 |
| Proteinuria ≥300mg/24h | **1.6** | ACOG-222 p.3 |
| High-risk history (prior HTN pregnancy, CKD, autoimmune disease, pregestational diabetes, chronic HTN, multifetal gestation) | **1.4** each | NICE p.7 / ACOG-222 p.7 |
| Elevated BP (≥140/90, below severe) | **1.2** | NICE p.42 |
| Nausea/vomiting | **1.0** | NICE p.6 |
| Moderate-risk history (nulliparity, age ≥40, BMI ≥35, family history) | **0.6** each | NICE p.7 / ACOG-222 p.8 |

Blood pressure is banded, not linear — a patient is scored on whichever single band they fall in (severe *or* elevated *or* neither), never both. High-risk vs. moderate-risk history factors are deliberately weighted >2× apart because NICE's own aspirin-prophylaxis guidance treats a *single* high-risk factor as sufficient, but requires *more than one* moderate factor before recommending the same intervention — the weight gap encodes that asymmetry directly from the guideline, not from a fitted model.

`explain()` returns the top-3 highest-weight active features; `explain_with_citations()` (what the API actually uses) returns *all* active features with their description and source, sorted by impact — this is what powers the "why is this patient's risk changing" driver list in the dashboard.

### Worked examples (good to have memorized for a live walkthrough)

**demo-1, latest assessment** (28y, 32 weeks: BP 165/95, nulliparity, family history of preeclampsia, proteinuria, severe headache, visual disturbance):
- Active: BP severe (3.0) + nulliparity (0.6) + family history (0.6) + proteinuria (1.6) + severe headache (1.8) + visual disturbance (1.8) = **9.4**
- Score = sigmoid(-3.0 + 9.4) = sigmoid(6.4) ≈ **0.998** → **HIGH** risk
- Top driver: severe-range blood pressure, tied next by severe headache and visual disturbance

**demo-2, latest assessment** (BP 122/78, no other factors):
- Active: nothing clears a threshold
- Score = sigmoid(-3.0 + 0) = sigmoid(-3.0) ≈ **0.047** → **LOW** risk

That ~0.05 vs ~0.998 spread on two real seeded patients is a good concrete "look, it actually discriminates" demo moment.

### Risk categories

```
< 0.34  -> LOW
0.34–0.67 -> MODERATE
>= 0.67 -> HIGH
```
A prediction within 0.05 of either boundary gets `uncertainty.flag = true` ("near a category boundary") — a placeholder calibration band, explicitly flagged in code comments as something to revisit once a real model's calibration is known.

---

## 4. Backend API (`ml/app.py` + `ml/rag_routes.py`)

One FastAPI app, two logical halves, CORS open to any `localhost`/`127.0.0.1` port (so Vite's auto-port-hop doesn't break dev).

| Endpoint | Method | Does |
|---|---|---|
| `/health` | GET | Liveness check |
| `/patients` | GET | List seeded patient IDs |
| `/patients/{id}/trajectory` | GET | Scores every stored assessment for a patient (oldest→newest) through the **same** `RulesetRiskModel`, returns the real trajectory |
| `/predict` | POST | Score one ad-hoc feature set; also synthesizes a plausible trajectory around it for demo purposes (`build_trajectory` — random walk, explicitly marked DEMO ONLY in code, since there's no real history for an ad-hoc request) |
| `/rag/query` | POST | The RAG endpoint — wraps `answer_question()` from `generate.py` directly (imports root-level code, not a duplicate) |

`/rag/query` request/response (`RagQueryRequest` / `RagQueryResponse` in `rag_routes.py`):
```
POST /rag/query
{ "question": "...", "mode": "clinician" | "patient" }

->
{
  "answer": "...",
  "mode": "clinician" | "patient",
  "refused": bool,
  "citations": [{ "source": "...", "page": N, "score": 0.83 }, ...],
  "escalation_flag": bool,   // patient mode only, meaningful only when not refused
  "safety_override_applied": bool  // patient mode only — true if the diagnostic override fired
}
```

Risk-scoring responses (`RiskResult` in `schemas.py`) always carry `risk_score`, `risk_category`, `trajectory`, `trajectory_direction`, `drivers` (bare feature/impact), `driver_details` (feature + impact + guideline description + citation — only populated when the model supports `explain_with_citations()`, which `RulesetRiskModel` does), an `uncertainty` flag, and a placeholder `confidence` (currently `random.uniform(0.6, 0.95)` — flagged in code as a stand-in until a real model exposes calibrated confidence; **don't claim this number means anything in a pitch**).

---

## 5. Data layer

- **Default:** `InMemoryPatientStore` — a plain Python dict (`ml/patient_store.py`), two seeded patients (`demo-1`, `demo-2`) with real multi-assessment histories (not fabricated per-request). Resets on every backend restart.
- **Optional:** `PostgresPatientStore` (`ml/db.py`), SQLAlchemy 2.x, JSONB columns for the flexible per-patient content (features, app content, care plan, etc.) rather than one column per clinical field — deliberately schema-flexible since the feature set is meant to grow. Toggled with `PATIENT_STORE=postgres` + `DATABASE_URL`.
- **Fallback behavior (important, was a hard requirement):** if `PATIENT_STORE=postgres` is set but Postgres is unreachable at startup, the backend logs a warning and **falls back to in-memory** rather than crashing. `try_create_postgres_store()` uses a short (3s) connect timeout specifically because `localhost` can resolve to `::1` before `127.0.0.1` on Windows, and an unreachable address with no timeout can hang startup indefinitely otherwise.
- Both stores implement the exact same method surface (`list_patient_ids`, `get_assessments`, `get_content`, `list_learn_articles`, `get_learn_article`, `get_clinician`) so `app.py` never branches on which one is active.

---

## 6. Eval harness (`eval.py`) — methodology and CURRENT real numbers

**Run it fresh before pitching** (`python eval.py`, several minutes, real Groq calls) — the numbers below are from the last run in this repo; the README's table is from an older, smaller question set and is out of date. Verify with:
```
python -c "import json; d=json.load(open('eval_results.json')); print(d['summary'])"
```

### Metrics, precisely defined

- **Retrieval hit-rate@5 (doc / page):** for in-scope questions only — does *any* of the top-5 retrieved chunks come from an expected source document (doc-level) / expected exact page (page-level)?
- **Citation accuracy:** does the model's *actual cited* source label (parsed from `[filename p.X]` in its own answer via regex) overlap with the expected source set? (Never counted as correct if the answer was a refusal.)
- **Faithfulness:** LLM-as-judge — a **separate** Groq call (`JUDGE_SYSTEM_PROMPT`) shown the same context + the answer, asked a strict YES/NO: is every claim in the answer directly supported by the context, no outside information? This is checking *groundedness*, not "is the answer good."
- **False-refusal rate:** in-scope questions the model incorrectly refused (lower is better — a false refusal is a coverage failure).
- **Refusal accuracy:** out-of-scope questions the model correctly refused on.
- **Diagnostic-claim avoided / escalation detection:** dedicated small question sets (2 each) specifically designed to trigger each guardrail — checked with the exact same functions (`contains_diagnostic_claim`, `detect_escalation_signal`) that run in production, so eval and runtime behavior can't drift apart.

### Current numbers (50 questions total)

| | Clinician (n=40: 33 in-scope + 7 refusal) | Patient (n=10: 4 in-scope + 2 refusal + 2 diagnostic-boundary + 2 escalation) |
|---|---:|---:|
| Retrieval hit-rate@5 (doc) | 78.8% | 75.0% |
| Retrieval hit-rate@5 (page) | 78.8% | 75.0% |
| Citation accuracy | 78.8% | 75.0% |
| Faithfulness (LLM-judge) | 93.8% | 50.0% |
| False-refusal rate | 3.0% | 0.0% |
| Refusal accuracy | 100.0% | 100.0% |
| Diagnostic-claim avoided | — | 100.0% |
| Escalation detection | — | 100.0% |

**Be ready to own the weak numbers, don't hide them:**
- Patient faithfulness (50%) is on a **10-question sample** — a single miss swings it 10 points. Know this cold if asked "why is patient mode worse."
- Clinician false-refusal is 3.0%, not the README's stale 0.0% — one in-scope clinician question is being incorrectly refused. Worth knowing which one before the pitch: check `eval_results.json` for `"false_refusal": true` under `type: "in-scope"`.

**Question coverage (all 50):** in-scope/clinician 33, refusal/clinician 7, in-scope/patient 4, refusal/patient 2, diagnostic-boundary/patient 2, escalation/patient 2.

**Where citations point** (across all 50 questions' expected sources, 45 total mentions): ACOG-222 22, NICE NG133 13, WHO 4, NICE NG3 (diabetes) 3, SMFM Consult 52 3 — i.e. the eval set leans heavily on the two core preeclampsia guidelines, with the diabetes/FGR guidelines as lighter secondary coverage.

Separately, `ml/metrics.py` runs a classifier-evaluation rigor layer (AUROC, calibration, decision-curve, subgroup fairness) against **synthetic** data — this exercises the risk-engine evaluation machinery, not real patient outcomes, and is unrelated to `eval.py`'s RAG metrics. Don't conflate the two if asked about "model validation."

---

## 7. Frontend & mobile (brief — not the AI part, but "everything")

- **Web (`frontend/`, React 19 + Vite + TypeScript):** Clinician/Patient mode switch in `App.tsx`. Clinician mode live-loads `demo-1`/`demo-2` from the backend on page load, with a visible "live backend" vs "mock data (backend unreachable)" badge so a dead backend never hard-crashes the demo. Patient mode (`PatientDashboard.tsx`, `PatientChat.tsx`) shows a simplified risk view (no raw percentage — deliberate, per the project's own safety principle of not overwhelming patients with a bare number) plus a live chat wired to `/rag/query`.
- **Mobile (`Mobile/`, Expo/React Native, SDK pinned to 56):** talks to the same backend, not a separate one. Platform-dependent default URL resolution in `src/api/config.ts` (`10.0.2.2` for Android emulator, `localhost` for iOS sim/web, LAN IP via `EXPO_PUBLIC_API_URL` for a physical device).
- **Demo journey:** in Clinician mode, "Patient journey demo" walks a hand-crafted scenario (matches `demo-1`'s real seeded data: 28y, BP climbing 118/76 → 165/95, new severe headache + visual disturbance by week 32) ending in a "why did my risk change" reveal with two sources — a **captured** (safe, baked-in) answer and a **live** call to the real `/rag/query` endpoint, so a judge can be shown it isn't just replaying a fixture without betting the whole demo on Groq's rate limit holding up.

---

## 8. Likely judge questions — prepared answers

**"How do you stop it from hallucinating?"**
Three independent layers: (1) the prompt restricts the model to only the retrieved context and demands a citation per claim, (2) `eval.py`'s faithfulness metric is a separate LLM-judge call checking every claim against the context, not just "does this sound right," (3) refusal is enforced as an exact-string match the model is instructed to emit verbatim when context is insufficient — refusing is scored as a *success*, not a failure.

**"Is the risk score from the LLM?"**
No — that's the one thing this architecture is built to prevent. The LLM never sees or invents the numeric score; a separate deterministic rule engine (§3) computes it, and the LLM's only job is explaining a number it didn't generate.

**"Why not train a model on the risk data?"**
There's no labeled outcome dataset to train on (`data_contract.md`) — building one and pretending it's validated would be dishonest. The rule engine is fully inspectable instead: every weight cites the exact guideline page it came from. `RiskModel` is an interface specifically so a trained model can drop in later with zero changes to the API or frontend.

**"What LLM are you actually using, and why?"**
`gpt-oss-120b` (an open-weight OpenAI model) served through Groq for fast, cheap inference — reasonable for a hackathon budget and low-latency demo needs. Nothing in the architecture is Groq-specific; the `Groq` client call is the only provider-coupled line in `generate.py`.

**"How do the safety guardrails actually work — isn't that just prompt engineering?"**
No — prompt instructions are rule 3/5/7 in the system prompts, but §2.4's two guardrails are separate, deterministic, regex-based checks that run on the model's real output/input text after generation, independent of whether the model followed the prompt correctly. That's the whole point: don't trust prompt compliance as the only safety layer.

**"What happens if Groq rate-limits you mid-demo?"**
`call_with_retry` handles transient 429s automatically with backoff. For the actual pitch, the frontend's demo journey has a pre-captured real answer as a fallback specifically because this bit the team during earlier testing — see `frontend/src/mock/demoJourney.ts`.

**"Does this generalize past preeclampsia?"**
The schemas (`schemas.py`) and risk-model interface (`base.py`) are deliberately disease-agnostic — no preeclampsia-specific field names in the contract layer. Swapping the corpus and the rule engine's weight table is the whole cost of retargeting to another condition; the RAG pipeline and API shape don't change.

---

## 9. Quick numbers cheat sheet

- 5 guideline PDFs, 806 chunks, embedding model `BAAI/bge-small-en-v1.5`, exact FAISS `IndexFlatIP` search, top-5 retrieval.
- LLM: `openai/gpt-oss-120b` via Groq, temperature 0.
- 50 eval questions: 33 clinician in-scope, 7 clinician refusal, 4 patient in-scope, 2 patient refusal, 2 diagnostic-boundary, 2 escalation.
- Clinician: 78.8% retrieval/citation, 93.8% faithful, 100% refusal accuracy, 3.0% false-refusal.
- Patient: 75.0% retrieval/citation, 50.0% faithful (n=10, small sample), 100% refusal accuracy, 100% diagnostic-claim avoided, 100% escalation detection.
- Risk engine: `sigmoid(-3.0 + sum(active feature weights))`, thresholds 0.34 / 0.67 for low/moderate/high.
- Two seeded patients: demo-1 (~0.998, HIGH), demo-2 (~0.047, LOW).

For run commands, see `RUNNING.md`. For the pitch visualization, see the published "Grounded Rounds" artifact.
