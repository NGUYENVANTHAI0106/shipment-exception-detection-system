import type { ExceptionStatus } from "../types";

const LABELS: Record<ExceptionStatus, string> = {
  open: "Mở",
  notified: "Đã thông báo",
  in_progress: "Đang xử lý",
  waiting_manager_review: "Chờ quản lý xử lý",
  returned_to_ops: "Trả lại vận hành",
  resolved: "Đã xử lý",
  investigating: "Đang xác minh",
};

export function StatusBadge({ status }: { status: ExceptionStatus }) {
  return <span className={`status-pill status-${status}`}>{LABELS[status]}</span>;
}
