import { ArrowRight, Pencil, RefreshCw, Trash2, Truck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  deleteShipment,
  listShipments,
  type ShipmentOnlyFilter,
} from "../lib/exceptionService";
import { shipmentOperationalStatusVi } from "../lib/shipmentStatusLabels";
import type { ShipmentListItem } from "../types";

function formatShort(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ShipmentsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [items, setItems] = useState<ShipmentListItem[]>([]);
  const [only, setOnly] = useState<ShipmentOnlyFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchList = useCallback(async (filter: ShipmentOnlyFilter) => {
    setLoading(true);
    try {
      const data = await listShipments({ limit: 500, only: filter });
      setItems(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được danh sách vận đơn.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchList(only);
  }, [only, fetchList]);

  useEffect(() => {
    const st = location.state as { flash?: string } | null;
    if (!st?.flash) return;
    setActionMessage(st.flash);
    navigate(".", { replace: true, state: {} });
  }, [location.state, navigate]);

  const counts = useMemo(() => {
    const withIssue = items.filter((x) => x.open_exception_count > 0).length;
    const healthy = items.filter((x) => x.open_exception_count === 0).length;
    return { withIssue, healthy, total: items.length };
  }, [items]);

  const removeRow = async (row: ShipmentListItem) => {
    const ok = window.confirm(
      `Xóa vận đơn ${row.tracking_number}? Mọi case gắn với đơn (nếu có) cũng bị xóa.`,
    );
    if (!ok) return;
    setActionMessage(null);
    try {
      await deleteShipment(row.id);
      setActionMessage(`Đã xóa ${row.tracking_number}.`);
      await fetchList(only);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xóa thất bại.");
    }
  };

  return (
    <div className="page-container v2-exceptions">
      <header className="v2-page-head">
        <div>
          <h1>Tất cả vận đơn</h1>
          <p className="fm-section-hint" style={{ marginTop: 6 }}>
            Mọi vận đơn — kể cả nhập tay — đều nằm ở đây theo{" "}
            <strong>trạng thái vận đơn</strong> (vd. đang giao).
            Khi có <strong>case ngoại lệ đang mở</strong>, đơn đó được liệt kê thêm ở mục &quot;Đơn có vấn đề&quot;. CRUD tay
            trên Postgres: sửa / xóa ở cột cuối; thêm case trong &quot;Sửa vận đơn&quot;.
          </p>
        </div>
        <div className="v2-page-head-side">
          <button className="btn btn-primary" onClick={() => void fetchList(only)} disabled={loading} type="button">
            <RefreshCw size={14} />
            Làm mới
          </button>
        </div>
      </header>

      <section className="v2-toolbar" style={{ flexWrap: "wrap", gap: 12 }}>
        <div className="v2-filters" style={{ marginLeft: 0 }}>
          <span className="v2-filter-icon">
            <Truck size={14} />
          </span>
          <select value={only} onChange={(e) => setOnly(e.target.value as ShipmentOnlyFilter)}>
            <option value="all">Tất cả đơn</option>
            <option value="healthy">Chưa có case mở (ổn)</option>
            <option value="has_issue">Đang có case mở</option>
          </select>
        </div>
        <span className="fm-section-hint" style={{ margin: 0 }}>
          Hiển thị <strong>{counts.total}</strong> dòng (tối đa 500) • ổn: <strong>{counts.healthy}</strong> • có case:{" "}
          <strong>{counts.withIssue}</strong>
        </span>
      </section>

      {actionMessage && <p className="v2-alert v2-alert-info">{actionMessage}</p>}
      {error && <p className="v2-alert">{error}</p>}

      <section className="v2-table-card" style={{ marginTop: 12 }}>
        {loading ? (
          <div className="v2-empty-state">Đang tải...</div>
        ) : items.length === 0 ? (
          <div className="v2-empty-state">Không có vận đơn khớp bộ lọc.</div>
        ) : (
          <table className="v2-table">
            <thead>
              <tr>
                <th>Mã vận đơn</th>
                <th>Tuyến</th>
                <th>ĐVC</th>
                <th title="Tiến trình vận chuyển (khác với case ngoại lệ)">Trạng thái vận đơn</th>
                <th>Vấn đề</th>
                <th title="Đơn tạo từ «Thêm đơn tay» nhập tay; đơn từ mock/detector không đổi sau khi bạn chỉnh ghi chú ở Sửa đơn.">Nguồn</th>
                <th>Cập nhật</th>
                <th>Case</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.tracking_number}</strong>
                  </td>
                  <td>
                    <small>
                      {row.origin} → {row.destination}
                    </small>
                  </td>
                  <td>{row.carrier}</td>
                  <td title={row.status}>
                    <span style={{ fontSize: 13 }}>{shipmentOperationalStatusVi(row.status)}</span>
                  </td>
                  <td>
                    {row.open_exception_count > 0 ? (
                      <span className="v2-alert" style={{ display: "inline-block", padding: "4px 8px", fontSize: 12 }}>
                        {row.open_exception_count} case mở
                      </span>
                    ) : (
                      <span style={{ color: "#059669", fontSize: 13 }}>Không có case mở</span>
                    )}
                  </td>
                  <td>{row.manual_entry ? <small>Nhập tay</small> : <small>Hệ thống</small>}</td>
                  <td>
                    <small>{formatShort(row.last_updated)}</small>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {row.primary_open_exception_id ? (
                      <Link
                        className="v2-link"
                        to={`/exceptions/${row.primary_open_exception_id}`}
                        title="Mở case mới nhất"
                      >
                        Case <ArrowRight size={14} style={{ verticalAlign: "middle" }} />
                      </Link>
                    ) : (
                      <small style={{ color: "#94a3b8" }}>—</small>
                    )}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <Link
                      to={`/shipments/${row.id}/edit`}
                      className="btn"
                      title="Sửa vận đơn hoặc tạo case"
                      style={{ padding: "4px 10px", fontSize: 12 }}
                    >
                      <Pencil size={14} style={{ verticalAlign: "middle" }} /> Sửa
                    </Link>{" "}
                    <button
                      type="button"
                      className="btn"
                      title="Xóa vận đơn"
                      style={{
                        padding: "4px 10px",
                        fontSize: 12,
                        color: "#b91c1c",
                        borderColor: "#fecaca",
                      }}
                      onClick={() => void removeRow(row)}
                    >
                      <Trash2 size={14} style={{ verticalAlign: "middle" }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
