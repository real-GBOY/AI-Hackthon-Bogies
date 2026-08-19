# AI Healthcare Hackathon Project

## Guideline-Grounded Clinical Intelligence for Preeclampsia & Hypertensive Disorders of Pregnancy

---

# 1. Project Overview

We are building an **AI-powered clinical decision-support and patient education platform** focused on **hypertensive disorders of pregnancy (HDP)**, with **preeclampsia** as the primary disease focus.

The platform connects:

* Patient information
* Longitudinal risk assessment
* Risk trajectory
* Explainable risk factors
* Guideline-grounded RAG
* Official clinical guidelines
* Patient education
* Clinical decision support
* Citations
* Safety guardrails
* Human clinical oversight

The platform has **two user modes**:

### Clinician Mode

Designed for:

* Obstetricians
* Maternal-Fetal Medicine specialists
* Midwives and antenatal care providers
* Other authorized healthcare professionals

### Patient Mode

Designed for pregnant patients who want to:

* Understand their risk
* Understand medical information in simple language
* Learn about preeclampsia
* Understand their measurements and care plan
* Ask evidence-grounded questions
* Know when they should contact their healthcare provider

The two modes use the same trusted clinical knowledge layer but provide **different levels of information, language, and safety controls**.

---

# 2. The Disease

## Preeclampsia

The primary disease focus is **preeclampsia**, a serious pregnancy complication associated with hypertension and other maternal organ/system abnormalities.

It belongs to the broader category:

> **Hypertensive Disorders of Pregnancy (HDP)**

The MVP will focus primarily on preeclampsia while keeping the architecture extensible to other pregnancy-related conditions.

---

# 3. Why Preeclampsia?

Preeclampsia is a strong use case for an explainable clinical AI system because:

* Risk can change throughout pregnancy.
* Multiple maternal and pregnancy characteristics contribute to risk.
* Patient information changes over time.
* Clinical guidelines contain detailed recommendations.
* Clinicians need to interpret multiple pieces of information together.
* Patients need understandable explanations of complex medical concepts.
* Appropriate monitoring and follow-up are clinically important.

This makes preeclampsia suitable for combining:

> **Longitudinal risk + explainability + guideline-grounded AI.**

---

# 4. The Problem

Healthcare professionals may have access to large amounts of patient information and extensive clinical guidelines, but finding the right information at the right time can be difficult.

At the same time, pregnant patients often receive complex medical information that is difficult to understand.

A clinician may need to answer:

* What risk factors does this patient have?
* Has the patient's risk changed?
* What factors are driving the change?
* What should be monitored?
* What does the relevant guideline recommend?
* Is there enough evidence to support a recommendation?

A patient may ask:

* What is preeclampsia?
* What does my blood pressure mean?
* Why am I considered higher risk?
* What does my doctor mean by this recommendation?
* What warning signs should I be aware of?
* When should I contact my healthcare provider?

Traditional systems often provide raw data without enough context.

General-purpose LLMs introduce another problem:

> They can generate convincing medical information that is not necessarily grounded in authoritative clinical evidence.

Our system addresses both problems.

---

# 5. Our Solution

The platform consists of two connected experiences:

```text
                    AI HEALTH PLATFORM
                           │
              ┌────────────┴────────────┐
              │                         │
              ▼                         ▼
       CLINICIAN MODE              PATIENT MODE
              │                         │
              ▼                         ▼
       Risk Intelligence          Education &
       Decision Support            Understanding
              │                         │
              └────────────┬────────────┘
                           ▼
                 Shared RAG Knowledge
                           │
                           ▼
                Official Clinical Guidelines
```

Both experiences are grounded in the same trusted clinical knowledge base.

However, the output is adapted to the user's role.

---

# 6. Clinician Mode

Clinician Mode is the primary clinical component of the platform.

It provides healthcare professionals with:

* Patient risk assessment
* Risk trajectory
* Explainable risk drivers
* Patient history
* Recent changes
* Follow-up prioritization
* Guideline-grounded clinical Q&A
* Evidence citations
* Safety and uncertainty indicators

The purpose is to help clinicians quickly understand a patient's situation and locate relevant evidence.

---

# 7. Patient Mode

Patient Mode provides a safer and simpler interface for pregnant patients.

The goal is **not to turn the patient into their own doctor**.

Instead, it helps patients understand information and communicate more effectively with their healthcare provider.

Patient Mode can provide:

### Education

Explain:

* What preeclampsia is
* What hypertension during pregnancy means
* General risk factors
* Why monitoring may be necessary
* General information about clinical tests

### Personal Understanding

