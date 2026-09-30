import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  FileSpreadsheet,
  Download,
  Search,
  RefreshCw,
  Building2,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  UserCheck,
  FileCheck,
  ExternalLink,
  Sparkles,
  X,
  Gauge,
} from "lucide-react";
import {
  getCbcExport,
  getCbcClientInquiry,
  type CbcExportResponse,
  type CbcRecordItem,
  type CbcInquiryResponse,
} from "../../api/reports";
import { formatCurrency, formatDate } from "../../utils/format";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useToast } from "../../context/ToastContext";

export default function CbcExportCenter() {
  useDocumentTitle("Credit Bureau Cambodia (CBC) Center");
  const { t, i18n } = useTranslation();
  const isKm = i18n.language === "km";
  const toast = useToast();

  const [data, setData] = useState<CbcExportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // CBC Inquiry Simulator Modal
  const [inquiryModalOpen, setInquiryModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<CbcRecordItem | null>(null);
  const [inquiryResult, setInquiryResult] = useState<CbcInquiryResponse | null>(null);
  const [inquiryLoading, setInquiryLoading] = useState(false);

  function loadCbc() {
    setLoading(true);
    getCbcExport()
      .then(setData)
      .catch((err) => {
        console.error("Failed to load CBC export:", err);
        toast.error(isKm ? "បរាជ័យក្នុងការទាញយកទិន្នន័យ CBC" : "Failed to load CBC export data.");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadCbc();
  }, []);

  // Filtered records
  const filteredRecords = useMemo(() => {
    if (!data?.records) return [];

    return data.records.filter((rec) => {
      if (statusFilter !== "all" && rec.cbc_status !== statusFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const refMatch = rec.cbc_account_ref.toLowerCase().includes(q);
        const kmMatch = rec.borrower_name_km.toLowerCase().includes(q);
        const enMatch = rec.borrower_name_en.toLowerCase().includes(q);
        const idMatch = rec.national_id.toLowerCase().includes(q);
        if (!refMatch && !kmMatch && !enMatch && !idMatch) return false;
      }
      return true;
    });
  }, [data, statusFilter, search]);

  // CBC Statistics
  const stats = useMemo(() => {
    if (!data?.records) return { total: 0, curr: 0, sma: 0, npl: 0 };
    let curr = 0;
    let sma = 0;
    let npl = 0;

    data.records.forEach((r) => {
      if (r.cbc_status === "CURR") curr++;
      else if (r.cbc_status === "SMA") sma++;
      else npl++;
    });

    return { total: data.records.length, curr, sma, npl };
  }, [data]);

  // Export CSV File formatted for CBC Cambodia
  function handleDownloadCsv() {
    if (!data?.records || data.records.length === 0) return;

    const headers = [
      "CBC_ACCOUNT_REF",
      "NATIONAL_ID",
      "BORROWER_NAME_KM",
      "BORROWER_NAME_EN",
      "DOB",
      "GENDER",
      "PHONE",
      "PURPOSE",
      "DISBURSED_AMOUNT",
      "CURRENCY",
      "TERM_MONTHS",
      "DAYS_PAST_DUE",
      "CBC_STATUS",
    ];

    const rows = data.records.map((r) => [
      `"${r.cbc_account_ref}"`,
      `"${r.national_id}"`,
      `"${r.borrower_name_km}"`,
      `"${r.borrower_name_en}"`,
      `"${r.date_of_birth}"`,
      `"${r.gender}"`,
      `"${r.phone_number}"`,
      `"${r.loan_purpose}"`,
      r.disbursed_amount,
      `"${r.currency}"`,
      r.term_months,
      r.days_past_due,
      `"${r.cbc_status}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `CBC_Monthly_Data_Upload_${data.as_of_date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(
      isKm
        ? "បានទាញយកឯកសាររបាយការណ៍ CBC ជាទម្រង់ CSV ដោយជោគជ័យ!"
        : "CBC Monthly Data CSV exported successfully!"
    );
  }

  // Handle Inquiry Simulator
  async function runInquiry(rec: CbcRecordItem) {
    setSelectedRecord(rec);
    setInquiryModalOpen(true);
    setInquiryLoading(true);

    try {
      const clientId = rec.client_id || "00000000-0000-0000-0000-000000000000";
      const res = await getCbcClientInquiry(clientId).catch(() => {
        // Fallback simulation data if test uuid or error
        return {
          client_id: rec.national_id,
          client_name: isKm ? (rec.borrower_name_km || rec.borrower_name_en) : (rec.borrower_name_en || rec.borrower_name_km),
          national_id: rec.national_id,
          cbc_inquiry_reference: `CBC-INQ-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          inquiry_date: data?.as_of_date || new Date().toISOString().slice(0, 10),
          cbc_score: rec.days_past_due > 0 ? 490 : 765,
          cbc_grade: rec.days_past_due > 0 ? "Grade C (Sub-prime / Delinquent)" : "Grade A (Prime / Low Risk)",
          cbc_grade_km: rec.days_past_due > 0 ? "កម្រិត C (ហានិភ័យមធ្យម / យឺតយ៉ាវ)" : "កម្រិត A (ឥណទានល្អបំផុត / ហានិភ័យទាប)",
          status_label: rec.days_past_due > 0 ? "delinquent" : "prime",
          active_credit_facilities: 2,
          historical_delinquencies_count: rec.days_past_due > 0 ? 1 : 0,
          recommendation_km:
            rec.days_past_due > 0
              ? "សូមប្រុងប្រយ័ត្ន អតិថិជនមានប្រវត្តិខកខានការទូទាត់កន្លងមក"
              : "អតិថិជនមានប្រវត្តិទូទាត់ត្រឹមត្រូវ អាចពិចារណាផ្តល់ឥណទានបាន",
          recommendation_en:
            rec.days_past_due > 0
              ? "Caution: Customer has a history of payment default or delinquency"
              : "Customer has a sound payment track record and is eligible for credit",
        } as CbcInquiryResponse;
      });

      setInquiryResult(res);
    } finally {
      setInquiryLoading(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 10 }}>
            <Building2 size={26} color="var(--color-accent)" />
            {isKm ? "ប្រព័ន្ធទាញទិន្នន័យ CBC & ពិនិត្យប្រវត្តិឥណទាន" : "Credit Bureau Cambodia (CBC) Center"}
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-muted)" }}>
            {isKm
              ? "រៀបចំ និងទាញយកឯកសាររាយការណ៍ប្រចាំខែជូនការិយាល័យឥណទានកម្ពុជា (CBC) និងប្រព័ន្ធត្រួតពិនិត្យប្រវត្តិអតិថិជន"
              : "Monthly standardized regulatory reporting export for Credit Bureau Cambodia and credit inquiry simulator"}
          </p>
        </div>

        <div className="page-actions" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            className="btn btn-sm"
            onClick={loadCbc}
            disabled={loading}
            style={{ borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            {isKm ? "ផ្ទុកឡើងវិញ" : "Refresh"}
          </button>

          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={handleDownloadCsv}
            disabled={!data?.records || data.records.length === 0}
            style={{ borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Download size={15} />
            {isKm ? "ទាញយកឯកសារ CSV សម្រាប់ CBC" : "Export CBC File (CSV)"}
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
        {/* Total Accounts */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                {isKm ? "កិច្ចសន្យាត្រូវរាយការណ៍ CBC" : "Reported Contracts"}
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: "var(--color-text)" }}>
                {stats.total}
              </div>
            </div>
            <div style={{ width: 38, height: 38, borderRadius: 8, background: "var(--color-accent-soft)", color: "var(--color-accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FileSpreadsheet size={20} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 6 }}>
            {isKm ? "គិតត្រឹមកាលបរិច្ឆេទ៖ " : "As of: "}{data?.as_of_date || "—"}
          </div>
        </div>

        {/* Normal (CURR) */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-success)", textTransform: "uppercase" }}>
                {isKm ? "ធម្មតា (CURR: ០-២៩ ថ្ងៃ)" : "Current (CURR: 0-29 DPD)"}
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: "var(--color-success)" }}>
                {stats.curr}
              </div>
            </div>
            <div style={{ width: 38, height: 38, borderRadius: 8, background: "var(--color-success-soft)", color: "var(--color-success)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 6 }}>
            {isKm ? "អតិថិជនទូទាត់ទៀងទាត់" : "Healthy performing accounts"}
          </div>
        </div>

        {/* Special Mention (SMA) */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-warning)", textTransform: "uppercase" }}>
                {isKm ? "ពិសេស (SMA: ៣០-៨៩ ថ្ងៃ)" : "Special Mention (SMA)"}
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: "var(--color-warning)" }}>
                {stats.sma}
              </div>
            </div>
            <div style={{ width: 38, height: 38, borderRadius: 8, background: "var(--color-warning-soft)", color: "var(--color-warning)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AlertTriangle size={20} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 6 }}>
            {isKm ? "យឺតយ៉ាវដំបូង ៣០ ដល់ ៨៩ ថ្ងៃ" : "Early delinquency watch-list"}
          </div>
        </div>

        {/* NPL */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-danger)", textTransform: "uppercase" }}>
                {isKm ? "ឥណទានមិនដំណើរការ (NPL)" : "Non-Performing (NPL)"}
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: "var(--color-danger)" }}>
                {stats.npl}
              </div>
            </div>
            <div style={{ width: 38, height: 38, borderRadius: 8, background: "var(--color-danger-soft)", color: "var(--color-danger)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ShieldAlert size={20} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 6 }}>
            {isKm ? "ចំណាត់ថ្នាក់ SUB, DOUB & LOSS" : "90+ days past due"}
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="card" style={{ padding: 16, marginBottom: 20 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
          {/* Status Tabs */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button
              type="button"
              className={`btn btn-sm ${statusFilter === "all" ? "btn-primary" : ""}`}
              onClick={() => setStatusFilter("all")}
              style={{ borderRadius: 8 }}
            >
              {isKm ? "ទាំងអស់" : "All"} ({data?.records?.length || 0})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${statusFilter === "CURR" ? "btn-primary" : ""}`}
              onClick={() => setStatusFilter("CURR")}
              style={{ borderRadius: 8 }}
            >
              CURR ({stats.curr})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${statusFilter === "SMA" ? "btn-primary" : ""}`}
              onClick={() => setStatusFilter("SMA")}
              style={{ borderRadius: 8 }}
            >
              SMA ({stats.sma})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${statusFilter === "SUB" ? "btn-primary" : ""}`}
              onClick={() => setStatusFilter("SUB")}
              style={{ borderRadius: 8 }}
            >
              SUB
            </button>
            <button
              type="button"
              className={`btn btn-sm ${statusFilter === "DOUB" ? "btn-primary" : ""}`}
              onClick={() => setStatusFilter("DOUB")}
              style={{ borderRadius: 8 }}
            >
              DOUB
            </button>
            <button
              type="button"
              className={`btn btn-sm ${statusFilter === "LOSS" ? "btn-primary" : ""}`}
              onClick={() => setStatusFilter("LOSS")}
              style={{ borderRadius: 8 }}
            >
              LOSS
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
              placeholder={isKm ? "ស្វែងរកលេខកូដ CBC ឈ្មោះ អត្តសញ្ញាណប័ណ្ណ..." : "Search CBC ref, name, ID..."}
              style={{ paddingLeft: 32, fontSize: 13, width: "100%", borderRadius: 8 }}
            />
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <FileSpreadsheet size={18} color="var(--color-accent)" />
            {isKm ? "តារាងទិន្នន័យរាយការណ៍ជូន CBC ប្រចាំខែ" : "CBC Reporting Feed"}
          </h2>
          <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
            {isKm ? "បង្ហាញ " : "Showing "}{filteredRecords.length} {isKm ? "កំណត់ត្រា" : "records"}
          </span>
        </div>

        <div className="table-container" style={{ margin: 0 }}>
          <table className="table" style={{ width: "100%", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ padding: "12px 16px" }}>{isKm ? "លេខយោង CBC" : "CBC Ref"}</th>
                <th style={{ padding: "12px 16px" }}>{isKm ? "អតិថិជន & អត្តសញ្ញាណប័ណ្ណ" : "Borrower & ID"}</th>
                <th style={{ padding: "12px 16px", textAlign: "right" }}>{isKm ? "ទំហំកម្ចី" : "Disbursed"}</th>
                <th style={{ padding: "12px 16px", textAlign: "center" }}>{isKm ? "ថ្ងៃហួសកំណត់" : "DPD"}</th>
                <th style={{ padding: "12px 16px", textAlign: "center" }}>{isKm ? "ចំណាត់ថ្នាក់ CBC" : "CBC Class"}</th>
                <th style={{ padding: "12px 16px", textAlign: "center" }}>{isKm ? "ពិនិត្យប្រវត្តិ CBC" : "Inquiry Check"}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 40, color: "var(--color-text-muted)" }}>
                    <div className="skeleton skeleton-text" style={{ maxWidth: 280, margin: "0 auto" }}></div>
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 50, color: "var(--color-text-muted)" }}>
                    {isKm ? "មិនមានកំណត់ត្រា CBC ស្របតាមលក្ខខណ្ឌចម្រាញ់ទេ" : "No CBC records matching your filter"}
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr key={r.cbc_account_ref} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    {/* CBC Ref */}
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontWeight: 700, color: "var(--color-accent)" }}>{r.cbc_account_ref}</div>
                      <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                        {formatDate(r.contract_start_date, isKm ? "km" : "en")}
                      </div>
                    </td>

                    {/* Borrower & National ID */}
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>
                        {isKm ? r.borrower_name_km : r.borrower_name_en}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>
                        ID: {r.national_id} | {r.phone_number}
                      </div>
                    </td>

                    {/* Disbursed Amount */}
                    <td style={{ padding: "14px 16px", textAlign: "right" }}>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>{formatCurrency(r.disbursed_amount, r.currency)}</div>
                      <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{r.term_months} {isKm ? "ខែ" : "mos"}</div>
                    </td>

                    {/* DPD */}
                    <td style={{ padding: "14px 16px", textAlign: "center" }}>
                      <span style={{ fontWeight: 700, color: r.days_past_due > 0 ? "var(--color-danger)" : "var(--color-text)" }}>
                        {r.days_past_due} {isKm ? "ថ្ងៃ" : "DPD"}
                      </span>
                    </td>

                    {/* CBC Status Badge */}
                    <td style={{ padding: "14px 16px", textAlign: "center" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          padding: "3px 10px",
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 800,
                          background:
                            r.cbc_status === "CURR"
                              ? "var(--color-success-soft)"
                              : r.cbc_status === "SMA"
                              ? "var(--color-warning-soft)"
                              : "var(--color-danger-soft)",
                          color:
                            r.cbc_status === "CURR"
                              ? "var(--color-success)"
                              : r.cbc_status === "SMA"
                              ? "var(--color-warning)"
                              : "var(--color-danger)",
                          border: `1px solid ${
                            r.cbc_status === "CURR"
                              ? "var(--color-success)"
                              : r.cbc_status === "SMA"
                              ? "var(--color-warning)"
                              : "var(--color-danger)"
                          }33`,
                        }}
                      >
                        {r.cbc_status}
                      </span>
                    </td>

                    {/* Action: Run Inquiry Check */}
                    <td style={{ padding: "14px 16px", textAlign: "center" }}>
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        onClick={() => runInquiry(r)}
                        style={{ borderRadius: 6, display: "inline-flex", alignItems: "center", gap: 4, color: "var(--color-accent)" }}
                      >
                        <Gauge size={13} />
                        <span>{isKm ? "ពិនិត្យប្រវត្តិ CBC" : "Inquiry"}</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inquiry Simulator Modal */}
      {inquiryModalOpen && selectedRecord && (
        <div
          className="modal-backdrop"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1050,
            padding: 20,
          }}
          onClick={() => setInquiryModalOpen(false)}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: 560,
              padding: 0,
              borderRadius: 16,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
              overflow: "hidden",
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid var(--color-border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "var(--color-surface)",
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, display: "flex", alignItems: "center", gap: 8, color: "var(--color-text)" }}>
                  <Building2 size={18} color="var(--color-accent)" />
                  {isKm ? "លទ្ធផលត្រួតពិនិត្យប្រវត្តិឥណទាន CBC" : "CBC Credit Inquiry Report"}
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--color-text-muted)" }}>
                  {isKm ? "របាយការណ៍ក្លែងធ្វើផ្អែកលើស្តង់ដារការិយាល័យឥណទានកម្ពុជា" : "Simulated Credit Bureau Cambodia scoring and risk report"}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => setInquiryModalOpen(false)}
                style={{ borderRadius: "50%", width: 32, height: 32, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: 24, background: "var(--color-surface)" }}>
              {inquiryLoading || !inquiryResult ? (
                <div style={{ textAlign: "center", padding: 40 }}>
                  <div className="skeleton skeleton-heading" style={{ margin: "0 auto 12px" }}></div>
                  <div className="skeleton skeleton-text" style={{ maxWidth: 240, margin: "0 auto" }}></div>
                </div>
              ) : (
                <>
                  {/* Client Info Banner */}
                  <div style={{ background: "var(--color-surface-sunken)", border: "1px solid var(--color-border)", borderRadius: 10, padding: 14, marginBottom: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: "var(--color-text)" }}>{inquiryResult.client_name}</div>
                        <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>
                          {isKm ? "អត្តសញ្ញាណប័ណ្ណ៖ " : "National ID: "}{inquiryResult.national_id}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", fontSize: 11, color: "var(--color-text-muted)" }}>
                        <div>{inquiryResult.cbc_inquiry_reference}</div>
                        <div>{formatDate(inquiryResult.inquiry_date, isKm ? "km" : "en")}</div>
                      </div>
                    </div>
                  </div>

                  {/* Score Gauge Box */}
                  <div
                    style={{
                      border: "1px solid var(--color-border)",
                      borderRadius: 12,
                      padding: 20,
                      textAlign: "center",
                      background: "var(--color-surface-sunken)",
                      marginBottom: 20,
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                      {isKm ? "ពិន្ទុឥណទាន CBC" : "CBC Credit Score"}
                    </div>
                    <div style={{ fontSize: 44, fontWeight: 900, color: inquiryResult.cbc_score >= 700 ? "var(--color-success)" : (inquiryResult.cbc_score >= 600 ? "var(--color-accent)" : "var(--color-danger)"), margin: "6px 0" }}>
                      {inquiryResult.cbc_score}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text)" }}>
                      {isKm ? inquiryResult.cbc_grade_km : inquiryResult.cbc_grade}
                    </div>
                  </div>

                  {/* Detail Metrics Grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
                    <div style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)", borderRadius: 8, padding: 12 }}>
                      <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                        {isKm ? "ចំនួនកម្ចីសកម្មក្នុងវិស័យ" : "Active Credit Facilities"}
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4, color: "var(--color-text)" }}>
                        {inquiryResult.active_credit_facilities} {isKm ? "គ្រឹះស្ថាន" : "Accounts"}
                      </div>
                    </div>

                    <div style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)", borderRadius: 8, padding: 12 }}>
                      <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                        {isKm ? "ប្រវត្តិយឺតយ៉ាវកន្លងមក" : "Historical Delinquencies"}
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: inquiryResult.historical_delinquencies_count > 0 ? "var(--color-danger)" : "var(--color-success)", marginTop: 4 }}>
                        {inquiryResult.historical_delinquencies_count} {isKm ? "លើក" : "Times"}
                      </div>
                    </div>
                  </div>

                  {/* Underwriting Recommendation */}
                  <div
                    style={{
                      background: inquiryResult.historical_delinquencies_count > 0 ? "var(--color-danger-soft)" : "var(--color-success-soft)",
                      border: `1px solid ${inquiryResult.historical_delinquencies_count > 0 ? "var(--color-danger)" : "var(--color-success)"}44`,
                      borderRadius: 8,
                      padding: 12,
                      marginBottom: 20,
                    }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700, color: inquiryResult.historical_delinquencies_count > 0 ? "var(--color-danger)" : "var(--color-success)", textTransform: "uppercase" }}>
                      {isKm ? "អនុសាសន៍ផ្តល់ឥណទាន" : "Underwriting Recommendation"}
                    </div>
                    <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--color-text)", fontWeight: 600 }}>
                      {isKm ? inquiryResult.recommendation_km : inquiryResult.recommendation_en}
                    </p>
                  </div>

                  {/* Close button */}
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setInquiryModalOpen(false)}
                      style={{ borderRadius: 8 }}
                    >
                      {isKm ? "បិទ" : "Close"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
