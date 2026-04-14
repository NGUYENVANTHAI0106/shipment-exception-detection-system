"use client";

export default function AdminNav({ current }) {
  const items = [
    { href: "/admin", label: "Dashboard", key: "dashboard" },
    { href: "/admin/shipments", label: "Shipments", key: "shipments" },
    { href: "/admin/exceptions", label: "Exceptions", key: "exceptions" },
    { href: "/admin/rules", label: "Rules", key: "rules" },
    { href: "/admin/users", label: "Users", key: "users" },
    { href: "/admin/analytics", label: "Analytics", key: "analytics" }
  ];

  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {items.map((it) => {
        const active = current === it.key;
        return (
          <a
            key={it.href}
            href={it.href}
            className={[
              "rounded-full px-3 py-1 text-sm",
              active ? "bg-slate-900 text-white" : "border bg-white text-slate-700 hover:bg-slate-50"
            ].join(" ")}
          >
            {it.label}
          </a>
        );
      })}
    </div>
  );
}

