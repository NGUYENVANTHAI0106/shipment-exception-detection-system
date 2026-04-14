"use client";

import { useState } from "react";
import { apiFetch } from "../lib/api";
import { useRequireAuth } from "../lib/authGuard";

export default function UploadPage() {
  const { ready, hasToken } = useRequireAuth();
  const [trackingNumber, setTrackingNumber] = useState("VNTEST0001");
  const [carrier, setCarrier] = useState("DHL");
  const [status, setStatus] = useState("in_transit");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function createOne() {
    setMsg("");
    setLoading(true);
    try {
      const data = await apiFetch("/shipments/", {
        method: "POST",
        body: { tracking_number: trackingNumber, carrier, status }
      });
      setMsg(`Đã tạo shipment id=${data.id}`);
    } catch (e) {
      setMsg(`Lỗi: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  if (!ready) return null;
  if (!hasToken) {
    return (
      <div className="rounded-xl border bg-white p-4">
        Bạn chưa login. Vào <a className="underline" href="/login">/login</a>.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-xl font-semibold">Upload (placeholder)</h1>
      <p className="mt-1 text-sm text-slate-600">
        Day 2 chưa làm CSV thật; trang này tạo nhanh 1 shipment để test flow.
      </p>

      <div className="mt-6 rounded-xl border bg-white p-4 shadow-sm">
        <label className="block text-sm font-medium">Tracking number</label>
        <input className="mt-1 w-full rounded-lg border px-3 py-2" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} />

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium">Carrier</label>
            <input className="mt-1 w-full rounded-lg border px-3 py-2" value={carrier} onChange={(e) => setCarrier(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium">Status</label>
            <input className="mt-1 w-full rounded-lg border px-3 py-2" value={status} onChange={(e) => setStatus(e.target.value)} />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={createOne}
            disabled={loading}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {loading ? "Đang tạo..." : "Tạo shipment"}
          </button>
          <a className="text-sm underline" href="/shipments">
            Xem shipments
          </a>
        </div>

        {msg ? <div className="mt-3 rounded-lg bg-slate-50 p-2 text-sm">{msg}</div> : null}
      </div>
    </div>
  );
}

