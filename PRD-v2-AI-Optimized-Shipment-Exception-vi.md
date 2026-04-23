# PRD — Hệ thống tự động phát hiện ngoại lệ vận chuyển (Shipment Exception Detection Automation)

> **BỐI CẢNH AI:** Tài liệu này là nguồn sự thật duy nhất khi xây dựng hệ thống. Đọc hết các mục trước khi sinh mã. Mọi quyết định trong đây đều có chủ đích.

**Stack:** n8n (chỉ điều phối) · FastAPI Python (logic nghiệp vụ) · Next.js 14 App Router · **PostgreSQL (Docker)** · Redis · Docker Compose · Claude API (Haiku)

> **Thay đổi so với PRD gốc (tiếng Anh):** Không dùng **Supabase self-host** (nặng). Toàn bộ dữ liệu nằm trong **PostgreSQL chạy bằng image chính thức** (`postgres:16` hoặc tương đương) trong Docker Compose. Không có Supabase Realtime — dashboard dùng **làm mới định kỳ / refetch** (và tùy chọn nâng cao: `LISTEN/NOTIFY` + SSE).

---

## TÓM TẮT CHỨC NĂNG (KHI BUILD ĐÚNG LỘ TRÌNH PRD)

Nếu triển khai trọn vẹn theo PRD, hệ thống có các khả năng sau:

| Nhóm | Chức năng |
|------|-----------|
| **Thu thập & phát hiện** | Lịch mỗi 5 phút lấy danh sách lô hàng (mock hoặc nguồn thật), chạy **rule engine** theo thứ tự ưu tiên (failed → stuck → delay → address), bỏ qua trạng thái kết thúc (`delivered`, `returned`). |
| **Khử trùng** | Redis TTL theo `shipment_id` để không tạo ngoại lệ/đánh giá lặp trong cửa sổ thời gian (ví dụ 1 giờ). |
| **Lưu trữ** | Ghi `shipments` / `exceptions` / `audit_logs` trên **PostgreSQL**; luồng n8n và backend chỉ dùng connection/credential phù hợp. |
| **AI phân loại** | Gọi Claude để gán `severity` cuối, `suggested_action`, `confidence`; **fallback** khi API lỗi/timeout/JSON sai — luôn có kết quả. |
| **Thông báo** | Định tuyến Telegram (ops / quản lý), email theo ma trận mức độ; leo thang thêm theo **vi phạm SLA** (`overdue_hours`); khử trùng “đã notified”. |
| **Dashboard ops** | Danh sách ngoại lệ (lọc, tìm tracking), **chi tiết** (đổi trạng thái, ghi chú, leo thang thủ công) — ghi nhận qua `audit_logs`. |
| **Analytics (manager)** | KPI và biểu đồ theo khoảng ngày (cần function SQL/RPC trên Postgres cho các aggregate). |
| **Vận hành & an toàn** | Webhook nối WF1 → WF2 → WF3; xử lý lỗi theo bảng edge cases; Docker nội bộ gọi nhau bằng hostname dịch vụ. |

**Điểm khác biệt kỹ thuật (Postgres thuần):** UI **không** subscribe Realtime Supabase; dùng **polling** (ví dụ 5–15 giây) hoặc refetch khi chuyển tab — vẫn đạt mục tiêu “ops thấy ngoại lệ mới gần thời gian thực” mà không cần stack Supabase.

---

## PHẦN 1 — MÔ HÌNH TƯ DUY HỆ THỐNG

### Hệ thống làm gì (một đoạn)

Cứ mỗi 5 phút, hệ thống lấy toàn bộ lô hàng đang hoạt động, đưa từng lô qua engine quy tắc để phát hiện bất thường (trễ, thất bại, kẹt), khử trùng lặp bằng Redis để tránh xử lý lại, lưu ngoại lệ vào PostgreSQL, sau đó giao cho bộ phân loại AI để làm giàu mỗi ngoại lệ với mức độ nghiêm trọng dễ đọc và gợi ý hành động. Luồng thông báo cuối cùng định tuyến cảnh báo đúng kênh (Telegram cho vận hành, email để lưu hồ sơ, leo thang cho quản lý nếu CRITICAL) và ghi đầy đủ audit trail. Dashboard Next.js **làm mới danh sách theo chu kỳ** (polling) hoặc refetch sau hành động người dùng để nhân sự vận hành thấy ngoại lệ mới gần thời gian thực — **không** dùng Supabase Realtime.

### n8n làm gì (và KHÔNG làm gì)

n8n chỉ là **điều phối**. Nó lo: lịch (cron), gọi HTTP tới dịch vụ Python, định tuyến có điều kiện (IF/Switch), và nối workflow qua webhook. Nó KHÔNG chứa: tính toán ngày giờ, xử lý chuỗi, chấm điểm, render template, hay bất kỳ quy tắc nghiệp vụ nào. Toàn bộ phần đó nằm trong dịch vụ Python.

### Quyết định thiết kế quan trọng (AI cần biết)

1. **3 workflow giao tiếp qua webhook HTTP nội bộ** — WF1 gọi `POST /webhook/wf2-classify` ở cuối, WF2 gọi `POST /webhook/wf3-notify`. Tách rời; mỗi luồng có thể lỗi độc lập.
2. **Khử trùng Redis dùng TTL=3600s theo shipment_id** — tránh ngoại lệ trùng trong cùng một giờ. Hết TTL, lô được đánh giá lại (có chủ đích: trạng thái có thể đổi).
3. **Classifier bắt buộc có fallback** — nếu Claude API timeout hoặc JSON không hợp lệ, dùng `severity_hint` từ rule engine. Pipeline không dừng vì lỗi AI.
4. **Cập nhật UI không dùng Realtime** — frontend gọi API/Server Components (hoặc truy vấn Postgres chỉ trên server) và **poll** danh sách `exceptions` mỗi vài giây (hoặc dùng `SWR`/`TanStack Query` với `refetchInterval`). Tùy chọn nâng cao: trigger refetch khi nhận sự kiện từ pipeline (ít dùng trong phạm vi đề tài).
5. **Hostname nội bộ Docker** — dịch vụ gọi nhau dạng `http://detector:8001`, `http://classifier:8002`, v.v. Trong container không dùng localhost.

