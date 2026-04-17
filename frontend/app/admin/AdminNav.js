"use client";

import { cn } from "@/app/lib/cn";
import { adminNavItems } from "@/app/lib/adminNavigation";

export default function AdminNav({ current, className }) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {adminNavItems.map((it) => {
        const active = current === it.key;
        return (
          <a
            key={it.href}
            href={it.href}
            className="rounded-full border px-4 py-2 text-sm font-medium transition"
            style={
              active
                ? {
                    background: "var(--text)",
                    borderColor: "var(--text)",
                    color: "var(--panel-strong)"
                  }
                : {
                    background: "var(--panel-strong)",
                    borderColor: "var(--line-soft)",
                    color: "var(--text)"
                  }
            }
          >
            {it.label}
          </a>
        );
      })}
    </div>
  );
}
