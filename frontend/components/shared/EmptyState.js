"use client";

export default function EmptyState({ eyebrow = "Chưa có dữ liệu", title, description, action }) {
  return (
    <section className="surface-panel text-center">
      <div className="section-kicker">{eyebrow}</div>
      <h2 className="mt-4 text-3xl">{title}</h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[color:var(--muted)]">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </section>
  );
}
