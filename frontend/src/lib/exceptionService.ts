import type {
  CustomerNotifyResult,
  CustomerTemplate,
  ExceptionItem,
  ExceptionStatus,
  ManualExceptionCreatePayload,
  ManualShipmentCreatePayload,
  ManualShipmentCreateResult,
  ShipmentDetail,
  ShipmentListItem,
  ShipmentUpdatePayload,
  Stats,
} from "../types";
import { getAuthToken } from "../auth";

function withAuthHeaders(options?: RequestInit): RequestInit {
  const token = getAuthToken();
  const headers = new Headers(options?.headers ?? {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return { ...options, headers };
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, withAuthHeaders(options));
  if (!response.ok) {
    let detail: string | undefined;
    try {
      const body = (await response.json()) as { detail?: string };
      detail = body?.detail;
    } catch {
      /* ignore parse error */
    }
    throw new Error(detail || `Yêu cầu thất bại (${response.status}).`);
  }
  return (await response.json()) as T;
}

export async function listExceptions(): Promise<ExceptionItem[]> {
  return apiFetch<ExceptionItem[]>(`/api/exceptions?ts=${Date.now()}`, { cache: "no-store" });
}

export async function getExceptionById(id: string): Promise<ExceptionItem | null> {
  return apiFetch<ExceptionItem>(`/api/exceptions/${id}?ts=${Date.now()}`, { cache: "no-store" });
}

export async function updateException(
  id: string,
  patch: Partial<Pick<ExceptionItem, "status" | "resolution_note">>,
): Promise<ExceptionItem | null> {
  return apiFetch<ExceptionItem>(`/api/exceptions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
}

export async function claimException(id: string): Promise<ExceptionItem | null> {
  return apiFetch<ExceptionItem>(`/api/exceptions/${id}/claim`, { method: "POST" });
}

export async function bulkClaim(ids: string[]): Promise<{ success: number; failed: number }> {
  const results = await Promise.allSettled(ids.map((id) => claimException(id)));
  const success = results.filter((r) => r.status === "fulfilled").length;
  return { success, failed: ids.length - success };
}

export async function bulkSetStatus(
  ids: string[],
  status: ExceptionStatus,
): Promise<{ success: number; failed: number }> {
  const results = await Promise.allSettled(ids.map((id) => updateException(id, { status })));
  const success = results.filter((r) => r.status === "fulfilled").length;
  return { success, failed: ids.length - success };
}

export interface AuditLogItem {
  id: string;
  exception_id: string;
  action: string;
  actor: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export async function listAuditLogs(exceptionId: string): Promise<AuditLogItem[]> {
  return apiFetch<AuditLogItem[]>(
    `/api/audit-logs?exception_id=${exceptionId}&ts=${Date.now()}`,
    { cache: "no-store" },
  );
}

export async function getStats(): Promise<Stats> {
  return apiFetch<Stats>(`/api/stats?ts=${Date.now()}`, { cache: "no-store" });
}

export async function notifyCustomer(
  id: string,
  template: CustomerTemplate,
): Promise<CustomerNotifyResult> {
  return apiFetch<CustomerNotifyResult>(`/api/exceptions/${id}/customer-notify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ template }),
  });
}

export async function createManualShipment(
  payload: ManualShipmentCreatePayload,
): Promise<ManualShipmentCreateResult> {
  return apiFetch<ManualShipmentCreateResult>("/api/admin/shipments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export type ShipmentOnlyFilter = "all" | "healthy" | "has_issue";

export async function listShipments(
  opts?: { limit?: number; only?: ShipmentOnlyFilter },
): Promise<ShipmentListItem[]> {
  const limit = opts?.limit ?? 500;
  const only = opts?.only ?? "all";
  const q = new URLSearchParams({ limit: String(limit), only });
  return apiFetch<ShipmentListItem[]>(`/api/shipments?${q.toString()}&ts=${Date.now()}`, {
    cache: "no-store",
  });
}

export async function getShipment(id: string): Promise<ShipmentDetail> {
  return apiFetch<ShipmentDetail>(`/api/shipments/${id}?ts=${Date.now()}`, { cache: "no-store" });
}

export async function updateShipment(id: string, patch: ShipmentUpdatePayload): Promise<ShipmentDetail> {
  return apiFetch<ShipmentDetail>(`/api/shipments/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
}

export async function deleteShipment(
  id: string,
): Promise<{ deleted: boolean; shipment_id: string; tracking_number: string }> {
  return apiFetch(`/api/shipments/${id}`, { method: "DELETE" });
}

export async function createManualException(
  payload: ManualExceptionCreatePayload,
): Promise<ExceptionItem> {
  return apiFetch<ExceptionItem>("/api/admin/exceptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
