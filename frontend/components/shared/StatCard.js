"use client";

import { cn } from "@/app/lib/cn";

const toneStyles = {
  accent: {
    background: "linear-gradient(180deg, rgba(184, 93, 59, 0.08), transparent 40%), var(--panel)"
  },
  success: {
    background: "linear-gradient(180deg, rgba(31, 128, 96, 0.08), transparent 40%), var(--panel)"
  },
  warning: {
    background: "linear-gradient(180deg, rgba(187, 124, 39, 0.08), transparent 40%), var(--panel)"
  },
  info: {
    background: "linear-gradient(180deg, rgba(54, 117, 181, 0.08), transparent 40%), var(--panel)"
  }
};

export default function StatCard({ eyebrow, label, value, hint, meta, tone = "accent", className }) {
  return (
    <article className={cn("surface-panel overflow-hidden", className)} style={toneStyles[tone] || toneStyles.accent}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="section-kicker">{eyebrow || label}</div>
          <div className="mt-3 text-sm text-[color:var(--muted)]">{label}</div>
        </div>
        {meta ? <span className="eyebrow-chip">{meta}</span> : null}
      </div>

      <div className="mt-5 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">{value}</div>

      {hint ? <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">{hint}</p> : null}
    </article>
  );
}
