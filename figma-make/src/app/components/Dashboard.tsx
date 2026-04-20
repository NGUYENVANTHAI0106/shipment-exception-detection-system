import { useState } from 'react';
import { Link } from 'react-router';
import { Filter, Clock, ArrowRight } from 'lucide-react';
import { mockExceptions, Severity, ExceptionType, Carrier, Status } from '../data/mockData';
import { SeverityBadge } from './SeverityBadge';
import { StatusBadge } from './StatusBadge';

export function Dashboard() {
  const [severityFilter, setSeverityFilter] = useState<Severity | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<ExceptionType | 'all'>('all');
  const [carrierFilter, setCarrierFilter] = useState<Carrier | 'all'>('all');

  const filteredExceptions = mockExceptions
    .filter((exc) => severityFilter === 'all' || exc.severity === severityFilter)
    .filter((exc) => typeFilter === 'all' || exc.type === typeFilter)
    .filter((exc) => carrierFilter === 'all' || exc.carrier === carrierFilter)
    .sort((a, b) => {
      const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">Danh sách ngoại lệ</h1>
        <p className="text-slate-600">Theo dõi và xử lý các đơn vận chuyển có vấn đề</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-5 h-5 text-slate-600" />
          <span className="font-medium text-slate-700">Bộ lọc</span>
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-slate-700 mb-1">Mức độ</label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as Severity | 'all')}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tất cả</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-slate-700 mb-1">Loại ngoại lệ</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as ExceptionType | 'all')}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tất cả</option>
              <option value="Trễ hạn">Trễ hạn</option>
              <option value="Giao thất bại">Giao thất bại</option>
              <option value="Kẹt">Kẹt</option>
              <option value="Địa chỉ">Địa chỉ</option>
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-slate-700 mb-1">Hãng vận chuyển</label>
            <select
              value={carrierFilter}
              onChange={(e) => setCarrierFilter(e.target.value as Carrier | 'all')}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tất cả</option>
              <option value="GHN">GHN</option>
              <option value="GHTK">GHTK</option>
              <option value="Viettel Post">Viettel Post</option>
              <option value="J&T">J&T</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Mức độ
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Loại
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Mã tracking
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Hãng
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Tuyến
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Quá hạn
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                  Phát hiện
                </th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredExceptions.map((exception) => (
                <tr
                  key={exception.id}
                  className={`hover:bg-slate-50 transition-colors ${
                    exception.severity === 'CRITICAL' ? 'bg-red-50/30' : ''
                  }`}
                >
                  <td className="px-4 py-4">
                    <SeverityBadge severity={exception.severity} />
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-700">{exception.type}</td>
                  <td className="px-4 py-4">
                    <code className="text-sm font-mono text-blue-600">{exception.trackingCode}</code>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm font-medium text-slate-900">{exception.carrier}</span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <span>{exception.origin}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span>{exception.destination}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5 text-sm">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span className="font-medium text-slate-900">{exception.overduehours}h</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={exception.status} />
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-600">{formatDate(exception.detectedAt)}</td>
                  <td className="px-4 py-4">
                    <Link
                      to={`/dashboard/exception/${exception.id}`}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      Chi tiết →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredExceptions.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-slate-500">Không tìm thấy ngoại lệ nào phù hợp với bộ lọc</p>
          </div>
        )}

        {filteredExceptions.length > 0 && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-sm text-slate-600">
            Hiển thị {filteredExceptions.length} ngoại lệ • Ưu tiên CRITICAL trên cùng
          </div>
        )}
      </div>
    </div>
  );
}
