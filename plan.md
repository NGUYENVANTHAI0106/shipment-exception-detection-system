---
name: Shipment Exception Detection System
overview: Xây dựng hệ thống tự động phát hiện shipment exception với FastAPI backend xử lý logic chính, n8n điều hướng workflow, Next.js frontend cho client và admin, triển khai bằng Docker Compose (nginx, postgres, redis, api, n8n). Deadline 3 ngày - phân công 3 người.
todos:
  # === DEV-A: Backend + Infrastructure ===
  - id: A-day1-infra-compose
    content: "[DEV-A] Ngày 1: Infra - docker-compose + network/volumes + profile dev (stack up được)"
    status: completed
  - id: A-day1-infra-nginx
    content: "[DEV-A] Ngày 1: Infra - nginx routes (/api, /n8n, /, /admin) + basic healthcheck"
    status: completed
  - id: A-day1-infra-env
    content: "[DEV-A] Ngày 1: Infra - `.env.example` + env validation + seed toggle + runbook ngắn"
    status: completed
  - id: A-day1-db-schema
    content: "[DEV-A] Ngày 1: DB - models + enums chuẩn hoá + Alembic migration v1"
    status: pending
  - id: A-day1-auth-core
    content: "[DEV-A] Ngày 1: Auth - JWT login/register/me + role guard (client/admin)"
    status: pending
  - id: A-day1-api-shipments
    content: "[DEV-A] Ngày 1: API - shipments CRUD + list filters/pagination + ingest endpoint skeleton"
    status: pending
  - id: A-day1-api-exceptions
    content: "[DEV-A] Ngày 1: API - exceptions CRUD + status transitions + list filters/pagination"
    status: pending
  - id: A-day1-api-rules
    content: "[DEV-A] Ngày 1: API - rules CRUD (basic) + active toggle"
    status: pending
  - id: A-day1-detection-v1
    content: "[DEV-A] Ngày 1: Detection v1 - core types + dedupe + severity mapping (đủ demo)"
    status: pending
  - id: A-day1-seed-smoke
    content: "[DEV-A] Ngày 1: Seed data + Swagger smoke test + 1 luồng demo ingest→detect→list"
    status: pending
  - id: A-day2-csv
    content: "[DEV-A] Ngày 2: CSV - upload/parse/validate + import summary + run detection sau import"
    status: pending
  - id: A-day2-analytics
    content: "[DEV-A] Ngày 2: Analytics - 6 endpoints trends/carriers/types/severity/sla/resolution-time"
    status: pending
  - id: A-day2-export
    content: "[DEV-A] Ngày 2: Export - shipments/exceptions CSV download với filters"
    status: pending
  - id: A-day2-sse-batch
    content: "[DEV-A] Ngày 2: Realtime/Batch - SSE events + run-batch + test-rule"
    status: pending
  - id: A-day2-n8n-setup
    content: "[DEV-A] Ngày 2: n8n - setup credentials/env + base URLs + folder `n8n/workflows` + import guide"
    status: pending
  - id: A-day2-n8n-ingest
    content: "[DEV-A] Ngày 2: n8n - workflow ingest (validate/normalize/idempotency) + error handling"
    status: pending
  - id: A-day2-n8n-schedulers
    content: "[DEV-A] Ngày 2: n8n - scheduled workflows (stale check + SLA breach scan + escalation)"
    status: pending
  - id: A-day2-n8n-notify
    content: "[DEV-A] Ngày 2: n8n - notification router (Slack/email) + preference-based routing"
    status: pending
  - id: A-day2-n8n-dlq
    content: "[DEV-A] Ngày 2: n8n - DLQ/retry processor + audit logging workflow (observability)"
    status: pending
  - id: A-day2-n8n-demo
    content: "[DEV-A] Ngày 2: n8n - demo scenarios + sample payloads (webhook/csv) để nghiệm thu"
    status: pending
  - id: A-day2-integration
    content: "[DEV-A] Ngày 2: Hỗ trợ frontend integration, fix API bugs, CORS, response format"
    status: pending
  - id: A-day3-detection-full
    content: "[DEV-A] Ngày 3: Detection engine hoàn thiện - batch runner, rule test, risk scoring, custom rules"
    status: pending
  - id: A-day3-polish
    content: "[DEV-A] Ngày 3: Docker production build, nginx final, backup commands, README, demo script"
    status: pending

  # === DEV-B: Frontend Client Portal + Shared Foundation ===
  - id: B-day1-setup
    content: "[DEV-B] Ngày 1: Next.js project setup, Tailwind + shadcn/ui, design tokens, theme dark/light"
    status: pending
  - id: B-day1-shared
    content: "[DEV-B] Ngày 1: Shared components - DataTable, StatusBadge, SeverityBadge, StatCard, FilterBar, EmptyState, skeletons"
    status: pending
  - id: B-day1-layout
    content: "[DEV-B] Ngày 1: Client layout shell - sidebar, header, breadcrumb, mobile responsive nav"
    status: pending
  - id: B-day1-auth-ui
    content: "[DEV-B] Ngày 1: Auth pages - Login, Register, Forgot Password UI, API client với JWT"
    status: pending
  - id: B-day2-client-dashboard
    content: "[DEV-B] Ngày 2: Client Dashboard - KPI cards, sparklines, recent exceptions, quick tracking search"
    status: pending
  - id: B-day2-shipments
    content: "[DEV-B] Ngày 2: Shipments List + Detail - advanced table, filters, timeline, exception cards"
    status: pending
  - id: B-day2-exceptions
    content: "[DEV-B] Ngày 2: Client Exceptions - list/filter, detail slide-over, status update"
    status: pending
  - id: B-day2-upload
    content: "[DEV-B] Ngày 2: Upload Center - stepper wizard, drag-drop, preview, validation, import results"
    status: pending
  - id: B-day3-profile
    content: "[DEV-B] Ngày 3: Profile/Settings, Notification Center, Command Palette (Cmd+K)"
    status: pending
  - id: B-day3-polish
    content: "[DEV-B] Ngày 3: Responsive polish, animations, error boundaries, loading states, accessibility"
    status: pending

  # === DEV-C: Frontend Admin Dashboard ===
  - id: C-day1-admin-layout
    content: "[DEV-C] Ngày 1: Admin layout shell - collapsible sidebar, header, breadcrumb, admin auth guard"
    status: pending
  - id: C-day1-admin-components
    content: "[DEV-C] Ngày 1: Admin-specific components - ChartCard, MetricCard, ActivityFeed, DateRangePicker"
    status: pending
  - id: C-day2-dashboard
    content: "[DEV-C] Ngày 2: Admin Dashboard - KPI cards, 4 charts (trend/type/severity/carrier), recent exceptions table"
    status: pending
  - id: C-day2-shipment-mgmt
    content: "[DEV-C] Ngày 2: Admin Shipments - master table, create/edit dialog, bulk actions, run detection"
    status: pending
  - id: C-day2-exception-queue
    content: "[DEV-C] Ngày 2: Exception Queue - priority sorting, assign, resolve, dismiss, bulk actions, SLA timer"
    status: pending
  - id: C-day2-rules
    content: "[DEV-C] Ngày 2: Rule Builder - visual condition form, CRUD, toggle active, test rule sandbox"
    status: pending
  - id: C-day3-analytics
    content: "[DEV-C] Ngày 3: Analytics - interactive charts, date range, carrier comparison, export CSV/PDF"
    status: pending
  - id: C-day3-users-settings
    content: "[DEV-C] Ngày 3: User Management + Settings + Audit Log + Notification Log pages"
    status: pending
  - id: C-day3-polish
    content: "[DEV-C] Ngày 3: Admin responsive polish, chart interactions, dark mode verify, E2E flow test"
    status: pending
isProject: false
---

# Shipment Exception Detection Automation System

## Quy ước chia task/commit (để commit không quá dài)

- **Mỗi task trong TODO = 1 “slice” dọc** (API + migration + test smoke tối thiểu) và **1–3 commits** là đủ.
- **Kích thước commit khuyến nghị**:
  - **Commit 1 (scaffold)**: tạo route/service/model/schema, stub chạy được.
  - **Commit 2 (complete)**: hoàn thiện logic + validate + error handling + docs (Swagger).
  - **Commit 3 (polish, tuỳ chọn)**: seed/demo data, tối ưu query nhỏ, thêm ví dụ payload.
- **Không trộn nhiều trục trong 1 commit** (ví dụ: đừng vừa sửa docker/nginx vừa làm detection engine).
- **Đặt message theo “why” + phạm vi nhỏ** (vd: `api: add shipments ingest with idempotency`).

## Phân công nhân sự

```
DEV-A  ──  Backend + Infrastructure (FastAPI, DB, Docker, n8n)
DEV-B  ──  Frontend Client Portal + Shared Foundation (Next.js, design system, client pages)
DEV-C  ──  Frontend Admin Dashboard (admin pages, charts, analytics)
```

**Nguyên tắc phối hợp:**
- DEV-A cung cấp API contract (Swagger docs) sớm nhất có thể để DEV-B và DEV-C mock data song song
- DEV-B xây shared components và design system, DEV-C sử dụng lại
- DEV-B tạo API client library (`lib/api-client.ts`), DEV-C dùng chung
- Cuối mỗi ngày: integration check - frontend gọi API thật, fix bugs cùng nhau

---

## 1. Tổng quan kiến trúc

```mermaid
graph TB
    subgraph docker [Docker Compose Stack]
        nginx[Nginx Reverse Proxy :80]
        subgraph frontend_apps [Frontend - Next.js :3000]
            client[Client Portal /]
            admin[Admin Dashboard /admin]
        end
        api[FastAPI Backend :8000]
        n8n_svc[n8n Orchestrator :5678]
        pg[PostgreSQL :5432]
        redis_svc[Redis :6379]
    end

    user[Client User] --> nginx
    admin_user[Admin User] --> nginx
    carrier[Carrier APIs / Webhooks] --> nginx

    nginx --> frontend_apps
    nginx --> api
    nginx --> n8n_svc

    api --> pg
    api --> redis_svc
    n8n_svc --> api
    api --> n8n_svc
```

## 2. Luồng dữ liệu chính

```mermaid
sequenceDiagram
    participant Source as Nguồn dữ liệu
    participant N8N as n8n Orchestrator
    participant API as FastAPI Backend
    participant DB as PostgreSQL
    participant Cache as Redis
    participant FE as Frontend

    Source->>N8N: Webhook / Scheduled poll
    N8N->>API: POST /api/shipments/ingest
    API->>DB: Lưu shipment data
    API->>API: Chạy detection engine
    API->>DB: Tạo exception record
    API->>Cache: Cache alert + push SSE event
    API->>N8N: Trigger notification workflow
    N8N->>Source: Gửi email / Slack / SMS
    FE->>API: GET /api/exceptions (polling / SSE)
    API->>FE: Trả về danh sách exceptions
```

---

## 3. Cấu trúc thư mục

