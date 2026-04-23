import { ArrowRight, Clock3, Filter } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth";
import { SeverityBadge } from "../components/SeverityBadge";
import { StatusBadge } from "../components/StatusBadge";
import { bulkClaimExceptions, bulkRequestManagerSupport, bulkUpdateStatus, listExceptions } from "../lib/exceptionService";
import type { ExceptionItem, ExceptionStatus, ExceptionType, Severity } from "../types";

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

function getSlaLabel(item: ExceptionItem): { text: string; className: string } {
  if (item.sla_breached) return { text: "Quá hạn SLA", className: "status-sla-breached" };
  if (!item.deadline_at) return { text: "Chưa có SLA", className: "status-sla-unknown" };
  const remainMs = new Date(item.deadline_at).getTime() - Date.now();
  if (remainMs <= 0) return { text: "Quá hạn SLA", className: "status-sla-breached" };
  if (remainMs <= 2 * 3600 * 1000) return { text: "Sắp quá hạn", className: "status-sla-warning" };
  return { text: "Trong SLA", className: "status-sla-ok" };
}

export function DashboardPage({ scope = "ops" }: { scope?: "ops" | "employee" }) {
  const { user } = useAuth();
  const [items, setItems] = useState<ExceptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<Severity | "all">("all");
  const [typeFilter, setTypeFilter] = useState<ExceptionType | "all">("all");
  const [carrierFilter, setCarrierFilter] = useState<string>("all");
  const [opsFilter, setOpsFilter] = useState<"all" | "my_cases" | "unassigned" | "waiting_manager" | "sla_breached">("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState<ExceptionStatus>("in_progress");
  const [bulkRunning, setBulkRunning] = useState(false);
  const pollSeqRef = useRef(0);
  const appliedSeqRef = useRef(0);

  useEffect(() => {
    let mounted = true;

    const runPoll = async () => {
      const seq = ++pollSeqRef.current;
      try {
        const data = await listExceptions();
        if (!mounted) return;
        // Ignore stale responses when multiple poll requests overlap.
        if (seq < appliedSeqRef.current) return;
        appliedSeqRef.current = seq;
        setItems(data);
        setSelectedIds((prev) => prev.filter((id) => data.some((it) => it.id === id)));
        setError(null);
        setLastSyncedAt(new Date().toISOString());
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Không tải được dữ liệu ngoại lệ.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void runPoll();
    const timer = setInterval(() => {
      void runPoll();
    }, 5000);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const filtered = useMemo(() => {
    const severityOrder: Record<Severity, number> = {
      CRITICAL: 0,
      HIGH: 1,
      MEDIUM: 2,
      LOW: 3,
    };
    return items
      .filter((it) => severityFilter === "all" || it.severity === severityFilter)
      .filter((it) => typeFilter === "all" || it.exception_type === typeFilter)
      .filter((it) => carrierFilter === "all" || it.carrier === carrierFilter)
      .filter((it) => {
        if (opsFilter === "my_cases") return Boolean(user?.username) && it.assignee === user?.username;
        if (opsFilter === "unassigned") return !it.assignee;
        if (opsFilter === "waiting_manager") return it.status === "waiting_manager_review";
        if (opsFilter === "sla_breached") return Boolean(it.sla_breached);
        return true;
      })
      .sort((a, b) => {
        const aDeadline = a.deadline_at ? new Date(a.deadline_at).getTime() : Number.POSITIVE_INFINITY;
        const bDeadline = b.deadline_at ? new Date(b.deadline_at).getTime() : Number.POSITIVE_INFINITY;
        if (aDeadline !== bDeadline) return aDeadline - bDeadline;
        const detectedDelta = new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime();
        if (detectedDelta !== 0) return detectedDelta;
        return severityOrder[a.severity] - severityOrder[b.severity];
      });
  }, [items, severityFilter, typeFilter, carrierFilter, opsFilter, user?.username]);

  const allSelected = filtered.length > 0 && selectedIds.length === filtered.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(filtered.map((item) => item.id));
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const runBulk = async (mode: "claim" | "status" | "support") => {
    if (selectedIds.length === 0) {
      setActionMessage("Vui lòng chọn ít nhất một ngoại lệ.");
      return;
    }
    setBulkRunning(true);
    setActionMessage(null);
    try {
      const result =
        mode === "claim"
          ? await bulkClaimExceptions(selectedIds)
          : mode === "status"
            ? await bulkUpdateStatus(selectedIds, bulkStatus)
            : await bulkRequestManagerSupport(selectedIds);
      setActionMessage(`Đã xử lý ${result.success}/${selectedIds.length} ngoại lệ${result.failed ? `, lỗi ${result.failed}` : ""}.`);
      const data = await listExceptions();
      setItems(data);
      setSelectedIds([]);
      setLastSyncedAt(new Date().toISOString());
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Thao tác hàng loạt thất bại.");
    } finally {
      setBulkRunning(false);
    }
  };

  return (
    <div className="page-container fm-dashboard-page">
      <header className="page-header fm-page-head">
        <h1>Danh sách ngoại lệ</h1>
        <p>Theo dõi và xử lý các đơn vận chuyển có vấn đề</p>
        {!loading && (
          <small>
            Đồng bộ: {lastSyncedAt ? formatDate(lastSyncedAt) : "--"} • Tổng API: {items.length}
          </small>
        )}
      </header>

      <section className="card fm-filter-card">
        <div className="card-title-row fm-filter-title">
          <div className="title-left">
            <Filter size={18} />
            <strong>Bộ lọc</strong>
          </div>
        </div>
        <div className="filter-grid fm-filter-grid">
          <label className="fm-field">
            Mức độ
            <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value as Severity | "all")}>
              <option value="all">Tất cả</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
          </label>
          <label className="fm-field">
            Loại ngoại lệ
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as ExceptionType | "all")}>
              <option value="all">Tất cả</option>
              <option value="delay">Trễ hạn</option>
              <option value="failed_delivery">Giao thất bại</option>
              <option value="stuck">Kẹt</option>
              <option value="address_issue">Địa chỉ</option>
            </select>
          </label>
          <label className="fm-field">
            Hãng vận chuyển
            <select value={carrierFilter} onChange={(e) => setCarrierFilter(e.target.value)}>
              <option value="all">Tất cả</option>
              <option value="GHN">GHN</option>
              <option value="GHTK">GHTK</option>
              <option value="ViettelPost">ViettelPost</option>
              <option value="J&T">J&T</option>
            </select>
          </label>
          <label className="fm-field">
            Bộ lọc vận hành
            <select value={opsFilter} onChange={(e) => setOpsFilter(e.target.value as typeof opsFilter)}>
              <option value="all">Tất cả</option>
              <option value="my_cases">Tôi phụ trách</option>
              <option value="unassigned">Chưa nhận</option>
              <option value="waiting_manager">Chờ quản lý</option>
              <option value="sla_breached">Quá SLA</option>
            </select>
          </label>
        </div>
        <div className="fm-bulk-row">
          <button className="btn btn-secondary" disabled={bulkRunning} onClick={() => void runBulk("claim")}>
            Nhận xử lý hàng loạt
          </button>
          <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value as ExceptionStatus)}>
            <option value="in_progress">Đang xử lý</option>
            <option value="waiting_manager_review">Chờ quản lý xử lý</option>
            <option value="returned_to_ops">Trả lại vận hành</option>
            <option value="resolved">Đã xử lý</option>
          </select>
          <button className="btn btn-secondary" disabled={bulkRunning} onClick={() => void runBulk("status")}>
            Đổi trạng thái hàng loạt
          </button>
          <button className="btn btn-secondary" disabled={bulkRunning} onClick={() => void runBulk("support")}>
            Yêu cầu quản lý hàng loạt
          </button>
          <small>Đã chọn: {selectedIds.length}</small>
        </div>
        {actionMessage && <p className="inline-message">{actionMessage}</p>}
      </section>

      <section className="card table-card fm-table-wrap">
        {loading ? (
          <p className="empty">Đang tải dữ liệu...</p>
        ) : error ? (
          <p className="empty">{error}</p>
        ) : filtered.length === 0 ? (
          <p className="empty">Không tìm thấy ngoại lệ phù hợp.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>
                  <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                </th>
                <th>Mức độ</th>
                <th>Loại</th>
                <th>Mã tracking</th>
                <th>Hãng</th>
                <th>Tuyến</th>
                <th>Quá hạn</th>
                <th>Trạng thái</th>
                <th>SLA</th>
                <th>Phát hiện</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const sla = getSlaLabel(item);
                return (
                  <tr key={item.id} className={item.severity === "CRITICAL" ? "critical-row" : ""}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={() => toggleOne(item.id)}
                    />
                  </td>
                  <td>
                    <SeverityBadge severity={item.severity} />
                  </td>
                  <td>{formatExceptionType(item.exception_type)}</td>
                  <td>
                    <code>{item.tracking_number}</code>
                  </td>
                  <td>{item.carrier}</td>
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
                  <td>
                    <span className={`status-pill ${sla.className}`}>{sla.text}</span>
                  </td>
                  <td>{formatDate(item.detected_at)}</td>
                  <td>
                    <Link to={`/${scope}/exception/${item.id}`} className="details-link">
                      Chi tiết →
                    </Link>
                  </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {!loading && filtered.length > 0 && (
          <div className="fm-table-foot">Hiển thị {filtered.length} ngoại lệ • Ưu tiên theo SLA và thời điểm phát hiện</div>
        )}
      </section>
    </div>
  );
}
