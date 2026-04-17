"use client";

import Link from "next/link";
import { useState } from "react";
import { setToken } from "@/app/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@local.test");
  const [password, setPassword] = useState("Admin123!");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setOk(false);
    setLoading(true);
    try {
      const formBody = new URLSearchParams({ username: email, password });
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
      setErr(e2.message || "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  }

  async function onLogout() {
    setToken(null);
    setOk(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="section-kicker">Tài khoản mẫu</div>
        <h1 className="mt-4 text-4xl">Đăng nhập vào cổng vận đơn.</h1>
        <p className="mt-3 text-sm leading-7 text-[color:var(--muted)]">
          Sử dụng một trong các tài khoản mẫu khởi tạo để lưu token truy cập cục bộ, sau đó quay lại các màn hình khách hàng hoặc quản trị và gọi API thật.
        </p>
      </div>

      <form onSubmit={onSubmit} className="surface-panel">
        <label className="block">
          <span className="field-label">Email</span>
          <input className="field-input" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" />
        </label>

        <label className="mt-4 block">
          <span className="field-label">Mật khẩu</span>
          <input
            className="field-input"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
        </label>

        {err ? (
          <div className="mt-4 rounded-[22px] border p-4 text-sm" style={{ background: "rgba(181, 69, 61, 0.08)", borderColor: "rgba(181, 69, 61, 0.24)", color: "#8f3029" }}>
            {err}
          </div>
        ) : null}

        {ok ? (
          <div className="mt-4 rounded-[22px] border p-4 text-sm" style={{ background: "rgba(31, 128, 96, 0.08)", borderColor: "rgba(31, 128, 96, 0.24)", color: "#13664c" }}>
            Đăng nhập thành công. Token truy cập đã được lưu cục bộ trên trình duyệt.
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
          <button type="button" onClick={onLogout} className="btn-secondary">
            Đăng xuất
          </button>
        </div>
      </form>

      <section className="surface-muted">
        <div className="section-kicker">Đi tới nhanh sau khi đăng nhập</div>
        <p className="mt-3 text-sm leading-7 text-[color:var(--muted)]">
          Sau khi đăng nhập, bạn có thể tiếp tục đến <Link href="/shipments" className="underline">/shipments</Link> hoặc <Link href="/exceptions" className="underline">/exceptions</Link>.
        </p>
      </section>
    </div>
  );
}
