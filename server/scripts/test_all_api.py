import argparse
import json
import sys
import uuid
from dataclasses import dataclass

import httpx


@dataclass
class Ctx:
    base_url: str
    timeout: float


def _log(msg: str) -> None:
    print(msg)


def _fail(msg: str) -> None:
    _log(f"[FAIL] {msg}")
    raise SystemExit(1)


def _ok(msg: str) -> None:
    _log(f"[PASS] {msg}")


def expect_status(resp: httpx.Response, expected: int, label: str) -> None:
    if resp.status_code != expected:
        snippet = resp.text[:500]
        _fail(f"{label}: expected {expected}, got {resp.status_code}. body={snippet}")
    _ok(label)


def main() -> None:
    parser = argparse.ArgumentParser(description="TeachTrack API smoke test")
    parser.add_argument("--base-url", default="http://127.0.0.1:8000", help="API base URL")
    parser.add_argument("--timeout", type=float, default=20.0, help="HTTP timeout seconds")
    args = parser.parse_args()

    ctx = Ctx(base_url=args.base_url.rstrip("/"), timeout=args.timeout)
    uid = uuid.uuid4().hex[:10]
    username = f"smoke_{uid}"
    email = f"{username}@example.com"
    password = "SmokeTestPass123!"
    new_password = "SmokeTestPass123!X"

    with httpx.Client(timeout=ctx.timeout) as client:
        # health
        r = client.get(f"{ctx.base_url}/healthz")
        expect_status(r, 200, "health check")

        # register
        r = client.post(
            f"{ctx.base_url}/api/v1/register",
            json={
                "email": email,
                "username": username,
                "password": password,
                "is_active": True,
            },
        )
        expect_status(r, 200, "register user")
        user = r.json()
        user_id = user["id"]

        # login
        r = client.post(
            f"{ctx.base_url}/api/v1/login/access-token",
            data={"username": username, "password": password},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        expect_status(r, 200, "login with password")
        token = r.json()["access_token"]
        auth_headers = {"Authorization": f"Bearer {token}"}

        # users/me
        r = client.get(f"{ctx.base_url}/api/v1/users/me", headers=auth_headers)
        expect_status(r, 200, "get current user")
        me = r.json()
        if me["id"] != user_id:
            _fail("current user id mismatch")
        _ok("current user id matches")

        # update profile
        updated_email = f"updated_{uid}@example.com"
        updated_username = f"updated_{uid}"
        r = client.patch(
            f"{ctx.base_url}/api/v1/users/me",
            headers=auth_headers,
            json={"email": updated_email, "username": updated_username},
        )
        expect_status(r, 200, "update user profile")

        # change password
        r = client.post(
            f"{ctx.base_url}/api/v1/users/me/change-password",
            headers=auth_headers,
            json={"current_password": password, "new_password": new_password},
        )
        expect_status(r, 200, "change user password")

        # login with new password
        r = client.post(
            f"{ctx.base_url}/api/v1/login/access-token",
            data={"username": updated_username, "password": new_password},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        expect_status(r, 200, "login with updated password")
        token = r.json()["access_token"]
        auth_headers = {"Authorization": f"Bearer {token}"}

        # create subject
        r = client.post(
            f"{ctx.base_url}/api/v1/classroom/subjects",
            headers=auth_headers,
            json={"name": "Smoke Subject", "code": "SMK101", "description": "smoke"},
        )
        expect_status(r, 200, "create subject")
        subject = r.json()
        subject_id = subject["id"]

        # list subjects
        r = client.get(f"{ctx.base_url}/api/v1/classroom/subjects", headers=auth_headers)
        expect_status(r, 200, "list subjects")

        # read and patch subject
        r = client.get(f"{ctx.base_url}/api/v1/classroom/subjects/{subject_id}", headers=auth_headers)
        expect_status(r, 200, "read subject")
        r = client.patch(
            f"{ctx.base_url}/api/v1/classroom/subjects/{subject_id}",
            headers=auth_headers,
            json={"description": "smoke updated"},
        )
        expect_status(r, 200, "update subject")

        # create section
        r = client.post(
            f"{ctx.base_url}/api/v1/classroom/sections",
            headers=auth_headers,
            json={"name": "Section A", "subject_id": subject_id},
        )
        expect_status(r, 200, "create section")
        section = r.json()
        section_id = section["id"]

        # list sections
        r = client.get(f"{ctx.base_url}/api/v1/classroom/sections", headers=auth_headers)
        expect_status(r, 200, "list sections")
        r = client.get(f"{ctx.base_url}/api/v1/classroom/subjects/{subject_id}/sections", headers=auth_headers)
        expect_status(r, 200, "list sections by subject")

        # models list/select
        r = client.get(f"{ctx.base_url}/api/v1/models", headers=auth_headers)
        expect_status(r, 200, "list models")
        models = r.json()
        current_model = models.get("current_model_file")
        if not current_model:
            _fail("models response missing current_model_file")
        _ok("models response contains current model")

        r = client.post(
            f"{ctx.base_url}/api/v1/models/select",
            headers=auth_headers,
            json={"file_name": current_model},
        )
        expect_status(r, 200, "select model")

        # start session
        r = client.post(
            f"{ctx.base_url}/api/v1/sessions/start",
            headers=auth_headers,
            json={"subject_id": subject_id, "section_id": section_id, "students_present": 10},
        )
        expect_status(r, 200, "start session")
        session = r.json()
        session_id = session["id"]

        # active session and list
        r = client.get(f"{ctx.base_url}/api/v1/sessions/active", headers=auth_headers)
        expect_status(r, 200, "get active session")
        r = client.get(f"{ctx.base_url}/api/v1/sessions", headers=auth_headers)
        expect_status(r, 200, "list sessions")

        # log behavior to force alert generation
        r = client.post(
            f"{ctx.base_url}/api/v1/sessions/{session_id}/log",
            headers=auth_headers,
            json={
                "on_task": 1,
                "sleeping": 4,
                "using_phone": 0,
                "off_task": 0,
                "not_visible": 0,
            },
        )
        expect_status(r, 200, "log behavior")

        # metrics/history/rollup
        r = client.get(f"{ctx.base_url}/api/v1/sessions/{session_id}/metrics", headers=auth_headers)
        expect_status(r, 200, "get session metrics")
        metrics = r.json()

        r = client.get(f"{ctx.base_url}/api/v1/sessions/{session_id}/metrics/rollup", headers=auth_headers)
        expect_status(r, 200, "get session rollup")

        r = client.get(f"{ctx.base_url}/api/v1/sessions/{session_id}/history", headers=auth_headers)
        expect_status(r, 200, "get session history")

        # detector status endpoints (safe)
        r = client.get(f"{ctx.base_url}/api/v1/sessions/{session_id}/detector/status", headers=auth_headers)
        expect_status(r, 200, "detector status")

        # alert read/history if generated
        alerts = metrics.get("alerts", [])
        if alerts:
            alert_id = alerts[0]["id"]
            r = client.put(f"{ctx.base_url}/api/v1/sessions/alerts/{alert_id}/read", headers=auth_headers)
            expect_status(r, 200, "mark alert read")

            r = client.get(f"{ctx.base_url}/api/v1/sessions/alerts/{alert_id}/history", headers=auth_headers)
            expect_status(r, 200, "alert history")
        else:
            _log("[WARN] No alerts generated; alert read/history checks skipped")

        # stop session
        r = client.post(f"{ctx.base_url}/api/v1/sessions/{session_id}/stop", headers=auth_headers)
        expect_status(r, 200, "stop session")

    _log("\nAll smoke checks passed.")


if __name__ == "__main__":
    try:
        main()
    except httpx.RequestError as exc:
        _fail(f"Request error: {exc}")
    except Exception as exc:
        _fail(f"Unhandled error: {exc}")
