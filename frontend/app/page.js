import Link from "next/link";
import { headers } from "next/headers";
import StatCard from "@/components/shared/StatCard";
import { formatNumber } from "@/app/lib/format";

export const dynamic = "force-dynamic";

async function fetchHealth() {
  const base = process.env.NEXT_PUBLIC_API_BASE || "/api";
  const internalBase = process.env.API_INTERNAL_BASE; // e.g. http://api:8000/api when running in Docker
  try {
    if (internalBase) {
      const res = await fetch(`${internalBase}/health`, { cache: "no-store" });
      return await res.json();
    }

    const h = headers();
    const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
    const proto = h.get("x-forwarded-proto") || "http";

    const url = base.startsWith("/") ? `${proto}://${host}${base}/health` : `${base}/health`;
    const res = await fetch(url, { cache: "no-store" });
    return await res.json();
  } catch {
    return { ok: false, detail: "API chưa phản hồi" };
  }
}

export default async function HomePage() {
  const health = await fetchHealth();

  const quickLinks = [
    {
      href: "/shipments",
      label: "Mở sổ vận đơn",
      description: "Rà nhanh vận đơn đang chạy, thời gian giao dự kiến và các trạng thái mới nhất từ hãng vận chuyển."
    },
    {
      href: "/exceptions",
      label: "Đi tới ngoại lệ",
      description: "Ưu tiên các trường hợp cần xử lý theo mức độ và trạng thái trên cùng hệ badge tiếng Việt."
    },
    {
      href: "/upload",
      label: "Nhập liệu nhanh",
      description: "Tạo nhanh vận đơn mẫu để kiểm tra luồng thao tác trước khi mở rộng sang nhập CSV."
    }
  ];

  const readyHighlights = [
    "Giao diện tiếng Việt đồng nhất giữa cổng khách hàng và quản trị.",
    "Bộ component dùng chung cho thẻ số liệu, bảng dữ liệu, bộ lọc, trạng thái và khung chờ.",
    "Điều hướng thích ứng với breadcrumb, chuyển theme sáng tối và phản hồi rõ ràng trên di động."
  ];

  return (
    <div className="page-stack">
      <section className="surface-panel overflow-hidden">
        <div className="grid gap-6 xl:grid-cols-[1.2fr_minmax(0,0.8fr)]">
          <div>
            <div className="section-kicker">Trung tâm điều phối</div>
            <h2 className="mt-4 text-4xl sm:text-5xl">Theo dõi vận đơn và ngoại lệ trên một mặt bàn điều khiển rõ ràng.</h2>
            <p className="mt-4 max-w-3xl text-sm leading-8 text-[color:var(--muted)] sm:text-base">
              Từ đây bạn có thể kiểm tra sức khỏe hệ thống, mở nhanh các khu vực làm việc chính và thao tác với cùng một ngôn ngữ giao diện xuyên suốt toàn bộ cổng web.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/shipments" className="btn-primary">
                Xem vận đơn
              </Link>
              <Link href="/login" className="btn-secondary">
                Quản lý phiên đăng nhập
              </Link>
            </div>
          </div>

          <div className="surface-muted">
            <div className="section-kicker">Có gì sẵn sàng ngay lúc này</div>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-[color:var(--muted)]">
              {readyHighlights.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          eyebrow="Sức khỏe API"
          label="Kết nối backend"
          value={health.ok ? "Trực tuyến" : "Gián đoạn"}
          hint={health.ok ? "Kiểm tra sức khỏe đã phản hồi thành công qua cấu hình hiện tại của giao diện." : "Giao diện vẫn sẵn sàng ngay cả khi backend chưa phản hồi."}
          meta={health.ok ? "sẵn sàng" : "kiểm tra"}
          tone={health.ok ? "success" : "warning"}
        />
        <StatCard
          eyebrow="Nền tảng giao diện"
          label="Thành phần dùng chung"
          value={`${formatNumber(7)} khối`}
          hint="Nhãn trạng thái, thẻ số liệu, bộ lọc, bảng dữ liệu, trạng thái trống, khung chờ và chuyển theme đã sẵn sàng để tái sử dụng."
          meta="dùng chung"
          tone="accent"
        />
        <StatCard
          eyebrow="Khu vực chính"
          label="Màn hình đã hoàn thiện"
          value={`${formatNumber(4)} tuyến`}
          hint="Tổng quan, vận đơn, ngoại lệ và nhập liệu cùng dùng chung một hệ điều hướng, kiểu chữ và nhịp khoảng trắng."
          meta="thích ứng"
          tone="info"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_minmax(0,0.85fr)]">
        <div className="surface-panel">
          <div className="section-kicker">Đi tới nhanh</div>
          <div className="mt-4 grid gap-3">
            {quickLinks.map((item) => (
              <Link key={item.href} href={item.href} className="surface-muted transition hover:-translate-y-0.5">
                <div className="text-lg font-semibold tracking-[-0.03em]">{item.label}</div>
                <p className="mt-2 text-sm leading-7 text-[color:var(--muted)]">{item.description}</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="surface-panel">
          <div className="section-kicker">Phản hồi kiểm tra sức khỏe</div>
          <div className="mt-4 space-y-3">
            <div className="surface-muted flex items-center justify-between gap-3">
              <span className="text-sm text-[color:var(--muted)]">Trạng thái kết nối</span>
              <span className="font-semibold">{health.ok ? "Ổn định" : "Gián đoạn"}</span>
            </div>
            <div className="surface-muted flex items-center justify-between gap-3">
              <span className="text-sm text-[color:var(--muted)]">Thông điệp</span>
              <span className="text-right text-sm font-medium">
                {health.detail || (health.ok ? "API phản hồi bình thường." : "Chưa nhận được phản hồi từ API.")}
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
