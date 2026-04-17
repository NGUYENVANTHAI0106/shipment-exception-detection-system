# Shipment Exception Detection System

Hệ thống phát hiện shipment exceptions gồm:

- **Backend**: FastAPI (`/api/*`)
- **Frontend**: Next.js (Client + Admin)
- **Orchestrator**: n8n (`/n8n/*`)
- **Infra**: nginx reverse proxy, Postgres, Redis

## Chạy dự án bằng Docker (khuyến nghị)

Nếu máy bạn có Docker daemon + Compose:

1. Tạo file env:

```bash
cp .env.example .env
```

2. Chạy stack:

```bash
docker compose up --build
```

Sau khi chạy xong, truy cập (mặc định nginx publish ra cổng **8080**):

- **Client portal**: `http://localhost:8080/`
- **Admin dashboard**: `http://localhost:8080/admin`
- **API health**: `http://localhost:8080/api/health`
- **Swagger (API docs)**: `http://localhost:8080/api/docs`
- **n8n UI**: `http://localhost:8080/n8n/`

### Đổi cổng nếu bị trùng port

- **Đổi cổng nginx (mặc định 8080)**:

```bash
NGINX_HOST_PORT=8080 docker compose up --build
```

- **Đổi cổng n8n publish ra host (mặc định 5679 → container 5678)**:

```bash
N8N_HOST_PORT=5679 docker compose up --build
```

## Tài khoản seed (dev)

Khi `APP_SEED_ON_STARTUP=1` (mặc định trong `docker-compose.yml`), hệ thống sẽ tự seed:

- Admin: `admin@local.test` / `Admin123!`
- Client: `client@local.test` / `Client123!`

## Tắt / dừng Docker

- **Dừng containers (giữ data volumes)**:

```bash
docker compose down
```

- **Dừng và xoá luôn volumes (xoá DB data / redis / n8n data)**:

```bash
docker compose down -v
```

## Runbook nhanh (Day 1 - DEV-A)

- **Healthcheck nhanh**:
  - `GET /api/health` → `http://localhost:8080/api/health`
- **Reset data demo** (xoá DB + redis + n8n):
  - `docker compose down -v` rồi `docker compose up --build`
- **Seed data**:
  - bật/tắt bằng `APP_SEED_ON_STARTUP=1|0` trong `.env`

## Test nhanh trên Swagger

1. Vào `/api/docs`
2. `POST /api/auth/login` dùng **Authorize** (OAuth2 password):
   - username: `admin@local.test`
   - password: `Admin123!`
3. Tạo shipment qua `POST /api/shipments/` (client token) hoặc ingest qua `POST /api/shipments/ingest` (admin token)
4. Xem exceptions qua `GET /api/exceptions/`

## n8n (Day 2)

Trong thư mục `n8n/workflows/` đã có 3 workflow JSON mẫu để import:

- `webhook-receiver.json`: Webhook `/carrier-webhook` → gọi `/api/shipments/ingest`
- `scheduled-check.json`: Cron 15 phút (placeholder) → ping `/api/health`
- `notification-router.json`: Webhook `/exception-notify` (placeholder)

Import trong n8n UI: `http://localhost:8080/n8n/` → **Workflows** → **Import from File**.

## Ghi chú routing (nginx)

- `/` và `/admin` → Next.js frontend
- `/api/*` → FastAPI backend
- `/n8n/*` → n8n

