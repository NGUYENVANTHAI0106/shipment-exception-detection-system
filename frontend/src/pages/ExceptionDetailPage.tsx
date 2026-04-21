import { ArrowLeft, Save, Siren, Sparkles } from "lucide-react";
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
    <div className="page-container">
      <div className="breadcrumb">
        <Link to="/dashboard">
          <ArrowLeft size={14} />
          Back
        </Link>
      </div>

      <div className="detail-grid">
        <section className="card detail-main">
          <div className="detail-top">
            <div>
              <h1>{item.tracking_number}</h1>
              <div className="inline-badges">
                <SeverityBadge severity={item.severity} />
                <StatusBadge status={status} />
              </div>
            </div>
          </div>

          <div className="summary-grid">
            <div>
              <span>Carrier</span>
              <strong>{item.carrier}</strong>
            </div>
            <div>
              <span>Route</span>
              <strong>
                {item.origin} {"->"} {item.destination}
              </strong>
            </div>
            <div>
              <span>Overdue</span>
              <strong>{item.overdue_hours} hours</strong>
            </div>
            <div>
              <span>Detected</span>
              <strong>{formatDate(item.detected_at)}</strong>
            </div>
          </div>

          <div className="ai-card">
            <h3>
              <Sparkles size={16} />
              Suggested action
            </h3>
            <p>{item.ai_suggestion || "No AI suggestion available."}</p>
          </div>

          <div className="timeline">
            <h3>Timeline</h3>
            {timeline.map((event, idx) => (
              <div key={`${event.timestamp}-${idx}`} className="timeline-item">
                <div className="dot" />
                <div>
                  <strong>{event.event}</strong>
                  <p>{event.description}</p>
                  <small>{formatDate(event.timestamp)}</small>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="card detail-actions">
          <h3>Actions</h3>
          <label>
            Update status
            <select value={status} onChange={(e) => setStatus(e.target.value as ExceptionStatus)}>
              <option value="open">open</option>
              <option value="notified">notified</option>
              <option value="in_progress">in_progress</option>
              <option value="resolved">resolved</option>
            </select>
          </label>

          <label>
            Resolution note
            <textarea
              rows={6}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add operational note and next action."
            />
          </label>

          <button className="btn btn-primary" disabled={saving} onClick={handleSave}>
            <Save size={16} />
            Save changes
          </button>

          <button className="btn btn-secondary" disabled={saving} onClick={handleEscalate}>
            <Siren size={16} />
            Manual escalate
          </button>

          {message && <p className="inline-message">{message}</p>}
        </aside>
      </div>
    </div>
  );
}
