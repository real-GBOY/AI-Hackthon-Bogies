# Project Roadmap — Preeclampsia / Hypertension Clinical-Guideline RAG

**Hackathon:** AI Clinical Decision Support (CREATIVA / ITIDA / TIEC / Orange / INSTANT)
**Deadline:** Aug 20 — this roadmap assumes ~2 working days remain.
**Project root:** `E:\Clients\AI-Hackthon`

---

## 0. TL;DR — read this first

We are building a **medical RAG system** that answers pregnancy hypertension / preeclampsia
questions **grounded in official clinical guidelines**, with **citations**, **refusal** when the
guidelines don't cover something, and an **eval harness** that proves it works.

**The graded core is:** retrieval + citations + faithfulness + grounding + refusal + evaluation.
Everything else (risk score, dashboard, longitudinal history) is secondary polish.

**Current reality:** the research library exists, but the RAG pipeline — code, knowledge base,
models, index, eval — is at **zero**. Two files (`rag.py`, `generate.py`) were written but never
landed in the project, and the guidelines folder is empty. Unblocking that is the whole game.

---

## 1. What we're building (architecture)

```
  User question ("BP is 165/95 at week 30, severe headache — what does this mean?")
         |
         v
  [ Embed the question ]  <-- pretrained embedding model (bge-small)
         |
         v
  [ Retrieve top-k chunks ]  <-- FAISS index over CLINICAL GUIDELINES (ACOG/WHO/NICE)
         |                        each chunk carries: source document + page number
         v
  [ Generate grounded answer ]  <-- pretrained LLM (Llama 3.3 via Groq)
         |                          - answer ONLY from retrieved chunks
         |                          - cite [source p.X] after each claim
         |                          - refuse if guidelines don't cover it
         v
  Answer + citations   (+ optional risk level 🟢🟡🔴)   (+ optional "why did it change")
```

**Nothing is trained.** We orchestrate two off-the-shelf pretrained models + our guideline corpus.

---

## 2. Scope decisions (locked)

**IN scope:**
- ONE condition: **hypertension in pregnancy / preeclampsia**.
- Knowledge base = **4 guideline documents** (ACOG, WHO, NICE, + ASPRE for aspirin evidence).
- Grounded Q&A with citations + refusal.
- Eval harness (~30 question/answer/source triplets + metrics).
- Single **demo patient journey** as the final showcase.

