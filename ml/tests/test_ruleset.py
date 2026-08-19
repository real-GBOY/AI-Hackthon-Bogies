from models.ruleset import BOOLEAN_FEATURES, RulesetRiskModel

LOW_RISK_FEATURES = {
    "bp_systolic": 118,
    "bp_diastolic": 76,
}

HIGH_RISK_FEATURES = {
    "chronic_hypertension": True,
    "pregestational_diabetes": True,
    "bp_systolic": 165,
    "bp_diastolic": 105,
    "proteinuria_present": True,
    "severe_headache": True,
    "visual_disturbance": True,
}

MODERATE_HISTORY_ONLY = {
    "nulliparity": True,
    "maternal_age_40_or_older": True,
    "bp_systolic": 118,
    "bp_diastolic": 76,
}


def test_low_risk_features_score_low():
    model = RulesetRiskModel()
    score = model.predict_proba(LOW_RISK_FEATURES)
    assert 0.0 <= score < 0.34


def test_high_risk_features_score_high():
    model = RulesetRiskModel()
    score = model.predict_proba(HIGH_RISK_FEATURES)
    assert score >= 0.67


def test_moderate_history_alone_does_not_reach_high():
    model = RulesetRiskModel()
    score = model.predict_proba(MODERATE_HISTORY_ONLY)
    assert score < 0.67


def test_empty_features_score_low():
    model = RulesetRiskModel()
    assert model.predict_proba({}) < 0.34


def test_score_is_deterministic():
    model = RulesetRiskModel()
    first = model.predict_proba(HIGH_RISK_FEATURES)
    second = model.predict_proba(HIGH_RISK_FEATURES)
    assert first == second


def test_explain_matches_predict_proba_top_contributors():
    model = RulesetRiskModel()
    top = model.explain(HIGH_RISK_FEATURES)
    assert len(top) == 3
    # Severe-range BP (weight 3.0) must be the top driver for this feature set.
    assert top[0][0] == "blood_pressure_severe"
    assert top[0][1] == 3.0
    # explain() is sorted descending by weight.
    weights = [w for _, w in top]
    assert weights == sorted(weights, reverse=True)


def test_explain_pads_to_three_when_fewer_active_factors():
    model = RulesetRiskModel()
    top = model.explain({})
    assert len(top) == 3
    assert all(impact == 0.0 for _, impact in top)


def test_every_feature_has_a_nonempty_citation():
    for name, fdef in BOOLEAN_FEATURES.items():
        assert fdef.source, f"{name} is missing a source citation"
        assert ".pdf p." in fdef.source, f"{name}'s citation isn't in 'filename p.X' form: {fdef.source!r}"


def test_explain_with_citations_carries_source_and_description():
    model = RulesetRiskModel()
    detailed = model.explain_with_citations(HIGH_RISK_FEATURES)
    assert detailed, "expected at least one contributing factor"
    for entry in detailed:
        assert entry["source"]
        assert entry["description"]
        assert isinstance(entry["impact"], float)