```
project-root/
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
├── README.md
├── docs/
│   ├── daily-log.md
│   ├── api-contract.md
│   └── demo-script.md
│
├── nginx/
│   ├── nginx.conf
│   └── nginx.prod.conf
│
├── backend/                              # [DEV-A phụ trách]
│   ├── Dockerfile
│   ├── Dockerfile.prod
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── alembic/
│   │   └── versions/
│   └── app/
│       ├── main.py                       # FastAPI app entry, CORS, lifespan
│       ├── config.py                     # Pydantic Settings, env vars
│       ├── database.py                   # SQLAlchemy async engine + session
│       ├── dependencies.py               # Dependency injection (get_db, get_current_user)
│       ├── models/
│       │   ├── __init__.py
│       │   ├── user.py
│       │   ├── shipment.py
│       │   ├── shipment_event.py
│       │   ├── exception.py
│       │   ├── detection_rule.py
│       │   ├── notification.py
│       │   └── audit_log.py
│       ├── schemas/
│       │   ├── auth.py
│       │   ├── user.py
│       │   ├── shipment.py
│       │   ├── exception.py
│       │   ├── rule.py
│       │   ├── notification.py
│       │   ├── analytics.py
│       │   └── common.py                 # PaginatedResponse, ErrorResponse
│       ├── api/
│       │   ├── auth.py
│       │   ├── shipments.py
│       │   ├── exceptions.py
│       │   ├── rules.py
│       │   ├── upload.py
│       │   ├── admin.py
│       │   ├── analytics.py
│       │   ├── events.py                 # SSE endpoint
│       │   └── health.py
│       ├── services/
│       │   ├── auth_service.py
│       │   ├── shipment_service.py
│       │   ├── exception_service.py
│       │   ├── detection_engine.py       # Core exception detection
│       │   ├── rule_evaluator.py         # Custom rule engine
│       │   ├── notification_service.py
│       │   ├── analytics_service.py
│       │   └── csv_import_service.py
│       ├── utils/
│       │   ├── csv_parser.py
│       │   ├── carrier_client.py
│       │   ├── redis_client.py
│       │   └── security.py               # JWT encode/decode, password hash
│       └── seed/
│           ├── seed_data.py
│           └── sample_data.json
│
├── frontend/                             # [DEV-B + DEV-C phụ trách]
│   ├── Dockerfile
│   ├── Dockerfile.prod
│   ├── package.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── postcss.config.js
│   │
│   ├── public/
│   │   ├── logo.svg
│   │   ├── favicon.ico
│   │   └── images/
│   │
│   ├── styles/
│   │   └── globals.css                   # Tailwind base + CSS custom properties cho theme
│   │
│   ├── lib/                              # [DEV-B tạo, DEV-C dùng chung]
│   │   ├── api-client.ts                 # Axios/fetch wrapper, JWT attach, error handling
│   │   ├── auth.ts                       # Auth context, token management
│   │   ├── utils.ts                      # Formatters, helpers
│   │   ├── constants.ts                  # Status maps, severity colors, routes
│   │   └── validators.ts                 # Zod schemas cho forms
│   │
│   ├── types/                            # [DEV-B tạo, DEV-C dùng chung]
│   │   ├── shipment.ts
│   │   ├── exception.ts
│   │   ├── rule.ts
│   │   ├── user.ts
│   │   ├── analytics.ts
│   │   └── api.ts                        # PaginatedResponse<T>, ApiError
│   │
│   ├── hooks/                            # [DEV-B tạo, DEV-C dùng chung]
│   │   ├── use-auth.ts
│   │   ├── use-shipments.ts
│   │   ├── use-exceptions.ts
│   │   ├── use-rules.ts
│   │   ├── use-analytics.ts
│   │   ├── use-debounce.ts
│   │   ├── use-media-query.ts
│   │   └── use-sse.ts                    # Server-Sent Events hook
│   │
│   ├── stores/                           # Zustand stores
│   │   ├── auth-store.ts
│   │   ├── notification-store.ts
│   │   └── preference-store.ts           # Theme, sidebar state, table density
│   │
│   ├── components/
│   │   ├── ui/                           # shadcn/ui base (Button, Input, Dialog, Sheet, etc.)
│   │   │
│   │   ├── shared/                       # [DEV-B tạo, DEV-C dùng chung]
│   │   │   ├── data-table.tsx            # Generic DataTable: sort, filter, pagination, selection, column toggle
│   │   │   ├── data-table-toolbar.tsx    # Search + filter chips + view toggle
│   │   │   ├── data-table-pagination.tsx
│   │   │   ├── stat-card.tsx             # KPI card với sparkline
│   │   │   ├── status-badge.tsx          # Shipment status badge
│   │   │   ├── severity-badge.tsx        # Exception severity badge
│   │   │   ├── exception-type-icon.tsx   # Icon theo exception type
│   │   │   ├── filter-bar.tsx            # Collapsible filter panel
│   │   │   ├── date-range-picker.tsx     # Date range selector
│   │   │   ├── empty-state.tsx           # Illustrated empty state với CTA
│   │   │   ├── error-state.tsx           # Error display với retry
│   │   │   ├── loading-skeleton.tsx      # Skeleton variants cho table/card/chart
│   │   │   ├── confirm-dialog.tsx        # Destructive action confirmation
│   │   │   ├── page-header.tsx           # Page title + breadcrumb + actions
│   │   │   ├── search-input.tsx          # Debounced search input
│   │   │   ├── file-dropzone.tsx         # Drag & drop file upload
│   │   │   ├── timeline.tsx              # Vertical timeline component
│   │   │   ├── command-menu.tsx          # Cmd+K global search
│   │   │   └── theme-toggle.tsx          # Dark/light mode switch
│   │   │
│   │   ├── layout/                       # [DEV-B tạo client layout, DEV-C tạo admin layout]
│   │   │   ├── client-sidebar.tsx
│   │   │   ├── client-header.tsx
│   │   │   ├── client-layout.tsx
│   │   │   ├── admin-sidebar.tsx
│   │   │   ├── admin-header.tsx
│   │   │   ├── admin-layout.tsx
│   │   │   ├── breadcrumb.tsx
│   │   │   ├── mobile-nav.tsx
│   │   │   └── notification-bell.tsx
│   │   │
│   │   └── charts/                       # [DEV-C tạo]
│   │       ├── trend-chart.tsx           # Line chart - exceptions over time
│   │       ├── type-distribution.tsx     # Donut chart - exception types
│   │       ├── severity-chart.tsx        # Bar chart - severity distribution
│   │       ├── carrier-ranking.tsx       # Horizontal bar - carrier issues
│   │       ├── resolution-time.tsx       # Average resolution time chart
│   │       └── chart-wrapper.tsx         # Responsive wrapper cho Recharts
│   │
│   └── app/
│       ├── layout.tsx                    # Root layout: providers, fonts, metadata
│       ├── not-found.tsx
│       ├── error.tsx                     # Global error boundary
│       ├── loading.tsx
│       │
│       ├── (auth)/                       # [DEV-B phụ trách]
│       │   ├── login/page.tsx
│       │   ├── register/page.tsx
│       │   └── forgot-password/page.tsx
│       │
│       ├── (client)/                     # [DEV-B phụ trách]
│       │   ├── layout.tsx                # Client layout wrapper + auth guard
│       │   ├── page.tsx                  # Client Dashboard
│       │   ├── shipments/
│       │   │   ├── page.tsx              # Danh sách shipments
│       │   │   └── [id]/page.tsx         # Chi tiết shipment
│       │   ├── exceptions/
│       │   │   └── page.tsx              # Danh sách exceptions của user
│       │   ├── upload/
│       │   │   └── page.tsx              # Upload Center
│       │   ├── notifications/
│       │   │   └── page.tsx              # Notification Center
│       │   └── profile/
│       │       └── page.tsx              # Hồ sơ + cài đặt
│       │
│       └── (admin)/                      # [DEV-C phụ trách]
│           └── admin/
│               ├── layout.tsx            # Admin layout wrapper + role guard
│               ├── page.tsx              # Admin Dashboard
│               ├── shipments/
│               │   ├── page.tsx          # Quản lý shipments
│               │   └── [id]/page.tsx     # Chi tiết admin shipment
│               ├── exceptions/
│               │   ├── page.tsx          # Exception queue
│               │   └── [id]/page.tsx     # Chi tiết exception
│               ├── rules/
│               │   └── page.tsx          # Quản lý detection rules
│               ├── analytics/
│               │   └── page.tsx          # Báo cáo & phân tích
│               ├── users/
│               │   └── page.tsx          # Quản lý người dùng
│               ├── notifications/
│               │   └── page.tsx          # Nhật ký thông báo
│               ├── audit-log/
│               │   └── page.tsx          # Nhật ký thao tác
│               └── settings/
│                   └── page.tsx          # Cài đặt hệ thống
│
└── n8n/                                  # [DEV-A phụ trách]
    └── workflows/
        ├── carrier-webhook-receiver.json
        ├── scheduled-stale-check.json
        ├── notification-router.json
        └── manual-replay.json
```

---

## 4. Database Schema (PostgreSQL)

### 4.1 Bảng chính

**users**
- `id` UUID PK
- `email` VARCHAR(255) UNIQUE NOT NULL
- `password_hash` VARCHAR(255) NOT NULL
- `full_name` VARCHAR(255)
- `role` ENUM('client', 'admin') DEFAULT 'client'
- `company_name` VARCHAR(255)
- `phone` VARCHAR(50)
- `avatar_url` VARCHAR(500)
- `is_active` BOOLEAN DEFAULT true
- `last_login_at` TIMESTAMPTZ
- `notification_preferences` JSONB DEFAULT '{}'
- `created_at` TIMESTAMPTZ DEFAULT NOW()
- `updated_at` TIMESTAMPTZ

**shipments**
- `id` UUID PK
- `tracking_number` VARCHAR(100) NOT NULL
- `reference_number` VARCHAR(100)
- `carrier` VARCHAR(50) NOT NULL
- `service_level` VARCHAR(50)
- `origin` VARCHAR(255)
- `destination` VARCHAR(255)
- `current_location` VARCHAR(255)
- `status` ENUM('created', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'returned', 'cancelled')
- `estimated_delivery` TIMESTAMPTZ
- `actual_delivery` TIMESTAMPTZ
- `weight` DECIMAL(10,2)
- `last_event_at` TIMESTAMPTZ
- `eta_risk_score` INTEGER DEFAULT 0
- `source` VARCHAR(50) DEFAULT 'manual'
- `user_id` UUID FK -> users
- `raw_data` JSONB
- `metadata` JSONB
- `created_at` TIMESTAMPTZ DEFAULT NOW()
- `updated_at` TIMESTAMPTZ
- INDEX trên `(tracking_number, carrier)` UNIQUE
- INDEX trên `(user_id, status)`
- INDEX trên `(carrier, status)`
- INDEX trên `last_event_at`

**shipment_events**
- `id` UUID PK
- `shipment_id` UUID FK -> shipments ON DELETE CASCADE
- `status` VARCHAR(100)
- `location` VARCHAR(255)
- `description` TEXT
- `event_time` TIMESTAMPTZ
- `raw_data` JSONB
- `source` VARCHAR(50)
- `created_at` TIMESTAMPTZ DEFAULT NOW()
- INDEX trên `(shipment_id, event_time)`

**exceptions**
- `id` UUID PK
- `shipment_id` UUID FK -> shipments
- `type` ENUM('delay', 'damage', 'lost', 'wrong_address', 'customs', 'custom')
- `severity` ENUM('low', 'medium', 'high', 'critical')
- `priority` INTEGER DEFAULT 0
- `status` ENUM('open', 'investigating', 'assigned', 'resolved', 'dismissed')
- `description` TEXT
- `root_cause` TEXT
- `resolution_note` TEXT
- `detected_at` TIMESTAMPTZ DEFAULT NOW()
- `resolved_at` TIMESTAMPTZ
- `sla_due_at` TIMESTAMPTZ
- `assigned_to` UUID FK -> users
- `resolved_by` UUID FK -> users
- `auto_detected` BOOLEAN DEFAULT true
- `detection_rule_id` UUID FK -> detection_rules
- `metadata` JSONB
- `created_at` TIMESTAMPTZ DEFAULT NOW()
- `updated_at` TIMESTAMPTZ
- INDEX trên `(shipment_id, type, status)`
- INDEX trên `(status, severity)`
- INDEX trên `sla_due_at`

