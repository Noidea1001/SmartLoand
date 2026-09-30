import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Settings as SettingsIcon,
  Globe,
  Landmark,
  DollarSign,
  Percent,
  Calendar,
  Save,
  RotateCcw,
  Server,
  ShieldCheck,
  Building,
  Sparkles,
  TrendingUp,
  FileCheck,
  Lock,
  Database,
  Check,
} from "lucide-react";
import { getSettings, updateSettings, type TenantSettings } from "../../api/settings";
import { useToast } from "../../context/ToastContext";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useBranding } from "../../context/BrandingContext";
import { setLocale } from "../../i18n/i18n";
import { formatCurrency } from "../../utils/format";

export default function Settings() {
  const { i18n } = useTranslation();
  const isKm = i18n.language === "km";
  useDocumentTitle(isKm ? "ការកំណត់ប្រព័ន្ធ & ស្ថាប័ន" : "System & Institutional Settings");
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
  const [localeState, setLocaleState] = useState<"en" | "km">("km");
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
        toast.error(isKm ? "បរាជ័យក្នុងការទាញយកការកំណត់" : "Failed to load settings.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [i18n.language]);

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
    toast.info(isKm ? "បានត្រឡប់ទៅការកំណត់ដើមវិញ" : "Settings restored to previous saved state.");
  }

  async function handleSave() {
    if (!websiteName.trim()) {
      toast.warning(isKm ? "ឈ្មោះគេហទំព័រមិនអាចទុកទទេបានទេ" : "Website name cannot be empty.");
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
        baseCurrency: baseCurrency,
        usdToKhrRate: Number(rate) || 4100,
      });

      if (localeState !== i18n.language) {
        setLocale(localeState);
      }

      toast.success(isKm ? "បានរក្សាទុកការកំណត់ប្រព័ន្ធដោយជោគជ័យ" : "Settings saved successfully.");
    } catch {
      toast.error(isKm ? "បរាជ័យក្នុងការរក្សាទុកការកំណត់" : "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: "center", color: "var(--color-text-muted)" }}>
        {isKm ? "កំពុងទាញយកការកំណត់..." : "Loading configuration..."}
      </div>
    );
  }

  const numericRate = parseFloat(rate) || 4100;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 1100, margin: "0 auto", padding: "24px 28px" }}>
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
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "var(--color-text)" }}>
              {isKm ? "ការកំណត់ទូទៅរបស់ស្ថាប័ន & ប្រព័ន្ធ (System Configuration)" : "Institutional Settings & Core Configuration"}
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--color-text-muted)" }}>
              {isKm
                ? "កំណត់ប៉ារ៉ាម៉ែត្រហិរញ្ញវត្ថុ អត្រាប្តូរប្រាក់ NBC ម៉ាកយីហោ និងគោលនយោបាយឥណទាន"
                : "Manage institutional branding, official NBC foreign exchange rates, interest calculation standards, and core policy"}
            </p>
          </div>
        </div>

        {/* Global Action Bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleReset}
            disabled={saving}
            style={{ fontSize: 13 }}
          >
            <RotateCcw size={15} />
            <span>{isKm ? "បោះបង់ការកែប្រែ" : "Discard Changes"}</span>
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
            style={{ fontSize: 13, minWidth: 140, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          >
            <Save size={15} />
            <span>{saving ? (isKm ? "កំពុងរក្សាទុក..." : "Saving...") : (isKm ? "រក្សាទុកការកំណត់" : "Save Changes")}</span>
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
          maxWidth: 600,
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
            color: activeTab === "branding" ? "var(--color-text)" : "var(--color-text-muted)",
            boxShadow: activeTab === "branding" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            transition: "all 0.15s ease",
          }}
        >
          <Globe size={15} color={activeTab === "branding" ? "var(--color-accent)" : "currentColor"} />
          <span>{isKm ? "ស្ថាប័ន & ម៉ាកយីហោ" : "Identity & Branding"}</span>
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
            color: activeTab === "financial" ? "var(--color-text)" : "var(--color-text-muted)",
            boxShadow: activeTab === "financial" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            transition: "all 0.15s ease",
          }}
        >
          <DollarSign size={15} color={activeTab === "financial" ? "var(--color-accent)" : "currentColor"} />
          <span>{isKm ? "គោលនយោបាយហិរញ្ញវត្ថុ" : "Financial Policies"}</span>
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
            color: activeTab === "system" ? "var(--color-text)" : "var(--color-text-muted)",
            boxShadow: activeTab === "system" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            transition: "all 0.15s ease",
          }}
        >
          <Server size={15} color={activeTab === "system" ? "var(--color-accent)" : "currentColor"} />
          <span>{isKm ? "ប្រព័ន្ធ & សុវត្ថិភាព" : "System & Security"}</span>
        </button>
      </div>

      {/* Tab 1: Platform & Branding */}
      {activeTab === "branding" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div
            className="card"
            style={{
              padding: 24,
              display: "grid",
              gap: 20,
            }}
          >
            <div>
              <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "var(--color-text)" }}>
                {isKm ? "ឈ្មោះកម្មវិធី / ប្រព័ន្ធប្រតិបត្តិការ (System Title)" : "System Operating Title"}
              </h3>
              <p style={{ margin: "0 0 10px", fontSize: 12.5, color: "var(--color-text-muted)" }}>
                {isKm ? "បង្ហាញនៅរបារខាងឆ្វេង (Sidebar) ផ្នែកខាងលើ និងក្បាលទំព័ររបាយការណ៍" : "Displayed in the sidebar, browser title, and header of generated reports"}
              </p>
              <input
                type="text"
                value={websiteName}
                onChange={(e) => setWebsiteName(e.target.value)}
                placeholder="Smart Loan Cambodia"
                className="input"
                style={{ width: "100%", fontSize: 15, fontWeight: 600 }}
              />
            </div>

            <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 20 }}>
              <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "var(--color-text)" }}>
                {isKm ? "ឈ្មោះស្ថាប័នផ្លូវការ (Legal Company Name)" : "Institution Legal Name"}
              </h3>
              <p style={{ margin: "0 0 10px", fontSize: 12.5, color: "var(--color-text-muted)" }}>
                {isKm ? "ឈ្មោះផ្លូវការដែលត្រូវបោះពុម្ពលើកិច្ចសន្យាកម្ចី បង្កាន់ដៃបង់ប្រាក់ និងលិខិតផ្លូវការ" : "Full registered legal name printed on loan agreements, payment receipts, and official returns"}
              </p>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Smart Loan Enterprise PLC"
                className="input"
                style={{ width: "100%", fontSize: 15, fontWeight: 600 }}
              />
            </div>

            <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 20 }}>
              <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "var(--color-text)" }}>
                {isKm ? "ពាក្យស្លោកស្ថាប័ន (Tagline)" : "Institutional Tagline"}
              </h3>
              <p style={{ margin: "0 0 10px", fontSize: 12.5, color: "var(--color-text-muted)" }}>
                {isKm ? "ពាក្យស្លោកខ្លីបង្ហាញនៅក្រោមឈ្មោះស្ថាប័ន" : "Short corporate slogan displayed beneath institutional title"}
              </p>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="Core Banking & Microfinance Suite"
                className="input"
                style={{ width: "100%", fontSize: 15, fontWeight: 600 }}
              />
            </div>

            <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 20 }}>
              <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: "var(--color-text)" }}>
                {isKm ? "ភាសាដើមរបស់ប្រព័ន្ធ (Default System Language)" : "Default System Language"}
              </h3>
              <p style={{ margin: "0 0 10px", fontSize: 12.5, color: "var(--color-text-muted)" }}>
                {isKm ? "ជ្រើសរើសភាសាសម្រាប់គណនីថ្មី និងទំព័រសាធារណៈរបស់ប្រព័ន្ធ" : "Select default language applied to initial sessions and public application pages"}
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setLocaleState("km")}
                  style={{
                    padding: "8px 18px",
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
                <button
                  type="button"
                  onClick={() => setLocaleState("en")}
                  style={{
                    padding: "8px 18px",
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
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Financial & Lending Policies */}
      {activeTab === "financial" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div
            className="card"
            style={{
              padding: 24,
              display: "grid",
              gap: 20,
            }}
          >
            {/* USD to KHR Exchange Rate */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--color-text)" }}>
                  {isKm ? "អត្រាប្តូរប្រាក់ផ្លូវការ (USD ⇄ KHR Exchange Rate)" : "Official Exchange Rate (USD ⇄ KHR)"}
                </h3>
                {rateUpdatedAt && (
                  <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                    {isKm ? `បានធ្វើបច្ចុប្បន្នភាព: ${rateUpdatedAt}` : `Last updated: ${rateUpdatedAt}`}
                  </span>
                )}
              </div>
              <p style={{ margin: "0 0 10px", fontSize: 12.5, color: "var(--color-text-muted)" }}>
                {isKm
                  ? "អត្រាប្តូរប្រាក់យោងផ្លូវការពី 1 USD ទៅប្រាក់រៀលខ្មែរ (KHR) សម្រាប់គណនាកម្ចី និងរបាយការណ៍បង្រួបបង្រួម"
                  : "Official operational exchange rate from $1.00 USD to Cambodian Riel (KHR) for dual-currency accounting"}
              </p>

              <div style={{ display: "flex", alignItems: "center", gap: 12, maxWidth: 380 }}>
                <input
                  type="number"
                  step="1"
                  min="3000"
                  max="5000"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  className="input"
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    width: 160,
                  }}
                />
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-muted)" }}>
                  {isKm ? "រៀល ក្នុង $1.00 ដុល្លារ" : "KHR per $1.00 USD"}
                </span>
              </div>

              {/* Conversion Reference Strip */}
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  alignItems: "center",
                  flexWrap: "wrap",
                  marginTop: 10,
                  padding: "10px 14px",
                  borderRadius: "8px",
                  background: "var(--color-surface-sunken)",
                  border: "1px solid var(--color-border)",
                  fontSize: 12.5,
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
                {isKm ? "រូបិយប័ណ្ណគោលរបស់ស្ថាប័ន (Institutional Base Currency)" : "Institutional Base Currency"}
              </h3>
              <p style={{ margin: "0 0 10px", fontSize: 12.5, color: "var(--color-text-muted)" }}>
                {isKm ? "រូបិយប័ណ្ណស្តង់ដារសម្រាប់បង្រួបបង្រួមរបាយការណ៍ហិរញ្ញវត្ថុ និងផ្ទាំងគ្រប់គ្រង" : "Standard currency for consolidated portfolio reporting and financial dashboard aggregates"}
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setBaseCurrency("USD")}
                  style={{
                    padding: "8px 18px",
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
                    padding: "8px 18px",
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
                {isKm ? "វិធីសាស្ត្រគណនាការប្រាក់លំនាំដើម (Default Amortization Method)" : "Default Amortization Standard"}
              </h3>
              <p style={{ margin: "0 0 10px", fontSize: 12.5, color: "var(--color-text-muted)" }}>
                {isKm ? "វិធីសាស្ត្រគណនាដែលត្រូវបានកំណត់ជាស្វ័យប្រវត្តិពេលបង្កើតកម្ចីថ្មី" : "Preselected repayment schedule method when initiating new loan applications"}
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
                <div
                  onClick={() => setInterestType("reducing")}
                  style={{
                    padding: "14px 16px",
                    borderRadius: "10px",
                    border: interestType === "reducing" ? "1.5px solid var(--color-accent)" : "1px solid var(--color-border)",
                    background: interestType === "reducing" ? "var(--color-accent-soft)" : "var(--color-surface)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 13.5, color: interestType === "reducing" ? "var(--color-accent)" : "var(--color-text)" }}>
                    <TrendingUp size={16} />
                    <span>{isKm ? "ការប្រាក់ថយចុះ (Reducing Balance Method)" : "Reducing Balance Method"}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4, lineHeight: 1.4 }}>
                    {isKm
                      ? "ការប្រាក់ថយចុះតាមសមតុល្យប្រាក់ដើមដែលនៅសល់ (ស្តង់ដារធនាគារកម្ពុជា)"
                      : "Interest decreases progressively as outstanding principal is amortized (Standard banking policy)"}
                  </div>
                </div>

                <div
                  onClick={() => setInterestType("flat")}
                  style={{
                    padding: "14px 16px",
                    borderRadius: "10px",
                    border: interestType === "flat" ? "1.5px solid var(--color-accent)" : "1px solid var(--color-border)",
                    background: interestType === "flat" ? "var(--color-accent-soft)" : "var(--color-surface)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 13.5, color: interestType === "flat" ? "var(--color-accent)" : "var(--color-text)" }}>
                    <Percent size={16} />
                    <span>{isKm ? "ការប្រាក់ថេរ (Flat Rate Method)" : "Flat Rate Method"}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4, lineHeight: 1.4 }}>
                    {isKm
                      ? "ការប្រាក់ត្រូវបានគណនាថេរលើប្រាក់ដើមដើមគ្រាពេញមួយរយៈពេលកម្ចី"
                      : "Fixed interest calculated on initial loan principal throughout duration"}
                  </div>
                </div>
              </div>
            </div>

            {/* Grace Period & Late Fee */}
            <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
              <div>
                <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: "var(--color-text)" }}>
                  {isKm ? "រយៈពេលអនុគ្រោះការសងយឺត (Grace Period Days)" : "Delinquency Grace Period"}
                </h3>
                <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--color-text-muted)" }}>
                  {isKm ? "ចំនួនថ្ងៃអនុគ្រោះមុនពេលប្រព័ន្ធចាប់ផ្តើមគិតប្រាក់ពិន័យ" : "Grace days before the system starts charging late penalty fees"}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={gracePeriod}
                    onChange={(e) => setGracePeriod(e.target.value)}
                    className="input"
                    style={{ width: 100, fontSize: 15, fontWeight: 700 }}
                  />
                  <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>{isKm ? "ថ្ងៃ (Days)" : "days"}</span>
                </div>
              </div>

              <div>
                <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: "var(--color-text)" }}>
                  {isKm ? "អត្រាប្រាក់ពិន័យយឺតយ៉ាវ (Late Penalty Fee)" : "Monthly Late Penalty Fee"}
                </h3>
                <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--color-text-muted)" }}>
                  {isKm ? "ភាគរយពិន័យប្រចាំខែលើចំនួនទឹកប្រាក់ដែលយឺត" : "Monthly penalty surcharge on overdue installment balance"}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="50"
                    value={lateFee}
                    onChange={(e) => setLateFee(e.target.value)}
                    className="input"
                    style={{ width: 100, fontSize: 15, fontWeight: 700 }}
                  />
                  <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>{isKm ? "% ក្នុងមួយខែ" : "% / month"}</span>
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
            className="card"
            style={{
              padding: 24,
            }}
          >
            <h3 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 700, color: "var(--color-text)" }}>
              {isKm ? "ព័ត៌មានលម្អិតម៉ាស៊ីនបម្រើ & សុវត្ថិភាពទិន្នន័យ (Core Infrastructure)" : "Core Infrastructure & Security Audit"}
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
              <div
                style={{
                  padding: "16px 18px",
                  borderRadius: "10px",
                  background: "var(--color-surface-sunken)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 600 }}>
                  {isKm ? "កំណែប្រព័ន្ធស្នូល (API Engine)" : "Core API Engine"}
                </div>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--color-text)", marginTop: 4 }}>
                  Smart Loan Core v2.4.0 (FastAPI / Python 3.12)
                </div>
              </div>

              <div
                style={{
                  padding: "16px 18px",
                  borderRadius: "10px",
                  background: "var(--color-surface-sunken)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 600 }}>
                  {isKm ? "មូលដ្ឋានទិន្នន័យ (PostgreSQL Cluster)" : "Database Cluster"}
                </div>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--color-text)", marginTop: 4 }}>
                  PostgreSQL 16 (Connection Pool Active)
                </div>
              </div>

              <div
                style={{
                  padding: "16px 18px",
                  borderRadius: "10px",
                  background: "var(--color-surface-sunken)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 600 }}>
                  {isKm ? "បរិស្ថានដំណើរការ (Environment)" : "Operating Environment"}
                </div>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--color-accent)", marginTop: 4 }}>
                  Production Ready / Docker Containerized
                </div>
              </div>

              <div
                style={{
                  padding: "16px 18px",
                  borderRadius: "10px",
                  background: "var(--color-surface-sunken)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 600 }}>
                  {isKm ? "ស្តង់ដាររក្សាទុកទិន្នន័យសវនកម្ម" : "Data Retention Policy"}
                </div>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--color-text)", marginTop: 4 }}>
                  {isKm ? "១០ ឆ្នាំ (អនុលោមភាពបទប្បញ្ញត្តិ NBC)" : "10 Years (NBC Prudential Standard)"}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