Where appropriate and authorized, the system can help explain:

* Their recorded measurements
* Their risk category
* Why their risk may have changed
* Their care plan in simpler language

### Evidence-Grounded Questions

Patients can ask questions such as:

> "What is preeclampsia?"

> "Why is high blood pressure important during pregnancy?"

> "What does this measurement mean?"

> "Why does my doctor want to monitor me more closely?"

The system retrieves relevant information from the approved guideline/education corpus and explains it in patient-friendly language.

---

# 8. Patient Safety Boundaries

Patient Mode requires stronger safety guardrails.

The system should **not**:

* Diagnose the patient
* Prescribe medication
* Change medication dosage
* Replace a healthcare professional
* Give false reassurance
* Make unsupported emergency decisions
* Present an AI-generated opinion as a medical diagnosis

For example:

### Unsafe

> "You have preeclampsia."

### Safer

> "The information you provided may be associated with increased risk, but only a qualified healthcare professional can determine whether you have preeclampsia."

---

# 9. Patient Escalation

Patient Mode should recognize situations where the appropriate action is to contact a healthcare professional.

The system can provide guidance such as:

> "This information may require prompt discussion with your healthcare provider."

or, where appropriate:

> "If you are experiencing concerning symptoms, seek appropriate medical care rather than relying on this AI assistant."

The system should not pretend that a chatbot can safely replace clinical assessment.

---

# 10. Layer 1 — Longitudinal Risk Intelligence

The first major technical component is the risk intelligence layer.

Instead of analyzing only a single patient snapshot, the system considers changes over time.

```text
Patient History
      ↓
Current Clinical State
      ↓
Risk Factors
      ↓
Risk Assessment
      ↓
Risk Trajectory
      ↓
Explainable Risk Drivers
      ↓
Follow-Up Priority
```

This allows the clinician to understand not only:

> "What is the patient's risk now?"

but also:

> "How is the patient's risk changing?"

---

# 11. Risk Trajectory

Risk trajectory is a central part of the platform.

Example:

```text
Week 12        Week 16        Week 20        Week 24

  Low   ─────► Moderate ─────► Moderate ─────► High
                   │
                   ▼
              Risk increasing
```

Instead of showing only one risk value, the dashboard visualizes the patient's progression.

This can help clinicians identify patients whose risk profile is changing.

---

# 12. Explainable Risk Drivers

The platform should answer:

> "Why is this patient's risk changing?"

rather than simply:

> "What is the risk?"

The dashboard can display:

* Major risk factors
* Historical factors
* New risk factors
* Relevant measurement changes
* Recent clinical events
* Factors contributing to the trajectory

Example:

```text
Current Risk: Elevated

Risk Trend: Increasing

Main Drivers:
• Previous relevant history
• Current blood-pressure trend
• Relevant pregnancy factor
• Recent clinical change
```

The exact factors and scoring methodology depend on the validated data/model used by the final implementation.

---

# 13. Risk Score

The system may provide a structured risk assessment.

However, the platform should avoid presenting a number without explanation.

Instead of:

> Risk = 72%

the clinician should see:

```text
Risk Status
───────────
Elevated

Trend
─────
Increasing

Main Drivers
────────────
• Factor A
• Factor B
• Factor C
```

Any quantitative risk model should be based on an appropriate validated methodology rather than being invented by the LLM.

---

# 14. Separation Between Risk Model and LLM

A critical architectural principle is:

> **The LLM should not invent the patient's risk score.**

The architecture should instead be:

```text
Patient Data
     ↓
Risk Model / Risk Engine
     ↓
Risk Score + Trajectory
     ↓
LLM
     ↓
Explanation
```

The risk engine is responsible for the quantitative risk assessment.

The LLM is responsible for:

* Explanation
* Natural-language interaction
* Guideline retrieval
* Evidence synthesis

This separation improves transparency and makes the system easier to audit.

---

# 15. Layer 2 — Guideline-Grounded RAG

The second major component is a **Retrieval-Augmented Generation system**.

Instead of allowing the LLM to answer medical questions solely from its pretrained knowledge, the system retrieves relevant information from a curated collection of authoritative clinical guidelines.

The pipeline is:

```text
User Question
      ↓
Query Processing
      ↓
Embedding Model
      ↓
Vector Search
      ↓
Relevant Guideline Sections
      ↓
Context Construction
      ↓
LLM
      ↓
Grounded Answer
      ↓
Citation + Safety Checks
```

---

# 16. Guideline Sources

The RAG knowledge base will use authoritative clinical guidance.

Potential sources include organizations such as:

