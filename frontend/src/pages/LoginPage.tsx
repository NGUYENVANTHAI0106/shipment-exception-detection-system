import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth";

export function LoginPage() {
  const { user, login } = useAuth();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) return <Navigate to="/exceptions" replace />;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={onSubmit}>
        <h1>Đăng nhập hệ thống</h1>
        <p>Trung tâm xử lý ngoại lệ giao hàng.</p>
        <label className="fm-field">
          Tài khoản
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" />
        </label>
        <label className="fm-field">
          Mật khẩu
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nhập mật khẩu"
          />
        </label>
        {error && <p className="inline-message">{error}</p>}
        <button className="btn btn-primary fm-btn" type="submit" disabled={loading}>
          {loading ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
        <div className="login-hint">
          <small>Tài khoản mặc định: admin / admin123</small>
        </div>
      </form>
    </div>
  );
}