**detection_rules**
- `id` UUID PK
- `name` VARCHAR(255) NOT NULL
- `description` TEXT
- `type` ENUM('delay', 'damage', 'lost', 'wrong_address', 'customs', 'custom')
- `conditions` JSONB NOT NULL
- `condition_operator` ENUM('AND', 'OR') DEFAULT 'AND'
- `severity` ENUM('low', 'medium', 'high', 'critical')
- `scope` VARCHAR(50) DEFAULT 'all'
- `is_active` BOOLEAN DEFAULT true
- `cooldown_minutes` INTEGER DEFAULT 60
- `last_triggered_at` TIMESTAMPTZ
- `trigger_count` INTEGER DEFAULT 0
- `created_by` UUID FK -> users
- `created_at` TIMESTAMPTZ DEFAULT NOW()
- `updated_at` TIMESTAMPTZ

**notifications**
- `id` UUID PK
- `exception_id` UUID FK -> exceptions
- `user_id` UUID FK -> users
- `channel` ENUM('email', 'slack', 'sms', 'in_app', 'webhook')
- `recipient` VARCHAR(255)
- `subject` VARCHAR(500)
- `body` TEXT
- `status` ENUM('queued', 'sent', 'failed', 'skipped')
- `error_message` TEXT
- `sent_at` TIMESTAMPTZ
- `created_at` TIMESTAMPTZ DEFAULT NOW()

**audit_logs**
- `id` UUID PK
- `user_id` UUID FK -> users
- `action` VARCHAR(100) NOT NULL
- `entity_type` VARCHAR(50) NOT NULL
- `entity_id` UUID
- `details` JSONB
- `ip_address` VARCHAR(45)
- `created_at` TIMESTAMPTZ DEFAULT NOW()
- INDEX trên `(entity_type, entity_id)`
- INDEX trên `(user_id, created_at)`

### 4.2 ER Diagram

```mermaid
erDiagram
    users ||--o{ shipments : "sở hữu"
    users ||--o{ exceptions : "được gán"
    users ||--o{ detection_rules : "tạo"
    users ||--o{ audit_logs : "thực hiện"
    users ||--o{ notifications : "nhận"
    shipments ||--o{ shipment_events : "có"
    shipments ||--o{ exceptions : "phát sinh"
    exceptions ||--o{ notifications : "gửi"
    detection_rules ||--o{ exceptions : "phát hiện bởi"

    users {
        uuid id PK
        varchar email
        enum role
        varchar company_name
        boolean is_active
    }
    shipments {
        uuid id PK
        varchar tracking_number
        varchar carrier
        enum status
        timestamptz estimated_delivery
        uuid user_id FK
    }
    shipment_events {
        uuid id PK
        uuid shipment_id FK
        varchar status
        timestamptz event_time
    }
    exceptions {
        uuid id PK
        uuid shipment_id FK
        enum type
        enum severity
        enum status
        timestamptz sla_due_at
    }
    detection_rules {
        uuid id PK
        varchar name
        jsonb conditions
        boolean is_active
    }
    notifications {
        uuid id PK
        uuid exception_id FK
        enum channel
        enum status
    }
    audit_logs {
        uuid id PK
        uuid user_id FK
        varchar action
        varchar entity_type
    }
```

---

## 5. Backend - FastAPI [DEV-A]

### 5.1 Detection Engine (`services/detection_engine.py`)

Logic core - chạy mỗi khi có shipment data mới hoặc theo schedule:

- **Delay Detection**: So sánh `estimated_delivery` với thời gian thực. Gán severity theo số giờ/ngày trễ:
  - Trễ 1-24h -> `medium`
  - Trễ 24-72h -> `high`
  - Trễ >72h -> `critical`
- **Damage Detection**: Phân tích keywords trong status/raw event: `damage`, `damaged`, `broken`, `leaking`, `crushed`
- **Lost Detection**: Không có `last_event_at` quá X ngày (tuỳ carrier/service level), status không phải `delivered`/`returned`/`cancelled`
  - Express: >3 ngày -> `high`
  - Standard: >7 ngày -> `high`
  - >14 ngày -> `critical`
- **Wrong Address**: Keywords: `address incorrect`, `bad address`, `recipient unavailable`, `address not found`
- **Customs Hold**: Keywords/code: `customs`, `clearance`, `held`, `import delay`, `customs inspection`
- **Custom Rules**: Admin định nghĩa rules dạng JSONB, engine evaluate động:
  - Operators: `status_in`, `carrier_in`, `destination_in`, `service_level_in`, `delay_hours_gt`, `stale_days_gt`
  - `condition_operator`: AND / OR
- **Dedupe**: Không tạo exception mới nếu cùng `shipment_id + type` đã có status `open`/`investigating`/`assigned`
- **Output mỗi detection**:
  - Tạo `ExceptionRecord` với `auto_detected=true`
  - Tính `sla_due_at` = `detected_at + SLA theo severity`
  - Ghi `AuditLog` action `exception.auto_detected`
  - Nếu severity `high`/`critical`: tạo notification record + push SSE event
  - Nếu severity `critical`: trigger n8n notification workflow

### 5.2 API Endpoints đầy đủ

#### Auth API

| Endpoint | Method | Mô tả | Phân quyền |
| --- | --- | --- | --- |
| `/api/auth/login` | POST | Đăng nhập, trả JWT access + refresh token | Public |
| `/api/auth/register` | POST | Đăng ký tài khoản client | Public |
| `/api/auth/refresh` | POST | Làm mới access token | Authenticated |
| `/api/auth/me` | GET | Lấy thông tin user hiện tại | Authenticated |
| `/api/auth/me` | PATCH | Cập nhật profile | Authenticated |
| `/api/auth/change-password` | POST | Đổi mật khẩu | Authenticated |

#### Shipment API (Client)

| Endpoint | Method | Mô tả | Phân quyền |
| --- | --- | --- | --- |
| `/api/shipments` | GET | Danh sách shipments của user, hỗ trợ filter/sort/pagination | Client |
| `/api/shipments` | POST | Tạo shipment mới | Client |
| `/api/shipments/{id}` | GET | Chi tiết shipment (chỉ của user) | Client |
| `/api/shipments/{id}` | PATCH | Cập nhật shipment | Client |
| `/api/shipments/{id}` | DELETE | Xoá shipment (soft delete) | Client |
| `/api/shipments/{id}/events` | GET | Timeline events của shipment | Client |
| `/api/shipments/{id}/events` | POST | Thêm event thủ công | Client |
| `/api/shipments/search` | GET | Tìm theo tracking number | Client |
| `/api/shipments/upload` | POST | Upload CSV/Excel | Client |
| `/api/shipments/upload/template` | GET | Tải template CSV | Public |
| `/api/shipments/ingest` | POST | Nhận data từ n8n/carrier webhook | API Key |

#### Exception API (Client)

| Endpoint | Method | Mô tả | Phân quyền |
| --- | --- | --- | --- |
| `/api/exceptions` | GET | Danh sách exceptions của user, filter/sort/pagination | Client |
| `/api/exceptions/{id}` | GET | Chi tiết exception | Client |
| `/api/exceptions/{id}` | PATCH | Cập nhật status (chỉ dismiss) | Client |
| `/api/exceptions/stats` | GET | Thống kê exception của user | Client |

#### Admin API

| Endpoint | Method | Mô tả | Phân quyền |
| --- | --- | --- | --- |
| `/api/admin/summary` | GET | KPI tổng quan (cards dashboard) | Admin |
| `/api/admin/shipments` | GET | Tất cả shipments, advanced filters | Admin |
| `/api/admin/shipments/{id}` | GET | Chi tiết shipment bất kỳ | Admin |
| `/api/admin/shipments/{id}` | PATCH | Cập nhật shipment bất kỳ | Admin |
| `/api/admin/exceptions` | GET | Tất cả exceptions, advanced filters | Admin |
| `/api/admin/exceptions/{id}` | PATCH | Cập nhật: assign, resolve, dismiss, ghi note | Admin |
| `/api/admin/exceptions/bulk` | PATCH | Bulk update status/assign | Admin |
| `/api/admin/users` | GET | Danh sách users | Admin |
| `/api/admin/users/{id}` | PATCH | Cập nhật role, disable user | Admin |
| `/api/admin/notifications` | GET | Nhật ký thông báo | Admin |
| `/api/admin/audit-logs` | GET | Nhật ký thao tác | Admin |

#### Detection & Rules API

| Endpoint | Method | Mô tả | Phân quyền |
| --- | --- | --- | --- |
| `/api/rules` | GET | Danh sách rules | Admin |
| `/api/rules` | POST | Tạo rule mới | Admin |
| `/api/rules/{id}` | GET | Chi tiết rule | Admin |
| `/api/rules/{id}` | PATCH | Cập nhật rule | Admin |
| `/api/rules/{id}` | DELETE | Xoá rule | Admin |
| `/api/rules/{id}/toggle` | PATCH | Bật/tắt rule | Admin |
| `/api/detection/run-batch` | POST | Chạy detection hàng loạt | Admin / n8n |
| `/api/detection/test-rule` | POST | Test rule trên sample shipment | Admin |

#### Analytics & Export API

| Endpoint | Method | Mô tả | Phân quyền |
| --- | --- | --- | --- |
| `/api/admin/analytics/trends` | GET | Trend exceptions theo ngày (date range) | Admin |
| `/api/admin/analytics/carriers` | GET | Carrier issue ranking | Admin |
| `/api/admin/analytics/types` | GET | Phân bố theo exception type | Admin |
| `/api/admin/analytics/severity` | GET | Phân bố theo severity | Admin |
| `/api/admin/analytics/sla` | GET | SLA breach statistics | Admin |
| `/api/admin/analytics/resolution-time` | GET | Thời gian xử lý trung bình | Admin |
| `/api/admin/export/exceptions` | GET | Xuất CSV exceptions | Admin |
| `/api/admin/export/shipments` | GET | Xuất CSV shipments | Admin |

#### Realtime & Health

| Endpoint | Method | Mô tả | Phân quyền |
| --- | --- | --- | --- |
| `/api/events/stream` | GET (SSE) | Server-Sent Events stream | Authenticated |
| `/api/health` | GET | Health check | Public |

### 5.3 Redis sử dụng cho

- Cache dashboard summary stats (TTL 5 phút)
- Cache analytics queries (TTL 15 phút)
- Rate limiting API (100 req/phút/user)
- SSE event pub/sub channel
- Background task queue (detection batch)

---

## 6. n8n - Điều hướng workflow [DEV-A]

### Mục tiêu n8n (đủ scope đồ án cuối kỳ)

- **Orchestration thật sự**: ingest nhiều nguồn, scheduled detection, notification routing, retry/DLQ, audit log.
- **Quan sát được**: mỗi lần chạy workflow có `run_id`, log kết quả về API (hoặc ít nhất giữ DLQ + history).
- **Có demo kịch bản**: success, lỗi validation, lỗi API (retry), phát hiện exception và gửi thông báo.

