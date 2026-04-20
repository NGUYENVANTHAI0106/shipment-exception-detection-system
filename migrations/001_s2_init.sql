CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_number TEXT NOT NULL UNIQUE,
  carrier TEXT NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  expected_delivery TIMESTAMPTZ NOT NULL,
  actual_delivery TIMESTAMPTZ,
  status TEXT NOT NULL,
  failed_attempts INT NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  exception_type TEXT NOT NULL,
  reason TEXT NOT NULL,
  severity_hint TEXT NOT NULL,
  overdue_hours NUMERIC(8,2) NOT NULL DEFAULT 0,
  severity TEXT,
  ai_suggestion TEXT,
  confidence NUMERIC(4,3),
  fallback_used BOOLEAN DEFAULT FALSE,
  classified_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'open',
  notified_at TIMESTAMPTZ,
  channels_sent TEXT[],
  is_escalated BOOLEAN NOT NULL DEFAULT FALSE,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exceptions_status ON exceptions(status);
CREATE INDEX IF NOT EXISTS idx_exceptions_severity ON exceptions(severity);
CREATE INDEX IF NOT EXISTS idx_exceptions_shipment_id ON exceptions(shipment_id);
CREATE INDEX IF NOT EXISTS idx_exceptions_detected_at ON exceptions(detected_at DESC);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exception_id UUID NOT NULL REFERENCES exceptions(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  actor TEXT NOT NULL DEFAULT 'system',
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