---

## PHẦN 2 — MÔ HÌNH DỮ LIỆU (POSTGRESQL DOCKER)

> Schema chuẩn không đổi. Sinh migration (SQL thuần hoặc Alembic/Prisma), Pydantic, kiểu TypeScript từ các định nghĩa này.

### 2.0 Cách truy cập PostgreSQL (thay REST Supabase)

| Thành phần | Cách khuyến nghị |
|------------|------------------|
| **Docker** | Service `postgres` (image `postgres:16-alpine` hoặc tương đương), volume cho dữ liệu, biến `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`. |
| **n8n** | **Node Postgres** (Credentials: host `postgres`, port `5432`, DB/user/pass) để `INSERT`/`SELECT`/`UPDATE` bảng `exceptions`, `shipments`, `audit_logs`; *hoặc* gọi **HTTP** tới một **API gateway nhỏ** (FastAPI) nếu muốn gom logic SQL vào code. |
| **Next.js** | **Không** kết nối Postgres trực tiếp từ trình duyệt. Dùng **Route Handlers / Server Actions** với `DATABASE_URL` (Prisma, Drizzle, hoặc `pg`), hoặc gọi cùng API nội bộ với n8n. |
| **Biến môi trường** | `DATABASE_URL=postgresql://user:pass@postgres:5432/dbname` dùng chung cho backend Next.js và (tuỳ chọn) các service Python nếu cần đọc/ghi DB. |

Không bắt buộc PostgREST/Kong/Supabase API — giữ stack nhẹ.

### 2.1 Bảng `shipments`

```sql
CREATE TABLE shipments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_number   TEXT NOT NULL UNIQUE,              -- ví dụ "TRK-GH1234AB"
  carrier           TEXT NOT NULL,                     -- "GHN" | "GHTK" | "ViettelPost" | "J&T"
  origin            TEXT NOT NULL,
  destination       TEXT NOT NULL,
  expected_delivery TIMESTAMPTZ NOT NULL,              -- hạn SLA
  actual_delivery   TIMESTAMPTZ,                       -- NULL cho đến khi giao xong
  status            TEXT NOT NULL,                     -- xem enum Status bên dưới
  failed_attempts   INT NOT NULL DEFAULT 0,
  last_updated      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enum Status (ép ở tầng ứng dụng, không ràng buộc DB để linh hoạt):
-- "in_transit"    → đang vận chuyển, chưa có sự cố
-- "delivered"     → trạng thái kết thúc, bỏ qua phát hiện
-- "failed"        → giao thất bại
-- "stuck"         → đang vận chuyển nhưng không cập nhật quét
-- "address_issue" → hãng không tìm được địa chỉ
-- "returned"      → đang hoàn về người gửi
```

### 2.2 Bảng `exceptions`

```sql
CREATE TABLE exceptions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id      UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,

  -- Kết quả phát hiện (detector service, WF1)
  exception_type   TEXT NOT NULL,      -- "delay" | "failed_delivery" | "address_issue" | "stuck"
  reason           TEXT NOT NULL,      -- mô tả từ rule engine, ví dụ "Quá hạn 36.5 giờ"
  severity_hint    TEXT NOT NULL,      -- đoán mức độ từ rule: "CRITICAL"|"HIGH"|"MEDIUM"|"LOW"
  overdue_hours    NUMERIC(8,2) NOT NULL DEFAULT 0,

  -- Kết quả phân loại (classifier service, WF2)
  severity         TEXT,               -- mức độ cuối sau AI: "CRITICAL"|"HIGH"|"MEDIUM"|"LOW"
  ai_suggestion    TEXT,               -- hành động gợi ý cho ops
  confidence       NUMERIC(4,3),       -- 0.000 đến 1.000
  fallback_used    BOOLEAN DEFAULT FALSE, -- TRUE nếu Claude lỗi và dùng rule
  classified_at    TIMESTAMPTZ,

  -- Kết quả thông báo (notifier service, WF3)
  status           TEXT NOT NULL DEFAULT 'open',
  -- "open"        → đã phát hiện, chưa gửi thông báo
  -- "notified"    → đã gửi cảnh báo
  -- "in_progress" → ops đang xử lý
  -- "resolved"    → đóng kèm ghi chú xử lý
  notified_at      TIMESTAMPTZ,
  channels_sent    TEXT[],             -- ví dụ ["telegram_ops", "email", "telegram_manager"]
  is_escalated     BOOLEAN NOT NULL DEFAULT FALSE,

  detected_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at      TIMESTAMPTZ,
  resolution_note  TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_exceptions_status ON exceptions(status);
CREATE INDEX idx_exceptions_severity ON exceptions(severity);
CREATE INDEX idx_exceptions_shipment_id ON exceptions(shipment_id);
CREATE INDEX idx_exceptions_detected_at ON exceptions(detected_at DESC);

-- (Không dùng Supabase: bỏ ALTER PUBLICATION supabase_realtime.)
-- Cập nhật UI: polling từ app hoặc function SQL + API; tùy chọn sau này: NOTIFY + SSE.
```

### 2.3 Bảng `audit_logs`

