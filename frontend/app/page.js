async function fetchHealth() {
  const base = process.env.NEXT_PUBLIC_API_BASE || "/api";
  try {
    const res = await fetch(`${base}/health`, { cache: "no-store" });
    return await res.json();
  } catch {
    return { ok: false };
  }
}

export default async function HomePage() {
  const health = await fetchHealth();
  return (
    <div>
      <h1 className="text-2xl font-semibold">Shipment Exception Detection</h1>
      <p className="mt-1 text-sm text-slate-600">Day 2: UI cơ bản + gọi API.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <a className="rounded-xl border bg-white p-4 shadow-sm hover:border-slate-300" href="/login">
          <div className="font-medium">Login</div>
          <div className="mt-1 text-sm text-slate-600">Lưu token để gọi API.</div>
        </a>
        <a className="rounded-xl border bg-white p-4 shadow-sm hover:border-slate-300" href="/shipments">
          <div className="font-medium">Shipments</div>
          <div className="mt-1 text-sm text-slate-600">Danh sách shipments của user.</div>
        </a>
        <a className="rounded-xl border bg-white p-4 shadow-sm hover:border-slate-300" href="/exceptions">
          <div className="font-medium">Exceptions</div>
          <div className="mt-1 text-sm text-slate-600">Danh sách exception.</div>
        </a>
        <a className="rounded-xl border bg-white p-4 shadow-sm hover:border-slate-300" href="/api/docs">
          <div className="font-medium">Swagger</div>
          <div className="mt-1 text-sm text-slate-600">/api/docs</div>
        </a>
      </div>

      <div className="mt-6 rounded-xl border bg-white p-4 shadow-sm">
        <div className="text-sm font-medium">Backend health</div>
        <pre className="mt-2 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">
          {JSON.stringify(health, null, 2)}
        </pre>
      </div>
    </div>
  );
}

