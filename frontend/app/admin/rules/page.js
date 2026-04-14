"use client";

import { useEffect, useState } from "react";
import AdminNav from "../AdminNav";
import { apiFetch } from "../../lib/api";
import { useRequireAuth } from "../../lib/authGuard";

export default function AdminRulesPage() {
  const { ready, hasToken } = useRequireAuth();
  const [rules, setRules] = useState([]);
  const [name, setName] = useState("Flag status exception");
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
      setMsg(`Lỗi load rules: ${e.message}`);
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
      setMsg(`Đã tạo rule id=${data.id}`);
      await loadRules();
    } catch (e) {
      setMsg(`Lỗi tạo rule: ${e.message}`);
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
      setMsg(`Đã cập nhật rule id=${data.id}`);
      await loadRules();
    } catch (e) {
      setMsg(`Lỗi cập nhật rule: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function deleteRule(id) {
    setMsg("");
    setLoading(true);
    try {
      await apiFetch(`/rules/${id}`, { method: "DELETE" });
      setMsg(`Đã xoá rule id=${id}`);
      await loadRules();
    } catch (e) {
      setMsg(`Lỗi xoá rule: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!ready || !hasToken) return;
    loadRules();
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
      <h1 className="text-xl font-semibold">Rules</h1>
      <div className="mt-1 text-sm text-slate-600">Quản lý detection rules (admin).</div>

      <AdminNav current="rules" />

      <div className="mt-2 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="text-sm font-medium">Tạo rule (custom)</div>
          <label className="mt-3 block text-sm font-medium">Name</label>
          <input className="mt-1 w-full rounded-lg border px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} />

          <label className="mt-3 block text-sm font-medium">status_in (comma separated)</label>
          <input className="mt-1 w-full rounded-lg border px-3 py-2" value={statusIn} onChange={(e) => setStatusIn(e.target.value)} />

          <label className="mt-3 block text-sm font-medium">Severity</label>
          <select className="mt-1 w-full rounded-lg border px-3 py-2" value={severity} onChange={(e) => setSeverity(e.target.value)}>
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
            <option value="critical">critical</option>
          </select>

          <div className="mt-4 flex gap-2">
            <button
              onClick={createRule}
              disabled={loading}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              Tạo rule
            </button>
            <button onClick={loadRules} disabled={loading} className="rounded-lg border px-4 py-2 text-sm font-medium">
              Refresh
            </button>
          </div>
          {msg ? <div className="mt-3 rounded-lg bg-slate-50 p-2 text-sm">{msg}</div> : null}
        </div>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Rules</div>
            <div className="text-xs text-slate-500">{rules.length} items</div>
          </div>
          <div className="mt-3 space-y-2">
            {rules.map((r) => (
              <div key={r.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium">{r.name}</div>
                  <div className="flex gap-2">
                    <button
                      className="rounded-md border px-2 py-1 text-xs"
                      disabled={loading}
                      onClick={() => toggleActive(r)}
                    >
                      {r.is_active ? "Disable" : "Enable"}
                    </button>
                    <button
                      className="rounded-md border px-2 py-1 text-xs"
                      disabled={loading}
                      onClick={() => deleteRule(r.id)}
                    >
                      Xoá
                    </button>
                  </div>
                </div>
                <div className="mt-1 text-xs text-slate-600">
                  type={r.type} · severity={r.severity} · active={String(r.is_active)}
                </div>
                <pre className="mt-2 overflow-auto rounded-md bg-slate-950 p-2 text-xs text-slate-100">
                  {JSON.stringify(r.conditions, null, 2)}
                </pre>
              </div>
            ))}
            {rules.length === 0 ? <div className="text-sm text-slate-500">Chưa có rule nào.</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

