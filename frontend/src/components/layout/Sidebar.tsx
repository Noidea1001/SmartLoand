import { useState, useMemo } from "react";
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
  BarChart3,
  BellRing,
  Banknote,
  UserCheck,
  HeartHandshake,
  Building2,
  AlertOctagon,
  FolderArchive,
  MapPin,
  ArrowRightLeft,
  Calculator,
  Compass,
  CalendarClock,
  ShieldAlert,
  FileX2,
  Send,
  QrCode,
  Building,
  Coins,
  Scale,
  Award,
  BookOpen,
  Search,
  ChevronDown,
  ChevronRight,
  X,
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
  // 1. Overview
  { to: "/", labelKey: "nav.dashboard", icon: LayoutDashboard, permission: "dashboard.view", section: "sections.overview" },

  // 2. Loans & Credit
  { to: "/loans", labelKey: "nav.loans", icon: Landmark, permission: "loans.view", section: "sections.loans" },
  { to: "/loans/pending-approval", labelKey: "nav.pendingApprovals", icon: ClipboardCheck, permission: "loans.approve", section: "sections.loans" },
  { to: "/loans/my-requests", labelKey: "nav.myRequests", icon: FileText, permission: "loans.create", section: "sections.loans" },
  { to: "/restructure-simulator", labelKey: "nav.restructureSimulator", icon: ArrowRightLeft, permission: "restructure.view", section: "sections.loans" },
  { to: "/loan-calculator", labelKey: "nav.loanCalculator", icon: Calculator, permission: "calculator.view", section: "sections.loans" },

  // 3. Payments & Treasury
  { to: "/repayments", labelKey: "nav.repayments", icon: ReceiptText, permission: "payments.record", section: "sections.payments" },
  { to: "/bakong-khqr", labelKey: "nav.bakongKhqr", icon: QrCode, permission: "bakong.view", section: "sections.payments" },
  { to: "/cashier-closing", labelKey: "nav.cashierClosing", icon: Banknote, permission: "cashier.view", section: "sections.payments" },
  { to: "/fx-exchange", labelKey: "nav.fxExchange", icon: Coins, permission: "fx_exchange.view", section: "sections.payments" },
  { to: "/general-ledger", labelKey: "nav.generalLedger", icon: BookOpen, permission: "accounting.view", section: "sections.payments" },

  // 4. Risk & Collateral
  { to: "/credit-scoring", labelKey: "nav.creditScoring", icon: Award, permission: "scoring.view", section: "sections.risk" },
  { to: "/risk-watchlist", labelKey: "nav.riskWatchlist", icon: ShieldAlert, permission: "watchlist.view", section: "sections.risk" },
  { to: "/early-warning", labelKey: "nav.earlyWarning", icon: AlertOctagon, permission: "ews.view", section: "sections.risk" },
  { to: "/collaterals", labelKey: "nav.collaterals", icon: Shield, permission: "collaterals.view", section: "sections.risk" },
  { to: "/guarantors", labelKey: "nav.guarantors", icon: HeartHandshake, permission: "guarantors.view", section: "sections.risk" },

  // 5. Branch & Operations
  { to: "/branches", labelKey: "nav.branches", icon: MapPin, permission: "branches.view", section: "sections.operations" },
  { to: "/field-collection", labelKey: "nav.fieldCollection", icon: Compass, permission: "field_collection.view", section: "sections.operations" },
  { to: "/officers", labelKey: "nav.officers", icon: UserCheck, permission: "officers.view", section: "sections.operations" },
  { to: "/eod-processing", labelKey: "nav.eodProcessing", icon: CalendarClock, permission: "eod.view", section: "sections.operations" },
  { to: "/reminders", labelKey: "nav.reminders", icon: BellRing, permission: "reminders.view", section: "sections.operations" },
  { to: "/telegram-bot", labelKey: "nav.telegramBot", icon: Send, permission: "telegram_bot.view", section: "sections.operations" },

  // 6. Compliance & Reports
  { to: "/reports", labelKey: "nav.reports", icon: BarChart3, permission: "reports.view", section: "sections.compliance" },
  { to: "/nbc-provisioning", labelKey: "nav.nbcProvisioning", icon: Building, permission: "nbc_provisioning.view", section: "sections.compliance" },
  { to: "/cbc", labelKey: "nav.cbc", icon: Building2, permission: "cbc.view", section: "sections.compliance" },
  { to: "/write-offs", labelKey: "nav.writeOffs", icon: FileX2, permission: "writeoffs.view", section: "sections.compliance" },
  { to: "/documents", labelKey: "nav.documents", icon: FolderArchive, permission: "documents.view", section: "sections.compliance" },

  // 7. Directory & Catalog
  { to: "/loan-intake", labelKey: "nav.loanIntake", icon: QrCode, permission: "leads.view", section: "sections.directory" },
  { to: "/clients", labelKey: "nav.clients", icon: Users, permission: "clients.view", section: "sections.directory" },
  { to: "/products", labelKey: "nav.products", icon: Package, permission: "products.view", section: "sections.directory" },

  // 8. Administration
  { to: "/roles", labelKey: "nav.roles", icon: ShieldCheck, permission: "roles.manage", section: "sections.admin" },
  { to: "/activity-log", labelKey: "nav.activityLog", icon: History, permission: "activity_log.view", section: "sections.admin" },
  { to: "/settings", labelKey: "nav.settings", icon: SettingsIcon, permission: "settings.manage", section: "sections.admin" },
];

