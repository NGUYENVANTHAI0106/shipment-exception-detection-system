import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  Package,
  Phone,
  Radio,
  RotateCcw,
  Save,
  ShieldAlert,
  Sparkles,
  User,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { SeverityBadge } from "../components/SeverityBadge";
import { StatusBadge } from "../components/StatusBadge";
import {
  buildCaseInsight,
  formatExceptionType,
  formatReason,
  formatShipmentStatus,
  getOverdueUiParts,
  getSlaLabel,
} from "../lib/caseIntelligence";
import {
  getExceptionById,
  listAuditLogs,
  notifyCustomer,
  updateException,
} from "../lib/exceptionService";
import type { CustomerTemplate, ExceptionItem, ExceptionStatus } from "../types";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const ACTION_LABEL: Record<string, string> = {
  detected: "Phát hiện vấn đề",
  classified: "Phân loại tự động",
  notified: "Gửi cảnh báo nội bộ",
  escalated: "Escalate quản lý",
  claimed_from_web: "Nhận xử lý",
  updated_from_web: "Cập nhật từ trang web",
  customer_notified: "Đã liên hệ khách",
  auto_resolved: "Tự đóng do đã giao xong",
};

function formatVnd(amount: number | null | undefined) {
  if (!amount || amount <= 0) return "Không thu hộ";
  return new Intl.NumberFormat("vi-VN").format(amount) + " ₫";
}

function customerTemplateLabel(item: ExceptionItem): { template: CustomerTemplate; label: string } {
  if (item.exception_type === "address_issue") {
    return { template: "verify_address", label: "Đã nhắn khách xác minh địa chỉ" };
  }
  if (item.exception_type === "failed_delivery") {
    return { template: "confirm_failed", label: "Đã nhắn khách chốt phương án giao lại" };
  }
  return { template: "reschedule", label: "Đã nhắn khách hẹn giao lại" };
}

