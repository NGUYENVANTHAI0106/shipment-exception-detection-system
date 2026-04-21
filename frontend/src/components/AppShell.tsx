import { BarChart3, Package, RefreshCw, Search, User } from "lucide-react";
import { NavLink } from "react-router-dom";

export function AppShell({ children }: { children: React.ReactNode }) {
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
          <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <Package size={16} />
            Ngoại lệ
          </NavLink>
          <NavLink to="/dashboard" className="nav-item">
            <BarChart3 size={16} />
            Phân tích
          </NavLink>
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