```sql
CREATE TABLE audit_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exception_id UUID NOT NULL REFERENCES exceptions(id) ON DELETE CASCADE,
  action       TEXT NOT NULL,
  -- "detected"   → WF1 tạo ngoại lệ
  -- "classified" → WF2 làm giàu bằng AI
  -- "notified"   → WF3 gửi cảnh báo
  -- "escalated"  → WF3 gửi cảnh báo quản lý
  -- "status_changed" → ops đổi trạng thái qua UI
  -- "error"      → lỗi pipeline
  actor        TEXT NOT NULL DEFAULT 'system',  -- "system" | "ops_staff" | "manager"
  metadata     JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- metadata theo action: (giữ nguyên cấu trúc như bản gốc)
```

### 2.4 Kiểu TypeScript (Next.js — sinh từ SQL)

*(Giữ nguyên định nghĩa `types/database.ts` như bản tiếng Anh — các khóa và kiểu không đổi.)*

---

## PHẦN 3 — LOGIC NGHIỆP VỤ: QUY TẮC PHÁT HIỆN

> Thuật toán lõi của hệ thống. Triển khai đúng như mô tả.

### 3.1 Thứ tự đánh giá quy tắc (dừng khi khớp đầu tiên)

Đánh giá theo thứ tự ưu tiên. Mỗi lô khớp tối đa MỘT quy tắc mỗi chu kỳ.

```python
# Ưu tiên (cao → thấp):
# 1. failed_delivery
# 2. stuck
# 3. delay
# 4. address_issue

# Bỏ qua phát hiện nếu:
# - status == "delivered" hoặc "returned"  → trạng thái kết thúc
```

### 3.2 Định nghĩa quy tắc và ma trận mức độ

**Quy tắc 1: Giao hàng thất bại (`failed_delivery`)**
```
ĐIỀU KIỆN:
  shipment.status == "failed"
  HOẶC shipment.failed_attempts >= 2

MỨC ĐỘ:
  failed_attempts >= 3  → CRITICAL
  failed_attempts == 2  → HIGH
  status == "failed" và failed_attempts < 2  → HIGH

MẪU REASON:
  "Delivery failed after {failed_attempts} attempt(s)"
```

**Quy tắc 2: Kẹt trên đường (`stuck`)**
```
ĐIỀU KIỆN:
  hours_since_last_update = (NOW - shipment.last_updated).total_seconds() / 3600
  hours_since_last_update > 48

MỨC ĐỘ:
  hours_since_last_update > 96  → CRITICAL
  hours_since_last_update > 48  → HIGH

MẪU REASON:
  "No status update for {hours_since_last_update:.0f} hours"
```

**Quy tắc 3: Trễ hạn (`delay`)**
```
ĐIỀU KIỆN:
  shipment.status == "in_transit"
  VÀ shipment.actual_delivery IS NULL
  VÀ overdue_hours > 24
  với overdue_hours = (NOW - shipment.expected_delivery).total_seconds() / 3600

MỨC ĐỘ:
  overdue_hours > 72  → CRITICAL
  overdue_hours > 48  → HIGH
  overdue_hours > 24  → MEDIUM

MẪU REASON:
  "Overdue by {overdue_hours:.1f} hours — expected {expected_delivery:%Y-%m-%d %H:%M}"
```

**Quy tắc 4: Vấn đề địa chỉ (`address_issue`)**
```
ĐIỀU KIỆN:
  shipment.status == "address_issue"

MỨC ĐỘ:
  luôn → HIGH

MẪU REASON:
  "Carrier cannot verify delivery address for {destination}"
```

### 3.3 Hợp đồng đầu ra phát hiện

```python
# Khi có ngoại lệ:
{
  "shipment_id": str,
  "is_exception": True,
  "exception_type": "delay" | "failed_delivery" | "address_issue" | "stuck",
  "reason": str,
  "severity_hint": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
  "overdue_hours": float,
  "skipped": False
}

# Khi không có ngoại lệ:
{
  "shipment_id": str,
  "is_exception": False,
  "skipped": False
}

# Khi bỏ qua (trùng Redis):
{
  "shipment_id": str,
  "is_exception": False,
  "skipped": True,
  "skip_reason": "already_processed_in_cache"
}
```

### 3.4 Triển khai Redis dedup

```python
# Key:   "processed:{shipment_id}"
# Giá trị: "1"
# TTL:   3600 giây (1 giờ)

# Trước khi gọi rule engine:
cache_key = f"processed:{shipment.id}"
if redis_client.exists(cache_key):
    return { "shipment_id": shipment.id, "is_exception": False, "skipped": True, "skip_reason": "already_processed_in_cache" }

# Sau khi rule engine chạy (bất kể is_exception):
redis_client.setex(cache_key, 3600, "1")
# Lưu ý: cache cả trường hợp không phải ngoại lệ để không đánh giá lặp lại cùng lô trong TTL
```

**Cảnh báo thiết kế:** Đoạn Python trên ghi Redis *sau mọi* lần chạy rule. Luồng n8n WF1 trong PRD gốc chỉ “Set Redis” sau khi phát hiện ngoại lệ — hai cách **không tương đương**; cần chỉnh WF1 hoặc chỉnh detector cho thống nhất (xem phần đánh giá ở câu trả lời chat).

---

## PHẦN 4 — LOGIC NGHIỆP VỤ: PHÂN LOẠI AI

### 4.1 Classifier làm gì

Nhận ngoại lệ đã phát hiện + ngữ cảnh lịch sử → gọi Claude → trả về JSON có severity + gợi ý hành động. Nếu Claude lỗi → fallback `severity_hint`. Hình dạng đầu ra giống nhau dù AI thành công hay fallback.

### 4.2 Prompt Claude (template chính xác)

```python
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
"""
```

### 4.3 Logic fallback (bắt buộc)