### Workflow 1: `carrier_ingest_webhook` (Ingest + Normalize + Idempotency)

- **Trigger**: Webhook `/webhook/carrier-ingest`
- **Xử lý chính**:
  - Validate required fields (`tracking_number`, `carrier`, `status`, `event_time`)
  - Normalize carrier payload → unified schema (map status, location, timestamps)
  - (Tuỳ chọn) Verify signing secret / API key của carrier
  - POST → FastAPI `/api/shipments/ingest` (kèm `source=carrier`, `event_id`)
- **Idempotency**: dùng `event_id` (hoặc hash payload) để tránh ingest trùng
- **Error handling**:
  - 4xx validation → push vào DLQ (Workflow 5) + log “invalid”
  - 5xx/timeout → retry with backoff (3 lần) rồi DLQ

### Workflow 2: `csv_ingest_webhook` (Import CSV qua n8n cho demo)

- **Trigger**: Webhook `/webhook/csv-import` (nhận file hoặc URL file)
- **Xử lý**: parse CSV (hoặc gọi API upload nếu FE làm) → gọi `/api/admin/shipments/import-csv` hoặc `/api/shipments/ingest` theo batch
- **Mục tiêu**: có kịch bản demo “không cần FE vẫn ingest được”

### Workflow 3: `scheduled_stale_check` (Cron check shipments stale)

- **Trigger**: Cron mỗi 15 phút
- **Xử lý**:
  - GET `/api/admin/shipments?status=in_transit`
  - POST `/api/detection/run-batch` (filter stale) → nhận summary
  - Nếu có `critical` mới → gọi Workflow 4 (notification)

> Gợi ý mở rộng trong cùng workflow (hoặc tách workflow riêng): **`scheduled_sla_breach_scan`**
> - Cron mỗi 30 phút → GET analytics SLA hoặc query exceptions open quá ngưỡng
> - Nếu breach `critical` → route “escalation” (Slack mention / email on-call) + log

### Workflow 4: `notification_router` (Routing theo severity + preference)

- **Trigger**: Webhook `/webhook/exception-notify` (FastAPI gọi khi detect)
- **Xử lý**:
  - Enrich (GET `/api/admin/users/notification-preferences` hoặc payload đã đủ)
  - Route:
    - `critical`: Slack + Email + (tuỳ chọn) escalate (ping on-call)
    - `high`: Email (+ Slack digest)
    - `medium/low`: log only (Workflow 6)
- **Anti-spam**: dedupe theo `(exception_id, channel)` và cooldown theo thời gian

### Workflow 5: `dlq_retry_processor` (DLQ + Retry + Replay)

- **Trigger**: Cron mỗi 5 phút hoặc manual
- **Input**: danh sách payload lỗi (Data Store / file / webhook từ nhánh error)
- **Xử lý**:
  - Phân loại lỗi (validation vs upstream vs auth)
  - Retry những case phù hợp, cập nhật trạng thái retry_count
  - Manual “Replay” (phục vụ demo/giảng viên hỏi)

### Workflow 6: `workflow_audit_logger` (Observability/Audit)

- **Trigger**: được gọi như sub-flow từ các workflow khác (success/fail)
- **Xử lý**:
  - Chuẩn hoá log event: `run_id`, `workflow`, `entity_type`, `entity_id`, `status`, `duration_ms`, `error_code`
  - POST → FastAPI `/api/admin/audit-logs` hoặc `/api/admin/notifications`

### File deliverables n8n (đề xuất)

- `n8n/workflows/` chứa **6 JSON** tương ứng (mỗi workflow 1 file), kèm:
  - `sample-payloads/` (JSON mẫu: success, invalid, timeout)
  - `README-n8n.md` (cách import + test từng webhook/cron)

---

## 7. Design System & UI Foundation [DEV-B tạo]

### 7.1 Tech Stack Frontend
- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS 3.4+
- **Component Library**: shadcn/ui (Radix UI primitives)
- **Charts**: Recharts
- **Animations**: Framer Motion (page transitions, micro-interactions)
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod validation
- **State**: Zustand (global) + React Query / SWR (server state)
- **Date**: date-fns
- **Table**: TanStack Table v8

### 7.2 Color System (CSS Custom Properties)

```
Theme Tokens (hỗ trợ dark/light mode):
├── --background, --foreground
├── --card, --card-foreground
├── --primary, --primary-foreground          # Brand blue
├── --secondary, --secondary-foreground
├── --muted, --muted-foreground
├── --accent, --accent-foreground
├── --destructive, --destructive-foreground
├── --border, --input, --ring
│
Semantic Colors (severity/status):
├── --severity-low: green
├── --severity-medium: amber/yellow
├── --severity-high: orange
├── --severity-critical: red
├── --status-open: blue
├── --status-investigating: purple
├── --status-assigned: indigo
├── --status-resolved: green
├── --status-dismissed: gray
│
Shipment Status Colors:
├── --shipment-created: slate
├── --shipment-picked-up: blue
├── --shipment-in-transit: indigo
├── --shipment-out-for-delivery: amber
├── --shipment-delivered: emerald
├── --shipment-returned: orange
└── --shipment-cancelled: red
```

### 7.3 Typography
- **Heading font**: Inter (sans-serif), font-weight 600-700
- **Body font**: Inter, font-weight 400-500
- **Monospace**: JetBrains Mono (tracking numbers, JSON viewer, code)
- **Scale**: text-xs (12px) -> text-sm (14px) -> text-base (16px) -> text-lg (18px) -> text-xl (20px) -> text-2xl (24px) -> text-3xl (30px)

### 7.4 Responsive Breakpoints
- **Mobile**: < 768px (single column, bottom nav, stacked cards)
- **Tablet**: 768px - 1024px (collapsible sidebar, condensed tables)
- **Desktop**: > 1024px (full sidebar, dense data tables, side panels)

### 7.5 Shared Component Specs

**DataTable** (dùng cho mọi trang list):
- Column sorting (click header)
- Column visibility toggle (dropdown)
- Row selection (checkbox, select all)
- Pagination (page size selector: 10/25/50/100, page navigation)
- Global search (debounced)
- Column-level filters
- Row expansion (click to expand details)
- Bulk action toolbar (hiện khi có rows selected)
- Export button (CSV)
- View toggle (table / compact / card)
- Loading: skeleton rows
- Empty: illustrated empty state với CTA
- Responsive: table trên desktop, card list trên mobile

**StatCard** (dùng cho dashboard):
- Tiêu đề + giá trị lớn + đơn vị
- Sparkline mini chart (7 ngày gần nhất)
- Trend indicator (tăng/giảm %, mũi tên xanh/đỏ)
- Icon bên trái
- Click để drill-down

**StatusBadge / SeverityBadge**:
- Màu nền + chấm tròn + text
- Tooltip hiển thị mô tả đầy đủ
- Kích thước: sm (inline text) / md (table cell) / lg (detail page)

**Timeline**:
- Vertical timeline với dots và connector lines
- Mỗi entry: icon + thời gian + mô tả + location
- Highlight event hiện tại
- Collapsible nếu > 10 events

**EmptyState**:
- Illustration SVG phù hợp context
- Tiêu đề + mô tả
- Primary CTA button
- VD: "Chưa có shipment nào" -> Button "Tạo shipment đầu tiên" hoặc "Upload CSV"

**FilterBar**:
- Collapsible panel (mở rộng/thu gọn)
- Filter chips hiển thị filters đang active
- Clear all button
- Saved filters / views (stretch)

### 7.6 Animation & Transitions
- Page transitions: fade-in slide-up (150ms ease-out)
- Dialog/Sheet: slide-in + backdrop fade (200ms)
- Toast: slide-in từ phải (300ms), auto-dismiss 5s
- Skeleton pulse animation
- Badge count bounce khi thay đổi
- Chart animate on mount
- Sidebar collapse/expand (200ms ease)

### 7.7 Accessibility (WCAG 2.1 AA)
- Color contrast ratio >= 4.5:1
- Tất cả interactive elements có focus ring
- Keyboard navigation: Tab, Enter, Escape, Arrow keys
- Screen reader: ARIA labels cho badges, charts, icons
- Skip to main content link
- Reduced motion: respect `prefers-reduced-motion`

---

## 8. Frontend - Client Portal [DEV-B]

### 8.1 Auth Pages

**Login Page** (`/login`):
- Layout: centered card, max-width 420px, logo phía trên
- Fields: Email + Password
- Actions: "Đăng nhập" button (primary), "Quên mật khẩu?" link, "Đăng ký" link
- Features: show/hide password toggle, remember me checkbox
- Validation: email format, password required, server error hiển thị inline
- Loading: button disabled + spinner khi đang gọi API
- After login: redirect theo role (client -> `/`, admin -> `/admin`)
- Responsive: full-screen trên mobile, split-screen illustration trên desktop

**Register Page** (`/register`):
- Fields: Full name, Email, Company name, Password, Confirm password
- Validation: Zod schema, password strength indicator, real-time email availability check (debounced)
- After register: auto-login, redirect đến client dashboard

**Forgot Password** (`/forgot-password`):
- Field: Email
- Success state: "Chúng tôi đã gửi link đặt lại mật khẩu" (placeholder - chưa gửi email thật)

### 8.2 Client Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Header: Logo | Breadcrumb              Search | Bell | User│
├────────────┬────────────────────────────────────────────────┤
│  Sidebar   │  Main Content Area                             │
│            │                                                │
│  Dashboard │  [Page Header: Title + Actions]                │
│  Shipments │                                                │
│  Exceptions│  [Page Content]                                │
│  Upload    │                                                │
│  ────────  │                                                │
│  Profile   │                                                │
│  Settings  │                                                │
│            │                                                │
│  ────────  │                                                │
│  Theme ◐   │                                                │
│  Logout    │                                                │
└────────────┴────────────────────────────────────────────────┘