* ACOG
* NICE
* WHO
* Recognized national and international clinical guideline organizations

The exact corpus will be curated and documented before deployment.

The fundamental rule is:

> **Clinical recommendations should be traceable to authoritative evidence.**

---

# 17. How RAG Works

Suppose a clinician asks:

> "What are the relevant risk factors for preeclampsia?"

The system does not simply ask the LLM to answer from memory.

Instead:

```text
Question
   ↓
Convert question to embedding
   ↓
Search guideline database
   ↓
Retrieve relevant passages
   ↓
Give passages to LLM
   ↓
Generate answer
   ↓
Attach supporting citations
```

The LLM becomes a language and reasoning layer over retrieved evidence.

---

# 18. Grounding

The platform prioritizes **grounded generation**.

Every important clinical claim should ideally fall into one of three categories:

### Supported

The retrieved guideline directly supports the claim.

### Faithful Paraphrase

The wording differs from the guideline, but the meaning remains faithful.

### Unsupported

The response introduces information that cannot be supported by the retrieved evidence.

Unsupported claims should be avoided.

---

# 19. Citation System

The RAG assistant should provide citations alongside relevant answers.

Example:

```text
According to the retrieved clinical guideline,
the relevant risk factors include:

• ...
• ...
• ...

Source:
[Guideline section]
```

This allows clinicians to verify the information.

For patients, citations can remain available but may be presented in a simpler way.

Example:

> "This information is based on an official clinical guideline."

The detailed source can remain accessible for transparency.

---

# 20. Refusal Behavior

If the system cannot find sufficient evidence, it should not fabricate an answer.

Example:

> "The available clinical guideline evidence is insufficient to answer this question."

This is especially important in healthcare.

The project treats:

> **"I don't have enough evidence."**

as a successful safety behavior rather than a failure.

---

# 21. Two-Level RAG Experience

The same underlying knowledge base can support different output styles.

### Clinician

Technical and concise:

> "According to the retrieved guideline, the recommendation is..."

With detailed citations.

### Patient

Simple and understandable:

> "In simple terms, this means..."

With optional access to the supporting source.

This gives us:

```text
               Shared Evidence
                      │
             ┌────────┴────────┐
             ▼                 ▼
        Clinician RAG      Patient RAG
             │                 │
       Clinical Detail    Simple Language
       Citations          Education
       Decision Support   Safety Guidance
```

---

# 22. Who Will Use the Platform?

## Primary Users

### Obstetricians

The primary professional users.

They can use the platform to:

* Review patient risk
* Understand risk trajectory
* Identify important drivers
* Retrieve guideline recommendations
* Support clinical reasoning

---

## Secondary Clinical Users

### Maternal-Fetal Medicine Specialists

For managing high-risk pregnancies and reviewing complex patient trajectories.

### Midwives / Antenatal Care Providers

For monitoring patients and accessing relevant evidence where appropriate.

### Other Healthcare Professionals

Depending on deployment and authorization.

---

# 23. Patient Users

Pregnant patients can use Patient Mode to:

* Learn about preeclampsia
* Understand their risk information
* Understand medical terminology
* Ask general evidence-grounded questions
* Better understand their care plan
* Prepare questions for their healthcare provider

The patient experience is designed around:

> **Education + Understanding + Safe Guidance**

rather than autonomous diagnosis or treatment.

---

# 24. Example Patient Journey

### Step 1

The patient logs into Patient Mode.

### Step 2

They see their available health information.

```text
Pregnancy Overview

Risk Status:
Elevated

Trend:
Increasing

What does this mean?
```

### Step 3

The patient asks:

> "Why is my risk higher?"

### Step 4

The system explains the relevant factors in simple language.

### Step 5

The patient asks:

> "What is preeclampsia?"

### Step 6

The RAG system retrieves relevant evidence.

### Step 7

The system provides a simple explanation and source.

### Step 8

If appropriate, the system encourages discussion with the healthcare provider.

---

# 25. Example Clinician Journey

### Step 1

The doctor opens the patient dashboard.

### Step 2

The system displays:

```text
Current Risk: Elevated

Trend: Increasing

Main Drivers:
• Risk Factor A
• Risk Factor B
• Recent change
```

### Step 3

The doctor asks:

> "What does the guideline recommend in this situation?"

### Step 4

The RAG system retrieves relevant guideline sections.

### Step 5

The LLM generates a concise, evidence-grounded answer.

### Step 6

The doctor reviews the citations.

### Step 7

The doctor makes the final clinical decision.

---

# 26. Follow-Up Prioritization

