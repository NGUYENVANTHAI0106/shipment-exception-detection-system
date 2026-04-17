"use client";

import Link from "next/link";
import { getAdminBreadcrumbs, getAdminMeta } from "@/app/lib/adminNavigation";
import AdminNav from "@/app/admin/AdminNav";
import ThemeToggle from "@/components/shared/ThemeToggle";

export default function AdminShell({ children, pathname }) {
  const meta = getAdminMeta(pathname);
  const breadcrumbs = getAdminBreadcrumbs(pathname);

  return (
    <div className="app-shell">
      <header className="surface-panel topbar-panel overflow-hidden">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="eyebrow-chip">{meta.eyebrow}</div>
              <div className="eyebrow-chip">Bảng điều khiển nội bộ</div>
            </div>

            <nav className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
              {breadcrumbs.map((crumb, index) => (
                <div key={crumb.href} className="flex items-center gap-2">
                  {index > 0 ? <span>/</span> : null}
                  <Link href={crumb.href} className="transition hover:text-[color:var(--text)]">
                    {crumb.label}
                  </Link>
                </div>
              ))}
            </nav>

            <div>
              <h1 className="page-title">{meta.title}</h1>
              <p className="page-subtitle mt-3">{meta.subtitle}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 xl:justify-end">
            <Link href="/" className="btn-secondary">
              Về cổng khách hàng
            </Link>
            <ThemeToggle />
          </div>
        </div>

        <div className="mt-6">
          <AdminNav current={meta.key} />
        </div>
      </header>

      <main id="main-content" className="content-main mt-6">
        {children}
      </main>
    </div>
  );
}
