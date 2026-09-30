import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  ShieldAlert,
  AlertTriangle,
  UserX,
  Search,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  Layers,
  Phone,
  CreditCard,
  X,
  Eye,
  Info,
} from "lucide-react";
import {
  getRiskWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  type WatchlistResponse,
  type WatchlistItem,
} from "../../api/reports";
import { formatDate } from "../../utils/format";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useToast } from "../../context/ToastContext";

export default function RiskWatchlist() {
  const { t, i18n } = useTranslation();
  const isKm = i18n.language === "km";
  useDocumentTitle(isKm ? "ប្រព័ន្ធត្រួតពិនិត្យកម្ចីជាន់គ្នា & បញ្ជីហានិភ័យ" : "Anti-Stacking & Risk Watchlist");
  const toast = useToast();

  const [data, setData] = useState<WatchlistResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Add Modal State
  const [addModal, setAddModal] = useState(false);
  const [clientName, setClientName] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [phone, setPhone] = useState("");
  const [severity, setSeverity] = useState<"high" | "medium" | "watch">("high");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Delete Confirm State
  const [deletingItem, setDeletingItem] = useState<WatchlistItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  function loadWatchlist() {
    setLoading(true);
    getRiskWatchlist()
      .then(setData)
      .catch((err) => {
        console.error("Failed to load risk watchlist:", err);
        toast.error(isKm ? "បរាជ័យក្នុងការទាញយកបញ្ជីហានិភ័យ" : "Failed to load risk watchlist");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadWatchlist();
  }, []);

  async function handleAddWatchlist(e: React.FormEvent) {
    e.preventDefault();
    if (!clientName.trim() || !reason.trim()) return;

    setSubmitting(true);
    try {
      await addToWatchlist({
        client_name: clientName.trim(),
        national_id: nationalId.trim(),
        phone: phone.trim(),
        severity,
        reason: reason.trim(),
      });

      toast.success(isKm ? "បានបញ្ចូលអតិថិជនទៅក្នុងបញ្ជីតាមដានដោយជោគជ័យ" : "Added to watchlist successfully");
      setAddModal(false);
      setClientName("");
      setNationalId("");
      setPhone("");
      setReason("");
      loadWatchlist();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || (isKm ? "បរាជ័យក្នុងការបញ្ចូល" : "Failed to add to watchlist"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteItem() {
    if (!deletingItem) return;
    setDeleting(true);
    try {
      await removeFromWatchlist(deletingItem.id);
      toast.success(isKm ? "បានដកចេញពីបញ្ជីតាមដានដោយជោគជ័យ" : "Removed from watchlist");
      setDeletingItem(null);
      loadWatchlist();
    } catch (err: any) {
      toast.error(isKm ? "បរាជ័យក្នុងការដកចេញ" : "Failed to remove");
    } finally {
      setDeleting(false);
    }
  }

  const filteredItems = useMemo(() => {
    if (!data?.watchlist) return [];
    return data.watchlist.filter((item) => {
      if (typeFilter === "stacking" && item.risk_type !== "multiple_active_loans") return false;
      if (typeFilter === "manual" && !item.is_manual) return false;
      if (typeFilter === "high" && item.severity !== "high") return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const nameMatch = item.client_name.toLowerCase().includes(q);
        const idMatch = item.national_id.toLowerCase().includes(q);
        const phoneMatch = item.phone.toLowerCase().includes(q);
        const reasonMatch = item.details.toLowerCase().includes(q);
        if (!nameMatch && !idMatch && !phoneMatch && !reasonMatch) return false;
      }
      return true;
    });
  }, [data, search, typeFilter]);

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 10 }}>
            <ShieldAlert size={26} color="var(--color-accent)" />
            {isKm ? "ប្រព័ន្ធត្រួតពិនិត្យកម្ចីជាន់គ្នា & បញ្ជីតាមដានហានិភ័យ" : "Anti-Stacking & Risk Watchlist"}
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-muted)" }}>
            {isKm
              ? "ស្វែងរកដោយស្វ័យប្រវត្តិនូវអតិថិជនដែលមានកម្ចីសកម្មច្រើនកន្លែងដំណាលគ្នា និងគ្រប់គ្រងបញ្ជីខ្មៅផ្ទៃក្នុង"
              : "Automated multi-loan stacking detection, cross-guarantor risk tracking, and internal credit blacklists"}
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

          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => setAddModal(true)}
            style={{ borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Plus size={15} />
            {isKm ? "បញ្ចូលទៅក្នុងបញ្ជីតាមដាន" : "Add to Watchlist"}
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
        {/* Total Flagged */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-danger)", textTransform: "uppercase" }}>
                {isKm ? "អតិថិជនក្នុងបញ្ជីហានិភ័យ" : "Total Flagged Profiles"}
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: "var(--color-danger)" }}>
                {data?.summary.total_flagged || 0}
              </div>
            </div>
            <div style={{ width: 38, height: 38, borderRadius: 8, background: "var(--color-danger-soft)", color: "var(--color-danger)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ShieldAlert size={20} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 6 }}>
            {isKm ? "ទិន្នន័យត្រួតពិនិត្យផ្ទៃក្នុង" : "Under active risk monitoring"}
          </div>
        </div>

        {/* Multi-Loan Stacking */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-warning)", textTransform: "uppercase" }}>
                {isKm ? "កម្ចីជាន់គ្នា (Stacking)" : "Multi-Loan Stacking"}
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: "var(--color-warning)" }}>
                {data?.watchlist.filter((w) => w.risk_type === "multiple_active_loans").length || 0}
              </div>
            </div>
            <div style={{ width: 38, height: 38, borderRadius: 8, background: "var(--color-warning-soft)", color: "var(--color-warning)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Layers size={20} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 6 }}>
            {isKm ? "មានកម្ចីសកម្ម >= ២ ដំណាលគ្នា" : ">= 2 simultaneous active loans"}
          </div>
        </div>

        {/* High Severity */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-danger)", textTransform: "uppercase" }}>
                {isKm ? "កម្រិតហានិភ័យខ្ពស់ (High)" : "High Severity Watch"}
              </div>
              <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: "var(--color-danger)" }}>
                {data?.summary.high_risk_count || 0}
              </div>
            </div>
            <div style={{ width: 38, height: 38, borderRadius: 8, background: "var(--color-danger-soft)", color: "var(--color-danger)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AlertTriangle size={20} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 6 }}>
            {isKm ? "ហាមឃាត់ការបញ្ចេញកម្ចីបន្ថែម" : "Lending restriction recommended"}
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
              className={`btn btn-sm ${typeFilter === "all" ? "btn-primary" : ""}`}
              onClick={() => setTypeFilter("all")}
              style={{ borderRadius: 8 }}
            >
              {isKm ? "ទាំងអស់" : "All"} ({data?.watchlist?.length || 0})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${typeFilter === "stacking" ? "btn-primary" : ""}`}
              onClick={() => setTypeFilter("stacking")}
              style={{ borderRadius: 8 }}
            >
              <Layers size={13} style={{ marginRight: 4 }} />
              {isKm ? "កម្ចីជាន់គ្នា" : "Stacking"}
            </button>
            <button
              type="button"
              className={`btn btn-sm ${typeFilter === "manual" ? "btn-primary" : ""}`}
              onClick={() => setTypeFilter("manual")}
              style={{ borderRadius: 8 }}
            >
              <UserX size={13} style={{ marginRight: 4 }} />
              {isKm ? "បញ្ជីតាមដានដោយដៃ" : "Manual Watchlist"}
            </button>
            <button
              type="button"
              className={`btn btn-sm ${typeFilter === "high" ? "btn-primary" : ""}`}
              onClick={() => setTypeFilter("high")}
              style={{ borderRadius: 8 }}
            >
              <AlertTriangle size={13} style={{ marginRight: 4 }} />
              {isKm ? "ហានិភ័យខ្ពស់" : "High Risk"}
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
              placeholder={isKm ? "ស្វែងរកឈ្មោះ លេខអត្តសញ្ញាណប័ណ្ណ..." : "Search borrower, ID card, reason..."}
              style={{ paddingLeft: 32, fontSize: 13, width: "100%", borderRadius: 8 }}
            />
          </div>
        </div>
      </div>

      {/* Main Inventory Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <ShieldAlert size={18} color="var(--color-accent)" />
            {isKm ? "បញ្ជីអតិថិជនមានការព្រមានហានិភ័យឥណទាន" : "Risk Monitored Borrowers Inventory"}
          </h2>
          <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
            {filteredItems.length} {isKm ? "ទិន្នន័យ" : "entries"}
          </span>
        </div>

        <div className="table-container" style={{ margin: 0 }}>
          <table className="table" style={{ width: "100%", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ padding: "12px 16px" }}>{isKm ? "អតិថិជន / អ្នកខ្ចី" : "Borrower"}</th>
                <th style={{ padding: "12px 16px" }}>{isKm ? "ប្រភេទហានិភ័យ" : "Risk Classification"}</th>
                <th style={{ padding: "12px 16px" }}>{isKm ? "ព័ត៌មានពិពណ៌នា" : "Details & Analysis"}</th>
                <th style={{ padding: "12px 16px", textAlign: "center" }}>{isKm ? "កម្រិត" : "Severity"}</th>
                <th style={{ padding: "12px 16px", textAlign: "center" }}>{isKm ? "សកម្មភាព" : "Action"}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: 40, color: "var(--color-text-muted)" }}>
                    <div className="skeleton skeleton-text" style={{ maxWidth: 280, margin: "0 auto" }}></div>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: 40, color: "var(--color-text-muted)" }}>
                    <CheckCircle2 size={36} color="var(--color-success)" style={{ margin: "0 auto 8px", display: "block" }} />
                    <div style={{ fontWeight: 600 }}>
                      {isKm ? "មិនមានទិន្នន័យត្រូវនឹងលក្ខខណ្ឌស្វែងរកទេ" : "No flagged profiles found."}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    {/* Borrower */}
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{item.client_name}</div>
                      <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>
                        {isKm ? "អត្តសញ្ញាណប័ណ្ណ៖ " : "ID: "}{item.national_id}
                      </div>
                      {item.phone && item.phone !== "N/A" && (
                        <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>
                          {isKm ? "ទូរស័ព្ទ៖ " : "Phone: "}{item.phone}
                        </div>
                      )}
                    </td>

                    {/* Risk Type */}
                    <td style={{ padding: "14px 16px" }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: 6,
                          background: item.risk_type === "multiple_active_loans" ? "var(--color-warning-soft)" : "var(--color-danger-soft)",
                          color: item.risk_type === "multiple_active_loans" ? "var(--color-warning)" : "var(--color-danger)",
                          display: "inline-block",
                        }}
                      >
                        {isKm ? item.risk_type_km : item.risk_type_en}
                      </span>
                      <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 4 }}>
                        {isKm ? `កម្ចីសកម្ម៖ ` : `Active Loans: `}<strong>{item.active_loans_count}</strong>
                      </div>
                    </td>

                    {/* Details */}
                    <td style={{ padding: "14px 16px", maxWidth: 360 }}>
                      <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>{item.details}</div>
                      <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 4 }}>
                        {isKm ? "កាលបរិច្ឆេទកត់ត្រា៖ " : "Logged: "}{formatDate(item.created_at, isKm ? "km" : "en")}
                      </div>
                    </td>

                    {/* Severity */}
                    <td style={{ padding: "14px 16px", textAlign: "center" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "3px 10px",
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 800,
                          background: item.severity === "high" ? "var(--color-danger-soft)" : "var(--color-warning-soft)",
                          color: item.severity === "high" ? "var(--color-danger)" : "var(--color-warning)",
                        }}
                      >
                        <AlertTriangle size={11} />
                        <span>{item.severity === "high" ? (isKm ? "ខ្ពស់ (HIGH)" : "HIGH") : (isKm ? "មធ្យម (MED)" : "MEDIUM")}</span>
                      </span>
                    </td>

                    {/* Action */}
                    <td style={{ padding: "14px 16px", textAlign: "center" }}>
                      {item.is_manual ? (
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          onClick={() => setDeletingItem(item)}
                          title={isKm ? "ដកចេញពីបញ្ជី" : "Remove"}
                          style={{ color: "var(--color-danger)", borderRadius: 6 }}
                        >
                          <Trash2 size={14} />
                        </button>
                      ) : (
                        <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                          {isKm ? "ស្វ័យប្រវត្តិ" : "Auto-detected"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {addModal && (
        <div
          className="modal-backdrop"
          onClick={() => setAddModal(false)}
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
        >
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 480,
              padding: 0,
              borderRadius: 16,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
              overflow: "hidden",
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--color-surface)" }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--color-text)", display: "flex", alignItems: "center", gap: 8 }}>
                <ShieldAlert size={18} color="var(--color-accent)" />
                {isKm ? "បញ្ចូលអតិថិជនទៅក្នុងបញ្ជីតាមដានហានិភ័យ" : "Add to Risk Watchlist"}
              </h3>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => setAddModal(false)}
                style={{ borderRadius: "50%", width: 32, height: 32, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddWatchlist} style={{ padding: 24, background: "var(--color-surface)" }}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  {isKm ? "ឈ្មោះអតិថិជន" : "Borrower / Client Name"}
                </label>
                <input
                  type="text"
                  required
                  className="input"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder={isKm ? "ឧ. សុខ ចិន្តា" : "e.g. Sok Chenda"}
                  style={{ width: "100%", padding: 8, fontSize: 13, borderRadius: 6 }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                    {isKm ? "លេខអត្តសញ្ញាណប័ណ្ណ" : "National ID"}
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    placeholder="010293847"
                    style={{ width: "100%", padding: 8, fontSize: 13, borderRadius: 6 }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                    {isKm ? "លេខទូរស័ព្ទ" : "Phone"}
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="012 345 678"
                    style={{ width: "100%", padding: 8, fontSize: 13, borderRadius: 6 }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  {isKm ? "កម្រិតហានិភ័យ" : "Risk Severity"}
                </label>
                <select
                  className="input"
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as any)}
                  style={{ width: "100%", padding: 8, fontSize: 13, borderRadius: 6 }}
                >
                  <option value="high">{isKm ? "ហានិភ័យខ្ពស់ (High - ហាមបញ្ចេញកម្ចី)" : "High Severity (Lending Ban)"}</option>
                  <option value="medium">{isKm ? "ហានិភ័យមធ្យម (Medium - តាមដានបន្ថែម)" : "Medium Severity (Caution)"}</option>
                  <option value="watch">{isKm ? "តាមដានធម្មតា (Watch)" : "General Watch"}</option>
                </select>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  {isKm ? "មូលហេតុ ឬការពិពណ៌នាហានិភ័យ" : "Reason / Risk Analysis"}
                </label>
                <textarea
                  required
                  rows={3}
                  className="input"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={isKm ? "ឧ. មានប្រវត្តិពន្យារការបង់ប្រាក់ជាញឹកញាប់ ឬមានព័ត៌មានបោកប្រាស់..." : "e.g. Chronic delay history or potential identity fraud..."}
                  style={{ width: "100%", padding: 8, fontSize: 13, borderRadius: 6 }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setAddModal(false)}
                  disabled={submitting}
                  style={{ borderRadius: 8 }}
                >
                  {isKm ? "បោះបង់" : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || !clientName.trim() || !reason.trim()}
                  style={{ borderRadius: 8, background: "var(--color-danger)", borderColor: "var(--color-danger)" }}
                >
                  {submitting ? (isKm ? "កំពុងបញ្ចូល..." : "Saving...") : (isKm ? "បញ្ចូលទៅក្នុងបញ្ជី" : "Save Entry")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingItem && (
        <div
          className="modal-backdrop"
          onClick={() => setDeletingItem(null)}
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
        >
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 400,
              padding: 24,
              borderRadius: 16,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
              textAlign: "center",
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div style={{ width: 50, height: 50, borderRadius: "50%", background: "var(--color-danger-soft)", color: "var(--color-danger)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Trash2 size={24} />
            </div>
            <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 700, color: "var(--color-text)" }}>
              {isKm ? "តើអ្នកចង់ដកអតិថិជននេះចេញពីបញ្ជីតាមដានមែនទេ?" : "Remove from Risk Watchlist?"}
            </h3>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: "var(--color-text-muted)" }}>
              <strong>{deletingItem.client_name}</strong> ({deletingItem.national_id})
            </p>

            <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
              <button
                type="button"
                className="btn"
                onClick={() => setDeletingItem(null)}
                disabled={deleting}
                style={{ borderRadius: 8 }}
              >
                {isKm ? "បោះបង់" : "Cancel"}
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDeleteItem}
                disabled={deleting}
                style={{ borderRadius: 8, background: "var(--color-danger)", color: "#fff", border: "none" }}
              >
                {deleting ? (isKm ? "កំពុងដកចេញ..." : "Removing...") : (isKm ? "យល់ព្រមដកចេញ" : "Remove")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
