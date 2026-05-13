-- Thông tin khách hàng + ngữ cảnh đơn để vận hành xử lý case có dữ liệu thật
ALTER TABLE shipments
  ADD COLUMN IF NOT EXISTS recipient_name TEXT,
  ADD COLUMN IF NOT EXISTS recipient_phone TEXT,
  ADD COLUMN IF NOT EXISTS recipient_address TEXT,
  ADD COLUMN IF NOT EXISTS cod_amount NUMERIC(12, 0),
  ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(6, 2),
  ADD COLUMN IF NOT EXISTS package_count INT,
  ADD COLUMN IF NOT EXISTS product_summary TEXT,
  ADD COLUMN IF NOT EXISTS last_scan_location TEXT,
  ADD COLUMN IF NOT EXISTS last_scan_note TEXT;

CREATE INDEX IF NOT EXISTS idx_shipments_recipient_phone ON shipments(recipient_phone);
