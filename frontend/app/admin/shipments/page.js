"use client";

import { useEffect, useState } from "react";
import AdminNav from "../AdminNav";
import { apiFetch } from "../../lib/api";
import { useRequireAuth } from "../../lib/authGuard";

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
      <h1 className="text-xl font-semibold">Shipments (Admin)</h1>
      <div className="mt-1 text-sm text-slate-600">Danh sách tất cả shipments (admin).</div>

      <AdminNav current="shipments" />

      <button
        onClick={load}
        className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
        disabled={loading}
      >
        Refresh
      </button>

      {err ? <div className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{err}</div> : null}

      <div className="mt-4 overflow-auto rounded-xl border bg-white">
        <table className="min-w-[900px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-600">
            <tr>
              <th className="p-3">ID</th>
              <th className="p-3">User</th>
              <th className="p-3">Tracking</th>
              <th className="p-3">Carrier</th>
              <th className="p-3">Status</th>
              <th className="p-3">Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3 font-mono">{r.id}</td>
                <td className="p-3 font-mono">{r.user_id}</td>
                <td className="p-3 font-mono">{r.tracking_number}</td>
                <td className="p-3">{r.carrier}</td>
                <td className="p-3">{r.status}</td>
                <td className="p-3 text-slate-600">
                  {r.updated_at ? new Date(r.updated_at).toLocaleString() : "-"}
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 ? (
              <tr>
                <td className="p-6 text-center text-slate-500" colSpan={6}>
                  Chưa có shipment nào.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