Mobile: Sidebar ẩn, hiện hamburger menu hoặc bottom tab bar
```

- Sidebar: 240px desktop, collapsible icon-only 64px, hidden trên mobile
- Header: sticky top, 56px height
- Breadcrumb: tự động từ route
- Notification bell: badge count exceptions chưa đọc
- User avatar dropdown: Profile, Settings, Theme toggle, Logout

### 8.3 Client Dashboard (`/`)

**Layout**:
```
┌──────────────────────────────────────────────────────────────┐
│  Xin chào, {user.full_name}                    [Ngày hiện tại]│
├──────────┬──────────┬──────────┬──────────────────────────────┤
│ Tổng     │ Đang     │ Exception│ Đã giao                      │
│ shipment │ vận chuyển│ mở      │ hàng                         │
│ 156  +12%│ 43   -5% │ 7   +2  │ 98   +8%                     │
├──────────┴──────────┴──────────┴──────────────────────────────┤
│                                                                │
│  [Quick Tracking Search]                                       │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 🔍 Nhập mã vận đơn để tra cứu nhanh...                  │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
├──────────────────────────────┬─────────────────────────────────┤
│  Exceptions gần đây          │  Shipments cần chú ý            │
│  ┌──────────────────────────┐│  ┌───────────────────────────┐  │
│  │ 🔴 CRITICAL - TRK-001   ││  │ ⚠️ TRK-005 - Trễ 3 ngày  │  │
│  │ Delay >72h               ││  │ ⚠️ TRK-012 - Customs hold │  │
│  │ 2 phút trước             ││  │ ⚠️ TRK-018 - Không cập nhật│  │
│  │──────────────────────────││  │───────────────────────────│  │
│  │ 🟠 HIGH - TRK-003       ││  │ TRK-022 - Sai địa chỉ    │  │
│  │ Damage detected          ││  │ TRK-031 - Trễ 1 ngày     │  │
│  │ 15 phút trước            ││  └───────────────────────────┘  │
│  └──────────────────────────┘│  [Xem tất cả ->]               │
│  [Xem tất cả ->]            │                                  │
└──────────────────────────────┴─────────────────────────────────┘
```

**States**:
- Loading: 4 skeleton stat cards + 2 skeleton list panels
- Empty (user mới): Welcome message + "Upload shipment đầu tiên" CTA + "Tạo shipment" CTA
- Error: Error banner phía trên với retry button
- Data: Như wireframe trên, auto-refresh mỗi 60s

### 8.4 Shipments List (`/shipments`)

**Layout**:
```
┌──────────────────────────────────────────────────────────────┐
│ Page Header: "Shipments" | [+ Tạo mới] [📤 Upload CSV]       │
├──────────────────────────────────────────────────────────────┤
│ Search: [🔍 Tìm theo tracking number, carrier...]           │
│ Filters: [Status ▾] [Carrier ▾] [Ngày tạo ▾] [Clear all]    │
│ Active: ● In Transit  ● Delay    [View: Table | Card]        │
├──────────────────────────────────────────────────────────────┤
│ ☐ │ Tracking #      │ Carrier │ Status      │ Origin → Dest │
│───┼─────────────────┼─────────┼─────────────┼───────────────│
│ ☐ │ TRK-2024-001    │ DHL     │ 🟢 Delivered│ HCM → HN      │
│ ☐ │ TRK-2024-002    │ FedEx   │ 🟡 In Transit│ HN → ĐN      │
│ ☐ │ TRK-2024-003    │ UPS     │ 🔴 Exception│ HCM → SG      │
│   │ └─ ⚠️ Damage detected (HIGH)                             │
│───┼─────────────────┼─────────┼─────────────┼───────────────│
│   │                 │         │             │ ETA  │ Exceptions│
├──────────────────────────────────────────────────────────────┤
│ Showing 1-25 of 156    [◀ 1 2 3 ... 7 ▶]    [25 per page ▾] │
└──────────────────────────────────────────────────────────────┘

Bulk toolbar (khi có rows selected):
┌──────────────────────────────────────────────────────────────┐
│ ✓ 3 đã chọn    [📤 Export CSV]  [🗑 Xoá]                    │
└──────────────────────────────────────────────────────────────┘

Mobile (card view):
┌──────────────────────────┐
│ TRK-2024-001        DHL  │
│ 🟢 Delivered              │
│ HCM → HN                 │
│ ETA: 15/04  Delivered: 14│
│ No exceptions             │
└──────────────────────────┘
```

**Features chi tiết**:
- Column sort: click header (tracking, carrier, status, ETA, created)
- Column visibility: toggle dropdown phía phải
- Row click: navigate đến detail page
- Row expansion: hiển thị exception badges inline
- Search: debounced 300ms, highlight matching text
- Filters:
  - Status: multi-select checkboxes
  - Carrier: multi-select checkboxes
  - Date range: date picker
  - Has exception: toggle
- Pagination: server-side, page size selector
- Export: CSV download với filters đang áp dụng

### 8.5 Shipment Detail (`/shipments/[id]`)

**Layout (tabs)**:
```
┌──────────────────────────────────────────────────────────────┐
│ ← Quay lại   Shipment TRK-2024-003                          │
│               Carrier: UPS  │  Status: 🟡 In Transit         │
├──────────────────────────────────────────────────────────────┤
│ [Tổng quan] [Timeline] [Exceptions] [Dữ liệu gốc]           │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  TAB: Tổng quan                                                │
│  ┌────────────────────────┬────────────────────────────────┐  │
│  │ Thông tin vận đơn       │ Thời gian                      │  │
│  │ Tracking: TRK-2024-003 │ Tạo: 10/04/2026 08:00          │  │
│  │ Ref: ORDER-5521         │ ETA: 14/04/2026                │  │
│  │ Carrier: UPS            │ Thực tế: --                    │  │
│  │ Service: Express        │ Trễ: ⚠️ 1 ngày                │  │
│  │ Weight: 2.5 kg          │                                │  │
│  ├────────────────────────┼────────────────────────────────┤  │
│  │ Điểm đi                │ Điểm đến                       │  │
│  │ 📍 TP.HCM, Việt Nam    │ 📍 Singapore                   │  │
│  │ Vị trí hiện tại:       │                                │  │
│  │ 📍 Changi Airport       │                                │  │
│  └────────────────────────┴────────────────────────────────┘  │
│                                                                │
│  Exceptions (2)                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 🔴 HIGH - Delay >24h       │ Open  │ 12/04 14:30        │ │
│  │ 🟡 MEDIUM - Customs hold   │ Resolved │ 11/04 09:00     │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  TAB: Timeline                                                 │
│  ● 15/04 08:00  Out for delivery - Singapore                  │
│  │                                                             │
│  ● 14/04 22:00  Arrived at destination hub                     │
│  │                                                             │
│  ● 13/04 10:00  Customs cleared                                │
│  │                                                             │
│  ● 12/04 06:00  ⚠️ Customs hold - Inspection required         │
│  │                                                             │
│  ● 11/04 18:00  Departed origin hub - HCM                     │
│  │                                                             │
│  ● 10/04 08:00  Picked up - HCM warehouse                     │
│                                                                │
│  TAB: Dữ liệu gốc                                             │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ { "tracking": "TRK-2024-003", "carrier": "UPS", ... }   │ │
│  │ [Collapsible JSON viewer with syntax highlighting]       │ │
│  └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

**States**:
- Loading: skeleton cho info cards + timeline
- Not found: 404 page với "Quay lại danh sách" link
- Tabs: lazy-loaded, giữ state khi switch

### 8.6 Client Exceptions (`/exceptions`)

**Layout**:
```
┌──────────────────────────────────────────────────────────────┐
│ Page Header: "Exceptions"                                     │
├──────────────────────────────────────────────────────────────┤
│ Filters: [Type ▾] [Severity ▾] [Status ▾] [Date range ▾]     │
│ Active: ● Critical ● High  ● Open                            │
├──────────────────────────────────────────────────────────────┤
│ Type       │ Severity  │ Shipment        │ Status │ Phát hiện │
│────────────┼───────────┼─────────────────┼────────┼───────────│
│ 📦 Delay   │ 🔴 Critical│ TRK-2024-001   │ Open   │ 2h trước  │
│ 💥 Damage  │ 🟠 High    │ TRK-2024-003   │ Open   │ 5h trước  │
│ 🔒 Customs │ 🟡 Medium  │ TRK-2024-007   │ Resolved│ 1d trước │
├──────────────────────────────────────────────────────────────┤
│ Click row -> Slide-over panel chi tiết exception              │
│ ┌─────────────────────────────────────────────────┐          │
│ │  Exception Detail (Sheet từ phải)                │          │
│ │  Type: Delay  │  Severity: CRITICAL              │          │
│ │  Shipment: TRK-2024-001 (link)                   │          │
│ │  Mô tả: ETA vượt quá 72 giờ                     │          │
│ │  Phát hiện: 15/04/2026 10:30                     │          │
│ │  SLA: Hết hạn trong 4h                           │          │
│ │  Status: Open                                    │          │
│ │  ───────────────────────────────                 │          │
│ │  [Dismiss exception]                             │          │
│ └─────────────────────────────────────────────────┘          │
└──────────────────────────────────────────────────────────────┘
```

### 8.7 Upload Center (`/upload`)

**Stepper wizard (4 bước)**:
```
Step 1: Chọn file          Step 2: Xem trước          Step 3: Import          Step 4: Kết quả
  ● ─────────────────────── ○ ─────────────────────── ○ ──────────────────── ○

Step 1 - Chọn file:
┌──────────────────────────────────────────────────────────────┐
│  ┌──────────────────────────────────────────────────────┐    │
│  │                                                      │    │
│  │     📁 Kéo thả file CSV vào đây                      │    │
│  │     hoặc click để chọn file                          │    │
│  │                                                      │    │
│  │     Hỗ trợ: .csv, .xlsx (tối đa 10MB)               │    │
│  │                                                      │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                               │
│  📥 Tải template CSV mẫu                                     │
│                                                               │
│  Lịch sử import gần đây:                                     │
│  │ 14/04 - shipments.csv - 45 rows - ✅ Thành công           │
│  │ 12/04 - data.csv - 120 rows - ⚠️ 3 lỗi                   │
└──────────────────────────────────────────────────────────────┘

Step 2 - Xem trước:
┌──────────────────────────────────────────────────────────────┐
│  File: shipments.csv (52 rows)                                │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ tracking_number │ carrier │ status     │ origin       │    │
│  │ TRK-NEW-001     │ DHL     │ in_transit │ HCM          │    │
│  │ TRK-NEW-002     │ FedEx   │ picked_up  │ HN           │    │
│  │ ⚠️ TRK-NEW-003  │ ???     │ invalid    │ --           │    │
│  │ TRK-NEW-004     │ UPS     │ delivered  │ ĐN           │    │
│  │ ... hiển thị 5 dòng đầu + tổng số dòng               │    │
│  └──────────────────────────────────────────────────────┘    │
│  ⚠️ 2 dòng có lỗi validation                                 │
│  [◀ Quay lại] [Tiếp tục import ▶]                            │
└──────────────────────────────────────────────────────────────┘

Step 4 - Kết quả:
┌──────────────────────────────────────────────────────────────┐
│  ✅ Import hoàn tất                                           │
│  ┌──────────┬──────────┬──────────┬──────────┐               │
│  │ Tạo mới  │ Cập nhật │ Lỗi      │ Exception│               │
│  │ 45       │ 5        │ 2        │ 3        │               │
│  └──────────┴──────────┴──────────┴──────────┘               │
│                                                               │
│  Dòng lỗi:                                                    │
│  │ Dòng 3: Carrier không hợp lệ                              │
│  │ Dòng 28: Thiếu tracking_number                            │
│                                                               │
│  Exceptions được tạo tự động:                                 │
│  │ TRK-NEW-007: Delay detected (HIGH)                        │
│  │ TRK-NEW-015: Customs hold (MEDIUM)                        │
│  │ TRK-NEW-041: Lost suspected (HIGH)                        │
│                                                               │
│  [Upload thêm file] [Xem shipments →]                        │
└──────────────────────────────────────────────────────────────┘
```

### 8.8 Profile & Settings (`/profile`)

**Tabs**: Tài khoản | Thông báo | Bảo mật

```
Tab Tài khoản:
- Avatar upload (hoặc initials fallback)
- Full name, Email (readonly), Company name, Phone
- Timezone selector
- Save button

Tab Thông báo:
- Toggle: Email notifications
- Toggle: In-app notifications
- Severity threshold: chỉ nhận từ severity nào trở lên
- Notification types: Delay / Damage / Lost / Customs / All

Tab Bảo mật:
- Đổi mật khẩu (current + new + confirm)
- Sessions list (placeholder)
```

### 8.9 Notification Center (`/notifications`)