**OUT of scope (say "extensible to this later", don't build it):**
- Gestational diabetes, anemia (architecture supports them; we don't populate them).
- Training our own ML risk predictor on EMR data (wrong architecture, no data, no time).
- Real longitudinal EMR ingestion.

**Why:** judges reward one tight working thread over five half-built features. Depth on one
condition beats shallow coverage of three.

---

## 3. Current-state audit — keep / redirect / drop

| Asset | Verdict | Action |
|---|---|---|
| `RESEARCH/` papers (with duplicates) | Keep, ignore dups | Reading + presentation citations only. NOT the RAG source. |
| `09_Clinical_Guidelines/` (empty) | **BLOCKER** | Fill with ACOG/WHO/NICE PDFs immediately. |
| `rag.py`, `generate.py` (missing from repo) | **BLOCKER** | Drop both into project root. |
| `frontend/` React dashboard (mock data) | Keep | This becomes the Phase 4 demo surface. |
| `ml/` FastAPI risk API (MockRiskModel) | Deprioritize | Optional 🟢🟡🔴 add-on. Stop investing until RAG works. |
| `ml/metrics.py` (classifier metrics) | Redirect | Same skill, wrong target — point that person at the RAG eval harness. |
| `lllll.md`, `*.log` at root | Cleanup | Delete / gitignore when convenient (low priority). |

---

## 4. The build — 4 phases

Each phase has a **goal**, **steps**, and an **acceptance test** (how you know it's done).

### Phase 1 — Ingestion + Retrieval  `[BLOCKER — do first]`

**Goal:** turn the guideline PDFs into a searchable index that returns the right passage
with its source + page.

**Steps:**
1. Download guideline PDFs into `09_Clinical_Guidelines/`:
   - ACOG Practice Bulletin 222 (gestational hypertension & preeclampsia)
   - WHO preeclampsia/eclampsia recommendations
   - NICE NG133 (hypertension in pregnancy) — use the recommendations HTML if the PDF extracts badly
   - (optional) ASPRE trial PDF for aspirin evidence
2. Put `rag.py` in the project root.
3. Install + build:
   ```
   pip install pypdf sentence-transformers faiss-cpu numpy
   python rag.py build
   python rag.py query "what blood pressure defines severe hypertension in pregnancy?"
   ```

**Acceptance test:** the query returns chunks from your ACOG/NICE PDFs containing the
≥160/110 threshold, each tagged with a source filename and page number.

**Gotcha:** after `build`, eyeball the chunks. If text is garbled, PDF extraction failed —
switch that document to the NICE recommendations HTML. Bad extraction = silent RAG death.

---

### Phase 2 — Grounded Generation (citations + refusal)  `[the graded core]`

**Goal:** the LLM answers ONLY from retrieved chunks, cites them, and refuses out-of-scope
questions.

**Steps:**
1. Put `generate.py` in the project root.
2. Get a free Groq key at console.groq.com, then:
   ```
   pip install groq
   set GROQ_API_KEY=...        (Windows)   |   export GROQ_API_KEY=...   (mac/linux)
   python generate.py "what blood pressure defines severe hypertension in pregnancy?"
   ```

**Acceptance test (two parts):**
- In-scope question → grounded answer **with `[source p.X]` citations**.
- Out-of-scope question ("what antibiotic treats a UTI?") → returns the exact refusal line,
  does NOT guess.

**Why this matters:** the system prompt here encodes 4 of the grading criteria at once —
grounding, citation, refusal, faithfulness (temperature 0). This is the highest-value 15 lines
in the project.

---

### Phase 3 — Eval Harness  `[non-negotiable — most teams skip it, it's your edge]`

**Goal:** prove the system works with numbers, not vibes.

**Build a CSV/JSON of ~30 triplets:** `question, expected_answer, expected_source`.
You write these by reading your own guidelines (that authorship IS the deliverable).

**Metrics to report:**
- **Retrieval hit-rate @5** — for each question, is the correct source chunk in the top-5? (target: high)
- **Citation accuracy** — does the cited source match where the claim actually came from?
- **Faithfulness** — does the answer stay inside retrieved context? (LLM-as-judge or manual on a subset)
- **Refusal accuracy** — on ~5 out-of-scope questions, does it correctly refuse?

**Starter question set (fill expected answer + source from YOUR PDFs):**

| # | Question | Type |
|---|---|---|
| 1 | What BP defines severe-range hypertension in pregnancy? | in-scope |
| 2 | How is gestational hypertension defined? | in-scope |
| 3 | What proteinuria level supports a preeclampsia diagnosis? | in-scope |
| 4 | When should low-dose aspirin be started for preeclampsia prevention? | in-scope |
| 5 | What is the recommended aspirin dose? | in-scope |
| 6 | What are the "severe features" of preeclampsia? | in-scope |
| 7 | First-line drugs for acute severe hypertension in pregnancy? | in-scope |
| 8 | What is magnesium sulfate used for in preeclampsia? | in-scope |
| 9 | At what gestational age is delivery recommended for preeclampsia without severe features? | in-scope |
| 10 | What antibiotic treats a urinary tract infection? | **refusal** |
| 11 | What is the treatment for a broken arm? | **refusal** |
| 12 | What's a good diet for type 2 diabetes? | **refusal** (out of condition scope) |

Expand to ~30 by adding variations and edge cases. **Ping me and I'll expand this to the full
set against your actual chunks once Phase 1 retrieval is confirmed.**

---

### Phase 4 — Demo Thread (single patient journey)

**Goal:** one clean, rehearsed story that shows every feature in sequence.

**The script:**
1. Patient profile: 28y, week 30, prior normal BP.
2. She reports: "severe headache, some blurred vision." BP now 165/95 (was 118/76 at week 24).
3. System runs adaptive follow-ups (scripted decision tree: severity? vision? last BP?).
4. Risk moves 🟢 → 🟡/🔴 because BP crossed the severe-range threshold.
5. **"Why did my risk change?"** → explanation naming the BP jump + new symptom, **with a guideline citation**.
6. Doctor view: the longitudinal timeline + auto-summary of the journey.

**This is theater — hand-craft the patient data so the thread is airtight.** Wire it into the
existing `frontend/` dashboard (swap mock data for real `generate.py` output).

**"Why did my risk change" is your single best demo moment** — it shows longitudinal reasoning +
explainability + retrieval in one click. Build the demo around it.

---

## 5. Schedule (remaining ~2 days)

**Day 3 (today) — get to a working RAG:**
- [ ] Guidelines into `09_Clinical_Guidelines/`  (30 min)
- [ ] `rag.py` in root → `build` → retrieval works  (1 hr)
- [ ] `generate.py` in root → grounded, cited answer + refusal works  (1 hr)
- [ ] Start the eval triplets (aim for 15)  (2 hr)
- **End-of-day goal:** you can ask a question and get a cited, grounded answer from real guidelines.

**Day 4 — eval + demo wiring:**
- [ ] Finish eval harness (~30 triplets) + run it → get your metric numbers
- [ ] Wire `generate.py` output into the frontend dashboard
- [ ] Build the scripted patient journey + "why did my risk change"
- **End-of-day goal:** the demo thread runs end to end.

**Day 5 — polish + rehearse:**
- [ ] Rehearse the demo (successful case + refusal case)
- [ ] Slides: architecture, eval numbers, safety story
- [ ] Prep judge Q&A (section 7)

---

## 6. Team assignments (adjust to your people)

- **RAG/Backend (1–2):** Phases 1 & 2 — ingestion, retrieval, generation, prompt tuning.
- **Eval (1):** Phase 3 — write the triplets, run metrics, produce the numbers. (Redirect whoever wrote `ml/metrics.py` here.)
- **Frontend/Demo (1):** Phase 4 — wire real output into the dashboard, build the patient journey.
- **Clinical/Presentation (1):** confirm guideline answers, write slides, own the judge Q&A.

---

## 7. Judge Q&A prep (rehearse these)

- **"Why RAG instead of just GPT?"** → RAG grounds answers in authoritative guidelines and lets us
  cite them; a bare LLM fabricates plausible-sounding sources. (Cite: RAG biomedicine meta-analysis, JAMIA 2025.)
- **"How do you know it's not hallucinating?"** → the eval harness — here are our retrieval hit-rate,
  faithfulness, and refusal numbers.
- **"What if it doesn't know?"** → it refuses (demo the out-of-scope case live).
- **"Is this a diagnosis tool?"** → no — decision *support*. The doctor remains the decision-maker;
  we surface evidence and flag changes.
- **"Why one condition?"** → depth over breadth; the architecture is condition-agnostic — diabetes
  and anemia plug into the same pipeline with their own guideline sets.
- **"Why a general embedding model, not a medical one?"** → current benchmarks show general embedders
  match or beat medical-specialized ones on clinical retrieval; we prioritized what measurably works.

---

## 8. Gotchas / risk register

- **Files not in repo** — the #1 current blocker. `rag.py`/`generate.py` must physically be in `E:\Clients\AI-Hackthon`.
- **Empty knowledge base** — the RAG searches guidelines, NOT the research papers. Don't point it at `RESEARCH/`.
- **Bad PDF extraction** — always eyeball chunks after `build`. Garbled text = wrong answers with confident citations.
- **Changing the embedding model** — if you change `EMBED_MODEL`, you MUST re-run `python rag.py build` (old index becomes invalid).
- **Scope creep** — every hour on the `ml/` risk API or a 2nd condition while the RAG is thin is an hour bleeding from the graded core.
- **Demo fragility** — hand-craft and rehearse the patient journey; don't improvise live.

---

## 9. Definition of done (minimum viable winning demo)

1. Real guideline PDFs indexed and retrievable with citations. ✅ Phase 1
2. Grounded, cited answers + working refusal. ✅ Phase 2
3. Eval numbers to show (hit-rate, faithfulness, refusal). ✅ Phase 3
4. One rehearsed patient journey ending in "why did my risk change" + citation. ✅ Phase 4

If all four are true, you have a demonstrable, defensible clinical-decision-support RAG.
Right now zero of four are true — and they're roughly two focused days apart.