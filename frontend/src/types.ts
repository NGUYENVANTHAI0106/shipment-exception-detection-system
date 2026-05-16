export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type ExceptionType = "delay" | "failed_delivery" | "stuck" | "address_issue";
export type ExceptionStatus = "open" | "in_progress" | "resolved";

/** Body gửi lên POST /api/admin/shipments */
export interface ManualShipmentCreatePayload {
  tracking_number: string;
  carrier: string;
  origin: string;
  destination: string;
  expected_delivery: string;
  status?: string;
  failed_attempts?: number;
  actual_delivery?: string | null;
  recipient_name?: string | null;
  recipient_phone?: string | null;
  recipient_address?: string | null;
  cod_amount?: number | null;
  weight_kg?: number | null;
  package_count?: number | null;
  product_summary?: string | null;
  last_scan_location?: string | null;
  last_scan_note?: string | null;
  intake_note?: string | null;
}

export interface ManualShipmentCreateResult {
  shipment_id: string;
  submission_id: string;
  tracking_number: string;
  created_by_username: string;
}

/** Một dòng từ GET /api/shipments */
export interface ShipmentListItem {
  id: string;
  tracking_number: string;
  carrier: string;
  origin: string;
  destination: string;
  status: string;
  failed_attempts: number;
  expected_delivery: string | null;
  actual_delivery: string | null;
  last_updated: string | null;
  created_at: string | null;
  open_exception_count: number;
  total_exception_count: number;
  primary_open_exception_id: string | null;
  manual_entry: boolean;
}

/** GET /api/shipments/:id — đủ cột chỉnh sửa */
export interface ShipmentDetail extends ShipmentListItem {
  recipient_name: string | null;
  recipient_phone: string | null;
  recipient_address: string | null;
  cod_amount: number | null;
  weight_kg: number | null;
  package_count: number | null;
  product_summary: string | null;
  last_scan_location: string | null;
  last_scan_note: string | null;
  submission_id: string | null;
  intake_note: string | null;
  admin_entry_created_at: string | null;
}

/** PATCH /api/shipments/:id — chỉ gửi field cần đổi */
export interface ShipmentUpdatePayload {
  tracking_number?: string;
  carrier?: string;
  origin?: string;
  destination?: string;
  expected_delivery?: string;
  actual_delivery?: string | null;
  status?: string;
  failed_attempts?: number;
  recipient_name?: string | null;
  recipient_phone?: string | null;
  recipient_address?: string | null;
  cod_amount?: number | null;
  weight_kg?: number | null;
  package_count?: number | null;
  product_summary?: string | null;
  last_scan_location?: string | null;
  last_scan_note?: string | null;
  intake_note?: string | null;
}

export interface ManualExceptionCreatePayload {
  shipment_id: string;
  exception_type: ExceptionType;
  reason: string;
  severity_hint: Severity;
  overdue_hours?: number;
}

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
  /** Ghi chú vận hành từ Sửa vận đơn (đồng bộ, kể cả đơn hệ thống). */
  intake_note?: string | null;
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
