"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/app/lib/api";
import { formatDateTime, formatNumber } from "@/app/lib/format";
import { useRequireAuth } from "@/app/lib/authGuard";
import DataTable from "@/components/shared/DataTable";
import EmptyState from "@/components/shared/EmptyState";
import StatCard from "@/components/shared/StatCard";
import StatusBadge from "@/components/shared/StatusBadge";
import { StatGridSkeleton, TableSkeleton } from "@/components/shared/Skeletons";

export default function AdminShipmentsPage() {
  const { ready, hasToken } = useRequireAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const data = await apiFetch("/admin/shipments");
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

  const delayedCount = rows.filter((row) => String(row.status).toLowerCase() === "delayed").length;
  const carrierCount = new Set(rows.map((row) => row.carrier).filter(Boolean)).size;

  if (!ready) {
    return (
      <div className="page-stack">
        <StatGridSkeleton count={3} />
        <TableSkeleton rows={6} columns={6} />
      </div>
    );
  }

  if (!hasToken) {
    return (
      <EmptyState
        eyebrow="Cần đăng nhập"
        title="Đăng nhập trước khi xem toàn bộ vận đơn"
        description="Trang này dành cho quản trị viên và sử dụng token hiện tại để đọc danh sách vận đơn trên toàn hệ thống."
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
          label="Tổng vận đơn"
          value={formatNumber(rows.length)}
          hint="Số lượng bản ghi vận đơn hiện có mà quản trị viên có thể rà soát ngay."
          meta="tất cả"
          tone="accent"
        />
        <StatCard
          eyebrow="Cần chú ý"
          label="Vận đơn chậm"
          value={formatNumber(delayedCount)}
          hint="Nhóm vận đơn có trạng thái chậm tiến độ, phù hợp để đối chiếu nhanh với khu ngoại lệ."
          meta="trễ"
          tone="warning"
        />
        <StatCard
          eyebrow="Mạng lưới"
          label="Số hãng vận chuyển"
          value={formatNumber(carrierCount)}
          hint="Số lượng hãng vận chuyển đang xuất hiện trong dữ liệu hiện tại."
          meta="hãng"
          tone="success"
        />
      </section>

      <div className="flex flex-wrap gap-2">
        <button onClick={load} className="btn-primary" disabled={loading}>
          {loading ? "Đang làm mới..." : "Làm mới danh sách"}
        </button>
      </div>

      {err ? (
        <div className="surface-panel text-sm" style={{ background: "rgba(181, 69, 61, 0.08)", borderColor: "rgba(181, 69, 61, 0.24)", color: "#8f3029" }}>
          {err}
        </div>
      ) : null}

      {loading ? (
        <TableSkeleton rows={6} columns={6} />
      ) : (
        <DataTable
          columns={[
            {
              key: "id",
              header: "ID",
              render: (row) => <span className="mono-text">{row.id}</span>
            },
            {
              key: "user_id",
              header: "Người sở hữu",
              render: (row) => <span className="mono-text">{row.user_id}</span>
            },
            {
              key: "tracking_number",
              header: "Mã vận đơn",
              render: (row) => (
                <div>
                  <div className="mono-text text-xs font-semibold uppercase tracking-[0.18em]">{row.tracking_number}</div>
                  <div className="mt-2 text-sm text-[color:var(--muted)]">
                    {[row.origin, row.destination].filter(Boolean).join(" → ") || "Chưa có tuyến giao hàng"}
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
              key: "updated_at",
              header: "Cập nhật lần cuối",
              render: (row) => formatDateTime(row.updated_at)
            }
          ]}
          rows={rows}
          getRowKey={(row) => row.id}
          emptyState={{
            eyebrow: "Chưa có vận đơn",
            title: "Danh sách vận đơn toàn hệ thống đang trống",
            description: "Hãy tạo thêm dữ liệu mẫu hoặc tạo vận đơn mới từ cổng khách hàng để kiểm tra luồng quản trị."
          }}
        />
      )}
    </div>
  );
}
