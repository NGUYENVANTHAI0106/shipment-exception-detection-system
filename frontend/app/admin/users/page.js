"use client";

import { useEffect, useState } from "react";
import AdminNav from "../AdminNav";
import { apiFetch } from "../../lib/api";
import { useRequireAuth } from "../../lib/authGuard";

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
      setErr(e.message || "Load failed");
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
      setMsg(`Đã cập nhật user id=${u.id} -> role=${next}`);
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
      <h1 className="text-xl font-semibold">Users (Admin)</h1>
      <div className="mt-1 text-sm text-slate-600">Quản lý users/roles (v1).</div>

      <AdminNav current="users" />

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
        <table className="min-w-[900px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-600">
            <tr>
              <th className="p-3">ID</th>
              <th className="p-3">Email</th>
              <th className="p-3">Role</th>
              <th className="p-3">Company</th>
              <th className="p-3">Created</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="p-3 font-mono">{u.id}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3">{u.role}</td>
                <td className="p-3">{u.company_name || "-"}</td>
                <td className="p-3 text-slate-600">{new Date(u.created_at).toLocaleString()}</td>
                <td className="p-3">
                  <button
                    className="rounded-md border px-2 py-1 text-xs"
                    disabled={loading}
                    onClick={() => toggleRole(u)}
                  >
                    Toggle role
                  </button>
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 ? (
              <tr>
                <td className="p-6 text-center text-slate-500" colSpan={6}>
                  Chưa có user nào.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