export default function Sidebar() {
  const { t, i18n } = useTranslation();
  const isKm = i18n.language === "km";
  const { user, hasPermission } = useAuth();
  const { isMobile, collapsed, mobileOpen, setMobileOpen, toggleSidebar } = useLayout();
  const { websiteName, tagline } = useBranding();
  const location = useLocation();

  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (section: string) => {
    setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const visibleItems = useMemo(() => {
    return NAV_ITEMS.filter((item) => {
      const allowed = !item.permission || hasPermission(item.permission);
      if (!allowed) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const label = t(item.labelKey).toLowerCase();
      const path = item.to.toLowerCase();
      return label.includes(q) || path.includes(q);
    });
  }, [hasPermission, searchQuery, t]);

  const showLabels = isMobile ? true : !collapsed;
  const open = isMobile ? mobileOpen : true;

  // Group items by section
  const grouped = useMemo(() => {
    const list: { section: string; items: typeof visibleItems }[] = [];
    let lastSection = "";
    for (const item of visibleItems) {
      const sec = item.section || "";
      if (sec !== lastSection) {
        list.push({ section: sec, items: [] });
        lastSection = sec;
      }
      list[list.length - 1].items.push(item);
    }
    return list;
  }, [visibleItems]);

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

        {/* Quick Menu Search / Filter (Visible when expanded) */}
        {showLabels && (
          <div style={{ padding: "8px 14px 4px" }}>
            <div className="sidebar-search-wrapper">
              <Search size={14} style={{ color: "var(--theme-sidebar-text-muted)", flexShrink: 0 }} />
              <input
                type="text"
                className="sidebar-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isKm ? "ស្វែងរកម៉ឺនុយ..." : "Filter menu..."}
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  boxShadow: "none",
                  color: "var(--theme-sidebar-text, #ffffff)",
                  fontSize: 12.5,
                  width: "100%",
                  padding: 0,
                  margin: 0,
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  style={{
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    color: "var(--theme-sidebar-text-muted)",
                    display: "flex",
                  }}
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="sidebar-nav">
          {grouped.map(({ section, items }, groupIdx) => {
            const isSectionCollapsed = !searchQuery && Boolean(collapsedSections[section]);
            return (
              <div key={section} style={{ marginBottom: 6 }}>
                {showLabels && section && (
                  <div
                    onClick={() => toggleSection(section)}
                    style={{
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 8px 6px",
                      marginTop: groupIdx > 0 ? 8 : 2,
                      borderTop: groupIdx > 0 ? "1px solid rgba(255, 255, 255, 0.05)" : "none",
                      borderRadius: 4,
                      userSelect: "none",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        color: "var(--theme-sidebar-text-muted)",
                        opacity: 0.8,
                      }}
                    >
                      {t(section)}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          padding: "1px 6px",
                          borderRadius: 10,
                          background: "rgba(255, 255, 255, 0.05)",
                          color: "var(--theme-sidebar-text-muted)",
                        }}
                      >
                        {items.length}
                      </span>
                      {isSectionCollapsed ? (
                        <ChevronRight size={13} color="var(--theme-sidebar-text-muted)" />
                      ) : (
                        <ChevronDown size={13} color="var(--theme-sidebar-text-muted)" />
                      )}
                    </div>
                  </div>
                )}
                {!isSectionCollapsed &&
                  items.map(({ to, labelKey, icon: Icon }) => {
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
                          <Icon size={18} strokeWidth={1.8} />
                        </span>
                        {showLabels && (
                          <span style={{ flex: 1, letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {t(labelKey)}
                          </span>
                        )}
                      </NavLink>
                    );
                  })}
              </div>
            );
          })}
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
