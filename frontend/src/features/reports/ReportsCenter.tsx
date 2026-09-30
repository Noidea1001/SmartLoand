import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  ShieldAlert,
  ShieldCheck,
  Download,
  Printer,
  FileSpreadsheet,
  AlertTriangle,
  Layers,
  DollarSign,
  TrendingUp,
  RefreshCw,
  ExternalLink,
  Building,
  CheckCircle2,
} from "lucide-react";
import { getNbcComplianceReport, type NbcComplianceResponse, type NbcTier } from "../../api/reports";
import { formatCurrency } from "../../utils/format";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useToast } from "../../context/ToastContext";
import { useBranding } from "../../context/BrandingContext";

export default function ReportsCenter() {
  const { t, i18n } = useTranslation();
  const isKm = i18n.language === "km";
  useDocumentTitle(isKm ? "របាយការណ៍ហិរញ្ញវត្ថុ & អនុលោមភាពធនាគារជាតិ" : "Financial Reports & NBC Compliance");
  const toast = useToast();
  const { companyName, baseCurrency } = useBranding();

  const [currency, setCurrency] = useState<"USD" | "KHR">(baseCurrency || "USD");
  const [data, setData] = useState<NbcComplianceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"nbc" | "loans">("nbc");

  useEffect(() => {
    if (baseCurrency) {
      setCurrency(baseCurrency);
    }
  }, [baseCurrency]);


  function loadReport() {
    setLoading(true);
    getNbcComplianceReport(currency)
      .then(setData)
      .catch((err) => {
        console.error("Failed to load NBC compliance report:", err);
        toast.error(isKm ? "បរាជ័យក្នុងការទាញយករបាយការណ៍ NBC" : "Failed to load NBC compliance report.");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadReport();
  }, [currency]);

  // Export NBC Regulatory Schedule to CSV
  function handleExportCsv() {
    if (!data) return;
    const headers = isKm
      ? ["ចំណាត់ថ្នាក់ NBC", "គម្លាតថ្ងៃហួសកំណត់", "ចំនួនកម្ចី", "សមតុល្យសរុប", "រូបិយប័ណ្ណ", "អត្រាកក់ទុក (%)", "ប្រាក់បម្រុងត្រូវកក់ទុក"]
      : ["NBC Regulatory Tier", "Days Overdue Range", "Loan Count", "Gross Balance", "Currency", "Provision Rate (%)", "Provision Amount"];

    const rows = data.tiers.map((t) => [
      `"${isKm ? t.name_km : t.name_en}"`,
      `"${t.days_range}"`,
      t.count,
      t.gross_balance,
      data.currency,
      `${t.provision_rate}%`,
      t.provision_amount,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `nbc-compliance-report-${currency}-${data.as_of_date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(isKm ? "បាននាំចេញរបាយការណ៍ NBC ជា CSV ដោយជោគជ័យ។" : "NBC regulatory report exported to CSV.");
  }

  const filteredLoans = useMemo(() => {
    if (!data) return [];
    if (selectedTier === "all") return data.loans;
    return data.loans.filter((l) => l.tier_key === selectedTier);
  }, [data, selectedTier]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header Banner */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1>{isKm ? "មជ្ឈមណ្ឌលរបាយការណ៍ហិរញ្ញវត្ថុ & អនុលោមភាព NBC" : "Financial Reports & NBC Compliance Center"}</h1>
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                padding: "3px 8px",
                borderRadius: 4,
                background: "rgba(16, 185, 129, 0.12)",
                color: "#10b981",
                border: "1px solid rgba(16, 185, 129, 0.3)",
              }}
            >
              {isKm ? "អនុលោមតាមប្រកាសធនាគារជាតិនៃកម្ពុជា" : "NBC PRAKAS COMPLIANT"}
            </span>
          </div>
          <div className="page-subtitle">
            {isKm
              ? "ការចាត់ថ្នាក់គុណភាពឥណទាន និងការកក់ប្រាក់បម្រុងតាមបទប្បញ្ញត្តិនៃធនាគារជាតិនៃកម្ពុជា"
              : "Prudential loan asset classification & regulatory impairment provisioning standards"}
          </div>
        </div>

        <div className="page-actions no-print">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={loadReport}
            title={isKm ? "ផ្ទុកទិន្នន័យឡើងវិញ" : "Refresh data"}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>{isKm ? "ផ្ទុកឡើងវិញ" : "Refresh"}</span>
          </button>

          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleExportCsv}
            disabled={!data || loading}
            title={isKm ? "នាំចេញជារបាយការណ៍ CSV" : "Export regulatory report as CSV"}
          >
            <Download size={14} />
            <span>{isKm ? "នាំចេញ CSV" : "Export CSV"}</span>
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => window.print()}
            title={isKm ? "បោះពុម្ពរបាយការណ៍ផ្លូវការ" : "Print Official Regulatory Report"}
          >
            <Printer size={14} />
            <span>{isKm ? "បោះពុម្ពរបាយការណ៍" : "Print Report"}</span>
          </button>

          {/* Currency Toggle */}
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as "USD" | "KHR")}
            style={{ width: "auto", padding: "6px 14px", fontSize: 13, fontWeight: 700 }}
          >
            <option value="USD">{isKm ? "ដុល្លារ ($)" : "USD ($)"}</option>
            <option value="KHR">{isKm ? "រៀល (៛)" : "KHR (៛)"}</option>
          </select>
        </div>
      </div>

      {/* Official Print Header */}
      <div
        className="print-only"
        style={{
          display: "none",
          borderBottom: "2px solid #000000",
          paddingBottom: 14,
          marginBottom: 20,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 800, textTransform: "uppercase" }}>
            {companyName || "SMART LOAN PLATFORM (CAMBODIA) PLC"}
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>
            {isKm
              ? "របាយការណ៍ចំណាត់ថ្នាក់គុណភាពឥណទាន និងការកក់ប្រាក់បម្រុងតាមបទប្បញ្ញត្តិធនាគារជាតិ (NBC)"
              : "NBC PRUDENTIAL ASSET CLASSIFICATION & PROVISIONING SCHEDULE"}
          </div>
          <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>
            {isKm ? "កាលបរិច្ឆេទគិតត្រឹម៖ " : "As of Date: "} {data?.as_of_date || new Date().toISOString().slice(0, 10)} | {isKm ? "រូបិយប័ណ្ណ៖ " : "Reporting Currency: "} {currency}
          </div>
        </div>
      </div>

      {/* Executive Summary Stats Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
        }}
      >
        {/* Total Active Portfolio */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                {isKm ? "ផលប័ត្រកម្ចីសរុប" : "Total Gross Portfolio"}
              </div>
              <div className="num" style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text)", marginTop: 4 }}>
                {formatCurrency(data?.summary.total_gross_balance || 0, currency)}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginTop: 2 }}>
                {data?.summary.total_active_loans || 0} {isKm ? "កិច្ចសន្យាកំពុងសកម្ម" : "active loan deeds"}
              </div>
            </div>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "var(--radius-md)",
                background: "rgba(14, 165, 233, 0.12)",
                color: "#0ea5e9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <DollarSign size={20} />
            </div>
          </div>
        </div>

        {/* Regulatory Provision Required */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                {isKm ? "ប្រាក់បម្រុងតាមបទប្បញ្ញត្តិ" : "Regulatory Reserve Required"}
              </div>
              <div className="num" style={{ fontSize: 22, fontWeight: 800, color: "var(--color-warning, #f59e0b)", marginTop: 4 }}>
                {formatCurrency(data?.summary.total_required_provision || 0, currency)}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginTop: 2 }}>
                {isKm ? "ទំហំកក់ទុកសរុបក្នុងតារាងតុល្យការ" : "General & Specific NBC reserves"}
              </div>
            </div>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "var(--radius-md)",
                background: "rgba(245, 158, 11, 0.12)",
                color: "#f59e0b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ShieldCheck size={20} />
            </div>
          </div>
        </div>

        {/* NPL Ratio */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                {isKm ? "អត្រាហានិភ័យឥណទានមិនដំណើរការ" : "Non-Performing Loans (NPL)"}
              </div>
              <div
                className="num"
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: (data?.summary.npl_ratio_percent || 0) > 5 ? "var(--color-danger)" : "#10b981",
                  marginTop: 4,
                }}
              >
                {data?.summary.npl_ratio_percent || 0}%
              </div>
              <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginTop: 2 }}>
                {formatCurrency(data?.summary.npl_portfolio_amount || 0, currency)} {isKm ? "ហានិភ័យ >៩០ថ្ងៃ" : "at risk (>90 days)"}
              </div>
            </div>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "var(--radius-md)",
                background: (data?.summary.npl_ratio_percent || 0) > 5 ? "rgba(239, 68, 68, 0.12)" : "rgba(16, 185, 129, 0.12)",
                color: (data?.summary.npl_ratio_percent || 0) > 5 ? "var(--color-danger)" : "#10b981",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ShieldAlert size={20} />
            </div>
          </div>
        </div>

        {/* Exchange Rate Status */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                {isKm ? "អត្រាប្តូរប្រាក់ផ្លូវការ" : "Official Reference Rate"}
              </div>
              <div className="num" style={{ fontSize: 22, fontWeight: 800, color: "var(--color-accent)", marginTop: 4 }}>
                1 USD = {data?.exchange_rate?.toLocaleString() || 4100} ៛
              </div>
              <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginTop: 2 }}>
                {isKm ? "អនុវត្តក្នុងរបាយការណ៍បម្លែង" : "Tenant configured NBC parity"}
              </div>
            </div>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "var(--radius-md)",
                background: "rgba(99, 102, 241, 0.12)",
                color: "var(--color-accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Building size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation View Tabs */}
      <div className="no-print" style={{ display: "flex", gap: 8, borderBottom: "1px solid var(--color-border)", paddingBottom: 10 }}>
        <button
          type="button"
          onClick={() => setActiveTab("nbc")}
          className={`filter-tab${activeTab === "nbc" ? " active" : ""}`}
          style={{ padding: "8px 16px", fontSize: 13, fontWeight: 700 }}
        >
          {isKm ? "តារាងចំណាត់ថ្នាក់ធនាគារជាតិ NBC" : "NBC Regulatory Classification Schedule"}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("loans")}
          className={`filter-tab${activeTab === "loans" ? " active" : ""}`}
          style={{ padding: "8px 16px", fontSize: 13, fontWeight: 700 }}
        >
          {isKm ? "បញ្ជីកម្ចីលម្អិតតាមកម្រិតហានិភ័យ" : "Individual Loan Risk Details"} ({data?.loans.length || 0})
        </button>
      </div>

      {/* View 1: NBC Regulatory Schedule Table */}
      {activeTab === "nbc" && (
        <div className="card" style={{ padding: 22 }}>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>
              {isKm ? "តារាងចំណាត់ថ្នាក់ឥណទាន និងការកក់ប្រាក់បម្រុង" : "Prudential Loan Classification & Impairment Schedule"}
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--color-text-muted)" }}>
              {isKm
                ? "អនុលោមតាមបទប្បញ្ញត្តិរបស់ធនាគារជាតិនៃកម្ពុជាស្តីពីការបែងចែកកម្រិតហានិភ័យ និងការកក់ទុកប្រាក់បម្រុងទូទៅ និងជាក់លាក់។"
                : "Regulatory provision breakdown required by the National Bank of Cambodia across 5 delinquency tiers."}
            </p>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>{isKm ? "ចំណាត់ថ្នាក់គុណភាពឥណទាន" : "Classification Tier"}</th>
                  <th>{isKm ? "គម្លាតថ្ងៃហួសកំណត់" : "Delinquency Days"}</th>
                  <th style={{ textAlign: "center" }}>{isKm ? "ចំនួនកម្ចី" : "Loans Count"}</th>
                  <th style={{ textAlign: "right" }}>{isKm ? "សមតុល្យសរុប" : "Gross Balance"}</th>
                  <th style={{ textAlign: "center" }}>{isKm ? "% នៃផលប័ត្រ" : "% of Portfolio"}</th>
                  <th style={{ textAlign: "center" }}>{isKm ? "អត្រាកក់ទុក" : "Req. Rate"}</th>
                  <th style={{ textAlign: "right" }}>{isKm ? "ប្រាក់បម្រុងត្រូវកក់ទុក" : "Reserve Provision"}</th>
                </tr>
              </thead>
              <tbody>
                {data?.tiers.map((tier) => {
                  const sharePct =
                    (data.summary.total_gross_balance > 0
                      ? (tier.gross_balance / data.summary.total_gross_balance) * 100
                      : 0
                    ).toFixed(1);

                  return (
                    <tr key={tier.tier_id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              background: tier.color,
                              flexShrink: 0,
                            }}
                          />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13.5 }}>
                              {isKm ? tier.name_km : tier.name_en}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                              {tier.provision_rate <= 3 ? (isKm ? "ប្រាក់បម្រុងទូទៅ" : "General Provision") : (isKm ? "ប្រាក់បម្រុងជាក់លាក់" : "Specific Impairment")}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: 12.5, fontWeight: 600 }}>
                        {isKm ? (tier.days_range_km || tier.days_range) : (tier.days_range_en || tier.days_range)}
                      </td>
                      <td style={{ textAlign: "center" }} className="num">
                        <span
                          style={{
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: 6,
                            background: "var(--color-surface-sunken)",
                          }}
                        >
                          {tier.count}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }} className="num">
                        <strong style={{ fontSize: 14 }}>
                          {formatCurrency(tier.gross_balance, currency)}
                        </strong>
                      </td>
                      <td style={{ textAlign: "center" }} className="num">
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{sharePct}%</span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span
                          style={{
                            fontSize: 11.5,
                            fontWeight: 800,
                            padding: "2px 8px",
                            borderRadius: 4,
                            background: tier.color + "18",
                            color: tier.color,
                            border: `1px solid ${tier.color}35`,
                          }}
                        >
                          {tier.provision_rate}%
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }} className="num">
                        <span style={{ fontSize: 14, fontWeight: 800, color: tier.provision_amount > 0 ? "var(--color-danger)" : "var(--color-text)" }}>
                          {formatCurrency(tier.provision_amount, currency)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: "var(--color-surface-sunken)", fontWeight: 800 }}>
                  <td colSpan={2} style={{ fontSize: 13.5 }}>
                    {isKm ? "សរុបទាំង ៥ ចំណាត់ថ្នាក់ផលប័ត្រ" : "Total Across All 5 Tiers"}
                  </td>
                  <td style={{ textAlign: "center" }} className="num">
                    {data?.summary.total_active_loans || 0}
                  </td>
                  <td className="num" style={{ textAlign: "right", fontSize: 15, color: "var(--color-accent)" }}>
                    {formatCurrency(data?.summary.total_gross_balance || 0, currency)}
                  </td>
                  <td style={{ textAlign: "center" }} className="num">
                    100.0%
                  </td>
                  <td style={{ textAlign: "center" }}>—</td>
                  <td className="num" style={{ textAlign: "right", fontSize: 15, color: "var(--color-warning)" }}>
                    {formatCurrency(data?.summary.total_required_provision || 0, currency)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* View 2: Detailed Individual Loan Records */}
      {activeTab === "loans" && (
        <div className="card" style={{ padding: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>
                {isKm ? "បញ្ជីកម្ចី និងចំណាត់ថ្នាក់ហានិភ័យបុគ្គល" : "Loan-by-Loan Regulatory Classification Detail"}
              </h3>
              <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--color-text-muted)" }}>
                {isKm ? "បង្ហាញទិន្នន័យជាក់លាក់នៃកម្ចីនីមួយៗ ថ្ងៃយឺតយ៉ាវ និងប្រាក់បម្រុងដែលត្រូវកក់" : "Individual loan exposure and specific regulatory provisioning calculation"}
              </p>
            </div>

            {/* Filter by Tier */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setSelectedTier("all")}
                className={`filter-tab${selectedTier === "all" ? " active" : ""}`}
                style={{ fontSize: 12, padding: "5px 10px" }}
              >
                {isKm ? "ទាំងអស់" : "All"} ({data?.loans.length || 0})
              </button>
              {data?.tiers.map((t) => (
                <button
                  key={t.tier_id}
                  type="button"
                  onClick={() => setSelectedTier(t.tier_id)}
                  className={`filter-tab${selectedTier === t.tier_id ? " active" : ""}`}
                  style={{ fontSize: 12, padding: "5px 10px" }}
                >
                  {isKm ? t.name_km.split(" ")[0] : t.name_en.split(" ")[0]} ({t.count})
                </button>
              ))}
            </div>
          </div>

          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>{isKm ? "កម្ចី / លេខសម្គាល់" : "Loan ID"}</th>
                  <th>{isKm ? "ឈ្មោះអតិថិជន" : "Client Name"}</th>
                  <th>{isKm ? "ចំណាត់ថ្នាក់ NBC" : "NBC Tier"}</th>
                  <th style={{ textAlign: "center" }}>{isKm ? "ថ្ងៃហួសកំណត់" : "Overdue Days"}</th>
                  <th style={{ textAlign: "right" }}>{isKm ? "សមតុល្យ" : "Balance"} ({currency})</th>
                  <th style={{ textAlign: "right" }}>{isKm ? "ប្រាក់បម្រុងត្រូវកក់" : "Provision"}</th>
                  <th className="no-print" style={{ textAlign: "center" }}>{isKm ? "សកម្មភាព" : "Action"}</th>
                </tr>
              </thead>
              <tbody>
                {filteredLoans.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: 32, color: "var(--color-text-muted)" }}>
                      {isKm ? "មិនមានកម្ចីក្នុងចំណាត់ថ្នាក់នេះទេ" : "No loans found in this category."}
                    </td>
                  </tr>
                ) : (
                  filteredLoans.map((loan) => (
                    <tr key={loan.loan_id}>
                      <td className="num" style={{ fontWeight: 700, fontSize: 13 }}>
                        <Link to={`/loans/${loan.loan_id}`} style={{ color: "var(--color-accent)", textDecoration: "none" }}>
                          #{loan.loan_id.slice(0, 8).toUpperCase()}
                        </Link>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: 13.5 }}>{loan.client_name}</div>
                        {loan.client_phone && (
                          <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{loan.client_phone}</div>
                        )}
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: 11.5,
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: 4,
                            background:
                              loan.tier_key === "normal"
                                ? "rgba(16, 185, 129, 0.12)"
                                : loan.tier_key === "special_mention"
                                ? "rgba(245, 158, 11, 0.12)"
                                : "rgba(239, 68, 68, 0.12)",
                            color:
                              loan.tier_key === "normal"
                                ? "#10b981"
                                : loan.tier_key === "special_mention"
                                ? "#f59e0b"
                                : "#ef4444",
                          }}
                        >
                          {isKm ? loan.tier_name_km : loan.tier_name_en}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }} className="num">
                        <span style={{ fontWeight: 700, color: loan.days_overdue > 0 ? "var(--color-danger)" : "var(--color-text)" }}>
                          {loan.days_overdue} {isKm ? "ថ្ងៃ" : "days"}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }} className="num">
                        {formatCurrency(loan.converted_balance, currency)}
                      </td>
                      <td className="num" style={{ textAlign: "right", fontWeight: 800, color: loan.provision_amount > 0 ? "var(--color-danger)" : "var(--color-text)" }}>
                        {formatCurrency(loan.provision_amount, currency)}
                      </td>
                      <td className="no-print" style={{ textAlign: "center" }}>
                        <Link
                          to={`/loans/${loan.loan_id}`}
                          className="btn btn-ghost btn-xs"
                          style={{ borderRadius: 6, display: "inline-flex", alignItems: "center", gap: 4 }}
                        >
                          <span>{isKm ? "ពិនិត្យ" : "View"}</span>
                          <ExternalLink size={12} />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Regulatory Official Sign-Off Strip (Visible in Print) */}
      <div
        className="print-only"
        style={{
          display: "none",
          marginTop: 40,
          borderTop: "1px solid #ccc",
          paddingTop: 20,
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 30, textAlign: "center" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700 }}>{isKm ? "រៀបចំដោយ" : "Prepared by"}</div>
            <div style={{ height: 60 }} />
            <div style={{ borderTop: "1px dashed #666", paddingTop: 4, fontSize: 11 }}>
              {isKm ? "មន្ត្រីគ្រប់គ្រងហានិភ័យ" : "Credit Risk Officer"}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700 }}>{isKm ? "ត្រួតពិនិត្យដោយ" : "Verified by"}</div>
            <div style={{ height: 60 }} />
            <div style={{ borderTop: "1px dashed #666", paddingTop: 4, fontSize: 11 }}>
              {isKm ? "ប្រធាននាយកដ្ឋានហិរញ្ញវត្ថុ" : "Chief Financial Officer"}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700 }}>{isKm ? "អនុម័តដោយ" : "Approved by"}</div>
            <div style={{ height: 60 }} />
            <div style={{ borderTop: "1px dashed #666", paddingTop: 4, fontSize: 11 }}>
              {isKm ? "អគ្គនាយកប្រតិបត្តិ" : "Chief Executive Officer"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
