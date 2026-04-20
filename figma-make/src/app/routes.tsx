import { createBrowserRouter } from "react-router";
import { MainLayout } from "./components/MainLayout";
import { Dashboard } from "./components/Dashboard";
import { ExceptionDetail } from "./components/ExceptionDetail";
import { Analytics } from "./components/Analytics";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: MainLayout,
    children: [
      { index: true, Component: Dashboard },
      { path: "dashboard", Component: Dashboard },
      { path: "dashboard/exception/:id", Component: ExceptionDetail },
      { path: "analytics", Component: Analytics },
    ],
  },
]);
