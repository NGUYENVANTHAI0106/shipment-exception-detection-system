import { Outlet, Link, useLocation } from 'react-router';
import { Package, BarChart3, RefreshCw, Search, User } from 'lucide-react';

export function MainLayout() {
  const location = useLocation();
  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/' || location.pathname.startsWith('/dashboard');
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-blue-400" />
            <div>
              <h1 className="font-semibold text-lg">Shipment Exception</h1>
              <p className="text-xs text-slate-400">Operations</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4">
          <Link
            to="/dashboard"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
              isActive('/dashboard')
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Package className="w-5 h-5" />
            <span>Ngoại lệ</span>
          </Link>

          <Link
            to="/analytics"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              isActive('/analytics')
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span>Phân tích</span>
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-700 text-xs text-slate-400">
          <p>© 2026 Shipment Ops</p>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm theo mã tracking..."
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <RefreshCw className="w-4 h-4" />
                <span>Làm mới</span>
              </button>
            </div>

            <div className="flex items-center gap-3 ml-4">
              <div className="text-right">
                <p className="text-sm font-medium text-slate-900">Ops User</p>
                <p className="text-xs text-slate-500">Vận hành</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
