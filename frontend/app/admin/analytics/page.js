"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/app/lib/api";
import { formatNumber, humanizeToken } from "@/app/lib/format";
import { useRequireAuth } from "@/app/lib/authGuard";
import EmptyState from "@/components/shared/EmptyState";
import StatCard from "@/components/shared/StatCard";
import { PanelSkeleton, StatGridSkeleton } from "@/components/shared/Skeletons";

export default function AdminAnalyticsPage() {
  const { ready, hasToken } = useRequireAuth();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [summary, setSummary] = useState(null);

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const data = await apiFetch("/admin/summary");
      setSummary(data || null);
    } catch (e) {
      setErr(e.message || "Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!ready || !hasToken) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, hasToken]);

  const exceptionTypesCount = Object.keys(summary?.exceptions_by_type || {}).length;
  const severityBucketsCount = Object.keys(summary?.exceptions_by_severity || {}).length;
  const exceptionsByType = Object.entries(summary?.exceptions_by_type || {});
  const exceptionsBySeverity = Object.entries(summary?.exceptions_by_severity || {});

  if (!ready) {
    return (
      <div className="page-stack">
        <StatGridSkeleton count={4} />
        <PanelSkeleton rows={5} />
      </div>
    );
  }

  if (!hasToken) {
    return (
      <EmptyState
        eyebrow="Cần đăng nhập"
        title="Đăng nhập trước khi xem phân tích"
        description="Khu phân tích nhanh cần token hiện tại để lấy dữ liệu tổng hợp từ backend quản trị."
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
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard
          eyebrow="Tổng quan"
          label="Tổng vận đơn"
          value={formatNumber(summary?.total_shipments ?? 0)}
          hint="Dữ liệu nền để đối chiếu quy mô vận hành hiện tại."
          meta="vận đơn"
          tone="accent"
        />
        <StatCard
          eyebrow="Ngoại lệ"
          label="Tổng ngoại lệ"
          value={formatNumber(summary?.total_exceptions ?? 0)}
          hint="Số lượng ngoại lệ đã phát hiện trên toàn hệ thống."
          meta="ngoại lệ"
          tone="warning"
        />
        <StatCard
          eyebrow="Phân loại"
          label="Số nhóm loại ngoại lệ"
          value={formatNumber(exceptionTypesCount)}
          hint="Có bao nhiêu loại ngoại lệ đang xuất hiện trong dữ liệu hiện tại."
          meta="nhóm loại"
          tone="info"
        />
        <StatCard
          eyebrow="Mức độ"
          label="Số nhóm mức độ"
          value={formatNumber(severityBucketsCount)}
          hint="Các nhóm mức độ rủi ro đang được backend ghi nhận."
          meta="mức độ"
          tone="success"
        />
      </section>

      <div className="flex flex-wrap gap-2">
        <button onClick={load} className="btn-primary" disabled={loading}>
          {loading ? "Đang làm mới..." : "Làm mới số liệu"}
        </button>
      </div>

      {err ? (
        <div className="surface-panel text-sm" style={{ background: "rgba(181, 69, 61, 0.08)", borderColor: "rgba(181, 69, 61, 0.24)", color: "#8f3029" }}>
          {err}
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
