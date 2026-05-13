from __future__ import annotations

import json
import urllib.error
import urllib.request

BASE = "http://localhost:8000"


def request_json(method: str, path: str, payload: dict | None = None, token: str | None = None) -> tuple[int, dict | list]:
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
        with urllib.request.urlopen(req, timeout=12) as resp:
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
    assert isinstance(body, dict)
    return body["access_token"]


def ensure_non_resolved_exception(ops_token: str) -> str:
    status, body = request_json("GET", "/api/exceptions", token=ops_token)
    assert status == 200 and isinstance(body, list) and body, body
    for item in body:
        if item.get("status") != "resolved" and item.get("severity") != "CRITICAL":
            return item["id"]
    return body[0]["id"]


def main() -> None:
    ops_token = login("ops", "ops123")
    employee_token = login("employee", "employee123")
    manager_token = login("manager", "manager123")

    exception_id = ensure_non_resolved_exception(ops_token)

    claim_status, claim_body = request_json("POST", f"/api/exceptions/{exception_id}/claim", token=employee_token)
    assert claim_status == 200, claim_body

    support_status, support_body = request_json("POST", f"/api/exceptions/{exception_id}/escalate", token=employee_token)
    assert support_status == 200, support_body

    queue_status, queue_body = request_json("GET", "/api/manager/exceptions", token=manager_token)
    assert queue_status == 200 and isinstance(queue_body, list), queue_body
    assert any(item["id"] == exception_id for item in queue_body), queue_body

    accept_status, accept_body = request_json(
        "POST",
        f"/api/manager/exceptions/{exception_id}/accept-review",
        {"reason": "Manager accepted for review in UAT"},
        token=manager_token,
    )
    assert accept_status == 200 and isinstance(accept_body, dict), accept_body
    assert accept_body["status"] == "in_progress", accept_body

    return_status, return_body = request_json(
        "POST",
        f"/api/manager/exceptions/{exception_id}/return-to-ops",
        {"reason": "Need ops to verify destination details"},
        token=manager_token,
    )
    assert return_status == 200 and isinstance(return_body, dict), return_body
    assert return_body["status"] == "returned_to_ops", return_body

    close_status, close_body = request_json(
        "POST",
        f"/api/manager/exceptions/{exception_id}/approve-close",
        {"reason": "Issue has been validated and closed"},
        token=manager_token,
    )
    assert close_status == 200 and isinstance(close_body, dict), close_body
    assert close_body["status"] == "resolved", close_body

    kpi_status, kpi_body = request_json("GET", "/api/manager/kpis", token=manager_token)
    assert kpi_status == 200 and isinstance(kpi_body, dict), kpi_body
    for key in ["mtta_minutes", "mttr_minutes", "breach_rate", "support_rate", "backlog_by_assignee"]:
        assert key in kpi_body, kpi_body

    audit_status, audit_body = request_json("GET", f"/api/audit-logs?exception_id={exception_id}", token=manager_token)
    assert audit_status == 200 and isinstance(audit_body, list), audit_body
    actions = [row.get("action") for row in audit_body]
    for expected in ["claimed_from_web", "requested_manager_support_from_web", "manager_in_progress", "manager_returned_to_ops", "manager_resolved"]:
        assert expected in actions, actions

    denied_status, denied_body = request_json("GET", "/api/manager/exceptions", token=employee_token)
    assert denied_status == 403, denied_body

    print("S8 manager e2e UAT passed")


if __name__ == "__main__":
    main()
