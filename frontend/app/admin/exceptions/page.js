"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/app/lib/api";
import { formatDateTime, formatNumber, humanizeToken } from "@/app/lib/format";
import { useRequireAuth } from "@/app/lib/authGuard";
import DataTable from "@/components/shared/DataTable";
import EmptyState from "@/components/shared/EmptyState";
import SeverityBadge from "@/components/shared/SeverityBadge";
import StatCard from "@/components/shared/StatCard";
import StatusBadge from "@/components/shared/StatusBadge";
import { StatGridSkeleton, TableSkeleton } from "@/components/shared/Skeletons";

export default function AdminExceptionsPage() {
  const { ready, hasToken } = useRequireAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  async function load() {
    setErr("");
    setMsg("");
    setLoading(true);
    try {
      const data = await apiFetch("/admin/exceptions");
      setRows(data || []);
    } catch (e) {
      setErr(e.message || "Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }

  async function setStatus(id, status) {
    setErr("");
    setMsg("");
    setLoading(true);
    try {
      await apiFetch(`/exceptions/${id}`, { method: "PATCH", body: { status } });
      setMsg(`Đã cập nhật ngoại lệ #${id} sang trạng thái "${humanizeToken(status)}".`);
      await load();
    } catch (e) {
      setErr(e.message || "Không thể cập nhật trạng thái");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!ready || !hasToken) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, hasToken]);

  const openCount = rows.filter((row) => row.status === "open").length;
  const urgentCount = rows.filter((row) => ["high", "critical"].includes(String(row.severity).toLowerCase())).length;

  if (!ready) {
    return (
      <div className="page-stack">
        <StatGridSkeleton count={3} />
        <TableSkeleton rows={6} columns={7} />
      </div>
    );
  }

  if (!hasToken) {
    return (
      <EmptyState
        eyebrow="Cần đăng nhập"
        title="Đăng nhập trước khi xử lý ngoại lệ"
        description="Trang quản trị này yêu cầu token hiện tại để cập nhật trạng thái ngoại lệ trên toàn hệ thống."
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
          eyebrow="Toàn hệ thống"
          label="Tổng ngoại lệ"
          value={formatNumber(rows.length)}
          hint="Tất cả bản ghi ngoại lệ mà quản trị viên có thể điều phối trực tiếp từ màn hình này."
          meta="hàng đợi"
          tone="accent"
        />
        <StatCard
          eyebrow="Đang xử lý"
          label="Ngoại lệ đang mở"
          value={formatNumber(openCount)}
          hint="Các trường hợp chưa đóng, phù hợp để phân công hoặc cập nhật trạng thái ngay."
          meta="mở"
          tone="warning"
        />
        <StatCard
          eyebrow="Ưu tiên"
          label="Cao và nghiêm trọng"
          value={formatNumber(urgentCount)}
          hint="Nhóm ca có mức độ rủi ro cao, nên được ưu tiên trước trong phiên điều hành."
          meta="cao"
          tone="success"
        />
      </section>

      <div className="flex flex-wrap gap-2">
        <button onClick={load} className="btn-primary" disabled={loading}>
          {loading ? "Đang làm mới..." : "Làm mới hàng đợi"}
        </button>
      </div>

      {err ? (
        <div className="surface-panel text-sm" style={{ background: "rgba(181, 69, 61, 0.08)", borderColor: "rgba(181, 69, 61, 0.24)", color: "#8f3029" }}>
          {err}
        </div>
      ) : null}
      {msg ? (
        <div className="surface-panel text-sm" style={{ background: "rgba(31, 128, 96, 0.08)", borderColor: "rgba(31, 128, 96, 0.24)", color: "#13664c" }}>
          {msg}
        </div>
      ) : null}

      {loading ? (
        <TableSkeleton rows={6} columns={7} />
      ) : (
        <DataTable
          columns={[
            {
              key: "id",
              header: "ID",
              render: (row) => <span className="mono-text">{row.id}</span>
            },
            {
              key: "shipment_id",
              header: "Vận đơn",
              render: (row) => <span className="mono-text">{row.shipment_id}</span>
            },
            {
              key: "type",
              header: "Loại ngoại lệ",
              render: (row) => humanizeToken(row.type)
            },
            {
              key: "severity",
              header: "Mức độ",
              render: (row) => <SeverityBadge severity={row.severity} />
            },
            {
              key: "status",
              header: "Trạng thái",
              render: (row) => <StatusBadge status={row.status} />
            },
            {
              key: "detected_at",
              header: "Phát hiện lúc",
              render: (row) => formatDateTime(row.detected_at)
            },
            {
              key: "actions",
              header: "Cập nhật nhanh",
              render: (row) => (
                <div className="flex flex-wrap gap-2">
                  <button
                    className="rounded-full border px-3 py-1.5 text-xs font-semibold transition hover:-translate-y-0.5"
                    style={{ background: "var(--panel-strong)", borderColor: "var(--line-soft)" }}
                    disabled={loading}
                    onClick={() => setStatus(row.id, "investigating")}
                  >
                    Điều tra
                  </button>
                  <button
                    className="rounded-full border px-3 py-1.5 text-xs font-semibold transition hover:-translate-y-0.5"
                    style={{ background: "var(--panel-strong)", borderColor: "var(--line-soft)" }}
                    disabled={loading}
                    onClick={() => setStatus(row.id, "resolved")}
                  >
                    Giải quyết
                  </button>
                  <button
                    className="rounded-full border px-3 py-1.5 text-xs font-semibold transition hover:-translate-y-0.5"
                    style={{ background: "var(--panel-strong)", borderColor: "var(--line-soft)" }}
                    disabled={loading}
                    onClick={() => setStatus(row.id, "dismissed")}
                  >
                    Bỏ qua
                  </button>
                </div>
              )
            }
          ]}
          rows={rows}
          getRowKey={(row) => row.id}
          emptyState={{
            eyebrow: "Chưa có ngoại lệ",
            title: "Hàng đợi xử lý ngoại lệ hiện đang trống",
            description: "Khi backend phát hiện bất thường hoặc dữ liệu mẫu được tạo thêm, danh sách này sẽ xuất hiện tại đây."
          }}
        />
      )}
    </div>
  );
}
