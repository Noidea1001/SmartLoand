import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Settings as SettingsIcon,
  Globe,
  Landmark,
  DollarSign,
  Percent,
  Calendar,
  Check,
  Save,
  RotateCcw,
  Server,
  ShieldCheck,
  Building,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { getSettings, updateSettings, type TenantSettings } from "../../api/settings";
import { useToast } from "../../context/ToastContext";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useBranding } from "../../context/BrandingContext";
import { setLocale } from "../../i18n/i18n";
import { formatCurrency } from "../../utils/format";

export default function Settings() {
  useDocumentTitle("Settings");
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const { setBranding } = useBranding();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"branding" | "financial" | "system">("branding");

  // Form States
  const [websiteName, setWebsiteName] = useState("Smart Loan Platform");
  const [companyName, setCompanyName] = useState("Smart Loan Enterprise");
  const [tagline, setTagline] = useState("Credit Suite");
  const [rate, setRate] = useState("4100");
  const [baseCurrency, setBaseCurrency] = useState<"USD" | "KHR">("USD");
  const [gracePeriod, setGracePeriod] = useState("3");
  const [lateFee, setLateFee] = useState("2.0");
  const [interestType, setInterestType] = useState<"flat" | "reducing">("reducing");
  const [localeState, setLocaleState] = useState<"en" | "km">("en");
  const [rateUpdatedAt, setRateUpdatedAt] = useState<string>("");

  // Track original values to reset
  const [initialData, setInitialData] = useState<TenantSettings | null>(null);

  useEffect(() => {
    getSettings()
      .then((s) => {
        setInitialData(s);
        setWebsiteName(s.website_name || "Smart Loan Platform");
        setCompanyName(s.company_name || "Smart Loan Enterprise");
        setTagline(s.tagline || "Credit Suite");
        setRate(s.usd_to_khr_rate || "4100");
        setBaseCurrency((s.base_currency as "USD" | "KHR") || "USD");
        setGracePeriod(String(s.grace_period_days ?? 3));
        setLateFee(s.late_fee_percent || "2.0");
        setInterestType((s.default_interest_type as "flat" | "reducing") || "reducing");
        setLocaleState(s.locale === "km" ? "km" : "en");
        if (s.rate_updated_at) {
          setRateUpdatedAt(new Date(s.rate_updated_at).toLocaleDateString());
        }
      })
      .catch(() => {
        toast.error(t("settingsPage.saveError"));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [i18n.language, t, toast]);

  function handleReset() {
    if (!initialData) return;
    setWebsiteName(initialData.website_name || "Smart Loan Platform");
    setCompanyName(initialData.company_name || "Smart Loan Enterprise");
    setTagline(initialData.tagline || "Credit Suite");
    setRate(initialData.usd_to_khr_rate || "4100");
    setBaseCurrency((initialData.base_currency as "USD" | "KHR") || "USD");
    setGracePeriod(String(initialData.grace_period_days ?? 3));
    setLateFee(initialData.late_fee_percent || "2.0");
    setInterestType((initialData.default_interest_type as "flat" | "reducing") || "reducing");
    setLocaleState(initialData.locale === "km" ? "km" : "en");
    toast.info("Settings restored to previous saved state.");
  }

  async function handleSave() {
    if (!websiteName.trim()) {
      toast.warning("Website name cannot be empty.");
      return;
    }

    setSaving(true);
    try {
      const updated = await updateSettings({
        website_name: websiteName.trim(),
        company_name: companyName.trim(),
        tagline: tagline.trim(),
        usd_to_khr_rate: Number(rate) || 4100,
        base_currency: baseCurrency,
        grace_period_days: Math.max(0, parseInt(gracePeriod, 10) || 0),
        late_fee_percent: Math.max(0, parseFloat(lateFee) || 0),
        default_interest_type: interestType,
        locale: localeState,
      });

      setInitialData(updated);
      setBranding({
        websiteName: websiteName.trim(),
        companyName: companyName.trim(),
        tagline: tagline.trim(),
        usdToKhrRate: Number(rate) || 4100,
      });

      if (localeState !== i18n.language) {
        setLocale(localeState);
      }

      toast.success(t("settingsPage.saveSuccess"));
    } catch {
      toast.error(t("settingsPage.saveError"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: "center", color: "var(--color-text-muted)" }}>
        {t("common.loading")}
      </div>
    );
  }

  const numericRate = parseFloat(rate) || 4100;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 960, margin: "0 auto" }}>
      {/* Header Banner */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "10px",
              backgroundColor: "var(--color-surface-sunken)",
              color: "var(--color-accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid var(--color-border)",
            }}
          >
            <SettingsIcon size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
              {t("settingsPage.title")}
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--color-text-muted)" }}>
              {t("settingsPage.subtitle")}
            </p>
          </div>
        </div>

        {/* Global Action Bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleReset}
            disabled={saving}
            style={{ borderRadius: "8px", fontSize: 13 }}
          >
            <RotateCcw size={15} />
            <span>Discard Changes</span>
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
            style={{ borderRadius: "8px", fontSize: 13, minWidth: 140 }}
          >
            {saving ? (
              <span>{t("settingsPage.saving")}</span>
            ) : (
              <>
                <Save size={15} />
                <span>{t("settingsPage.saveButton")}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Navigation Segmented Tabs */}
      <div
        style={{
          display: "flex",
          gap: 6,
          background: "var(--color-surface-sunken)",
          padding: 4,
          borderRadius: "8px",
          border: "1px solid var(--color-border)",
          maxWidth: 520,
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("branding")}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "8px 14px",
            borderRadius: "6px",
            fontSize: 13,
            fontWeight: 700,
            border: "none",
            cursor: "pointer",
            background: activeTab === "branding" ? "var(--color-surface)" : "transparent",
            color: activeTab === "branding" ? "var(--color-text)" : "var(--color-text-secondary)",
            boxShadow: activeTab === "branding" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            transition: "all 0.15s ease",
          }}
        >
          <Globe size={15} color={activeTab === "branding" ? "var(--color-accent)" : "currentColor"} />
          <span>{t("settingsPage.brandingTab")}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("financial")}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "8px 14px",
            borderRadius: "6px",
            fontSize: 13,
            fontWeight: 700,
            border: "none",
            cursor: "pointer",
            background: activeTab === "financial" ? "var(--color-surface)" : "transparent",
            color: activeTab === "financial" ? "var(--color-text)" : "var(--color-text-secondary)",
            boxShadow: activeTab === "financial" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            transition: "all 0.15s ease",
          }}
        >
          <DollarSign size={15} color={activeTab === "financial" ? "var(--color-accent)" : "currentColor"} />
          <span>{t("settingsPage.financialTab")}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("system")}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "8px 14px",
            borderRadius: "6px",
            fontSize: 13,
            fontWeight: 700,
            border: "none",
            cursor: "pointer",
            background: activeTab === "system" ? "var(--color-surface)" : "transparent",
            color: activeTab === "system" ? "var(--color-text)" : "var(--color-text-secondary)",
            boxShadow: activeTab === "system" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            transition: "all 0.15s ease",
          }}
        >
          <Server size={15} color={activeTab === "system" ? "var(--color-accent)" : "currentColor"} />
          <span>{t("settingsPage.systemTab")}</span>
        </button>
      </div>

      {/* Tab 1: Platform & Branding */}
      {activeTab === "branding" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div
            style={{
              background: "var(--color-surface)",
              borderRadius: "14px",
              border: "1px solid var(--color-border)",
              boxShadow: "var(--shadow-sm)",
              padding: 24,
              display: "grid",
              gap: 20,
            }}
          >
            <div>
              <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "var(--color-text)" }}>
                {t("settingsPage.websiteName")}
              </h3>
              <p style={{ margin: "0 0 10px", fontSize: 12.5, color: "var(--color-text-muted)" }}>
                {t("settingsPage.websiteNameDesc")}
              </p>
              <input
                type="text"
                value={websiteName}
                onChange={(e) => setWebsiteName(e.target.value)}
                placeholder="e.g. Smart Loan Platform"
                style={{
                  width: "100%",
                  fontSize: 15,
                  fontWeight: 600,
                  padding: "10px 14px",
                  borderRadius: "8px",
                }}
              />
            </div>

            <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 20 }}>
              <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "var(--color-text)" }}>
                {t("settingsPage.companyName")}
              </h3>
              <p style={{ margin: "0 0 10px", fontSize: 12.5, color: "var(--color-text-muted)" }}>
                {t("settingsPage.companyNameDesc")}
              </p>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Smart Loan Enterprise PLC"
                style={{
                  width: "100%",
                  fontSize: 15,
                  fontWeight: 600,
                  padding: "10px 14px",
                  borderRadius: "8px",
                }}
              />
            </div>

            <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 20 }}>
              <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "var(--color-text)" }}>
                {t("settingsPage.tagline")}
              </h3>
              <p style={{ margin: "0 0 10px", fontSize: 12.5, color: "var(--color-text-muted)" }}>
                {t("settingsPage.taglineDesc")}
              </p>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="e.g. Credit Suite"
                style={{
                  width: "100%",
                  fontSize: 15,
                  fontWeight: 600,
                  padding: "10px 14px",
                  borderRadius: "8px",
                }}
              />
            </div>

            <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 20 }}>
              <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "var(--color-text)" }}>
                Default System Language
              </h3>
              <p style={{ margin: "0 0 10px", fontSize: 12.5, color: "var(--color-text-muted)" }}>
                Select the default language used for new sessions and unauthenticated interfaces.
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setLocaleState("en")}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    border: localeState === "en" ? "1.5px solid var(--color-accent)" : "1px solid var(--color-border)",
                    background: localeState === "en" ? "var(--color-accent-soft)" : "var(--color-surface)",
                    color: localeState === "en" ? "var(--color-accent)" : "var(--color-text)",
                    transition: "all 0.15s ease",
                  }}
                >
                  English (EN)
                </button>
                <button
                  type="button"
                  onClick={() => setLocaleState("km")}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    border: localeState === "km" ? "1.5px solid var(--color-accent)" : "1px solid var(--color-border)",
                    background: localeState === "km" ? "var(--color-accent-soft)" : "var(--color-surface)",
                    color: localeState === "km" ? "var(--color-accent)" : "var(--color-text)",
                    transition: "all 0.15s ease",
                  }}
                >
                  ភាសាខ្មែរ (Khmer)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Financial & Lending Policies */}
      {activeTab === "financial" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div
            style={{
              background: "var(--color-surface)",
              borderRadius: "14px",
              border: "1px solid var(--color-border)",
              boxShadow: "var(--shadow-sm)",
              padding: 24,
              display: "grid",
              gap: 20,
            }}
          >
            {/* USD to KHR Exchange Rate */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--color-text)" }}>
                  {t("settingsPage.exchangeRate")}
                </h3>
                {rateUpdatedAt && (
                  <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                    {t("settingsPage.rateUpdated")}: {rateUpdatedAt}
                  </span>
                )}
              </div>
              <p style={{ margin: "0 0 10px", fontSize: 12.5, color: "var(--color-text-muted)" }}>
                Official operational conversion rate from 1 USD to Cambodian Riel (KHR).
              </p>

              <div style={{ display: "flex", alignItems: "center", gap: 12, maxWidth: 360 }}>
                <input
                  type="number"
                  step="1"
                  min="3000"
                  max="5000"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    fontFamily: "var(--font-sans)",
                    fontVariantNumeric: "tabular-nums",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    width: 160,
                  }}
                />
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-secondary)" }}>
                  KHR per $1.00 USD
                </span>
              </div>

              {/* Conversion Reference Strip */}
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  alignItems: "center",
                  marginTop: 10,
                  padding: "10px 14px",
                  borderRadius: "8px",
                  background: "var(--color-surface-sunken)",
                  border: "1px solid var(--color-border)",
                  fontSize: 12.5,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                <span>$100 = <strong>{formatCurrency(100 * numericRate, "KHR")}</strong></span>
                <span style={{ color: "var(--color-border)" }}>•</span>
                <span>$1,000 = <strong>{formatCurrency(1000 * numericRate, "KHR")}</strong></span>
                <span style={{ color: "var(--color-border)" }}>•</span>
                <span>$5,000 = <strong>{formatCurrency(5000 * numericRate, "KHR")}</strong></span>
              </div>
            </div>

            {/* Base Currency */}
            <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 20 }}>
              <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "var(--color-text)" }}>
                {t("settingsPage.baseCurrency")}
              </h3>
              <p style={{ margin: "0 0 10px", fontSize: 12.5, color: "var(--color-text-muted)" }}>
                Standard base currency for aggregated reporting and system metrics.
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setBaseCurrency("USD")}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    border: baseCurrency === "USD" ? "1.5px solid var(--color-accent)" : "1px solid var(--color-border)",
                    background: baseCurrency === "USD" ? "var(--color-accent-soft)" : "var(--color-surface)",
                    color: baseCurrency === "USD" ? "var(--color-accent)" : "var(--color-text)",
                    transition: "all 0.15s ease",
                  }}
                >
                  USD ($) - US Dollar
                </button>
                <button
                  type="button"
                  onClick={() => setBaseCurrency("KHR")}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    border: baseCurrency === "KHR" ? "1.5px solid var(--color-accent)" : "1px solid var(--color-border)",
                    background: baseCurrency === "KHR" ? "var(--color-accent-soft)" : "var(--color-surface)",
                    color: baseCurrency === "KHR" ? "var(--color-accent)" : "var(--color-text)",
                    transition: "all 0.15s ease",
                  }}
                >
                  KHR (៛) - Khmer Riel
                </button>
              </div>
            </div>

            {/* Default Calculation Method */}
            <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 20 }}>
              <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "var(--color-text)" }}>
                {t("settingsPage.defaultInterest")}
              </h3>
              <p style={{ margin: "0 0 10px", fontSize: 12.5, color: "var(--color-text-muted)" }}>
                Select default amortization calculation for newly initiated credit applications.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, maxWidth: 640 }}>
                <div
                  onClick={() => setInterestType("reducing")}
                  style={{
                    padding: "12px 14px",
                    borderRadius: "8px",
                    border: interestType === "reducing" ? "1.5px solid var(--color-accent)" : "1px solid var(--color-border)",
                    background: interestType === "reducing" ? "var(--color-accent-soft)" : "var(--color-surface)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 13, color: interestType === "reducing" ? "var(--color-accent)" : "var(--color-text)" }}>
                    <TrendingUp size={15} color="var(--color-accent)" />
                    <span>{t("loans.reducing")}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 4, lineHeight: 1.4 }}>
                    Interest decreases as principal is amortized (Standard banking policy).
                  </div>
                </div>

                <div
                  onClick={() => setInterestType("flat")}
                  style={{
                    padding: "12px 14px",
                    borderRadius: "8px",
                    border: interestType === "flat" ? "1.5px solid var(--color-accent)" : "1px solid var(--color-border)",
                    background: interestType === "flat" ? "var(--color-accent-soft)" : "var(--color-surface)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 13, color: interestType === "flat" ? "var(--color-accent)" : "var(--color-text)" }}>
                    <Percent size={15} color="var(--color-text-secondary)" />
                    <span>{t("loans.flat")}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 4, lineHeight: 1.4 }}>
                    Fixed interest calculated against original principal throughout duration.
                  </div>
                </div>
              </div>
            </div>

            {/* Grace Period & Late Fee */}
            <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div>
                <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: "var(--color-text)" }}>
                  {t("settingsPage.gracePeriod")}
                </h3>
                <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--color-text-muted)" }}>
                  {t("settingsPage.gracePeriodDesc")}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={gracePeriod}
                    onChange={(e) => setGracePeriod(e.target.value)}
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      fontFamily: "var(--font-sans)",
                      fontVariantNumeric: "tabular-nums",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      width: 100,
                    }}
                  />
                  <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>days</span>
                </div>
              </div>

              <div>
                <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: "var(--color-text)" }}>
                  {t("settingsPage.lateFee")}
                </h3>
                <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--color-text-muted)" }}>
                  {t("settingsPage.lateFeeDesc")}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="50"
                    value={lateFee}
                    onChange={(e) => setLateFee(e.target.value)}
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      fontFamily: "var(--font-sans)",
                      fontVariantNumeric: "tabular-nums",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      width: 100,
                    }}
                  />
                  <span style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>% / month</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: System Diagnostics & Info */}
      {activeTab === "system" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div
            style={{
              background: "var(--color-surface)",
              borderRadius: "14px",
              border: "1px solid var(--color-border)",
              boxShadow: "var(--shadow-sm)",
              padding: 24,
            }}
          >
            <h3 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 700, color: "var(--color-text)" }}>
              {t("settingsPage.systemInfo")}
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div
                style={{
                  padding: "14px 16px",
                  borderRadius: "8px",
                  background: "var(--color-surface-sunken)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 600 }}>
                  {t("settingsPage.apiVersion")}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text)", marginTop: 4 }}>
                  Smart Loan Core v2.4.0 (FastAPI 0.111 / Python 3.12)
                </div>
              </div>

              <div
                style={{
                  padding: "14px 16px",
                  borderRadius: "8px",
                  background: "var(--color-surface-sunken)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 600 }}>
                  {t("settingsPage.dbStatus")}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text)", marginTop: 4 }}>
                  PostgreSQL 16 (Connection Pool Active)
                </div>
              </div>

              <div
                style={{
                  padding: "14px 16px",
                  borderRadius: "8px",
                  background: "var(--color-surface-sunken)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 600 }}>
                  {t("settingsPage.environment")}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-accent)", marginTop: 4 }}>
                  Production Ready / Docker Swarm
                </div>
              </div>

              <div
                style={{
                  padding: "14px 16px",
                  borderRadius: "8px",
                  background: "var(--color-surface-sunken)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 600 }}>
                  Current Active Branding
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text)", marginTop: 4 }}>
                  {websiteName} ({companyName})
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
