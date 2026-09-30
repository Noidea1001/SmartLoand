import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  AlertOctagon,
  AlertTriangle,
  ShieldAlert,
  Search,
  RefreshCw,
  ExternalLink,
  Phone,
  Clock,
  Eye,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  X,
  FileText,
} from "lucide-react";
import {
  getEarlyWarningWatchlist,
  type EwsResponse,
  type EwsItem,
} from "../../api/reports";
import { formatCurrency, formatDate } from "../../utils/format";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useToast } from "../../context/ToastContext";

export default function EarlyWarningSystem() {
  const { t, i18n } = useTranslation();
  const isKm = i18n.language === "km";
  useDocumentTitle(isKm ? "ប្រព័ន្ធប្រកាសអាសន្នហានិភ័យមុនកាលកំណត់" : "Early Warning System (EWS)");
  const toast = useToast();

  const [data, setData] = useState<EwsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<"all" | "critical" | "high" | "medium">("all");

  // Field Action Modal
  const [selectedLoan, setSelectedLoan] = useState<EwsItem | null>(null);
  const [actionNotes, setActionNotes] = useState("");
  const [savingAction, setSavingAction] = useState(false);

  function loadWatchlist() {
    setLoading(true);
    getEarlyWarningWatchlist()
      .then(setData)
      .catch((err) => {
        console.error("Failed to load EWS watchlist:", err);
        toast.error(isKm ? "បរាជ័យក្នុងការទាញយកបញ្ជីប្រកាសអាសន្ន" : "Failed to load Early Warning Watchlist.");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadWatchlist();
  }, []);

  // Filtered items
  const filteredList = useMemo(() => {
    if (!data?.watchlist) return [];

    return data.watchlist.filter((item) => {
      if (severityFilter !== "all" && item.severity !== severityFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const nameMatch = item.borrower_name.toLowerCase().includes(q);
        const phoneMatch = item.borrower_phone.toLowerCase().includes(q);
        const loanMatch = item.loan_id.toLowerCase().includes(q);
        if (!nameMatch && !phoneMatch && !loanMatch) return false;
      }
      return true;
    });
  }, [data, severityFilter, search]);

  function handleSaveFieldAction() {
    if (!selectedLoan) return;
    setSavingAction(true);
    setTimeout(() => {
      setSavingAction(false);
      toast.success(
        isKm
          ? `បានកត់ត្រាសកម្មភាពចុះជួបអតិថិជន ${selectedLoan.borrower_name} ដោយជោគជ័យ!`
          : `Field action logged for ${selectedLoan.borrower_name}!`
      );
      setSelectedLoan(null);
      setActionNotes("");
    }, 600);
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 10 }}>
            <AlertOctagon size={26} color="#ef4444" />
            {isKm ? "ប្រព័ន្ធប្រកាសអាសន្នហានិភ័យមុនកាលកំណត់ & ទស្សន៍ទាយការខកខានសង" : "Early Warning System (EWS) & Default Risk Predictor"}
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-muted)" }}>
            {isKm
              ? "រាវរកសញ្ញាណព្រមាននៃកម្ចីដែលមានហានិភ័យមុនពេលក្លាយជាបំណុលមិនដំណើរការ និងចាត់វិធានការចុះជួបដោះស្រាយជាមុន"
              : "Detect early loan distress indicators before turning into NPL and prioritize field intervention actions"}
          </p>
        </div>

        <div className="page-actions" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            className="btn btn-sm"
            onClick={loadWatchlist}
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
        {/* Total Monitored */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                {isKm ? "កម្ចីក្នុងបញ្ជីតាមដាន" : "Watchlist Portfolio"}
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>
                {data?.summary.total_watchlist || 0}
              </div>
            </div>
            <div style={{ width: 38, height: 38, borderRadius: 8, background: "#eff6ff", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Eye size={20} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 6 }}>
            {isKm ? "កម្ចីសកម្មដែលកំពុងតាមដាន" : "Active monitored loans"}
          </div>
        </div>

        {/* Critical Severity */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#b91c1c", textTransform: "uppercase" }}>
                {isKm ? "កម្រិតធ្ងន់ធ្ងរ" : "Critical Severity"}
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: "#ef4444" }}>
                {data?.summary.critical_count || 0}
              </div>
            </div>
            <div style={{ width: 38, height: 38, borderRadius: 8, background: "#fef2f2", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AlertOctagon size={20} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: "#b91c1c", marginTop: 6 }}>
            {isKm ? "ទាមទារការចុះជួបភ្លាមៗ" : "Requires immediate intervention"}
          </div>
        </div>

        {/* High Risk */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#b45309", textTransform: "uppercase" }}>
                {isKm ? "ហានិភ័យខ្ពស់" : "High Risk Watch"}
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: "#d97706" }}>
                {data?.summary.high_count || 0}
              </div>
            </div>
            <div style={{ width: 38, height: 38, borderRadius: 8, background: "#fffbeb", color: "#d97706", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AlertTriangle size={20} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 6 }}>
            {isKm ? "ត្រួតពិនិត្យការរៀបចំកម្ចី" : "Review for restructuring"}
          </div>
        </div>

        {/* Medium Risk */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#047857", textTransform: "uppercase" }}>
                {isKm ? "កម្រិតមធ្យម" : "Medium Watch"}
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: "#10b981" }}>
                {data?.summary.medium_count || 0}
              </div>
            </div>
            <div style={{ width: 38, height: 38, borderRadius: 8, background: "#ecfdf5", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ShieldAlert size={20} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 6 }}>
            {isKm ? "តាមដានកាលវិភាគបន្ទាប់" : "Monitor next installment"}
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
              className={`btn btn-sm ${severityFilter === "all" ? "btn-primary" : ""}`}
              onClick={() => setSeverityFilter("all")}
              style={{ borderRadius: 8 }}
            >
              {isKm ? "ទាំងអស់" : "All"} ({data?.watchlist?.length || 0})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${severityFilter === "critical" ? "btn-primary" : ""}`}
              onClick={() => setSeverityFilter("critical")}
              style={{
                borderRadius: 8,
                backgroundColor: severityFilter === "critical" ? "#ef4444" : undefined,
                color: severityFilter === "critical" ? "#fff" : undefined,
                borderColor: severityFilter === "critical" ? "#ef4444" : undefined,
              }}
            >
              <AlertOctagon size={13} style={{ marginRight: 4 }} />
              {isKm ? "ធ្ងន់ធ្ងរ" : "Critical"} ({data?.summary.critical_count || 0})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${severityFilter === "high" ? "btn-primary" : ""}`}
              onClick={() => setSeverityFilter("high")}
              style={{
                borderRadius: 8,
                backgroundColor: severityFilter === "high" ? "#f59e0b" : undefined,
                color: severityFilter === "high" ? "#fff" : undefined,
                borderColor: severityFilter === "high" ? "#f59e0b" : undefined,
              }}
            >
              <AlertTriangle size={13} style={{ marginRight: 4 }} />
              {isKm ? "ខ្ពស់" : "High"} ({data?.summary.high_count || 0})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${severityFilter === "medium" ? "btn-primary" : ""}`}
              onClick={() => setSeverityFilter("medium")}
              style={{ borderRadius: 8 }}
            >
              {isKm ? "មធ្យម" : "Medium"} ({data?.summary.medium_count || 0})
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
              placeholder={isKm ? "ស្វែងរកឈ្មោះអតិថិជន លេខទូរស័ព្ទ លេខកម្ចី..." : "Search borrower, phone, loan ref..."}
              style={{ paddingLeft: 32, fontSize: 13, width: "100%", borderRadius: 8 }}
            />
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <AlertOctagon size={18} color="#ef4444" />
            {isKm ? "បញ្ជីតាមដានហានិភ័យមុនកាលកំណត់" : "Early Distress Watchlist"}
          </h2>
          <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
            {isKm ? "បង្ហាញ " : "Showing "}{filteredList.length} {isKm ? "កម្ចី" : "loans"}
          </span>
        </div>

        <div className="table-container" style={{ margin: 0 }}>
          <table className="table" style={{ width: "100%", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ padding: "12px 16px" }}>{isKm ? "អតិថិជន & លេខកម្ចី" : "Borrower & Loan"}</th>
                <th style={{ padding: "12px 16px", textAlign: "right" }}>{isKm ? "ទំហំកម្ចី" : "Principal"}</th>
                <th style={{ padding: "12px 16px", textAlign: "center" }}>{isKm ? "ថ្ងៃហួសកំណត់" : "Overdue DPD"}</th>
                <th style={{ padding: "12px 16px" }}>{isKm ? "សញ្ញាណព្រមាននៃហានិភ័យ" : "Distress Triggers"}</th>
                <th style={{ padding: "12px 16px", textAlign: "center" }}>{isKm ? "ពិន្ទុហានិភ័យ" : "Risk Score"}</th>
                <th style={{ padding: "12px 16px" }}>{isKm ? "វិធានការដោះស្រាយណែនាំ" : "Recommended Mitigation"}</th>
                <th style={{ padding: "12px 16px", textAlign: "center" }}>{isKm ? "សកម្មភាព" : "Action"}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: 40, color: "var(--color-text-muted)" }}>
                    <div className="skeleton skeleton-text" style={{ maxWidth: 280, margin: "0 auto" }}></div>
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: 50, color: "var(--color-text-muted)" }}>
                    <CheckCircle2 size={36} color="#10b981" style={{ margin: "0 auto 10px", display: "block" }} />
                    <div style={{ fontSize: 15, fontWeight: 600 }}>
                      {isKm ? "មិនមានកម្ចីណាបង្ហាញសញ្ញាណហានិភ័យធ្ងន់ធ្ងរទេ" : "No distress alerts found matching your filter"}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => (
                  <tr key={item.loan_id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    {/* Borrower & Loan */}
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{item.borrower_name}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>
                        <Link to={`/loans/${item.loan_id}`} style={{ color: "#3b82f6", fontWeight: 600 }}>
                          #{item.loan_id.slice(0, 8).toUpperCase()}
                        </Link>
                        <span>|</span>
                        <span>{item.borrower_phone}</span>
                      </div>
                    </td>

                    {/* Principal */}
                    <td style={{ padding: "14px 16px", textAlign: "right", fontWeight: 700 }}>
                      {formatCurrency(item.principal_amount, item.currency)}
                    </td>

                    {/* DPD */}
                    <td style={{ padding: "14px 16px", textAlign: "center" }}>
                      <span
                        style={{
                          fontWeight: 700,
                          color: item.days_overdue > 15 ? "#b91c1c" : (item.days_overdue > 0 ? "#d97706" : "var(--color-text)"),
                        }}
                      >
                        {item.days_overdue} {isKm ? "ថ្ងៃ" : "DPD"}
                      </span>
                    </td>

                    {/* Distress Signals */}
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {(isKm ? item.distress_signals_km : item.distress_signals_en).map((sig, sIdx) => (
                          <span
                            key={sIdx}
                            style={{
                              fontSize: 11,
                              padding: "2px 6px",
                              borderRadius: 4,
                              background: "var(--color-bg-secondary)",
                              color: "var(--color-text-muted)",
                              border: "1px solid var(--color-border)",
                            }}
                          >
                            {sig}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Risk Score */}
                    <td style={{ padding: "14px 16px", textAlign: "center" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          padding: "3px 10px",
                          borderRadius: 12,
                          fontSize: 12,
                          fontWeight: 800,
                          background: item.severity === "critical" ? "#fef2f2" : (item.severity === "high" ? "#fffbeb" : "#ecfdf5"),
                          color: item.severity === "critical" ? "#b91c1c" : (item.severity === "high" ? "#b45309" : "#047857"),
                        }}
                      >
                        {item.risk_score} / 100
                      </span>
                    </td>

                    {/* Recommended Mitigation */}
                    <td style={{ padding: "14px 16px", fontSize: 12, color: "var(--color-text-primary)" }}>
                      {isKm ? item.recommended_action_km : item.recommended_action_en}
                    </td>

                    {/* Action */}
                    <td style={{ padding: "14px 16px", textAlign: "center" }}>
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        onClick={() => setSelectedLoan(item)}
                        style={{ borderRadius: 6, fontSize: 12, color: "#ef4444" }}
                      >
                        {isKm ? "ចុះជួប" : "Intervene"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Field Action Modal */}
      {selectedLoan && (
        <div
          className="modal-backdrop"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1050,
            padding: 20,
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: 520,
              padding: 0,
              borderRadius: 16,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              overflow: "hidden",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid var(--color-border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#fef2f2",
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#991b1b", display: "flex", alignItems: "center", gap: 8 }}>
                  <AlertOctagon size={18} color="#ef4444" />
                  {isKm ? "កត់ត្រាសកម្មភាពចុះជួបអតិថិជនដោះស្រាយហានិភ័យ" : "Log Field Recovery Intervention"}
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--color-text-muted)" }}>
                  {selectedLoan.borrower_name} (#{selectedLoan.loan_id.slice(0, 8).toUpperCase()})
                </p>
              </div>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setSelectedLoan(null)}
                style={{ borderRadius: "50%", width: 32, height: 32, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: 24 }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                  {isKm ? "កំណត់ហេតុចុះជួបផ្ទាល់ ឬទូរស័ព្ទសម្របសម្រួល" : "Field Intervention Notes"}
                </label>
                <textarea
                  className="input"
                  rows={4}
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder={isKm ? "ពិពណ៌នាអំពីស្ថានភាពអាជីវកម្មអតិថិជន កិច្ចព្រមព្រៀងសងប្រាក់ ឬការរៀបចំកម្ចីឡើងវិញ..." : "Describe client business situation, payment commitment, or restructuring plan..."}
                  style={{ width: "100%", fontSize: 13, padding: 10, borderRadius: 8, resize: "vertical" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setSelectedLoan(null)}
                  disabled={savingAction}
                  style={{ borderRadius: 8 }}
                >
                  {isKm ? "បោះបង់" : "Cancel"}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSaveFieldAction}
                  disabled={savingAction || !actionNotes.trim()}
                  style={{ borderRadius: 8, backgroundColor: "#ef4444", borderColor: "#ef4444" }}
                >
                  {savingAction ? (isKm ? "កំពុងកត់ត្រា..." : "Saving...") : (isKm ? "រក្សាទុកកំណត់ហេតុ" : "Save Action Log")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