- Header bell icon: badge đếm thông báo chưa đọc
- Dropdown nhanh: 5 thông báo gần nhất + "Xem tất cả"
- Full page: danh sách thông báo, filter theo type, mark all as read
- Mỗi notification: icon type + title + description + time ago + link đến entity liên quan

### 8.10 Command Palette (Cmd+K)

- Mở bằng `Cmd+K` (Mac) / `Ctrl+K` (Windows)
- Search shipments theo tracking number
- Search exceptions
- Quick navigate: "Đi đến Dashboard", "Đi đến Upload", v.v.
- Recent searches

---

## 9. Frontend - Admin Dashboard [DEV-C]

### 9.1 Admin Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Header: Logo "Admin" | Breadcrumb       Search | 🔔 | User │
├────────────────┬────────────────────────────────────────────┤
│  Sidebar       │  Main Content Area                         │
│  (240px,       │                                            │
│  collapsible)  │  [Page Header + Actions]                   │
│                │                                            │
│  📊 Dashboard  │  [Page Content]                            │
│  📦 Shipments  │                                            │
│  ⚠️ Exceptions │                                            │
│  🔧 Rules      │                                            │
│  📈 Analytics  │                                            │
│  ─────────     │                                            │
│  👥 Users      │                                            │
│  🔔 Thông báo  │                                            │
│  📋 Audit Log  │                                            │
│  ⚙️ Cài đặt    │                                            │
│  ─────────     │                                            │
│  Theme ◐       │                                            │
│  Đăng xuất     │                                            │
└────────────────┴────────────────────────────────────────────┘
```

- Badge count trên Exceptions menu item (số open)
- Badge count trên Thông báo (số chưa đọc)
- Sidebar collapsible: icon-only mode trên tablet
- Mobile: off-canvas sidebar với overlay

### 9.2 Admin Dashboard (`/admin`)

```
┌──────────────────────────────────────────────────────────────┐
│ Dashboard            [Date range: Last 7 days ▾] [🔄 Refresh] │
├──────────┬──────────┬──────────┬──────────────────────────────┤
│ Tổng     │ Exception│ Critical │ SLA vi phạm                   │
│ shipments│ đang mở  │ mở       │                               │
│ 1,247    │ 34  ↑12% │ 5  ↑2   │ 8  ↓3%                       │
│ +89 tuần │ vs tuần  │ cần xử  │ vs tuần                       │
│ này      │ trước    │ lý ngay  │ trước                         │
├──────────┴──────────┴──────────┴──────────────────────────────┤
│                                                                │
│  ┌─────────────────────────────┬──────────────────────────────┐│
│  │ Trend Exceptions (Line)     │ Phân bố theo Type (Donut)    ││
│  │                             │                              ││
│  │ 40─┐                        │    ┌─────────┐               ││
│  │    │    ╱\                  │    │ Delay 45%│               ││
│  │ 20─┤   /  \    /\          │    │ Lost  20%│               ││
│  │    │──/    \──/  \──       │    │ Damage15%│               ││
│  │  0─┴──────────────────     │    │ Customs12│               ││
│  │    Mon Tue Wed Thu Fri      │    │ Other  8%│               ││
│  │                             │    └─────────┘               ││
│  └─────────────────────────────┴──────────────────────────────┘│
│                                                                │
│  ┌─────────────────────────────┬──────────────────────────────┐│
│  │ Severity Distribution (Bar) │ Top Carriers có vấn đề       ││
│  │                             │                              ││
│  │ Critical ████████ 15       │ DHL     ████████████ 23      ││
│  │ High     ████████████ 28   │ FedEx   ████████ 18          ││
│  │ Medium   ██████████████ 34 │ UPS     █████ 12              ││
│  │ Low      ████████ 18       │ GHN     ████ 8                ││
│  │                             │ GHTK    ██ 5                  ││
│  └─────────────────────────────┴──────────────────────────────┘│
│                                                                │
│  Exceptions gần đây cần xử lý                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ 🔴 TRK-001 │ Delay >72h    │ Critical │ Open   │ 2m ago │  │
│  │ 🔴 TRK-045 │ Lost suspected│ Critical │ Open   │ 15m ago│  │
│  │ 🟠 TRK-003 │ Damage        │ High     │ Open   │ 1h ago │  │
│  │ 🟡 TRK-012 │ Customs hold  │ Medium   │ Assigned│ 2h ago│  │
│  │ 🟡 TRK-018 │ Wrong address │ Medium   │ Open   │ 3h ago │  │
│  └──────────────────────────────────────────────────────────┘  │
│  [Xem tất cả exceptions →]                                    │
└──────────────────────────────────────────────────────────────┘
```

**Features chi tiết**:
- Date range picker: Today / 7 days / 30 days / Custom range
- So sánh với kỳ trước (tuần trước / tháng trước)
- Auto-refresh mỗi 60s (có indicator)
- Charts: hover tooltip, click để drill-down
- StatCards: click navigate đến trang tương ứng
- SSE integration: toast khi có critical exception mới, badge count tự động cập nhật

### 9.3 Admin Shipment Management (`/admin/shipments`)

**Layout**: DataTable nâng cao
- Tất cả features từ shared DataTable
- Thêm cột: User/Company, Exception count, Risk score
- Bulk actions: Run detection, Export, Delete
- Create dialog: form tạo shipment mới
- Edit inline: click cell để edit (status, carrier)
- Row action menu: View detail, Edit, Run detection, Delete

**Admin Shipment Detail** (`/admin/shipments/[id]`):
- Giống Client detail + thêm:
  - Panel "Admin Actions": Edit all fields, Add event thủ công, Run detection
  - Panel "Linked Exceptions": list + create manual exception
  - Panel "Audit History": timeline thao tác trên shipment này
  - Panel "User Info": thông tin client sở hữu

### 9.4 Exception Queue (`/admin/exceptions`)

```
┌──────────────────────────────────────────────────────────────┐
│ Exception Queue           [Bulk: Assign | Resolve | Dismiss]  │
├──────────────────────────────────────────────────────────────┤
│ Filters: [Type ▾] [Severity ▾] [Status ▾] [Assigned ▾]       │
│          [Carrier ▾] [Date range ▾] [SLA: Sắp hết hạn ▾]     │
│ Sort: [Mới nhất ▾] | Priority | SLA deadline                  │
├──────────────────────────────────────────────────────────────┤
│ ☐ │ Severity │ Type     │ Shipment    │ Status       │ SLA    │
│───┼──────────┼──────────┼─────────────┼──────────────┼────────│
│ ☐ │🔴Critical│ Delay    │ TRK-001     │ Open         │ ⏰ 2h  │
│ ☐ │🔴Critical│ Lost     │ TRK-045     │ Open         │ ⏰ 4h  │
│ ☐ │🟠 High   │ Damage   │ TRK-003     │ Investigating│ 12h    │
│ ☐ │🟡 Medium │ Customs  │ TRK-012     │ Assigned: An │ 24h    │
│ ☐ │🟢 Low    │ Delay    │ TRK-099     │ Resolved ✓   │ --     │
├──────────────────────────────────────────────────────────────┤
│ Click row -> Exception Detail Page                            │
└──────────────────────────────────────────────────────────────┘
```

**SLA Timer**:
- Hiển thị đồng hồ đếm ngược bên cạnh mỗi exception chưa resolve
- Severity -> SLA: Critical 4h, High 12h, Medium 24h, Low 72h
- Quá hạn: highlight đỏ, sort lên đầu

**Exception Detail** (`/admin/exceptions/[id]`):
```
┌──────────────────────────────────────────────────────────────┐
│ ← Quay lại    Exception #EXC-001         Status: 🔴 Open     │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌─────────────────────────┬──────────────────────────────────┐│
│  │ Thông tin Exception      │ Hành động                       ││
│  │ Type: Delay              │                                 ││
│  │ Severity: 🔴 CRITICAL    │ Assign cho: [Dropdown ▾]        ││
│  │ Shipment: TRK-001 (link)│ Chuyển status: [Status ▾]       ││
│  │ Phát hiện: 15/04 10:30  │                                 ││
│  │ Phát hiện bởi: Rule #3  │ Nguyên nhân gốc:               ││
│  │ SLA: ⏰ Còn 2h           │ [textarea]                      ││
│  │ Auto detected: ✅        │                                 ││
│  │                          │ Ghi chú xử lý:                 ││
│  │ Mô tả:                  │ [textarea]                      ││
│  │ ETA vượt quá 72 giờ,    │                                 ││
│  │ shipment không có cập   │ [💾 Lưu] [✅ Resolve] [❌ Dismiss]││
│  │ nhật từ 3 ngày trước    │                                 ││
│  └─────────────────────────┴──────────────────────────────────┘│
│                                                                │
│  Shipment liên quan                                            │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ TRK-001 │ UPS │ In Transit │ HCM → Singapore │ Trễ 72h  │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  Audit Timeline                                                │
│  ● 15/04 10:30  Exception tạo tự động bởi Detection Engine    │
│  ● 15/04 11:00  Assign cho admin@local.test bởi system        │
│  ● 15/04 12:00  Status -> Investigating bởi admin             │
└──────────────────────────────────────────────────────────────┘
```

### 9.5 Rule Builder (`/admin/rules`)

```
┌──────────────────────────────────────────────────────────────┐
│ Detection Rules                               [+ Tạo rule mới]│
├──────────────────────────────────────────────────────────────┤
│ Name              │ Type    │ Severity │ Active │ Lần cuối    │
│───────────────────┼─────────┼──────────┼────────┼─────────────│
│ Delay > 48h       │ delay   │ HIGH     │ ✅ ON  │ 2h trước    │
│ Lost > 7 ngày     │ lost    │ CRITICAL │ ✅ ON  │ 15m trước   │
│ Damage keywords   │ damage  │ HIGH     │ ✅ ON  │ 1d trước    │
│ Customs VN import │ customs │ MEDIUM   │ ❌ OFF │ --          │
│ Custom: DHL delay │ custom  │ HIGH     │ ✅ ON  │ 5h trước    │
├──────────────────────────────────────────────────────────────┤
│ Row actions: Edit | Duplicate | Toggle | Test | Delete        │
└──────────────────────────────────────────────────────────────┘

