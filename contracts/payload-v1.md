# Payload Contract v1 (WF1 -> WF2 -> WF3)

## Scope va nguyen tac

- Contract nay dung cho giai doan S1 va co hieu luc tu ngay tao.
- Khong doi key field sau khi chot S1 neu chua co version moi.
- Tat ca timestamp phai theo UTC, dinh dang ISO 8601 (`YYYY-MM-DDTHH:mm:ss.sssZ`).

## Tieu chuan du lieu chung

- **Timezone:** UTC.
- **Timestamp format:** ISO 8601 string, vi du `2026-04-21T03:30:00.000Z`.
- **UUID:** chuoi UUID v4.
- **Severity enum:** `CRITICAL | HIGH | MEDIUM | LOW`.
- **Exception type enum:** `delay | failed_delivery | address_issue | stuck`.
- **Boolean:** `true/false`, khong dung chuoi `"true"`/`"false"`.
- **So thuc:** dung JSON number, khong truyen duoi dang chuoi.

## Error code chuan

| Code | Nghia |
|------|-------|
| `INVALID_PAYLOAD` | Payload thieu field bat buoc hoac sai kieu |
| `INVALID_TIMESTAMP` | Timestamp khong dung ISO 8601 UTC |
| `UNSUPPORTED_EXCEPTION_TYPE` | `exception_type` khong nam trong enum |
| `UNSUPPORTED_SEVERITY` | `severity`/`severity_hint` khong nam trong enum |
| `DATABASE_ERROR` | Loi truy van Postgres |
| `REDIS_ERROR` | Loi dedup cache |
| `CLASSIFIER_TIMEOUT` | Qua timeout khi goi classifier |
| `CLASSIFIER_INVALID_JSON` | AI tra JSON sai schema |
| `NOTIFIER_ERROR` | Loi khi goi dich vu thong bao |
| `ALREADY_NOTIFIED` | Bo qua do exception da duoc thong bao |
| `INTERNAL_ERROR` | Loi he thong khac |

## WF1 -> WF2 (detect output)

### Payload

```json
{
  "exception_id": "uuid",
  "shipment_id": "uuid",
  "tracking_number": "TRK-GH1234AB",
  "carrier": "GHN",
  "destination": "Ha Noi",
  "exception_type": "delay",
  "reason": "Overdue by 36.5 hours — expected 2026-04-20 08:00",
  "severity_hint": "HIGH",
  "overdue_hours": 36.5,
  "failed_attempts": 1,
  "detected_at": "2026-04-21T03:30:00.000Z"
}
```

### Required fields

- `exception_id`, `shipment_id`, `exception_type`, `reason`, `severity_hint`, `overdue_hours`, `detected_at`

## WF2 -> WF3 (classified output)

### Payload

```json
{
  "exception_id": "uuid",
  "shipment_id": "uuid",
  "tracking_number": "TRK-GH1234AB",
  "carrier": "GHN",
  "destination": "Ha Noi",
  "exception_type": "delay",
  "reason": "Overdue by 36.5 hours — expected 2026-04-20 08:00",
  "overdue_hours": 36.5,
  "severity_hint": "HIGH",
  "severity": "HIGH",
  "ai_suggestion": "Contact carrier hub and confirm ETA within 2 hours.",
  "confidence": 0.82,
  "fallback_used": false,
  "fallback_reason": null,
  "model_used": "gemini-1.5-flash",
  "escalate_to_manager": false,
  "classified_at": "2026-04-21T03:31:20.000Z"
}
```

### Required fields

- `exception_id`, `shipment_id`, `exception_type`, `severity`, `ai_suggestion`, `confidence`, `fallback_used`, `classified_at`

## Error response shape (ap dung cho webhook noi bo)

```json
{
  "success": false,
  "error_code": "INVALID_PAYLOAD",
  "message": "exception_type is required",
  "request_id": "uuid",
  "timestamp": "2026-04-21T03:31:20.000Z"
}
```

