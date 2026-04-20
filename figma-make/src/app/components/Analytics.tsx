import { useState } from 'react';
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
} from 'recharts';
import { Calendar, TrendingUp, Clock, AlertTriangle, Package } from 'lucide-react';
import { mockExceptions } from '../data/mockData';

export function Analytics() {
  const [dateRange, setDateRange] = useState('7');

  const totalExceptions = mockExceptions.length;
  const resolvedCount = mockExceptions.filter((e) => e.status === 'resolved').length;
  const resolvedRate = ((resolvedCount / totalExceptions) * 100).toFixed(1);
  const avgResponseTime = 42;
  const criticalOpen = mockExceptions.filter((e) => e.severity === 'CRITICAL' && e.status !== 'resolved').length;

  const hourlyData = [
    { hour: '00:00', count: 2 },
    { hour: '03:00', count: 1 },
    { hour: '06:00', count: 3 },
    { hour: '09:00', count: 8 },
    { hour: '12:00', count: 5 },
    { hour: '15:00', count: 7 },
    { hour: '18:00', count: 4 },
    { hour: '21:00', count: 3 },
  ];

  const typeData = [
    { name: 'Trễ hạn', value: 4, color: '#ef4444' },
    { name: 'Giao thất bại', value: 2, color: '#f97316' },
    { name: 'Kẹt', value: 2, color: '#eab308' },
    { name: 'Địa chỉ', value: 1, color: '#22c55e' },
  ];

  const carrierData = [
    { carrier: 'GHN', count: 3 },
    { carrier: 'Viettel Post', count: 2 },
    { carrier: 'J&T', count: 2 },
    { carrier: 'GHTK', count: 2 },
  ];

  const trendData = [
    { day: 'T2', total: 12, resolved: 8 },
    { day: 'T3', total: 15, resolved: 11 },
    { day: 'T4', total: 10, resolved: 7 },
    { day: 'T5', total: 8, resolved: 6 },
    { day: 'T6', total: 14, resolved: 10 },
    { day: 'T7', total: 9, resolved: 7 },
    { day: 'CN', total: 6, resolved: 4 },
  ];

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">Phân tích & Báo cáo</h1>
          <p className="text-slate-600">Tổng quan hoạt động xử lý ngoại lệ</p>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-slate-600" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7">7 ngày qua</option>
            <option value="30">30 ngày qua</option>
            <option value="90">90 ngày qua</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-xs text-slate-500">7 ngày</span>
          </div>
          <p className="text-3xl font-semibold text-slate-900 mb-1">{totalExceptions}</p>
          <p className="text-sm text-slate-600">Tổng ngoại lệ</p>
          <div className="mt-3 flex items-center gap-1 text-sm">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="text-green-600 font-medium">12%</span>
            <span className="text-slate-500">so với tuần trước</span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-xs text-slate-500">7 ngày</span>
          </div>
          <p className="text-3xl font-semibold text-slate-900 mb-1">{resolvedRate}%</p>
          <p className="text-sm text-slate-600">Tỷ lệ đã xử lý</p>
          <div className="mt-3 flex items-center gap-1 text-sm">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="text-green-600 font-medium">8%</span>
            <span className="text-slate-500">so với tuần trước</span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-xs text-slate-500">Trung bình</span>
          </div>
          <p className="text-3xl font-semibold text-slate-900 mb-1">{avgResponseTime}</p>
          <p className="text-sm text-slate-600">Phút phản hồi TB</p>
          <div className="mt-3 flex items-center gap-1 text-sm">
            <TrendingUp className="w-4 h-4 text-green-600 rotate-180" />
            <span className="text-green-600 font-medium">15%</span>
            <span className="text-slate-500">nhanh hơn tuần trước</span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <span className="text-xs text-slate-500">Hiện tại</span>
          </div>
          <p className="text-3xl font-semibold text-slate-900 mb-1">{criticalOpen}</p>
          <p className="text-sm text-slate-600">CRITICAL chưa xử lý</p>
          <div className="mt-3">
            <span className="text-xs text-red-600 font-medium">Cần xử lý ngay</span>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Hourly Distribution */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Ngoại lệ theo giờ trong ngày</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="hour" tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Exception Type Distribution */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Phân bố theo loại ngoại lệ</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={typeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {typeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-2 gap-6">
        {/* Carrier Distribution */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Ngoại lệ theo hãng vận chuyển</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={carrierData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis dataKey="carrier" type="category" tick={{ fill: '#64748b', fontSize: 12 }} width={100} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 7-Day Trend */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Xu hướng xử lý 7 ngày</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="total" stroke="#3b82f6" name="Tổng ngoại lệ" strokeWidth={2} />
              <Line type="monotone" dataKey="resolved" stroke="#22c55e" name="Đã xử lý" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
