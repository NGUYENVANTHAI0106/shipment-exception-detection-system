"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { useRequireAuth } from "../lib/authGuard";

export default function ShipmentsPage() {
  const { ready, hasToken } = useRequireAuth();
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const data = await apiFetch(`/shipments/?q=${encodeURIComponent(q)}`);
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
          <h1 className="text-xl font-semibold">Shipments</h1>
          <div className="mt-1 text-sm text-slate-600">List shipments của user hiện tại.</div>
        </div>
        <button
          onClick={load}
          className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      <div className="mt-4 flex gap-2">
        <input
          className="w-full rounded-lg border px-3 py-2 text-sm"
          placeholder="Search tracking number..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="rounded-lg border px-3 py-2 text-sm font-medium" onClick={load} disabled={loading}>
          Search
        </button>
      </div>

      {err ? <div className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{err}</div> : null}

      <div className="mt-4 overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-3 py-2">Tracking</th>
              <th className="px-3 py-2">Carrier</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">ETA</th>
              <th className="px-3 py-2">Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2 font-mono text-xs">{r.tracking_number}</td>
                <td className="px-3 py-2">{r.carrier}</td>
                <td className="px-3 py-2">{r.status}</td>
                <td className="px-3 py-2">{r.estimated_delivery ? new Date(r.estimated_delivery).toLocaleString() : "-"}</td>
                <td className="px-3 py-2">{r.updated_at ? new Date(r.updated_at).toLocaleString() : "-"}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-slate-500" colSpan={5}>
                  Không có shipment nào. (Seed tạo shipments cho `client@local.test`.)
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

