# Data Contract

This describes the shape any future dataset must be reshaped into before it
reaches `ml/`. It is intentionally disease-agnostic — no column here names a
specific condition, lab test, or outcome. Once a disease/dataset is chosen,
write a preprocessing step that maps the real source data onto this contract;
nothing else in `ml/` or `frontend/` should need to change.

## Required columns

| Role | Column | Type | Notes |
|---|---|---|---|
| Patient identifier | `patient_id` | string | Stable across all of a patient's assessments. |
| Assessment / timepoint | `assessment_id` | string | Unique per (patient, timepoint) row. Orders a patient's history. |
| Assessment time | `assessment_time` | ISO 8601 datetime | When the predictor variables were observed. |
| Predictor variables | `feature_*` (arbitrary names) | numeric / categorical | Whatever the chosen dataset provides — these become the `features` dict sent to `/predict`. |
| Outcome | `outcome` | 0/1 (binary) | The event the model predicts. Must be binary for the current metrics layer. |
| Outcome time | `outcome_time` | ISO 8601 datetime | When the outcome was observed/adjudicated (for future time-to-event work). |

## Optional columns

| Role | Column | Type | Notes |
|---|---|---|---|
| Demographic / group | `group_*` (arbitrary names) | categorical | Fed to `metrics.evaluate_model(..., groups=...)` for subgroup/fairness slicing (e.g. age band, sex, site). One column per grouping at a time. |

## Longitudinal shape

A patient may contribute multiple rows (one per `assessment_id`), each with
its own `assessment_time`, features, and (once known) outcome:

```
patient_id  assessment_id  assessment_time        feature_*   outcome  outcome_time
P-1001      A-1            2026-01-01T00:00:00Z    ...         ?        ...
P-1001      A-2            2026-03-01T00:00:00Z    ...         ?        ...
P-1001      A-3            2026-06-01T00:00:00Z    ...         1        2026-06-15T00:00:00Z
```

`ml/app.py`'s `/predict` endpoint takes one assessment's features per call.
A patient's `trajectory` (see `ml/schemas.py`) is the sequence of risk scores
produced by calling the model once per historical assessment, in
`assessment_time` order — not a temporal model. No LSTM/Transformer/GRU or
other sequence model is assumed or required by this contract.

## What this contract deliberately excludes

- Disease-specific column names (no lab panels, diagnosis codes, symptom
  lists, etc.) — those live in the preprocessing step once a dataset is
  chosen, not in the contract itself.
- A fixed feature schema — `feature_*` columns become whatever dict
  `RiskModel.predict_proba()` / `.explain()` receive (see `ml/models/base.py`).
- Multi-class or continuous outcomes — the current metrics layer
  (`ml/metrics.py`) assumes a binary `outcome`. Extending to multi-class or
  time-to-event is future work, not part of this scaffold.
