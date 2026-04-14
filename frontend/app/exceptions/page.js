"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { useRequireAuth } from "../lib/authGuard";

export default function ExceptionsPage() {
  const { ready, hasToken } = useRequireAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const data = await apiFetch("/exceptions/");
      setRows(data || []);
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
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Exceptions</h1>
          <div className="mt-1 text-sm text-slate-600">List exceptions của user hiện tại.</div>
        </div>
        <button
          onClick={load}
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {err ? <div className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{err}</div> : null}

      <div className="mt-4 grid gap-3">
        {rows.map((r) => (
          <div key={r.id} className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-medium">
                {r.type} · <span className="text-slate-600">{r.severity}</span>
              </div>
              <div className="text-xs text-slate-500">{new Date(r.detected_at).toLocaleString()}</div>
            </div>
            <div className="mt-2 text-sm text-slate-700">{r.description}</div>
            <div className="mt-2 text-xs text-slate-500">
              shipment_id: <span className="font-mono">{r.shipment_id}</span> · status: {r.status}
            </div>
          </div>
        ))}

        {!loading && rows.length === 0 ? (
          <div className="rounded-xl border bg-white p-6 text-center text-sm text-slate-500">
            Chưa có exception nào.
          </div>
        ) : null}
      </div>
    </div>
  );
}

