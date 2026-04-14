# Shipment Exception Detection System (Day 1)

## Chạy nhanh (Docker)

Nếu máy bạn có Docker daemon + Compose:

```bash
docker-compose up --build
```

Sau đó mở:

- API health: `http://localhost:8080/api/health`
- Swagger: `http://localhost:8080/api/docs`
- Frontend: `http://localhost:8080/`
- n8n: `http://localhost:8080/n8n/`

Nếu bạn bị lỗi cổng `5678` (n8n) đã bị chiếm, chạy với cổng host khác:

```bash
N8N_HOST_PORT=5679 docker-compose up --build
```

Nếu bạn bị lỗi cổng `80` (nginx) đã bị chiếm, đổi cổng host của nginx (mặc định đã là `8080`):

```bash
NGINX_HOST_PORT=8080 docker-compose up --build
```

## Tài khoản seed (dev)

Khi `APP_SEED_ON_STARTUP=1` (mặc định trong `docker-compose.yml`), hệ thống sẽ tự seed:

- Admin: `admin@local.test` / `Admin123!`
- Client: `client@local.test` / `Client123!`

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

