# Research Library

This is the research library for our pregnancy-focused AI Clinical
Decision Support System.

The folders in this directory are currently **reserved** for future
research — they contain only placeholder README files describing what
will eventually go in each one. Research papers will be added later.

## Research papers vs. clinical guidelines

**Clinical guidelines** (`09_Clinical_Guidelines/`) are kept separate from
the research-paper folders because they serve a different purpose: they
are the authoritative knowledge base the RAG system will retrieve from at
inference time, not academic material about how the system is built.

## Modeling approach

The project uses **pretrained models** — a pretrained LLM and a pretrained
embedding model — rather than training a language model from scratch.

## Planned system

The system combines:

- Longitudinal patient history
- Risk assessment
- Explainability
- A pretrained LLM
- A pretrained embedding model
- A vector database
- Retrieval-Augmented Generation (RAG)
- Clinical guidelines
- Patient-facing AI
- Doctor-facing clinical summary
