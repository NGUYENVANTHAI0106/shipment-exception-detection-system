import { BarChart3, Package, RefreshCw, Search, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isActive = (path: string) => {
    if (path === "/dashboard") return location.pathname === "/" || location.pathname.startsWith("/dashboard");
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
          <Link to="/dashboard" className={`nav-item ${isActive("/dashboard") ? "active" : ""}`}>
            <Package size={16} />
            Ngoại lệ
          </Link>
          <Link to="/analytics" className={`nav-item ${isActive("/analytics") ? "active" : ""}`}>
            <BarChart3 size={16} />
            Phân tích
          </Link>
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
              <strong>Ops User</strong>
              <small>Vận hành</small>
            </div>
            <span className="avatar">
              <User size={15} />
            </span>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
