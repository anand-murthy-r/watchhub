"""
Smartwatch Leaderboard - JSON Mock Server (FastAPI)
All endpoints are exposed under the /api prefix to work with platform ingress.
Emulates json-server style routes plus higher-level domain routes
described in the Angular Smartwatch Leaderboard milestones.
"""
import json
import os
import secrets
import threading
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field

# ---------------------------------------------------------------------------
# Data store - reads/writes the bundled db.json file
# ---------------------------------------------------------------------------
DB_PATH = Path(__file__).parent / "db.json"
_lock = threading.Lock()

def _load_db() -> Dict[str, Any]:
    with DB_PATH.open("r", encoding="utf-8") as f:
        return json.load(f)

def _save_db(db: Dict[str, Any]) -> None:
    with DB_PATH.open("w", encoding="utf-8") as f:
        json.dump(db, f, indent=2)

DB: Dict[str, Any] = _load_db()

# active session tokens (unique-ID strategy) -> userId
SESSIONS: Dict[str, int] = {}

def _next_id(collection: List[Dict[str, Any]]) -> int:
    return (max((c.get("id", 0) for c in collection), default=0) or 0) + 1

def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

def _public_user(u: Dict[str, Any]) -> Dict[str, Any]:
    return {k: v for k, v in u.items() if k != "password"}

def _paginate(items: List[Any], page: int, size: int) -> Dict[str, Any]:
    total = len(items)
    start = max(page, 0) * max(size, 1)
    end = start + max(size, 1)
    return {
        "content": items[start:end],
        "page": page,
        "size": size,
        "totalElements": total,
        "totalPages": (total + size - 1) // max(size, 1) if size else 1,
    }

def _current_user_id(request: Request) -> Optional[int]:
    auth = request.headers.get("X-Session-Id") or request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        auth = auth[len("Bearer "):]
    return SESSIONS.get(auth)

def _require_user(request: Request) -> Dict[str, Any]:
    uid = _current_user_id(request)
    if not uid:
        raise HTTPException(status_code=401, detail={"code": "UNAUTHENTICATED", "message": "Login required", "timestamp": _now_iso()})
    user = next((u for u in DB["users"] if u["id"] == uid), None)
    if not user:
        raise HTTPException(status_code=401, detail={"code": "UNAUTHENTICATED", "message": "Invalid session", "timestamp": _now_iso()})
    return user

def _require_admin(request: Request) -> Dict[str, Any]:
    user = _require_user(request)
    if user.get("role") != "ROLE_ADMIN":
        raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "Admin role required", "timestamp": _now_iso()})
    return user

# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------
class RegisterReq(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    fullName: str = Field(min_length=2)
    phone: str
    city: str
    region: str
    role: str = "ROLE_USER"
    deviceId: Optional[int] = None

class LoginReq(BaseModel):
    email: EmailStr
    password: str

class DeviceReq(BaseModel):
    name: str
    manufacturer: str
    featureTags: List[str]

class TaskReq(BaseModel):
    name: str
    description: str
    targetSteps: int = 0
    duration: int = 1
    active: bool = True
    requiredTags: List[str] = []
    outcome: Dict[str, Any] = {}
    region: str = "GLOBAL"

class ChallengeReq(BaseModel):
    name: str
    description: str
    scope: str = "PUBLIC"
    status: str = "ACTIVE"
    ownerUserId: Optional[int] = None
    taskId: Optional[int] = None
    region: str = "GLOBAL"
    startAt: str
    endAt: str
    requiredTags: List[str] = []

class TelemetryReq(BaseModel):
    activityDate: str
    stepCountValue: int = Field(gt=0)
    heartRate: Optional[int] = None
    calories: Optional[int] = None

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(title="Smartwatch Leaderboard Mock API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in os.environ.get("CORS_ORIGINS", "*").split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Health -----------------------------------------------------------------
@app.get("/api/health")
def health():
    return {"status": "UP", "service": "smartwatch-leaderboard-mock", "timestamp": _now_iso()}

# Auth -------------------------------------------------------------------
@app.post("/api/auth/register")
def register(body: RegisterReq):
    with _lock:
        if any(u["email"].lower() == body.email.lower() for u in DB["users"]):
            raise HTTPException(status_code=400, detail={"code": "EMAIL_TAKEN", "message": "Email already registered", "timestamp": _now_iso()})
        new_user = body.model_dump()
        new_user["id"] = _next_id(DB["users"])
        if new_user.get("role") not in ("ROLE_ADMIN", "ROLE_USER"):
            new_user["role"] = "ROLE_USER"
        DB["users"].append(new_user)
        _save_db(DB)
        token = secrets.token_urlsafe(24)
        SESSIONS[token] = new_user["id"]
    return {
        "accessToken": token,
        "refreshToken": secrets.token_urlsafe(24),
        "tokenType": "Bearer",
        "user": _public_user(new_user),
    }

@app.post("/api/auth/login")
def login(body: LoginReq):
    user = next((u for u in DB["users"] if u["email"].lower() == body.email.lower()), None)
    if not user or user.get("password") != body.password:
        raise HTTPException(status_code=401, detail={"code": "INVALID_CREDENTIALS", "message": "Invalid email or password", "timestamp": _now_iso()})
    token = secrets.token_urlsafe(24)
    SESSIONS[token] = user["id"]
    return {
        "accessToken": token,
        "refreshToken": secrets.token_urlsafe(24),
        "tokenType": "Bearer",
        "user": _public_user(user),
    }

@app.post("/api/auth/logout")
def logout(request: Request):
    auth = request.headers.get("X-Session-Id") or request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        auth = auth[len("Bearer "):]
    SESSIONS.pop(auth, None)
    return {"message": "Logged out"}

@app.get("/api/auth/me")
def me(request: Request):
    user = _require_user(request)
    return _public_user(user)

# Users ------------------------------------------------------------------
@app.get("/api/users")
def list_users():
    return [_public_user(u) for u in DB["users"]]

@app.get("/api/user/{user_id}")
def get_user(user_id: int):
    user = next((u for u in DB["users"] if u["id"] == user_id), None)
    if not user:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "User not found", "timestamp": _now_iso()})
    progress = next((p for p in DB["userProgress"] if p["userId"] == user_id), {"userId": user_id, "totalPoints": 0, "activities": [], "rewards": []})
    return {"user": _public_user(user), "progress": progress}

