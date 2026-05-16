/** Giá trị cho input[type=datetime-local] theo timezone trình duyệt */

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function dateToDatetimeLocalValue(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** +/- N ngày lịch (máy người dùng), có thể đặt hạn SLA ở quá khứ. Giờ mặc định 17:00 — đổi nếu cần hẹn cụ thể trong ô nhập tay. */
export function offsetCalendarDaysLocal(deltaDays: number, hourLocal = 17, minuteLocal = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + deltaDays);
  d.setHours(hourLocal, minuteLocal, 0, 0);
  return dateToDatetimeLocalValue(d);
}

export function isoStringToDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  return dateToDatetimeLocalValue(new Date(iso));
}
