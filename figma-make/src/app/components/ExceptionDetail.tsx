import { useState } from 'react';
import { useParams, Link } from 'react-router';
import {
  ChevronRight,
  Package,
  MapPin,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  Save,
  ArrowLeft,
  Clock,
} from 'lucide-react';
import { mockExceptions, getTimelineForException, Status } from '../data/mockData';
import { SeverityBadge } from './SeverityBadge';
import { StatusBadge } from './StatusBadge';

export function ExceptionDetail() {
  const { id } = useParams();
  const exception = mockExceptions.find((exc) => exc.id === id);
  const [status, setStatus] = useState<Status>(exception?.status || 'open');
  const [notes, setNotes] = useState(exception?.notes || '');
  const [escalated, setEscalated] = useState(exception?.escalated || false);

  if (!exception) {
    return (
      <div className="p-8">
        <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
          <p className="text-slate-600">Không tìm thấy ngoại lệ này</p>
          <Link to="/dashboard" className="text-blue-600 hover:text-blue-700 mt-4 inline-block">
            ← Quay lại danh sách
          </Link>
        </div>
      </div>
    );
  }

  const timeline = getTimelineForException(exception.id);

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

  const handleSave = () => {
    alert('Đã lưu thay đổi!');
  };

  const handleEscalate = () => {
    setEscalated(true);
    alert('Đã leo thang lên quản lý!');
  };

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-6">
        <Link to="/dashboard" className="text-blue-600 hover:text-blue-700">
          Ngoại lệ
        </Link>
        <ChevronRight className="w-4 h-4 text-slate-400" />
        <span className="text-slate-600">Chi tiết</span>
      </div>

      {/* Back Button */}
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Quay lại danh sách</span>
      </Link>

      <div className="grid grid-cols-3 gap-6">
        {/* Main Content - Left 2 columns */}
        <div className="col-span-2 space-y-6">
          {/* Summary Card */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-semibold text-slate-900 mb-2">{exception.trackingCode}</h1>
                <div className="flex items-center gap-3">
                  <SeverityBadge severity={exception.severity} />
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-700 font-medium">{exception.type}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-600 mb-1">Trạng thái xử lý</p>
                <StatusBadge status={status} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
              <div className="flex items-start gap-3">
                <Package className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-600">Hãng vận chuyển</p>
                  <p className="font-medium text-slate-900">{exception.carrier}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-sm text-slate-600">Quá hạn</p>
                  <p className="font-medium text-red-600">{exception.overduehours} giờ</p>
                </div>
              </div>
            </div>
          </div>

          {/* Shipment Info */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-slate-600" />
              Thông tin lô hàng
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Điểm gửi</p>
                  <p className="font-medium text-slate-900">{exception.origin}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">Điểm nhận</p>
                  <p className="font-medium text-slate-900">{exception.destination}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-600 mb-1">Hạn giao dự kiến</p>
                  <p className="font-medium text-slate-900">{formatDate(exception.expectedDelivery)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-1">Thời điểm phát hiện</p>
                  <p className="font-medium text-slate-900">{formatDate(exception.detectedAt)}</p>
                </div>
              </div>

              {exception.failedAttempts && (
                <div className="pt-3 border-t border-slate-200">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    <p className="text-sm">
                      <span className="text-slate-600">Số lần giao thất bại:</span>{' '}
                      <span className="font-medium text-orange-600">{exception.failedAttempts} lần</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AI Suggestion */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                Gợi ý xử lý
              </h2>
              {exception.aiAvailable && exception.aiConfidence ? (
                <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-blue-200">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Độ tin cậy {exception.aiConfidence}%</span>
                </div>
              ) : (
                <div className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full border border-amber-300 text-xs font-medium">
                  AI không khả dụng — theo quy tắc
                </div>
              )}
            </div>
            <p className="text-slate-700 leading-relaxed">{exception.aiSuggestion}</p>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-slate-600" />
              Lịch sử xử lý
            </h2>
            <div className="space-y-4">
              {timeline.map((event, index) => (
                <div key={index} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-1.5"></div>
                    {index < timeline.length - 1 && <div className="w-0.5 h-full bg-slate-200 mt-1"></div>}
                  </div>
                  <div className="flex-1 pb-4">
                    <p className="font-medium text-slate-900">{event.event}</p>
                    <p className="text-sm text-slate-600 mt-0.5">{event.description}</p>
                    <p className="text-xs text-slate-500 mt-1">{formatDate(event.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar - Actions */}
        <div className="space-y-6">
          {/* Status Update */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Hành động</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Đổi trạng thái</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Status)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="open">Mở</option>
                  <option value="notified">Đã thông báo</option>
                  <option value="in_progress">Đang xử lý</option>
                  <option value="resolved">Đã xử lý</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Ghi chú xử lý</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Nhập ghi chú về quá trình xử lý..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <button
                onClick={handleSave}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <Save className="w-4 h-4" />
                Lưu thay đổi
              </button>

              {!escalated && (
                <button
                  onClick={handleEscalate}
                  className="w-full px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                >
                  Leo thang quản lý
                </button>
              )}

              {escalated && (
                <div className="px-4 py-2.5 bg-orange-50 border border-orange-200 rounded-lg text-center">
                  <p className="text-sm font-medium text-orange-800">Đã leo thang</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Info */}
          <div className="bg-slate-50 rounded-lg border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-3">Thông tin nhanh</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-slate-600">ID ngoại lệ</p>
                <p className="font-mono text-slate-900 mt-0.5">{exception.id}</p>
              </div>
              <div>
                <p className="text-slate-600">Loại</p>
                <p className="text-slate-900 mt-0.5">{exception.type}</p>
              </div>
              <div>
                <p className="text-slate-600">Mức độ</p>
                <div className="mt-1">
                  <SeverityBadge severity={exception.severity} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
