"use client";

import Link from "next/link";
import { useState } from "react";
import { apiFetch } from "@/app/lib/api";
import { useRequireAuth } from "@/app/lib/authGuard";
import EmptyState from "@/components/shared/EmptyState";
import StatCard from "@/components/shared/StatCard";
import { PanelSkeleton, StatGridSkeleton } from "@/components/shared/Skeletons";

export default function UploadPage() {
  const { ready, hasToken } = useRequireAuth();
  const [trackingNumber, setTrackingNumber] = useState("VNTEST0001");
  const [carrier, setCarrier] = useState("DHL");
  const [status, setStatus] = useState("in_transit");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function createOne() {
    setMsg("");
    setLoading(true);
    try {
      const data = await apiFetch("/shipments/", {
        method: "POST",
        body: { tracking_number: trackingNumber, carrier, status }
      });
      setMsg(`Đã tạo vận đơn id=${data.id}`);
    } catch (e) {
      setMsg(`Lỗi: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return (
      <div className="page-stack">
        <StatGridSkeleton count={2} />
        <PanelSkeleton rows={5} />
      </div>
    );
  }

  if (!hasToken) {
    return (
      <EmptyState
        eyebrow="Cần đăng nhập"
        title="Đăng nhập trước khi tạo vận đơn thủ công"
        description="Khu vực nhập liệu này dùng endpoint POST có xác thực. Hãy đăng nhập để tạo vận đơn mẫu cho tài khoản của bạn."
        action={
          <Link href="/login" className="btn-primary">
            Đi tới đăng nhập
          </Link>
        }
      />
    );
  }

  return (
    <div className="page-stack">
      <section className="grid gap-4 md:grid-cols-2">
        <StatCard
          eyebrow="Chế độ hiện tại"
          label="Tạo vận đơn thủ công"
          value="Đang bật"
          hint="Biểu mẫu này giữ cho luồng kiểm thử đầu cuối luôn sử dụng được trước khi nhập CSV hoàn chỉnh."
          meta="hoạt động"
          tone="accent"
        />
        <StatCard
          eyebrow="Mở rộng tiếp theo"
          label="Luồng nhập CSV"
          value="Đã lên kế hoạch"
          hint="Kéo thả tệp, xem trước, kiểm tra dữ liệu và tổng kết nhập liệu sẽ được nối vào sau."
          meta="sắp mở"
          tone="info"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_minmax(0,0.9fr)]">
        <div className="surface-panel">
          <div className="section-kicker">Nhập liệu thủ công</div>
          <h2 className="mt-4 text-3xl">Tạo nhanh một vận đơn để kiểm thử luồng thao tác.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[color:var(--muted)]">
            Biểu mẫu này giúp cổng khách hàng luôn kiểm thử được trong lúc khu vực upload CSV đầy đủ đang được hoàn thiện.
          </p>

          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="field-label">Mã vận đơn</span>
              <input className="field-input" value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="field-label">Hãng vận chuyển</span>
                <input className="field-input" value={carrier} onChange={(event) => setCarrier(event.target.value)} />
              </label>

              <label className="block">
                <span className="field-label">Trạng thái</span>
                <input className="field-input" value={status} onChange={(event) => setStatus(event.target.value)} />
              </label>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button type="button" onClick={createOne} disabled={loading} className="btn-primary">
              {loading ? "Đang tạo vận đơn..." : "Tạo vận đơn"}
            </button>
            <Link href="/shipments" className="btn-secondary">
              Xem danh sách vận đơn
            </Link>
          </div>

          {msg ? (
            <div className="mt-5 rounded-[22px] border p-4 text-sm" style={{ background: "var(--panel-strong)", borderColor: "var(--line-soft)" }}>
              {msg}
            </div>
          ) : null}
        </div>

        <div className="page-stack">
          <section className="surface-panel">
            <div className="section-kicker">Cách dùng nhanh</div>
            <ol className="mt-4 space-y-4 text-sm leading-7 text-[color:var(--muted)]">
              <li>1. Tạo nhanh một vận đơn mẫu mà không cần rời khỏi cổng khách hàng.</li>
              <li>2. Kiểm tra bản ghi vừa tạo xuất hiện trong sổ theo dõi vận đơn.</li>
              <li>3. Xác nhận bố cục, bảng và badge hoạt động ổn với dữ liệu thật từ API.</li>
            </ol>
          </section>

          <section className="surface-muted">
            <div className="section-kicker">Ghi chú mở rộng</div>
            <p className="mt-3 text-sm leading-7 text-[color:var(--muted)]">
              Bố cục hiện tại đã chừa chỗ cho trình hướng dẫn từng bước, vùng kéo thả, phần tổng kết kiểm tra dữ liệu và bảng kết quả nhập trong giai đoạn tiếp theo.
            </p>
          </section>
        </div>
      </section>
    </div>
  );
}