```python
FALLBACK_ACTIONS = {
    "delay": "Contact carrier for shipment location update. Notify recipient of delay. Schedule re-delivery.",
    "failed_delivery": "Call recipient to confirm address and availability. Arrange re-delivery attempt within 24h.",
    "address_issue": "Verify delivery address with sender. Update carrier with corrected address immediately.",
    "stuck": "Contact carrier operations center. Request manual scan/location check for stuck shipment.",
}

def classify_with_fallback(exception_data: dict, history: dict) -> dict:
    try:
        response = call_claude_api(exception_data, history)
        result = json.loads(response)
        assert result.get("severity") in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
        assert result.get("suggested_action")
        result["fallback_used"] = False
        result["model_used"] = "claude-haiku-4-5-20251001"
        return result
    except Exception as e:
        return {
            "severity": exception_data["severity_hint"],
            "exception_type": exception_data["exception_type"],
            "suggested_action": FALLBACK_ACTIONS[exception_data["exception_type"]],
            "escalate_to_manager": exception_data["severity_hint"] == "CRITICAL",
            "confidence": 0.6,
            "fallback_used": True,
            "fallback_reason": str(e),
            "model_used": "rule_based_fallback"
        }
```

### 4.4 Hợp đồng đầu ra phân loại

Cả AI thành công và fallback đều trả cùng một cấu trúc: `severity`, `exception_type`, `suggested_action`, `escalate_to_manager`, `confidence`, `fallback_used`, `fallback_reason`, `model_used`.

---

## PHẦN 5 — ĐỊNH TUYẾN THÔNG BÁO

### 5.1 Ma trận kênh

```
severity = CRITICAL:
  → telegram_ops (luôn)
  → telegram_manager (luôn — CRITICAL tự leo thang)
  → email (luôn)
  → is_escalated = TRUE

severity = HIGH VÀ overdue_hours > 48:
  → telegram_ops, telegram_manager, email
  → is_escalated = TRUE

severity = HIGH VÀ overdue_hours <= 48:
  → telegram_ops, email
  → is_escalated = FALSE

severity = MEDIUM:
  → chỉ email
  → is_escalated = FALSE

severity = LOW:
  → không gửi thông báo
  → chỉ lưu DB
  → is_escalated = FALSE
```

### 5.2 Khử trùng “đã thông báo”

Trước khi gửi: đọc `status`, `notified_at` từ PostgreSQL (query qua node Postgres hoặc HTTP API); nếu `status == 'notified'` hoặc `notified_at IS NOT NULL` thì bỏ qua toàn bộ (tránh WF3 chạy trùng).

### 5.3 Leo thang theo vi phạm SLA

```python
def apply_sla_escalation(payload: dict) -> dict:
    severity = payload["severity"]
    overdue = payload["overdue_hours"]
    if severity == "HIGH" and overdue > 72:
        payload["severity"] = "CRITICAL"
        payload["escalate_to_manager"] = True
        payload["sla_escalation_applied"] = True
    if severity == "MEDIUM" and overdue > 48:
        payload["severity"] = "HIGH"
        payload["sla_escalation_applied"] = True
    return payload
```

### 5.4 Định dạng tin Telegram

*(Xem `build_ops_message` / `build_manager_escalation_message` trong PRD gốc — emoji, markdown Telegram.)*

### 5.5 Hợp đồng đầu ra thông báo

`POST /notify` trả: `success`, `exception_id`, `channels_sent`, `telegram_message_id`, `email_sent_to`, `is_escalated`, `skipped_reason` (ví dụ `already_notified`).

---

## PHẦN 6 — HỢP ĐỒNG API ĐẦY ĐỦ

| Dịch vụ | Phương thức & đường dẫn | Timeout | Ghi chú |
|--------|-------------------------|---------|--------|
| Detector | `POST http://detector:8001/detect` | 5000ms | Body: `{ "shipment": { ... } }` |
| Classifier | `POST http://classifier:8002/classify` | 10000ms | Body: `exception_data` + `history_context` |
| Notifier | `POST http://notifier:8003/notify` | 8000ms | Payload đầy đủ sau WF2 |
| Notifier | `POST http://notifier:8003/escalate` | 5000ms | Leo thang quản lý |
| Mock data | `GET http://mock-data:8004/shipments?count=&exception_ratio=` | — | Sinh dữ liệu thử |

**PostgreSQL (n8n):** Thay các lệnh `POST/PATCH/GET` REST Supabase bằng:

- **Node Postgres** trong n8n: câu lệnh SQL tham số hóa (ví dụ `INSERT INTO exceptions (...) VALUES (...)`; `UPDATE exceptions SET ... WHERE id = $1`; `SELECT ... WHERE shipment_id = $1 ORDER BY created_at DESC LIMIT 5`), **hoặc**
- **HTTP** tới dịch vụ FastAPI nội bộ (ví dụ `http://db-gateway:8005/...`) nếu nhóm muốn gom CRUD vào một repo.

Ví dụ JSON cho **detector / classifier / notifier** (HTTP): vẫn tham chiếu **Section 6** file `PRD-v2-AI-Optimized-Shipment-Exception.md`.

---

## PHẦN 7 — ĐẶC TẢ WORKFLOW n8n

### 7.1 WF1 — Thu thập & phát hiện

**Trigger:** Schedule, cron `*/5 * * * *`
**Chủ sở hữu:** Người 1 (có thể gán trong nhóm)
**Mục đích:** Lấy lô → phát hiện → lưu PostgreSQL → gọi WF2

