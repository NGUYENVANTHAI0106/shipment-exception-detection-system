export const metadata = {
  title: "Shipment Portal",
  description: "Shipment exception detection portal"
};

import "./globals.css";

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <div className="border-b bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <a className="font-semibold" href="/">
              Shipment Portal
            </a>
            <nav className="flex gap-4 text-sm">
              <a className="hover:underline" href="/shipments">
                Shipments
              </a>
              <a className="hover:underline" href="/exceptions">
                Exceptions
              </a>
              <a className="hover:underline" href="/upload">
                Upload
              </a>
              <a className="hover:underline" href="/admin">
                Admin
              </a>
              <a className="hover:underline" href="/login">
                Login
              </a>
            </nav>
          </div>
        </div>
        <div className="mx-auto max-w-5xl px-4 py-6">{children}</div>
      </body>
    </html>
  );
}

