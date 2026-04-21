import type { ExceptionStatus } from "../types";

const LABELS: Record<ExceptionStatus, string> = {
  open: "Open",
  notified: "Notified",
  in_progress: "In Progress",
  resolved: "Resolved",
};

export function StatusBadge({ status }: { status: ExceptionStatus }) {
  return <span className={`status-pill status-${status}`}>{LABELS[status]}</span>;
}
