-- S5 demo dataset: 12 records covering all severity bands.
-- Safe to rerun: UPSERT by tracking_number.

INSERT INTO shipments (tracking_number, carrier, origin, destination, expected_delivery, actual_delivery, status, failed_attempts, last_updated)
VALUES
  ('TRK-S5-0001', 'GHN', 'Ha Noi', 'Da Nang', NOW() - INTERVAL '72 hour', NULL, 'in_transit', 0, NOW() - INTERVAL '4 hour'),
  ('TRK-S5-0002', 'GHTK', 'Ha Noi', 'Hue', NOW() - INTERVAL '55 hour', NULL, 'in_transit', 1, NOW() - INTERVAL '2 hour'),
  ('TRK-S5-0003', 'VNPOST', 'HCM', 'Can Tho', NOW() - INTERVAL '18 hour', NULL, 'in_transit', 2, NOW() - INTERVAL '1 hour'),
  ('TRK-S5-0004', 'J&T', 'Da Nang', 'Ha Noi', NOW() - INTERVAL '8 hour', NULL, 'failed_delivery', 2, NOW() - INTERVAL '2 hour'),
  ('TRK-S5-0005', 'GHN', 'HCM', 'Ha Noi', NOW() + INTERVAL '5 hour', NULL, 'address_issue', 0, NOW() - INTERVAL '20 minute'),
  ('TRK-S5-0006', 'GHTK', 'Ha Noi', 'Quang Ninh', NOW() - INTERVAL '4 hour', NULL, 'in_transit', 0, NOW() - INTERVAL '30 minute'),
  ('TRK-S5-0007', 'VNPOST', 'Hue', 'Da Nang', NOW() - INTERVAL '90 hour', NULL, 'stuck', 1, NOW() - INTERVAL '8 hour'),
  ('TRK-S5-0008', 'J&T', 'Can Tho', 'HCM', NOW() - INTERVAL '30 hour', NULL, 'in_transit', 0, NOW() - INTERVAL '3 hour'),
  ('TRK-S5-0009', 'GHN', 'Hai Phong', 'Ha Noi', NOW() - INTERVAL '2 hour', NULL, 'in_transit', 0, NOW() - INTERVAL '15 minute'),
  ('TRK-S5-0010', 'GHTK', 'Da Nang', 'Nha Trang', NOW() - INTERVAL '65 hour', NULL, 'failed_delivery', 3, NOW() - INTERVAL '6 hour'),
  ('TRK-S5-0011', 'VNPOST', 'Ha Noi', 'Vinh', NOW() - INTERVAL '14 hour', NULL, 'address_issue', 0, NOW() - INTERVAL '50 minute'),
  ('TRK-S5-0012', 'J&T', 'HCM', 'Da Lat', NOW() - INTERVAL '45 hour', NULL, 'in_transit', 1, NOW() - INTERVAL '5 hour')
ON CONFLICT (tracking_number) DO UPDATE
SET carrier = EXCLUDED.carrier,
    origin = EXCLUDED.origin,
    destination = EXCLUDED.destination,
    expected_delivery = EXCLUDED.expected_delivery,
    actual_delivery = EXCLUDED.actual_delivery,
    status = EXCLUDED.status,
    failed_attempts = EXCLUDED.failed_attempts,
    last_updated = EXCLUDED.last_updated;

INSERT INTO exceptions (shipment_id, exception_type, reason, severity_hint, overdue_hours, severity, ai_suggestion, confidence, fallback_used, status, notified_at, channels_sent, is_escalated, classified_at)
SELECT
  s.id,
  e.exception_type,
  e.reason,
  e.severity_hint,
  e.overdue_hours,
  e.severity,
  e.ai_suggestion,
  e.confidence,
  e.fallback_used,
  e.status,
  CASE WHEN e.status = 'notified' THEN NOW() - INTERVAL '1 hour' ELSE NULL END,
  e.channels_sent,
  e.is_escalated,
  NOW() - INTERVAL '40 minute'
FROM shipments s
JOIN (
  VALUES
    ('TRK-S5-0001', 'delay', 'Overdue > 72h, SLA breach critical', 'CRITICAL', 72.0, 'CRITICAL', 'Call carrier manager now and provide ETA in 30m', 0.93, FALSE, 'notified', ARRAY['telegram_ops','telegram_manager','email']::TEXT[], TRUE),
    ('TRK-S5-0002', 'delay', 'Overdue > 48h', 'HIGH', 55.0, 'CRITICAL', 'Escalate to manager due to SLA breach', 0.88, FALSE, 'notified', ARRAY['telegram_ops','telegram_manager','email']::TEXT[], TRUE),
    ('TRK-S5-0003', 'failed_delivery', '2 failed attempts', 'HIGH', 18.0, 'HIGH', 'Call recipient and retry today', 0.81, FALSE, 'open', NULL::TEXT[], FALSE),
    ('TRK-S5-0004', 'failed_delivery', 'Recipient unavailable', 'HIGH', 8.0, 'HIGH', 'Schedule redelivery in next slot', 0.77, FALSE, 'open', NULL::TEXT[], FALSE),
    ('TRK-S5-0005', 'address_issue', 'Missing apartment number', 'MEDIUM', 0.0, 'MEDIUM', 'Verify address with sender before dispatch', 0.75, FALSE, 'open', NULL::TEXT[], FALSE),
    ('TRK-S5-0006', 'delay', 'Slight delay under SLA', 'MEDIUM', 4.0, 'MEDIUM', 'Monitor route and notify recipient', 0.69, TRUE, 'investigating', NULL::TEXT[], FALSE),
    ('TRK-S5-0007', 'stuck', 'No movement > 90h', 'CRITICAL', 90.0, 'CRITICAL', 'Open urgent ticket with carrier control room', 0.95, FALSE, 'notified', ARRAY['telegram_ops','telegram_manager','email']::TEXT[], TRUE),
    ('TRK-S5-0008', 'delay', 'Overdue 30h', 'HIGH', 30.0, 'HIGH', 'Prioritize on next trunk dispatch', 0.8, FALSE, 'open', NULL::TEXT[], FALSE),
    ('TRK-S5-0009', 'delay', 'Minor scan delay', 'LOW', 2.0, 'LOW', 'No action needed, keep monitoring', 0.62, TRUE, 'open', NULL::TEXT[], FALSE),
    ('TRK-S5-0010', 'failed_delivery', '3 failed attempts and >48h overdue', 'CRITICAL', 65.0, 'CRITICAL', 'Escalate and coordinate reroute immediately', 0.9, FALSE, 'notified', ARRAY['telegram_ops','telegram_manager','email']::TEXT[], TRUE),
    ('TRK-S5-0011', 'address_issue', 'Ward code mismatch', 'MEDIUM', 14.0, 'MEDIUM', 'Ask customer to reconfirm full address', 0.72, FALSE, 'investigating', NULL::TEXT[], FALSE),
    ('TRK-S5-0012', 'delay', 'Overdue 45h close to SLA threshold', 'HIGH', 45.0, 'HIGH', 'Call carrier and prepare escalation if >48h', 0.79, FALSE, 'open', NULL::TEXT[], FALSE)
) AS e(tracking_number, exception_type, reason, severity_hint, overdue_hours, severity, ai_suggestion, confidence, fallback_used, status, channels_sent, is_escalated)
  ON s.tracking_number = e.tracking_number
WHERE NOT EXISTS (
  SELECT 1
  FROM exceptions x
  WHERE x.shipment_id = s.id
    AND x.reason = e.reason
);
