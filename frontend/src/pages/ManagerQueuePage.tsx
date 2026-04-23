import { ArrowRight, Clock3 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { SeverityBadge } from "../components/SeverityBadge";
import { StatusBadge } from "../components/StatusBadge";
import { listExceptions } from "../lib/exceptionService";
import type { ExceptionItem, ExceptionType } from "../types";

type ManagerTab = "waiting" | "returned" | "closed";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatExceptionType(type: ExceptionType) {
  if (type === "delay") return "Trễ hạn";
  if (type === "failed_delivery") return "Giao thất bại";
  if (type === "address_issue") return "Địa chỉ";
  return "Kẹt";
}

export function ManagerQueuePage() {
  const [items, setItems] = useState<ExceptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<ManagerTab>("waiting");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await listExceptions();
        if (!mounted) return;
        setItems(data);
        setError(null);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Không tải được manager queue.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    const timer = setInterval(() => void load(), 5000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const filtered = useMemo(() => {
    const byTab = items.filter((it) => {
      if (tab === "waiting") return it.status === "waiting_manager_review";
      if (tab === "returned") return it.status === "returned_to_ops";
      return it.status === "resolved";
    });
    return byTab.sort((a, b) => {
      const aCritical = a.severity === "CRITICAL" ? 1 : 0;
      const bCritical = b.severity === "CRITICAL" ? 1 : 0;
      if (aCritical !== bCritical) return bCritical - aCritical;
      const aBreached = a.sla_breached ? 1 : 0;
      const bBreached = b.sla_breached ? 1 : 0;
      if (aBreached !== bBreached) return bBreached - aBreached;
      const aDeadline = a.deadline_at ? new Date(a.deadline_at).getTime() : Number.POSITIVE_INFINITY;
      const bDeadline = b.deadline_at ? new Date(b.deadline_at).getTime() : Number.POSITIVE_INFINITY;
      return aDeadline - bDeadline;
    });
  }, [items, tab]);

  return (
    <div className="page-container">
      <header className="page-header">
        <h1>Manager Queue</h1>
        <p>Ưu tiên case CRITICAL và case quá SLA để duyệt nhanh.</p>
      </header>

      <section className="card">
        <div className="fm-bulk-row">
          <button className={`btn ${tab === "waiting" ? "btn-primary" : "btn-secondary"}`} onClick={() => setTab("waiting")}>
            Chờ duyệt
          </button>
          <button className={`btn ${tab === "returned" ? "btn-primary" : "btn-secondary"}`} onClick={() => setTab("returned")}>
            Đã trả lại
          </button>
          <button className={`btn ${tab === "closed" ? "btn-primary" : "btn-secondary"}`} onClick={() => setTab("closed")}>
            Đã chốt
          </button>
          <small>Số lượng: {filtered.length}</small>
        </div>
      </section>

      <section className="card table-card fm-table-wrap">
        {loading ? (
          <p className="empty">Đang tải dữ liệu...</p>
        ) : error ? (
          <p className="empty">{error}</p>
        ) : filtered.length === 0 ? (
          <p className="empty">Không có case trong tab hiện tại.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Mức độ</th>
                <th>Loại</th>
                <th>Mã tracking</th>
                <th>Tuyến</th>
                <th>Quá hạn</th>
                <th>Trạng thái</th>
                <th>Phát hiện</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className={item.severity === "CRITICAL" ? "critical-row" : ""}>
                  <td>
                    <SeverityBadge severity={item.severity} />
                  </td>
                  <td>{formatExceptionType(item.exception_type)}</td>
                  <td>
                    <code>{item.tracking_number}</code>
                  </td>
                  <td>
                    <span className="route">
                      {item.origin}
                      <ArrowRight size={14} />
                      {item.destination}
                    </span>
                  </td>
                  <td className="overdue-cell">
                    <Clock3 size={14} />
                    {item.overdue_hours}h
                  </td>
                  <td>
                    <StatusBadge status={item.status} />
                  </td>
                  <td>{formatDate(item.detected_at)}</td>
                  <td>
                    <Link to={`/manager/exception/${item.id}`} className="details-link">
                      Chi tiết →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
