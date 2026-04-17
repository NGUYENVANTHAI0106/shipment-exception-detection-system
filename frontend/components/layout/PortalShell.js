"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/app/lib/cn";
import { getPortalBreadcrumbs, getPortalMeta, portalNavItems } from "@/app/lib/navigation";
import ThemeToggle from "@/components/shared/ThemeToggle";

function SidebarLink({ item, active }) {
  return (
    <Link
      href={item.href}
      className={cn(
        "nav-item",
        active ? "nav-item-active" : ""
      )}
    >
      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] opacity-70">{item.kicker}</div>
      <div className="mt-2 text-lg font-semibold tracking-[-0.03em]">{item.label}</div>
      <p className="mt-2 text-sm leading-6 opacity-80">{item.description}</p>
    </Link>
  );
}

export default function PortalShell({ children, pathname }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  const meta = getPortalMeta(pathname);
  const breadcrumbs = getPortalBreadcrumbs(pathname);

  return (
    <div className="app-shell">
      <div className="shell-grid">
        <aside className="hidden lg:block">
          <div className="sticky-panel space-y-4">
            <section className="surface-panel overflow-hidden">
              <div className="eyebrow-chip">Cổng Vận Đơn</div>
              <h2 className="mt-5 text-4xl">Bàn điều phối Atlas</h2>
              <p className="mt-4 text-sm leading-7 text-[color:var(--muted)]">
                Không gian làm việc dành cho khách hàng để theo dõi vận đơn, xử lý ngoại lệ và thao tác nhập liệu nhanh.
              </p>
            </section>

            <nav className="surface-panel p-2">
              <div className="space-y-2">
                {portalNavItems.map((item) => {
                  const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                  return <SidebarLink key={item.href} item={item} active={active} />;
                })}
              </div>

              <div className="soft-divider my-5" />

              <div className="space-y-2">
                <Link href="/admin" className="btn-secondary w-full justify-between">
                  <span>Khu vực quản trị</span>
                  <span className="mono-text text-xs">/admin</span>
                </Link>
                <Link href="/login" className="btn-ghost w-full justify-between rounded-[18px] border border-transparent px-4 py-3">
                  <span>Phiên đăng nhập</span>
                  <span className="mono-text text-xs">/login</span>
                </Link>
              </div>
            </nav>

            <section className="surface-muted">
              <div className="section-kicker">Nhịp làm việc rõ ràng</div>
              <p className="mt-3 text-sm leading-7 text-[color:var(--muted)]">
                Giao diện ưu tiên đọc nhanh dữ liệu, điều hướng mạch lạc trên máy tính lẫn điện thoại và giữ cùng một ngôn ngữ thiết kế giữa khu khách hàng và quản trị.
              </p>
            </section>
          </div>
        </aside>

        <div className="content-main page-stack">
          <header className="surface-panel topbar-panel overflow-hidden">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsMenuOpen((open) => !open)}
                    className="btn-secondary lg:hidden"
                    aria-expanded={isMenuOpen}
                    aria-controls="portal-mobile-nav"
                  >
                    {isMenuOpen ? "Đóng menu" : "Mở menu"}
                  </button>
                  <div className="eyebrow-chip">{meta.eyebrow}</div>
                  <div className="eyebrow-chip">Điều hướng thích ứng</div>
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
                <Link href="/upload" className="btn-ghost">
                  Nhập nhanh
                </Link>
                <ThemeToggle />
              </div>
            </div>
          </header>

          {isMenuOpen ? (
            <nav
              id="portal-mobile-nav"
              className="surface-panel space-y-2 lg:hidden"
              aria-label="Menu điều hướng khách hàng trên di động"
            >
              {portalNavItems.map((item) => {
                const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return <SidebarLink key={item.href} item={item} active={active} />;
              })}
              <div className="soft-divider my-4" />
              <div className="flex flex-wrap gap-2">
                <Link href="/admin" className="btn-secondary">
                  Khu vực quản trị
                </Link>
                <Link href="/login" className="btn-ghost">
                  Đăng nhập
                </Link>
              </div>
            </nav>
          ) : null}

          <main id="main-content">{children}</main>
        </div>
      </div>
    </div>
  );
}
