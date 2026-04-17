"use client";

export function StatGridSkeleton({ count = 3 }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="surface-panel">
          <div className="skeleton h-3 w-24 rounded-full" />
          <div className="mt-5 skeleton h-10 w-28 rounded-2xl" />
          <div className="mt-4 skeleton h-3 w-full rounded-full" />
          <div className="mt-2 skeleton h-3 w-4/5 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5, columns = 5 }) {
  return (
    <div className="surface-panel overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead style={{ background: "var(--panel-strong)" }}>
            <tr>
              {Array.from({ length: columns }).map((_, index) => (
                <th key={index} className="px-4 py-4">
                  <div className="skeleton h-3 w-20 rounded-full" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex} className="soft-divider">
                {Array.from({ length: columns }).map((__, columnIndex) => (
                  <td key={columnIndex} className="px-4 py-4">
                    <div className="skeleton h-3 w-full rounded-full" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PanelSkeleton({ rows = 6 }) {
  return (
    <div className="surface-panel">
      <div className="skeleton h-4 w-40 rounded-full" />
      <div className="mt-6 space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="skeleton h-12 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
