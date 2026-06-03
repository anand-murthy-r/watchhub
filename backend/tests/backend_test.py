"""Backend API tests for Smartwatch Leaderboard mock FastAPI app."""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fall back to the public URL from /app/frontend/.env if env var not exported
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
API = f"{BASE_URL}/api"

ADMIN = {"email": "admin@watchhub.io", "password": "Admin@123"}
USER = {"email": "alex.smith@example.com", "password": "User@123"}


@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/auth/login", json=ADMIN, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["user"]["role"] == "ROLE_ADMIN"
    return data["accessToken"]


@pytest.fixture(scope="session")
def user_session():
    r = requests.post(f"{API}/auth/login", json=USER, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()


def hdr(token):
    return {"X-Session-Id": token, "Authorization": f"Bearer {token}"}


# ---------- Health ----------
def test_health_up():
    r = requests.get(f"{API}/health", timeout=10)
    assert r.status_code == 200
    j = r.json()
    assert j["status"] == "UP"
    assert "timestamp" in j


# ---------- Auth ----------
def test_login_invalid_credentials():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN["email"], "password": "wrong"}, timeout=10)
    assert r.status_code == 401
    detail = r.json().get("detail", {})
    assert detail.get("code") == "INVALID_CREDENTIALS"


def test_login_admin_ok(admin_token):
    assert isinstance(admin_token, str) and len(admin_token) > 10


def test_me_with_session(admin_token):
    r = requests.get(f"{API}/auth/me", headers=hdr(admin_token), timeout=10)
    assert r.status_code == 200
    assert r.json()["email"] == ADMIN["email"]


def test_me_without_session_401():
    r = requests.get(f"{API}/auth/me", timeout=10)
    assert r.status_code == 401


def test_register_then_login_persists():
    email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    payload = {
        "email": email, "password": "Pass@123", "fullName": "Test User",
        "phone": "+10000000000", "city": "TestCity", "region": "APAC",
        "role": "ROLE_USER",
    }
    r = requests.post(f"{API}/auth/register", json=payload, timeout=10)
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["user"]["email"] == email
    assert j["user"]["role"] == "ROLE_USER"
    assert j["accessToken"]
    # login again should also succeed
    r2 = requests.post(f"{API}/auth/login", json={"email": email, "password": "Pass@123"}, timeout=10)
    assert r2.status_code == 200


def test_register_duplicate_email():
    payload = {
        "email": "admin@watchhub.io", "password": "Pass@123", "fullName": "Dup",
        "phone": "+10", "city": "X", "region": "APAC", "role": "ROLE_USER",
    }
    r = requests.post(f"{API}/auth/register", json=payload, timeout=10)
    assert r.status_code == 400
    assert r.json()["detail"]["code"] == "EMAIL_TAKEN"


# ---------- Users / Telemetry ----------
def test_get_user_and_telemetry_flow(user_session):
    token = user_session["accessToken"]
    uid = user_session["user"]["id"]
    r = requests.get(f"{API}/user/{uid}", timeout=10)
    assert r.status_code == 200
    before_points = r.json()["progress"].get("totalPoints", 0)

    body = {"activityDate": "2026-01-15", "stepCountValue": 5000, "heartRate": 80, "calories": 200}
    r2 = requests.post(f"{API}/user/{uid}", json=body, headers=hdr(token), timeout=10)
    assert r2.status_code == 200, r2.text
    j = r2.json()
    assert j["activity"]["stepCountValue"] == 5000
    assert j["totalPoints"] == before_points + 500

    # verify persistence
    r3 = requests.get(f"{API}/user/{uid}", timeout=10)
    acts = r3.json()["progress"]["activities"]
    assert any(a["stepCountValue"] == 5000 for a in acts)


def test_telemetry_validation_zero_steps(user_session):
    token = user_session["accessToken"]
    uid = user_session["user"]["id"]
    body = {"activityDate": "2026-01-15", "stepCountValue": 0}
    r = requests.post(f"{API}/user/{uid}", json=body, headers=hdr(token), timeout=10)
    assert r.status_code == 422  # pydantic gt=0


def test_telemetry_requires_auth(user_session):
    uid = user_session["user"]["id"]
    body = {"activityDate": "2026-01-15", "stepCountValue": 100}
    r = requests.post(f"{API}/user/{uid}", json=body, timeout=10)
    assert r.status_code == 401


