import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Users,
  AlertTriangle,
  Phone,
  CreditCard,
  Search,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Layers,
  HeartHandshake,
  DollarSign,
} from "lucide-react";
import {
  getGuarantorRegistry,
  type GuarantorsRegistryResponse,
  type GuarantorItem,
} from "../../api/reports";
import { formatCurrency, formatDate, convertCurrencyAmount } from "../../utils/format";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useToast } from "../../context/ToastContext";
import { useBranding } from "../../context/BrandingContext";

export default function GuarantorRegistry() {
  useDocumentTitle("Guarantor Risk Registry");
  const { t, i18n } = useTranslation();
  const isKm = i18n.language === "km";
  const toast = useToast();
  const { baseCurrency, usdToKhrRate } = useBranding();

  const [data, setData] = useState<GuarantorsRegistryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "cross_only" | "high_risk">("all");
  const [expandedName, setExpandedName] = useState<string | null>(null);

  function loadGuarantors() {
    setLoading(true);
    getGuarantorRegistry()
      .then(setData)
      .catch((err) => {
        console.error("Failed to load guarantor registry:", err);
        toast.error(isKm ? "បរាជ័យក្នុងការទាញយកបញ្ជីអ្នកធានា" : "Failed to load guarantor registry.");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadGuarantors();
  }, []);

  // Filtered list
  const filteredGuarantors = useMemo(() => {
    if (!data?.guarantors) return [];

    return data.guarantors.filter((g) => {
      if (filterTab === "cross_only" && !g.is_cross_guarantee) return false;
      if (filterTab === "high_risk" && g.risk_level !== "high") return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const nameMatch = g.guarantor_name.toLowerCase().includes(q);
        const phoneMatch = g.phone.toLowerCase().includes(q);
        const idMatch = g.national_id?.toLowerCase().includes(q);
        if (!nameMatch && !phoneMatch && !idMatch) return false;
      }
      return true;
    });
  }, [data, filterTab, search]);

  // Overall Totals
  const totalExposureUsd = useMemo(() => {
    if (!data?.guarantors) return 0;
    return data.guarantors.reduce((sum, g) => sum + g.total_exposure_usd, 0);
  }, [data]);

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 10 }}>
            <HeartHandshake size={26} color="#8b5cf6" />
            {isKm ? "បញ្ជីអ្នកធានា & វិភាគហានិភ័យធានាជាន់គ្នា" : "Guarantor Risk Registry & Cross-Exposure Matrix"}
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-muted)" }}>
            {isKm
              ? "គ្រប់គ្រងបញ្ជីអ្នកធានាឥណទាន តាមដានបុគ្គលធានាច្រើនកម្ចីក្នុងពេលតែមួយ និងវិភាគហានិភ័យសងបំណុលជំនួស"
              : "Central directory of loan guarantors, detect multiple-loan cross guarantees, and monitor default liabilities"}
          </p>
        </div>

        <div className="page-actions" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            className="btn btn-sm"
            onClick={loadGuarantors}
            disabled={loading}
            style={{ borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            {isKm ? "ផ្ទុកឡើងវិញ" : "Refresh"}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* Total Guarantors */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                {isKm ? "អ្នកធានាសរុបក្នុងប្រព័ន្ធ" : "Total Guarantors"}
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>
                {data?.summary.total_guarantors || 0}
              </div>
            </div>
            <div style={{ width: 38, height: 38, borderRadius: 8, background: "#f5f3ff", color: "#8b5cf6", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Users size={20} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 6 }}>
            {isKm ? "ទំហំកាតព្វកិច្ចធានាសរុប៖ " : "Total Guaranteed: "}
            <span style={{ fontWeight: 700, color: "var(--color-text-primary)" }}>
              {formatCurrency(
                convertCurrencyAmount(totalExposureUsd, "USD", baseCurrency, usdToKhrRate),
                baseCurrency
              )}
            </span>
          </div>
        </div>

        {/* Cross-Guarantors */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#b45309", textTransform: "uppercase" }}>
                {isKm ? "ធានាលើសពី ១ កម្ចី" : "Cross-Guarantors (2+ Loans)"}
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: "#d97706" }}>
                {data?.summary.cross_guarantors_count || 0}
              </div>
            </div>
            <div style={{ width: 38, height: 38, borderRadius: 8, background: "#fffbeb", color: "#d97706", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Layers size={20} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 6 }}>
            {isKm ? "បុគ្គលដែលឈរឈ្មោះធានាច្រើនកម្ចី" : "Individuals guaranteeing multiple active loans"}
          </div>
        </div>

        {/* High Risk */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#ef4444", textTransform: "uppercase" }}>
                {isKm ? "ហានិភ័យខ្ពស់" : "High Risk Guarantors"}
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: "#ef4444" }}>
                {data?.summary.high_risk_guarantors_count || 0}
              </div>
            </div>
            <div style={{ width: 38, height: 38, borderRadius: 8, background: "#fef2f2", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ShieldAlert size={20} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: "#b91c1c", marginTop: 6 }}>
            {isKm ? "មានកម្ចីធានាហួសកាលកំណត់ ឬទំហំធំ" : "Guaranteed loans have delinquency flags"}
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="card" style={{ padding: 16, marginBottom: 20 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button
              type="button"
              className={`btn btn-sm ${filterTab === "all" ? "btn-primary" : ""}`}
              onClick={() => setFilterTab("all")}
              style={{ borderRadius: 8 }}
            >
              {isKm ? "ទាំងអស់" : "All"} ({data?.guarantors?.length || 0})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${filterTab === "cross_only" ? "btn-primary" : ""}`}
              onClick={() => setFilterTab("cross_only")}
              style={{
                borderRadius: 8,
                backgroundColor: filterTab === "cross_only" ? "#f59e0b" : undefined,
                color: filterTab === "cross_only" ? "#fff" : undefined,
                borderColor: filterTab === "cross_only" ? "#f59e0b" : undefined,
              }}
            >
              <Layers size={13} style={{ marginRight: 4 }} />
              {isKm ? "ធានាជាន់គ្នា (២+ កម្ចី)" : "Cross-Guarantors"} ({data?.summary.cross_guarantors_count || 0})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${filterTab === "high_risk" ? "btn-primary" : ""}`}
              onClick={() => setFilterTab("high_risk")}
              style={{
                borderRadius: 8,
                backgroundColor: filterTab === "high_risk" ? "#ef4444" : undefined,
                color: filterTab === "high_risk" ? "#fff" : undefined,
                borderColor: filterTab === "high_risk" ? "#ef4444" : undefined,
              }}
            >
              <ShieldAlert size={13} style={{ marginRight: 4 }} />
              {isKm ? "ហានិភ័យខ្ពស់" : "High Risk"} ({data?.summary.high_risk_guarantors_count || 0})
            </button>
          </div>

          {/* Search Box */}
          <div style={{ position: "relative", minWidth: 260, flex: 1, maxWidth: 360 }}>
            <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)" }} />
            <input
              type="text"
              className="input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isKm ? "ស្វែងរកឈ្មោះអ្នកធានា លេខទូរស័ព្ទ..." : "Search guarantor name, phone..."}
              style={{ paddingLeft: 32, fontSize: 13, width: "100%", borderRadius: 8 }}
            />
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <HeartHandshake size={18} color="#8b5cf6" />
            {isKm ? "បញ្ជីរាយនាមអ្នកធានា និងកម្ចីពាក់ព័ន្ធ" : "Guarantor Roster & Exposure Breakdown"}
          </h2>
          <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
            {isKm ? "បង្ហាញ " : "Showing "}{filteredGuarantors.length} {isKm ? "នាក់" : "records"}
          </span>
        </div>

        <div className="table-container" style={{ margin: 0 }}>
          <table className="table" style={{ width: "100%", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ padding: "12px 16px" }}>{isKm ? "ឈ្មោះអ្នកធានា" : "Guarantor Name"}</th>
                <th style={{ padding: "12px 16px" }}>{isKm ? "ទំនាក់ទំនង" : "Phone & Contact"}</th>
                <th style={{ padding: "12px 16px", textAlign: "center" }}>{isKm ? "ស្ថានភាពធានា" : "Guarantee Exposure"}</th>
                <th style={{ padding: "12px 16px", textAlign: "right" }}>{isKm ? "ទំហំប្រាក់ធានាសរុប" : "Total Liability"}</th>
                <th style={{ padding: "12px 16px", textAlign: "center" }}>{isKm ? "កម្រិតហានិភ័យ" : "Risk Level"}</th>
                <th style={{ padding: "12px 16px", textAlign: "center" }}>{isKm ? "សកម្មភាព" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 40, color: "var(--color-text-muted)" }}>
                    <div className="skeleton skeleton-text" style={{ maxWidth: 280, margin: "0 auto" }}></div>
                  </td>
                </tr>
              ) : filteredGuarantors.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 50, color: "var(--color-text-muted)" }}>
                    <UserCheck size={36} color="#8b5cf6" style={{ margin: "0 auto 10px", display: "block" }} />
                    <div style={{ fontSize: 15, fontWeight: 600 }}>
                      {isKm ? "មិនមានអ្នកធានាដែលត្រូវនឹងលក្ខខណ្ឌស្វែងរកទេ" : "No guarantors found matching your search"}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredGuarantors.map((g) => {
                  const isExpanded = expandedName === g.guarantor_name;

                  return (
                    <>
                      <tr key={g.guarantor_name} style={{ borderBottom: "1px solid var(--color-border)" }}>
                        {/* Guarantor Name & ID */}
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{g.guarantor_name}</div>
                          <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>
                            {g.relationships.join(", ") || (isKm ? "អ្នកធានា" : "Guarantor")}
                          </div>
                        </td>

                        {/* Phone */}
                        <td style={{ padding: "14px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                            <Phone size={13} color="var(--color-text-muted)" />
                            <span>{g.phone}</span>
                          </div>
                        </td>

                        {/* Guarantee Exposure Status */}
                        <td style={{ padding: "14px 16px", textAlign: "center" }}>
                          {g.is_cross_guarantee ? (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                padding: "2px 8px",
                                borderRadius: 12,
                                fontSize: 11,
                                fontWeight: 700,
                                background: "#fffbeb",
                                color: "#b45309",
                                border: "1px solid #fde68a",
                              }}
                            >
                              <Layers size={11} />
                              {isKm ? `ធានា ${g.active_loans_count} កម្ចី` : `${g.active_loans_count} Active Loans`}
                            </span>
                          ) : (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                padding: "2px 8px",
                                borderRadius: 12,
                                fontSize: 11,
                                fontWeight: 600,
                                background: "#ecfdf5",
                                color: "#047857",
                              }}
                            >
                              <ShieldCheck size={11} />
                              {isKm ? "ធានា ១ កម្ចី" : "1 Loan"}
                            </span>
                          )}
                        </td>

                        {/* Total Exposure */}
                        <td style={{ padding: "14px 16px", textAlign: "right" }}>
                          {baseCurrency === "KHR" ? (
                            <>
                              <div style={{ fontWeight: 800, fontSize: 14 }}>
                                {formatCurrency(
                                  (g.total_exposure_khr || 0) +
                                    (g.total_exposure_usd > 0 ? convertCurrencyAmount(g.total_exposure_usd, "USD", "KHR", usdToKhrRate) : 0),
                                  "KHR"
                                )}
                              </div>
                              {g.total_exposure_usd > 0 && (
                                <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                                  {formatCurrency(g.total_exposure_usd, "USD")}
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              <div style={{ fontWeight: 800, fontSize: 14 }}>{formatCurrency(g.total_exposure_usd, "USD")}</div>
                              {g.total_exposure_khr > 0 && (
                                <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                                  {formatCurrency(g.total_exposure_khr, "KHR")}
                                </div>
                              )}
                            </>
                          )}
                        </td>

                        {/* Risk Level */}
                        <td style={{ padding: "14px 16px", textAlign: "center" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              padding: "3px 10px",
                              borderRadius: 12,
                              fontSize: 11,
                              fontWeight: 700,
                              background: g.risk_level === "high" ? "#fef2f2" : (g.risk_level === "medium" ? "#fffbeb" : "#ecfdf5"),
                              color: g.risk_level === "high" ? "#b91c1c" : (g.risk_level === "medium" ? "#b45309" : "#047857"),
                            }}
                          >
                            {g.risk_level === "high" ? <AlertTriangle size={12} /> : <ShieldCheck size={12} />}
                            <span>
                              {g.risk_level === "high"
                                ? (isKm ? "ហានិភ័យខ្ពស់" : "High Risk")
                                : (g.risk_level === "medium"
                                  ? (isKm ? "មធ្យម" : "Medium Risk")
                                  : (isKm ? "ធម្មតា" : "Normal"))}
                            </span>
                          </span>
                        </td>

                        {/* Actions (Expand) */}
                        <td style={{ padding: "14px 16px", textAlign: "center" }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost"
                            onClick={() => setExpandedName(isExpanded ? null : g.guarantor_name)}
                            style={{ borderRadius: 6, fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}
                          >
                            <span>{isKm ? "កម្ចីពាក់ព័ន្ធ" : "Loans"}</span>
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Row: Guaranteed Loans Details */}
                      {isExpanded && (
                        <tr style={{ background: "var(--color-bg-secondary)" }}>
                          <td colSpan={6} style={{ padding: "16px 24px" }}>
                            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                              {isKm ? `បញ្ជីកម្ចីដែល ${g.guarantor_name} បានឈរឈ្មោះធានា៖` : `Loans Guaranteed by ${g.guarantor_name}:`}
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
                              {g.guaranteed_loans.map((l) => (
                                <div
                                  key={l.loan_id}
                                  style={{
                                    background: "var(--color-bg-primary)",
                                    border: "1px solid var(--color-border)",
                                    borderRadius: 8,
                                    padding: 12,
                                  }}
                                >
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                    <div>
                                      <Link
                                        to={`/loans/${l.loan_id}`}
                                        style={{ fontWeight: 700, color: "#3b82f6", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 13 }}
                                      >
                                        #{l.loan_id.slice(0, 8).toUpperCase()}
                                        <ExternalLink size={12} />
                                      </Link>
                                      <div style={{ fontSize: 13, fontWeight: 600, marginTop: 4 }}>
                                        {isKm ? "អ្នកខ្ចី៖ " : "Borrower: "}{l.borrower_name}
                                      </div>
                                    </div>
                                    <span
                                      style={{
                                        fontSize: 11,
                                        fontWeight: 700,
                                        padding: "2px 8px",
                                        borderRadius: 10,
                                        background: l.status === "active" ? "#ecfdf5" : (l.status === "overdue" ? "#fef2f2" : "#f1f5f9"),
                                        color: l.status === "active" ? "#047857" : (l.status === "overdue" ? "#b91c1c" : "#475569"),
                                      }}
                                    >
                                      {l.status}
                                    </span>
                                  </div>
                                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12, color: "var(--color-text-muted)" }}>
                                    <span>{isKm ? "ទំនាក់ទំនង៖ " : "Relation: "}{l.relationship}</span>
                                    <span style={{ fontWeight: 700, color: "var(--color-text-primary)", textAlign: "right" }}>
                                      {formatCurrency(l.principal_amount, l.currency)}
                                      {l.currency !== baseCurrency && (
                                        <span style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--color-text-muted)" }}>
                                          ≈ {formatCurrency(convertCurrencyAmount(l.principal_amount, l.currency as any, baseCurrency, usdToKhrRate), baseCurrency)}
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
