from __future__ import annotations

import json
import urllib.error
import urllib.request

BASE = "http://localhost:8000"


def request_json(method: str, path: str, payload: dict | None = None, token: str | None = None) -> tuple[int, dict]:
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE}{path}",
        method=method,
        data=data,
        headers={"Content-Type": "application/json"},
    )
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = json.loads(resp.read().decode("utf-8"))
            return resp.status, body
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="ignore")
        try:
            body = json.loads(raw)
        except Exception:  # noqa: BLE001
            body = {"raw": raw}
        return exc.code, body


def login(username: str, password: str) -> str:
    status, body = request_json("POST", "/api/auth/login", {"username": username, "password": password})
    assert status == 200, body
    return body["access_token"]


def main() -> None:
    ops_token = login("ops", "ops123")
    employee_token = login("employee", "employee123")

    status, body = request_json("GET", "/api/me", token=ops_token)
    assert status == 200 and body["role"] == "ops", body

    status, body = request_json("GET", "/api/me", token=employee_token)
    assert status == 200 and body["role"] == "employee", body

    status, body = request_json("GET", "/api/exceptions", token=ops_token)
    assert status == 200 and isinstance(body, list), body

    status, body = request_json("GET", "/api/exceptions", token=employee_token)
    assert status == 200 and isinstance(body, list), body

    if body:
        sample_id = body[0]["id"]
        denied_update_status, denied_update_body = request_json(
            "PATCH",
            f"/api/exceptions/{sample_id}",
            {"status": "in_progress"},
            token=employee_token,
        )
        assert denied_update_status == 403, denied_update_body

        denied_escalate_status, denied_escalate_body = request_json(
            "POST",
            f"/api/exceptions/{sample_id}/escalate",
            token=employee_token,
        )
        assert denied_escalate_status == 403, denied_escalate_body

        ops_update_status, ops_update_body = request_json(
            "PATCH",
            f"/api/exceptions/{sample_id}",
            {"status": "in_progress", "resolution_note": "UAT update by ops"},
            token=ops_token,
        )
        assert ops_update_status == 200, ops_update_body

        audit_status, audit_body = request_json("GET", f"/api/audit-logs?exception_id={sample_id}", token=ops_token)
        assert audit_status == 200 and isinstance(audit_body, list), audit_body

    print("S6 RBAC UAT passed")


if __name__ == "__main__":
    main()
