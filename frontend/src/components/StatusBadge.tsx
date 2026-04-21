import type { ExceptionStatus } from "../types";

const LABELS: Record<ExceptionStatus, string> = {
  open: "Mở",
  notified: "Đã thông báo",
  in_progress: "Đang xử lý",
  resolved: "Đã xử lý",
};

export function StatusBadge({ status }: { status: ExceptionStatus }) {
  return <span className={`status-pill status-${status}`}>{LABELS[status]}</span>;
}
