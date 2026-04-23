export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type ExceptionType = "delay" | "failed_delivery" | "stuck" | "address_issue";
export type ExceptionStatus =
  | "open"
  | "notified"
  | "in_progress"
  | "waiting_manager_review"
  | "returned_to_ops"
  | "resolved"
  | "investigating";

export interface ExceptionItem {
  id: string;
  shipment_id: string;
  tracking_number: string;
  carrier: string;
  origin: string;
  destination: string;
  exception_type: ExceptionType;
  severity: Severity;
  reason: string;
  overdue_hours: number;
  ai_suggestion: string;
  confidence: number;
  status: ExceptionStatus;
  detected_at: string;
  notified_at?: string | null;
  channels_sent?: string[] | null;
  is_escalated?: boolean;
  resolution_note?: string | null;
  assignee?: string | null;
  assigned_at?: string | null;
  assigned_team?: string | null;
  deadline_at?: string | null;
  sla_breached?: boolean;
}

export interface TimelineEvent {
  timestamp: string;
  event: string;
  description: string;
}