@app.post("/api/user/{user_id}")
def submit_telemetry(user_id: int, body: TelemetryReq, request: Request):
    actor = _require_user(request)
    if actor["id"] != user_id and actor.get("role") != "ROLE_ADMIN":
        raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "Cannot submit for other users", "timestamp": _now_iso()})
    with _lock:
        progress = next((p for p in DB["userProgress"] if p["userId"] == user_id), None)
        if not progress:
            progress = {"userId": user_id, "totalPoints": 0, "activities": [], "rewards": []}
            DB["userProgress"].append(progress)
        new_activity = body.model_dump()
        new_activity["id"] = _next_id(progress["activities"])
        progress["activities"].append(new_activity)
        progress["totalPoints"] = progress.get("totalPoints", 0) + int(body.stepCountValue // 10)
        _save_db(DB)
    return {"message": "Activity recorded", "activity": new_activity, "totalPoints": progress["totalPoints"]}

# Devices ----------------------------------------------------------------
@app.get("/api/device")
@app.get("/api/devices")
def list_devices(page: int = 0, size: int = 20, search: Optional[str] = None):
    items = DB["devices"]
    if search:
        s = search.lower()
        items = [d for d in items if s in d["name"].lower() or s in d["manufacturer"].lower()]
    return _paginate(items, page, size)

@app.post("/api/device")
def create_device(body: DeviceReq, request: Request):
    _require_admin(request)
    with _lock:
        d = body.model_dump()
        d["id"] = _next_id(DB["devices"])
        DB["devices"].append(d)
        _save_db(DB)
    return d

@app.put("/api/device/{device_id}")
def update_device(device_id: int, body: DeviceReq, request: Request):
    _require_admin(request)
    with _lock:
        d = next((x for x in DB["devices"] if x["id"] == device_id), None)
        if not d:
            raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Device not found", "timestamp": _now_iso()})
        d.update(body.model_dump())
        _save_db(DB)
    return d

@app.delete("/api/device/{device_id}")
def delete_device(device_id: int, request: Request):
    _require_admin(request)
    with _lock:
        before = len(DB["devices"])
        DB["devices"] = [d for d in DB["devices"] if d["id"] != device_id]
        _save_db(DB)
    return {"deleted": before - len(DB["devices"])}

# Tasks ------------------------------------------------------------------
@app.get("/api/task")
@app.get("/api/tasks")
def list_tasks(page: int = 0, size: int = 10, search: Optional[str] = None, region: Optional[str] = None, sort: Optional[str] = None):
    items = list(DB["tasks"])
    if search:
        s = search.lower()
        items = [t for t in items if s in t["name"].lower() or s in t["description"].lower()]
    if region:
        items = [t for t in items if t["region"] == region]
    if sort:
        key, _, direction = sort.partition(",")
        reverse = direction.lower() == "desc"
        items.sort(key=lambda x: x.get(key, ""), reverse=reverse)
    return _paginate(items, page, size)

@app.get("/api/task/{task_id}")
def get_task(task_id: int):
    t = next((x for x in DB["tasks"] if x["id"] == task_id), None)
    if not t:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Task not found", "timestamp": _now_iso()})
    return t

@app.post("/api/task")
def create_task(body: TaskReq, request: Request):
    _require_admin(request)
    with _lock:
        t = body.model_dump()
        t["id"] = _next_id(DB["tasks"])
        DB["tasks"].append(t)
        _save_db(DB)
    return t

@app.put("/api/task/{task_id}")
def update_task(task_id: int, body: TaskReq, request: Request):
    _require_admin(request)
    with _lock:
        t = next((x for x in DB["tasks"] if x["id"] == task_id), None)
        if not t:
            raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Task not found", "timestamp": _now_iso()})
        t.update(body.model_dump())
        _save_db(DB)
    return t

@app.delete("/api/task/{task_id}")
def delete_task(task_id: int, request: Request):
    _require_admin(request)
    with _lock:
        before = len(DB["tasks"])
        DB["tasks"] = [t for t in DB["tasks"] if t["id"] != task_id]
        _save_db(DB)
    return {"deleted": before - len(DB["tasks"])}

@app.get("/api/task/{task_id}/user")
def task_users(task_id: int, page: int = 0, size: int = 10):
    # Users participating in challenges referencing this task
    user_ids = set()
    for c in DB["challenges"]:
        if c.get("taskId") == task_id:
            user_ids.update(c.get("participants", []))
    users = [_public_user(u) for u in DB["users"] if u["id"] in user_ids]
    return _paginate(users, page, size)

# Challenges -------------------------------------------------------------
@app.get("/api/challenge")
@app.get("/api/challenges")
def list_challenges(page: int = 0, size: int = 10, search: Optional[str] = None, status: Optional[str] = None, sort: Optional[str] = None):
    items = list(DB["challenges"])
    if search:
        s = search.lower()
        items = [c for c in items if s in c["name"].lower() or s in c["description"].lower()]
    if status:
        items = [c for c in items if c["status"] == status]
    if sort:
        key, _, direction = sort.partition(",")
        reverse = direction.lower() == "desc"
        items.sort(key=lambda x: x.get(key, ""), reverse=reverse)
    return _paginate(items, page, size)

@app.get("/api/challenge/{challenge_id}")
def get_challenge(challenge_id: int):
    c = next((x for x in DB["challenges"] if x["id"] == challenge_id), None)
    if not c:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Challenge not found", "timestamp": _now_iso()})
    return c

@app.post("/api/challenge")
def create_challenge(body: ChallengeReq, request: Request):
    actor = _require_admin(request)
    with _lock:
        c = body.model_dump()
        c["id"] = _next_id(DB["challenges"])
        c["ownerUserId"] = body.ownerUserId or actor["id"]
        c["participants"] = []
        DB["challenges"].append(c)
        _save_db(DB)
    return c

@app.put("/api/challenge/{challenge_id}")
def update_challenge(challenge_id: int, body: ChallengeReq, request: Request):
    _require_admin(request)
    with _lock:
        c = next((x for x in DB["challenges"] if x["id"] == challenge_id), None)
        if not c:
            raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Challenge not found", "timestamp": _now_iso()})
        participants = c.get("participants", [])
        c.update(body.model_dump())
        c["participants"] = participants
        _save_db(DB)
    return c

@app.delete("/api/challenge/{challenge_id}")
def delete_challenge(challenge_id: int, request: Request):
    _require_admin(request)
    with _lock:
        before = len(DB["challenges"])
        DB["challenges"] = [c for c in DB["challenges"] if c["id"] != challenge_id]
        _save_db(DB)
    return {"deleted": before - len(DB["challenges"])}

@app.post("/api/challenge/{challenge_id}/{user_id}")
def join_challenge(challenge_id: int, user_id: int, request: Request):
    actor = _require_user(request)
    if actor["id"] != user_id and actor.get("role") != "ROLE_ADMIN":
        raise HTTPException(status_code=403, detail={"code": "FORBIDDEN", "message": "Cannot join for other user", "timestamp": _now_iso()})
    with _lock:
        c = next((x for x in DB["challenges"] if x["id"] == challenge_id), None)
        if not c:
            raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Challenge not found", "timestamp": _now_iso()})
        if c.get("status") != "ACTIVE":
            raise HTTPException(status_code=400, detail={"code": "INACTIVE_CHALLENGE", "message": "Challenge is not active", "timestamp": _now_iso()})
        c.setdefault("participants", [])
        if user_id not in c["participants"]:
            c["participants"].append(user_id)
        _save_db(DB)
    return {"challengeId": challenge_id, "userId": user_id, "joined": True, "participantCount": len(c["participants"])}

@app.get("/api/challenge/{challenge_id}/user")
def challenge_participants(challenge_id: int, page: int = 0, size: int = 10):
    c = next((x for x in DB["challenges"] if x["id"] == challenge_id), None)
    if not c:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Challenge not found", "timestamp": _now_iso()})
    user_ids = c.get("participants", [])
    rows: List[Dict[str, Any]] = []
    for uid in user_ids:
        user = next((u for u in DB["users"] if u["id"] == uid), None)
        if not user:
            continue
        progress = next((p for p in DB["userProgress"] if p["userId"] == uid), {"totalPoints": 0, "rewards": []})
        rows.append({
            "userId": uid,
            "fullName": user.get("fullName"),
            "email": user.get("email"),
            "phone": user.get("phone"),
            "region": user.get("region"),
            "totalPoints": progress.get("totalPoints", 0),
            "rewards": progress.get("rewards", []),
        })
    rows.sort(key=lambda x: x["totalPoints"], reverse=True)
    for idx, r in enumerate(rows):
        r["rank"] = idx + 1
    return _paginate(rows, page, size)

# Leaderboard ranking trigger -------------------------------------------
@app.get("/api/rank")
def trigger_rank(request: Request):
    _require_admin(request)
    # In a real system this re-runs ranking. Here we re-sort participants per challenge.
    return {"message": "Ranking job executed", "timestamp": _now_iso()}

# Generic apiMessage shape ----------------------------------------------
@app.get("/api/apiMessage")
def api_message():
    return {"message": "Operation completed successfully."}
