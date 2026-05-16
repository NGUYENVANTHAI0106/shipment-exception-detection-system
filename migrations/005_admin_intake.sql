-- Hai bảng phục vụ luồng admin nhập tay đơn hàng vào Postgres (ngoài ingest từ mock/WF).
-- shipments vẫn là "đơn" chính; admin_shipment_entries gắn nguồn gốc manual + ai tạo.

CREATE TABLE IF NOT EXISTS admin_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_shipment_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_account_id UUID NOT NULL REFERENCES admin_accounts(id) ON DELETE RESTRICT,
  shipment_id UUID NOT NULL UNIQUE REFERENCES shipments(id) ON DELETE CASCADE,
  intake_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_shipment_entries_admin ON admin_shipment_entries(admin_account_id);
CREATE INDEX IF NOT EXISTS idx_admin_shipment_entries_created_at ON admin_shipment_entries(created_at DESC);

-- Khớp tài khoản demo đăng nhập JWT (username admin / legacy map về admin).
INSERT INTO admin_accounts (username, display_name)
VALUES ('admin', 'Administrator')
ON CONFLICT (username) DO NOTHING;
