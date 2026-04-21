import type { Severity } from "../types";

const MAP: Record<Severity, string> = {
  CRITICAL: "badge badge-critical",
  HIGH: "badge badge-high",
  MEDIUM: "badge badge-medium",
  LOW: "badge badge-low",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <span className={MAP[severity]}>{severity}</span>;
}
