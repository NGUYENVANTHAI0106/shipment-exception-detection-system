import { BarChart3, Package, RefreshCw, Search, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../auth";

export function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const scope: "ops" | "employee" | "manager" =
    user?.role === "employee" ? "employee" : user?.role === "manager" ? "manager" : "ops";
  const isActive = (path: string) => {
    if (path === `/${scope}/dashboard`) {
      return location.pathname === "/" || location.pathname.startsWith(`/${scope}/dashboard`);
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <Package size={22} />
          <div>
            <strong>Shipment Exception</strong>
            <small>Operations</small>
          </div>
        </div>
        <nav className="sidebar-nav">
          <Link to={`/${scope}/dashboard`} className={`nav-item ${isActive(`/${scope}/dashboard`) ? "active" : ""}`}>
            <Package size={16} />
            {scope === "manager" ? "Manager Queue" : "Ngoại lệ"}
          </Link>
          {scope === "ops" && (
            <Link to="/ops/analytics" className={`nav-item ${isActive("/ops/analytics") ? "active" : ""}`}>
              <BarChart3 size={16} />
              Phân tích
            </Link>
          )}
        </nav>
        <div className="sidebar-footer">© 2026 Shipment Ops</div>
      </aside>
      <main className="content">
        <header className="topbar">
          <div className="search-wrap">
            <Search size={16} />
            <input placeholder="Tìm theo mã tracking..." />
          </div>
          <button className="btn btn-primary">
            <RefreshCw size={14} />
            Làm mới
          </button>
          <div className="user-wrap">
            <div>
              <strong>{user?.display_name || "Người dùng"}</strong>
              <small>{scope === "ops" ? "Vận hành" : scope === "manager" ? "Quản lý" : "Nhân viên"}</small>
            </div>
            <span className="avatar">
              <User size={15} />
            </span>
          </div>
          <button className="btn btn-secondary" onClick={logout}>
            Đăng xuất
          </button>
        </header>
        {children}
      </main>
    </div>
  );
}
