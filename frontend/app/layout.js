import "./globals.css";
import AppChrome from "@/components/layout/AppChrome";
import { themeInitScript } from "@/app/lib/theme";

export const metadata = {
  title: {
    default: "Cổng Vận Đơn",
    template: "%s | Cổng Vận Đơn"
  },
  description: "Hệ thống theo dõi vận đơn và phát hiện ngoại lệ"
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="app-body">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[1000] focus:rounded-full focus:bg-[color:var(--text)] focus:px-4 focus:py-2 focus:text-[color:var(--panel-strong)]"
        >
          Bỏ qua đến nội dung chính
        </a>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}
