import { Activity, AlertOctagon, ArrowRight, CheckCircle2, RefreshCw, ShieldAlert, Timer } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SeverityBadge } from "../components/SeverityBadge";
import { StatusBadge } from "../components/StatusBadge";
import { buildCaseInsight, getSlaLabel, getUrgencyScore } from "../lib/caseIntelligence";
import { getStats, listExceptions } from "../lib/exceptionService";
import type { ExceptionItem, Severity, Stats } from "../types";

const SEVERITY_COLORS: Record<Severity, string> = {
  CRITICAL: "#dc2626",
  HIGH: "#f97316",
  MEDIUM: "#3b82f6",
  LOW: "#10b981",
};

const TYPE_LABEL: Record<string, string> = {
  delay: "Trễ hạn",
  failed_delivery: "Giao thất bại",
  stuck: "Kẹt hàng",
  address_issue: "Địa chỉ",
};

function formatHourLabel(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:00`;
}

function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DashboardPage() {
  const [items, setItems] = useState<ExceptionItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const [data, statsData] = await Promise.all([listExceptions(), getStats()]);
      setItems(data);
      setStats(statsData);
      setError(null);
      setLastSyncedAt(new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 10000);
    return () => clearInterval(timer);
  }, []);

  const active = useMemo(() => items.filter((it) => it.status !== "resolved"), [items]);

  const severityData = useMemo(() => {
    const counts: Record<Severity, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    active.forEach((it) => {
      counts[it.severity] += 1;
    });
    return (Object.entries(counts) as [Severity, number][])
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({ name, value, color: SEVERITY_COLORS[name] }));
  }, [active]);

  const typeData = useMemo(() => {
    const counts = new Map<string, number>();
    active.forEach((it) => counts.set(it.exception_type, (counts.get(it.exception_type) ?? 0) + 1));
    return Array.from(counts.entries()).map(([key, value]) => ({
      name: TYPE_LABEL[key] || key,
      value,
    }));
  }, [active]);

  const trendData = useMemo(() => {
    const now = new Date();
    const buckets: Array<{ time: string; detected: number; resolved: number; hour: number }> = [];
    for (let i = 11; i >= 0; i--) {
      const slot = new Date(now);
      slot.setMinutes(0, 0, 0);
      slot.setHours(slot.getHours() - i * 2);
      buckets.push({ time: formatHourLabel(slot), detected: 0, resolved: 0, hour: slot.getTime() });
    }
    items.forEach((it) => {
      const detected = new Date(it.detected_at).getTime();
      const detectedBucket = buckets.findIndex(
        (b, idx) => detected >= b.hour && (idx === buckets.length - 1 || detected < buckets[idx + 1].hour),
      );
      if (detectedBucket >= 0) buckets[detectedBucket].detected += 1;
      if (it.resolved_at) {
        const resolved = new Date(it.resolved_at).getTime();
        const resolvedBucket = buckets.findIndex(
          (b, idx) => resolved >= b.hour && (idx === buckets.length - 1 || resolved < buckets[idx + 1].hour),
        );
        if (resolvedBucket >= 0) buckets[resolvedBucket].resolved += 1;
      }
    });
    return buckets.map(({ time, detected, resolved }) => ({ time, detected, resolved }));
  }, [items]);

  const carrierData = useMemo(() => {
    const counts = new Map<string, number>();
    active.forEach((it) => counts.set(it.carrier, (counts.get(it.carrier) ?? 0) + 1));
    return Array.from(counts.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [active]);

  const urgent = useMemo(
    () =>
      [...active]
        .sort((a, b) => getUrgencyScore(b) - getUrgencyScore(a))
        .slice(0, 4),
    [active],
  );

  const total = stats?.open_total ?? active.length;
  const critical = stats?.critical_total ?? active.filter((it) => it.severity === "CRITICAL").length;
  const breached = stats?.breached_total ?? active.filter((it) => it.sla_breached).length;
  const resolved24h = stats?.resolved_24h ?? 0;
  const breachRate = total > 0 ? Math.round((breached / total) * 100) : 0;

  return (
    <div className="page-container v2-dashboard">
      <header className="v2-page-head">
        <div>
          <h1>Tổng quan</h1>
          <p>Tình hình các đơn hàng có vấn đề.</p>
        </div>
        <div className="v2-page-head-side">
          <span className="v2-sync">
            <Activity size={14} />
            {lastSyncedAt ? `Đồng bộ ${formatDateShort(lastSyncedAt)}` : "Đang tải..."}
          </span>
          <button className="btn btn-primary" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw size={14} />
            Làm mới
          </button>
        </div>
      </header>

      {error && <div className="v2-alert">{error}</div>}

      <section className="v2-kpi-grid">
        <article className="v2-kpi v2-kpi-blue">
          <div className="v2-kpi-icon">
            <Activity size={20} />
          </div>
          <span>Đang xử lý</span>
          <strong>{total}</strong>
          <small>Case chưa đóng</small>
        </article>
        <article className="v2-kpi v2-kpi-red">
          <div className="v2-kpi-icon">
            <ShieldAlert size={20} />
          </div>
          <span>Mức khẩn cấp</span>
          <strong>{critical}</strong>
          <small>Cần xử lý trước</small>
        </article>
        <article className="v2-kpi v2-kpi-amber">
          <div className="v2-kpi-icon">
            <Timer size={20} />
          </div>
          <span>Quá hạn xử lý</span>
          <strong>{breached}</strong>
          <small>{breachRate}% trên tổng case</small>
        </article>
        <article className="v2-kpi v2-kpi-green">
          <div className="v2-kpi-icon">
            <CheckCircle2 size={20} />
          </div>
          <span>Đã đóng (24 giờ)</span>
          <strong>{resolved24h}</strong>
          <small>Xử lý xong</small>
        </article>
      </section>

      <section className="v2-chart-grid">
        <article className="v2-chart-card">
          <header>
            <h2>Phân bố theo mức độ</h2>
            <small>{active.length} case</small>
          </header>
          <div className="v2-chart-body">
            {severityData.length === 0 ? (
              <div className="v2-chart-empty">Chưa có case đang mở.</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={severityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={96}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {severityData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={28} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>

        <article className="v2-chart-card">
          <header>
            <h2>Theo loại vấn đề</h2>
          </header>
          <div className="v2-chart-body">
            {typeData.length === 0 ? (
              <div className="v2-chart-empty">Chưa có case đang mở.</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={typeData} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip cursor={{ fill: "rgba(37,99,235,0.06)" }} />
                  <Bar dataKey="value" fill="#2563eb" radius={[8, 8, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>

        <article className="v2-chart-card v2-chart-card-wide">
          <header>
            <h2>Diễn biến 24 giờ qua</h2>
          </header>
          <div className="v2-chart-body">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trendData} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" />
                <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend verticalAlign="top" height={28} iconType="circle" />
                <Line
                  type="monotone"
                  dataKey="detected"
                  name="Phát hiện"
                  stroke="#f97316"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="resolved"
                  name="Đã đóng"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="v2-chart-card">
          <header>
            <h2>Hãng vận chuyển nhiều lỗi nhất</h2>
          </header>
          <div className="v2-chart-body">
            {carrierData.length === 0 ? (
              <div className="v2-chart-empty">Chưa có dữ liệu.</div>
            ) : (
              <div className="v2-carrier-list">
                {carrierData.map((c, idx) => {
                  const max = carrierData[0].value;
                  const pct = max > 0 ? (c.value / max) * 100 : 0;
                  return (
                    <div key={c.name} className="v2-carrier-row">
                      <span className="v2-carrier-rank">#{idx + 1}</span>
                      <span className="v2-carrier-name">{c.name}</span>
                      <div className="v2-carrier-bar">
                        <div className="v2-carrier-bar-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <strong>{c.value}</strong>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="v2-urgent-section">
        <header className="v2-urgent-head">
          <div>
            <h2>Case khẩn cấp cần xử lý đầu tiên</h2>
          </div>
          <Link to="/exceptions" className="v2-link">
            Xem toàn bộ <ArrowRight size={14} />
          </Link>
        </header>

        {urgent.length === 0 ? (
          <div className="v2-empty-state">
            <AlertOctagon size={28} />
            <p>Không có case khẩn cấp nào. Tuyệt vời!</p>
          </div>
        ) : (
          <div className="v2-urgent-grid">
            {urgent.map((item) => {
              const insight = buildCaseInsight(item);
              const sla = getSlaLabel(item);
              return (
                <Link key={item.id} to={`/exceptions/${item.id}`} className="v2-urgent-card">
                  <div className="v2-urgent-top">
                    <SeverityBadge severity={item.severity} />
                    <span className={`status-pill ${sla.className}`}>{sla.text}</span>
                  </div>
                  <code className="v2-urgent-code">{item.tracking_number}</code>
                  <p className="v2-urgent-title">{insight.headline}</p>
                  <div className="v2-urgent-foot">
                    <StatusBadge status={item.status} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