| Bước | Loại node | Nội dung chính |
|------|-----------|----------------|
| 1 | Schedule Trigger | Mỗi 5 phút |
| 2 | HTTP Request | `GET mock-data:8004/shipments?count=30&exception_ratio=0.4` |
| 3 | Code (JS) | Lọc bản ghi thiếu trường bắt buộc |
| 4 | IF | Có phần tử thì tiếp tục |
| 5 | Split In Batches | `batchSize = 1` |
| 6–7 | HTTP + IF | Kiểm tra Redis dedup — **Redis không phải HTTP**: cần node Redis, Exec, hoặc dịch vụ wrapper REST (xem Phụ lục đánh giá) |
| 8 | HTTP Request | `POST detector:8001/detect` |
| 9 | IF | `is_exception && !skipped` |
| 10 | HTTP | Ghi Redis TTL 3600s |
| 11 | Set | Gắn metadata (detected_at, carrier, …) |
| 12 | Postgres (hoặc HTTP API) | `INSERT` bảng `exceptions` (trả về `id` nếu dùng `RETURNING id`) |
| 13 | HTTP | `POST n8n:5678/webhook/wf2-classify` |
| ERR | Error Trigger | Log lỗi, không chặn vòng lặp |

### 7.2 WF2 — Phân tích AI

**Trigger:** Webhook `wf2-classify`
**Mục đích:** Lấy lịch sử + shipment → `POST classifier/classify` → cập nhật DB → gọi WF3

Luồng: Webhook → SELECT lịch sử `exceptions` + `shipments` → Merge → Code build payload → POST classify → IF hợp lệ / fallback → Switch theo severity → `UPDATE exceptions` (Postgres) → POST `wf3-notify`.
**Lưu ý:** Classifier Python đã có fallback; các node IF/Code trong WF2 là lớp phòng thủ thêm.

### 7.3 WF3 — Thông báo

**Trigger:** Webhook `wf3-notify`
Luồng: Code tính SLA + `apply_sla_escalation` → GET trạng thái → IF đã notified → POST `/notify` → IF success → (tùy chọn) POST `/escalate` → PATCH exceptions → POST audit_logs → Respond.
**Lỗi nhánh:** Dòng ERR ghi `audit_logs` action `error` — trong PRD gốc có câu “don’t leave WF2 hanging” nên có thể là lỗi đánh máy (nên là WF3).

---

## PHẦN 8 — ĐẶC TẢ GIAO DIỆN (FRONTEND)

### 8.1 Danh sách ngoại lệ (`/dashboard`)

**Nguồn dữ liệu:** Truy vấn PostgreSQL **chỉ trên server** (cùng câu SQL JOIN như PRD gốc), ví dụ qua Prisma/Drizzle/`pg` trong Route Handler hoặc Server Component.

**Cập nhật gần thời gian thực:** Dùng **polling** (ví dụ `refetchInterval: 5000` với TanStack Query) hoặc nút “Làm mới”; có thể hiển thị toast khi số lượng bản ghi hoặc `detected_at` đổi so với lần fetch trước (so sánh phía client). **Không** dùng Supabase Realtime.

**Lọc:** Client-side theo severity, exception_type, carrier; tìm tracking_number phía server.

### 8.2 Chi tiết ngoại lệ (`/dashboard/exception/[id]`)

**Hành động:** Đổi trạng thái, ghi chú xử lý, leo thang thủ công — đều ghi `audit_logs` qua transaction hoặc hai lệnh SQL tuần tự (chi tiết luồng như bản gốc).

### 8.3 Phân tích quản lý (`/analytics`)

**Nguồn:** Truy vấn theo `dateRange` (mặc định 7 ngày), gồm function SQL `avg_response_time_minutes`, `exceptions_by_hour` (định nghĩa trong Postgres bằng `CREATE FUNCTION ...`) — **bổ sung trong migration**.

---

## PHẦN 9 — MÔI TRƯỜNG & DOCKER

### 9.1 Biến `.env` (danh mục)

```env
# PostgreSQL (Docker — ví dụ service tên "postgres")
POSTGRES_USER=app
POSTGRES_PASSWORD=changeme
POSTGRES_DB=shipment
# Chuỗi kết nối cho Next.js / (tuỳ chọn) service Python
DATABASE_URL=postgresql://app:changeme@postgres:5432/shipment

# AI
CLAUDE_API_KEY=sk-ant-api03-...

# Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_OPS_CHAT_ID=
TELEGRAM_MANAGER_CHAT_ID=

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
EMAIL_OPS_RECIPIENT=
EMAIL_MANAGER_RECIPIENT=

# Redis
REDIS_URL=redis://redis:6379

# App (Next.js — không cần khóa “anon” kiểu Supabase; chỉ URL app công khai)
NEXT_PUBLIC_APP_URL=http://localhost:3000
N8N_WEBHOOK_URL=http://n8n:5678
```

**n8n Credentials:** Tạo credential kiểu Postgres trong UI n8n trỏ tới `postgres:5432` với cùng user/password/db (mạng Docker nội bộ).

### 9.2 Bản đồ gọi dịch vụ (tóm tắt)

- WF1 → mock-data, Redis (wrapper), detector, **PostgreSQL INSERT `exceptions`**, webhook WF2
- WF2 → **PostgreSQL SELECT/UPDATE**, classifier, webhook WF3
- WF3 → **PostgreSQL SELECT/UPDATE**, notifier `/notify` và `/escalate`, **INSERT `audit_logs`**
- Client → **Next.js server** đọc/ghi Postgres qua API (không mở DB ra internet); route `/api/*` cho leo thang thủ công tới notifier

Chi tiết endpoint HTTP (detector/classifier/notifier): Section 6 bản tiếng Anh.

---

## PHẦN 10 — PHÂN CÔNG TEAM 3 NGƯỜI (KẾ HOẠCH 3 NGÀY)

> Mục tiêu: Chạy demo end-to-end trong 3 ngày, ưu tiên luồng chính trước, analytics nâng cao sau.

### 10.1 Nguyên tắc chia việc

- Mỗi người **sở hữu 1 workflow n8n** (WF1/WF2/WF3) và phần code backend/frontend liên quan trực tiếp tới workflow đó.
- Tất cả cùng dùng chung schema PostgreSQL, quy ước payload JSON, naming field theo PRD để tránh lệch interface.
- Chốt API contract trước khi code: `detect`, `classify`, `notify`, `escalate`, cùng shape payload webhook nội bộ.

