export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type ExceptionType = "delay" | "failed_delivery" | "stuck" | "address_issue";
export type ExceptionStatus = "open" | "in_progress" | "resolved";

export interface ExceptionItem {
  id: string;
  shipment_id: string;
  tracking_number: string;
  carrier: string;
  origin: string;
  destination: string;
  shipment_status?: string | null;
  failed_attempts?: number;
  shipment_last_updated?: string | null;
  exception_type: ExceptionType;
  severity: Severity;
  reason: string;
  overdue_hours: number;
  ai_suggestion: string;
  confidence: number;
  fallback_used?: boolean;
  status: ExceptionStatus;
  detected_at: string;
  expected_delivery?: string | null;
  notified_at?: string | null;
  channels_sent?: string[] | null;
  resolution_note?: string | null;
  resolved_at?: string | null;
  assignee?: string | null;
  assigned_at?: string | null;
  deadline_at?: string | null;
  sla_breached?: boolean;
  recipient_name?: string | null;
  recipient_phone?: string | null;
  recipient_address?: string | null;
  cod_amount?: number | null;
  weight_kg?: number | null;
  package_count?: number | null;
  product_summary?: string | null;
  last_scan_location?: string | null;
  last_scan_note?: string | null;
}

export type CustomerTemplate = "reschedule" | "verify_address" | "confirm_failed";

export interface CustomerNotifyResult {
  exception: ExceptionItem;
  delivery: { channel: string; success: boolean; error?: string };
  title: string;
  body: string;
}

export interface Stats {
  open_total: number;
  critical_total: number;
  breached_total: number;
  unassigned_total: number;
  resolved_24h: number;
}
