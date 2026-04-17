"use client";

import { cn } from "@/app/lib/cn";
import { humanizeToken } from "@/app/lib/format";

const toneStyles = {
  low: {
    backgroundColor: "rgba(54, 117, 181, 0.12)",
    borderColor: "rgba(54, 117, 181, 0.24)",
    color: "#2c699d"
  },
  medium: {
    backgroundColor: "rgba(187, 124, 39, 0.14)",
    borderColor: "rgba(187, 124, 39, 0.28)",
    color: "#91540f"
  },
  high: {
    backgroundColor: "rgba(192, 101, 37, 0.14)",
    borderColor: "rgba(192, 101, 37, 0.28)",
    color: "#9e4d0f"
  },
  critical: {
    backgroundColor: "rgba(181, 69, 61, 0.16)",
    borderColor: "rgba(181, 69, 61, 0.3)",
    color: "#8f3029"
  }
};

export default function SeverityBadge({ severity, className }) {
  const normalized = String(severity || "medium").toLowerCase();
  const style = toneStyles[normalized] || toneStyles.medium;

  return (
    <span
      className={cn("inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.06em]", className)}
      style={style}
    >
      {humanizeToken(severity)}
    </span>
  );
}
