"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/app/lib/api";
import { formatDateTime } from "@/app/lib/format";
import { useRequireAuth } from "@/app/lib/authGuard";
import DataTable from "@/components/shared/DataTable";
import EmptyState from "@/components/shared/EmptyState";
import FilterBar from "@/components/shared/FilterBar";
import StatCard from "@/components/shared/StatCard";
import StatusBadge from "@/components/shared/StatusBadge";
import { StatGridSkeleton, TableSkeleton } from "@/components/shared/Skeletons";

export default function ShipmentsPage() {
  const { ready, hasToken } = useRequireAuth();
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [carrierFilter, setCarrierFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const data = await apiFetch(`/shipments/?q=${encodeURIComponent(q)}`);
      setRows(data || []);
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

  const carrierOptions = Array.from(new Set(rows.map((row) => row.carrier).filter(Boolean))).sort();
  const filteredRows = rows.filter((row) => {
    const matchesCarrier = carrierFilter === "all" || row.carrier === carrierFilter;
    const matchesStatus = statusFilter === "all" || row.status === statusFilter;
    return matchesCarrier && matchesStatus;
  });

  const delayedCount = filteredRows.filter((row) => String(row.status).toLowerCase() === "delayed").length;
  const deliveredCount = filteredRows.filter((row) => String(row.status).toLowerCase() === "delivered").length;

  if (!ready) {
    return (
      <div className="page-stack">
        <StatGridSkeleton count={3} />
        <TableSkeleton />
      </div>
    );
  }

  if (!hasToken) {
    return (
      <EmptyState
        eyebrow="Cần đăng nhập"
        title="Đăng nhập trước khi tải danh sách vận đơn"
        description="Trang vận đơn sử dụng token truy cập đã lưu cục bộ. Hãy đăng nhập một lần rồi quay lại để lấy dữ liệu từ API."
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
          eyebrow="Số dòng hiển thị"
          label="Vận đơn trong bộ lọc"
          value={filteredRows.length}
          hint="Số liệu phản ánh đúng các bộ lọc đang bật trong sổ theo dõi này."
          meta="đang lọc"
          tone="accent"
        />
        <StatCard
          eyebrow="Cần chú ý"
          label="Vận đơn chậm tiến độ"
          value={delayedCount}
          hint="Đây là nhóm vận đơn có khả năng phát sinh ngoại lệ và cần được rà soát sớm."
          meta="theo dõi"
          tone="warning"
        />
        <StatCard
          eyebrow="Dòng chảy ổn định"
          label="Vận đơn đã giao"
          value={deliveredCount}
          hint="Nhóm này giúp bạn xác nhận mapping trạng thái và độ rõ ràng của badge trong bảng dùng chung."
          meta="hoàn tất"
          tone="success"
        />
      </section>

      <FilterBar
        searchValue={q}
        onSearchChange={setQ}
        searchPlaceholder="Tìm theo mã vận đơn..."
        filters={[
          {
            key: "carrier",
            label: "Hãng vận chuyển",
            value: carrierFilter,
            onChange: setCarrierFilter,
            options: [{ value: "all", label: "Tất cả hãng" }, ...carrierOptions.map((carrier) => ({ value: carrier, label: carrier }))]
          },
          {
            key: "status",
            label: "Trạng thái",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: "all", label: "Tất cả trạng thái" },
              { value: "in_transit", label: "Đang vận chuyển" },
              { value: "delayed", label: "Chậm tiến độ" },
              { value: "delivered", label: "Đã giao" }
            ]
          }
        ]}
        actions={
          <>
            <button type="button" onClick={load} className="btn-secondary" disabled={loading}>
              Làm mới
            </button>
            <button type="button" onClick={load} className="btn-primary" disabled={loading}>
              {loading ? "Đang tìm..." : "Chạy tìm kiếm"}
            </button>
          </>
        }
      />

      {err ? (
        <div
          className="surface-panel text-sm"
          style={{
            background: "rgba(181, 69, 61, 0.08)",
            borderColor: "rgba(181, 69, 61, 0.24)",
            color: "#8f3029"
          }}
        >
          {err}
        </div>
      ) : null}

      {loading ? (
        <TableSkeleton />
      ) : (
        <DataTable
          columns={[
            {
              key: "tracking_number",
              header: "Mã vận đơn",
              render: (row) => (
                <div>
                  <div className="mono-text text-xs font-semibold uppercase tracking-[0.18em]">{row.tracking_number}</div>
                  <div className="mt-2 text-sm text-[color:var(--muted)]">
                    {[row.origin, row.destination].filter(Boolean).join(" → ") || "Chưa có thông tin tuyến"}
                  </div>
                </div>
              )
            },
            {
              key: "carrier",
              header: "Hãng vận chuyển",
              render: (row) => (
                <div>
                  <div className="font-semibold">{row.carrier}</div>
                  <div className="mt-2 text-sm text-[color:var(--muted)]">{row.current_location || "Chưa có vị trí cập nhật"}</div>
                </div>
              )
            },
            {
              key: "status",
              header: "Trạng thái",
              render: (row) => <StatusBadge status={row.status} />
            },
            {
              key: "estimated_delivery",
              header: "Dự kiến giao",
              render: (row) => formatDateTime(row.estimated_delivery)
            },
            {
              key: "updated_at",
              header: "Cập nhật lần cuối",
              render: (row) => formatDateTime(row.updated_at)
            }
          ]}
          rows={filteredRows}
          getRowKey={(row) => row.id}
          emptyState={{
            eyebrow: "Không có vận đơn phù hợp",
            title: "Sổ vận đơn hiện chưa có dữ liệu",
            description: "Hãy điều chỉnh bộ lọc hoặc đăng nhập bằng tài khoản mẫu để các bản ghi mẫu xuất hiện."
          }}
        />
      )}
    </div>
  );
}