### 10.2 Phân công chi tiết

| Thành viên | Workflow n8n chính | Phần code chính phụ trách | Deliverables bắt buộc |
|------------|--------------------|---------------------------|-----------------------|
| **Member A (Data & Detection Owner)** | **WF1 — Ingestion & Detection** | `mock-data` service + `detector` service + Redis dedup + SQL `INSERT exceptions` | WF1 chạy cron ổn định, tạo exception đúng rule, không tạo trùng trong TTL, gọi được webhook WF2 |
| **Member B (AI & Classification Owner)** | **WF2 — AI Analysis** | `classifier` service (Claude + fallback) + SQL lấy history shipment + SQL `UPDATE exceptions` | WF2 nhận payload từ WF1, phân loại thành công hoặc fallback, cập nhật `severity/ai_suggestion/confidence`, gọi được WF3 |
| **Member C (Action & UI Owner)** | **WF3 — Notification & Dashboard** | `notifier` service (`/notify`, `/escalate`) + Next.js UI (`/dashboard`, `/dashboard/exception/[id]`) + SQL `audit_logs` | WF3 gửi cảnh báo theo ma trận, chống gửi trùng, UI xem và cập nhật trạng thái/ghi chú, audit log đầy đủ |

### 10.3 Trách nhiệm chéo (bắt buộc)

- **Member A + B:** thống nhất payload WF1 → WF2 (`exception_type`, `reason`, `severity_hint`, `overdue_hours`, metadata shipment).
- **Member B + C:** thống nhất payload WF2 → WF3 (thêm `severity`, `ai_suggestion`, `fallback_used`, `confidence`, `escalate_to_manager`).
- **Member A + C:** thống nhất migration SQL + seed/mock data + index để dashboard query ổn.

### 10.4 Kế hoạch triển khai 3 ngày

> **Chế độ thực thi: Single Developer tuần tự**
> Bạn làm một mình nên triển khai theo thứ tự cứng: **Member A scope xong hoàn toàn → Member B scope → Member C scope**.
> Không mở task song song giữa các member giả lập.

#### 10.4.1 Lộ trình tuần tự 3 ngày (A → B → C)

| Stage | Khung giờ gợi ý | Scope giả lập | Mục tiêu | Gate/Output |
|------|------------------|---------------|----------|-------------|
| **S1** | Ngày 1 · 08:30–10:00 | Handoff Prep | Chốt contract và môi trường trước khi vào Member A | `contracts/payload-v1.md`, stack Docker chạy ổn |
| **S2** | Ngày 1 · 10:00–18:00 | **Member A (WF1)** | Hoàn tất ingestion + detection + insert exception + trigger WF2 | WF1 chạy cron, tạo exceptions đúng rule + dedup |
| **S3** | Ngày 2 · 08:30–14:00 | **Member B (WF2)** | Hoàn tất classify + fallback + update DB + trigger WF3 | WF2 luôn trả output hợp lệ, update DB thành công |
| **S4** | Ngày 2 · 14:00–18:00 & Ngày 3 · 08:30–12:00 | **Member C (WF3 + UI)** | Hoàn tất notify/escalate/audit + UI list/detail thao tác được | 1 case đi full detect→classify→notify và UI thao tác status/note |
| **S5** | Ngày 3 · 13:30–18:00 | Integration + Demo | Chạy edge cases, polish data/UI, rehearsal + bàn giao | Pass checklist tích hợp + script demo 5-7 phút |

#### 10.4.2 Task nhỏ theo stage (thực thi tuần tự, không song song)

**S1 — Handoff Prep (Ngày 1 · 08:30–10:00)**
- [ ] Tạo file `contracts/payload-v1.md` chứa đầy đủ WF1→WF2, WF2→WF3.
- [ ] Chốt timezone (UTC/ISO 8601), kiểu dữ liệu, danh sách mã lỗi chuẩn.
- [ ] Dựng và xác nhận `postgres`, `redis`, `n8n` lên thành công.
- [ ] Gate: Không đổi contract sau mốc này.

**S2 — Member A scope (Ngày 1 · 10:00–18:00)**
- [ ] Tạo migration SQL bảng `shipments`, `exceptions`, `audit_logs` + index cần thiết.
- [ ] Build `mock-data` và `detector` service (rule ưu tiên đúng thứ tự).
- [ ] Tạo WF1: cron → validate shipments → dedup Redis → gọi detector.
- [ ] Insert `exceptions` vào Postgres và trigger webhook WF2.
- [ ] Test 3 case: có exception / không exception / dedup skip.
- [ ] Gate S2: WF1 tự chạy tạo row mới trong `exceptions`, không crash batch.

**S3 — Member B scope (Ngày 2 · 08:30–14:00)**
- [ ] Build `classifier` service: `/classify` + Claude call.
- [ ] Validate JSON output theo contract, chặn sai schema.
- [ ] Implement fallback khi timeout/invalid JSON/API lỗi.
- [ ] Query lịch sử `exceptions` theo `shipment_id` (limit 5) làm context.
- [ ] Update `exceptions`: `severity`, `ai_suggestion`, `confidence`, `fallback_used`, `classified_at`.
- [ ] Trigger WF3 với payload đã enrich.
- [ ] Gate S3: Một exception bất kỳ được classify và update DB thành công cả AI success lẫn fallback.

