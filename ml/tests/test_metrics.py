import numpy as np

from metrics import evaluate_model, flag_uncertain_predictions


def _separable_data(n=100, seed=0):
    rng = np.random.default_rng(seed)
    y_true = rng.integers(0, 2, size=n)
    y_prob = np.where(y_true == 1, rng.uniform(0.6, 1.0, size=n), rng.uniform(0.0, 0.4, size=n))
    return y_true, y_prob


def test_evaluate_model_basic_shapes():
    y_true, y_prob = _separable_data()
    result = evaluate_model(y_true, y_prob)

    assert result.n == 100
    assert result.auroc is not None and result.auroc > 0.8
    assert result.sensitivity is not None
    assert result.specificity is not None
    assert result.ppv is not None
    assert result.npv is not None
    assert result.f1 is not None
    assert result.brier_score is not None
    assert result.calibration is not None
    assert result.decision_curve is not None
    assert result.warnings == []


def test_evaluate_model_single_class_is_safe():
    y_true = np.zeros(20)
    y_prob = np.random.default_rng(1).uniform(0, 1, size=20)
    result = evaluate_model(y_true, y_prob)

    assert result.auroc is None
    assert result.auprc is None
    assert result.decision_curve is None
    assert any("single class" in w for w in result.warnings)
    # threshold metrics still make sense with one class present
    assert result.specificity is not None


def test_evaluate_model_clips_out_of_range_probs():
    y_true, y_prob = _separable_data(n=20)
    out_of_range = y_prob * 1.5  # push values above 1
    result = evaluate_model(y_true, out_of_range)

    assert any("outside [0, 1]" in w for w in result.warnings)
    assert result.brier_score is not None


def test_evaluate_model_drops_nan_and_inf():
    y_true, y_prob = _separable_data(n=20)
    y_prob = y_prob.astype(float)
    y_prob[0] = np.nan
    y_prob[1] = np.inf

    result = evaluate_model(y_true, y_prob)

    assert result.n == 18
    assert any("Dropped" in w for w in result.warnings)


def test_evaluate_model_handles_missing_and_small_subgroups():
    y_true, y_prob = _separable_data(n=30)
    groups = np.array(["a"] * 28 + ["b"] * 2)

    result = evaluate_model(y_true, y_prob, groups=groups)

    assert result.subgroups is not None
    assert result.subgroups["b"]["small_sample"] is True
    assert result.subgroups["a"]["small_sample"] is False
    assert any("below" in w for w in result.warnings)


def test_evaluate_model_without_groups_skips_subgroups():
    y_true, y_prob = _separable_data(n=20)
    result = evaluate_model(y_true, y_prob)
    assert result.subgroups is None


def test_evaluate_model_empty_input_is_safe():
    result = evaluate_model(np.array([]), np.array([]))
    assert result.n == 0
    assert result.auroc is None
    assert "No valid samples to evaluate" in result.warnings


def test_flag_uncertain_predictions_near_boundary():
    y_prob = np.array([0.5, 0.9, 0.1, 0.52])
    flags = flag_uncertain_predictions(y_prob, decision_threshold=0.5, boundary_margin=0.05)

    assert flags.near_boundary.tolist() == [True, False, False, True]
    assert flags.flagged_any.sum() == 2


def test_flag_uncertain_predictions_with_ensemble_std():
    y_prob = np.array([0.2, 0.8])
    y_prob_std = np.array([0.15, 0.02])
    flags = flag_uncertain_predictions(y_prob, y_prob_std=y_prob_std, uncertainty_std_cutoff=0.1)

    assert flags.high_uncertainty.tolist() == [True, False]
