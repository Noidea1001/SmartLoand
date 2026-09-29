import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useBranding } from "../../context/BrandingContext";

export default function Login() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const { websiteName, companyName } = useBranding();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/");
    } catch {
      setError(t("auth.loginError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-split">
      <div className="login-brand-panel">
        <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative", zIndex: 1 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8, background: "var(--color-accent, #6366f1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 14, color: "#ffffff",
          }}>
            {websiteName.slice(0, 2).toUpperCase()}
          </div>
          <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: "-0.02em" }}>{websiteName}</span>
        </div>

        <div style={{ position: "relative", zIndex: 1 }}>
          <p style={{ fontSize: 28, lineHeight: 1.35, maxWidth: 360, fontWeight: 600, marginBottom: 16, margin: "0 0 16px 0", letterSpacing: "-0.02em" }}>
            {companyName || "Enterprise-grade loan management platform"}
          </p>
          <p style={{ fontSize: 14, color: "#a0a4b8", maxWidth: 340, lineHeight: 1.7, margin: 0 }}>
            Flexible interest per client, role-based approvals, and dual-currency
            tracking in one streamlined system.
          </p>
        </div>

        <p style={{ fontSize: 12, color: "#5a5e72", position: "relative", zIndex: 1, margin: 0 }}>
          {websiteName} v2.0
        </p>
      </div>

      <div className="login-form-panel">
        <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: 380 }}>
          <h1 style={{ fontSize: 24, marginBottom: 8, fontWeight: 700 }}>{t("auth.login")}</h1>
          <p style={{ fontSize: 14, color: "var(--color-text-muted)", marginBottom: 32, margin: "0 0 32px 0" }}>
            Sign in to your account to continue
          </p>

          <label style={{ display: "block", marginBottom: 20 }}>
            <div style={{ marginBottom: 6, color: "var(--color-text-secondary)", fontSize: 13, fontWeight: 500 }}>
              {t("auth.email")}
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              placeholder="you@company.com"
              style={{ padding: "11px 14px" }}
            />
          </label>

          <label style={{ display: "block", marginBottom: 28 }}>
            <div style={{ marginBottom: 6, color: "var(--color-text-secondary)", fontSize: 13, fontWeight: 500 }}>
              {t("auth.password")}
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
              style={{ padding: "11px 14px" }}
            />
          </label>

          {error && (
            <div style={{
              color: "var(--color-danger)",
              fontSize: 13,
              marginBottom: 16,
              padding: "10px 14px",
              background: "var(--color-danger-soft)",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--color-danger)",
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", padding: "11px 0", fontSize: 14, fontWeight: 600, borderRadius: "var(--radius)" }}
            disabled={submitting}
          >
            {submitting ? "Signing in..." : t("auth.loginButton")}
          </button>

          <div style={{ marginTop: 20, textAlign: "center" }}>
            <button
              type="button"
              onClick={() => {
                setEmail("superadmin@smartloan.com");
                setPassword("admin123");
              }}
              className="btn btn-xs btn-ghost"
              style={{ color: "var(--color-accent)", fontSize: 12, padding: "4px 10px" }}
            >
              Fill Superadmin Demo: superadmin@smartloan.com
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
