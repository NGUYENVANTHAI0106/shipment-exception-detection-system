"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/app/lib/api";
import { formatNumber, humanizeToken } from "@/app/lib/format";
import { useRequireAuth } from "@/app/lib/authGuard";
import EmptyState from "@/components/shared/EmptyState";
import StatCard from "@/components/shared/StatCard";
import { PanelSkeleton, StatGridSkeleton } from "@/components/shared/Skeletons";

export default function AdminRulesPage() {
  const { ready, hasToken } = useRequireAuth();
  const [rules, setRules] = useState([]);
  const [name, setName] = useState("Đánh dấu trạng thái bất thường");
  const [statusIn, setStatusIn] = useState("exception,damaged");
  const [severity, setSeverity] = useState("high");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function loadRules() {
    setMsg("");
    setLoading(true);
    try {
      const data = await apiFetch("/rules/");
      setRules(data || []);
    } catch (e) {
      setMsg(`Không thể tải danh sách quy tắc: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function createRule() {
    setMsg("");
    setLoading(true);
    try {
      const body = {
        name,
        type: "custom",
        conditions: { status_in: statusIn.split(",").map((s) => s.trim()).filter(Boolean) },
        severity,
        is_active: true
      };
      const data = await apiFetch("/rules/", { method: "POST", body });
      setMsg(`Đã tạo quy tắc #${data.id}.`);
      await loadRules();
    } catch (e) {
      setMsg(`Không thể tạo quy tắc: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(r) {
    setMsg("");
    setLoading(true);
    try {
      const data = await apiFetch(`/rules/${r.id}`, {
        method: "PATCH",
        body: { is_active: !r.is_active }
      });
      setMsg(`Đã cập nhật quy tắc #${data.id}.`);
      await loadRules();
    } catch (e) {
      setMsg(`Không thể cập nhật quy tắc: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function deleteRule(id) {
    setMsg("");
    setLoading(true);
    try {
      await apiFetch(`/rules/${id}`, { method: "DELETE" });
      setMsg(`Đã xoá quy tắc #${id}.`);
      await loadRules();
    } catch (e) {
      setMsg(`Không thể xoá quy tắc: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!ready || !hasToken) return;
    loadRules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, hasToken]);

  const activeCount = rules.filter((rule) => rule.is_active).length;
  const highPriorityCount = rules.filter((rule) => ["high", "critical"].includes(String(rule.severity).toLowerCase())).length;

  if (!ready) {
    return (
      <div className="page-stack">
        <StatGridSkeleton count={3} />
        <PanelSkeleton rows={6} />
      </div>
    );
  }

  if (!hasToken) {
    return (
      <EmptyState
        eyebrow="Cần đăng nhập"
        title="Đăng nhập trước khi quản lý quy tắc"
        description="Khu vực này cho phép tạo, bật tắt và xoá quy tắc phát hiện nên cần token quản trị hợp lệ."
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
          eyebrow="Kho phát hiện"
          label="Tổng số quy tắc"
          value={formatNumber(rules.length)}
          hint="Tổng số quy tắc hiện có trong hệ thống phát hiện bất thường."
          meta="quy tắc"
          tone="accent"
        />
        <StatCard
          eyebrow="Đang hoạt động"
          label="Quy tắc bật"
          value={formatNumber(activeCount)}
          hint="Những quy tắc đang tham gia trực tiếp vào quá trình đánh dấu ngoại lệ."
          meta="bật"
          tone="success"
        />
        <StatCard
          eyebrow="Mức ưu tiên"
          label="Quy tắc cao và nghiêm trọng"
          value={formatNumber(highPriorityCount)}
          hint="Nhóm quy tắc có mức độ cao, phù hợp để rà soát kỹ trước khi áp dụng rộng."
          meta="cao"
          tone="warning"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="surface-panel">
          <div className="section-kicker">Tạo quy tắc tùy chỉnh</div>
          <h2 className="mt-4 text-3xl">Khai báo điều kiện phát hiện mới.</h2>

          <label className="mt-6 block">
            <span className="field-label">Tên quy tắc</span>
            <input className="field-input" value={name} onChange={(e) => setName(e.target.value)} />
          </label>

          <label className="mt-4 block">
            <span className="field-label">Trạng thái cần khớp (`status_in`), ngăn cách bởi dấu phẩy</span>
            <input className="field-input" value={statusIn} onChange={(e) => setStatusIn(e.target.value)} />
          </label>

          <label className="mt-4 block">
            <span className="field-label">Mức độ</span>
            <select className="field-input" value={severity} onChange={(e) => setSeverity(e.target.value)}>
              <option value="low">Thấp</option>
              <option value="medium">Trung bình</option>
              <option value="high">Cao</option>
              <option value="critical">Nghiêm trọng</option>
            </select>
          </label>

          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={createRule} disabled={loading} className="btn-primary">
              {loading ? "Đang xử lý..." : "Tạo quy tắc"}
            </button>
            <button onClick={loadRules} disabled={loading} className="btn-secondary">
              Làm mới danh sách
            </button>
          </div>

          {msg ? (
            <div className="mt-5 rounded-[22px] border p-4 text-sm" style={{ background: "var(--panel-strong)", borderColor: "var(--line-soft)" }}>
              {msg}
            </div>
          ) : null}
        </div>

        <div className="surface-panel">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="section-kicker">Danh sách quy tắc</div>
              <h2 className="mt-3 text-3xl">Quy tắc đang có trên hệ thống.</h2>
            </div>
            <div className="eyebrow-chip">{formatNumber(rules.length)} mục</div>
          </div>

          <div className="mt-6 space-y-3">
            {rules.map((rule) => (
              <div key={rule.id} className="surface-muted">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="text-lg font-semibold">{rule.name}</div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-[color:var(--muted)]">
                      <span className="eyebrow-chip">Loại: {humanizeToken(rule.type)}</span>
                      <span className="eyebrow-chip">Mức độ: {humanizeToken(rule.severity)}</span>
                      <span className="eyebrow-chip">Trạng thái: {rule.is_active ? "Đang bật" : "Đã tắt"}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      className="btn-secondary"
                      disabled={loading}
                      onClick={() => toggleActive(rule)}
                    >
                      {rule.is_active ? "Tắt quy tắc" : "Bật quy tắc"}
                    </button>
                    <button
                      className="rounded-full border px-4 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5"
                      style={{ background: "var(--panel-strong)", borderColor: "rgba(181, 69, 61, 0.24)", color: "#8f3029" }}
                      disabled={loading}
                      onClick={() => deleteRule(rule.id)}
                    >
                      Xoá
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-2 rounded-[20px] border p-4" style={{ background: "var(--panel-strong)", borderColor: "var(--line-soft)" }}>
                  {Object.entries(rule.conditions || {}).length > 0 ? (
                    Object.entries(rule.conditions || {}).map(([key, value]) => (
                      <div key={key} className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                        <span className="text-[color:var(--muted)]">{humanizeToken(key)}</span>
                        <span className="font-medium text-right">
                          {Array.isArray(value) ? value.map((item) => humanizeToken(item)).join(", ") : humanizeToken(value)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-[color:var(--muted)]">Chưa có điều kiện áp dụng.</div>
                  )}
                </div>
              </div>
            ))}

            {rules.length === 0 ? (
              <div className="surface-muted text-sm text-[color:var(--muted)]">
                Chưa có quy tắc nào. Hãy tạo quy tắc đầu tiên từ biểu mẫu bên trái.
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
