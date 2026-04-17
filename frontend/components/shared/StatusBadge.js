"use client";

import { cn } from "@/app/lib/cn";
import { humanizeToken } from "@/app/lib/format";

const toneStyles = {
  neutral: {
    backgroundColor: "rgba(120, 126, 133, 0.12)",
    borderColor: "rgba(120, 126, 133, 0.24)",
    color: "#5d6770"
  },
  info: {
    backgroundColor: "rgba(54, 117, 181, 0.12)",
    borderColor: "rgba(54, 117, 181, 0.24)",
    color: "#2c699d"
  },
  warn: {
    backgroundColor: "rgba(187, 124, 39, 0.14)",
    borderColor: "rgba(187, 124, 39, 0.28)",
    color: "#91540f"
  },
  danger: {
    backgroundColor: "rgba(181, 69, 61, 0.14)",
    borderColor: "rgba(181, 69, 61, 0.28)",
    color: "#8f3029"
  },
  success: {
    backgroundColor: "rgba(31, 128, 96, 0.14)",
    borderColor: "rgba(31, 128, 96, 0.28)",
    color: "#13664c"
  }
};

function getTone(status) {
  const normalized = String(status || "").toLowerCase();

  if (["resolved", "delivered", "completed", "healthy"].includes(normalized)) return "success";
  if (["delayed", "investigating", "pending", "open", "in_transit"].includes(normalized)) return "warn";
  if (["exception", "failed", "lost", "cancelled"].includes(normalized)) return "danger";
  if (["info", "created"].includes(normalized)) return "info";
  return "neutral";
}

export default function StatusBadge({ status, className }) {
  const tone = getTone(status);

  return (
    <span
      className={cn("inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.06em]", className)}
      style={toneStyles[tone]}
    >
      {humanizeToken(status)}
    </span>
  );
}
