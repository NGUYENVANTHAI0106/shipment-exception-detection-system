/** Nhãn hiển thị tiếng Việt cho cột shipments.status trong DB */

const LABELS: Record<string, string> = {
  in_transit: "Đang giao / vận chuyển",
  failed_delivery: "Giao thất bại",
  address_issue: "Địa chỉ / liên lạc",
  stuck: "Kẹt hàng / không cập nhật",
  delivered: "Đã giao",
  returned: "Hoàn / trả hàng",
  failed: "Giao không thành",
};

export function shipmentOperationalStatusVi(status: string | null | undefined): string {
  if (!status) return "—";
  return LABELS[status] ?? status;
}
