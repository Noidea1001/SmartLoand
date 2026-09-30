import { useEffect, useRef, useState } from "react";
import {
  Bell,
  LogOut,
  Menu,
  Moon,
  Palette,
  Sun,
  Volume2,
  VolumeX,
  Globe,
  Compass,
  Calculator,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { listNotifications, markNotificationRead } from "../../api/notifications";
import { setLocale } from "../../i18n/i18n";
import { useAuth } from "../../context/AuthContext";
import { useLayout } from "../../context/LayoutContext";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../context/ToastContext";
import { useBranding } from "../../context/BrandingContext";
import type { NotificationItem } from "../../api/types";
import LoanCalculatorModal from "../calculator/LoanCalculatorModal";

const POLL_INTERVAL_MS = 30000;

const PRESET_THEMES = [
  { label: "Indigo", nav: "#1a1d23", sidebar: "#111318", button: "#6366f1" },
  { label: "Emerald", nav: "#0f1a14", sidebar: "#0a1410", button: "#10b981" },
  { label: "Rose", nav: "#1c1117", sidebar: "#150d12", button: "#f43f5e" },
  { label: "Amber", nav: "#1a1710", sidebar: "#14120b", button: "#f59e0b" },
  { label: "Cyan", nav: "#0e1a1e", sidebar: "#091418", button: "#06b6d4" },
  { label: "Violet", nav: "#1a1525", sidebar: "#13101c", button: "#8b5cf6" },
  { label: "Sky", nav: "#0e1620", sidebar: "#0a1118", button: "#0ea5e9" },
  { label: "Slate", nav: "#1e2028", sidebar: "#151720", button: "#64748b" },
  { label: "Teal", nav: "#0f1918", sidebar: "#0a1312", button: "#14b8a6" },
  { label: "Fuchsia", nav: "#1c1220", sidebar: "#150d18", button: "#d946ef" },
];

export default function Topbar() {
  const { t, i18n } = useTranslation();
  const isKm = i18n.language === "km";
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isMobile, toggleSidebar } = useLayout();
  const { mode, toggleMode, colors, setColors, resetColors } = useTheme();
  const { soundEnabled, toggleSound } = useToast();
  const { websiteName } = useBranding();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    async function poll() {
      try {
        const items = await listNotifications();
        if (active) setNotifications(items);
      } catch {
        // silently ignore transient polling failures
      }
    }
    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) setThemeOpen(false);
    }

    document.addEventListener("mousedown", onClickOutside);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  async function handleNotificationClick(n: NotificationItem) {
    if (!n.is_read) {
      await markNotificationRead(n.id);
      setNotifications((prev) => prev.map((item) => (item.id === n.id ? { ...item, is_read: true } : item)));
    }
  }

  const userInitials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "SL";

  // Breadcrumbs derivation
  function getBreadcrumb() {
    const p = location.pathname;
    if (p === "/") return { section: t("sections.overview"), title: t("nav.dashboard") };
    if (p === "/loans") return { section: t("sections.finance"), title: t("nav.loans") };
    if (p === "/repayments") return { section: t("sections.finance"), title: t("nav.repayments") };
    if (p === "/reports") return { section: t("sections.finance"), title: t("nav.reports") };
    if (p === "/nbc-provisioning") return { section: t("sections.finance"), title: t("nav.nbcProvisioning") };
    if (p === "/write-offs") return { section: t("sections.finance"), title: t("nav.writeOffs") };
    if (p === "/fx-exchange") return { section: t("sections.finance"), title: t("nav.fxExchange") };
    if (p === "/telegram-bot") return { section: t("sections.finance"), title: t("nav.telegramBot") };
    if (p === "/loan-intake") return { section: t("sections.directory"), title: t("nav.loanIntake") };
    if (p === "/collaterals") return { section: t("sections.finance"), title: t("nav.collaterals") };
    if (p === "/reminders") return { section: t("sections.finance"), title: t("nav.reminders") };
    if (p === "/cashier-closing") return { section: t("sections.finance"), title: t("nav.cashierClosing") };
    if (p === "/early-warning") return { section: t("sections.finance"), title: t("nav.earlyWarning") };
    if (p === "/documents") return { section: t("sections.finance"), title: t("nav.documents") };
    if (p === "/branches") return { section: t("sections.finance"), title: t("nav.branches") };
    if (p === "/restructure-simulator") return { section: t("sections.finance"), title: t("nav.restructureSimulator") };
    if (p === "/loan-calculator") return { section: t("sections.finance"), title: t("nav.loanCalculator") };
    if (p === "/field-collection") return { section: t("sections.finance"), title: t("nav.fieldCollection") };
    if (p === "/eod-processing") return { section: t("sections.finance"), title: t("nav.eodProcessing") };
    if (p === "/risk-watchlist") return { section: t("sections.finance"), title: t("nav.riskWatchlist") };
    if (p === "/cbc") return { section: t("sections.finance"), title: t("nav.cbc") };
    if (p === "/guarantors") return { section: t("sections.finance"), title: t("nav.guarantors") };
    if (p === "/officers") return { section: t("sections.finance"), title: t("nav.officers") };
    if (p.startsWith("/loans/pending-approval")) return { section: t("sections.finance"), title: t("nav.pendingApprovals") };
    if (p.startsWith("/loans/my-requests")) return { section: t("sections.finance"), title: t("nav.myRequests") };
    if (p.startsWith("/loans/")) return { section: t("sections.finance"), title: t("loans.newLoan") };
    if (p === "/clients") return { section: t("sections.directory"), title: t("nav.clients") };
    if (p === "/products") return { section: t("sections.catalog"), title: t("nav.products") };
    if (p === "/roles") return { section: t("sections.admin"), title: t("nav.roles") };
    if (p === "/activity-log") return { section: t("sections.system"), title: t("nav.activityLog") };
    if (p === "/settings") return { section: t("sections.system"), title: t("nav.settings") };
    return {
      section: isKm ? "ប្រព័ន្ធគ្រប់គ្រងឥណទាន" : (websiteName || "Smart Loan"),
      title: isKm ? "សហគ្រាស" : "Enterprise",
    };
  }

  const breadcrumb = getBreadcrumb();

  return (
    <header className="topbar">
      {/* Left: Mobile Toggle & Executive Breadcrumbs */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
        {isMobile && (
          <button onClick={toggleSidebar} className="topbar-btn" aria-label="Open menu">
            <Menu size={20} />
          </button>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, whiteSpace: "nowrap" }}>
          <span
            style={{
              color: "var(--theme-nav-text-muted)",
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Compass size={15} style={{ opacity: 0.7 }} />
            <span>{breadcrumb.section}</span>
          </span>
          <span style={{ color: "var(--theme-nav-border)", opacity: 0.8 }}>/</span>
          <span
            style={{
              color: "var(--theme-nav-text)",
              fontWeight: 700,
              letterSpacing: "-0.01em",
            }}
          >
            {breadcrumb.title}
          </span>
        </div>
      </div>

      {/* Flexible Spacer */}
      <div style={{ flex: 1 }} />

      {/* Right: Controls & User Profile */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {/* Language selector */}
        <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
          <select
            value={i18n.language}
            onChange={(e) => setLocale(e.target.value as "en" | "km")}
            className="topbar-lang-select"
            title={isKm ? "ប្តូរភាសា" : "Switch Language"}
          >
            <option value="km">{isKm ? "ភាសាខ្មែរ" : "Khmer"}</option>
            <option value="en">{isKm ? "ភាសាអង់គ្លេស" : "English"}</option>
          </select>
        </div>

        {/* Loan Calculator / Simulator */}
        <button
          onClick={() => setCalcOpen(true)}
          className="topbar-btn"
          aria-label={isKm ? "កម្មវិធីគណនាកម្ចី" : "Smart Loan Simulator"}
          title={isKm ? "កម្មវិធីគណនាកម្ចី" : "Smart Loan Simulator"}
        >
          <Calculator size={18} />
        </button>

        <div className="topbar-divider" />

        {/* Audio cue toggle */}
        <button
          onClick={toggleSound}
          className="topbar-btn"
          aria-label={isKm ? "បិទ/បើកសំឡេង" : "Toggle toast audio cues"}
          title={
            soundEnabled
              ? isKm ? "សំឡេងជូនដំណឹង៖ បើក (ចុចដើម្បីបិទ)" : "Alert Audio: ON (click to mute)"
              : isKm ? "សំឡេងជូនដំណឹង៖ បិទ (ចុចដើម្បីបើក)" : "Alert Audio: MUTED (click to unmute)"
          }
        >
          {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleMode}
          className="topbar-btn"
          aria-label={isKm ? "ប្តូរពន្លឺ/ងងឹត" : "Toggle dark mode"}
          title={
            mode === "dark"
              ? isKm ? "ប្តូរទៅទម្រង់ពន្លឺ" : "Switch to light mode"
              : isKm ? "ប្តូរទៅទម្រង់ងងឹត" : "Switch to dark mode"
          }
        >
          {mode === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Theme customizer */}
        <div style={{ position: "relative" }} ref={themeRef}>
          <button
            onClick={() => { setThemeOpen((o) => !o); setNotifOpen(false); }}
            className="topbar-btn"
            aria-label={isKm ? "កែប្រែពណ៌ និងស្បែក" : "Theme customizer"}
            title={isKm ? "កែប្រែពណ៌ និងស្បែក" : "Customize brand colors"}
          >
            <Palette size={18} />
          </button>

          {themeOpen && (
            <div className="theme-panel card">
              <div className="theme-panel-title">{t("topbar.themeCustomizer")}</div>

              <div className="theme-color-row">
                <span className="theme-color-label">{t("topbar.navbar")}</span>
                <input
                  type="color"
                  className="theme-color-input"
                  value={colors.navColor}
                  onChange={(e) => setColors({ navColor: e.target.value })}
                />
              </div>

              <div className="theme-color-row">
                <span className="theme-color-label">{t("topbar.sidebar")}</span>
                <input
                  type="color"
                  className="theme-color-input"
                  value={colors.sidebarColor}
                  onChange={(e) => setColors({ sidebarColor: e.target.value })}
                />
              </div>

              <div className="theme-color-row">
                <span className="theme-color-label">{t("topbar.primaryAccent")}</span>
                <input
                  type="color"
                  className="theme-color-input"
                  value={colors.buttonColor}
                  onChange={(e) => setColors({ buttonColor: e.target.value })}
                />
              </div>

              <div className="theme-panel-title" style={{ marginTop: 6 }}>{t("topbar.colorPresets")}</div>
              <div className="theme-presets">
                {PRESET_THEMES.map((preset) => (
                  <button
                    key={preset.label}
                    className={`theme-preset-btn${
                      colors.buttonColor === preset.button ? " active" : ""
                    }`}
                    style={{ background: preset.button }}
                    onClick={() => setColors({ navColor: preset.nav, sidebarColor: preset.sidebar, buttonColor: preset.button })}
                    title={preset.label}
                  />
                ))}
              </div>

              <button
                className="btn"
                style={{ width: "100%", marginTop: 12, fontSize: 13 }}
                onClick={resetColors}
              >
                {t("topbar.resetDefault")}
              </button>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div style={{ position: "relative" }} ref={notifRef}>
          <button
            onClick={() => { setNotifOpen((o) => !o); setThemeOpen(false); }}
            className="topbar-btn"
            aria-label={t("topbar.notifications")}
            title={isKm ? "ការជូនដំណឹងប្រព័ន្ធ" : "System notifications"}
          >
            <Bell size={18} />
            {unreadCount > 0 && <span className="topbar-badge" />}
          </button>

          {notifOpen && (
            <div className="notification-panel card">
              <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--color-border)", fontSize: 14, fontWeight: 700 }}>
                {t("topbar.notifications")}
              </div>
              {notifications.length === 0 && (
                <div style={{ padding: "24px 18px", fontSize: 13.5, color: "var(--color-text-muted)", textAlign: "center" }}>
                  {t("topbar.noNotifications")}
                </div>
              )}
              {notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`notification-item${!n.is_read ? " notification-unread" : ""}`}
                >
                  {n.message}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="topbar-divider" />

        {/* User Profile Chip */}
        <div className="topbar-user" title={isKm ? `ចូលប្រើជា ${user?.name || "អ្នកប្រើប្រាស់"}` : `Logged in as ${user?.name || "User"}`}>
          <div className="topbar-avatar">{userInitials}</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span className="topbar-username">{user?.name || (isKm ? "អ្នកប្រើប្រាស់" : "User")}</span>
            <span style={{ fontSize: 11, color: "var(--color-accent-text)", fontWeight: 600, lineHeight: 1 }}>
              {t("topbar.administrator")}
            </span>
          </div>
        </div>

        <button
          onClick={logout}
          className="topbar-btn"
          aria-label={isKm ? "ចាកចេញ" : "Log out"}
          title={isKm ? "ចាកចេញពីប្រព័ន្ធ" : "Sign out"}
        >
          <LogOut size={18} />
        </button>
      </div>

      {/* Global Smart Loan Simulator Modal */}
      <LoanCalculatorModal
        isOpen={calcOpen}
        onClose={() => setCalcOpen(false)}
      />
    </header>
  );
}
