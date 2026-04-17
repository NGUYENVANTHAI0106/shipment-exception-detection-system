"use client";

import { cn } from "@/app/lib/cn";

export default function DataTable({ columns, rows, getRowKey, emptyState }) {
  return (
    <div className="surface-panel overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead style={{ background: "var(--panel-strong)" }}>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn("px-4 py-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]", column.headerClassName)}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((row) => (
                <tr key={getRowKey(row)} className="soft-divider transition hover:bg-white/30">
                  {columns.map((column) => (
                    <td key={column.key} className={cn("px-4 py-4 align-top text-[color:var(--text)]", column.cellClassName)}>
                      {column.render ? column.render(row) : row[column.key] ?? "-"}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-14 text-center" colSpan={columns.length}>
                  <div className="mx-auto max-w-2xl">
                    <div className="section-kicker">{emptyState?.eyebrow || "Chưa có dữ liệu"}</div>
                    <div className="mt-4 text-2xl">{emptyState?.title || "Không có bản ghi phù hợp"}</div>
                    {emptyState?.description ? (
                      <p className="mt-3 text-sm leading-7 text-[color:var(--muted)]">{emptyState.description}</p>
                    ) : null}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
