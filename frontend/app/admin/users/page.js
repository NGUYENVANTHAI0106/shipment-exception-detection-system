"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/app/lib/api";
import { formatDateTime, formatNumber, humanizeToken } from "@/app/lib/format";
import { useRequireAuth } from "@/app/lib/authGuard";
import DataTable from "@/components/shared/DataTable";
import EmptyState from "@/components/shared/EmptyState";
import StatCard from "@/components/shared/StatCard";
import { StatGridSkeleton, TableSkeleton } from "@/components/shared/Skeletons";

export default function AdminUsersPage() {
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
      const data = await apiFetch("/admin/users");
      setRows(data || []);
    } catch (e) {
      setErr(e.message || "Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }

  async function toggleRole(u) {
    setErr("");
    setMsg("");
    setLoading(true);
    try {
      const next = u.role === "admin" ? "client" : "admin";
      await apiFetch(`/admin/users/${u.id}`, { method: "PATCH", body: { role: next } });
      setMsg(`Đã cập nhật người dùng #${u.id} sang vai trò "${humanizeToken(next)}".`);
      await load();
    } catch (e) {
      setErr(e.message || "Không thể cập nhật vai trò");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!ready || !hasToken) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, hasToken]);

  const adminCount = rows.filter((row) => row.role === "admin").length;
  const clientCount = rows.filter((row) => row.role === "client").length;

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
        title="Đăng nhập trước khi quản lý người dùng"
        description="Trang phân quyền yêu cầu token quản trị để thay đổi vai trò giữa khách hàng và quản trị viên."
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
          eyebrow="Tài khoản hệ thống"
          label="Tổng người dùng"
          value={formatNumber(rows.length)}
          hint="Tổng số tài khoản hiện có trên hệ thống ở mọi vai trò."
          meta="người dùng"
          tone="accent"
        />
        <StatCard
          eyebrow="Quyền quản trị"
          label="Số quản trị viên"
          value={formatNumber(adminCount)}
          hint="Nhóm tài khoản có quyền quản trị và điều phối hệ thống."
          meta="quản trị"
          tone="warning"
        />
        <StatCard
          eyebrow="Khách hàng"
          label="Số tài khoản khách hàng"
          value={formatNumber(clientCount)}
          hint="Tài khoản đang sử dụng cổng theo dõi vận đơn ở vai trò khách hàng."
          meta="khách hàng"
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
      {msg ? (
        <div className="surface-panel text-sm" style={{ background: "rgba(31, 128, 96, 0.08)", borderColor: "rgba(31, 128, 96, 0.24)", color: "#13664c" }}>
          {msg}
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
              key: "email",
              header: "Email",
              render: (row) => row.email
            },
            {
              key: "role",
              header: "Vai trò",
              render: (row) => humanizeToken(row.role)
            },
            {
              key: "company_name",
              header: "Công ty",
              render: (row) => row.company_name || "Chưa khai báo"
            },
            {
              key: "created_at",
              header: "Ngày tạo",
              render: (row) => formatDateTime(row.created_at)
            },
            {
              key: "action",
              header: "Thao tác",
              render: (row) => {
                const nextRole = row.role === "admin" ? "client" : "admin";

                return (
                  <button
                    className="rounded-full border px-3 py-1.5 text-xs font-semibold transition hover:-translate-y-0.5"
                    style={{ background: "var(--panel-strong)", borderColor: "var(--line-soft)" }}
                    disabled={loading}
                    onClick={() => toggleRole(row)}
                  >
                    Chuyển sang {humanizeToken(nextRole)}
                  </button>
                );
              }
            }
          ]}
          rows={rows}
          getRowKey={(row) => row.id}
          emptyState={{
            eyebrow: "Chưa có người dùng",
            title: "Danh sách tài khoản hiện đang trống",
            description: "Khi có tài khoản mới được khởi tạo hoặc đăng ký, bạn sẽ quản lý vai trò của họ tại đây."
          }}
        />
      )}
    </div>
  );
}
