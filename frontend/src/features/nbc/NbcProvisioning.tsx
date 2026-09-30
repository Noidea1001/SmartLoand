import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  ShieldAlert,
  ShieldCheck,
  Download,
  AlertTriangle,
  Layers,
  DollarSign,
  TrendingUp,
  RefreshCw,
  ExternalLink,
  Building,
  CheckCircle2,
  FileSpreadsheet,
  Filter,
} from "lucide-react";
import { getNbcComplianceReport, downloadNbcProvisioningCsv, type NbcComplianceResponse, type NbcTier } from "../../api/reports";
import { formatCurrency } from "../../utils/format";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useToast } from "../../context/ToastContext";
import { useBranding } from "../../context/BrandingContext";

export default function NbcProvisioning() {
  const { i18n } = useTranslation();
  const isKm = i18n.language === "km";
  useDocumentTitle(isKm ? "សំវិធានធនធនាគារជាតិ NBC" : "NBC Loan Loss Provisioning");
  const toast = useToast();
  const { companyName, baseCurrency } = useBranding();

  const [currency, setCurrency] = useState<"USD" | "KHR">(baseCurrency || "USD");
  const [data, setData] = useState<NbcComplianceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState<string>("all");
  const [search, setSearch] = useState("");

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
        toast.error(isKm ? "បរាជ័យក្នុងការទាញយករបាយការណ៍ NBC" : "Failed to load NBC provisioning report.");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadReport();
  }, [currency]);

  async function handleDownloadCsv() {
    try {
      const blob = await downloadNbcProvisioningCsv(currency);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `NBC_Provisioning_Schedule_${data?.as_of_date || "today"}_${currency}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(isKm ? "បានទាញយកឯកសាររបាយការណ៍ NBC ជោគជ័យ" : "NBC report downloaded successfully.");
    } catch {
      toast.error(isKm ? "បរាជ័យក្នុងការទាញយកឯកសារ" : "Failed to download NBC report.");
    }
  }

  const filteredLoans = useMemo(() => {
    if (!data) return [];
    return data.loans.filter((item) => {
      const matchesTier = selectedTier === "all" || item.tier_key === selectedTier;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        item.client_name.toLowerCase().includes(q) ||
        item.loan_id.toLowerCase().includes(q) ||
        (item.client_phone && item.client_phone.includes(q));
      return matchesTier && matchesSearch;
    });
  }, [data, selectedTier, search]);

  const generalProvision = useMemo(() => {
    if (!data) return 0;
    const normal = data.tiers.find((t) => t.tier_id === "normal");
    return normal ? normal.provision_amount : 0;
  }, [data]);

  const specificProvision = useMemo(() => {
    if (!data) return 0;
    return data.summary.total_required_provision - generalProvision;
  }, [data, generalProvision]);

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "var(--color-accent-soft)",
                color: "var(--color-accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Building size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "var(--color-text)" }}>
                {isKm ? "ការកំណត់សំវិធានធន និងអនុលោមភាពធនាគារជាតិនៃកម្ពុជា (NBC)" : "NBC Loan Loss Provisioning & Regulatory Matrix"}
              </h1>
              <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-muted)" }}>
                {isKm
                  ? "យោងតាមប្រកាសស្តីពីការធ្វើចំណាត់ថ្នាក់ឥណទាន និងការបង្កើតសំវិធានធនរបស់ធនាគារជាតិនៃកម្ពុជា"
                  : "National Bank of Cambodia (NBC) Prakas on Asset Classification & Impairment Provisioning"}
              </p>
            </div>
          </div>
        </div>

        {/* Currency Switcher & Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              display: "flex",
              background: "var(--color-surface-sunken)",
              borderRadius: 8,
              padding: 3,
              border: "1px solid var(--color-border)",
            }}
          >
            <button
              onClick={() => setCurrency("USD")}
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                fontSize: 12.5,
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                background: currency === "USD" ? "var(--color-accent)" : "transparent",
                color: currency === "USD" ? "#ffffff" : "var(--color-text-muted)",
              }}
            >
              USD ($)
            </button>
            <button
              onClick={() => setCurrency("KHR")}
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                fontSize: 12.5,
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                background: currency === "KHR" ? "var(--color-accent)" : "transparent",
                color: currency === "KHR" ? "#ffffff" : "var(--color-text-muted)",
              }}
            >
              KHR (៛)
            </button>
          </div>

          <button
            onClick={loadReport}
            className="btn btn-secondary"
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            <span>{isKm ? "ផ្ទុកឡើងវិញ" : "Refresh"}</span>
          </button>

          <button
            onClick={handleDownloadCsv}
            className="btn btn-primary"
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <Download size={15} />
            <span>{isKm ? "ទាញយករបាយការណ៍ CSV" : "Export NBC Return"}</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div className="card" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: "var(--color-text-muted)", fontWeight: 500 }}>
              {isKm ? "ផលប័ត្រកម្ចីសរុប (Gross Loans)" : "Total Loan Portfolio"}
            </span>
            <Layers size={18} style={{ color: "var(--color-accent)" }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "var(--color-text)" }}>
            {data ? formatCurrency(data.summary.total_gross_balance, currency) : "..."}
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>
            {data ? `${data.summary.total_active_loans} ${isKm ? "កម្ចីសកម្ម" : "active accounts"}` : ""}
          </div>
        </div>

        <div className="card" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: "var(--color-text-muted)", fontWeight: 500 }}>
              {isKm ? "សំវិធានធនសរុបត្រូវកក់ (Provision)" : "Total Required Provision"}
            </span>
            <ShieldAlert size={18} style={{ color: "var(--color-warning)" }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "var(--color-warning)" }}>
            {data ? formatCurrency(data.summary.total_required_provision, currency) : "..."}
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>
            {isKm ? `ទូទៅ: ${formatCurrency(generalProvision, currency)} | ជាក់លាក់: ${formatCurrency(specificProvision, currency)}` : `General: ${formatCurrency(generalProvision, currency)} | Specific: ${formatCurrency(specificProvision, currency)}`}
          </div>
        </div>

        <div className="card" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: "var(--color-text-muted)", fontWeight: 500 }}>
              {isKm ? "ឥណទានមិនដំណើរការ NPL (PAR 90+)" : "Non-Performing Loans (NPL)"}
            </span>
            <AlertTriangle size={18} style={{ color: "var(--color-danger)" }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "var(--color-danger)" }}>
            {data ? formatCurrency(data.summary.npl_portfolio_amount, currency) : "..."}
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>
            {isKm ? `អត្រា NPL: ${data?.summary.npl_ratio_percent || 0}% នៃផលប័ត្រ` : `NPL Ratio: ${data?.summary.npl_ratio_percent || 0}% of portfolio`}
          </div>
        </div>

        <div className="card" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: "var(--color-text-muted)", fontWeight: 500 }}>
              {isKm ? "អត្រាប្តូរប្រាក់យោង NBC" : "NBC Reference FX Rate"}
            </span>
            <DollarSign size={18} style={{ color: "var(--color-success)" }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "var(--color-text)" }}>
            {data ? `1 USD = ${data.exchange_rate.toLocaleString()} ៛` : "..."}
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>
            {isKm ? `គិតត្រឹមថ្ងៃ: ${data?.as_of_date || "..."}` : `As of: ${data?.as_of_date || "..."}`}
          </div>
        </div>
      </div>

      {/* NBC 5-Tier Regulatory Classification Schedule */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, color: "var(--color-text)" }}>
          {isKm ? "តារាងចំណាត់ថ្នាក់គុណភាពឥណទានទាំង ៥ ថ្នាក់ (NBC 5-Tier Asset Classification Schedule)" : "NBC 5-Tier Loan Classification Schedule"}
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          {data?.tiers.map((t) => {
            const isSelected = selectedTier === t.tier_id;
            return (
              <div
                key={t.tier_id}
                onClick={() => setSelectedTier(isSelected ? "all" : t.tier_id)}
                className="card"
                style={{
                  padding: "16px 18px",
                  cursor: "pointer",
                  borderLeft: `4px solid ${t.color}`,
                  background: isSelected ? "var(--color-accent-soft)" : "var(--color-surface)",
                  borderColor: isSelected ? "var(--color-accent)" : "var(--color-border)",
                  transition: "all 0.2s ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text)" }}>
                    {isKm ? t.name_km : t.name_en}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 12,
                      background: `${t.color}20`,
                      color: t.color,
                    }}
                  >
                    {t.provision_rate}% {t.tier_id === "normal" ? (isKm ? "ទូទៅ" : "Gen") : (isKm ? "ជាក់លាក់" : "Spec")}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 10 }}>
                  {isKm ? `គម្លាតយឺត: ${t.days_range}` : `Overdue: ${t.days_range}`}
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text)", marginBottom: 4 }}>
                  {formatCurrency(t.gross_balance, currency)}
                </div>
                <div style={{ fontSize: 12, color: t.color, fontWeight: 600 }}>
                  {isKm ? `សំវិធានធន: ${formatCurrency(t.provision_amount, currency)}` : `Provision: ${formatCurrency(t.provision_amount, currency)}`}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginTop: 6 }}>
                  {t.count} {isKm ? "កម្ចីក្នុងថ្នាក់នេះ" : "loans in tier"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter and Audit Table */}
      <div className="card" style={{ padding: "20px 24px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 260 }}>
            <input
              type="text"
              placeholder={isKm ? "ស្វែងរកតាមឈ្មោះកូនបំណុល លេខកូដកម្ចី ឬលេខទូរស័ព្ទ..." : "Search by borrower name, loan ID, phone..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input"
              style={{ width: "100%", maxWidth: 400 }}
            />
            {selectedTier !== "all" && (
              <button
                onClick={() => setSelectedTier("all")}
                className="btn btn-secondary"
                style={{ fontSize: 12, padding: "6px 12px", whiteSpace: "nowrap" }}
              >
                {isKm ? "បង្ហាញទាំងអស់" : "Clear Filter"}
              </button>
            )}
          </div>
          <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
            {isKm ? `បង្ហាញ ${filteredLoans.length} នៃ ${data?.loans.length || 0} គណនី` : `Showing ${filteredLoans.length} of ${data?.loans.length || 0} accounts`}
          </div>
        </div>

        {/* Loan Table */}
        <div style={{ overflowX: "auto" }}>
          <table className="table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>{isKm ? "លេខកូដកម្ចី" : "Loan ID"}</th>
                <th>{isKm ? "ឈ្មោះអតិថិជន / ទូរស័ព្ទ" : "Borrower / Phone"}</th>
                <th>{isKm ? "សមតុល្យដើម" : "Principal Balance"}</th>
                <th>{isKm ? "ចំនួនថ្ងៃហួសកំណត់" : "Days Overdue (DPD)"}</th>
                <th>{isKm ? "ចំណាត់ថ្នាក់ NBC" : "NBC Tier"}</th>
                <th>{isKm ? "អត្រាកក់ទុក" : "Provision Rate"}</th>
                <th>{isKm ? "ប្រាក់បម្រុងត្រូវកក់ទុក" : "Required Provision"}</th>
                <th style={{ textAlign: "right" }}>{isKm ? "សកម្មភាព" : "Action"}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "36px 0", color: "var(--color-text-muted)" }}>
                    <RefreshCw size={22} className="animate-spin" style={{ margin: "0 auto 8px" }} />
                    <div>{isKm ? "កំពុងទាញយកទិន្នន័យ NBC..." : "Loading NBC compliance data..."}</div>
                  </td>
                </tr>
              ) : filteredLoans.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "36px 0", color: "var(--color-text-muted)" }}>
                    {isKm ? "មិនមានកម្ចីនៅក្នុងលក្ខខណ្ឌនេះទេ" : "No loan records found matching criteria."}
                  </td>
                </tr>
              ) : (
                filteredLoans.map((loan) => (
                  <tr key={loan.loan_id}>
                    <td>
                      <Link
                        to={`/loans/${loan.loan_id}`}
                        style={{ color: "var(--color-accent)", fontWeight: 600, textDecoration: "none" }}
                      >
                        {loan.loan_id.slice(0, 8).toUpperCase()}
                      </Link>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: "var(--color-text)" }}>{loan.client_name}</div>
                      <div style={{ fontSize: 11.5, color: "var(--color-text-muted)" }}>
                        {loan.client_phone || "N/A"}
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {formatCurrency(loan.converted_balance, currency)}
                    </td>
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          color:
                            loan.days_overdue === 0
                              ? "var(--color-success)"
                              : loan.days_overdue < 90
                              ? "var(--color-warning)"
                              : "var(--color-danger)",
                        }}
                      >
                        {loan.days_overdue} {isKm ? "ថ្ងៃ" : "days"}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          padding: "3px 8px",
                          borderRadius: 6,
                          background:
                            loan.tier_key === "normal"
                              ? "rgba(16, 185, 129, 0.15)"
                              : loan.tier_key === "special_mention"
                              ? "rgba(245, 158, 11, 0.15)"
                              : "rgba(239, 68, 68, 0.15)",
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
                    <td>{loan.provision_rate}%</td>
                    <td style={{ fontWeight: 700, color: "var(--color-warning)" }}>
                      {formatCurrency(loan.provision_amount, currency)}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <Link
                        to={`/loans/${loan.loan_id}`}
                        className="btn btn-secondary"
                        style={{ fontSize: 12, padding: "4px 8px" }}
                      >
                        <ExternalLink size={13} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
