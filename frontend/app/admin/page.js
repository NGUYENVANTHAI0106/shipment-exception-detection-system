"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { useRequireAuth } from "../lib/authGuard";
import AdminNav from "./AdminNav";

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
      setMsg(`Lỗi load dashboard: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!ready || !hasToken) return;
    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, hasToken]);

  if (!ready) return null;
  if (!hasToken) {
    return (
      <div className="rounded-xl border bg-white p-4">
        Bạn chưa login. Vào <a className="underline" href="/login">/login</a>.
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-semibold">Admin</h1>
      <p className="mt-1 text-sm text-slate-600">
        Dashboard + management pages (Day 2).
      </p>

      <AdminNav current="dashboard" />

      <div className="mt-2 flex gap-2">
        <button
          onClick={loadSummary}
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {msg ? <div className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{msg}</div> : null}

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">Total shipments</div>
          <div className="mt-1 text-2xl font-semibold">{summary ? summary.total_shipments : "-"}</div>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">Total exceptions</div>
          <div className="mt-1 text-2xl font-semibold">{summary ? summary.total_exceptions : "-"}</div>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">Open exceptions</div>
          <div className="mt-1 text-2xl font-semibold">{summary ? summary.open_exceptions : "-"}</div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="text-sm font-medium">Exceptions by type</div>
          <pre className="mt-3 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">
            {summary ? JSON.stringify(summary.exceptions_by_type, null, 2) : "—"}
          </pre>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="text-sm font-medium">Exceptions by severity</div>
          <pre className="mt-3 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">
            {summary ? JSON.stringify(summary.exceptions_by_severity, null, 2) : "—"}
          </pre>
        </div>
      </div>
    </div>
  );
}

