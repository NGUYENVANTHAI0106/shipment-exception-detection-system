import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useAuth, type UserRole } from "./auth";
import { AppShell } from "./components/AppShell";
import { DashboardPage } from "./pages/DashboardPage";
import { EmployeeDashboardPage } from "./pages/EmployeeDashboardPage";
import { ExceptionDetailPage } from "./pages/ExceptionDetailPage";
import { LoginPage } from "./pages/LoginPage";
import { OpsAnalyticsPage } from "./pages/OpsAnalyticsPage";

function RequireAuth({ role }: { role?: UserRole }) {
  const { ready, user } = useAuth();
  if (!ready) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    return <Navigate to={user.role === "ops" ? "/ops/dashboard" : "/employee/dashboard"} replace />;
  }
  return <Outlet />;
}

function RootRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "ops" ? "/ops/dashboard" : "/employee/dashboard"} replace />;
}

function AppShellLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RootRedirect />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShellLayout />}>
          <Route element={<RequireAuth role="ops" />}>
            <Route path="/ops/dashboard" element={<DashboardPage scope="ops" />} />
            <Route path="/ops/exception/:id" element={<ExceptionDetailPage />} />
            <Route path="/ops/analytics" element={<OpsAnalyticsPage />} />
          </Route>
          <Route element={<RequireAuth role="employee" />}>
            <Route path="/employee/dashboard" element={<EmployeeDashboardPage />} />
            <Route path="/employee/exception/:id" element={<ExceptionDetailPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}

export default App;