For clinicians, the platform can provide a prioritized patient queue.

Example:

| Priority | Patient   | Risk     | Trend      | Reason                |
| -------- | --------- | -------- | ---------- | --------------------- |
| High     | Patient A | High     | Increasing | Multiple risk drivers |
| Medium   | Patient B | Moderate | Increasing | Recent change         |
| Low      | Patient C | Low      | Stable     | No major changes      |

The purpose is to help clinicians identify which patients may require closer review.

The system should not autonomously determine treatment.

---

# 27. Human-in-the-Loop

The platform follows a strict:

> **Human-in-the-loop**

architecture.

AI provides:

* Risk information
* Evidence retrieval
* Explanations
* Guideline context
* Patient education
* Prioritization support

Healthcare professionals provide:

* Clinical judgment
* Diagnosis
* Treatment decisions
* Final interpretation

The AI remains a support system.

---

# 28. Safety Principles

## Principle 1 — Evidence First

Clinical information should be grounded in authoritative sources.

## Principle 2 — No Unsupported Claims

The system should avoid unsupported medical statements.

## Principle 3 — Transparent Citations

Evidence should be traceable.

## Principle 4 — Communicate Uncertainty

When evidence is insufficient, the system should say so.

## Principle 5 — Human Oversight

Clinical decisions remain with healthcare professionals.

## Principle 6 — Patient Protection

Patient Mode must not present AI output as a diagnosis or prescription.

## Principle 7 — Clear Scope

The system must clearly communicate that it is a clinical support and education tool, not a replacement for professional medical care.

---

# 29. Technical Architecture

High-level architecture:

```text
                         ┌────────────────────┐
                         │      USERS         │
                         └─────────┬──────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
                    ▼                             ▼
             ┌──────────────┐              ┌──────────────┐
             │  Clinician   │              │   Patient    │
             │     Mode     │              │     Mode     │
             └──────┬───────┘              └──────┬───────┘
                    │                             │
                    ▼                             ▼
             ┌──────────────┐              ┌──────────────┐
             │     Risk     │              │  Education   │
             │ Intelligence │              │ & Guidance   │
             └──────┬───────┘              └──────┬───────┘
                    │                             │
                    └──────────────┬──────────────┘
                                   ▼
                         ┌────────────────────┐
                         │   RAG Assistant    │
                         └─────────┬──────────┘
                                   │
                          ┌────────┴────────┐
                          ▼                 ▼
                   Embedding Model    Vector Database
                                            │
                                            ▼
                                  Official Guidelines
                                            │
                                            ▼
                                          LLM
                                            │
                                            ▼
                               Grounded Answer + Citation
```

---

# 30. AI Components

The prototype uses pretrained models.

### Embedding Model

Converts:

* Clinical guideline chunks
* User questions

into vector representations for semantic search.

### Vector Database

Stores the guideline embeddings and enables retrieval.

### Large Language Model

Generates natural-language answers using retrieved evidence.

### Risk Engine

Handles the quantitative risk assessment and trajectory.

The LLM and risk engine remain conceptually separate.

---

# 31. Why RAG Instead of Fine-Tuning?

Fine-tuning is not the primary approach because the project requires:

* Updatable clinical guidelines
* Traceable evidence
* Citations
* Controlled knowledge sources
* Easier auditing
* Reduced dependence on model memorization

With RAG, the knowledge base can be updated without retraining the entire LLM.

---

# 32. Evaluation

The RAG system will be evaluated using a dedicated benchmark.

The evaluation will contain:

* Direct guideline questions
* Risk-factor questions
* Management questions
* Monitoring questions
* Edge cases
* Out-of-scope questions
* Insufficient-evidence questions

Metrics include:

### Retrieval Quality

Did the system retrieve relevant evidence?

### Groundedness

Is the generated answer supported by the retrieved text?

### Citation Accuracy

Do citations actually support the claims?

### Completeness

Did the answer capture the important evidence?

### Refusal Behavior

Does the system avoid unsupported answers?

### Overall Usefulness

Does the answer help the intended user?

---

# 33. Current Evaluation Goal

The evaluation is not just about:

> "Did the LLM give a good answer?"

We specifically want to determine:

> **Did the system answer using the right evidence?**

This distinction is critical for a medical RAG system.

---

# 34. MVP

For the hackathon, we will build a focused MVP rather than a complete hospital system.

### Core MVP

* Preeclampsia / HDP guideline corpus
* Document processing
* Chunking
* Embedding model
* Vector retrieval
* LLM
* Grounded generation
* Citations
* Refusal behavior
* RAG evaluation benchmark
* Clinician dashboard
* Patient interface
* Risk trajectory visualization
* Explainable risk drivers
* Patient education
* Follow-up prioritization concept
* Human-in-the-loop workflow