**S4 — Member C scope (Ngày 2 · 14:00–18:00 + Ngày 3 · 08:30–12:00)**
- [ ] Build `notifier` service: `/notify`, `/escalate`.
- [ ] Tạo WF3: check `already_notified` trước khi gửi.
- [ ] Áp SLA escalation trước khi routing channel.
- [ ] Gửi Telegram/email theo severity; fallback email-only khi Telegram lỗi.
- [ ] Update `exceptions`: `status`, `notified_at`, `channels_sent`, `is_escalated`.
- [ ] Insert `audit_logs` cho `notified`, `escalated`, `error`.
- [ ] Hoàn thiện UI `/dashboard`, `/dashboard/exception/:id`, polling/refetch.
- [ ] Thêm thao tác UI: update status, save `resolution_note`, manual escalate.
- [ ] Gate S4: 1 case chạy full WF1→WF2→WF3; thao tác UI ghi DB + audit đúng.

**S5 — Integration + Demo (Ngày 3 · 13:30–18:00)**
- [ ] Edge case: detector down, classifier timeout/invalid JSON, WF3 duplicate trigger.
- [ ] Edge case: notifier Telegram fail → email fallback.
- [ ] Chuẩn hóa dataset demo 10-12 records đủ 4 severity.
- [ ] Rehearsal 2 lượt liên tiếp, ghi và xử lý blocker.
- [ ] Chốt slide, script demo 5-7 phút, README chạy nhanh.
- [ ] Gate S5: Pass checklist tích hợp + demo mượt không fix nóng.

**S6 — Hardening Web App (Auth + RBAC + Real Data)**
- [ ] Bổ sung xác thực đăng nhập (`/auth/login`) và endpoint `/me` trả `role`.
- [ ] Phân quyền 2 vai trò `ops` và `employee` ở cả frontend route guard và backend middleware.
- [ ] Chuẩn hóa route theo vai trò: `/ops/*` và `/employee/*` (không truy cập chéo quyền).
- [ ] Chuyển web sang dùng API thật 100% cho list/detail/update/escalate; chỉ giữ mock cho chế độ dev có cờ cấu hình riêng.
- [ ] Bổ sung API role-aware: `GET /exceptions`, `GET /exceptions/:id`, `PATCH /exceptions/:id`, `POST /exceptions/:id/escalate`.
- [ ] Ghi `audit_logs` đầy đủ theo actor (`ops_user`, `employee_user`, `system`) cho mọi thao tác từ web.
- [ ] UAT theo vai trò: employee bị chặn thao tác nhạy cảm (escalate/update ngoài phạm vi), ops thao tác đầy đủ.
- [ ] Gate S6: Không còn phụ thuộc mock trong luồng chính, pass test RBAC, và web ghi DB + audit đúng theo quyền.

**S7 — Ops Workflow nâng cao (Ownership + SLA + Queue)**
- [ ] Bổ sung ownership cho `exceptions`: `assignee`, `assigned_at`, `assigned_team` (hoặc bảng assignment riêng nếu muốn mở rộng lịch sử phân công).
- [ ] Thêm thao tác UI/API cho nhân viên: `Nhận xử lý`, `Chuyển người xử lý`, `Yêu cầu quản lý hỗ trợ` (thay wording "leo thang quản lý").
- [ ] Chuẩn hóa trạng thái nghiệp vụ 2 tầng: `open` → `in_progress` → `waiting_manager_review` → (`resolved` hoặc `returned_to_ops`).
- [ ] Bổ sung SLA policy theo severity (`deadline_at`, `sla_breached`) và job kiểm tra định kỳ để đánh dấu quá hạn.
- [ ] Ưu tiên danh sách theo SLA/time: sort `deadline_at`/`detected_at` thay vì chỉ severity; thêm badge "Sắp quá hạn"/"Quá hạn".
- [ ] Thêm bộ lọc vận hành: `Tôi phụ trách`, `Chưa nhận`, `Chờ quản lý`, `Quá SLA`.
- [ ] Bổ sung bulk actions: nhận xử lý hàng loạt, đổi trạng thái hàng loạt, gửi yêu cầu quản lý hàng loạt.
- [ ] Mọi action ghi `audit_logs` chi tiết old/new value + actor.
- [ ] Gate S7: Nhân viên có thể nhận case, cập nhật tiến độ, gửi yêu cầu quản lý; dashboard hiển thị hàng đợi đúng ownership + SLA.

**S8 — Manager Review Flow + Analytics vận hành**
- [ ] Tạo màn `Manager Queue`: tab `Chờ duyệt`, `Đã trả lại`, `Đã chốt`, ưu tiên case `CRITICAL` và case quá SLA.
- [ ] Bổ sung action quản lý: `Tiếp nhận duyệt`, `Trả lại cho vận hành`, `Phê duyệt đóng case` (ghi lý do bắt buộc).
- [ ] Bổ sung API manager-only cho review flow và phân quyền RBAC tương ứng.
- [ ] Hoàn thiện timeline/audit trong trang chi tiết: hiển thị đầy đủ sự kiện phân công, yêu cầu quản lý hỗ trợ, duyệt/trả lại/chốt.
- [ ] Bổ sung KPI thực chiến: MTTA, MTTR, tỷ lệ breach SLA, tỷ lệ case phải nhờ quản lý hỗ trợ, tồn đọng theo người phụ trách.
- [ ] Thêm cảnh báo chủ động: notify quản lý khi case `waiting_manager_review` quá N phút chưa tiếp nhận.
- [ ] Viết UAT e2e cho luồng 2 tầng: employee xử lý → yêu cầu quản lý hỗ trợ → manager duyệt/trả lại → close.
- [ ] Gate S8: Có luồng vận hành production-like 2 tầng đầy đủ (ownership + SLA + review + KPI), demo được bằng dữ liệu thật.

#### Mốc kiểm soát bắt buộc cuối mỗi ngày

