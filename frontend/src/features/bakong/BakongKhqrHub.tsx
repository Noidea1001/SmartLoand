import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  QrCode,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Search,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  ExternalLink,
  Plus,
  X,
  CreditCard,
  Radio,
  FileCheck,
} from "lucide-react";
import {
  getBakongTransactions,
  simulateBakongWebhook,
  manualReconcileBakong,
  type BakongTransaction,
  type BakongTransactionsResponse,
} from "../../api/reports";
import { formatCurrency, convertCurrencyAmount } from "../../utils/format";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useToast } from "../../context/ToastContext";
import { useBranding } from "../../context/BrandingContext";

export default function BakongKhqrHub() {
  const { i18n } = useTranslation();
  const isKm = i18n.language === "km";
  useDocumentTitle(isKm ? "មជ្ឈមណ្ឌលទូទាត់បាគង KHQR & ផ្ទៀងផ្ទាត់ស្វ័យប្រវត្តិ" : "Bakong KHQR Real-Time Payment Hub");
  const toast = useToast();
  const { baseCurrency, usdToKhrRate } = useBranding();

  const [data, setData] = useState<BakongTransactionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Webhook Simulator Modal
  const [showSimModal, setShowSimModal] = useState(false);
  const [simName, setSimName] = useState("សុខ សំបូរ (Sok Sambath)");
  const [simBank, setSimBank] = useState("ABA Bank");
  const [simAmount, setSimAmount] = useState<number>(baseCurrency === "KHR" ? 400000 : 100);
  const [simCurrency, setSimCurrency] = useState<"USD" | "KHR">((baseCurrency as "USD" | "KHR") || "USD");
  const [simBill, setSimBill] = useState("LN-2026-0012");
  const [simulating, setSimulating] = useState(false);

  // Manual Reconcile Modal
  const [selectedTxn, setSelectedTxn] = useState<BakongTransaction | null>(null);
  const [targetLoanId, setTargetLoanId] = useState("");
  const [reconciling, setReconciling] = useState(false);

  function loadData() {
    setLoading(true);
    getBakongTransactions()
      .then(setData)
      .catch((err) => {
        console.error("Failed to load Bakong transactions:", err);
        toast.error(isKm ? "បរាជ័យក្នុងការទាញយកទិន្នន័យប្រតិបត្តិការបាគង" : "Failed to load Bakong transactions.");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSimulateWebhook(e: React.FormEvent) {
    e.preventDefault();
    if (simAmount <= 0) {
      toast.error(isKm ? "សូមបញ្ចូលចំនួនទឹកប្រាក់ត្រឹមត្រូវ" : "Please enter a valid payment amount.");
      return;
    }
    setSimulating(true);
    try {
      const res = await simulateBakongWebhook({
        payer_name: simName,
        payer_bank: simBank,
        amount: simAmount,
        currency: simCurrency,
        bill_number: simBill,
      });
      toast.success(
        res.matched
          ? (isKm ? "ការទូទាត់បាគងត្រូវបានផ្ទៀងផ្ទាត់ និងកាត់កងកម្ចីជោគជ័យ!" : "Bakong payment auto-reconciled against loan successfully!")
          : (isKm ? "បានទទួលប្រតិបត្តិការបាគងក្នុងបញ្ជីរង់ចាំផ្ទៀងផ្ទាត់ (Float)" : "Bakong payment received into unassigned float queue.")
      );
      setShowSimModal(false);
      loadData();
    } catch {
      toast.error(isKm ? "បរាជ័យក្នុងការដំណើរការ Webhook" : "Failed to simulate Bakong webhook.");
    } finally {
      setSimulating(false);
    }
  }

  async function handleManualReconcile(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTxn || !targetLoanId) {
      toast.error(isKm ? "សូមបញ្ចូលលេខកម្ចីដែលត្រូវភ្ជាប់" : "Please specify target loan reference.");
      return;
    }
    setReconciling(true);
    try {
      await manualReconcileBakong({
        transaction_id: selectedTxn.id,
        target_loan_id: targetLoanId,
      });
      toast.success(isKm ? "បានផ្ទៀងផ្ទាត់ និងភ្ជាប់ការទូទាត់ជាមួយកម្ចីជោគជ័យ" : "Transaction manually reconciled with loan.");
      setSelectedTxn(null);
      setTargetLoanId("");
      loadData();
    } catch {
      toast.error(isKm ? "បរាជ័យក្នុងការផ្ទៀងផ្ទាត់" : "Failed to reconcile transaction.");
    } finally {
      setReconciling(false);
    }
  }

  const filteredTxns = useMemo(() => {
    if (!data) return [];
    return data.transactions.filter((t) => {
      const matchSearch =
        t.payer_name.toLowerCase().includes(search.toLowerCase()) ||
        t.id.toLowerCase().includes(search.toLowerCase()) ||
        t.bill_number.toLowerCase().includes(search.toLowerCase()) ||
        t.payer_bank.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "all" || t.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [data, search, statusFilter]);

  const settledVolumeUSD = data?.summary.settled_usd || 0;
  const settledVolumeKHR = data?.summary.settled_khr || 0;

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: "var(--color-text)" }}>
              {isKm ? "មជ្ឈមណ្ឌលទូទាត់បាគង KHQR & ផ្ទៀងផ្ទាត់ស្វ័យប្រវត្តិ" : "Bakong KHQR Payment & Auto-Reconciliation Hub"}
            </h1>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "3px 10px",
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 700,
                background: "rgba(16, 185, 129, 0.12)",
                color: "#10b981",
              }}
            >
              <Radio size={12} className="animate-pulse" />
              <span>LIVE WEBHOOK</span>
            </span>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--color-text-muted)" }}>
            {isKm
              ? "តាមដានប្រតិបត្តិការទូទាត់តាមបាគង KHQR ក្នុងពេលជាក់ស្តែង ផ្ទៀងផ្ទាត់កាត់កងកម្ចីស្វ័យប្រវត្តិ និងគ្រប់គ្រងសាច់ប្រាក់រង់ចាំ"
              : "Real-time incoming Bakong payment listener, automated installment clearing, and float reconciliation."}
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            className="btn"
            onClick={loadData}
            disabled={loading}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            <span>{isKm ? "ផ្ទុកឡើងវិញ" : "Refresh"}</span>
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setSimCurrency((baseCurrency as "USD" | "KHR") || "USD");
              setSimAmount(baseCurrency === "KHR" ? 400000 : 100);
              setShowSimModal(true);
            }}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Plus size={16} />
            <span>{isKm ? "ក្លែងធ្វើការទូទាត់ Webhook" : "Simulate Incoming Payment"}</span>
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
        {/* Reconciled Today */}
        <div className="card" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: "var(--color-text-muted)", fontWeight: 500 }}>
              {isKm ? "ទឹកប្រាក់ទូទាត់ជោគជ័យថ្ងៃនេះ" : "Settled Volume Today"}
            </span>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(16, 185, 129, 0.12)", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          {baseCurrency === "KHR" ? (
            <>
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--color-success)" }}>
                {formatCurrency(settledVolumeKHR + convertCurrencyAmount(settledVolumeUSD, "USD", "KHR", usdToKhrRate), "KHR")}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginTop: 4 }}>
                ≈ {formatCurrency(settledVolumeUSD, "USD")}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 22, fontWeight: 800, color: "var(--color-success)" }}>
                {formatCurrency(settledVolumeUSD + convertCurrencyAmount(settledVolumeKHR, "KHR", "USD", usdToKhrRate), "USD")}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginTop: 4 }}>
                ≈ {formatCurrency(settledVolumeKHR, "KHR")}
              </div>
            </>
          )}
        </div>

        {/* Auto Match Rate */}
        <div className="card" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: "var(--color-text-muted)", fontWeight: 500 }}>
              {isKm ? "អត្រាផ្ទៀងផ្ទាត់ស្វ័យប្រវត្តិ" : "Auto-Reconcile Rate"}
            </span>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(59, 130, 246, 0.12)", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ShieldCheck size={18} />
            </div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--color-accent)" }}>
            {data ? `${data.summary.auto_match_rate_pct}%` : "..."}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginTop: 4 }}>
            {isKm ? "កាត់កងកម្ចីដោយស្វ័យប្រវត្តិតាម Bill Ref" : "Instantly cleared via bill matching"}
          </div>
        </div>

        {/* Settled Transactions */}
        <div className="card" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: "var(--color-text-muted)", fontWeight: 500 }}>
              {isKm ? "ប្រតិបត្តិការបានកាត់កង" : "Settled Transactions"}
            </span>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(16, 185, 129, 0.12)", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FileCheck size={18} />
            </div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text)" }}>
            {data ? `${data.summary.settled_count} / ${data.summary.total_transactions}` : "..."}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginTop: 4 }}>
            {isKm ? "បានបញ្ជូនបង្កាន់ដៃរួចរាល់" : "Official receipts issued"}
          </div>
        </div>

        {/* Float / Pending Review */}
        <div className="card" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: "var(--color-text-muted)", fontWeight: 500 }}>
              {isKm ? "សាច់ប្រាក់រង់ចាំផ្ទៀងផ្ទាត់ (Float)" : "Unmatched Float Queue"}
            </span>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(245, 158, 11, 0.12)", color: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: (data?.summary.unmatched_count || 0) > 0 ? "var(--color-warning)" : "var(--color-text)" }}>
            {data ? `${data.summary.unmatched_count + data.summary.pending_count} ${isKm ? "ករណី" : "items"}` : "..."}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginTop: 4 }}>
            {isKm ? "ទាមទារការត្រួតពិនិត្យដោយបេឡាធិការ" : "Requires manual cashier assignment"}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="card"
        style={{
          padding: 16,
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            { id: "all", labelKm: "ប្រតិបត្តិការទាំងអស់", labelEn: "All Feed" },
            { id: "settled", labelKm: "បានកាត់កងជោគជ័យ", labelEn: "Settled" },
            { id: "pending_match", labelKm: "កំពុងរង់ចាំ", labelEn: "Pending Match" },
            { id: "unmatched_float", labelKm: "មិនទាន់ស្គាល់ម្ចាស់ (Float)", labelEn: "Unmatched Float" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`btn btn-sm ${statusFilter === tab.id ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setStatusFilter(tab.id)}
              style={{ borderRadius: 6, fontSize: 12.5 }}
            >
              {isKm ? tab.labelKm : tab.labelEn}
            </button>
          ))}
        </div>

        <div style={{ position: "relative", minWidth: 260 }}>
          <Search size={15} style={{ position: "absolute", left: 10, top: 10, color: "var(--color-text-muted)" }} />
          <input
            type="text"
            className="input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isKm ? "ស្វែងរកឈ្មោះ, ធនាគារ, Bill Ref..." : "Search payer, bank, bill ref..."}
            style={{ paddingLeft: 32, fontSize: 13, width: "100%", borderRadius: 6 }}
          />
        </div>
      </div>

      {/* Transactions Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--color-surface-sunken)", borderBottom: "1px solid var(--color-border)" }}>
                <th style={{ padding: "12px 16px", textAlign: "left" }}>{isKm ? "លេខប្រតិបត្តិការ / កាលបរិច្ឆេទ" : "Txn Ref / Date"}</th>
                <th style={{ padding: "12px 16px", textAlign: "left" }}>{isKm ? "អ្នកទូទាត់ & ធនាគារ" : "Payer & Source Bank"}</th>
                <th style={{ padding: "12px 16px", textAlign: "left" }}>{isKm ? "លេខយោងវិក្កយបត្រ (Bill Ref)" : "Bill Reference"}</th>
                <th style={{ padding: "12px 16px", textAlign: "right" }}>{isKm ? "ចំនួនទឹកប្រាក់" : "Amount Paid"}</th>
                <th style={{ padding: "12px 16px", textAlign: "center" }}>{isKm ? "ស្ថានភាពផ្ទៀងផ្ទាត់" : "Reconcile Status"}</th>
                <th style={{ padding: "12px 16px", textAlign: "center" }}>{isKm ? "សកម្មភាព" : "Action"}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "36px 0", color: "var(--color-text-muted)" }}>
                    <RefreshCw size={22} className="animate-spin" style={{ margin: "0 auto 8px" }} />
                    <div>{isKm ? "កំពុងទាញយកទិន្នន័យប្រតិបត្តិការ..." : "Loading Bakong transactions..."}</div>
                  </td>
                </tr>
              ) : filteredTxns.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "36px 0", color: "var(--color-text-muted)" }}>
                    {isKm ? "មិនមានប្រតិបត្តិការត្រូវនឹងលក្ខខណ្ឌស្វែងរកទេ" : "No Bakong transactions match your filter."}
                  </td>
                </tr>
              ) : (
                filteredTxns.map((t) => (
                  <tr key={t.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    {/* Ref & Date */}
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontWeight: 700, color: "var(--color-text)", fontFamily: "monospace" }}>{t.id}</div>
                      <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>{t.created_at}</div>
                    </td>

                    {/* Payer & Bank */}
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontWeight: 600, color: "var(--color-text)" }}>{t.payer_name}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--color-text-muted)", marginTop: 2 }}>
                        <Building2 size={12} style={{ color: "var(--color-accent)" }} />
                        <span>{t.payer_bank}</span>
                        <span>•</span>
                        <span>{t.payer_account}</span>
                      </div>
                    </td>

                    {/* Bill Ref */}
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontWeight: 600, color: "var(--color-accent)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <QrCode size={13} />
                        <span>{t.bill_number}</span>
                      </div>
                      {t.matched_loan_id && (
                        <div style={{ fontSize: 11, color: "var(--color-success)", marginTop: 2 }}>
                          {isKm ? "ភ្ជាប់កម្ចី #" : "Matched Loan #"}{t.matched_loan_id}
                        </div>
                      )}
                    </td>

                    {/* Amount */}
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <div style={{ fontWeight: 800, fontSize: 14, color: "var(--color-success)" }}>
                        {formatCurrency(t.amount, t.currency)}
                      </div>
                      {t.currency !== baseCurrency && (
                        <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>
                          ≈ {formatCurrency(convertCurrencyAmount(t.amount, t.currency, baseCurrency, usdToKhrRate), baseCurrency)}
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "3px 9px",
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 700,
                          background:
                            t.status === "settled"
                              ? "rgba(16, 185, 129, 0.12)"
                              : t.status === "pending_match"
                              ? "rgba(59, 130, 246, 0.12)"
                              : "rgba(245, 158, 11, 0.12)",
                          color:
                            t.status === "settled"
                              ? "#10b981"
                              : t.status === "pending_match"
                              ? "#3b82f6"
                              : "#f59e0b",
                        }}
                      >
                        {t.status === "settled" ? (
                          <>
                            <CheckCircle2 size={12} />
                            <span>{isKm ? "កាត់កងរួច" : "Settled"}</span>
                          </>
                        ) : t.status === "pending_match" ? (
                          <>
                            <Clock size={12} />
                            <span>{isKm ? "រង់ចាំផ្គូផ្គង" : "Pending Match"}</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle size={12} />
                            <span>{isKm ? "សាច់ប្រាក់ Float" : "Float Review"}</span>
                          </>
                        )}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      {t.status === "settled" ? (
                        <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                          {isKm ? "ផ្ទៀងផ្ទាត់ស្វ័យប្រវត្តិ" : "Auto Reconciled"}
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          onClick={() => {
                            setSelectedTxn(t);
                            setTargetLoanId(t.bill_number.startsWith("LN-") ? t.bill_number.replace("LN-2026-", "") : "");
                          }}
                          style={{ borderRadius: 6, fontSize: 12, padding: "4px 8px" }}
                        >
                          {isKm ? "ផ្គូផ្គងផ្ទាល់" : "Assign Loan"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Webhook Simulator Modal */}
      {showSimModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowSimModal(false)}
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
            style={{ width: "100%", maxWidth: 480, padding: 24, borderRadius: 16 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
                  {isKm ? "ក្លែងធ្វើការទូទាត់បាគង KHQR Webhook" : "Simulate Incoming Bakong KHQR Webhook"}
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--color-text-muted)" }}>
                  {isKm ? "ផ្ញើសារទូទាត់ដូចពិតពីធនាគារសមាជិកបាគងដើម្បីផ្ទៀងផ្ទាត់" : "Emulate real-time NBC Bakong payment payload."}
                </p>
              </div>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setShowSimModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSimulateWebhook}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 5 }}>
                    {isKm ? "ឈ្មោះអតិថិជនអ្នកបង់ប្រាក់" : "Payer Name"}
                  </label>
                  <input
                    type="text"
                    required
                    value={simName}
                    onChange={(e) => setSimName(e.target.value)}
                    className="input"
                    style={{ width: "100%" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 5 }}>
                      {isKm ? "ធនាគារអ្នកទូទាត់" : "Payer Bank"}
                    </label>
                    <select
                      value={simBank}
                      onChange={(e) => setSimBank(e.target.value)}
                      className="input"
                      style={{ width: "100%" }}
                    >
                      <option value="ABA Bank">ABA Bank</option>
                      <option value="ACLEDA Mobile">ACLEDA Mobile</option>
                      <option value="Wing Bank">Wing Bank</option>
                      <option value="Sathapana Bank">Sathapana Bank</option>
                      <option value="Canadia Bank">Canadia Bank</option>
                      <option value="Bakong App">Bakong Official App</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 5 }}>
                      {isKm ? "រូបិយប័ណ្ណ" : "Currency"}
                    </label>
                    <select
                      value={simCurrency}
                      onChange={(e) => {
                        const newCur = e.target.value as "USD" | "KHR";
                        setSimCurrency(newCur);
                        if (newCur === "KHR" && simAmount < 50000) {
                          setSimAmount(simAmount * (usdToKhrRate || 4100));
                        } else if (newCur === "USD" && simAmount >= 50000) {
                          setSimAmount(Math.round(simAmount / (usdToKhrRate || 4100)));
                        }
                      }}
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
                      {isKm ? "ចំនួនទឹកប្រាក់ទូទាត់" : "Payment Amount"}
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      step="any"
                      value={simAmount || ""}
                      onChange={(e) => setSimAmount(parseFloat(e.target.value) || 0)}
                      className="input"
                      style={{ width: "100%", fontWeight: 700 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 5 }}>
                      {isKm ? "លេខវិក្កយបត្រ / កម្ចី" : "Bill Reference / Loan"}
                    </label>
                    <input
                      type="text"
                      required
                      value={simBill}
                      onChange={(e) => setSimBill(e.target.value)}
                      placeholder="LN-2026-0012"
                      className="input"
                      style={{ width: "100%" }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
                <button type="button" className="btn" onClick={() => setShowSimModal(false)} disabled={simulating}>
                  {isKm ? "បោះបង់" : "Cancel"}
                </button>
                <button type="submit" className="btn btn-primary" disabled={simulating}>
                  {simulating ? (isKm ? "កំពុងដំណើរការ..." : "Emulating...") : (isKm ? "បញ្ជូន Webhook" : "Post Webhook")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Reconcile Modal */}
      {selectedTxn && (
        <div
          className="modal-backdrop"
          onClick={() => setSelectedTxn(null)}
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
            style={{ width: "100%", maxWidth: 460, padding: 24, borderRadius: 16 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
                  {isKm ? "ផ្គូផ្គងប្រតិបត្តិការសាច់ប្រាក់ Float" : "Reconcile Unmatched Float"}
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--color-text-muted)" }}>
                  {isKm ? `ប្រតិបត្តិការ ${selectedTxn.id}` : `Transaction ${selectedTxn.id}`}
                </p>
              </div>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setSelectedTxn(null)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ background: "var(--color-surface-sunken)", padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: "var(--color-text-muted)" }}>{isKm ? "អ្នកបង់ប្រាក់៖" : "Payer:"}</span>
                <span style={{ fontWeight: 600 }}>{selectedTxn.payer_name}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: "var(--color-text-muted)" }}>{isKm ? "ធនាគារ៖" : "Bank:"}</span>
                <span>{selectedTxn.payer_bank}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-text-muted)" }}>{isKm ? "ចំនួនទឹកប្រាក់៖" : "Amount:"}</span>
                <span style={{ fontWeight: 700, color: "var(--color-success)" }}>
                  {formatCurrency(selectedTxn.amount, selectedTxn.currency)}
                </span>
              </div>
            </div>

            <form onSubmit={handleManualReconcile}>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>
                  {isKm ? "លេខកូដកម្ចីដែលត្រូវកាត់កង *" : "Target Loan Reference / ID *"}
                </label>
                <input
                  type="text"
                  required
                  value={targetLoanId}
                  onChange={(e) => setTargetLoanId(e.target.value)}
                  placeholder={isKm ? "ឧ. 0012 ឬ LN-2026-0012" : "e.g. 0012 or LN-2026-0012"}
                  className="input"
                  style={{ width: "100%", fontSize: 14 }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button type="button" className="btn" onClick={() => setSelectedTxn(null)} disabled={reconciling}>
                  {isKm ? "បោះបង់" : "Cancel"}
                </button>
                <button type="submit" className="btn btn-primary" disabled={reconciling || !targetLoanId}>
                  {reconciling ? (isKm ? "កំពុងកាត់កង..." : "Reconciling...") : (isKm ? "បញ្ជាក់ការកាត់កង" : "Confirm Reconcile")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
