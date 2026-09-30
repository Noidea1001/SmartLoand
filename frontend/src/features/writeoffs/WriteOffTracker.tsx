import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  FileX2,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Plus,
  History,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  UserCheck,
  Calendar,
  X,
} from "lucide-react";
import {
  getWriteOffsTracker,
  createLoanWriteOff,
  recordWriteOffRecovery,
  type WriteOffsResponse,
  type WriteOffItem,
} from "../../api/reports";
import { formatCurrency, convertCurrencyAmount } from "../../utils/format";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useToast } from "../../context/ToastContext";
import { useBranding } from "../../context/BrandingContext";

export default function WriteOffTracker() {
  const { i18n } = useTranslation();
  const isKm = i18n.language === "km";
  useDocumentTitle(isKm ? "ការលុបបំណុល & តាមដានការទារបំណុលខូច" : "Loan Write-Offs & Bad Debt Recovery");
  const toast = useToast();
  const { baseCurrency, usdToKhrRate } = useBranding();

  const [data, setData] = useState<WriteOffsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRecoverModal, setShowRecoverModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WriteOffItem | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState<WriteOffItem | null>(null);

  // Form states
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [principal, setPrincipal] = useState<number>(0);
  const [interest, setInterest] = useState<number>(0);
  const [currency, setCurrency] = useState<"USD" | "KHR">((baseCurrency as "USD" | "KHR") || "USD");

  useEffect(() => {
    if (baseCurrency) {
      setCurrency(baseCurrency as "USD" | "KHR");
    }
  }, [baseCurrency]);
  const [reason, setReason] = useState("");
  const [approvalRef, setApprovalRef] = useState("");
  const [officer, setOfficer] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Recovery modal inputs
  const [recAmount, setRecAmount] = useState<number>(0);
  const [recReceiptNo, setRecReceiptNo] = useState("");
  const [recNotes, setRecNotes] = useState("");

  function loadData() {
    setLoading(true);
    getWriteOffsTracker()
      .then(setData)
      .catch((err) => {
        console.error("Failed to load write-offs tracker:", err);
        toast.error(isKm ? "បរាជ័យក្នុងការទាញយកទិន្នន័យលុបបំណុល" : "Failed to load write-offs data.");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleCreateWriteOff(e: React.FormEvent) {
    e.preventDefault();
    if (!clientName || principal <= 0) {
      toast.error(isKm ? "សូមបញ្ចូលឈ្មោះអតិថិជន និងប្រាក់ដើមត្រឹមត្រូវ" : "Please provide client name and valid principal.");
      return;
    }
    setSubmitting(true);
    try {
      await createLoanWriteOff({
        client_name: clientName,
        client_phone: clientPhone,
        principal,
        interest,
        currency,
        reason: reason || (isKm ? "បំណុលខូចលើសពី 360 ថ្ងៃ" : "Bad debt overdue >360 DPD"),
        approval_reference: approvalRef || `BOD-APPR-${new Date().getFullYear()}`,
        recovery_officer: officer,
      });
      toast.success(isKm ? "បានកត់ត្រាការលុបបំណុលជោគជ័យ" : "Loan write-off recorded successfully.");
      setShowCreateModal(false);
      // Reset form
      setClientName("");
      setClientPhone("");
      setPrincipal(0);
      setInterest(0);
      setCurrency((baseCurrency as "USD" | "KHR") || "USD");
      setReason("");
      setApprovalRef("");
      setOfficer("");
      loadData();
    } catch {
      toast.error(isKm ? "បរាជ័យក្នុងការកត់ត្រា" : "Failed to record write-off.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRecordRecovery(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedItem || recAmount <= 0) {
      toast.error(isKm ? "សូមបញ្ចូលចំនួនទឹកប្រាក់ដែលទារបាន" : "Please enter a valid recovered amount.");
      return;
    }
    setSubmitting(true);
    try {
      await recordWriteOffRecovery(selectedItem.id, {
        amount: recAmount,
        receipt_no: recReceiptNo,
        notes: recNotes,
      });
      toast.success(isKm ? "បានកត់ត្រាការប្រមូលប្រាក់បំណុលខូចជោគជ័យ" : "Debt recovery recorded successfully.");
      setShowRecoverModal(false);
      setRecAmount(0);
      setRecReceiptNo("");
      setRecNotes("");
      setSelectedItem(null);
      loadData();
    } catch {
      toast.error(isKm ? "បរាជ័យក្នុងការកត់ត្រា" : "Failed to record recovery.");
    } finally {
      setSubmitting(false);
    }
  }

  const filteredRecords = useMemo(() => {
    if (!data) return [];
    return data.records.filter((item) => {
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        item.client_name.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        (item.client_phone && item.client_phone.includes(q)) ||
        item.approval_reference.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [data, statusFilter, search]);

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
                background: "var(--color-danger-soft)",
                color: "var(--color-danger)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FileX2 size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "var(--color-text)" }}>
                {isKm ? "ការលុបបំណុល & តាមដានការទារបំណុលខូច (Write-Off & Bad Debt Recovery)" : "Loan Write-Offs & Bad Debt Recovery Tracker"}
              </h1>
              <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-muted)" }}>
                {isKm
                  ? "គ្រប់គ្រងកម្ចីខូចដែលបានកាត់ចេញពីបញ្ជីតុល្យការ និងកត់ត្រាការទារសងត្រឡប់មកវិញក្រោយការលុប"
                  : "Track written-off non-performing loans, recovery officer assignments, and post-write-off cash collections"}
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={loadData}
            className="btn btn-secondary"
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            <span>{isKm ? "ផ្ទុកឡើងវិញ" : "Refresh"}</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <Plus size={15} />
            <span>{isKm ? "កត់ត្រាលុបបំណុលថ្មី" : "Propose Write-Off"}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
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
              {baseCurrency === "KHR"
                ? (isKm ? "បំណុលខូចដែលបានលុបសរុប (KHR)" : "Total Written-Off (KHR)")
                : (isKm ? "បំណុលខូចដែលបានលុបសរុប (USD)" : "Total Written-Off (USD)")}
            </span>
            <FileX2 size={18} style={{ color: "var(--color-danger)" }} />
          </div>
          {baseCurrency === "KHR" ? (
            <>
              <div style={{ fontSize: 22, fontWeight: 700, color: "var(--color-text)" }}>
                {data ? formatCurrency((data.summary.total_written_off_khr || 0) + convertCurrencyAmount(data.summary.total_written_off_usd || 0, "USD", "KHR", usdToKhrRate), "KHR") : "..."}
              </div>
              <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>
                {isKm ? `ប្រាក់ដុល្លារ: ${data ? formatCurrency(data.summary.total_written_off_usd, "USD") : "$0"}` : `USD: ${data ? formatCurrency(data.summary.total_written_off_usd, "USD") : "$0"}`}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 22, fontWeight: 700, color: "var(--color-text)" }}>
                {data ? formatCurrency(data.summary.total_written_off_usd, "USD") : "..."}
              </div>
              <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>
                {isKm ? `ប្រាក់រៀល: ${data ? formatCurrency((data.summary.total_written_off_khr || 0) + convertCurrencyAmount(data.summary.total_written_off_usd || 0, "USD", "KHR", usdToKhrRate), "KHR") : "0 ៛"}` : `KHR: ${data ? formatCurrency((data.summary.total_written_off_khr || 0) + convertCurrencyAmount(data.summary.total_written_off_usd || 0, "USD", "KHR", usdToKhrRate), "KHR") : "0 ៛"}`}
              </div>
            </>
          )}
        </div>

        <div className="card" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: "var(--color-text-muted)", fontWeight: 500 }}>
              {baseCurrency === "KHR"
                ? (isKm ? "ប្រាក់ទារបានមកវិញសរុប (KHR)" : "Total Cash Recovered (KHR)")
                : (isKm ? "ប្រាក់ទារបានមកវិញសរុប (USD)" : "Total Cash Recovered (USD)")}
            </span>
            <CheckCircle2 size={18} style={{ color: "var(--color-success)" }} />
          </div>
          {baseCurrency === "KHR" ? (
            <>
              <div style={{ fontSize: 22, fontWeight: 700, color: "var(--color-success)" }}>
                {data ? formatCurrency((data.summary.total_recovered_khr || 0) + convertCurrencyAmount(data.summary.total_recovered_usd || 0, "USD", "KHR", usdToKhrRate), "KHR") : "..."}
              </div>
              <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>
                {isKm ? `ប្រាក់ដុល្លារ: ${data ? formatCurrency(data.summary.total_recovered_usd, "USD") : "$0"}` : `USD: ${data ? formatCurrency(data.summary.total_recovered_usd, "USD") : "$0"}`}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 22, fontWeight: 700, color: "var(--color-success)" }}>
                {data ? formatCurrency(data.summary.total_recovered_usd, "USD") : "..."}
              </div>
              <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>
                {isKm ? `ប្រាក់រៀល: ${data ? formatCurrency((data.summary.total_recovered_khr || 0) + convertCurrencyAmount(data.summary.total_recovered_usd || 0, "USD", "KHR", usdToKhrRate), "KHR") : "0 ៛"}` : `KHR: ${data ? formatCurrency((data.summary.total_recovered_khr || 0) + convertCurrencyAmount(data.summary.total_recovered_usd || 0, "USD", "KHR", usdToKhrRate), "KHR") : "0 ៛"}`}
              </div>
            </>
          )}
        </div>

        <div className="card" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: "var(--color-text-muted)", fontWeight: 500 }}>
              {isKm ? "អត្រាទារប្រាក់បានមកវិញ" : "Recovery Rate"}
            </span>
            <TrendingUp size={18} style={{ color: "var(--color-accent)" }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "var(--color-accent)" }}>
            {data ? `${data.summary.recovery_rate_pct}%` : "..."}
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>
            {isKm ? `${data?.summary.fully_recovered_count || 0} គណនីទារបានផ្តាច់` : `${data?.summary.fully_recovered_count || 0} accounts fully recovered`}
          </div>
        </div>

        <div className="card" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: "var(--color-text-muted)", fontWeight: 500 }}>
              {isKm ? "សំណុំរឿងបំណុលខូច" : "Total Bad Debt Cases"}
            </span>
            <History size={18} style={{ color: "var(--color-warning)" }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "var(--color-text)" }}>
            {data ? `${data.summary.total_cases} ${isKm ? "ករណី" : "cases"}` : "..."}
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>
            {isKm ? `${data?.summary.partial_count || 0} កំពុងបន្តទារ` : `${data?.summary.partial_count || 0} actively recovering`}
          </div>
        </div>
      </div>

      {/* Filter and Table */}
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
              placeholder={isKm ? "ស្វែងរកតាមឈ្មោះកូនបំណុល លេខកូដ ឬលិខិតអនុម័ត..." : "Search by borrower, code, or approval reference..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input"
              style={{ width: "100%", maxWidth: 380 }}
            />
            <div
              style={{
                display: "flex",
                background: "var(--color-surface-sunken)",
                borderRadius: 8,
                padding: 3,
                border: "1px solid var(--color-border)",
              }}
            >
              {[
                { key: "all", labelKm: "ទាំងអស់", labelEn: "All" },
                { key: "pending_recovery", labelKm: "រង់ចាំទារ", labelEn: "Pending" },
                { key: "partial_recovered", labelKm: "ទារបានខ្លះ", labelEn: "Partial" },
                { key: "fully_recovered", labelKm: "ទារផ្តាច់", labelEn: "Closed" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                    background: statusFilter === tab.key ? "var(--color-accent)" : "transparent",
                    color: statusFilter === tab.key ? "#ffffff" : "var(--color-text-muted)",
                  }}
                >
                  {isKm ? tab.labelKm : tab.labelEn}
                </button>
              ))}
            </div>
          </div>
          <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
            {isKm ? `បង្ហាញ ${filteredRecords.length} ករណី` : `Showing ${filteredRecords.length} records`}
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <table className="table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>{isKm ? "លេខកូដ / កាលបរិច្ឆេទ" : "Code / Date"}</th>
                <th>{isKm ? "ឈ្មោះកូនបំណុល / ទូរស័ព្ទ" : "Borrower / Phone"}</th>
                <th>{isKm ? "បំណុលខូចដែលលុប (ដើម+ការ)" : "Written-Off Total"}</th>
                <th>{isKm ? "ប្រាក់ទារបានមកវិញ" : "Cash Recovered"}</th>
                <th>{isKm ? "សមតុល្យនៅសល់" : "Remaining"}</th>
                <th>{isKm ? "មន្ត្រីទទួលបន្ទុក" : "Recovery Officer"}</th>
                <th>{isKm ? "ស្ថានភាព" : "Status"}</th>
                <th style={{ textAlign: "right" }}>{isKm ? "សកម្មភាព" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "36px 0", color: "var(--color-text-muted)" }}>
                    <RefreshCw size={22} className="animate-spin" style={{ margin: "0 auto 8px" }} />
                    <div>{isKm ? "កំពុងទាញយកទិន្នន័យ..." : "Loading write-offs data..."}</div>
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "36px 0", color: "var(--color-text-muted)" }}>
                    {isKm ? "មិនមានទិន្នន័យលុបបំណុលទេ" : "No write-off records found."}
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  const totalDebt = r.written_off_principal + r.written_off_interest;
                  const progressPct = totalDebt > 0 ? Math.min(100, Math.round((r.total_recovered / totalDebt) * 100)) : 0;
                  return (
                    <tr key={r.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: "var(--color-text)" }}>{r.id}</div>
                        <div style={{ fontSize: 11.5, color: "var(--color-text-muted)" }}>{r.write_off_date}</div>
                        <div style={{ fontSize: 11, color: "var(--color-accent)" }}>{r.approval_reference}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: "var(--color-text)" }}>{r.client_name}</div>
                        <div style={{ fontSize: 11.5, color: "var(--color-text-muted)" }}>{r.client_phone || "N/A"}</div>
                        <div style={{ fontSize: 11, color: "var(--color-text-muted)", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.reason}>
                          {r.reason}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: "var(--color-danger)" }}>
                          {formatCurrency(totalDebt, r.currency as any)}
                        </div>
                        {r.currency !== baseCurrency && (
                          <div style={{ fontSize: 10.5, color: "var(--color-text-muted)" }}>
                            ≈ {formatCurrency(convertCurrencyAmount(totalDebt, r.currency as any, baseCurrency, usdToKhrRate), baseCurrency)}
                          </div>
                        )}
                        <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                          {isKm ? `ដើម: ${formatCurrency(r.written_off_principal, r.currency as any)}` : `Prin: ${formatCurrency(r.written_off_principal, r.currency as any)}`}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: "var(--color-success)" }}>
                          {formatCurrency(r.total_recovered, r.currency as any)}
                        </div>
                        {r.currency !== baseCurrency && (
                          <div style={{ fontSize: 10.5, color: "var(--color-text-muted)" }}>
                            ≈ {formatCurrency(convertCurrencyAmount(r.total_recovered, r.currency as any, baseCurrency, usdToKhrRate), baseCurrency)}
                          </div>
                        )}
                        {/* Progress Bar */}
                        <div
                          style={{
                            width: 100,
                            height: 6,
                            background: "var(--color-surface-sunken)",
                            borderRadius: 3,
                            marginTop: 4,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${progressPct}%`,
                              height: "100%",
                              background: progressPct === 100 ? "var(--color-success)" : "var(--color-accent)",
                              borderRadius: 3,
                            }}
                          />
                        </div>
                        <div style={{ fontSize: 10.5, color: "var(--color-text-muted)", marginTop: 2 }}>
                          {progressPct}% {isKm ? "ទារបាន" : "recovered"}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: r.remaining_unrecovered > 0 ? "var(--color-warning)" : "var(--color-text-muted)" }}>
                          {formatCurrency(r.remaining_unrecovered, r.currency as any)}
                        </div>
                        {r.currency !== baseCurrency && (
                          <div style={{ fontSize: 10.5, color: "var(--color-text-muted)" }}>
                            ≈ {formatCurrency(convertCurrencyAmount(r.remaining_unrecovered, r.currency as any, baseCurrency, usdToKhrRate), baseCurrency)}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <UserCheck size={14} style={{ color: "var(--color-accent)" }} />
                          <span style={{ fontSize: 12.5, fontWeight: 500 }}>{r.recovery_officer}</span>
                        </div>
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: 11.5,
                            fontWeight: 600,
                            padding: "3px 8px",
                            borderRadius: 6,
                            background:
                              r.status === "fully_recovered"
                                ? "rgba(16, 185, 129, 0.15)"
                                : r.status === "partial_recovered"
                                ? "rgba(59, 130, 246, 0.15)"
                                : "rgba(239, 68, 68, 0.15)",
                            color:
                              r.status === "fully_recovered"
                                ? "#10b981"
                                : r.status === "partial_recovered"
                                ? "#3b82f6"
                                : "#ef4444",
                          }}
                        >
                          {r.status === "fully_recovered"
                            ? isKm
                              ? "ទារបានផ្តាច់"
                              : "Fully Recovered"
                            : r.status === "partial_recovered"
                            ? isKm
                              ? "ទារបានខ្លះ"
                              : "Partially Recovered"
                            : isKm
                            ? "រង់ចាំការទារ"
                            : "Pending Recovery"}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                          {r.recovery_history.length > 0 && (
                            <button
                              onClick={() => setShowHistoryModal(r)}
                              className="btn btn-secondary"
                              title={isKm ? "មើលប្រវត្តិទារប្រាក់" : "View Recovery History"}
                              style={{ padding: "5px 8px", fontSize: 12 }}
                            >
                              <History size={14} />
                            </button>
                          )}
                          {r.status !== "fully_recovered" && (
                            <button
                              onClick={() => {
                                setSelectedItem(r);
                                setRecAmount(0);
                                setRecReceiptNo(`REC-WO-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
                                setShowRecoverModal(true);
                              }}
                              className="btn btn-primary"
                              style={{ padding: "5px 10px", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}
                            >
                              <Receipt size={13} />
                              <span>{isKm ? "ទារប្រាក់" : "Recover"}</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Create Write-Off */}
      {showCreateModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: 520,
              padding: 24,
              borderRadius: 14,
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--color-text)" }}>
                {isKm ? "កត់ត្រាលុបបំណុលខូច (Write-Off Proposal)" : "Propose Loan Write-Off"}
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: "none", border: "none", color: "var(--color-text-muted)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateWriteOff}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 5 }}>
                    {isKm ? "ឈ្មោះអតិថិជន / កូនបំណុល *" : "Borrower Full Name *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder={isKm ? "ឧ. សុខ វិបុល" : "e.g. Sok Vibul"}
                    className="input"
                    style={{ width: "100%" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 5 }}>
                      {isKm ? "លេខទូរស័ព្ទ" : "Phone Number"}
                    </label>
                    <input
                      type="text"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      placeholder="012 xxx xxx"
                      className="input"
                      style={{ width: "100%" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 5 }}>
                      {isKm ? "រូបិយប័ណ្ណ" : "Currency"}
                    </label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value as any)}
                      className="input"
                      style={{ width: "100%" }}
                    >
                      <option value="USD">USD ($)</option>
                      <option value="KHR">KHR (៛)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 5 }}>
                      {isKm ? "ប្រាក់ដើមលុបបំណុល *" : "Principal Amount *"}
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      step="any"
                      value={principal || ""}
                      onChange={(e) => setPrincipal(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="input"
                      style={{ width: "100%" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 5 }}>
                      {isKm ? "ការប្រាក់ត្រូវលុប" : "Interest Balance"}
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={interest || ""}
                      onChange={(e) => setInterest(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="input"
                      style={{ width: "100%" }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 5 }}>
                      {isKm ? "លេខលិខិតអនុម័តក្រុមប្រឹក្សា" : "Approval Reference"}
                    </label>
                    <input
                      type="text"
                      value={approvalRef}
                      onChange={(e) => setApprovalRef(e.target.value)}
                      placeholder="BOD-APPR-2026-001"
                      className="input"
                      style={{ width: "100%" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 5 }}>
                      {isKm ? "មន្ត្រីទទួលបន្ទុកទារបំណុល" : "Recovery Officer"}
                    </label>
                    <input
                      type="text"
                      value={officer}
                      onChange={(e) => setOfficer(e.target.value)}
                      placeholder={isKm ? "ឈ្មោះមន្ត្រីឥណទាន" : "Officer Name"}
                      className="input"
                      style={{ width: "100%" }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 5 }}>
                    {isKm ? "មូលហេតុនៃការលុបបំណុល" : "Write-Off Rationale"}
                  </label>
                  <textarea
                    rows={2}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={isKm ? "បញ្ជាក់ពីមូលហេតុបាត់បង់លទ្ធភាពសង..." : "State reasons for write-off..."}
                    className="input"
                    style={{ width: "100%", resize: "vertical" }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="btn btn-secondary"
                  >
                    {isKm ? "បោះបង់" : "Cancel"}
                  </button>
                  <button type="submit" disabled={submitting} className="btn btn-primary">
                    {submitting ? (isKm ? "កំពុងរក្សាទុក..." : "Saving...") : (isKm ? "អនុម័តលុបបំណុល" : "Confirm Write-Off")}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Record Recovery Payment */}
      {showRecoverModal && selectedItem && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: 480,
              padding: 24,
              borderRadius: 14,
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--color-text)" }}>
                  {isKm ? "កត់ត្រាការទារប្រាក់បានមកវិញ" : "Record Debt Recovery Installment"}
                </h3>
                <div style={{ fontSize: 12.5, color: "var(--color-text-muted)", marginTop: 2 }}>
                  {selectedItem.client_name} ({selectedItem.id})
                </div>
              </div>
              <button
                onClick={() => setShowRecoverModal(false)}
                style={{ background: "none", border: "none", color: "var(--color-text-muted)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <div
              style={{
                padding: "12px 14px",
                borderRadius: 8,
                background: "var(--color-surface-sunken)",
                marginBottom: 16,
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ fontSize: 11.5, color: "var(--color-text-muted)" }}>
                  {isKm ? "សមតុល្យនៅសល់ត្រូវទារ" : "Remaining Unrecovered"}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--color-warning)" }}>
                  {formatCurrency(selectedItem.remaining_unrecovered, selectedItem.currency as any)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11.5, color: "var(--color-text-muted)" }}>
                  {isKm ? "ទារបានសរុបកន្លងមក" : "Total Recovered So Far"}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--color-success)" }}>
                  {formatCurrency(selectedItem.total_recovered, selectedItem.currency as any)}
                </div>
              </div>
            </div>

            <form onSubmit={handleRecordRecovery}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 5 }}>
                    {isKm ? `ចំនួនទឹកប្រាក់ទារបាន (${selectedItem.currency}) *` : `Recovered Amount (${selectedItem.currency}) *`}
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={selectedItem.remaining_unrecovered}
                    step="any"
                    value={recAmount || ""}
                    onChange={(e) => setRecAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="input"
                    style={{ width: "100%" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 5 }}>
                    {isKm ? "លេខបង្កាន់ដៃបង់ប្រាក់" : "Receipt / Voucher Number"}
                  </label>
                  <input
                    type="text"
                    value={recReceiptNo}
                    onChange={(e) => setRecReceiptNo(e.target.value)}
                    className="input"
                    style={{ width: "100%" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 5 }}>
                    {isKm ? "កំណត់ចំណាំ / ប្រភពថវិកា" : "Notes / Source of Funds"}
                  </label>
                  <textarea
                    rows={2}
                    value={recNotes}
                    onChange={(e) => setRecNotes(e.target.value)}
                    placeholder={isKm ? "ឧ. ការលក់ទ្រព្យបញ្ចាំ ឬការសងពីសាច់ញាតិ..." : "e.g. Collateral liquidation or family settlement..."}
                    className="input"
                    style={{ width: "100%", resize: "vertical" }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => setShowRecoverModal(false)}
                    className="btn btn-secondary"
                  >
                    {isKm ? "បោះបង់" : "Cancel"}
                  </button>
                  <button type="submit" disabled={submitting} className="btn btn-primary">
                    {submitting ? (isKm ? "កំពុងកត់ត្រា..." : "Recording...") : (isKm ? "បញ្ជាក់ការទទួលប្រាក់" : "Confirm Recovery")}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: View Recovery History */}
      {showHistoryModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: 560,
              padding: 24,
              borderRadius: 14,
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--color-text)" }}>
                  {isKm ? "ប្រវត្តិការទារប្រាក់សងត្រឡប់មកវិញ" : "Recovery Payment History"}
                </h3>
                <div style={{ fontSize: 12.5, color: "var(--color-text-muted)", marginTop: 2 }}>
                  {showHistoryModal.client_name} ({showHistoryModal.id})
                </div>
              </div>
              <button
                onClick={() => setShowHistoryModal(null)}
                style={{ background: "none", border: "none", color: "var(--color-text-muted)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ maxHeight: 380, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
              {showHistoryModal.recovery_history.map((h, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 8,
                    background: "var(--color-surface-sunken)",
                    border: "1px solid var(--color-border)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: "var(--color-success)", fontSize: 15 }}>
                      +{formatCurrency(h.amount, h.currency as any)}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>
                      {h.notes || (isKm ? "ការទារប្រាក់បានមកវិញ" : "Cash collection")}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--color-accent)", marginTop: 2 }}>
                      {isKm ? `មន្ត្រី: ${h.officer}` : `Officer: ${h.officer}`}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text)" }}>{h.receipt_no}</div>
                    <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>{h.date}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <button onClick={() => setShowHistoryModal(null)} className="btn btn-secondary">
                {isKm ? "បិទ" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
