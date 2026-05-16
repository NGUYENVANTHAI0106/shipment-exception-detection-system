import { ArrowLeft, PackagePlus } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { offsetCalendarDaysLocal } from "../lib/datetimeLocal";
import { createManualShipment } from "../lib/exceptionService";
import type { ManualShipmentCreatePayload } from "../types";

function parsePositiveInt(raw: string): number | undefined {
  const v = raw.trim();
  if (!v) return undefined;
  const n = Number.parseInt(v, 10);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}

function parsePositiveFloat(raw: string): number | undefined {
  const v = raw.trim();
  if (!v) return undefined;
  const n = Number.parseFloat(v);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}

export function NewShipmentPage() {
  const navigate = useNavigate();
  const [tracking_number, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState("GHN");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [expectedLocal, setExpectedLocal] = useState(() => offsetCalendarDaysLocal(3));
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shipmentStatuses = useMemo(
    () => [
      ["in_transit", "Đang vận chuyển"],
      ["failed_delivery", "Giao thất bại"],
      ["address_issue", "Địa chỉ"],
      ["stuck", "Kẹt hàng"],
    ],
    [],
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const tn = tracking_number.trim();
    if (!tn) {
      setError("Vui lòng nhập mã vận đơn.");
      return;
    }
    if (!carrier.trim() || !origin.trim() || !destination.trim()) {
      setError("Điền đầy đủ hãng VC, điểm đi và đến.");
      return;
    }
    const expected_delivery = new Date(expectedLocal).toISOString();
    const fa = parsePositiveInt(failedAttempts);
    if (failedAttempts.trim() !== "" && fa === undefined) {
      setError("Số lần giao thất bại không hợp lệ.");
      return;
    }

    const body: ManualShipmentCreatePayload = {
      tracking_number: tn,
      carrier: carrier.trim(),
      origin: origin.trim(),
      destination: destination.trim(),
      expected_delivery,
      status: status.trim(),
      failed_attempts: fa ?? 0,
    };

    const note = intake_note.trim();
    if (note) body.intake_note = note;
    const rn = recipient_name.trim();
    if (rn) body.recipient_name = rn;
    const rp = recipient_phone.trim();
    if (rp) body.recipient_phone = rp;
    const ra = recipient_address.trim();
    if (ra) body.recipient_address = ra;
    const ps = product_summary.trim();
    if (ps) body.product_summary = ps;

    const cod = parsePositiveFloat(cod_amount);
    if (cod_amount.trim() !== "") {
      if (cod === undefined) {
        setError("Tiền COD không hợp lệ.");
        return;
      }
      body.cod_amount = cod;
    }
    const w = parsePositiveFloat(weight_kg);
    if (weight_kg.trim() !== "") {
      if (w === undefined) {
        setError("Khối lượng không hợp lệ.");
        return;
      }
      body.weight_kg = w;
    }
    const pc = parsePositiveInt(package_count);
    if (package_count.trim() !== "") {
      if (pc === undefined) {
        setError("Số kiện không hợp lệ.");
        return;
      }
      body.package_count = pc;
    }

    setLoading(true);
    try {
      const res = await createManualShipment(body);
      const attemptsCounted = fa ?? 0;
      const opensAutoCase = attemptsCounted >= 2;
      navigate("/exceptions", {
        replace: false,
        state: {
          flash: opensAutoCase
            ? `Đã tạo đơn ${res.tracking_number}. Đơn có ${attemptsCounted} lần giao thất bại — đã mở case để xử lý dưới đây.`
            : `Đã tạo đơn ${res.tracking_number}. Ít nhất 2 lần giao thất bại sẽ tự mở case «giao thất bại»; case trễ/loại khác: «Tất cả vận đơn» → Sửa → «Mở case».`,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tạo được đơn.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container v2-dashboard">
      <header className="v2-page-head">
        <div>
          <Link to="/exceptions" className="fm-back-link">
            <ArrowLeft size={16} />
            Quay lại đơn có vấn đề
          </Link>
          <h1 style={{ marginTop: 12 }}>Thêm đơn mới</h1>
          <p className="fm-section-hint" style={{ marginTop: 6 }}>
            <strong>Hạn giao đã cam kết (SLA)</strong> được phép nằm trong <em>quá khứ</em> để mô phỏng đã quá hẹn hay{" "}
            <strong>giao lại hôm nay nhưng không thành</strong>.{" "}
            <strong>Nhập đủ 2 lần giao thất bại</strong> trong form bên dưới thì hệ thống tự mở case «giao thất bại» trên
            «Đơn có vấn đề»; các loại khác (trễ, kẹt, …) có thể mở tay trong «Sửa vận đơn».
          </p>
        </div>
      </header>

      <form className="v2-chart-card" style={{ padding: "20px 22px", maxWidth: 820 }} onSubmit={(e) => void submit(e)}>
        <div className="fm-section-head" style={{ marginBottom: 16 }}>
          <h2 className="fm-section-title" style={{ gap: 8 }}>
            <PackagePlus size={20} aria-hidden /> Thông tin bắt buộc
          </h2>
        </div>

        <div className="fm-split-grid">
          <label className="fm-field">
            Mã vận đơn
            <input
              required
              value={tracking_number}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="VD: TRK-NEW-042"
              autoComplete="off"
            />
          </label>
          <label className="fm-field">
            Hãng vận chuyển
            <input required value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="GHN, GHTK..." />
          </label>
          <label className="fm-field">
            Điểm gửi
            <input required value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="Ha Noi" />
          </label>
          <label className="fm-field">
            Điểm nhận
            <input required value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="HCM" />
          </label>
          <label className="fm-field" style={{ gridColumn: "1 / -1" }}>
            Hạn đã cam kết (SLA ban đầu — có thể là hôm qua / đã quá hạn)
            <input
              required
              type="datetime-local"
              value={expectedLocal}
              onChange={(e) => setExpectedLocal(e.target.value)}
            />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              <button
                type="button"
                className="btn"
                style={{ fontSize: 12 }}
                onClick={() => setExpectedLocal(offsetCalendarDaysLocal(-1))}
              >
                SLA = hôm qua 17h
              </button>
              <button
                type="button"
                className="btn"
                style={{ fontSize: 12 }}
                onClick={() => setExpectedLocal(offsetCalendarDaysLocal(-3))}
              >
                SLA = 3 ngày trước 17h
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ fontSize: 12 }}
                onClick={() => {
                  setExpectedLocal(offsetCalendarDaysLocal(-1));
                  setStatus("failed_delivery");
                  setFailedAttempts((v) => (v.trim() === "0" || v.trim() === "" ? "1" : v));
                  setIntakeNote((prev) =>
                    prev.trim() ? prev : "Đến hạn hôm qua; giao lại hôm nay không thành.",
                  );
                }}
              >
                Kịch bản: quá SLA + giao lại hôm nay không thành
              </button>
            </div>
          </label>
          <label className="fm-field">
            Trạng thái đơn
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {shipmentStatuses.map(([val, lab]) => (
                <option key={val} value={val}>
                  {lab}
                </option>
              ))}
            </select>
          </label>
          <label className="fm-field">
            Số lần giao thất bại
            <input value={failedAttempts} onChange={(e) => setFailedAttempts(e.target.value)} inputMode="numeric" />
          </label>
          <label className="fm-field" style={{ gridColumn: "1 / -1" }}>
            Ghi chú nhập tay (tuỳ chọn)
            <textarea
              rows={2}
              value={intake_note}
              onChange={(e) => setIntakeNote(e.target.value)}
              placeholder="VD: khách báo nhận trễ, cần ưu tiên..."
            />
          </label>
        </div>

        <div className="fm-section-head" style={{ marginTop: 22 }}>
          <h2 className="fm-section-title">Người nhận & hàng (tuỳ chọn)</h2>
          <small className="fm-section-hint">
            Khớp các cột trong bảng <code>shipments</code>; để trống nếu chưa có.
          </small>
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
            <input value={cod_amount} onChange={(e) => setCodAmount(e.target.value)} inputMode="decimal" />
          </label>
          <label className="fm-field">
            Khối lượng (kg)
            <input value={weight_kg} onChange={(e) => setWeightKg(e.target.value)} inputMode="decimal" />
          </label>
          <label className="fm-field">
            Số kiện
            <input value={package_count} onChange={(e) => setPackageCount(e.target.value)} inputMode="numeric" />
          </label>
          <label className="fm-field" style={{ gridColumn: "1 / -1" }}>
            Mô tả hàng
            <input value={product_summary} onChange={(e) => setProductSummary(e.target.value)} />
          </label>
        </div>

        {error && <p className="v2-alert">{error}</p>}

        <div style={{ marginTop: 18, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Đang lưu..." : "Tạo đơn"}
          </button>
          <Link to="/exceptions" className="btn" style={{ textDecoration: "none", display: "inline-flex" }}>
            Huỷ
          </Link>
        </div>
      </form>
    </div>
  );
}
