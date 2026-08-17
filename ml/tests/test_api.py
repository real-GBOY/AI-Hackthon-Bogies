from fastapi.testclient import TestClient

from app import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_predict_returns_valid_schema():
    response = client.post("/predict", json={"features": {"age": 60, "biomarker_a": 1.2}})
    assert response.status_code == 200

    body = response.json()
    assert 0.0 <= body["risk_score"] <= 1.0
    assert body["risk_category"] in {"low", "moderate", "high"}
    assert body["trajectory_direction"] in {"rising", "stable", "falling"}
    assert len(body["trajectory"]) >= 1
    assert all(0.0 <= point["risk"] <= 1.0 for point in body["trajectory"])
    assert len(body["drivers"]) == 3
    assert "flag" in body["uncertainty"]
    assert 0.0 <= body["confidence"] <= 1.0
    assert "assessment_time" in body


def test_predict_with_empty_features_still_works():
    response = client.post("/predict", json={"features": {}})
    assert response.status_code == 200
    assert len(response.json()["drivers"]) == 3


def test_predict_missing_features_key_defaults_to_empty():
    response = client.post("/predict", json={})
    assert response.status_code == 200


def test_predict_is_deterministic_for_same_features():
    payload = {"features": {"age": 50, "bp": 130}}
    first = client.post("/predict", json=payload).json()
    second = client.post("/predict", json=payload).json()
    assert first["risk_score"] == second["risk_score"]
