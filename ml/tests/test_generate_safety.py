from generate import (
    DIAGNOSTIC_SAFETY_FALLBACK,
    contains_diagnostic_claim,
    detect_escalation_signal,
)


def test_contains_diagnostic_claim_detects_direct_diagnosis():
    assert contains_diagnostic_claim("Based on this, you have preeclampsia.")
    assert contains_diagnostic_claim("You've been diagnosed with gestational hypertension.")


def test_contains_diagnostic_claim_false_on_safe_phrasing():
    assert not contains_diagnostic_claim(
        "This may be associated with increased risk, but only your healthcare provider can "
        "confirm a preeclampsia diagnosis."
    )


def test_contains_diagnostic_claim_false_on_unrelated_text():
    assert not contains_diagnostic_claim("Preeclampsia is a condition that affects blood pressure.")
    assert not contains_diagnostic_claim("Severe hypertension is defined as >=160/110 mmHg.")


def test_detect_escalation_signal_on_severe_symptoms():
    assert detect_escalation_signal("I have a severe headache and blurred vision, what does this mean?")
    assert detect_escalation_signal("I'm feeling pain just below my ribs and vomiting.")
    assert detect_escalation_signal("My baby's movement has decreased today.")


def test_detect_escalation_signal_false_on_general_questions():
    assert not detect_escalation_signal("What is preeclampsia?")
    assert not detect_escalation_signal("Why is high blood pressure important during pregnancy?")


def test_diagnostic_safety_fallback_never_names_diagnostic_claim_pattern_as_a_claim():
    # The fallback text itself must not re-trigger contains_diagnostic_claim,
    # or a safety override would loop.
    assert not contains_diagnostic_claim(DIAGNOSTIC_SAFETY_FALLBACK)
