from fastapi.testclient import TestClient

from app import app

client = TestClient(app)


def test_list_patients_includes_seeded_demo_patients():
    response = client.get("/patients")
    assert response.status_code == 200
    assert {"demo-1", "demo-2"}.issubset(set(response.json()))


def test_trajectory_for_unknown_patient_is_404():
    response = client.get("/patients/does-not-exist/trajectory")
    assert response.status_code == 404


def test_demo1_trajectory_rises_and_matches_assessment_count():
    response = client.get("/patients/demo-1/trajectory")
    assert response.status_code == 200
    body = response.json()
    assert len(body["trajectory"]) == 5  # 5 seeded assessments in patient_store.py
    assert body["trajectory_direction"] == "rising"
    assert body["risk_category"] == "high"
    # Real, deterministic scoring — not build_trajectory()'s random walk — so
    # calling twice must return identical trajectories.
    again = client.get("/patients/demo-1/trajectory").json()
    assert body["trajectory"] == again["trajectory"]


def test_demo2_trajectory_stays_low():
    response = client.get("/patients/demo-2/trajectory")
    assert response.status_code == 200
    body = response.json()
    assert body["risk_category"] == "low"
    assert all(point["risk"] < 0.34 for point in body["trajectory"])


def test_trajectory_driver_details_carry_real_citations():
    body = client.get("/patients/demo-1/trajectory").json()
    assert body["driver_details"], "expected cited drivers for a high-risk trajectory"
    for detail in body["driver_details"]:
        assert ".pdf p." in detail["source"]