---

# 35. What the MVP Does NOT Attempt

The hackathon prototype will not attempt to:

* Replace doctors
* Provide autonomous diagnosis
* Autonomously prescribe medication
* Replace emergency medical services
* Train a massive foundation model
* Build a complete hospital information system
* Make unsupported medical claims

The goal is to demonstrate the architecture and value of **safe, evidence-grounded clinical AI**.

---

# 36. What Makes the Project Different?

The project is not simply:

> "ChatGPT for pregnancy."

It combines multiple capabilities.

### 1. Longitudinal Risk

Understands how risk changes over time.

### 2. Explainability

Shows why the risk is changing.

### 3. Guideline RAG

Answers questions using authoritative clinical evidence.

### 4. Citations

Allows evidence to be traced.

### 5. Refusal

Avoids unsupported medical claims.

### 6. Dual User Experience

Supports both clinicians and patients.

### 7. Role-Aware Responses

Doctors receive clinical detail.

Patients receive understandable explanations.

### 8. Human Oversight

The clinician remains responsible for clinical decisions.

### 9. Disease-Agnostic Architecture

The risk dashboard architecture can later be adapted to other diseases.

---

# 37. Future Expansion

Although the MVP focuses on preeclampsia, the architecture can eventually support:

* Gestational diabetes
* Cardiovascular disease
* Chronic kidney disease
* Other pregnancy complications
* Other chronic diseases

The long-term platform could support multiple disease-specific knowledge bases while maintaining the same core architecture.

---

# 38. Long-Term Vision

The long-term goal is to create an:

> **Explainable Clinical Intelligence Platform**

that connects:

```text
Patient Data
     +
Patient Trajectory
     +
Clinical Risk
     +
Trusted Medical Knowledge
     +
AI Reasoning
     +
Human Expertise
```

The platform should help answer three important questions:

### 1. What is happening?

Understanding the patient's current state and trajectory.

### 2. Why is it happening?

Identifying important risk drivers.

### 3. What does the evidence say?

Retrieving relevant authoritative clinical guidance.

---

# 39. Core Product Philosophy

The system follows:

> **AI assists. Evidence supports. Humans decide.**

For clinicians:

> **Understand the patient → investigate the evidence → make the decision.**

For patients:

> **Understand your health → understand your care → communicate with your provider.**

---

# 40. One-Line Pitch

> **An explainable AI platform for pregnancy care that tracks preeclampsia risk over time and connects both clinicians and patients to trusted, guideline-grounded medical information.**

---

# 41. Short Hackathon Pitch

> We are building an AI-powered clinical intelligence platform for preeclampsia and hypertensive disorders of pregnancy. The platform combines longitudinal risk assessment with a guideline-grounded RAG assistant. Clinicians can monitor how a patient's risk changes over time, understand the main risk drivers, and retrieve evidence-backed clinical guidance with citations. Pregnant patients can use a separate patient-friendly mode to understand their risk, learn about preeclampsia, and ask evidence-grounded health questions in simple language. The system uses strong safety guardrails, avoids unsupported medical claims, and keeps healthcare professionals in control of clinical decisions.

---

# 42. Final Concept

```text
                         AI HEALTH PLATFORM
                                  │
                   ┌──────────────┴──────────────┐
                   │                             │
                   ▼                             ▼
            👨‍⚕️ CLINICIAN MODE              🤰 PATIENT MODE
                   │                             │
          ┌────────┴────────┐           ┌────────┴────────┐
          │                 │           │                 │
          ▼                 ▼           ▼                 ▼
     Risk Dashboard       RAG       Education          RAG
     Risk Trajectory      Q&A       Explanation        Q&A
     Risk Drivers         │         Safety              │
     Follow-up            │         Guidance            │
          │               │           │                 │
          └───────┬───────┘           └────────┬────────┘
                  │                            │
                  └────────────┬───────────────┘
                               ▼
                     OFFICIAL GUIDELINES
                               │
                               ▼
                         GROUNDED AI
                               │
                               ▼
                     Evidence + Explanation
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
               👨‍⚕️ Clinician          🤰 Patient
               makes decision       understands care
```

# 43. Core Idea

**Patient trajectory + clinical risk + AI reasoning + trusted guidelines + explainability + patient education + human oversight.**

The platform is designed around one principle:

> **AI should make medical information easier to understand and clinical evidence easier to access — without replacing the human healthcare professional.**

