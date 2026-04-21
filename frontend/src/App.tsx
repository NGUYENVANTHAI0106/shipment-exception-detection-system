import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { DashboardPage } from "./pages/DashboardPage";
import { ExceptionDetailPage } from "./pages/ExceptionDetailPage";
import { OpsAnalyticsPage } from "./pages/OpsAnalyticsPage";

function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/dashboard/exception/:id" element={<ExceptionDetailPage />} />
        <Route path="/analytics" element={<OpsAnalyticsPage />} />
      </Routes>
    </AppShell>
  );
}

export default App;
