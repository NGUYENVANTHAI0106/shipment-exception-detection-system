"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AdminShell from "@/components/layout/AdminShell";
import PortalShell from "@/components/layout/PortalShell";
import ThemeToggle from "@/components/shared/ThemeToggle";

function AuthShell({ children }) {
  return (
    <div className="app-shell flex min-h-screen items-center">
      <div className="grid w-full gap-6 lg:grid-cols-[1.1fr_minmax(0,0.9fr)]">
        <section className="surface-panel hidden min-h-[560px] flex-col justify-between lg:flex">
          <div>
            <div className="eyebrow-chip">Truy cập khách hàng</div>
            <h1 className="mt-6 text-5xl">Đăng nhập nhanh vào bàn điều hành vận đơn.</h1>
            <p className="mt-5 max-w-xl text-sm leading-8 text-[color:var(--muted)]">
              Dùng tài khoản mẫu để lưu token truy cập trên máy của bạn và chuyển ngay sang không gian theo dõi vận đơn, ngoại lệ và nhập liệu.
            </p>
          </div>

          <div className="space-y-4">
            <div className="surface-muted">
              <div className="section-kicker">Bạn có thể làm gì ngay</div>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-[color:var(--muted)]">
                <li>Đăng nhập và lưu token để gọi API thật.</li>
                <li>Theo dõi vận đơn, ngoại lệ và nhập liệu trên giao diện tiếng Việt.</li>
                <li>Chuyển nhanh sang khu vực quản trị khi cần rà soát toàn hệ thống.</li>
              </ul>
            </div>

            <div className="flex items-center justify-between">
              <Link href="/" className="btn-ghost">
                Về cổng khách hàng
              </Link>
              <ThemeToggle />
            </div>
          </div>
        </section>

        <div className="space-y-4">
          <div className="surface-panel topbar-panel flex items-center justify-between lg:hidden">
            <Link href="/" className="btn-ghost px-0">
              Cổng Vận Đơn
            </Link>
            <ThemeToggle />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

export default function AppChrome({ children }) {
  const pathname = usePathname();

  if (pathname === "/login" || pathname.startsWith("/login/")) {
    return <AuthShell>{children}</AuthShell>;
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return <AdminShell pathname={pathname}>{children}</AdminShell>;
  }

  return <PortalShell pathname={pathname}>{children}</PortalShell>;
}
