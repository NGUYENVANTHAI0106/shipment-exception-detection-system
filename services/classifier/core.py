from __future__ import annotations

VALID_SEVERITIES = {"CRITICAL", "HIGH", "MEDIUM", "LOW"}

RULE_ACTIONS = {
    "delay": "Liên hệ hãng vận chuyển để cập nhật vị trí đơn. Thông báo khách về việc trễ và hẹn thời gian giao lại cụ thể.",
    "failed_delivery": "Gọi người nhận để xác nhận địa chỉ và thời gian có mặt. Sắp xếp giao lại trong vòng 24 giờ.",
    "address_issue": "Xác minh lại địa chỉ với người gửi/người nhận và cập nhật ngay cho hãng vận chuyển.",
    "stuck": "Liên hệ trung tâm vận hành của hãng để yêu cầu kiểm tra quét tay và vị trí hiện tại của đơn.",
}

DEFAULT_ACTION = "Kiểm tra thủ công và phối hợp với hãng vận chuyển để xử lý."


def classify_by_rules(exception_data: dict) -> dict:
    """Phân loại exception bằng quy tắc cố định, không gọi AI."""
    exception_type = exception_data["exception_type"]
    severity_hint = exception_data.get("severity_hint", "MEDIUM")
    if severity_hint not in VALID_SEVERITIES:
        severity_hint = "MEDIUM"

    overdue_hours = float(exception_data.get("overdue_hours") or 0.0)
    failed_attempts = int(exception_data.get("failed_attempts") or 0)
    escalate = severity_hint == "CRITICAL" or overdue_hours >= 48 or failed_attempts >= 3

    return {
        "severity": severity_hint,
        "exception_type": exception_type,
        "suggested_action": RULE_ACTIONS.get(exception_type, DEFAULT_ACTION),
        "escalate_to_manager": escalate,
        "confidence": 1.0,
        "fallback_used": False,
        "fallback_reason": None,
        "model_used": "rule_engine",
    }
