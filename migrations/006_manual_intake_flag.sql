-- Phân biệt đơn tạo từ luồng «Thêm đơn tay» (= manual_intake) với đơn hệ thống/nguồn khác,
-- và ghi nhận ghi chú vận hành không làm sai lệch cột «Nguồn».

ALTER TABLE shipments
  ADD COLUMN IF NOT EXISTS manual_intake BOOLEAN NOT NULL DEFAULT FALSE;

-- Heuristic một lần: dòng admin_shipment_entries tạo cùng lúc (±120s với shipments.created_at)
-- xem là đơn nguồn nhập tay; đơn hệ thống chỉ được sửa ghi chú sau này sẽ không bị đánh dấu.
UPDATE shipments s
SET manual_intake = TRUE
FROM admin_shipment_entries e
WHERE e.shipment_id = s.id
  AND s.manual_intake = FALSE
  AND ABS(EXTRACT(EPOCH FROM (e.created_at - s.created_at))) <= 120;
