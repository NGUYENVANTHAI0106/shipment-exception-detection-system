import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { AlertTriangle, Calendar, Clock, Package, TrendingUp } from "lucide-react";
import { listExceptions } from "../lib/exceptionService";
import type { ExceptionItem, ExceptionType } from "../types";

interface DailyTrendPoint {
  day: string;
  total: number;
  resolved: number;
}

function normalizeTypeLabel(type: ExceptionType): string {
  if (type === "delay") return "Trễ hạn";
  if (type === "failed_delivery") return "Giao thất bại";
  if (type === "address_issue") return "Địa chỉ";
  return "Kẹt";
}

export function OpsAnalyticsPage() {
  const [items, setItems] = useState<ExceptionItem[]>([]);
  const [dateRange, setDateRange] = useState("7");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const data = await listExceptions();
      if (!mounted) return;
      setItems(data);
    };
    void load();
    const timer = setInterval(() => {
      void load();
    }, 5000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, []);

  const stats = useMemo(() => {
    const total = items.length;
    const resolved = items.filter((it) => it.status === "resolved").length;
    const criticalOpen = items.filter((it) => it.severity === "CRITICAL" && it.status !== "resolved").length;
    const avgResponseTime = Math.round(
      items.reduce((acc, it) => acc + Math.max(it.overdue_hours, 0), 0) / Math.max(total, 1),
    );
    const resolvedRate = total === 0 ? 0 : (resolved / total) * 100;
    return { total, resolvedRate, avgResponseTime, criticalOpen };
  }, [items]);

  const hourlyData = useMemo(() => {
    const buckets = new Map<string, number>();
    for (let i = 0; i < 8; i += 1) {
      const date = new Date();
      date.setHours(date.getHours() - (7 - i));
      const label = `${date.getHours().toString().padStart(2, "0")}:00`;
      buckets.set(label, 0);
    }
    items.forEach((it) => {
      const hour = new Date(it.detected_at).getHours().toString().padStart(2, "0") + ":00";
      if (buckets.has(hour)) {
        buckets.set(hour, (buckets.get(hour) || 0) + 1);
      }
    });
    return Array.from(buckets.entries()).map(([hour, count]) => ({ hour, count }));
  }, [items]);

  const typeDistribution = useMemo(() => {
    const base: Record<ExceptionType, number> = {
      delay: 0,
      failed_delivery: 0,
      address_issue: 0,
      stuck: 0,
    };
    items.forEach((it) => {
      base[it.exception_type] += 1;
    });
    const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e"];
    return (Object.keys(base) as ExceptionType[]).map((type) => ({
      name: normalizeTypeLabel(type),
      value: base[type],
      color: colors[(Object.keys(base) as ExceptionType[]).indexOf(type)],
    }));
  }, [items]);

  const carrierData = useMemo(() => {
    const counts: Record<string, number> = {};
    items.forEach((it) => {
      counts[it.carrier] = (counts[it.carrier] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([carrier, value]) => ({ carrier, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 4);
  }, [items]);

  const trend = useMemo<DailyTrendPoint[]>(() => {
    const points: DailyTrendPoint[] = [];
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayKey = d.toLocaleDateString("vi-VN", { weekday: "short" });
      const dayItems = items.filter((it) => {
        const dt = new Date(it.detected_at);
        return dt.toDateString() === d.toDateString();
      });
      points.push({
        day: dayKey,
        total: dayItems.length,
        resolved: dayItems.filter((it) => it.status === "resolved").length,
      });
    }
    return points;
  }, [items]);

  return (
    <div className="page-container fm-analytics-page">
      <div className="fm-page-head">
        <div>
          <h1>Phân tích & Báo cáo</h1>
          <p>Tổng quan hoạt động xử lý ngoại lệ</p>
        </div>
        <div className="fm-date-filter">
          <Calendar size={18} />
          <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
            <option value="7">7 ngày qua</option>
            <option value="30">30 ngày qua</option>
            <option value="90">90 ngày qua</option>
          </select>
        </div>
      </div>

      <section className="fm-kpi-grid">
        <article className="fm-kpi-card">
          <div className="fm-kpi-top">
            <span className="fm-kpi-icon icon-blue">
              <Package size={18} />
            </span>
            <small>7 ngày</small>
          </div>
          <h3>{stats.total}</h3>
          <p>Tổng ngoại lệ</p>
          <div className="fm-kpi-trend">
            <TrendingUp size={14} />
            <span>12% so với tuần trước</span>
          </div>
        </article>
        <article className="fm-kpi-card">
          <div className="fm-kpi-top">
            <span className="fm-kpi-icon icon-green">
              <TrendingUp size={18} />
            </span>
            <small>7 ngày</small>
          </div>
          <h3>{stats.resolvedRate.toFixed(1)}%</h3>
          <p>Tỷ lệ đã xử lý</p>
          <div className="fm-kpi-trend">
            <TrendingUp size={14} />
            <span>8% so với tuần trước</span>
          </div>
        </article>
        <article className="fm-kpi-card">
          <div className="fm-kpi-top">
            <span className="fm-kpi-icon icon-purple">
              <Clock size={18} />
            </span>
            <small>Trung bình</small>
          </div>
          <h3>{stats.avgResponseTime}</h3>
          <p>Phút phản hồi TB</p>
          <div className="fm-kpi-trend">
            <TrendingUp size={14} />
            <span>15% nhanh hơn tuần trước</span>
          </div>
        </article>
        <article className="fm-kpi-card">
          <div className="fm-kpi-top">
            <span className="fm-kpi-icon icon-red">
              <AlertTriangle size={18} />
            </span>
            <small>Hiện tại</small>
          </div>
          <h3>{stats.criticalOpen}</h3>
          <p>CRITICAL chưa xử lý</p>
          <div className="fm-kpi-alert">Cần xử lý ngay</div>
        </article>
      </section>

      <section className="fm-analytics-grid">
        <article className="fm-chart-card">
          <h2>Ngoại lệ theo giờ trong ngày</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="hour" tick={{ fill: "#64748b", fontSize: 12 }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} animationDuration={900} />
            </BarChart>
          </ResponsiveContainer>
        </article>
        <article className="fm-chart-card">
          <h2>Phân bố theo loại ngoại lệ</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={typeDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                outerRadius={100}
                dataKey="value"
                animationBegin={100}
                animationDuration={950}
              >
                {typeDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </article>
        <article className="fm-chart-card">
          <h2>Ngoại lệ theo hãng vận chuyển</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={carrierData.map((item) => ({ carrier: item.carrier, count: item.value }))}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fill: "#64748b", fontSize: 12 }} />
              <YAxis dataKey="carrier" type="category" tick={{ fill: "#64748b", fontSize: 12 }} width={100} />
              <Tooltip />
              <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} animationDuration={900} />
            </BarChart>
          </ResponsiveContainer>
        </article>
        <article className="fm-chart-card">
          <h3>Xu hướng xử lý 7 ngày</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 12 }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#3b82f6"
                name="Tổng ngoại lệ"
                strokeWidth={2}
                dot={false}
                animationDuration={900}
              />
              <Line
                type="monotone"
                dataKey="resolved"
                stroke="#22c55e"
                name="Đã xử lý"
                strokeWidth={2}
                dot={false}
                animationBegin={120}
                animationDuration={900}
              />
            </LineChart>
          </ResponsiveContainer>
        </article>
      </section>
    </div>
  );
}
