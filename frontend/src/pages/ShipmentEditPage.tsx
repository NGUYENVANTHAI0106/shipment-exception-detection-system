import { ArrowLeft, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { isoStringToDatetimeLocal, offsetCalendarDaysLocal } from "../lib/datetimeLocal";
import {
  createManualException,
  deleteShipment,
  getShipment,
  updateShipment,
} from "../lib/exceptionService";
import type { ExceptionType, ManualExceptionCreatePayload, Severity } from "../types";

function fmtNum(v: number | null | undefined): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

export function ShipmentEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openExceptions, setOpenExceptions] = useState(0);

  const [tracking_number, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [expectedLocal, setExpectedLocal] = useState("");
  const [actualLocal, setActualLocal] = useState("");
  const [status, setStatus] = useState("in_transit");
  const [failedAttempts, setFailedAttempts] = useState("0");
  const [intake_note, setIntakeNote] = useState("");
  const [recipient_name, setRecipientName] = useState("");
  const [recipient_phone, setRecipientPhone] = useState("");
  const [recipient_address, setRecipientAddress] = useState("");
  const [cod_amount, setCodAmount] = useState("");
  const [weight_kg, setWeightKg] = useState("");
  const [package_count, setPackageCount] = useState("");
  const [product_summary, setProductSummary] = useState("");
  const [last_scan_location, setLastScanLocation] = useState("");
  const [last_scan_note, setLastScanNote] = useState("");

  const [excType, setExcType] = useState<ExceptionType>("delay");
  const [excSeverity, setExcSeverity] = useState<Severity>("MEDIUM");
  const [excReason, setExcReason] = useState("");
  const [excOverdue, setExcOverdue] = useState("0");

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const row = await getShipment(id);
      setOpenExceptions(row.open_exception_count);
      setTrackingNumber(row.tracking_number);
      setCarrier(row.carrier);
      setOrigin(row.origin);
      setDestination(row.destination);
      setExpectedLocal(isoStringToDatetimeLocal(row.expected_delivery));
      setActualLocal(isoStringToDatetimeLocal(row.actual_delivery));
      setStatus(row.status);
      setFailedAttempts(String(row.failed_attempts));
      setIntakeNote(row.intake_note || "");
      setRecipientName(row.recipient_name || "");
      setRecipientPhone(row.recipient_phone || "");
      setRecipientAddress(row.recipient_address || "");
      setCodAmount(fmtNum(row.cod_amount ?? undefined));
      setWeightKg(fmtNum(row.weight_kg ?? undefined));
      setPackageCount(fmtNum(row.package_count ?? undefined));
      setProductSummary(row.product_summary || "");
      setLastScanLocation(row.last_scan_location || "");
      setLastScanNote(row.last_scan_note || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được đơn.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const patchParseHelper = (): { ok: true; expected_delivery: string; actual_delivery: string | null; cod: number | null; wg: number | null; pc: number | null; fa: number } | { ok: false; err: string } => {
    if (!expectedLocal) return { ok: false, err: "Cần dự kiến giao." };
    const expected_delivery = new Date(expectedLocal).toISOString();
    const actual_delivery = actualLocal.trim() ? new Date(actualLocal).toISOString() : null;
    let cod: number | null = null;
    if (cod_amount.trim()) {
      const x = Number.parseFloat(cod_amount);
      if (!Number.isFinite(x) || x < 0) return { ok: false, err: "COD không hợp lệ." };
      cod = x;
    }
    let wg: number | null = null;
    if (weight_kg.trim()) {
      const x = Number.parseFloat(weight_kg);
      if (!Number.isFinite(x) || x < 0) return { ok: false, err: "Khối lượng không hợp lệ." };
      wg = x;
    }
    let pc: number | null = null;
    if (package_count.trim()) {
      const x = Number.parseInt(package_count, 10);
      if (!Number.isFinite(x) || x < 0) return { ok: false, err: "Số kiện không hợp lệ." };
      pc = x;
    }
    const faParsed = Number.parseInt(failedAttempts, 10);
    if (!Number.isFinite(faParsed) || faParsed < 0)
      return { ok: false, err: "Số lần giao thất bại không hợp lệ." };
    return {
      ok: true,
      expected_delivery,
      actual_delivery,
      cod,
      wg,
      pc,
      fa: faParsed,
    };
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setError(null);
    const parsed = patchParseHelper();
    if (!parsed.ok) {
      setError(parsed.err);
      return;
    }
    setSaving(true);
    try {
      await updateShipment(id, {
        tracking_number: tracking_number.trim(),
        carrier: carrier.trim(),
        origin: origin.trim(),
        destination: destination.trim(),
        expected_delivery: parsed.expected_delivery,
        actual_delivery: parsed.actual_delivery,
        status: status.trim(),
        failed_attempts: parsed.fa,
        intake_note: intake_note,
        recipient_name: recipient_name.trim() || null,
        recipient_phone: recipient_phone.trim() || null,
        recipient_address: recipient_address.trim() || null,
        cod_amount: parsed.cod,
        weight_kg: parsed.wg,
        package_count: parsed.pc,
        product_summary: product_summary.trim() || null,
        last_scan_location: last_scan_location.trim() || null,
        last_scan_note: last_scan_note.trim() || null,
      });
      await load();
      navigate("/shipments", { state: { flash: "Đã cập nhật vận đơn." } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lưu thất bại.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!id) return;
    const ok = window.confirm(
      "Xóa vận đơn này? Toàn bộ case (exceptions) gắn với đơn cũng bị xóa theo cơ chế CASCADE.",
    );
    if (!ok) return;
    try {
      await deleteShipment(id);
      navigate("/shipments", {
        replace: false,
        state: { flash: "Đã xóa vận đơn." },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không xóa được.");
    }
  };

  const addException = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    const reason = excReason.trim();
    if (!reason) {
      setError("Nhập lý do case.");
      return;
    }
    const oh = Number.parseFloat(excOverdue);
    const overdue_hours = Number.isFinite(oh) && oh >= 0 ? oh : 0;
    const body: ManualExceptionCreatePayload = {
      shipment_id: id,
      exception_type: excType,
      reason,
      severity_hint: excSeverity,
      overdue_hours,
    };
    setSaving(true);
    setError(null);
    try {
      const ex = await createManualException(body);
      navigate(`/exceptions/${ex.id}`, {
        replace: false,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tạo được case.");
    } finally {
      setSaving(false);
    }
  };

  const shipmentStatuses = [
    ["in_transit", "Đang vận chuyển"],
    ["failed_delivery", "Giao thất bại"],
    ["address_issue", "Địa chỉ"],
    ["stuck", "Kẹt hàng"],
  ] as const;

  if (!id) {
    return (
      <div className="page-container">
        <p>Thiếu mã vận đơn.</p>
      </div>
    );
  }

  return (
    <div className="page-container v2-dashboard">
      <header className="v2-page-head">
        <div>
          <Link to="/shipments" className="fm-back-link">
            <ArrowLeft size={16} />
            Danh sách vận đơn
          </Link>
          <h1 style={{ marginTop: 12 }}>Sửa vận đơn</h1>
          <p className="fm-section-hint" style={{ marginTop: 6 }}>
            Code: <code>{id}</code>
          </p>
        </div>
        <div className="v2-page-head-side">
          <button className="btn" type="button" style={{ borderColor: "#dc2626", color: "#b91c1c" }} onClick={() => void remove()}>
            <Trash2 size={14} />
            Xóa đơn
          </button>
        </div>
      </header>

      {loading ? (
        <p className="v2-empty-state">Đang tải...</p>
      ) : (
        <>
          {error && <p className="v2-alert">{error}</p>}

          <form className="v2-chart-card" style={{ padding: "20px 22px", maxWidth: 860 }} onSubmit={(e) => void save(e)}>
            <div className="fm-split-grid">
              <label className="fm-field">
                Mã vận đơn
                <input required value={tracking_number} onChange={(e) => setTrackingNumber(e.target.value)} />
              </label>
              <label className="fm-field">
                Hãng vận chuyển
                <input required value={carrier} onChange={(e) => setCarrier(e.target.value)} />
              </label>
              <label className="fm-field">
                Điểm gửi
                <input required value={origin} onChange={(e) => setOrigin(e.target.value)} />
              </label>
              <label className="fm-field">
                Điểm nhận
                <input required value={destination} onChange={(e) => setDestination(e.target.value)} />
              </label>
              <label className="fm-field">
                Hạn SLA (đã cam kết — có thể quá khứ)
                <input required type="datetime-local" value={expectedLocal} onChange={(e) => setExpectedLocal(e.target.value)} />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                  <button
                    type="button"
                    className="btn"
                    style={{ fontSize: 12 }}
                    onClick={() => setExpectedLocal(offsetCalendarDaysLocal(-1))}
                  >
                    Đặt SLA = hôm qua 17h
                  </button>
                  <button type="button" className="btn" style={{ fontSize: 12 }} onClick={() => setExpectedLocal(offsetCalendarDaysLocal(-2))}>
                    SLA = -2 ngày 17h
                  </button>
                </div>
              </label>
              <label className="fm-field">
                Thời điểm giao thực / giao xong (nếu đã có; để trống khi đang chờ hay giao lại)
                <input type="datetime-local" value={actualLocal} onChange={(e) => setActualLocal(e.target.value)} />
              </label>
              <label className="fm-field">
                Trạng thái
                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                  {shipmentStatuses.map(([val, lab]) => (
                    <option key={val} value={val}>
                      {lab}
                    </option>
                  ))}
                  {["in_transit", "failed_delivery", "address_issue", "stuck"].every((x) => x !== status) && (
                    <option value={status}>{status} (hiện có)</option>
                  )}
                </select>
              </label>
              <label className="fm-field">
                Số lần giao thất bại
                <input value={failedAttempts} onChange={(e) => setFailedAttempts(e.target.value)} inputMode="numeric" />
              </label>
              <label className="fm-field" style={{ gridColumn: "1 / -1" }}>
                Ghi chú vận hành (intake — lưu lineage admin nếu cần)
                <textarea rows={2} value={intake_note} onChange={(e) => setIntakeNote(e.target.value)} />
              </label>
            </div>

            <div className="fm-section-head" style={{ marginTop: 22 }}>
              <h2 className="fm-section-title">Người nhận &amp; hàng</h2>
            </div>
            <div className="fm-split-grid">
              <label className="fm-field">
                Tên người nhận
                <input value={recipient_name} onChange={(e) => setRecipientName(e.target.value)} />
              </label>
              <label className="fm-field">
                Điện thoại
                <input value={recipient_phone} onChange={(e) => setRecipientPhone(e.target.value)} />
              </label>
              <label className="fm-field" style={{ gridColumn: "1 / -1" }}>
                Địa chỉ
                <textarea rows={2} value={recipient_address} onChange={(e) => setRecipientAddress(e.target.value)} />
              </label>
              <label className="fm-field">
                COD (VND)
                <input value={cod_amount} onChange={(e) => setCodAmount(e.target.value)} />
              </label>
              <label className="fm-field">
                Khối lượng (kg)
                <input value={weight_kg} onChange={(e) => setWeightKg(e.target.value)} />
              </label>
              <label className="fm-field">
                Số kiện
                <input value={package_count} onChange={(e) => setPackageCount(e.target.value)} />
              </label>
              <label className="fm-field" style={{ gridColumn: "1 / -1" }}>
                Mô tả hàng
                <input value={product_summary} onChange={(e) => setProductSummary(e.target.value)} />
              </label>
              <label className="fm-field">
                Điểm quét cuối
                <input value={last_scan_location} onChange={(e) => setLastScanLocation(e.target.value)} />
              </label>
              <label className="fm-field" style={{ gridColumn: "1 / -1" }}>
                Ghi chú quét
                <textarea rows={2} value={last_scan_note} onChange={(e) => setLastScanNote(e.target.value)} />
              </label>
            </div>

            <div style={{ marginTop: 18, display: "flex", gap: 12 }}>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
              <Link to="/shipments" className="btn" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
                Huỷ
              </Link>
            </div>
          </form>

          <section className="v2-chart-card" style={{ padding: "20px 22px", maxWidth: 860, marginTop: 16 }}>
            <div className="fm-section-head">
              <h2 className="fm-section-title">Mở case ngoại lệ (không cần mock/detector)</h2>
              <small className="fm-section-hint">
                Dùng khi đơn cần xuất hiện ở «Đơn có vấn đề». Nếu đã có case mở, xử lý tại trang case.
              </small>
            </div>
            {openExceptions > 0 ? (
              <p style={{ color: "#64748b" }}>
                Đơn đang có <strong>{openExceptions}</strong> case chưa đóng →{" "}
                <Link to="/exceptions">mở danh sách</Link> và lọc theo mã vận đơn hoặc mở từ cột Case.
              </p>
            ) : (
              <form className="fm-split-grid" onSubmit={(e) => void addException(e)}>
                <label className="fm-field">
                  Loại
                  <select value={excType} onChange={(e) => setExcType(e.target.value as ExceptionType)}>
                    <option value="delay">Trễ hạn</option>
                    <option value="failed_delivery">Giao thất bại</option>
                    <option value="stuck">Kẹt hàng</option>
                    <option value="address_issue">Địa chỉ</option>
                  </select>
                </label>
                <label className="fm-field">
                  Mức gợi ý
                  <select value={excSeverity} onChange={(e) => setExcSeverity(e.target.value as Severity)}>
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </label>
                <label className="fm-field">
                  Giờ trễ (overdue_hours)
                  <input value={excOverdue} onChange={(e) => setExcOverdue(e.target.value)} inputMode="decimal" />
                </label>
                <label className="fm-field" style={{ gridColumn: "1 / -1" }}>
                  Lý do
                  <textarea required rows={2} value={excReason} onChange={(e) => setExcReason(e.target.value)} />
                </label>
                <button className="btn btn-primary" type="submit" disabled={saving}>
                  Tạo case &amp; xử lý
                </button>
              </form>
            )}
          </section>
        </>
      )}
    </div>
  );
}