export function ExceptionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [item, setItem] = useState<ExceptionItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<ExceptionStatus>("open");
  const [note, setNote] = useState("");
  const [auditEvents, setAuditEvents] = useState<Array<{ timestamp: string; event: string; description: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refreshData = async (exceptionId: string) => {
    const [detail, audits] = await Promise.all([getExceptionById(exceptionId), listAuditLogs(exceptionId)]);
    if (detail) {
      setItem(detail);
      setStatus(detail.status);
      setNote(detail.resolution_note || "");
    }
    const cleaned = audits
      .map((log) => {
        const meta = log.metadata || {};
        const reason = typeof meta.reason === "string" ? meta.reason.trim() : "";
        const actor = log.actor || "system";
        const oldMeta = typeof meta.old === "object" && meta.old ? (meta.old as Record<string, unknown>) : null;
        const newMeta = typeof meta.new === "object" && meta.new ? (meta.new as Record<string, unknown>) : null;
        const oldStatus = oldMeta?.status ? String(oldMeta.status) : "";
        const newStatus = newMeta?.status ? String(newMeta.status) : "";
        const hasTransition = Boolean(oldStatus && newStatus && oldStatus !== newStatus);
        const description = reason
          ? `${reason}${hasTransition ? ` • ${oldStatus} → ${newStatus}` : ""} (actor: ${actor})`
          : hasTransition
            ? `${oldStatus} → ${newStatus} • Actor: ${actor}`
            : `Actor: ${actor}`;
        return {
          timestamp: log.created_at,
          event: ACTION_LABEL[log.action] || log.action,
          description,
        };
      })
      .slice(0, 20);

    setAuditEvents(cleaned);
  };

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    refreshData(id)
      .catch((err) => {
        if (!active) return;
        setMessage(err instanceof Error ? err.message : "Không tải được chi tiết case.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const handleSave = async () => {
    if (!item) return;
    setSaving(true);
    setMessage(null);
    try {
      const updated = await updateException(item.id, { status, resolution_note: note });
      if (!updated) {
        setMessage("Lưu thất bại. Vui lòng thử lại.");
        return;
      }
      setItem(updated);
      await refreshData(item.id);
      setMessage("Đã lưu cập nhật case.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Lưu thất bại.");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = async () => {
    if (!item) return;
    setSaving(true);
    setMessage(null);
    try {
      const updated = await updateException(item.id, { status: "resolved", resolution_note: note });
      if (updated) {
        setItem(updated);
        setStatus(updated.status);
      }
      await refreshData(item.id);
      setMessage("Đã đóng case.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Đóng case thất bại.");
    } finally {
      setSaving(false);
    }
  };

  const handleReopen = async () => {
    if (!item) return;
    setSaving(true);
    setMessage(null);
    try {
      const updated = await updateException(item.id, { status: "in_progress" });
      if (updated) {
        setItem(updated);
        setStatus(updated.status);
      }
      await refreshData(item.id);
      setMessage("Đã mở lại case.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Mở lại thất bại.");
    } finally {
      setSaving(false);
    }
  };

  const handleCustomerNotify = async () => {
    if (!item) return;
    const { template, label } = customerTemplateLabel(item);
    setSaving(true);
    setMessage(null);
    try {
      const result = await notifyCustomer(item.id, template);
      if (result.exception) {
        setItem(result.exception);
        setStatus(result.exception.status);
        setNote(result.exception.resolution_note || "");
      }
      await refreshData(item.id);
      if (result.delivery.success) {
        setMessage(`${label} (Telegram đã gửi).`);
      } else {
        setMessage(`${label}, nhưng kênh gửi gặp lỗi: ${result.delivery.error || "không rõ"}.`);
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Gửi thông báo khách thất bại.");
    } finally {
      setSaving(false);
    }
  };

  const logAction = async (action: string) => {
    if (!item) return;
    setSaving(true);
    setMessage(null);
    try {
      const time = new Date().toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
      });
      const line = `[${time}] ${action}`;
      const nextNote = note.trim() ? `${note.trim()}\n${line}` : line;
      const nextStatus: ExceptionStatus = status === "open" ? "in_progress" : status;
      const updated = await updateException(item.id, {
        status: nextStatus,
        resolution_note: nextNote,
      });
      if (updated) {
        setItem(updated);
        setStatus(updated.status);
        setNote(updated.resolution_note || nextNote);
      } else {
        setNote(nextNote);
      }
      await refreshData(item.id);
      setMessage(`Đã ghi nhận: ${action}`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Ghi nhận thất bại.");
    } finally {
      setSaving(false);
    }
  };

  const insight = useMemo(() => (item ? buildCaseInsight(item) : null), [item]);
  const sla = item ? getSlaLabel(item) : null;
  const overdueUi = item ? getOverdueUiParts(item) : null;

  if (loading) {
    return (
      <div className="page-container">
        <section className="card">
          <p className="empty">Đang tải trang xử lý case...</p>
        </section>
      </div>
    );
  }

  if (!item || !insight || !sla || !overdueUi) {
    return (
      <div className="page-container">
        <section className="card">
          <p className="empty">Không tìm thấy case.</p>
          <Link to="/exceptions" className="details-link">
            Quay lại danh sách
          </Link>
        </section>
      </div>
    );
  }

  const isResolved = item.status === "resolved";

  return (
    <div className="page-container fm-detail-page">
      <div className="fm-breadcrumb">
        <Link to="/exceptions">Đơn hàng có vấn đề</Link>
        <ChevronRight size={14} />
        <span>Trang xử lý</span>
      </div>
      <Link to="/exceptions" className="fm-back-link">
        <ArrowLeft size={14} />
        Quay lại danh sách
      </Link>

      <section className="fm-hero-card">
        <div className="fm-hero-main">
          <div>
            <div className="fm-inline fm-hero-badges">
              <SeverityBadge severity={item.severity} />
              <StatusBadge status={status} />
              <span className={`status-pill ${sla.className}`}>{sla.text}</span>
            </div>
            <h1 className="fm-code-title">{item.tracking_number}</h1>
            <p className="fm-hero-title">{insight.headline}</p>
          </div>
        </div>
        <div className="fm-hero-metrics">
          <div className="fm-icon-row">
            <Package size={17} />
            <div>
              <p>Hãng / tuyến giao</p>
              <strong>{item.carrier}</strong>
              <small>
                {item.origin} {"->"} {item.destination}
              </small>
            </div>
          </div>
          <div className="fm-icon-row">
            <Clock size={17} />
            <div>
              <p>{overdueUi.label}</p>
              <strong>{overdueUi.valueText}</strong>
              <small>{item.expected_delivery ? `Dự kiến giao cũ: ${formatDate(item.expected_delivery)}` : "Chưa có dự kiến giao"}</small>
            </div>
          </div>
          <div className="fm-icon-row">
            <Radio size={17} />
            <div>
              <p>Trạng thái đơn hàng</p>
              <strong>{formatShipmentStatus(item.shipment_status)}</strong>
              <small>
                {item.shipment_last_updated ? `Vận đơn cập nhật: ${formatDate(item.shipment_last_updated)}` : "Chưa có cập nhật vận đơn"}
              </small>
            </div>
          </div>
          <div className="fm-icon-row">
            <UserRound size={17} />
            <div>
              <p>Số lần giao thất bại</p>
              <strong>{item.failed_attempts ?? 0}</strong>
            </div>
          </div>
        </div>
      </section>

      <div className="fm-detail-grid">
        <div className="fm-left-col">
          <section className="fm-card">
            <h2 className="fm-section-title">
              <User size={17} />
              Thông tin khách hàng
            </h2>
            <div className="fm-customer-grid">
              <div className="fm-customer-cell">
                <small>Người nhận</small>
                <strong>{item.recipient_name || "Chưa có"}</strong>
              </div>
              <div className="fm-customer-cell">
                <small>Số điện thoại</small>
                <strong>
                  {item.recipient_phone ? (
                    <a href={`tel:${item.recipient_phone}`} className="fm-tel">
                      <Phone size={13} /> {item.recipient_phone}
                    </a>
                  ) : "Chưa có"}
                </strong>
              </div>
              <div className="fm-customer-cell">
                <small>Tiền thu hộ (COD)</small>
                <strong>{formatVnd(item.cod_amount)}</strong>
              </div>
              <div className="fm-customer-cell fm-customer-full">
                <small>Địa chỉ giao</small>
                <strong>{item.recipient_address || "Chưa có"}</strong>
              </div>
              <div className="fm-customer-cell">
                <small>Sản phẩm</small>
                <strong>{item.product_summary || "—"}</strong>
              </div>
              <div className="fm-customer-cell">
                <small>Khối lượng / Kiện</small>
                <strong>
                  {item.weight_kg ? `${item.weight_kg} kg` : "—"}
                  {item.package_count ? ` • ${item.package_count} kiện` : ""}
                </strong>
              </div>
              <div className="fm-customer-cell fm-customer-full">
                <small>Lần quét cuối</small>
                <strong>
                  {item.last_scan_location || "—"}
                  {item.last_scan_note ? ` — ${item.last_scan_note}` : ""}
                </strong>
              </div>
            </div>
          </section>

          <section className="fm-card">
            <h2 className="fm-section-title">
              <AlertTriangle size={17} />
              Tóm tắt tình huống
            </h2>
            <div className="fm-story-grid">
              <article className="fm-story-card">
                <small>Vì sao bị gắn cờ</small>
                <strong>{formatReason(item.reason)}</strong>
                <p>{insight.likelyCause}</p>
              </article>
              <article className="fm-story-card">
                <small>Tác động nghiệp vụ</small>
                <strong>{insight.impact}</strong>
                <p>{insight.escalationLabel}</p>
              </article>
              <article className="fm-story-card">
                <small>Gợi ý xử lý</small>
                <strong>{item.ai_suggestion || "Chưa có gợi ý"}</strong>
              </article>
            </div>
          </section>

          <section className="fm-card">
            <h2 className="fm-section-title">
              <ShieldAlert size={17} />
              Tín hiệu và bằng chứng
            </h2>
            <div className="fm-evidence-list">
              {insight.evidence.map((evidence) => (
                <div key={evidence} className="fm-evidence-item">
                  <span className="fm-timeline-dot" />
                  <p>{evidence}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="fm-card">
            <h2 className="fm-section-title">
              <ClipboardList size={17} />
              Hướng dẫn xử lý đề xuất
            </h2>
            <div className="fm-playbook">
              {insight.playbook.map((step) => (
                <article key={step.label} className={`fm-playbook-step ${step.done ? "done" : ""}`}>
                  <div className="fm-playbook-icon">{step.done ? <CheckCircle2 size={18} /> : <Clock size={18} />}</div>
                  <div>
                    <strong>{step.label}</strong>
                    <p>{step.detail}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="fm-card">
            <h2 className="fm-section-title">
              <Calendar size={17} />
              Lịch sử thao tác
            </h2>
            <div className="fm-timeline">
              {auditEvents.length === 0 ? (
                <p className="empty">Chưa có lịch sử thao tác.</p>
              ) : (
                auditEvents.map((event, idx) => (
                  <div key={`${event.timestamp}-${idx}`} className="fm-timeline-item">
                    <div className="fm-timeline-dot" />
                    <div>
                      <strong className="fm-timeline-title">{event.event}</strong>
                      <p>{event.description}</p>
                      <small>{formatDate(event.timestamp)}</small>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <aside className="fm-right-col">
          <section className="fm-card fm-actions">
            <h3>Thao tác xử lý</h3>

            <div className="fm-callout">
              <Sparkles size={16} />
              <div>
                <strong>Bước tiếp theo</strong>
                <p>{insight.nextAction}</p>
              </div>
            </div>

            {!isResolved && (
              <div className="fm-quick-actions">
                <div className="fm-quick-header">
                  <strong>Liên hệ khách</strong>
                </div>
                <div className="fm-quick-list">
                  <button
                    type="button"
                    className="fm-quick-chip fm-quick-chip-primary"
                    disabled={saving}
                    onClick={() => void handleCustomerNotify()}
                  >
                    {customerTemplateLabel(item).label}
                  </button>
                </div>
                <div className="fm-quick-header" style={{ marginTop: 14 }}>
                  <strong>Ghi nhận thao tác nội bộ</strong>
                </div>
                <div className="fm-quick-list">
                  {insight.noteTemplates.map((template) => (
                    <button
                      key={template}
                      type="button"
                      className="fm-quick-chip"
                      disabled={saving}
                      onClick={() => logAction(template)}
                    >
                      {template}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="fm-action-buttons">
              {!isResolved && (
                <button className="btn btn-primary fm-btn" disabled={saving} onClick={handleClose}>
                  <CheckCircle2 size={16} />
                  Đóng case
                </button>
              )}
              {isResolved && (
                <button className="btn btn-secondary fm-btn" disabled={saving} onClick={handleReopen}>
                  <RotateCcw size={16} />
                  Mở lại case
                </button>
              )}
            </div>

            <details className="fm-manual-edit">
              <summary>Chỉnh trạng thái / note thủ công</summary>
              <label className="fm-field">
                Trạng thái
                <select value={status} onChange={(e) => setStatus(e.target.value as ExceptionStatus)}>
                  <option value="open">Mới phát hiện</option>
                  <option value="in_progress">Đang xử lý</option>
                  <option value="resolved">Đã đóng</option>
                </select>
              </label>
              <label className="fm-field">
                Ghi chú xử lý
                <textarea
                  rows={6}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ghi chú..."
                />
              </label>
              <button className="btn btn-secondary fm-btn" disabled={saving} onClick={handleSave}>
                <Save size={16} />
                Lưu thay đổi thủ công
              </button>
            </details>

            {message && <p className="inline-message">{message}</p>}
          </section>

          <section className="fm-card fm-quick-info">
            <h3>Thông tin nhanh</h3>
            <div className="fm-quick-grid">
              <div>
                <p>Mã case</p>
                <code>{item.id.slice(0, 8)}</code>
              </div>
              <div>
                <p>Loại vấn đề</p>
                <strong>{formatExceptionType(item.exception_type)}</strong>
              </div>
              <div>
                <p>Trạng thái đơn hàng</p>
                <strong>{formatShipmentStatus(item.shipment_status)}</strong>
              </div>
              <div>
                <p>Phát hiện lúc</p>
                <strong>{formatDate(item.detected_at)}</strong>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
