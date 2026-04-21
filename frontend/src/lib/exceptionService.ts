import type { ExceptionItem } from "../types";
import { getAuthRole, getAuthToken } from "../auth";
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

function getRolePrefix(): "ops" | "employee" {
  return getAuthRole() === "employee" ? "employee" : "ops";
}

function withAuthHeaders(options?: RequestInit): RequestInit {
  const token = getAuthToken();
  const headers = new Headers(options?.headers ?? {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return { ...options, headers };
}

export async function listExceptions(): Promise<ExceptionItem[]> {
  const prefix = getRolePrefix();
  const apiData = await safeFetch<ExceptionItem[]>(
    `/api/${prefix}/exceptions`,
    withAuthHeaders(),
  );
  if (apiData) return apiData;
  if (USE_MOCK_DATA) return readLocal();
  throw new Error("Không tải được danh sách ngoại lệ từ API.");
}

export async function getExceptionById(id: string): Promise<ExceptionItem | null> {
  const prefix = getRolePrefix();
  const apiData = await safeFetch<ExceptionItem>(
    `/api/${prefix}/exceptions/${id}`,
    withAuthHeaders(),
  );
  if (apiData) return apiData;
  if (USE_MOCK_DATA) return readLocal().find((item) => item.id === id) ?? null;
  throw new Error("Không tải được chi tiết ngoại lệ từ API.");
}

export async function updateException(
  id: string,
  patch: Partial<Pick<ExceptionItem, "status" | "resolution_note">>,
): Promise<ExceptionItem | null> {
  const prefix = getRolePrefix();
  const apiData = await safeFetch<ExceptionItem>(
    `/api/${prefix}/exceptions/${id}`,
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
  const prefix = getRolePrefix();
  const apiSuccess = await safeFetch<{ success: boolean }>(
    `/api/${prefix}/exceptions/${id}/escalate`,
    withAuthHeaders({ method: "POST" }),
  );
  if (apiSuccess?.success) return true;
  if (!USE_MOCK_DATA) {
    throw new Error("Không leo thang được ngoại lệ qua API.");
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
