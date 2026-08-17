"""
Disease-agnostic rigor / evaluation layer for the clinical risk-score prototype.

Every function here operates on plain (y_true, y_prob) numpy arrays (plus an
optional group array for subgroup analysis), so none of it depends on which
disease or dataset eventually gets plugged in. This is the layer that turns a
model's raw output into something a clinician / reviewer can trust:
discrimination (AUROC/AUPRC), calibration (calibration curve + Brier score),
clinical utility (decision-curve analysis), fairness (subgroup slicing), and
a simple uncertainty flag for borderline predictions.

evaluate_model() is the single entry point that runs all of the above with
input validation and edge-case handling; the individual compute_* / *_report
functions remain available for callers that want just one piece (e.g. only a
calibration plot).

Run directly (`python metrics.py`) to exercise the whole layer against
synthetic data and confirm everything works end-to-end.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field

import matplotlib

matplotlib.use("Agg")  # headless-safe: never try to open a GUI window
import matplotlib.pyplot as plt
import numpy as np
from sklearn.calibration import calibration_curve
from sklearn.metrics import (
    average_precision_score,
    brier_score_loss,
    roc_auc_score,
)

PLOTS_DIR = os.path.join(os.path.dirname(__file__), "plots")

MIN_SUBGROUP_SIZE = 10


# ---------------------------------------------------------------------------
# Discrimination
# ---------------------------------------------------------------------------


def compute_auroc_auprc(y_true: np.ndarray, y_prob: np.ndarray) -> dict[str, float]:
    """AUROC and AUPRC (average precision) for binary risk predictions."""
    return {
        "auroc": float(roc_auc_score(y_true, y_prob)),
        "auprc": float(average_precision_score(y_true, y_prob)),
    }


# ---------------------------------------------------------------------------
# Threshold-based classification metrics
# ---------------------------------------------------------------------------


def compute_threshold_metrics(y_true: np.ndarray, y_prob: np.ndarray, threshold: float = 0.5) -> dict[str, float | None]:
    """Sensitivity, specificity, PPV, NPV, and F1 at a fixed decision threshold."""
    predicted_positive = y_prob >= threshold
    tp = float(np.sum(predicted_positive & (y_true == 1)))
    fp = float(np.sum(predicted_positive & (y_true == 0)))
    fn = float(np.sum(~predicted_positive & (y_true == 1)))
    tn = float(np.sum(~predicted_positive & (y_true == 0)))

    sensitivity = tp / (tp + fn) if (tp + fn) > 0 else None
    specificity = tn / (tn + fp) if (tn + fp) > 0 else None
    ppv = tp / (tp + fp) if (tp + fp) > 0 else None
    npv = tn / (tn + fn) if (tn + fn) > 0 else None
    f1 = None
    if sensitivity is not None and ppv is not None and (sensitivity + ppv) > 0:
        f1 = 2 * sensitivity * ppv / (sensitivity + ppv)

    return {
        "sensitivity": sensitivity,
        "specificity": specificity,
        "ppv": ppv,
        "npv": npv,
        "f1": f1,
    }


# ---------------------------------------------------------------------------
# Calibration
# ---------------------------------------------------------------------------


def compute_calibration(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    n_bins: int = 10,
    plot_path: str | None = None,
) -> dict[str, object]:
    """
    Calibration curve (observed vs. predicted risk per bin) + Brier score.
    Optionally saves a reliability diagram PNG to `plot_path`.
    """
    n_bins = max(1, min(n_bins, len(np.unique(y_prob)), len(y_true) // 2 or 1))
    prob_true, prob_pred = calibration_curve(y_true, y_prob, n_bins=n_bins, strategy="quantile")
    brier = brier_score_loss(y_true, y_prob)

    if plot_path:
        os.makedirs(os.path.dirname(plot_path), exist_ok=True)
        fig, ax = plt.subplots(figsize=(5, 5))
        ax.plot([0, 1], [0, 1], linestyle="--", color="gray", label="Perfectly calibrated")
        ax.plot(prob_pred, prob_true, marker="o", label="Model")
        ax.set_xlabel("Predicted risk")
        ax.set_ylabel("Observed frequency")
        ax.set_title(f"Calibration curve (Brier = {brier:.3f})")
        ax.legend()
        fig.tight_layout()
        fig.savefig(plot_path, dpi=120)
        plt.close(fig)

    return {
        "brier_score": float(brier),
        "prob_true": prob_true.tolist(),
        "prob_pred": prob_pred.tolist(),
    }


# ---------------------------------------------------------------------------
# Clinical utility: decision-curve analysis
# ---------------------------------------------------------------------------


def decision_curve_analysis(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    thresholds: np.ndarray | None = None,
    plot_path: str | None = None,
) -> dict[str, list[float]]:
    """
    Net benefit of using the model to guide treat/no-treat decisions across a
    range of threshold probabilities, compared against "treat all" and
    "treat none" strategies. See Vickers & Elkin (2006).
    """
    if thresholds is None:
        thresholds = np.linspace(0.01, 0.99, 50)

    n = len(y_true)
    prevalence = float(np.mean(y_true))

    net_benefit_model = []
    net_benefit_all = []
    for pt in thresholds:
        predicted_positive = y_prob >= pt
        tp = float(np.sum(predicted_positive & (y_true == 1)))
        fp = float(np.sum(predicted_positive & (y_true == 0)))
        nb_model = (tp / n) - (fp / n) * (pt / (1 - pt))
        nb_all = prevalence - (1 - prevalence) * (pt / (1 - pt))
        net_benefit_model.append(nb_model)
        net_benefit_all.append(nb_all)

    net_benefit_none = [0.0 for _ in thresholds]

    if plot_path:
        os.makedirs(os.path.dirname(plot_path), exist_ok=True)
        fig, ax = plt.subplots(figsize=(6, 5))
        ax.plot(thresholds, net_benefit_model, label="Model", color="C0")
        ax.plot(thresholds, net_benefit_all, label="Treat all", color="C1", linestyle="--")
        ax.plot(thresholds, net_benefit_none, label="Treat none", color="C2", linestyle=":")
        ax.set_xlabel("Threshold probability")
        ax.set_ylabel("Net benefit")
        ax.set_title("Decision curve analysis")
        ax.set_ylim(bottom=min(min(net_benefit_model), 0) - 0.05)
        ax.legend()
        fig.tight_layout()
        fig.savefig(plot_path, dpi=120)
        plt.close(fig)

    return {
        "thresholds": thresholds.tolist(),
        "net_benefit_model": net_benefit_model,
        "net_benefit_all": net_benefit_all,
        "net_benefit_none": net_benefit_none,
    }


# ---------------------------------------------------------------------------
# Fairness / subgroup slicing
# ---------------------------------------------------------------------------


def subgroup_report(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    group: np.ndarray,
    n_bins: int = 10,
) -> dict[str, dict[str, float]]:
    """
    Per-subgroup AUROC and Brier score, so uneven performance across groups
    (e.g. age band, sex, site) can be caught before deployment. Groups with
    fewer than 2 samples of either class report NaN metrics (undefined);
    groups smaller than MIN_SUBGROUP_SIZE are still computed but flagged
    `small_sample` so results aren't over-trusted.
    """
    report: dict[str, dict[str, float]] = {}
    for g in np.unique(group):
        mask = group == g
        y_true_g = y_true[mask]
        y_prob_g = y_prob[mask]
        n_g = int(mask.sum())

        if len(np.unique(y_true_g)) < 2:
            report[str(g)] = {
                "n": n_g,
                "small_sample": n_g < MIN_SUBGROUP_SIZE,
                "auroc": float("nan"),
                "brier_score": float(brier_score_loss(y_true_g, y_prob_g)) if n_g else float("nan"),
            }
            continue

        report[str(g)] = {
            "n": n_g,
            "small_sample": n_g < MIN_SUBGROUP_SIZE,
            "auroc": float(roc_auc_score(y_true_g, y_prob_g)),
            "brier_score": float(brier_score_loss(y_true_g, y_prob_g)),
        }
    return report


# ---------------------------------------------------------------------------
# Uncertainty flagging
# ---------------------------------------------------------------------------


@dataclass
class UncertaintyFlags:
    near_boundary: np.ndarray
    high_uncertainty: np.ndarray
    flagged_any: np.ndarray
    indices_flagged: list[int] = field(default_factory=list)


def flag_uncertain_predictions(
    y_prob: np.ndarray,
    decision_threshold: float = 0.5,
    boundary_margin: float = 0.05,
    y_prob_std: np.ndarray | None = None,
    uncertainty_std_cutoff: float = 0.1,
) -> UncertaintyFlags:
    """
    Flags predictions that a clinician should treat with extra caution:
      - `near_boundary`: predicted risk falls within `boundary_margin` of the
        decision threshold (e.g. 0.45-0.55 around a 0.5 cutoff).
      - `high_uncertainty`: only computed if `y_prob_std` is supplied (e.g.
        std-dev across an ensemble or MC-dropout samples); flags predictions
        whose uncertainty exceeds `uncertainty_std_cutoff`.
    """
    near_boundary = np.abs(y_prob - decision_threshold) <= boundary_margin

    if y_prob_std is not None:
        high_uncertainty = y_prob_std >= uncertainty_std_cutoff
    else:
        high_uncertainty = np.zeros_like(near_boundary, dtype=bool)

    flagged_any = near_boundary | high_uncertainty
    return UncertaintyFlags(
        near_boundary=near_boundary,
        high_uncertainty=high_uncertainty,
        flagged_any=flagged_any,
        indices_flagged=np.where(flagged_any)[0].tolist(),
    )


# ---------------------------------------------------------------------------
# Single entry point: evaluate_model
# ---------------------------------------------------------------------------


@dataclass
class EvaluationResult:
    n: int
    prevalence: float | None
    threshold: float
    auroc: float | None
    auprc: float | None
    sensitivity: float | None
    specificity: float | None
    ppv: float | None
    npv: float | None
    f1: float | None
    brier_score: float | None
    calibration: dict[str, object] | None
    decision_curve: dict[str, list[float]] | None
    subgroups: dict[str, dict[str, float]] | None
    warnings: list[str] = field(default_factory=list)


def evaluate_model(
    y_true,
    y_prob,
    groups=None,
    threshold: float = 0.5,
    n_calibration_bins: int = 10,
) -> EvaluationResult:
    """
    Run the full rigor layer against any (y_true, y_prob[, groups]) triple.
    Safe against the edge cases a real clinical dataset will eventually hit:
    a single class in y_true, tiny or missing subgroups, NaN values, and
    probabilities outside [0, 1].
    """
    warnings: list[str] = []

    y_true = np.asarray(y_true, dtype=float)
    y_prob = np.asarray(y_prob, dtype=float)
    if y_true.shape != y_prob.shape:
        raise ValueError(f"y_true and y_prob must have the same shape, got {y_true.shape} and {y_prob.shape}")

    groups_arr = None
    if groups is not None:
        groups_arr = np.asarray(groups, dtype=object)
        if groups_arr.shape[0] != y_true.shape[0]:
            raise ValueError("groups must have the same length as y_true/y_prob")

    finite_mask = np.isfinite(y_true) & np.isfinite(y_prob)
    if groups_arr is not None:
        # Treat None / NaN group labels as missing, independent of dtype.
        group_missing = np.array(
            [g is None or (isinstance(g, float) and np.isnan(g)) for g in groups_arr]
        )
        finite_mask &= ~group_missing

    if not finite_mask.all():
        dropped = int((~finite_mask).sum())
        warnings.append(f"Dropped {dropped} sample(s) with NaN/inf/missing values")
        y_true = y_true[finite_mask]
        y_prob = y_prob[finite_mask]
        if groups_arr is not None:
            groups_arr = groups_arr[finite_mask]

    if y_prob.size and ((y_prob < 0).any() or (y_prob > 1).any()):
        warnings.append("y_prob contained values outside [0, 1]; clipped to [0, 1]")
        y_prob = np.clip(y_prob, 0.0, 1.0)

    n = int(y_true.size)
    if n == 0:
        warnings.append("No valid samples to evaluate")
        return EvaluationResult(
            n=0,
            prevalence=None,
            threshold=threshold,
            auroc=None,
            auprc=None,
            sensitivity=None,
            specificity=None,
            ppv=None,
            npv=None,
            f1=None,
            brier_score=None,
            calibration=None,
            decision_curve=None,
            subgroups=None,
            warnings=warnings,
        )

    prevalence = float(np.mean(y_true))
    single_class = len(np.unique(y_true)) < 2
    if single_class:
        warnings.append("y_true contains a single class; AUROC/AUPRC/decision-curve are undefined and skipped")

    auroc = auprc = None
    decision_curve = None
    if not single_class:
        disc = compute_auroc_auprc(y_true, y_prob)
        auroc, auprc = disc["auroc"], disc["auprc"]
        decision_curve = decision_curve_analysis(y_true, y_prob)

    threshold_metrics = compute_threshold_metrics(y_true, y_prob, threshold=threshold)

    brier_score = float(brier_score_loss(y_true, y_prob)) if n >= 1 else None
    calibration = None
    if n >= 2 and not single_class:
        try:
            calibration = compute_calibration(y_true, y_prob, n_bins=n_calibration_bins)
        except ValueError as exc:
            warnings.append(f"Calibration curve could not be computed: {exc}")

    subgroups = None
    if groups_arr is not None:
        if groups_arr.size == 0:
            warnings.append("groups provided but empty after filtering; skipping subgroup report")
        else:
            subgroups = subgroup_report(y_true, y_prob, groups_arr, n_bins=n_calibration_bins)
            small = [name for name, stats in subgroups.items() if stats["small_sample"]]
            if small:
                warnings.append(f"Subgroup(s) below {MIN_SUBGROUP_SIZE} samples: {', '.join(small)}")

    return EvaluationResult(
        n=n,
        prevalence=prevalence,
        threshold=threshold,
        auroc=auroc,
        auprc=auprc,
        sensitivity=threshold_metrics["sensitivity"],
        specificity=threshold_metrics["specificity"],
        ppv=threshold_metrics["ppv"],
        npv=threshold_metrics["npv"],
        f1=threshold_metrics["f1"],
        brier_score=brier_score,
        calibration=calibration,
        decision_curve=decision_curve,
        subgroups=subgroups,
        warnings=warnings,
    )


# ---------------------------------------------------------------------------
# Demo / self-test on synthetic data
# ---------------------------------------------------------------------------


def _make_synthetic_data(n: int = 500, seed: int = 42):
    rng = np.random.default_rng(seed)

    # Latent risk driven by a couple of synthetic "features" plus noise.
    age = rng.normal(60, 15, size=n)
    biomarker = rng.normal(0, 1, size=n)
    latent = 0.04 * (age - 60) + 0.8 * biomarker + rng.normal(0, 1, size=n)
    y_true = (latent > np.quantile(latent, 0.7)).astype(int)

    # Model probability: correlated with the latent signal but imperfect/noisy,
    # and deliberately mis-calibrated (scaled) to make the calibration plot interesting.
    noisy_signal = latent + rng.normal(0, 1.5, size=n)
    y_prob = 1 / (1 + np.exp(-0.7 * noisy_signal))
    y_prob = np.clip(y_prob, 1e-6, 1 - 1e-6)

    # Fake ensemble std for the uncertainty demo.
    y_prob_std = np.abs(rng.normal(0.08, 0.05, size=n))

    # Fake subgroup: age band.
    group = np.where(age < 60, "under_60", "60_plus")

    return y_true, y_prob, y_prob_std, group


def main() -> None:
    print("=" * 70)
    print("Rigor layer self-test on synthetic (y_true, y_prob) data")
    print("=" * 70)

    y_true, y_prob, y_prob_std, group = _make_synthetic_data()
    print(f"n = {len(y_true)}, positive prevalence = {y_true.mean():.3f}\n")

    result = evaluate_model(y_true, y_prob, groups=group)

    print("-- Discrimination --")
    print(f"AUROC: {result.auroc:.3f}")
    print(f"AUPRC: {result.auprc:.3f}\n")

    print(f"-- Threshold metrics (t={result.threshold}) --")
    print(f"Sensitivity: {result.sensitivity:.3f}")
    print(f"Specificity: {result.specificity:.3f}")
    print(f"PPV: {result.ppv:.3f}")
    print(f"NPV: {result.npv:.3f}")
    print(f"F1: {result.f1:.3f}\n")

    print("-- Calibration --")
    print(f"Brier score: {result.brier_score:.3f}")
    calib_plot = os.path.join(PLOTS_DIR, "calibration_curve.png")
    compute_calibration(y_true, y_prob, n_bins=8, plot_path=calib_plot)
    print(f"Saved reliability diagram -> {calib_plot}\n")

    print("-- Decision-curve analysis --")
    peak_idx = int(np.argmax(result.decision_curve["net_benefit_model"]))
    print(
        f"Peak net benefit: {result.decision_curve['net_benefit_model'][peak_idx]:.3f} "
        f"at threshold {result.decision_curve['thresholds'][peak_idx]:.2f}"
    )
    dca_plot = os.path.join(PLOTS_DIR, "decision_curve.png")
    decision_curve_analysis(y_true, y_prob, plot_path=dca_plot)
    print(f"Saved decision curve -> {dca_plot}\n")

    print("-- Subgroup / fairness report --")
    for name, stats in result.subgroups.items():
        print(f"  {name:10s} n={stats['n']:4d}  AUROC={stats['auroc']:.3f}  Brier={stats['brier_score']:.3f}")
    print()

    print("-- Uncertainty flags --")
    flags = flag_uncertain_predictions(y_prob, decision_threshold=0.5, y_prob_std=y_prob_std)
    print(f"Near decision boundary: {flags.near_boundary.sum()} / {len(y_prob)}")
    print(f"High ensemble uncertainty: {flags.high_uncertainty.sum()} / {len(y_prob)}")
    print(f"Flagged for review (either): {flags.flagged_any.sum()} / {len(y_prob)}")

    if result.warnings:
        print("\n-- Warnings --")
        for w in result.warnings:
            print(f"  ! {w}")

    print("\n-- Edge-case smoke tests --")
    single_class_result = evaluate_model(np.zeros(10), np.random.default_rng(0).uniform(0, 1, size=10))
    print(f"Single-class y_true -> auroc={single_class_result.auroc}, warnings={single_class_result.warnings}")

    out_of_range_result = evaluate_model(np.array([0, 1, 0, 1]), np.array([-0.2, 1.3, 0.4, 0.6]))
    print(f"Out-of-range y_prob -> clipped, warnings={out_of_range_result.warnings}")

    print("\n" + "=" * 70)
    print("All rigor-layer functions ran successfully.")
    print("=" * 70)


if __name__ == "__main__":
    main()