- **EOD Ngày 1:** Hoàn tất S1 + S2 (Member A done), có `exceptions` tạo tự động.
- **EOD Ngày 2:** Hoàn tất S3 và tối thiểu 70% S4 (WF3 gửi được thông báo).
- **EOD Ngày 3:** Hoàn tất S4 + S5 + S6, pass checklist tích hợp, RBAC và demo.
- **Mốc mở rộng sau demo:** Hoàn tất S7 rồi S8 theo đúng thứ tự (không chạy song song) để nâng hệ thống lên mức production-like.

### 10.5 Definition of Done (DoD) theo từng người

- **Member A (WF1):**
  - Cron chạy đúng chu kỳ.
  - Rule detection đúng thứ tự ưu tiên.
  - Redis dedup hoạt động.
  - Ghi `exceptions` thành công và trigger WF2.
- **Member B (WF2):**
  - Classifier trả đúng output contract.
  - Fallback luôn hoạt động khi AI lỗi.
  - Cập nhật `severity`, `ai_suggestion`, `confidence`, `fallback_used`.
  - Trigger WF3 ổn định.
- **Member C (WF3 + UI):**
  - Routing thông báo đúng ma trận severity/SLA.
  - Chặn gửi trùng nếu đã `notified`.
  - Ghi `audit_logs` cho notified/escalated/error.
  - UI list/detail thao tác được status + note + manual escalate.

### 10.6 Checklist tích hợp cuối cùng (team)

- [ ] Chạy 1 lô `CRITICAL`: có telegram ops + manager + email, DB cập nhật `is_escalated=true`.
- [ ] Chạy 1 lô `HIGH <=48h`: telegram ops + email, không escalate.
- [ ] Claude timeout: fallback chạy, `fallback_used=true`.
- [ ] WF3 chạy lặp cùng `exception_id`: không gửi trùng, trả `already_notified`.
- [ ] UI phản ánh dữ liệu mới sau polling/refetch.

---

## PHẦN 11 — TRƯỜNG HỢP BIÊN & XỬ LÝ LỖI

> Cần triển khai đủ; có thể kiểm tra khi demo.

| Kịch bản | Hành vi mong đợi |
|----------|------------------|
| Dịch vụ `detector` down khi WF1 chạy | Error Trigger WF1 bắt lỗi, ghi log, bỏ qua lô đó, tiếp tục vòng lặp |
| `classifier` timeout (>12s) | WF2 Node 7 IF → fallback, `fallback_used=true` trong DB |
| Claude trả JSON không hợp lệ | `json.loads` ném lỗi → `classify_with_fallback` trả kết quả fallback |
| Cùng `exception_id` kích hoạt WF3 hai lần | Node 4 IF kiểm `notified_at`, trả `skipped_reason: "already_notified"` |
| Cùng `shipment_id` trong cửa sổ 1 giờ | Có key Redis → WF1 Node 7 bỏ qua, không tạo ngoại lệ trùng |
| INSERT PostgreSQL thất bại (ràng buộc/vi phạm duy nhất cho lô — nếu có) | Error Trigger WF1 ghi log, không gọi WF2 |
| Gửi Telegram từ `notifier` thất bại | `success: false` → WF3 Node 6 → Node 13 (chỉ email) |
| `expected_delivery` null hoặc sai định dạng | Detector bắt lỗi parse, `is_exception: false`, có log |
| Cả 30 lô đều không phải ngoại lệ | WF1 xử lý hết, không ai vào WF2 — bình thường |
| Merge WF2 nhận mảng lịch sử rỗng | `previous_exception_count = 0`, `last_exception_type = "none"` — không crash |

---

## PHỤ LỤC — ĐỐI CHIẾU VỚI BẢN TIẾNG ANH

- File đầy đủ mẫu JSON từng API (detector/classifier/notifier), diagram ASCII từng node, và khối TypeScript `types/database.ts`: **`PRD-v2-AI-Optimized-Shipment-Exception.md`**
- Phần **REST Supabase** trong bản Anh được thay ở bản Việt bằng **PostgreSQL + node Postgres / API**; logic nghiệp vụ và schema bảng **giữ nguyên**

---

## PHỤ LỤC — GỢI Ý CẢI THIỆN CHO ĐỀ TÀI / BÀI MÔN n8n

1. **Redis và HTTP:** `redis:6379` không phải REST. Thống nhất: dùng **node Redis** của n8n, **Command Line/Exec**, hoặc một **microservice** nhỏ `GET/SET` qua HTTP — cập nhật PRD cho khớp công cụ thật.
2. **Khử trùng WF1 vs Python:** Logic Python ghi cache sau mọi lần chạy rule; sơ đồ WF1 chỉ ghi Redis khi có ngoại lệ — **cần sửa một phía** để hành vi giống nhau.
3. **Leo thang kép:** Ma trận mục 5 + `/notify` + `/escalate` + Switch WF3 có thể **gửi trùng** Telegram cho quản lý — làm rõ: notifier gom hết trong `/notify` *hoặc* chỉ `/escalate` khi cần.
4. **RPC Analytics:** `avg_response_time_minutes`, `exceptions_by_hour` được gọi trong mục 8.3 nhưng **chưa có định nghĩa SQL** trong Section 2 — bổ sung migration/function.
5. **Model Claude:** Chuỗi `claude-haiku-4-5-20251001` cần **đối chiếu tài liệu Anthropic** tại thời điểm triển khai.
6. **Phạm vi môn n8n:** Có thể thêm mục **MVP chỉ n8n**: mock-data → detector (hoặc Code node gọi rule đơn giản) → **Postgres** → Telegram, để chứng minh luồng; phần Next.js + nhiều service Python là **mở rộng**.
7. **Bảo mật:** Ghi rõ **không** nhúng service role key vào frontend; credential chỉ trong n8n và backend.
8. **WF3 Error Trigger:** Sửa câu “don’t leave WF2 hanging” → **WF3** nếu chỉnh PRD gốc.