Create/Edit Rule Dialog:
┌──────────────────────────────────────────────────────────────┐
│ Tạo Detection Rule                                    [✕]     │
├──────────────────────────────────────────────────────────────┤
│ Tên rule:     [Express delay > 24h                         ]  │
│ Mô tả:        [Phát hiện shipment express bị trễ hơn 24h  ]  │
│ Loại:         [Delay ▾]                                       │
│ Severity:     [High ▾]                                        │
│ Phạm vi:      [Tất cả ▾]  (All / Carrier cụ thể / User)     │
│ Operator:     (●) AND  ( ) OR                                 │
│                                                                │
│ Điều kiện:                                                     │
│ ┌────────────────────────────────────────────────────────┐    │
│ │ 1. [service_level ▾] [in      ▾] [express, priority  ]│    │
│ │ 2. [delay_hours   ▾] [>       ▾] [24                 ]│    │
│ │ 3. [carrier       ▾] [not in  ▾] [GHN                ]│    │
│ │ [+ Thêm điều kiện]                                    │    │
│ └────────────────────────────────────────────────────────┘    │
│                                                                │
│ Cooldown: [60] phút (không phát hiện lại trong khoảng này)    │
│ Active:   [✅]                                                 │
│                                                                │
│ ───── Test Rule ─────                                          │
│ [Chọn shipment mẫu ▾]  [▶ Chạy thử]                         │
│ Kết quả: ✅ Matched - Severity HIGH - "Delay 36h, express"    │
│                                                                │
│                              [Huỷ]  [💾 Lưu rule]             │
└──────────────────────────────────────────────────────────────┘
```

### 9.6 Analytics (`/admin/analytics`)

```
┌──────────────────────────────────────────────────────────────┐
│ Phân tích & Báo cáo     [Date: 01/04 - 15/04 ▾] [📤 Export]  │
├──────────────────────────────────────────────────────────────┤
│ [Tổng quan] [Carrier] [SLA] [Tuyến đường]                     │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│ Tab Tổng quan:                                                 │
│ ┌──────────┬──────────┬──────────┬──────────┐                 │
│ │ Tổng     │ Đã xử lý│ Tỷ lệ   │ Thời gian│                 │
│ │ exception│          │ tự phát  │ xử lý TB │                 │
│ │ 156      │ 134 (86%)│ hiện 92% │ 4.2h     │                 │
│ └──────────┴──────────┴──────────┴──────────┘                 │
│                                                                │
│ Trend exceptions theo ngày (Line chart, có thể chọn type):    │
│ [All ▾] [──Delay ──Lost ──Damage ──Customs]                   │
│ ╭────────────────────────────────────────────────╮            │
│ │                                                │            │
│ │   30─┤      /\                                │            │
│ │      │     /  \    /\                         │            │
│ │   20─┤    /    \──/  \                        │            │
│ │      │   /              \                     │            │
│ │   10─┤──/                \──                  │            │
│ │      │                                        │            │
│ │    0─┴──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──│            │
│ │         01 02 03 04 05 06 07 08 09 10 11 12 13│            │
│ ╰────────────────────────────────────────────────╯            │
│                                                                │
│ Tab Carrier:                                                   │
│ Carrier Performance Ranking:                                   │
│ ┌──────────┬──────────┬──────────┬──────────┬──────────┐      │
│ │ Carrier  │ Shipments│ Exception│ Tỷ lệ   │ Trend    │      │
│ │          │          │ s        │ lỗi     │          │      │
│ │ DHL      │ 340      │ 23       │ 6.8%    │ ↑ 1.2%   │      │
│ │ FedEx    │ 280      │ 18       │ 6.4%    │ ↓ 0.5%   │      │
│ │ UPS      │ 210      │ 12       │ 5.7%    │ ── 0%    │      │
│ └──────────┴──────────┴──────────┴──────────┴──────────┘      │
│                                                                │
│ Tab SLA:                                                       │
│ SLA Breach Analysis:                                           │
│ - Tổng vi phạm: 8 (5.1%)                                     │
│ - Theo severity: Critical 2 / High 3 / Medium 3               │
│ - Thời gian vượt SLA trung bình: 2.5h                         │
│                                                                │
│ Tab Tuyến đường:                                               │
│ Top tuyến có nhiều exceptions:                                 │
│ 1. HCM → Singapore: 15 exceptions (12% shipments)             │
│ 2. HN → Bangkok: 8 exceptions (9% shipments)                  │
│ 3. ĐN → Tokyo: 6 exceptions (7% shipments)                    │
└──────────────────────────────────────────────────────────────┘
```

**Export options**:
- Export CSV: exceptions, shipments, analytics summary
- Export PDF: placeholder (stretch goal)
- Date range áp dụng cho export

### 9.7 User Management (`/admin/users`)

- DataTable: Email, Full name, Company, Role, Status, Last login, Actions
- Actions: Edit role, Toggle active/inactive, View activity
- Edit dialog: role dropdown, company name, is_active toggle
- Không có invite flow v1 (stretch)

### 9.8 Audit Log (`/admin/audit-log`)

- DataTable: Thời gian, User, Hành động, Entity type, Entity ID, Chi tiết
- Filters: User, Action type, Entity type, Date range
- Row expansion: hiển thị JSON details
- Link đến entity (click Entity ID -> navigate đến shipment/exception/rule tương ứng)

### 9.9 Notification Log (`/admin/notifications`)

- DataTable: Thời gian, Exception, Channel, Recipient, Status, Sent at
- Filters: Channel, Status, Date range
- Status badges: Queued (blue), Sent (green), Failed (red), Skipped (gray)
- Row action: Retry (nếu failed) - placeholder

### 9.10 Settings (`/admin/settings`)

**Tabs**: Chung | Tích hợp | SLA | Hệ thống

```
Tab Chung:
- Tên hệ thống
- Logo upload (placeholder)
- Timezone mặc định
- Ngôn ngữ mặc định

Tab Tích hợp:
- n8n URL + connection test button
- Carrier accounts (placeholder list)
- Webhook signing secret (placeholder)
- Slack webhook URL (placeholder)

Tab SLA:
- SLA theo severity: Critical [4]h, High [12]h, Medium [24]h, Low [72]h
- Auto-escalate khi quá hạn: toggle

Tab Hệ thống:
- Health check status: API ✅, DB ✅, Redis ✅, n8n ✅
- Background jobs status (placeholder)
- Cache clear button
- Seed data button (dev only)
```

---

## 10. Docker Compose Setup [DEV-A]

### Services:
- **nginx**: Reverse proxy, route `/api` -> api:8000, `/n8n` -> n8n:5678, `/` -> frontend:3000
- **postgres**: v16, volume persist, init script tạo database
- **redis**: v7, dùng cho cache + pub/sub + rate limiting
- **api**: FastAPI container, depends_on postgres + redis, healthcheck `/api/health`
- **frontend**: Next.js container (production build, standalone output)
- **n8n**: n8n container, basic auth, connect đến postgres chung hoặc riêng

### Volumes:
- `postgres_data`: persist database
- `n8n_data`: persist n8n workflows + credentials
- `redis_data`: persist cache (optional)

### .env.example:
```
# Database
POSTGRES_USER=shipment_user
POSTGRES_PASSWORD=shipment_pass
POSTGRES_DB=shipment_db
DATABASE_URL=postgresql+asyncpg://shipment_user:shipment_pass@postgres:5432/shipment_db

# Auth
JWT_SECRET=change-me-in-production
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440

# Redis
REDIS_URL=redis://redis:6379/0

# n8n
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=admin
N8N_HOST=n8n
N8N_PORT=5678
WEBHOOK_URL=http://nginx/n8n

# Frontend
NEXT_PUBLIC_API_URL=http://localhost/api
NEXT_PUBLIC_APP_NAME=Shipment Exception Detection

