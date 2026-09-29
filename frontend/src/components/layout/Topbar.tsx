import { useEffect, useRef, useState } from "react";
import { Bell, LogOut, Menu, Moon, Palette, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { listNotifications, markNotificationRead } from "../../api/notifications";
import { setLocale } from "../../i18n/i18n";
import { useAuth } from "../../context/AuthContext";
import { useLayout } from "../../context/LayoutContext";
import { useTheme } from "../../context/ThemeContext";
import type { NotificationItem } from "../../api/types";

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
  const { i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { isMobile, toggleSidebar } = useLayout();
  const { mode, toggleMode, colors, setColors, resetColors } = useTheme();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
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
    return () => document.removeEventListener("mousedown", onClickOutside);
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
    : "U";

  return (
    <header className="topbar">
      {isMobile && (
        <button onClick={toggleSidebar} className="topbar-btn" style={{ marginRight: "auto" }} aria-label="Open menu">
          <Menu size={20} />
        </button>
      )}

      {!isMobile && (
        <div style={{ marginRight: "auto", display: "flex", alignItems: "center" }}>
          {/* Breadcrumb area — could be expanded later */}
        </div>
      )}

      <select
        value={i18n.language}
        onChange={(e) => setLocale(e.target.value as "en" | "km")}
        className="topbar-lang-select"
      >
        <option value="en">EN</option>
        <option value="km">KM</option>
      </select>

      <div className="topbar-divider" />

      {/* Theme toggle */}
      <button onClick={toggleMode} className="topbar-btn" aria-label="Toggle dark mode" title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
        {mode === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      {/* Theme customizer */}
      <div style={{ position: "relative" }} ref={themeRef}>
        <button
          onClick={() => { setThemeOpen((o) => !o); setNotifOpen(false); }}
          className="topbar-btn"
          aria-label="Theme customizer"
          title="Customize colors"
        >
          <Palette size={18} />
        </button>

        {themeOpen && (
          <div className="theme-panel card">
            <div className="theme-panel-title">Theme Colors</div>

            <div className="theme-color-row">
              <span className="theme-color-label">Navbar</span>
              <input
                type="color"
                className="theme-color-input"
                value={colors.navColor}
                onChange={(e) => setColors({ navColor: e.target.value })}
              />
            </div>

            <div className="theme-color-row">
              <span className="theme-color-label">Sidebar</span>
              <input
                type="color"
                className="theme-color-input"
                value={colors.sidebarColor}
                onChange={(e) => setColors({ sidebarColor: e.target.value })}
              />
            </div>

            <div className="theme-color-row">
              <span className="theme-color-label">Buttons / Accent</span>
              <input
                type="color"
                className="theme-color-input"
                value={colors.buttonColor}
                onChange={(e) => setColors({ buttonColor: e.target.value })}
              />
            </div>

            <div className="theme-panel-title" style={{ marginTop: 4 }}>Presets</div>
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
              style={{ width: "100%", marginTop: 12, fontSize: 12 }}
              onClick={resetColors}
            >
              Reset to Default
            </button>
          </div>
        )}
      </div>

      {/* Notifications */}
      <div style={{ position: "relative" }} ref={notifRef}>
        <button
          onClick={() => { setNotifOpen((o) => !o); setThemeOpen(false); }}
          className="topbar-btn"
          aria-label="Notifications"
        >
          <Bell size={18} />
          {unreadCount > 0 && <span className="topbar-badge" />}
        </button>

        {notifOpen && (
          <div className="notification-panel card">
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--color-border)", fontSize: 13, fontWeight: 600 }}>
              Notifications
            </div>
            {notifications.length === 0 && (
              <div style={{ padding: "20px 16px", fontSize: 13, color: "var(--color-text-muted)", textAlign: "center" }}>
                No notifications
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

      <div className="topbar-user">
        <div className="topbar-avatar">{userInitials}</div>
        <span className="topbar-username">{user?.name}</span>
      </div>

      <button onClick={logout} className="topbar-btn" aria-label="Log out" title="Sign out">
        <LogOut size={18} />
      </button>
    </header>
  );
}
