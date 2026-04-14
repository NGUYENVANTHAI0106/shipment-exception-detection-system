"use client";

import { useMemo, useState } from "react";
import { apiFetch, setToken } from "../lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@local.test");
  const [password, setPassword] = useState("Admin123!");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);

  const formBody = useMemo(() => new URLSearchParams({ username: email, password }), [email, password]);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setOk(false);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formBody.toString()
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
      setToken(data.access_token);
      setOk(true);
    } catch (e2) {
      setErr(e2.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function onLogout() {
    setToken(null);
    setOk(false);
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-xl font-semibold">Đăng nhập</h1>
      <p className="mt-1 text-sm text-slate-600">Dùng tài khoản seed để test nhanh Day 2.</p>

      <form onSubmit={onSubmit} className="mt-6 rounded-xl border bg-white p-4 shadow-sm">
        <label className="block text-sm font-medium">Email</label>
        <input
          className="mt-1 w-full rounded-lg border px-3 py-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
        />

        <label className="mt-3 block text-sm font-medium">Mật khẩu</label>
        <input
          className="mt-1 w-full rounded-lg border px-3 py-2"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />

        {err ? <div className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{err}</div> : null}
        {ok ? <div className="mt-3 rounded-lg bg-emerald-50 p-2 text-sm text-emerald-800">OK. Token đã lưu vào localStorage.</div> : null}

        <div className="mt-4 flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {loading ? "Đang login..." : "Login"}
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-lg border px-4 py-2 text-sm font-medium"
          >
            Logout
          </button>
        </div>
      </form>

      <div className="mt-4 text-sm text-slate-600">
        Sau khi login, thử vào <a className="underline" href="/shipments">/shipments</a> và{" "}
        <a className="underline" href="/exceptions">/exceptions</a>.
      </div>
    </div>
  );
}

