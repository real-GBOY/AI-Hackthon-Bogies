from fastapi.testclient import TestClient

from app import app

client = TestClient(app)


def test_profile_returns_full_content_for_demo_1():
    response = client.get("/patients/demo-1/profile")
    assert response.status_code == 200
    body = response.json()
    assert body["patient_id"] == "demo-1"
    assert body["name"] == "Amara Diallo"
    assert body["app_content"]["first_name"] == "Amara"
    assert len(body["timeline"]) == 5
    assert len(body["care_plan"]["appointments"]) == 2
    assert len(body["intake_followup"]) == 3
    assert body["captured_qa"]["question"] == "Why did my risk change?"


def test_profile_returns_null_sections_for_demo_2():
    response = client.get("/patients/demo-2/profile")
    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Demo Patient B"
    assert body["app_content"] is None
    assert body["timeline"] is None
    assert body["care_plan"] is None


def test_profile_unknown_patient_404s():
    response = client.get("/patients/unknown/profile")
    assert response.status_code == 404


def test_assessments_include_gestational_week():
    response = client.get("/patients/demo-1/assessments")
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 5
    assert all("gestational_week" in a["features"] for a in body)
    assert body[0]["features"]["gestational_week"] == 12
    assert body[-1]["features"]["gestational_week"] == 32


def test_assessments_unknown_patient_404s():
    response = client.get("/patients/unknown/assessments")
    assert response.status_code == 404


def test_learn_list_ordered_by_seq():
    response = client.get("/learn")
    assert response.status_code == 200
    body = response.json()
    assert len(body) == 5
    assert body[0]["slug"] == "what-is-preeclampsia"
    assert body[0]["featured"] is True


def test_learn_article_with_body():
    response = client.get("/learn/what-is-preeclampsia")
    assert response.status_code == 200
    assert response.json()["detail"] is not None


def test_learn_article_without_body_is_null_not_missing():
    response = client.get("/learn/pregnancy-hypertension-explained")
    assert response.status_code == 200
    assert response.json()["detail"] is None


def test_learn_article_unknown_slug_404s():
    response = client.get("/learn/nope")
    assert response.status_code == 404


def test_clinician_me():
    response = client.get("/clinician/me")
    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Dr. Rachel Okonjo"
    assert body["role"] == "Maternal-Fetal Medicine"
