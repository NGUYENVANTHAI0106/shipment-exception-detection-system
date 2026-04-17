"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/app/lib/api";
import { formatDateTime, humanizeToken, truncateText } from "@/app/lib/format";
import { useRequireAuth } from "@/app/lib/authGuard";
import DataTable from "@/components/shared/DataTable";
import EmptyState from "@/components/shared/EmptyState";
import FilterBar from "@/components/shared/FilterBar";
import SeverityBadge from "@/components/shared/SeverityBadge";
import StatCard from "@/components/shared/StatCard";
import StatusBadge from "@/components/shared/StatusBadge";
import { StatGridSkeleton, TableSkeleton } from "@/components/shared/Skeletons";

export default function ExceptionsPage() {
  const { ready, hasToken } = useRequireAuth();
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const data = await apiFetch("/exceptions/");
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

  const loweredQuery = query.trim().toLowerCase();
  const filteredRows = rows.filter((row) => {
    const matchesSearch =
      loweredQuery.length === 0 ||
      String(row.type || "").toLowerCase().includes(loweredQuery) ||
      String(row.description || "").toLowerCase().includes(loweredQuery) ||
      String(row.shipment_id || "").toLowerCase().includes(loweredQuery);
    const matchesStatus = statusFilter === "all" || row.status === statusFilter;
    const matchesSeverity = severityFilter === "all" || row.severity === severityFilter;

    return matchesSearch && matchesStatus && matchesSeverity;
  });

  const openCount = filteredRows.filter((row) => row.status === "open").length;
  const investigatingCount = filteredRows.filter((row) => row.status === "investigating").length;
  const highImpactCount = filteredRows.filter((row) => ["high", "critical"].includes(String(row.severity).toLowerCase())).length;

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
        title="Đăng nhập trước khi tải hàng đợi ngoại lệ"
        description="Ngoại lệ được giới hạn theo tài khoản khách hàng. Hãy đăng nhập một lần để nạp đúng dữ liệu từ API."
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
          eyebrow="Hàng đợi hiển thị"
          label="Ngoại lệ trong bộ lọc"
          value={filteredRows.length}
          hint="Số liệu phản hồi ngay theo từ khóa tìm kiếm và các bộ lọc trạng thái, mức độ."
          meta="đang lọc"
          tone="accent"
        />
        <StatCard
          eyebrow="Công việc đang mở"
          label="Đang mở và điều tra"
          value={openCount + investigatingCount}
          hint="Chỉ báo nhanh về khối lượng xử lý đang hoạt động trước khi bạn đi sâu vào từng trường hợp."
          meta="điều phối"
          tone="warning"
        />
        <StatCard
          eyebrow="Mức tác động"
          label="Cao hoặc nghiêm trọng"
          value={highImpactCount}
          hint="Nhóm ưu tiên cao giúp bạn chốt nhanh đâu là ca cần đội vận hành xử lý trước."
          meta="ưu tiên"
          tone="success"
        />
      </section>

      <FilterBar
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder="Tìm theo loại, mã vận đơn hoặc mô tả..."
        filters={[
          {
            key: "status",
            label: "Trạng thái",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: "all", label: "Tất cả trạng thái" },
              { value: "open", label: "Mở" },
              { value: "investigating", label: "Đang điều tra" },
              { value: "resolved", label: "Đã giải quyết" },
              { value: "dismissed", label: "Đã bỏ qua" }
            ]
          },
          {
            key: "severity",
            label: "Mức độ",
            value: severityFilter,
            onChange: setSeverityFilter,
            options: [
              { value: "all", label: "Tất cả mức độ" },
              { value: "low", label: "Thấp" },
              { value: "medium", label: "Trung bình" },
              { value: "high", label: "Cao" },
              { value: "critical", label: "Nghiêm trọng" }
            ]
          }
        ]}
        actions={
          <button type="button" onClick={load} className="btn-secondary" disabled={loading}>
            Làm mới hàng đợi
          </button>
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
              key: "type",
              header: "Ngoại lệ",
              render: (row) => (
                <div>
                  <div className="font-semibold">{humanizeToken(row.type)}</div>
                  <div className="mt-2 text-sm text-[color:var(--muted)]">
                    Vận đơn <span className="mono-text">{row.shipment_id}</span>
                  </div>
                </div>
              )
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
              header: "Thời điểm phát hiện",
              render: (row) => formatDateTime(row.detected_at)
            },
            {
              key: "description",
              header: "Mô tả",
              render: (row) => (
                <div>
                  <div>{truncateText(row.description, 120)}</div>
                  <div className="mt-2 text-sm text-[color:var(--muted)]">
                    {row.auto_detected ? "Tự động phát hiện theo quy tắc" : "Tạo thủ công"}
                  </div>
                </div>
              )
            }
          ]}
          rows={filteredRows}
          getRowKey={(row) => row.id}
          emptyState={{
            eyebrow: "Chưa có ngoại lệ phù hợp",
            title: "Hàng đợi hiện đang trống với bộ lọc này",
            description: "Hãy đổi bộ lọc đang bật hoặc chờ backend tạo thêm dữ liệu ngoại lệ mẫu."
          }}
        />
      )}
    </div>
  );
}
