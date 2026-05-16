import { ArrowRight, Clock3, Filter, RefreshCw, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { SeverityBadge } from "../components/SeverityBadge";
import { StatusBadge } from "../components/StatusBadge";
import {
  formatExceptionType,
  getCaseIssueLabel,
  getOverdueUiParts,
  getSlaLabel,
  getUrgencyScore,
} from "../lib/caseIntelligence";
import { bulkSetStatus, listExceptions } from "../lib/exceptionService";
import type { ExceptionItem, ExceptionStatus, ExceptionType, Severity } from "../types";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
} 

/** Bỏ ký tự vô hình hay copy từ Telegram làm UUID không khớp. */
function normalizeSearchInput(raw: string): string {
  return raw
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF\u202A-\u202E]/g, "")
    .trim()
    .toLowerCase();
}

type StatusFilter = ExceptionStatus | "active" | "all";

export function ExceptionsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [items, setItems] = useState<ExceptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<Severity | "all">("all");
  const [typeFilter, setTypeFilter] = useState<ExceptionType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkRunning, setBulkRunning] = useState(false);
  const pollSeqRef = useRef(0);
  const appliedSeqRef = useRef(0);

  const refresh = async () => {
    const seq = ++pollSeqRef.current;
    try {
      const data = await listExceptions();
      if (seq < appliedSeqRef.current) return;
      appliedSeqRef.current = seq;
      setItems(data);
      setSelectedIds((prev) => prev.filter((id) => data.some((it) => it.id === id)));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được dữ liệu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    void refresh();
    const timer = setInterval(() => {
      if (mounted) void refresh();
    }, 8000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const st = location.state as { flash?: string } | null;
    if (!st?.flash) return;
    setActionMessage(st.flash);
    navigate(".", { replace: true, state: {} });
  }, [location.state, navigate]);

  const filtered = useMemo(() => {
    const term = normalizeSearchInput(searchTerm);
    const termCompact = term.replace(/-/g, "");
    const idMatches = (exceptionId: string) => {
      const id = exceptionId.toLowerCase();
      const idCompact = id.replace(/-/g, "");
      if (term && id.includes(term)) return true;
      if (termCompact.length >= 4 && idCompact.includes(termCompact)) return true;
      return false;
    };
    return items
      .filter((it) => {
        if (statusFilter === "all") return true;
        if (statusFilter === "active") return it.status !== "resolved";
        return it.status === statusFilter;
      })
      .filter((it) => severityFilter === "all" || it.severity === severityFilter)
      .filter((it) => typeFilter === "all" || it.exception_type === typeFilter)
      .filter((it) => {
        if (!term) return true;
        return (
          idMatches(it.id) ||
          it.tracking_number.toLowerCase().includes(term) ||
          it.origin.toLowerCase().includes(term) ||
          it.destination.toLowerCase().includes(term) ||
          (it.assignee?.toLowerCase().includes(term) ?? false) ||
          (it.reason?.toLowerCase().includes(term) ?? false)
        );
      })
      .sort((a, b) => {
        const scoreDelta = getUrgencyScore(b) - getUrgencyScore(a);
        if (scoreDelta !== 0) return scoreDelta;
        return new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime();
      });
  }, [items, severityFilter, typeFilter, statusFilter, searchTerm]);

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

  const runBulkResolve = async () => {
    if (selectedIds.length === 0) {
      setActionMessage("Vui lòng chọn ít nhất một case.");
      return;
    }
    setBulkRunning(true);
    setActionMessage(null);
    try {
      const result = await bulkSetStatus(selectedIds, "resolved");
      setActionMessage(`Đã đóng ${result.success}/${selectedIds.length} case${result.failed ? `, lỗi ${result.failed}` : ""}.`);
      setSelectedIds([]);
      await refresh();
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Thao tác hàng loạt thất bại.");
    } finally {
      setBulkRunning(false);
    }
  };

  return (
    <div className="page-container v2-exceptions">
      <header className="v2-page-head">
        <div>
          <h1>Đơn hàng có vấn đề</h1>
          <p className="fm-section-hint" style={{ marginTop: 6 }}>
            Chỉ các <strong>case ngoại lệ</strong> đã được tạo (auto hoặc tay). Biết đơn «đang giao» chỉ trong{" "}
            <Link className="v2-link" to="/shipments">
              Tất cả vận đơn
            </Link>
            ; có case đang mở thì đơn xuất hiện đồng thời ở hai màn. Ghi chú vận hành ở màn&nbsp;
            <Link className="v2-link" to="/shipments">
              Sửa vận đơn
            </Link>{" "}
            cũng được hiển thị trong chi tiết case (kể cả đơn do hệ thống/mock tạo).
          </p>
        </div>
        <div className="v2-page-head-side">
          <button className="btn btn-primary" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw size={14} />
            Làm mới
          </button>
        </div>
      </header>

      <section className="v2-toolbar">
        <div className="v2-search">
          <Search size={16} />
          <input
            placeholder="Tìm mã vận đơn, mã case, lý do, tuyến..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="v2-filters">
          <span className="v2-filter-icon">
            <Filter size={14} />
          </span>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}>
            <option value="active">Đang mở</option>
            <option value="open">Mới phát hiện</option>
            <option value="in_progress">Đang xử lý</option>
            <option value="resolved">Đã đóng</option>
            <option value="all">Tất cả</option>
          </select>
          <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value as Severity | "all")}>
            <option value="all">Tất cả mức độ</option>
            <option value="CRITICAL">Khẩn cấp</option>
            <option value="HIGH">Cao</option>
            <option value="MEDIUM">Trung bình</option>
            <option value="LOW">Thấp</option>
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as ExceptionType | "all")}>
            <option value="all">Tất cả loại</option>
            <option value="delay">Trễ hạn</option>
            <option value="failed_delivery">Giao thất bại</option>
            <option value="stuck">Kẹt hàng</option>
            <option value="address_issue">Sai địa chỉ</option>
          </select>
        </div>
      </section>

      {selectedIds.length > 0 && (
        <section className="v2-bulk-bar">
          <span>Đã chọn <strong>{selectedIds.length}</strong> case</span>
          <button className="btn btn-primary" disabled={bulkRunning} onClick={() => void runBulkResolve()}>
            Đóng hàng loạt
          </button>
          <button className="v2-bulk-clear" onClick={() => setSelectedIds([])}>Bỏ chọn</button>
        </section>
      )}

      {actionMessage && <p className="v2-alert v2-alert-info">{actionMessage}</p>}
      {error && <p className="v2-alert">{error}</p>}

      <section className="v2-table-card">
        {loading ? (
          <div className="v2-empty-state">Đang tải dữ liệu...</div>
        ) : filtered.length === 0 ? (
          <div className="v2-empty-state">Không có case phù hợp với bộ lọc.</div>
        ) : (
          <table className="v2-table">
            <thead>
              <tr>
                <th className="v2-col-check">
                  <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                </th>
                <th>Đơn hàng</th>
                <th>Vấn đề</th>
                <th>Hạn xử lý</th>
                <th>Trạng thái</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const sla = getSlaLabel(item);
                const overdueUi = getOverdueUiParts(item);
                return (
                  <tr key={item.id} className={selectedIds.includes(item.id) ? "v2-row-selected" : ""}>
                    <td className="v2-col-check">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={() => toggleOne(item.id)}
                      />
                    </td>
                    <td>
                      <div className="v2-cell-stack">
                        <code className="v2-tracking">{item.tracking_number}</code>
                        <small className="v2-route">
                          {item.origin} <ArrowRight size={11} /> {item.destination}
                        </small>
                        <small className="v2-muted">{item.carrier}</small>
                      </div>
                    </td>
                    <td>
                      <div className="v2-cell-stack">
                        <div className="v2-inline">
                          <SeverityBadge severity={item.severity} />
                          <strong>{formatExceptionType(item.exception_type)}</strong>
                        </div>
                        <small>{getCaseIssueLabel(item)}</small>
                      </div>
                    </td>
                    <td>
                      <div className="v2-cell-stack">
                        <span className={`status-pill ${sla.className}`}>{sla.text}</span>
                        <small className="v2-muted">
                          <Clock3 size={11} /> {overdueUi.label}: {overdueUi.valueText}
                        </small>
                      </div>
                    </td>
                    <td>
                      <div className="v2-cell-stack">
                        <StatusBadge status={item.status} />
                        <small className="v2-muted">Phát hiện {formatDate(item.detected_at)}</small>
                      </div>
                    </td>
                    <td>
                      <Link to={`/exceptions/${item.id}`} className="v2-link">
                        Chi tiết <ArrowRight size={13} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {!loading && filtered.length > 0 && (
          <footer className="v2-table-foot">
            <small>Hiển thị {filtered.length}/{items.length} case</small>
          </footer>
        )}
      </section>
    </div>
  );
}
