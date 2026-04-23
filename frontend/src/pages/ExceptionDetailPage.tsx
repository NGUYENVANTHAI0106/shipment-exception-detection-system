import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  ChevronRight,
  Clock,
  MapPin,
  Package,
  Save,
  Siren,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useAuth } from "../auth";
import { SeverityBadge } from "../components/SeverityBadge";
import { StatusBadge } from "../components/StatusBadge";
import { assignException, claimException, getExceptionById, manualEscalate, updateException } from "../lib/exceptionService";
import { getTimelineForException } from "../lib/mockData";
import type { ExceptionItem, ExceptionStatus } from "../types";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatExceptionType(type: ExceptionItem["exception_type"]) {
  if (type === "delay") return "Trễ hạn";
  if (type === "failed_delivery") return "Giao thất bại";
  if (type === "address_issue") return "Địa chỉ";
  return "Kẹt";
}

export function ExceptionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { user } = useAuth();
  const scope: "ops" | "employee" = location.pathname.startsWith("/employee/") ? "employee" : "ops";
  const canTransfer = scope === "ops";
  const canRequestSupport = scope === "ops" || scope === "employee";
  const [item, setItem] = useState<ExceptionItem | null>(null);
  const [status, setStatus] = useState<ExceptionStatus>("open");
  const [note, setNote] = useState("");
  const [assignee, setAssignee] = useState("");
  const [assignedTeam, setAssignedTeam] = useState("ops");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getExceptionById(id)
      .then((found) => {
        if (!found) return;
        setItem(found);
        setStatus(found.status);
        setNote(found.resolution_note || "");
        setAssignee(found.assignee || "");
        setAssignedTeam(found.assigned_team || "ops");
      })
      .catch((err) => {
        setMessage(err instanceof Error ? err.message : "Không tải được chi tiết ngoại lệ.");
      });
  }, [id]);

  if (!item) {
    return (
      <div className="page-container">
        <section className="card">
          <p className="empty">Không tìm thấy ngoại lệ.</p>
          <Link to={`/${scope}/dashboard`} className="details-link">
            Quay lại bảng điều khiển
          </Link>
        </section>
      </div>
    );
  }

  const timeline = getTimelineForException({ ...item, status, resolution_note: note });

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const updated = await updateException(item.id, { status, resolution_note: note });
      setSaving(false);
      if (!updated) {
        setMessage("Lưu thất bại. Vui lòng kiểm tra kết nối API.");
        return;
      }
      setItem(updated);
      setMessage("Đã lưu trạng thái và ghi chú xử lý.");
    } catch (err) {
      setSaving(false);
      setMessage(err instanceof Error ? err.message : "Lưu thất bại.");
    }
  };

  const handleEscalate = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const ok = await manualEscalate(item.id);
      if (!ok) {
        setMessage("Leo thang thất bại.");
        setSaving(false);
        return;
      }
      const refreshed = await getExceptionById(item.id);
      if (refreshed) setItem(refreshed);
      setSaving(false);
      setMessage("Đã gửi yêu cầu quản lý hỗ trợ.");
    } catch (err) {
      setSaving(false);
      setMessage(err instanceof Error ? err.message : "Leo thang thất bại.");
    }
  };

  const handleClaim = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const updated = await claimException(item.id);
      if (updated) {
        setItem(updated);
        setStatus(updated.status);
        setAssignee(updated.assignee || "");
      }
      setMessage("Đã nhận xử lý ngoại lệ.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Nhận xử lý thất bại.");
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async () => {
    if (!assignee.trim()) {
      setMessage("Vui lòng nhập người xử lý.");
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const updated = await assignException(item.id, { assignee: assignee.trim(), assigned_team: assignedTeam });
      if (updated) {
        setItem(updated);
        setStatus(updated.status);
      }
      setMessage("Đã chuyển người xử lý.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Chuyển người xử lý thất bại.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container fm-detail-page">
      <div className="fm-breadcrumb">
        <Link to={`/${scope}/dashboard`}>Ngoại lệ</Link>
        <ChevronRight size={14} />
        <span>Chi tiết</span>
      </div>
      <Link to={`/${scope}/dashboard`} className="fm-back-link">
        <ArrowLeft size={14} />
        Quay lại danh sách
      </Link>

      <div className="fm-detail-grid">
        <div className="fm-left-col">
          <section className="fm-card">
            <div className="fm-summary-head">
              <div>
                <h1 className="fm-code-title">{item.tracking_number}</h1>
                <div className="fm-inline">
                  <SeverityBadge severity={item.severity} />
                  <span className="fm-dot">•</span>
                  <span className="fm-type-text">{formatExceptionType(item.exception_type)}</span>
                </div>
              </div>
              <div className="fm-status-col">
                <p>Trạng thái xử lý</p>
                <StatusBadge status={status} />
              </div>
            </div>

            <div className="fm-split-grid">
              <div className="fm-icon-row">
                <Package size={17} />
                <div>
                  <p>Hãng vận chuyển</p>
                  <strong>{item.carrier}</strong>
                </div>
              </div>
              <div className="fm-icon-row">
                <Clock size={17} />
                <div>
                  <p>Quá hạn</p>
                  <strong className="fm-overdue">{item.overdue_hours} giờ</strong>
                </div>
              </div>
            </div>
          </section>

          <section className="fm-card">
            <h2 className="fm-section-title">
              <MapPin size={17} />
              Thông tin lô hàng
            </h2>
            <div className="fm-meta-grid">
              <div>
                <p>Điểm gửi</p>
                <strong>{item.origin}</strong>
              </div>
              <div>
                <p>Điểm nhận</p>
                <strong>{item.destination}</strong>
              </div>
              <div>
                <p>Thời điểm phát hiện</p>
                <strong>{formatDate(item.detected_at)}</strong>
              </div>
              <div>
                <p>Tuyến</p>
                <strong>
                  {item.origin} {"->"} {item.destination}
                </strong>
              </div>
            </div>
            {item.exception_type === "failed_delivery" && (
              <div className="fm-warning-row">
                <AlertTriangle size={14} />
                <span>Ngoại lệ giao thất bại cần xác nhận lại với người nhận</span>
              </div>
            )}
          </section>

          <section className="fm-ai-card">
            <div className="fm-ai-head">
              <h3>
                <Sparkles size={16} />
                Gợi ý xử lý
              </h3>
              {item.confidence ? (
                <span className="fm-confidence">
                  <TrendingUp size={14} />
                  Độ tin cậy {(item.confidence * 100).toFixed(0)}%
                </span>
              ) : (
                <span className="fm-fallback">AI không khả dụng — theo quy tắc</span>
              )}
            </div>
            <p>{item.ai_suggestion || "Không có gợi ý AI, vui lòng xử lý theo checklist vận hành."}</p>
          </section>

          <section className="fm-card">
            <h2 className="fm-section-title">
              <Calendar size={17} />
              Lịch sử xử lý
            </h2>
            <div className="fm-timeline">
              {timeline.map((event, idx) => (
                <div key={`${event.timestamp}-${idx}`} className="fm-timeline-item">
                  <div className="fm-timeline-dot" />
                  <div>
                    <strong className="fm-timeline-title">{event.event}</strong>
                    <p>{event.description}</p>
                    <small>{formatDate(event.timestamp)}</small>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="fm-right-col">
          <section className="fm-card fm-actions">
            <h3>Hành động</h3>
            <label className="fm-field">
              Cập nhật trạng thái
              <select value={status} onChange={(e) => setStatus(e.target.value as ExceptionStatus)}>
                <option value="open">Mở</option>
                <option value="notified">Đã thông báo</option>
                <option value="in_progress">Đang xử lý</option>
                <option value="waiting_manager_review">Chờ quản lý xử lý</option>
                <option value="returned_to_ops">Trả lại vận hành</option>
                <option value="resolved">Đã xử lý</option>
              </select>
            </label>

            <label className="fm-field">
              Ghi chú xử lý
              <textarea
                rows={6}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Nhập ghi chú về quá trình xử lý..."
              />
            </label>

            <button className="btn btn-secondary fm-btn" disabled={saving} onClick={handleClaim}>
              Nhận xử lý
            </button>

            <button className="btn btn-primary fm-btn" disabled={saving} onClick={handleSave}>
              <Save size={16} />
              Lưu thay đổi
            </button>

            {canTransfer && (
              <>
                <label className="fm-field">
                  Chuyển người xử lý
                  <input value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="Ví dụ: employee" />
                </label>
                <label className="fm-field">
                  Nhóm xử lý
                  <input value={assignedTeam} onChange={(e) => setAssignedTeam(e.target.value)} placeholder="ops" />
                </label>
                <button className="btn btn-secondary fm-btn" disabled={saving} onClick={handleAssign}>
                  Chuyển người xử lý
                </button>
              </>
            )}

            {canRequestSupport && (
              <button className="btn btn-secondary fm-btn" disabled={saving} onClick={handleEscalate}>
                <Siren size={16} />
                Yêu cầu quản lý hỗ trợ
              </button>
            )}

            <p className="inline-message">
              Người phụ trách hiện tại: <strong>{item.assignee || "Chưa có"}</strong>
              {user?.username ? ` • Bạn: ${user.username}` : ""}
            </p>

            {message && <p className="inline-message">{message}</p>}
          </section>

          <section className="fm-card fm-quick-info">
            <h3>Thông tin nhanh</h3>
            <div className="fm-quick-grid">
              <div>
                <p>Mã ngoại lệ</p>
                <code>{item.id.slice(0, 8)}</code>
              </div>
              <div>
                <p>Loại</p>
                <strong>{formatExceptionType(item.exception_type)}</strong>
              </div>
              <div>
                <p>Mức độ</p>
                <SeverityBadge severity={item.severity} />
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
