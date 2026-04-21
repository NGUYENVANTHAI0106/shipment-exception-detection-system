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
import { Link, useParams } from "react-router-dom";
import { SeverityBadge } from "../components/SeverityBadge";
import { StatusBadge } from "../components/StatusBadge";
import { getExceptionById, manualEscalate, updateException } from "../lib/exceptionService";
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

export function ExceptionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<ExceptionItem | null>(null);
  const [status, setStatus] = useState<ExceptionStatus>("open");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getExceptionById(id).then((found) => {
      if (!found) return;
      setItem(found);
      setStatus(found.status);
      setNote(found.resolution_note || "");
    });
  }, [id]);

  if (!item) {
    return (
      <div className="page-container">
        <section className="card">
          <p className="empty">Exception not found.</p>
          <Link to="/dashboard" className="details-link">
            Back to dashboard
          </Link>
        </section>
      </div>
    );
  }

  const timeline = getTimelineForException({ ...item, status, resolution_note: note });

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    const updated = await updateException(item.id, { status, resolution_note: note });
    setSaving(false);
    if (!updated) {
      setMessage("Save failed. Check API connectivity.");
      return;
    }
    setItem(updated);
    setMessage("Saved status and resolution note.");
  };

  const handleEscalate = async () => {
    setSaving(true);
    setMessage(null);
    const ok = await manualEscalate(item.id);
    if (!ok) {
      setMessage("Escalation failed.");
      setSaving(false);
      return;
    }
    const refreshed = await getExceptionById(item.id);
    if (refreshed) setItem(refreshed);
    setSaving(false);
    setMessage("Escalated to manager.");
  };

  return (
    <div className="page-container fm-detail-page">
      <div className="fm-breadcrumb">
        <Link to="/dashboard">Ngoại lệ</Link>
        <ChevronRight size={14} />
        <span>Chi tiết</span>
      </div>
      <Link to="/dashboard" className="fm-back-link">
        <ArrowLeft size={14} />
        Quay lại danh sách
      </Link>

      <div className="fm-detail-grid">
        <section className="fm-card">
          <div className="fm-summary-head">
            <div>
              <h1 className="fm-code-title">{item.tracking_number}</h1>
              <div className="fm-inline">
                <SeverityBadge severity={item.severity} />
                <span className="fm-dot">•</span>
                <span className="fm-type-text">{item.exception_type}</span>
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

        <aside className="fm-card fm-actions">
          <h3>Actions</h3>
          <label className="fm-field">
            Update status
            <select value={status} onChange={(e) => setStatus(e.target.value as ExceptionStatus)}>
              <option value="open">open</option>
              <option value="notified">notified</option>
              <option value="in_progress">in_progress</option>
              <option value="resolved">resolved</option>
            </select>
          </label>

          <label className="fm-field">
            Resolution note
            <textarea
              rows={6}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add operational note and next action."
            />
          </label>

          <button className="btn btn-primary fm-btn" disabled={saving} onClick={handleSave}>
            <Save size={16} />
            Save changes
          </button>

          <button className="btn btn-secondary fm-btn" disabled={saving} onClick={handleEscalate}>
            <Siren size={16} />
            Manual escalate
          </button>

          {message && <p className="inline-message">{message}</p>}
        </aside>
      </div>
    </div>
  );
}
