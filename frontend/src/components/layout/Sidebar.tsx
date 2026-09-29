import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Landmark, Users, Package, ClipboardCheck,
  FileText, ShieldCheck, History, Settings as SettingsIcon,
  ChevronsLeft, ChevronsRight,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLayout } from "../../context/LayoutContext";

interface NavItem {
  to: string;
  labelKey: string;
  icon: LucideIcon;
  permission?: string;
  section?: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", labelKey: "nav.dashboard", icon: LayoutDashboard, permission: "dashboard.view", section: "Overview" },
  { to: "/loans", labelKey: "nav.loans", icon: Landmark, permission: "loans.view", section: "Management" },
  { to: "/loans/pending-approval", labelKey: "nav.pendingApprovals", icon: ClipboardCheck, permission: "loans.approve", section: "Management" },
  { to: "/loans/my-requests", labelKey: "nav.myRequests", icon: FileText, permission: "loans.create", section: "Management" },
  { to: "/clients", labelKey: "nav.clients", icon: Users, permission: "clients.view", section: "Management" },
  { to: "/products", labelKey: "nav.products", icon: Package, permission: "products.view", section: "Management" },
  { to: "/roles", labelKey: "nav.roles", icon: ShieldCheck, permission: "roles.manage", section: "System" },
  { to: "/activity-log", labelKey: "nav.activityLog", icon: History, permission: "activity_log.view", section: "System" },
  { to: "/settings", labelKey: "nav.settings", icon: SettingsIcon, permission: "settings.manage", section: "System" },
];

export default function Sidebar() {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const { isMobile, collapsed, mobileOpen, setMobileOpen, toggleSidebar } = useLayout();

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
          width: isMobile ? 260 : (collapsed ? "var(--sidebar-width-collapsed)" : "var(--sidebar-width-expanded)"),
          transform: isMobile ? (open ? "translateX(0)" : "translateX(-100%)") : "none",
          position: isMobile ? "fixed" : "sticky",
        }}
      >
        <div className="sidebar-header" style={{ justifyContent: (!isMobile && collapsed) ? "center" : "flex-start" }}>
          <div className="sidebar-logo">SL</div>
          {showLabels && <span className="sidebar-brand">Smart Loan</span>}
          {!isMobile && (
            <button
              onClick={toggleSidebar}
              className="sidebar-toggle-btn"
              aria-label="Toggle sidebar"
              style={{ marginLeft: showLabels ? "auto" : 0 }}
            >
              {collapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
            </button>
          )}
        </div>

        <nav className="sidebar-nav">
          {grouped.map(({ section, items }) => (
            <div key={section}>
              {showLabels && section && (
                <div className="sidebar-section-label">{section}</div>
              )}
              {items.map(({ to, labelKey, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                  onClick={() => isMobile && setMobileOpen(false)}
                  className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
                  style={{ justifyContent: showLabels ? "flex-start" : "center" }}
                  title={!showLabels ? t(labelKey) : undefined}
                >
                  <span className="nav-link-icon">
                    <Icon size={18} />
                  </span>
                  {showLabels && <span>{t(labelKey)}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
