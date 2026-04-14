"use client";

import { useEffect, useState } from "react";
import AdminNav from "../AdminNav";
import { apiFetch } from "../../lib/api";
import { useRequireAuth } from "../../lib/authGuard";

export default function AdminExceptionsPage() {
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
      const data = await apiFetch("/admin/exceptions");
      setRows(data || []);
    } catch (e) {
      setErr(e.message || "Load failed");
    } finally {
      setLoading(false);
    }
  }

  async function setStatus(id, status) {
    setErr("");
    setMsg("");
    setLoading(true);
    try {
      await apiFetch(`/exceptions/${id}`, { method: "PATCH", body: { status } });
      setMsg(`Đã cập nhật exception id=${id} -> ${status}`);
      await load();
    } catch (e) {
      setErr(e.message || "Update failed");
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
      <h1 className="text-xl font-semibold">Exceptions (Admin)</h1>
      <div className="mt-1 text-sm text-slate-600">Quản lý exceptions toàn hệ thống.</div>

      <AdminNav current="exceptions" />

      <button
        onClick={load}
        className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
        disabled={loading}
      >
        Refresh
      </button>

      {err ? <div className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{err}</div> : null}
      {msg ? <div className="mt-3 rounded-lg bg-emerald-50 p-2 text-sm text-emerald-700">{msg}</div> : null}

      <div className="mt-4 overflow-auto rounded-xl border bg-white">
        <table className="min-w-[1100px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-600">
            <tr>
              <th className="p-3">ID</th>
              <th className="p-3">Shipment</th>
              <th className="p-3">Type</th>
              <th className="p-3">Severity</th>
              <th className="p-3">Status</th>
              <th className="p-3">Detected</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-3 font-mono">{r.id}</td>
                <td className="p-3 font-mono">{r.shipment_id}</td>
                <td className="p-3">{r.type}</td>
                <td className="p-3">{r.severity}</td>
                <td className="p-3">{r.status}</td>
                <td className="p-3 text-slate-600">{new Date(r.detected_at).toLocaleString()}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="rounded-md border px-2 py-1 text-xs"
                      disabled={loading}
                      onClick={() => setStatus(r.id, "investigating")}
                    >
                      Investigating
                    </button>
                    <button
                      className="rounded-md border px-2 py-1 text-xs"
                      disabled={loading}
                      onClick={() => setStatus(r.id, "resolved")}
                    >
                      Resolve
                    </button>
                    <button
                      className="rounded-md border px-2 py-1 text-xs"
                      disabled={loading}
                      onClick={() => setStatus(r.id, "dismissed")}
                    >
                      Dismiss
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 ? (
              <tr>
                <td className="p-6 text-center text-slate-500" colSpan={7}>
                  Chưa có exception nào.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

