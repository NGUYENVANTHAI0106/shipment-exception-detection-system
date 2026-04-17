const TOKEN_LABELS = {
  overview: "Tổng quan",
  shipments: "Vận đơn",
  shipment: "Vận đơn",
  exceptions: "Ngoại lệ",
  exception: "Ngoại lệ",
  upload: "Nhập liệu",
  login: "Đăng nhập",
  admin: "Quản trị",
  dashboard: "Bảng điều khiển",
  analytics: "Phân tích",
  rules: "Quy tắc",
  users: "Người dùng",
  client: "Khách hàng",
  clients: "Khách hàng",
  admin_user: "Quản trị viên",
  role: "Vai trò",
  company: "Công ty",
  company_name: "Công ty",
  tracking: "Mã vận đơn",
  carrier: "Hãng vận chuyển",
  status: "Trạng thái",
  status_in: "Trạng thái cần khớp",
  severity: "Mức độ",
  type: "Loại",
  description: "Mô tả",
  detected: "Phát hiện",
  created: "Mới tạo",
  updated: "Cập nhật",
  pending: "Chờ xử lý",
  open: "Mở",
  investigating: "Đang điều tra",
  resolved: "Đã giải quyết",
  dismissed: "Đã bỏ qua",
  delivered: "Đã giao",
  in_transit: "Đang vận chuyển",
  delayed: "Chậm tiến độ",
  failed: "Thất bại",
  lost: "Thất lạc",
  cancelled: "Đã hủy",
  info: "Thông tin",
  healthy: "Ổn định",
  low: "Thấp",
  medium: "Trung bình",
  high: "Cao",
  critical: "Nghiêm trọng",
  custom: "Tùy chỉnh",
  delay: "Trễ hẹn",
  damaged: "Hư hỏng",
  active: "Đang bật",
  inactive: "Đang tắt",
  enabled: "Đang bật",
  disabled: "Đã tắt",
  true: "Bật",
  false: "Tắt"
};

export function humanizeToken(value) {
  if (!value) return "Chưa xác định";

  const normalized = String(value)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (TOKEN_LABELS[normalized]) return TOKEN_LABELS[normalized];

  return String(value)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return new Intl.NumberFormat("vi-VN").format(Number(value));
}

export function formatDateTime(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export function truncateText(value, maxLength = 96) {
  if (!value) return "";
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}...`;
}