# ---------- Tasks ----------
def test_task_list_and_create_admin(admin_token):
    r = requests.get(f"{API}/tasks", timeout=10)
    assert r.status_code == 200
    assert "content" in r.json()

    payload = {
        "name": f"TEST_Task_{uuid.uuid4().hex[:6]}",
        "description": "Pytest created task",
        "targetSteps": 1000, "duration": 7, "active": True,
        "requiredTags": ["steps"], "outcome": {"points": 100}, "region": "APAC",
    }
    r2 = requests.post(f"{API}/task", json=payload, headers=hdr(admin_token), timeout=10)
    assert r2.status_code == 200, r2.text
    tid = r2.json()["id"]
    assert isinstance(tid, int)

    # verify in list
    r3 = requests.get(f"{API}/task/{tid}", timeout=10)
    assert r3.status_code == 200
    assert r3.json()["name"] == payload["name"]


def test_task_create_requires_admin(user_session):
    token = user_session["accessToken"]
    payload = {"name": "X", "description": "x"}
    r = requests.post(f"{API}/task", json=payload, headers=hdr(token), timeout=10)
    assert r.status_code == 403


# ---------- Challenges ----------
def test_challenge_list_and_join(user_session):
    r = requests.get(f"{API}/challenges", params={"status": "ACTIVE"}, timeout=10)
    assert r.status_code == 200
    items = r.json()["content"]
    assert len(items) > 0, "Expected at least one ACTIVE challenge in seed"
    cid = items[0]["id"]
    token = user_session["accessToken"]
    uid = user_session["user"]["id"]

    r2 = requests.post(f"{API}/challenge/{cid}/{uid}", headers=hdr(token), timeout=10)
    assert r2.status_code == 200, r2.text
    j = r2.json()
    assert j["joined"] is True
    assert j["participantCount"] >= 1

    # participants endpoint
    r3 = requests.get(f"{API}/challenge/{cid}/user", timeout=10)
    assert r3.status_code == 200
    rows = r3.json()["content"]
    assert any(row["userId"] == uid for row in rows)
    if rows:
        assert "rank" in rows[0]
        assert rows[0]["rank"] == 1


def test_challenge_join_requires_auth():
    r = requests.post(f"{API}/challenge/1/2", timeout=10)
    assert r.status_code == 401


# ---------- Devices ----------
def test_device_list_and_admin_create(admin_token, user_session):
    r = requests.get(f"{API}/devices", timeout=10)
    assert r.status_code == 200

    payload = {"name": f"TEST_Watch_{uuid.uuid4().hex[:5]}", "manufacturer": "TestCo",
               "featureTags": ["steps", "hr"]}
    # user role forbidden
    r_user = requests.post(f"{API}/device", json=payload,
                           headers=hdr(user_session["accessToken"]), timeout=10)
    assert r_user.status_code == 403

    r_admin = requests.post(f"{API}/device", json=payload, headers=hdr(admin_token), timeout=10)
    assert r_admin.status_code == 200
    did = r_admin.json()["id"]

    # update
    payload2 = {**payload, "manufacturer": "Updated"}
    ru = requests.put(f"{API}/device/{did}", json=payload2, headers=hdr(admin_token), timeout=10)
    assert ru.status_code == 200
    assert ru.json()["manufacturer"] == "Updated"

    # delete
    rd = requests.delete(f"{API}/device/{did}", headers=hdr(admin_token), timeout=10)
    assert rd.status_code == 200


# ---------- Ranking ----------
def test_rank_admin_only(admin_token, user_session):
    r = requests.get(f"{API}/rank", headers=hdr(user_session["accessToken"]), timeout=10)
    assert r.status_code == 403
    r2 = requests.get(f"{API}/rank", headers=hdr(admin_token), timeout=10)
    assert r2.status_code == 200
    assert "message" in r2.json()


# ---------- Logout ----------
def test_logout_invalidates_session():
    r = requests.post(f"{API}/auth/login", json=USER, timeout=10)
    token = r.json()["accessToken"]
    r2 = requests.post(f"{API}/auth/logout", headers=hdr(token), timeout=10)
    assert r2.status_code == 200
    r3 = requests.get(f"{API}/auth/me", headers=hdr(token), timeout=10)
    assert r3.status_code == 401
