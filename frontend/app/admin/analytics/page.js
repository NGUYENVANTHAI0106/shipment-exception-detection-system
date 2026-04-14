"use client";

import { useEffect, useState } from "react";
import AdminNav from "../AdminNav";
import { apiFetch } from "../../lib/api";
import { useRequireAuth } from "../../lib/authGuard";

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
      setErr(e.message || "Load failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!ready || !hasToken) return;
    load();
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
      <h1 className="text-xl font-semibold">Analytics</h1>
      <div className="mt-1 text-sm text-slate-600">Thống kê nhanh (v1).</div>

      <AdminNav current="analytics" />

      <button
        onClick={load}
        className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
        disabled={loading}
      >
        Refresh
      </button>

      {err ? <div className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{err}</div> : null}

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

