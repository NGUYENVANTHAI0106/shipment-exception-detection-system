ALTER TABLE exceptions
  ADD COLUMN IF NOT EXISTS assignee TEXT,
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS assigned_team TEXT,
  ADD COLUMN IF NOT EXISTS deadline_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sla_breached BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_exceptions_assignee ON exceptions(assignee);
CREATE INDEX IF NOT EXISTS idx_exceptions_deadline_at ON exceptions(deadline_at);
CREATE INDEX IF NOT EXISTS idx_exceptions_sla_breached ON exceptions(sla_breached);
