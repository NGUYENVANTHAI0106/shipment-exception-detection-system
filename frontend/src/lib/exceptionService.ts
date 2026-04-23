import type { ExceptionItem } from "../types";
import { getAuthToken } from "../auth";
import { mockExceptions } from "./mockData";

const STORAGE_KEY = "ops_exceptions_local";
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === "true";

function readLocal(): ExceptionItem[] {
  const existing = localStorage.getItem(STORAGE_KEY);
  if (!existing) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockExceptions));
    return [...mockExceptions];
  }
  return JSON.parse(existing) as ExceptionItem[];
}

function writeLocal(items: ExceptionItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

async function safeFetch<T>(url: string, options?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(url, options);
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function withAuthHeaders(options?: RequestInit): RequestInit {
  const token = getAuthToken();
  const headers = new Headers(options?.headers ?? {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return { ...options, headers };
}

export async function listExceptions(): Promise<ExceptionItem[]> {
  const apiData = await safeFetch<ExceptionItem[]>(
    `/api/exceptions?ts=${Date.now()}`,
    withAuthHeaders({ cache: "no-store" }),
  );
  if (apiData) return apiData;
  if (USE_MOCK_DATA) return readLocal();
  throw new Error("Không tải được danh sách ngoại lệ từ API.");
}

export async function getExceptionById(id: string): Promise<ExceptionItem | null> {
  const apiData = await safeFetch<ExceptionItem>(
    `/api/exceptions/${id}?ts=${Date.now()}`,
    withAuthHeaders({ cache: "no-store" }),
  );
  if (apiData) return apiData;
  if (USE_MOCK_DATA) return readLocal().find((item) => item.id === id) ?? null;
  throw new Error("Không tải được chi tiết ngoại lệ từ API.");
}

export async function updateException(
  id: string,
  patch: Partial<Pick<ExceptionItem, "status" | "resolution_note">>,
): Promise<ExceptionItem | null> {
  const apiData = await safeFetch<ExceptionItem>(
    `/api/exceptions/${id}`,
    withAuthHeaders({
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }),
  );
  if (apiData) return apiData;
  if (!USE_MOCK_DATA) {
    throw new Error("Không cập nhật được ngoại lệ qua API.");
  }

  const items = readLocal();
  const idx = items.findIndex((item) => item.id === id);
  if (idx < 0) return null;
  const next = { ...items[idx], ...patch };
  items[idx] = next;
  writeLocal(items);
  return next;
}

export async function manualEscalate(id: string): Promise<boolean> {
  const apiSuccess = await safeFetch<{ success: boolean }>(
    `/api/exceptions/${id}/escalate`,
    withAuthHeaders({ method: "POST" }),
  );
  if (apiSuccess?.success) return true;
  if (!USE_MOCK_DATA) {
    throw new Error("Không gửi được yêu cầu quản lý hỗ trợ qua API.");
  }

  const items = readLocal();
  const idx = items.findIndex((item) => item.id === id);
  if (idx < 0) return false;
  items[idx] = {
    ...items[idx],
    is_escalated: true,
    channels_sent: Array.from(new Set([...(items[idx].channels_sent || []), "telegram_manager"])),
  };
  writeLocal(items);
  return true;
}

export async function claimException(id: string): Promise<ExceptionItem | null> {
  const apiData = await safeFetch<ExceptionItem>(
    `/api/exceptions/${id}/claim`,
    withAuthHeaders({ method: "POST" }),
  );
  if (apiData) return apiData;
  if (!USE_MOCK_DATA) {
    throw new Error("Không nhận xử lý được ngoại lệ qua API.");
  }
  return getExceptionById(id);
}

export async function assignException(
  id: string,
  payload: { assignee: string; assigned_team?: string },
): Promise<ExceptionItem | null> {
  const apiData = await safeFetch<ExceptionItem>(
    `/api/exceptions/${id}/assign`,
    withAuthHeaders({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
  if (apiData) return apiData;
  if (!USE_MOCK_DATA) {
    throw new Error("Không chuyển người xử lý được ngoại lệ qua API.");
  }
  return getExceptionById(id);
}

export async function bulkClaimExceptions(ids: string[]): Promise<{ success: number; failed: number }> {
  const results = await Promise.allSettled(ids.map((id) => claimException(id)));
  const success = results.filter((r) => r.status === "fulfilled").length;
  return { success, failed: ids.length - success };
}

export async function bulkUpdateStatus(
  ids: string[],
  status: ExceptionItem["status"],
): Promise<{ success: number; failed: number }> {
  const results = await Promise.allSettled(ids.map((id) => updateException(id, { status })));
  const success = results.filter((r) => r.status === "fulfilled").length;
  return { success, failed: ids.length - success };
}

export async function bulkRequestManagerSupport(ids: string[]): Promise<{ success: number; failed: number }> {
  const results = await Promise.allSettled(ids.map((id) => manualEscalate(id)));
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
  const apiData = await safeFetch<AuditLogItem[]>(
    `/api/audit-logs?exception_id=${exceptionId}&ts=${Date.now()}`,
    withAuthHeaders({ cache: "no-store" }),
  );
  if (apiData) return apiData;
  if (USE_MOCK_DATA) return [];
  throw new Error("Không tải được nhật ký thao tác.");
}

async function managerAction(id: string, endpoint: string, reason: string): Promise<ExceptionItem | null> {
  const apiData = await safeFetch<ExceptionItem>(
    `/api/manager/exceptions/${id}/${endpoint}`,
    withAuthHeaders({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    }),
  );
  if (apiData) return apiData;
  if (USE_MOCK_DATA) return getExceptionById(id);
  throw new Error("Không thực hiện được thao tác quản lý.");
}

export async function managerAcceptReview(id: string, reason: string): Promise<ExceptionItem | null> {
  return managerAction(id, "accept-review", reason);
}

export async function managerReturnToOps(id: string, reason: string): Promise<ExceptionItem | null> {
  return managerAction(id, "return-to-ops", reason);
}

export async function managerApproveClose(id: string, reason: string): Promise<ExceptionItem | null> {
  return managerAction(id, "approve-close", reason);
}
