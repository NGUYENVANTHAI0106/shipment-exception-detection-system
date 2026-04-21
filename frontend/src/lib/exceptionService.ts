import type { ExceptionItem } from "../types";
import { mockExceptions } from "./mockData";

const STORAGE_KEY = "ops_exceptions_local";

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

export async function listExceptions(): Promise<ExceptionItem[]> {
  const apiData = await safeFetch<ExceptionItem[]>("/api/exceptions");
  return apiData ?? readLocal();
}

export async function getExceptionById(id: string): Promise<ExceptionItem | null> {
  const apiData = await safeFetch<ExceptionItem>(`/api/exceptions/${id}`);
  if (apiData) return apiData;
  return readLocal().find((item) => item.id === id) ?? null;
}

export async function updateException(
  id: string,
  patch: Partial<Pick<ExceptionItem, "status" | "resolution_note">>,
): Promise<ExceptionItem | null> {
  const apiData = await safeFetch<ExceptionItem>(`/api/exceptions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (apiData) return apiData;

  const items = readLocal();
  const idx = items.findIndex((item) => item.id === id);
  if (idx < 0) return null;
  const next = { ...items[idx], ...patch };
  items[idx] = next;
  writeLocal(items);
  return next;
}

export async function manualEscalate(id: string): Promise<boolean> {
  const apiSuccess = await safeFetch<{ success: boolean }>(`/api/exceptions/${id}/escalate`, {
    method: "POST",
  });
  if (apiSuccess?.success) return true;

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
