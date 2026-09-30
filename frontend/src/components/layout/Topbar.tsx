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
  Compass,
  Calculator,
  Check,
  RotateCcw,
  Sparkles,
  X,
  Layers,
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

export interface ThemePreset {
  id: string;
  nameKm: string;
  nameEn: string;
  category: "banking" | "wealth" | "ergonomic" | "modern";
  descKm: string;
  descEn: string;
  nav: string;
  sidebar: string;
  button: string;
}

const PRESET_THEMES: ThemePreset[] = [
  // 1. Banking & Trust
  {
    id: "royal-sapphire",
    nameKm: "ខៀវរាជវង្ស ស្ដង់ដារ",
    nameEn: "Royal Sapphire",
    category: "banking",
    descKm: "ស្ដង់ដារគ្រឹះស្ថានធនាគារ អានស្រួល ភាពជឿជាក់ខ្ពស់",
    descEn: "Tier-1 enterprise banking standard, high trust",
    nav: "#0f172a",
    sidebar: "#090d16",
    button: "#2563eb",
  },
  {
    id: "nordic-glacier",
    nameKm: "ផ្ទៃមេឃ ទឹកកក",
    nameEn: "Nordic Glacier",
    category: "banking",
    descKm: "បច្ចេកវិទ្យាហិរញ្ញវត្ថុទំនើប ស្រាលភ្នែក គ្មានចំណាំងផ្លាត",
    descEn: "Crisp modern fintech cyan, glare-free readability",
    nav: "#0c1926",
    sidebar: "#07111b",
    button: "#0284c7",
  },
  {
    id: "cobalt-precision",
    nameKm: "កូបាល់ ច្បាស់លាស់",
    nameEn: "Cobalt Precision",
    category: "banking",
    descKm: "កម្រិតខ្ពស់សម្រាប់ទិន្នន័យហិរញ្ញវត្ថុ និងរបាយការណ៍",
    descEn: "Engineered for financial metrics & data clarity",
    nav: "#0d1b2a",
    sidebar: "#08111c",
    button: "#3b82f6",
  },
  {
    id: "swiss-navy",
    nameKm: "ស្វីស ដែនសមុទ្រ",
    nameEn: "Swiss Navy",
    category: "banking",
    descKm: "ស្តង់ដារអន្តរជាតិ សុវត្ថិភាពខ្ពស់ ងាយស្រួលផ្ទៀងផ្ទាត់",
    descEn: "International vault standard, high security tone",
    nav: "#111827",
    sidebar: "#0b0f17",
    button: "#4f46e5",
  },

  // 2. Wealth & Gold
  {
    id: "emerald-wealth",
    nameKm: "ត្បូងមរកត ទ្រព្យសម្បត្តិ",
    nameEn: "Emerald Wealth",
    category: "wealth",
    descKm: "ទ្រព្យសម្បត្តិ ស្ថិរភាពហិរញ្ញវត្ថុ ពណ៌បៃតងស្ងប់ចិត្ត",
    descEn: "Prosperity & financial stability, soothing green",
    nav: "#091a13",
    sidebar: "#05110c",
    button: "#059669",
  },
  {
    id: "angkor-gold",
    nameKm: "មាសអង្គរ សំរឹទ្ធ",
    nameEn: "Angkor Gold Reserve",
    category: "wealth",
    descKm: "មាសបម្រុង សិរីសួស្តី ប្រណីតភាពនៃវប្បធម៌ខ្មែរ",
    descEn: "Cambodian silk & gold reserve, prestigious luxury",
    nav: "#18140f",
    sidebar: "#100d0a",
    button: "#d97706",
  },
  {
    id: "imperial-violet",
    nameKm: "ស្វាយអធិរាជ ឯកជន",
    nameEn: "Imperial Private",
    category: "wealth",
    descKm: "សេវាធនាគារកម្រិត VIP និងគ្រប់គ្រងទ្រព្យធំៗ",
    descEn: "VIP wealth management & private banking tier",
    nav: "#150f24",
    sidebar: "#0e0919",
    button: "#7c3aed",
  },
  {
    id: "botanical-spruce",
    nameKm: "ព្រៃស្រស់ ធម្មជាតិ",
    nameEn: "Botanical Spruce",
    category: "wealth",
    descKm: "ហិរញ្ញវត្ថុបៃតង និរន្តរភាព និងកសិកម្ម",
    descEn: "Sustainable green finance & agri-microfinance",
    nav: "#0d1a16",
    sidebar: "#07120e",
    button: "#10b981",
  },

  // 3. Ergonomic / Eye-Care
  {
    id: "platinum-slate",
    nameKm: "ផ្លាកទីន ស្ងប់ស្ងាត់",
    nameEn: "Platinum Slate",
    category: "ergonomic",
    descKm: "សម្រួលភ្នែក គ្មានចំណាំងផ្លាត សម្រាប់វេនការងារ ៨ម៉ោង",
    descEn: "Zero-glare neutral slate for 8-hour cashier shifts",
    nav: "#16181f",
    sidebar: "#0f1015",
    button: "#64748b",
  },
  {
    id: "pacific-teal",
    nameKm: "សមុទ្រប៉ាស៊ីហ្វិក ត្រជាក់",
    nameEn: "Pacific Deep Teal",
    category: "ergonomic",
    descKm: "តុល្យភាពពណ៌ល្អបំផុត កាត់បន្ថយការហត់នឿយភ្នែក",
    descEn: "Optimal color balance, reduces optic fatigue",
    nav: "#0a1919",
    sidebar: "#051111",
    button: "#0d9488",
  },
  {
    id: "warm-mocha",
    nameKm: "កាហ្វេម៉ូកា កក់ក្តៅ",
    nameEn: "Warm Mocha",
    category: "ergonomic",
    descKm: "សម្លេងពណ៌កក់ក្តៅ មិនចាំង ផ្តល់អារម្មណ៍ស្ងប់ចិត្ត",
    descEn: "Warm low-contrast earth tone, ultra soft on eyes",
    nav: "#181412",
    sidebar: "#100d0b",
    button: "#c2410c",
  },
  {
    id: "obsidian-basalt",
    nameKm: "ថ្មបាសាល់ កម្រិតខ្ពស់",
    nameEn: "Obsidian Basalt",
    category: "ergonomic",
    descKm: "ងងឹតសុទ្ធ កម្រិតច្បាស់ខ្ពស់ សន្សំសំចៃថាមពលអេក្រង់",
    descEn: "Ultra-deep OLED contrast, high clarity & low power",
    nav: "#111215",
    sidebar: "#090a0c",
    button: "#475569",
  },

  // 4. Modern & Vivid
  {
    id: "swiss-crimson",
    nameKm: "ស្វីស ក្រហមវីសា",
    nameEn: "Swiss Crimson",
    category: "modern",
    descKm: "ម៉ឺងម៉ាត់ ច្បាស់លាស់ ពិសេសសម្រាប់អធិការកិច្ច និងហានិភ័យ",
    descEn: "Authoritative & clear, ideal for audit & risk units",
    nav: "#1c1013",
    sidebar: "#12080a",
    button: "#e11d48",
  },
  {
    id: "sunset-copper",
    nameKm: "រស្មីព្រលប់ ស្ពាន់",
    nameEn: "Sunset Copper",
    category: "modern",
    descKm: "ថាមពលរស់រវើក មើលឃើញច្បាស់ ពណ៌ខ្មែរបុរាណ",
    descEn: "Vibrant energy, strong button contrast & warmth",
    nav: "#1a130f",
    sidebar: "#110b08",
    button: "#ea580c",
  },
  {
    id: "khmer-lotus",
    nameKm: "ផ្កាឈូកខ្មែរ រលោង",
    nameEn: "Khmer Lotus Blossom",
    category: "modern",
    descKm: "ទន់ភ្លន់ ថ្លៃថ្នូរ រំលេចភាពស្រស់ស្អាតនៃចំណុចប្រទាក់",
    descEn: "Gentle elegance, smooth microfinance aesthetic",
    nav: "#1b1018",
    sidebar: "#120910",
    button: "#f43f5e",
  },
  {
    id: "oasis-mint",
    nameKm: "អូអាស៊ីស ស្រស់ស្រាយ",
    nameEn: "Oasis Mint",
    category: "modern",
    descKm: "ស្រស់ស្រាយ ទំនើប ផ្តល់ភាពងាយស្រួលក្នុងការស្វែងរក",
    descEn: "Crisp mint & teal balance, modern digital branch",
    nav: "#0a1917",
    sidebar: "#05110f",
    button: "#14b8a6",
  },
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
  const [selectedCategory, setSelectedCategory] = useState<"all" | "banking" | "wealth" | "ergonomic" | "modern">("all");
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
            <div className="theme-panel">
              {/* Header */}
              <div className="theme-panel-header">
                <div>
                  <div className="theme-panel-header-title">
                    <Sparkles size={16} style={{ color: "var(--color-accent)" }} />
                    <span>{t("topbar.themeStudio")}</span>
                  </div>
                  <div className="theme-panel-header-sub">
                    {t("topbar.themeSubtitle")}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setThemeOpen(false)}
                  className="theme-panel-close-btn"
                  aria-label={isKm ? "បិទ" : "Close"}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Body */}
              <div className="theme-panel-body">
                {/* Category Filter Tabs */}
                <div className="theme-category-tabs">
                  {[
                    { key: "all", label: t("topbar.categoryAll"), count: PRESET_THEMES.length },
                    { key: "banking", label: t("topbar.categoryBanking"), count: PRESET_THEMES.filter(p => p.category === "banking").length },
                    { key: "wealth", label: t("topbar.categoryWealth"), count: PRESET_THEMES.filter(p => p.category === "wealth").length },
                    { key: "ergonomic", label: t("topbar.categoryErgonomic"), count: PRESET_THEMES.filter(p => p.category === "ergonomic").length },
                    { key: "modern", label: t("topbar.categoryModern"), count: PRESET_THEMES.filter(p => p.category === "modern").length },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      className={`theme-category-btn${selectedCategory === tab.key ? " active" : ""}`}
                      onClick={() => setSelectedCategory(tab.key as any)}
                    >
                      <span>{tab.label}</span>
                      <span className="theme-category-count">{tab.count}</span>
                    </button>
                  ))}
                </div>

                {/* Preset Cards Grid */}
                <div className="theme-card-grid">
                  {(selectedCategory === "all"
                    ? PRESET_THEMES
                    : PRESET_THEMES.filter((p) => p.category === selectedCategory)
                  ).map((preset) => {
                    const isActive =
                      colors.buttonColor.toLowerCase() === preset.button.toLowerCase() &&
                      colors.navColor.toLowerCase() === preset.nav.toLowerCase();
                    return (
                      <div
                        key={preset.id}
                        role="button"
                        tabIndex={0}
                        className={`theme-card${isActive ? " active" : ""}`}
                        onClick={() =>
                          setColors({
                            navColor: preset.nav,
                            sidebarColor: preset.sidebar,
                            buttonColor: preset.button,
                          })
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            setColors({
                              navColor: preset.nav,
                              sidebarColor: preset.sidebar,
                              buttonColor: preset.button,
                            });
                          }
                        }}
                      >
                        {/* 3-stripe visual color preview */}
                        <div className="theme-card-preview-bar">
                          <div
                            className="theme-card-preview-nav"
                            style={{ backgroundColor: preset.nav }}
                            title={`${isKm ? "របារខាងលើ" : "Navbar"}: ${preset.nav}`}
                          />
                          <div
                            className="theme-card-preview-side"
                            style={{ backgroundColor: preset.sidebar }}
                            title={`${isKm ? "របារចំហៀង" : "Sidebar"}: ${preset.sidebar}`}
                          />
                          <div
                            className="theme-card-preview-accent"
                            style={{ backgroundColor: preset.button }}
                            title={`${isKm ? "ពណ៌ចម្បង" : "Accent"}: ${preset.button}`}
                          />
                        </div>

                        {/* Card Title & Active Pill */}
                        <div className="theme-card-header">
                          <span className="theme-card-title">
                            {isKm ? preset.nameKm : preset.nameEn}
                          </span>
                          {isActive && (
                            <span className="theme-card-active-pill" title={t("topbar.activeTheme")}>
                              <Check size={12} strokeWidth={3} />
                            </span>
                          )}
                        </div>

                        {/* Short Description */}
                        <p className="theme-card-desc">
                          {isKm ? preset.descKm : preset.descEn}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Custom Fine-Tuning Drawer */}
                <div className="theme-custom-section">
                  <div className="theme-custom-header">
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Layers size={14} style={{ color: "var(--color-accent)" }} />
                      <span>{t("topbar.customTuning")}</span>
                    </span>
                  </div>

                  <div className="theme-custom-grid">
                    <div className="theme-custom-item">
                      <span className="theme-custom-label">{t("topbar.navbar")}</span>
                      <div className="theme-custom-control">
                        <input
                          type="color"
                          className="theme-color-input-round"
                          value={colors.navColor}
                          onChange={(e) => setColors({ navColor: e.target.value })}
                        />
                        <span className="theme-custom-hex">{colors.navColor}</span>
                      </div>
                    </div>

                    <div className="theme-custom-item">
                      <span className="theme-custom-label">{t("topbar.sidebar")}</span>
                      <div className="theme-custom-control">
                        <input
                          type="color"
                          className="theme-color-input-round"
                          value={colors.sidebarColor}
                          onChange={(e) => setColors({ sidebarColor: e.target.value })}
                        />
                        <span className="theme-custom-hex">{colors.sidebarColor}</span>
                      </div>
                    </div>

                    <div className="theme-custom-item">
                      <span className="theme-custom-label">{t("topbar.primaryAccent")}</span>
                      <div className="theme-custom-control">
                        <input
                          type="color"
                          className="theme-color-input-round"
                          value={colors.buttonColor}
                          onChange={(e) => setColors({ buttonColor: e.target.value })}
                        />
                        <span className="theme-custom-hex">{colors.buttonColor}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="theme-panel-footer">
                <button
                  type="button"
                  className="btn"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    padding: "6px 12px",
                  }}
                  onClick={resetColors}
                >
                  <RotateCcw size={14} />
                  <span>{t("topbar.resetDefault")}</span>
                </button>

                <button
                  type="button"
                  className="btn btn-primary"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    padding: "6px 16px",
                  }}
                  onClick={() => setThemeOpen(false)}
                >
                  <Check size={14} />
                  <span>{isKm ? "រួចរាល់" : "Done"}</span>
                </button>
              </div>
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
