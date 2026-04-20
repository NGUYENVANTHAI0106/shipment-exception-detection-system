from __future__ import annotations

import json
from typing import Callable

SYSTEM_PROMPT = """You are an expert logistics operations assistant.
Your job is to classify shipment exceptions and recommend precise actions for operations staff.
You MUST respond with ONLY a valid JSON object. No explanation, no markdown, no code blocks.
The JSON must have exactly these fields:

{
  "severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  "exception_type": "delay" | "failed_delivery" | "address_issue" | "stuck",
  "suggested_action": "<specific, actionable instruction for ops staff — max 200 chars>",
  "escalate_to_manager": true | false,
  "confidence": <float between 0.0 and 1.0>
}

Severity guidelines:
- CRITICAL: immediate action required, SLA already severely breached, set escalate_to_manager=true
- HIGH: action needed within 2 hours, escalate_to_manager=false unless overdue > 48h
- MEDIUM: action needed today
- LOW: monitor only

Suggested action must be specific: mention carrier name, recommended contact method, time window."""

VALID_SEVERITIES = {"CRITICAL", "HIGH", "MEDIUM", "LOW"}

FALLBACK_ACTIONS = {
    "delay": "Contact carrier for shipment location update. Notify recipient of delay. Schedule re-delivery.",
    "failed_delivery": "Call recipient to confirm address and availability. Arrange re-delivery attempt within 24h.",
    "address_issue": "Verify delivery address with sender. Update carrier with corrected address immediately.",
    "stuck": "Contact carrier operations center. Request manual scan/location check for stuck shipment.",
}


def build_user_prompt(exception_data: dict, history: dict) -> str:
    return f"""
Exception to classify:
- Type: {exception_data['exception_type']}
- Reason: {exception_data['reason']}
- Overdue hours: {exception_data['overdue_hours']}
- Carrier: {exception_data.get('carrier', 'unknown')}
- Recipient destination: {exception_data.get('destination', 'unknown')}
- Rule engine severity hint: {exception_data['severity_hint']}

Shipment history:
- Previous exceptions count: {history.get('previous_exception_count', 0)}
- Last exception type: {history.get('last_exception_type', 'none')}
- Shipment age (days since created): {history.get('shipment_age_days', 0)}
- Failed attempts total: {exception_data.get('failed_attempts', 0)}

Classify this exception. Be specific about the suggested action for {exception_data.get('carrier', 'the carrier')}.
""".strip()


def _validate_classifier_payload(result: dict) -> dict:
    severity = result.get("severity")
    suggested_action = result.get("suggested_action")
    confidence = result.get("confidence")
    if severity not in VALID_SEVERITIES:
        raise ValueError("invalid severity")
    if not isinstance(suggested_action, str) or not suggested_action.strip():
        raise ValueError("suggested_action is required")
    if not isinstance(confidence, (int, float)):
        raise ValueError("confidence must be numeric")
    if not (0 <= float(confidence) <= 1):
        raise ValueError("confidence must be between 0 and 1")
    return result


def classify_with_fallback(
    exception_data: dict,
    history: dict,
    call_claude_api: Callable[[dict, dict], str],
    model_name: str,
) -> dict:
    try:
        response = call_claude_api(exception_data, history)
        result = json.loads(response)
        result = _validate_classifier_payload(result)
        return {
            "severity": result["severity"],
            "exception_type": result.get("exception_type", exception_data["exception_type"]),
            "suggested_action": result["suggested_action"],
            "escalate_to_manager": bool(result.get("escalate_to_manager", False)),
            "confidence": round(float(result["confidence"]), 3),
            "fallback_used": False,
            "fallback_reason": None,
            "model_used": model_name,
        }
    except Exception as exc:  # noqa: BLE001
        exception_type = exception_data["exception_type"]
        return {
            "severity": exception_data["severity_hint"],
            "exception_type": exception_type,
            "suggested_action": FALLBACK_ACTIONS.get(
                exception_type, "Investigate shipment manually and coordinate with carrier."
            ),
            "escalate_to_manager": exception_data["severity_hint"] == "CRITICAL",
            "confidence": 0.6,
            "fallback_used": True,
            "fallback_reason": str(exc),
            "model_used": "rule_based_fallback",
        }
