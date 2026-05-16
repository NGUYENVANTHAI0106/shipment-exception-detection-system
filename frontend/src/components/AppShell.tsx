import { LayoutDashboard, LogOut, Package, PackagePlus, Truck, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../auth";

export function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user, logout } = useAuth();

  const navItems = [
    { to: "/dashboard", label: "Tổng quan", icon: LayoutDashboard },
    { to: "/shipments", label: "Tất cả vận đơn", icon: Truck },
    { to: "/exceptions/new-shipment", label: "Thêm đơn", icon: PackagePlus },
    { to: "/exceptions", label: "Đơn có vấn đề", icon: Package },
  ];

  const isActive = (to: string) => {
    if (to === "/exceptions") {
      return (
        location.pathname === "/exceptions" ||
        (location.pathname.startsWith("/exceptions/") && location.pathname.split("/")[2] !== "new-shipment")
      );
    }
    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <Package size={22} />
          <div>
            <strong>Vận hành đơn hàng</strong>
            <small>Trung tâm xử lý sự cố</small>
          </div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link key={to} to={to} className={`nav-item ${isActive(to) ? "active" : ""}`}>
              <Icon size={16} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="v2-user">
            <span className="v2-avatar">
              <User size={14} />
            </span>
            <div>
              <strong>{user?.display_name || "Người dùng"}</strong>
              <small>Tài khoản: {user?.username || "—"}</small>
            </div>
          </div>
          <button className="v2-logout" onClick={logout} type="button">
            <LogOut size={13} />
            Đăng xuất
          </button>
        </div>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
