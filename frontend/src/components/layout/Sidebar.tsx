import { useTranslation } from "react-i18next";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Landmark,
  Users,
  Package,
  ClipboardCheck,
  FileText,
  ShieldCheck,
  History,
  Settings as SettingsIcon,
  Menu,
  Shield,
  CircleDot,
  ReceiptText,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLayout } from "../../context/LayoutContext";
import { useBranding } from "../../context/BrandingContext";

interface NavItem {
  to: string;
  labelKey: string;
  icon: LucideIcon;
  permission?: string;
  section?: string;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", labelKey: "nav.dashboard", icon: LayoutDashboard, permission: "dashboard.view", section: "sections.overview" },
  { to: "/loans", labelKey: "nav.loans", icon: Landmark, permission: "loans.view", section: "sections.finance" },
  { to: "/repayments", labelKey: "nav.repayments", icon: ReceiptText, permission: "loans.view", section: "sections.finance" },
  { to: "/loans/pending-approval", labelKey: "nav.pendingApprovals", icon: ClipboardCheck, permission: "loans.approve", section: "sections.finance" },
  { to: "/loans/my-requests", labelKey: "nav.myRequests", icon: FileText, permission: "loans.create", section: "sections.finance" },
  { to: "/clients", labelKey: "nav.clients", icon: Users, permission: "clients.view", section: "sections.directory" },
  { to: "/products", labelKey: "nav.products", icon: Package, permission: "products.view", section: "sections.directory" },
  { to: "/roles", labelKey: "nav.roles", icon: ShieldCheck, permission: "roles.manage", section: "sections.admin" },
  { to: "/activity-log", labelKey: "nav.activityLog", icon: History, permission: "activity_log.view", section: "sections.admin" },
  { to: "/settings", labelKey: "nav.settings", icon: SettingsIcon, permission: "settings.manage", section: "sections.admin" },
];

export default function Sidebar() {
  const { t } = useTranslation();
  const { user, hasPermission } = useAuth();
  const { isMobile, collapsed, mobileOpen, setMobileOpen, toggleSidebar } = useLayout();
  const { websiteName, tagline } = useBranding();
  const location = useLocation();

  const visibleItems = NAV_ITEMS.filter((item) => !item.permission || hasPermission(item.permission));
  const showLabels = isMobile ? true : !collapsed;
  const open = isMobile ? mobileOpen : true;

  // Group items by section
  const grouped: { section: string; items: typeof visibleItems }[] = [];
  let lastSection = "";
  for (const item of visibleItems) {
    const sec = item.section || "";
    if (sec !== lastSection) {
      grouped.push({ section: sec, items: [] });
      lastSection = sec;
    }
    grouped[grouped.length - 1].items.push(item);
  }

  const userInitials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "SL";

  return (
    <>
      {isMobile && mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
          className="overlay-backdrop"
        />
      )}

      <aside
        className="sidebar"
        style={{
          width: isMobile ? 275 : (collapsed ? "var(--sidebar-width-collapsed)" : "var(--sidebar-width-expanded)"),
          transform: isMobile ? (open ? "translateX(0)" : "translateX(-100%)") : "none",
          position: isMobile ? "fixed" : "sticky",
        }}
      >
        {/* Brand Header */}
        <div
          className="sidebar-header"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: (!isMobile && collapsed) ? "center" : "space-between",
            padding: (!isMobile && collapsed) ? "16px 0" : "16px 20px",
            minHeight: "var(--topbar-height)",
          }}
        >
          {showLabels && (
            <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0, flex: 1, paddingRight: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  className="sidebar-brand"
                  style={{
                    marginLeft: 0,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: 150,
                  }}
                  title={websiteName}
                >
                  {websiteName}
                </span>
                <span
                  style={{
                    fontSize: 9.5,
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    padding: "1px 6px",
                    borderRadius: 4,
                    background: "rgba(99, 102, 241, 0.25)",
                    color: "#a5b4fc",
                    border: "1px solid rgba(165, 180, 252, 0.3)",
                    flexShrink: 0,
                  }}
                >
                  PRO
                </span>
              </div>
              <span
                style={{
                  fontSize: 11,
                  color: "var(--theme-sidebar-text-muted)",
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: 180,
                  marginTop: 2,
                }}
                title={tagline}
              >
                {tagline || "Credit Management System"}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={toggleSidebar}
            className="sidebar-toggle-btn"
            aria-label="Toggle sidebar"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            style={{
              width: 32,
              height: 32,
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              marginLeft: (!isMobile && collapsed) ? 0 : "auto",
              flexShrink: 0,
            }}
          >
            <Menu size={19} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="sidebar-nav">
          {grouped.map(({ section, items }) => (
            <div key={section}>
              {showLabels && section && (
                <div className="sidebar-section-label">{t(section)}</div>
              )}
              {items.map(({ to, labelKey, icon: Icon }) => {
                let isActive = false;
                if (to === "/") {
                  isActive = location.pathname === "/";
                } else if (to === "/loans") {
                  isActive =
                    location.pathname === "/loans" ||
                    (location.pathname.startsWith("/loans/") &&
                      !location.pathname.startsWith("/loans/pending-approval") &&
                      !location.pathname.startsWith("/loans/my-requests"));
                } else {
                  isActive = location.pathname === to || location.pathname.startsWith(to + "/");
                }

                return (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === "/" || to === "/loans"}
                    onClick={() => isMobile && setMobileOpen(false)}
                    className={() => `nav-link${isActive ? " active" : ""}`}
                    style={{ justifyContent: showLabels ? "flex-start" : "center" }}
                    title={!showLabels ? t(labelKey) : undefined}
                  >
                    <span className="nav-link-icon">
                      <Icon size={20} strokeWidth={2} />
                    </span>
                    {showLabels && (
                      <span style={{ flex: 1, letterSpacing: "-0.01em" }}>
                        {t(labelKey)}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer: User Card */}
        <div className="sidebar-footer">
          {showLabels ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "8px 10px",
                background: "rgba(255, 255, 255, 0.03)",
                borderRadius: "var(--radius-md)",
                border: "1px solid rgba(255, 255, 255, 0.05)",
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, var(--color-accent), #4f46e5)",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 700,
                  flexShrink: 0,
                  boxShadow: "0 2px 8px rgba(99, 102, 241, 0.3)",
                }}
              >
                {userInitials}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13.5,
                    fontWeight: 700,
                    color: "var(--theme-sidebar-text)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {user?.name || t("topbar.administrator")}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "#34d399",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontWeight: 600,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      backgroundColor: "#34d399",
                      display: "inline-block",
                      boxShadow: "0 0 6px #34d399",
                    }}
                  />
                  <span>{t("topbar.onlineSession")}</span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, var(--color-accent), #4f46e5)",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                }}
                title={user?.name}
              >
                {userInitials}
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
