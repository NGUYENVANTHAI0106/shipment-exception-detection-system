"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/app/lib/api";
import { formatNumber, humanizeToken } from "@/app/lib/format";
import { useRequireAuth } from "@/app/lib/authGuard";
import EmptyState from "@/components/shared/EmptyState";
import StatCard from "@/components/shared/StatCard";
import { PanelSkeleton, StatGridSkeleton } from "@/components/shared/Skeletons";

export default function AdminHome() {
  const { ready, hasToken } = useRequireAuth();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [summary, setSummary] = useState(null);

  async function loadSummary() {
    setMsg("");
    setLoading(true);
    try {
      const data = await apiFetch("/admin/summary");
      setSummary(data || null);
    } catch (e) {
      setMsg(`Không thể tải bảng điều hành: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!ready || !hasToken) return;
    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, hasToken]);

  const exceptionsByType = Object.entries(summary?.exceptions_by_type || {});
  const exceptionsBySeverity = Object.entries(summary?.exceptions_by_severity || {});

  if (!ready) {
    return (
      <div className="page-stack">
        <StatGridSkeleton count={3} />
        <PanelSkeleton rows={5} />
      </div>
    );
  }

  if (!hasToken) {
    return (
      <EmptyState
        eyebrow="Cần đăng nhập"
        title="Đăng nhập trước khi mở bảng điều hành quản trị"
        description="Khu vực quản trị dùng token hiện tại để đọc số liệu toàn hệ thống. Hãy đăng nhập rồi quay lại trang này."
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
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          eyebrow="Khối lượng hệ thống"
          label="Tổng vận đơn"
          value={formatNumber(summary?.total_shipments ?? 0)}
          hint="Toàn bộ vận đơn hiện có trên hệ thống, bất kể vai trò hay khách hàng sở hữu."
          meta="toàn cục"
          tone="accent"
        />
        <StatCard
          eyebrow="Tín hiệu rủi ro"
          label="Tổng ngoại lệ"
          value={formatNumber(summary?.total_exceptions ?? 0)}
          hint="Số ngoại lệ đã phát hiện trên toàn hệ thống và đang sẵn sàng để đội vận hành rà soát."
          meta="ngoại lệ"
          tone="warning"
        />
        <StatCard
          eyebrow="Cần xử lý"
          label="Ngoại lệ đang mở"
          value={formatNumber(summary?.open_exceptions ?? 0)}
          hint="Nhóm ca chưa đóng, phù hợp để mở nhanh sang hàng đợi quản lý ngoại lệ."
          meta="ưu tiên"
          tone="success"
        />
      </section>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={loadSummary}
          className="btn-primary"
          disabled={loading}
        >
          {loading ? "Đang làm mới..." : "Làm mới số liệu"}
        </button>
      </div>

      {msg ? (
        <div className="surface-panel text-sm" style={{ background: "rgba(181, 69, 61, 0.08)", borderColor: "rgba(181, 69, 61, 0.24)", color: "#8f3029" }}>
          {msg}
        </div>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="surface-panel">
          <div className="section-kicker">Ngoại lệ theo loại</div>
          <div className="mt-4 space-y-3">
            {exceptionsByType.length > 0 ? (
              exceptionsByType.map(([key, value]) => (
                <div key={key} className="surface-muted flex items-center justify-between gap-3">
                  <span className="text-sm text-[color:var(--muted)]">{humanizeToken(key)}</span>
                  <span className="font-semibold">{formatNumber(value)}</span>
                </div>
              ))
            ) : (
              <div className="surface-muted text-sm text-[color:var(--muted)]">Chưa có số liệu theo loại ngoại lệ.</div>
            )}
          </div>
        </div>
        <div className="surface-panel">
          <div className="section-kicker">Ngoại lệ theo mức độ</div>
          <div className="mt-4 space-y-3">
            {exceptionsBySeverity.length > 0 ? (
              exceptionsBySeverity.map(([key, value]) => (
                <div key={key} className="surface-muted flex items-center justify-between gap-3">
                  <span className="text-sm text-[color:var(--muted)]">{humanizeToken(key)}</span>
                  <span className="font-semibold">{formatNumber(value)}</span>
                </div>
              ))
            ) : (
              <div className="surface-muted text-sm text-[color:var(--muted)]">Chưa có số liệu theo mức độ.</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