# Seed
SEED_ON_STARTUP=true
```

---

## 11. Kế hoạch 3 ngày chi tiết - Phân công theo người

### Mục tiêu tổng thể
Không chỉ có MVP chạy được, mà có source code theo hướng dễ tiếp tục phát triển: tách service layer, nhiều route/screen, để sẵn placeholder cho realtime, notification, analytics, carrier integration và audit log. Scope ưu tiên là demo end-to-end: carrier/n8n ingest shipment -> FastAPI detect exception -> admin/client nhìn thấy -> cập nhật trạng thái -> thống kê/report.

---

### NGÀY 1

#### DEV-A: Backend Foundation

| Thứ tự | Task | Chi tiết | Deliverable |
|--------|------|----------|-------------|
| A1.1 | Docker Compose baseline | `docker-compose.yml` với 6 services, `.env.example`, nginx.conf routing, healthcheck | `docker compose up` chạy được |
| A1.2 | Database models + migrations | Tất cả 7 bảng (users, shipments, shipment_events, exceptions, detection_rules, notifications, audit_logs), enum chuẩn hoá | Alembic migration chạy được |
| A1.3 | Auth system | JWT login/register/me/refresh, password hash bcrypt, role guard middleware (client/admin), dependencies injection | Swagger test login/register |
| A1.4 | Core CRUD APIs | Shipments CRUD, Exceptions CRUD, Rules CRUD, filters + pagination + sort | Swagger test tất cả endpoints |
| A1.5 | Admin APIs | `/admin/summary`, `/admin/shipments`, `/admin/exceptions`, `/admin/users` | Swagger test admin endpoints |
| A1.6 | Detection engine v1 | Delay, lost, damage, customs, wrong_address detection + dedupe | Chạy detection trên seed data, thấy exceptions |
| A1.7 | Seed data | 2 users, 30+ shipments (đủ loại), 5 rules, auto-detect tạo exceptions | DB có dữ liệu phong phú |

**Deliverable cuối Ngày 1 của DEV-A:**
- Docker stack boot được, API docs chạy ở `/api/docs`
- Login admin/client được
- CRUD shipments/exceptions/rules hoạt động
- Detection engine tạo exception từ seed data
- README có lệnh chạy + tài khoản dev

#### DEV-B: Frontend Foundation + Shared Components

| Thứ tự | Task | Chi tiết | Deliverable |
|--------|------|----------|-------------|
| B1.1 | Next.js project init | `create-next-app`, Tailwind config, `globals.css` với CSS custom properties cho theme, shadcn/ui init | Project chạy được |
| B1.2 | Design tokens | Color system (semantic + severity + status), typography scale, spacing, dark/light mode toggle | Theme nhất quán |
| B1.3 | shadcn components install | Button, Input, Dialog, Sheet, Dropdown, Select, Badge, Card, Table, Tabs, Toast, Tooltip, Command, Skeleton, Avatar, Separator | Tất cả base components ready |
| B1.4 | Shared components | DataTable, StatCard, StatusBadge, SeverityBadge, EmptyState, ErrorState, LoadingSkeleton, FilterBar, PageHeader, SearchInput, ConfirmDialog, Timeline, FileDropzone, ThemeToggle | Components với Storybook-like test pages |
| B1.5 | API client + Auth | `lib/api-client.ts` (JWT attach, error handling, refresh), `lib/auth.ts` (context, token management), `hooks/use-auth.ts` | Login flow hoạt động |
| B1.6 | TypeScript types | `types/*.ts` cho tất cả entities, API response types | Type-safe API calls |
| B1.7 | Client layout | Sidebar, Header, Breadcrumb, Mobile responsive nav, ThemeToggle | Layout shell hoàn chỉnh |
| B1.8 | Auth pages | Login, Register, Forgot Password UI (kết nối API nếu DEV-A xong) | Auth flow UI hoàn chỉnh |

**Deliverable cuối Ngày 1 của DEV-B:**
- Frontend chạy được trong Docker
- Design system nhất quán, dark/light mode
- Tất cả shared components ready cho DEV-C dùng
- Login/Register UI hoạt động
- Client layout shell hoàn chỉnh

#### DEV-C: Admin Layout + Components

| Thứ tự | Task | Chi tiết | Deliverable |
|--------|------|----------|-------------|
| C1.1 | Admin layout | AdminSidebar (collapsible, badge counts), AdminHeader, Breadcrumb, admin auth guard (role check) | Admin layout shell |
| C1.2 | Chart components | ChartWrapper (responsive), TrendChart, TypeDistribution, SeverityChart, CarrierRanking, ResolutionTime (dùng Recharts) | 5 chart components với mock data |
| C1.3 | Admin-specific components | MetricCard (với trend indicator), DateRangePicker, ActivityFeed, BulkActionToolbar, SLATimer, ConditionBuilder (cho rules) | Components ready |
| C1.4 | Admin Dashboard mock | Dashboard page với mock data: 4 KPI cards, 4 charts, recent exceptions table | Dashboard UI hoàn chỉnh (mock data) |

**Deliverable cuối Ngày 1 của DEV-C:**
- Admin layout shell hoàn chỉnh, collapsible sidebar
- Chart components tái sử dụng
- Admin Dashboard hiển thị đẹp với mock data
- Tất cả admin-specific components ready

---

### NGÀY 2

#### DEV-A: Advanced API + n8n

| Thứ tự | Task | Chi tiết | Deliverable |
|--------|------|----------|-------------|
| A2.1 | CSV upload API | Parse CSV, validate columns, row-level errors, upsert by tracking_number + carrier, run detection sau import, trả summary | Upload endpoint hoạt động |
| A2.2 | Analytics APIs | `/analytics/trends`, `/analytics/carriers`, `/analytics/types`, `/analytics/severity`, `/analytics/sla`, `/analytics/resolution-time` | 6 analytics endpoints |
| A2.3 | Export APIs | `/export/exceptions`, `/export/shipments` (CSV download với filters) | Export hoạt động |
| A2.4 | SSE endpoint | `/events/stream` - push events khi exception mới, status update | SSE stream hoạt động |
| A2.5 | Batch detection + rule test | `/detection/run-batch`, `/detection/test-rule` | Batch + test endpoints |
| A2.6 | Bulk operations | `/admin/exceptions/bulk` (bulk assign, resolve, dismiss) | Bulk endpoint hoạt động |
| A2.7 | n8n workflows | 3 workflow JSON files (carrier webhook, scheduled check, notification router) | Import được vào n8n |
| A2.8 | Frontend integration support | Fix CORS issues, response format adjustments, thêm endpoints theo yêu cầu DEV-B/C | API sẵn sàng cho frontend |

**Deliverable cuối Ngày 2 của DEV-A:**
- Tất cả API endpoints hoàn thiện
- CSV upload + analytics + export hoạt động
- SSE realtime events
- n8n workflows import và demo được
- API sẵn sàng cho frontend kết nối

#### DEV-B: Client Portal Pages

| Thứ tự | Task | Chi tiết | Deliverable |
|--------|------|----------|-------------|
| B2.1 | Client Dashboard | 4 KPI StatCards, Quick tracking search, Recent exceptions panel, Shipments cần chú ý panel, kết nối API thật | Dashboard hoạt động |
| B2.2 | Shipments List | DataTable với sort/filter/pagination, search by tracking, status/carrier filters, row click -> detail, view toggle (table/card), mobile responsive | Shipments page hoàn chỉnh |
| B2.3 | Shipment Detail | Tabbed layout (Tổng quan/Timeline/Exceptions/Raw data), info cards, Timeline component, Exception cards, JSON viewer | Detail page hoạt động |
| B2.4 | Exceptions page | DataTable, filters (type/severity/status), click -> slide-over Sheet detail, dismiss action | Exceptions page hoạt động |
| B2.5 | Upload Center | 4-step wizard (chọn file -> preview -> import -> kết quả), FileDropzone, preview table, validation errors, import summary | Upload flow end-to-end |
| B2.6 | Hooks hoàn thiện | `use-shipments`, `use-exceptions` (React Query/SWR), loading/error/empty states cho tất cả pages | Data fetching nhất quán |
| B2.7 | Integration test | Login client -> dashboard -> shipments -> detail -> exceptions -> upload -> verify data flow | Luồng client hoạt động end-to-end |

**Deliverable cuối Ngày 2 của DEV-B:**
- Tất cả client pages kết nối API thật
- Loading/error/empty states đầy đủ
- Upload CSV end-to-end
- Luồng client hoạt động hoàn chỉnh

#### DEV-C: Admin Pages

| Thứ tự | Task | Chi tiết | Deliverable |
|--------|------|----------|-------------|
| C2.1 | Admin Dashboard kết nối API | Thay mock data bằng API thật, date range picker functional, auto-refresh, click drill-down | Dashboard live data |
| C2.2 | Admin Shipments | DataTable nâng cao, create/edit dialog, bulk actions (run detection, export, delete), row action menu | Shipment management hoạt động |
| C2.3 | Exception Queue | Priority sorting, filters đầy đủ, SLA timer, bulk actions (assign/resolve/dismiss), status update inline | Exception queue hoạt động |
| C2.4 | Exception Detail | Full detail page: info + actions panel, assign dropdown, status change, root cause + resolution note textarea, audit timeline, linked shipment | Exception detail hoạt động |
| C2.5 | Rule Builder | DataTable list, Create/Edit dialog với ConditionBuilder visual, toggle active, test rule với kết quả, duplicate rule | Rule CRUD hoạt động |
| C2.6 | User Management | DataTable, edit role dialog, toggle active, activity log (placeholder) | User management hoạt động |
| C2.7 | Integration test | Login admin -> dashboard -> shipments -> exceptions -> resolve -> rules -> users -> verify flow | Luồng admin hoạt động end-to-end |

**Deliverable cuối Ngày 2 của DEV-C:**
- Tất cả admin pages chính kết nối API thật
- Exception queue với SLA timer
- Rule builder visual
- Luồng admin hoạt động hoàn chỉnh

---

### NGÀY 3

#### DEV-A: Detection hoàn thiện + Production hardening

| Thứ tự | Task | Chi tiết | Deliverable |
|--------|------|----------|-------------|
| A3.1 | Detection engine full | Hoàn thiện tất cả exception types, custom rules evaluation, risk scoring | Detection đầy đủ |
| A3.2 | Performance optimization | Query optimization (indexes, eager loading), Redis caching, response time < 200ms | API nhanh |
| A3.3 | Docker production build | `Dockerfile.prod` cho api + frontend, `docker-compose.prod.yml`, `nginx.prod.conf` | Production build hoạt động |
| A3.4 | Security hardening | Rate limiting, CORS strict, input validation, SQL injection prevention, security headers trong nginx | Bảo mật cơ bản |
| A3.5 | Documentation | README đầy đủ (run guide, API contract, demo script), `.env.example`, sample CSV, sample webhook payload | Docs hoàn chỉnh |
| A3.6 | E2E integration test | Full demo flow: boot -> seed -> login -> ingest -> detect -> resolve -> analytics | Demo chạy mượt |

#### DEV-B: Client polish + Realtime + Accessibility

| Thứ tự | Task | Chi tiết | Deliverable |
|--------|------|----------|-------------|
| B3.1 | Profile/Settings page | 3 tabs (Tài khoản/Thông báo/Bảo mật), form validation, save API | Profile hoạt động |
| B3.2 | Notification Center | Bell icon badge, dropdown 5 gần nhất, full page list, mark as read, filter | Notifications hoạt động |
| B3.3 | Command Palette | Cmd+K, search shipments/exceptions, quick navigate, recent searches | Command palette hoạt động |
| B3.4 | SSE integration | `hooks/use-sse.ts`, toast khi có exception mới, auto-refresh dashboard/lists | Realtime updates |
| B3.5 | Responsive polish | Test mobile/tablet/desktop cho tất cả pages, fix layout issues, bottom nav mobile | Responsive hoàn chỉnh |
| B3.6 | Accessibility + animations | Focus rings, ARIA labels, keyboard navigation, page transitions, skeleton animations, reduced motion support | a11y + polish |
| B3.7 | Error boundaries | Global error boundary, per-page error fallbacks, 404 page, network error handling | Error handling đầy đủ |

#### DEV-C: Admin polish + Analytics + Settings

| Thứ tự | Task | Chi tiết | Deliverable |
|--------|------|----------|-------------|
| C3.1 | Analytics page | 4 tabs (Tổng quan/Carrier/SLA/Tuyến đường), interactive charts, date range functional, export CSV | Analytics hoàn chỉnh |
| C3.2 | Audit Log page | DataTable, filters, row expansion JSON details, entity linking | Audit log hoạt động |
| C3.3 | Notification Log | DataTable, status badges, filters | Notification log hoạt động |
| C3.4 | Settings page | 4 tabs (Chung/Tích hợp/SLA/Hệ thống), health check indicators, SLA config, save API | Settings hoạt động |
| C3.5 | SSE integration admin | Notification bell real-time, toast critical exceptions, dashboard auto-refresh | Admin realtime |
| C3.6 | Dark mode verification | Test tất cả admin pages trong dark mode, fix contrast issues, chart colors | Dark mode hoàn chỉnh |
| C3.7 | Admin responsive polish | Test mobile/tablet, fix admin-specific layout issues | Admin responsive |
| C3.8 | Cross-browser test | Test Chrome, Firefox, Safari (nếu có), fix issues | Cross-browser OK |

---

### Checklist tích hợp cuối mỗi ngày

**Cuối Ngày 1:**
- [ ] `docker compose up --build` chạy thành công
- [ ] `/api/docs` hiển thị Swagger
- [ ] `/api/health` trả `200 OK`
- [ ] Login admin/client thành công qua Swagger
- [ ] Frontend hiển thị ở `/` với client layout
- [ ] Frontend hiển thị ở `/admin` với admin layout
- [ ] Dark/light mode toggle hoạt động
- [ ] Shared components render đúng

**Cuối Ngày 2:**
- [ ] Login client -> thấy dashboard với dữ liệu thật
- [ ] Client xem shipments -> detail -> timeline
- [ ] Client xem exceptions -> detail
- [ ] Client upload CSV -> thấy shipments mới
- [ ] Login admin -> thấy dashboard charts với dữ liệu thật
- [ ] Admin quản lý shipments (CRUD)
- [ ] Admin xử lý exception (assign, resolve, dismiss)
- [ ] Admin tạo/sửa detection rule
- [ ] n8n workflow import được và gọi API thành công

**Cuối Ngày 3:**
- [ ] Demo end-to-end chạy mượt trên Docker
- [ ] Tất cả trang client responsive trên mobile
- [ ] Tất cả trang admin responsive trên tablet+
- [ ] Dark mode hoạt động đúng trên tất cả trang
- [ ] SSE realtime: exception mới -> toast + badge update
- [ ] Analytics charts interactive, export hoạt động
- [ ] Cmd+K command palette hoạt động
- [ ] README đủ để người khác clone và chạy
- [ ] Không có console error / unhandled promise rejection

---

## 12. Feature backlog mở rộng sau 3 ngày

Nếu còn thời gian hoặc muốn scale tiếp:

- Carrier adapters: DHL/FedEx/UPS/GHN/GHTK mock clients
- Map view cho shipment route (Mapbox / Google Maps)
- Multi-tenant company isolation nâng cao
- SLA policy per carrier/service level
- Email template editor (WYSIWYG)
- Webhook signing secret cho n8n/carrier
- Background worker riêng cho detection batch (Celery/ARQ)
- Unit tests cho detection engine và rule evaluator
- Playwright E2E tests cho client/admin
- Role permissions chi tiết: viewer/operator/admin
- Audit log UI và changelog per entity
- i18n (đa ngôn ngữ)
- PWA support (offline, push notifications)
- API versioning (v1/v2)
- GraphQL layer (stretch)

## 13. Ưu tiên khi bị thiếu thời gian

1. Giữ Docker + API + auth + seed + detection core chạy ổn định
2. Ưu tiên admin exception queue và client shipment tracking hơn các chart đẹp
3. Ưu tiên CSV ingest và n8n webhook hơn realtime nếu thiếu thời gian
4. Ưu tiên README/demo script để nghiệm thu được trong 3 ngày
5. DEV-B/C: nếu thiếu thời gian, dùng mock data cho charts/analytics, ưu tiên CRUD flows
