import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  CalendarClock,
  Play,
  CheckCircle2,
  AlertTriangle,
  History,
  ShieldAlert,
  DollarSign,
  TrendingDown,
  RefreshCw,
  Clock,
  ArrowRight,
  Info,
} from "lucide-react";
import {
  getEodStatus,
  runEodBatch,
  type EodStatusResponse,
} from "../../api/reports";
import { formatCurrency, formatDate, convertCurrencyAmount } from "../../utils/format";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useToast } from "../../context/ToastContext";
import { useBranding } from "../../context/BrandingContext";

export default function EodProcessing() {
  const { t, i18n } = useTranslation();
  const isKm = i18n.language === "km";
  useDocumentTitle(isKm ? "ដំណើរការបិទបញ្ជីចុងថ្ងៃ & គណនាពិន័យ" : "End-of-Day (EOD) Batch Engine");
  const toast = useToast();
  const { baseCurrency, usdToKhrRate } = useBranding();

  const [statusData, setStatusData] = useState<EodStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);
  const [lastResult, setLastResult] = useState<any | null>(null);

  function loadStatus() {
    setLoading(true);
    getEodStatus()
      .then(setStatusData)
      .catch((err) => {
        console.error("Failed to load EOD status:", err);
        toast.error(isKm ? "បរាជ័យក្នុងការទាញយកស្ថានភាព EOD" : "Failed to load EOD status");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadStatus();
  }, []);

  async function handleExecuteEod() {
    setConfirmModal(false);
    setRunning(true);
    try {
      const res = await runEodBatch();
      setLastResult(res.result);
      toast.success(
        isKm
          ? `ដំណើរការបិទបញ្ជី EOD ជោគជ័យ! បានអនុវត្តពិន័យលើកម្ចីចំនួន ${res.result.penalties_applied} វគ្គ។`
          : `EOD Batch completed successfully! Penalties applied to ${res.result.penalties_applied} installments.`
      );
      loadStatus();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || (isKm ? "បរាជ័យក្នុងដំណើរការ EOD" : "Failed to execute EOD batch"));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 10 }}>
            <CalendarClock size={26} color="var(--color-accent)" />
            {isKm ? "ដំណើរការបិទបញ្ជីចុងថ្ងៃ & គណនាពិន័យស្វ័យប្រវត្តិ" : "End-of-Day (EOD) Batch Engine & Penalty Accrual"}
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-muted)" }}>
            {isKm
              ? "ស្កេន និងគណនាប្រាក់ពិន័យលើកម្ចីហួសកាលកំណត់ (លើសរយៈពេលអនុគ្រោះ) និងធ្វើបច្ចុប្បន្នភាពកម្រិតចំណាត់ថ្នាក់ NBC"
              : "Automated batch engine for daily overdue penalties calculation, grace period audits, and NBC delinquency reclassification"}
          </p>
        </div>

        <div className="page-actions" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            className="btn btn-sm"
            onClick={loadStatus}
            disabled={loading || running}
            style={{ borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            {isKm ? "ផ្ទុកឡើងវិញ" : "Refresh"}
          </button>
        </div>
      </div>

      {/* Main Execution Banner Card */}
      <div
        className="card"
        style={{
          padding: 24,
          background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
          color: "#ffffff",
          borderRadius: 16,
          marginBottom: 24,
          boxShadow: "0 10px 25px -5px rgba(49, 46, 129, 0.3)",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 20 }}>
          <div style={{ maxWidth: 560 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.15)", padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 700, marginBottom: 10 }}>
              <Clock size={12} />
              <span>{isKm ? "កាលបរិច្ឆេទប្រព័ន្ធ៖ " : "System Date: "} {statusData?.today_date}</span>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 8px", color: "#ffffff" }}>
              {isKm ? "ដំណើរការបិទបញ្ជីប្រចាំថ្ងៃ" : "Daily End-of-Day Execution"}
            </h2>
            <p style={{ margin: 0, fontSize: 13, color: "#c7d2fe", lineHeight: 1.6 }}>
              {isKm
                ? "ការដំណើរការនេះនឹងធ្វើការត្រួតពិនិត្យកម្ចីសកម្មទាំងអស់ រកឃើញវគ្គដែលហួសកាលកំណត់លើសពី ៣ ថ្ងៃអនុគ្រោះ គណនាប្រាក់ពិន័យ ២% និងកែប្រែស្ថានភាពកម្ចីទៅជាហួសកំណត់ (Overdue) ដោយស្វ័យប្រវត្តិ។"
                : "This routine evaluates all active loans, identifies unpaid installments beyond the 3-day grace period, applies the 2% late penalty, and updates NBC delinquency categories."}
            </p>
          </div>

          <div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setConfirmModal(true)}
              disabled={running}
              style={{
                background: "var(--color-danger)",
                borderColor: "var(--color-danger)",
                padding: "12px 24px",
                fontSize: 15,
                fontWeight: 800,
                borderRadius: 10,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                boxShadow: "0 4px 14px rgba(239, 68, 68, 0.4)",
              }}
            >
              <Play size={18} className={running ? "animate-spin" : ""} />
              <span>{running ? (isKm ? "កំពុងដំណើរការ..." : "Executing Batch...") : (isKm ? "ដំណើរការបិទបញ្ជីឥឡូវនេះ" : "Run EOD Batch Now")}</span>
            </button>
          </div>
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
        {/* Monitored Loans */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
            {isKm ? "កម្ចីសកម្មត្រូវបានត្រួតពិនិត្យ" : "Active Loans Evaluated"}
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: "var(--color-accent)" }}>
            {statusData?.active_loans_count || 0}
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>
            {isKm ? "កម្ចីទូទាំងស្ថាប័ន" : "Across all branches"}
          </div>
        </div>

        {/* Pending Penalties */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-warning)", textTransform: "uppercase" }}>
            {isKm ? "វគ្គហួសកំណត់ត្រូវអនុវត្តពិន័យ" : "Pending Overdue Installments"}
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: "var(--color-warning)" }}>
            {statusData?.pending_penalties_count || 0}
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>
            {isKm ? "លើសរយៈពេលអនុគ្រោះ" : "Past grace period"}
          </div>
        </div>

        {/* Estimated Penalty Volume */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-danger)", textTransform: "uppercase" }}>
            {isKm ? "ប៉ាន់ស្មានប្រាក់ពិន័យសរុប" : "Estimated Penalties Accrual"}
          </div>
          <div className="num" style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: "var(--color-danger)" }}>
            {formatCurrency(
              convertCurrencyAmount(statusData?.estimated_penalties_usd || 0, "USD", baseCurrency, usdToKhrRate),
              baseCurrency
            )}
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>
            {isKm ? "អត្រាពិន័យ ២%" : "At 2% late fee rate"}
          </div>
        </div>

        {/* Engine Status */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
            {isKm ? "ស្ថានភាពប្រព័ន្ធ EOD" : "Engine Status"}
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4, color: "var(--color-success)", display: "flex", alignItems: "center", gap: 6 }}>
            <CheckCircle2 size={20} />
            <span>{isKm ? "ត្រៀមរួចរាល់" : "Ready"}</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>
            {isKm ? "ទិន្នន័យស្របតាម NBC" : "NBC compliance synchronized"}
          </div>
        </div>
      </div>

      {/* Last Execution Summary (if available) */}
      {(lastResult || statusData?.last_run) && (
        <div className="card" style={{ padding: 20, marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 14px", display: "flex", alignItems: "center", gap: 8 }}>
            <History size={18} color="var(--color-accent)" />
            {isKm ? "លទ្ធផលនៃដំណើរការបិទបញ្ជីចុងក្រោយ" : "Latest EOD Batch Execution Report"}
          </h3>

          {(() => {
            const r = lastResult || statusData?.last_run;
            return (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, background: "var(--color-surface-sunken)", border: "1px solid var(--color-border)", borderRadius: 10, padding: 16, fontSize: 13 }}>
                <div>
                  <span style={{ color: "var(--color-text-muted)", display: "block", fontSize: 11 }}>{isKm ? "លេខកូដដំណើរការ" : "Run Reference"}</span>
                  <strong style={{ color: "var(--color-accent)" }}>{r.run_id}</strong>
                </div>
                <div>
                  <span style={{ color: "var(--color-text-muted)", display: "block", fontSize: 11 }}>{isKm ? "កាលបរិច្ឆេទ & ពេលវេលា" : "Date & Time"}</span>
                  <strong style={{ color: "var(--color-text)" }}>{formatDate(r.date, isKm ? "km" : "en")}</strong>
                </div>
                <div>
                  <span style={{ color: "var(--color-text-muted)", display: "block", fontSize: 11 }}>{isKm ? "ពិន័យដែលបានអនុវត្ត" : "Penalties Applied"}</span>
                  <strong style={{ color: "var(--color-warning)" }}>{r.penalties_applied} {isKm ? "វគ្គ" : "installments"}</strong>
                </div>
                <div>
                  <span style={{ color: "var(--color-text-muted)", display: "block", fontSize: 11 }}>{isKm ? "ទឹកប្រាក់ពិន័យសរុប" : "Total Penalty"}</span>
                  <strong style={{ color: "var(--color-danger)" }}>
                    {formatCurrency(
                      convertCurrencyAmount(r.total_penalty_usd, "USD", baseCurrency, usdToKhrRate),
                      baseCurrency
                    )}
                  </strong>
                </div>
                <div>
                  <span style={{ color: "var(--color-text-muted)", display: "block", fontSize: 11 }}>{isKm ? "កម្ចីប្តូរទៅជាហួសកំណត់" : "Reclassified to Overdue"}</span>
                  <strong style={{ color: "var(--color-danger)" }}>{r.reclassified_loans} {isKm ? "កម្ចី" : "loans"}</strong>
                </div>
                <div>
                  <span style={{ color: "var(--color-text-muted)", display: "block", fontSize: 11 }}>{isKm ? "ប្រតិបត្តិករ" : "Operator"}</span>
                  <strong style={{ color: "var(--color-text)" }}>{r.executed_by}</strong>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* NBC Compliance Rules Card */}
      <div className="card" style={{ padding: 20 }}>
        <h4 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, color: "var(--color-accent)" }}>
          <Info size={16} />
          {isKm ? "បទប្បញ្ញត្តិស្ដីពីការបិទបញ្ជី និងការគណនាប្រាក់ពិន័យ (NBC Standards)" : "Central Bank NBC Delinquency & Penalty Standards"}
        </h4>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, lineHeight: 1.7, color: "var(--color-text-muted)" }}>
          <li>{isKm ? "រយៈពេលអនុគ្រោះ (Grace Period)៖ ៣ ថ្ងៃ គិតចាប់ពីកាលបរិច្ឆេទត្រូវសង ប្រសិនបើមិនទាន់បង់ទេនោះប្រព័ន្ធនឹងមិនគិតពិន័យឡើយ។" : "Grace Period: 3 days from the due date before penalty calculations take effect."}</li>
          <li>{isKm ? "អត្រាពិន័យ (Late Penalty)៖ ២% លើចំនួនប្រាក់ដើមនៃវគ្គដែលហួសកាលកំណត់។" : "Late Fee Rate: 2.0% calculated on the overdue installment balance."}</li>
          <li>{isKm ? "ការចាត់ថ្នាក់ឡើងវិញ (Reclassification)៖ កម្ចីដែលហួសកំណត់ចាប់ពី ៣០ ថ្ងៃឡើងទៅ ត្រូវបានចាត់ចូលក្នុងកម្រិតហានិភ័យ (PAR > 30 Days)។" : "Portfolio At Risk: Loans overdue > 30 days are automatically classified into regulatory PAR watch categories."}</li>
        </ul>
      </div>

      {/* Confirmation Modal */}
      {confirmModal && (
        <div
          className="modal-backdrop"
          onClick={() => setConfirmModal(false)}
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
              maxWidth: 440,
              padding: 24,
              borderRadius: 16,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
              textAlign: "center",
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div style={{ width: 50, height: 50, borderRadius: "50%", background: "var(--color-danger-soft)", color: "var(--color-danger)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <ShieldAlert size={26} />
            </div>

            <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700, color: "var(--color-text)" }}>
              {isKm ? "បញ្ជាក់ការដំណើរការបិទបញ្ជី EOD" : "Confirm EOD Batch Execution"}
            </h3>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: "var(--color-text-muted)", lineHeight: 1.5 }}>
              {isKm
                ? "តើអ្នកប្រាកដជាចង់ដំណើរការស្កេន និងអនុវត្តប្រាក់ពិន័យលើកម្ចីហួសកាលកំណត់ទាំងអស់សម្រាប់ថ្ងៃនេះមែនទេ? សកម្មភាពនេះនឹងត្រូវបានកត់ត្រាក្នុង Audit Log។"
                : "Are you sure you want to run the End-of-Day batch processing? This will calculate and apply late fees to overdue loans and be permanently recorded in the Audit Log."}
            </p>

            <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
              <button
                type="button"
                className="btn"
                onClick={() => setConfirmModal(false)}
                style={{ borderRadius: 8 }}
              >
                {isKm ? "បោះបង់" : "Cancel"}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleExecuteEod}
                style={{ borderRadius: 8, background: "var(--color-danger)", borderColor: "var(--color-danger)" }}
              >
                {isKm ? "យល់ព្រមដំណើរការ" : "Confirm & Run"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
