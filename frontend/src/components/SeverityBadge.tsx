import type { Severity } from "../types";

const CLASS_MAP: Record<Severity, string> = {
  CRITICAL: "badge badge-critical",
  HIGH: "badge badge-high",
  MEDIUM: "badge badge-medium",
  LOW: "badge badge-low",
};

const TOOLTIP_MAP: Record<Severity, string> = {
  CRITICAL: "Mức độ Khẩn cấp — cần xử lý ngay (hạn 2 giờ).",
  HIGH: "Mức độ Cao — cần xử lý trong 8 giờ.",
  MEDIUM: "Mức độ Trung bình — cần xử lý trong 24 giờ.",
  LOW: "Mức độ Thấp — theo dõi, cần xử lý trong 48 giờ.",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={CLASS_MAP[severity]} title={TOOLTIP_MAP[severity]}>
      {severity}
    </span>
  );
}
