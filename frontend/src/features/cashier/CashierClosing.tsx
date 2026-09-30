import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Banknote,
  DollarSign,
  Receipt,
  Calculator,
  Printer,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Calendar,
  Layers,
  FileCheck,
  Building,
  User,
  Clock,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";
import {
  getCashierDailySummary,
  submitCashierReconciliation,
  type CashierSummaryResponse,
} from "../../api/reports";
import { formatCurrency, formatDate } from "../../utils/format";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useToast } from "../../context/ToastContext";
import { useBranding } from "../../context/BrandingContext";
import { useAuth } from "../../context/AuthContext";

export default function CashierClosing() {
  useDocumentTitle("Daily Cashier Reconciliation");
  const { t, i18n } = useTranslation();
  const isKm = i18n.language === "km";
  const toast = useToast();
  const { user } = useAuth();
  const { companyName } = useBranding();

  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<CashierSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState("");
  const [voucherId, setVoucherId] = useState<string | null>(null);

  // Cash Denomination Quantities (USD)
  const [usd100, setUsd100] = useState<number>(0);
  const [usd50, setUsd50] = useState<number>(0);
  const [usd20, setUsd20] = useState<number>(0);
  const [usd10, setUsd10] = useState<number>(0);
  const [usd5, setUsd5] = useState<number>(0);
  const [usd1, setUsd1] = useState<number>(0);

  // Cash Denomination Quantities (KHR)
  const [khr50000, setKhr50000] = useState<number>(0);
  const [khr20000, setKhr20000] = useState<number>(0);
  const [khr10000, setKhr10000] = useState<number>(0);
  const [khr5000, setKhr5000] = useState<number>(0);
  const [khr1000, setKhr1000] = useState<number>(0);
  const [khr500, setKhr500] = useState<number>(0);
  const [khr100, setKhr100] = useState<number>(0);

  // Opening Drawer Balances
  const [openingUsd, setOpeningUsd] = useState<number>(0);
  const [openingKhr, setOpeningKhr] = useState<number>(0);

  function loadSummary() {
    setLoading(true);
    getCashierDailySummary(selectedDate)
      .then(setData)
      .catch((err) => {
        console.error("Failed to load cashier summary:", err);
        toast.error(isKm ? "បរាជ័យក្នុងការទាញយកទិន្នន័យបេឡា" : "Failed to load cashier summary.");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadSummary();
  }, [selectedDate]);

  // Physical Count Totals
  const totalCountedUsd = useMemo(() => {
    return usd100 * 100 + usd50 * 50 + usd20 * 20 + usd10 * 10 + usd5 * 5 + usd1 * 1;
  }, [usd100, usd50, usd20, usd10, usd5, usd1]);

  const totalCountedKhr = useMemo(() => {
    return (
      khr50000 * 50000 +
      khr20000 * 20000 +
      khr10000 * 10000 +
      khr5000 * 5000 +
      khr1000 * 1000 +
      khr500 * 500 +
      khr100 * 100
    );
  }, [khr50000, khr20000, khr10000, khr5000, khr1000, khr500, khr100]);

  // System Expected Totals
  const expectedUsd = useMemo(() => {
    if (!data) return 0;
    return openingUsd + data.summary.cash_in_usd - data.summary.disbursed_usd;
  }, [data, openingUsd]);

  const expectedKhr = useMemo(() => {
    if (!data) return 0;
    return openingKhr + data.summary.cash_in_khr - data.summary.disbursed_khr;
  }, [data, openingKhr]);

  // Variances
  const varianceUsd = totalCountedUsd - expectedUsd;
  const varianceKhr = totalCountedKhr - expectedKhr;

  async function handleReconcile() {
    setSubmitting(true);
    try {
      const res = await submitCashierReconciliation({
        report_date: selectedDate,
        counted_usd: totalCountedUsd,
        counted_khr: totalCountedKhr,
        expected_usd: expectedUsd,
        expected_khr: expectedKhr,
        variance_usd: varianceUsd,
        variance_khr: varianceKhr,
        notes,
      });
      if (res.ok) {
        setVoucherId(res.voucher_id);
        toast.success(
          isKm
            ? `បានកត់ត្រាការបិទបញ្ជីបេឡាជោគជ័យ! ប័ណ្ណយោង៖ ${res.voucher_id}`
            : `Cashier reconciliation submitted! Ref: ${res.voucher_id}`
        );
      }
    } catch (err: any) {
      console.error("Reconciliation error:", err);
      const detail = err?.response?.data?.detail;
      toast.error(
        detail
          ? `${isKm ? "បរាជ័យក្នុងការកត់ត្រាបិទបញ្ជីបេឡា" : "Failed to submit reconciliation"}: ${detail}`
          : (isKm ? "បរាជ័យក្នុងការកត់ត្រាបិទបញ្ជីបេឡា" : "Failed to submit reconciliation.")
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      {/* Official Print Header (Visible only when printed) */}
      <div className="print-only" style={{ display: "none", marginBottom: 24, borderBottom: "2px solid #0f172a", paddingBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, textTransform: "uppercase", color: "#0f172a", fontWeight: 900 }}>
              {companyName}
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#475569" }}>
              {isKm ? "ប័ណ្ណផ្ទៀងផ្ទាត់ និងបិទបញ្ជីបេឡាប្រចាំថ្ងៃផ្លូវការ" : "Official Daily Cashier Closing & Reconciliation Voucher"}
            </p>
          </div>
          <div style={{ textAlign: "right", fontSize: 12, color: "#64748b" }}>
            <div style={{ fontWeight: 700, color: "#0f172a" }}>
              {isKm ? "លេខប័ណ្ណបិទបញ្ជី៖ " : "Voucher Ref: "}{voucherId || `EOD-${selectedDate.replace(/-/g, "")}`}
            </div>
            <div>{isKm ? "កាលបរិច្ឆេទប្រតិបត្តិការ៖ " : "Business Date: "}{formatDate(selectedDate, isKm ? "km" : "en")}</div>
            <div>{isKm ? "បេឡាករទទួលបន្ទុក៖ " : "Teller: "}{user?.name || "System Cashier"}</div>
          </div>
        </div>
      </div>

      {/* Screen Page Header */}
      <div className="page-header no-print" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 10 }}>
            <Banknote size={26} color="#059669" />
            {isKm ? "បិទបញ្ជីបេឡា & ផ្ទៀងផ្ទាត់សាច់ប្រាក់ប្រចាំថ្ងៃ" : "Daily Cashier Reconciliation & Teller Closing Drawer"}
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-muted)" }}>
            {isKm
              ? "ផ្ទៀងផ្ទាត់តុល្យភាពសាច់ប្រាក់ជាក់ស្តែងក្នុងថតបេឡាធៀបនឹងទិន្នន័យប្រព័ន្ធ និងបោះពុម្ពប័ណ្ណបិទបញ្ជី"
              : "Reconcile actual physical cash drawer count against system transactions and issue daily EoD closing voucher"}
          </p>
        </div>

        <div className="page-actions" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--color-text-muted)" }}>
            <Calendar size={15} />
            <input
              type="date"
              className="input"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ padding: "6px 12px", fontSize: 13, borderRadius: 8 }}
            />
          </div>

          <button
            type="button"
            className="btn btn-sm"
            onClick={loadSummary}
            disabled={loading}
            style={{ borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            {isKm ? "ផ្ទុកឡើងវិញ" : "Refresh"}
          </button>

          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => window.print()}
            style={{ borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Printer size={15} />
            {isKm ? "បោះពុម្ពប័ណ្ណបិទបញ្ជី" : "Print EoD Voucher"}
          </button>
        </div>
      </div>

      {/* KPI Cards Summary */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginBottom: 24,
        }}
      >
        {/* Cash In Collections */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                {isKm ? "ចំណូលសាច់ប្រាក់សុទ្ធ" : "Cash Collections (In)"}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, color: "#059669" }}>
                {formatCurrency(data?.summary.cash_in_usd || 0, "USD")}
              </div>
            </div>
            <div style={{ width: 38, height: 38, borderRadius: 8, background: "#ecfdf5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ArrowDownRight size={20} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 6 }}>
            {isKm ? "ប្រាក់រៀល៖ " : "KHR: "}{formatCurrency(data?.summary.cash_in_khr || 0, "KHR")}
          </div>
        </div>

        {/* Non-Cash / Digital Bank */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                {isKm ? "ប្រព័ន្ធឌីជីថល និងផ្ទេរប្រាក់" : "Digital Collections (Non-Cash)"}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, color: "#3b82f6" }}>
                {formatCurrency(data?.summary.non_cash_in_usd || 0, "USD")}
              </div>
            </div>
            <div style={{ width: 38, height: 38, borderRadius: 8, background: "#eff6ff", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Receipt size={20} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 6 }}>
            {isKm ? "ប្រាក់រៀល៖ " : "KHR: "}{formatCurrency(data?.summary.non_cash_in_khr || 0, "KHR")}
          </div>
        </div>

        {/* Cash Disbursed */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                {isKm ? "ចំណាយបើកប្រាក់កម្ចី" : "Loans Disbursed (Out)"}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, color: "#ef4444" }}>
                {formatCurrency(data?.summary.disbursed_usd || 0, "USD")}
              </div>
            </div>
            <div style={{ width: 38, height: 38, borderRadius: 8, background: "#fef2f2", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ArrowUpRight size={20} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 6 }}>
            {isKm ? "ប្រាក់រៀល៖ " : "KHR: "}{formatCurrency(data?.summary.disbursed_khr || 0, "KHR")}
          </div>
        </div>

        {/* Expected Drawer Total */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                {isKm ? "តុល្យភាពប្រព័ន្ធរំពឹងទុក" : "System Expected Cash"}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, color: "#8b5cf6" }}>
                {formatCurrency(expectedUsd, "USD")}
              </div>
            </div>
            <div style={{ width: 38, height: 38, borderRadius: 8, background: "#f5f3ff", color: "#8b5cf6", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Calculator size={20} />
            </div>
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 6 }}>
            {isKm ? "ប្រាក់រៀល៖ " : "KHR: "}{formatCurrency(expectedKhr, "KHR")}
          </div>
        </div>
      </div>

      {/* Main Grid: Denomination Counter (Left) & Reconciliation Result (Right) */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 20, marginBottom: 24 }}>
        {/* Physical Cash Denomination Counter */}
        <div className="card" style={{ padding: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "1px solid var(--color-border)", paddingBottom: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <Banknote size={18} color="#059669" />
              {isKm ? "តារាងរាប់ក្រដាសប្រាក់ជាក់ស្តែងក្នុងថតបេឡា" : "Physical Cash Denomination Counter"}
            </h2>
            <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
              {isKm ? "បញ្ចូលចំនួនសន្លឹកក្រដាសប្រាក់" : "Input bill counts"}
            </span>
          </div>

          {/* Opening Drawer Balance Inputs */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16, padding: 12, background: "var(--color-bg-secondary)", borderRadius: 8 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                {isKm ? "ប្រាក់ដើមគ្រាបេឡា (USD)" : "Opening Cash (USD)"}
              </label>
              <input
                type="number"
                min="0"
                step="any"
                className="input"
                value={openingUsd}
                onChange={(e) => setOpeningUsd(Number(e.target.value) || 0)}
                style={{ width: "100%", padding: "6px 10px", fontSize: 13, borderRadius: 6 }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                {isKm ? "ប្រាក់ដើមគ្រាបេឡា (KHR)" : "Opening Cash (KHR)"}
              </label>
              <input
                type="number"
                min="0"
                step="any"
                className="input"
                value={openingKhr}
                onChange={(e) => setOpeningKhr(Number(e.target.value) || 0)}
                style={{ width: "100%", padding: "6px 10px", fontSize: 13, borderRadius: 6 }}
              />
            </div>
          </div>

          {/* USD Denominations Table */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#059669", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
              <span>{isKm ? "ក្រដាសប្រាក់ដុល្លារ" : "US Dollar Bills"}</span>
              <span>{isKm ? "សរុប៖ " : "Total: "}{formatCurrency(totalCountedUsd, "USD")}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {[
                { label: "$100", val: usd100, set: setUsd100, denom: 100 },
                { label: "$50", val: usd50, set: setUsd50, denom: 50 },
                { label: "$20", val: usd20, set: setUsd20, denom: 20 },
                { label: "$10", val: usd10, set: setUsd10, denom: 10 },
                { label: "$5", val: usd5, set: setUsd5, denom: 5 },
                { label: "$1", val: usd1, set: setUsd1, denom: 1 },
              ].map((item) => (
                <div key={item.label} style={{ border: "1px solid var(--color-border)", borderRadius: 6, padding: "6px 8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700 }}>
                    <span>{item.label}</span>
                    <span style={{ color: "var(--color-text-muted)" }}>= ${(item.val * item.denom).toLocaleString()}</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    className="input"
                    value={item.val || ""}
                    placeholder="0"
                    onChange={(e) => item.set(Math.max(0, parseInt(e.target.value) || 0))}
                    style={{ width: "100%", padding: "4px 6px", fontSize: 12, marginTop: 4, borderRadius: 4 }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* KHR Denominations Table */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#d97706", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
              <span>{isKm ? "ក្រដាសប្រាក់រៀល" : "Khmer Riel Bills"}</span>
              <span>{isKm ? "សរុប៖ " : "Total: "}{formatCurrency(totalCountedKhr, "KHR")}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {[
                { label: "50,000 ៛", val: khr50000, set: setKhr50000, denom: 50000 },
                { label: "20,000 ៛", val: khr20000, set: setKhr20000, denom: 20000 },
                { label: "10,000 ៛", val: khr10000, set: setKhr10000, denom: 10000 },
                { label: "5,000 ៛", val: khr5000, set: setKhr5000, denom: 5000 },
                { label: "1,000 ៛", val: khr1000, set: setKhr1000, denom: 1000 },
                { label: "500 ៛", val: khr500, set: setKhr500, denom: 500 },
                { label: "100 ៛", val: khr100, set: setKhr100, denom: 100 },
              ].map((item) => (
                <div key={item.label} style={{ border: "1px solid var(--color-border)", borderRadius: 6, padding: "6px 8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: 700 }}>
                    <span>{item.label}</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    className="input"
                    value={item.val || ""}
                    placeholder="0"
                    onChange={(e) => item.set(Math.max(0, parseInt(e.target.value) || 0))}
                    style={{ width: "100%", padding: "4px 6px", fontSize: 12, marginTop: 4, borderRadius: 4 }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Reconciliation Statement & Sign-off */}
        <div className="card" style={{ padding: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "1px solid var(--color-border)", paddingBottom: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <FileCheck size={18} color="#3b82f6" />
              {isKm ? "លទ្ធផលផ្ទៀងផ្ទាត់ & កត់ត្រាបិទបញ្ជី" : "Reconciliation Verdict & EoD Sign-off"}
            </h2>
            {Math.abs(varianceUsd) < 0.01 && Math.abs(varianceKhr) < 100 ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 12, background: "#ecfdf5", color: "#047857", fontSize: 12, fontWeight: 700 }}>
                <CheckCircle2 size={13} /> {isKm ? "បេឡាត្រឹមត្រូវ ១០០%" : "Balanced"}
              </span>
            ) : (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 12, background: "#fef2f2", color: "#b91c1c", fontSize: 12, fontWeight: 700 }}>
                <AlertTriangle size={13} /> {isKm ? "មានភាពខុសគ្នា" : "Variance Detected"}
              </span>
            )}
          </div>

          {/* Variance Breakdown Box */}
          <div style={{ background: "var(--color-bg-secondary)", borderRadius: 10, padding: 16, marginBottom: 18 }}>
            {/* USD Variance */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{isKm ? "ប្រាក់ដុល្លារអាមេរិក (USD)" : "US Dollar Cash"}</div>
                <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                  {isKm ? "ជាក់ស្តែង៖ " : "Counted: "}{formatCurrency(totalCountedUsd, "USD")} | {isKm ? "ប្រព័ន្ធ៖ " : "System: "}{formatCurrency(expectedUsd, "USD")}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: varianceUsd === 0 ? "#059669" : (varianceUsd > 0 ? "#3b82f6" : "#ef4444") }}>
                  {varianceUsd > 0 ? `+${formatCurrency(varianceUsd, "USD")}` : formatCurrency(varianceUsd, "USD")}
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>
                  {varianceUsd === 0 ? (isKm ? "ត្រឹមត្រូវ" : "Balanced") : (varianceUsd > 0 ? (isKm ? "ប្រាក់លើស" : "Surplus") : (isKm ? "ប្រាក់ខ្វះ" : "Shortage"))}
                </div>
              </div>
            </div>

            {/* KHR Variance */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--color-border)", paddingTop: 12 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{isKm ? "ប្រាក់រៀលខ្មែរ (KHR)" : "Khmer Riel Cash"}</div>
                <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                  {isKm ? "ជាក់ស្តែង៖ " : "Counted: "}{formatCurrency(totalCountedKhr, "KHR")} | {isKm ? "ប្រព័ន្ធ៖ " : "System: "}{formatCurrency(expectedKhr, "KHR")}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: varianceKhr === 0 ? "#059669" : (varianceKhr > 0 ? "#3b82f6" : "#ef4444") }}>
                  {varianceKhr > 0 ? `+${formatCurrency(varianceKhr, "KHR")}` : formatCurrency(varianceKhr, "KHR")}
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>
                  {varianceKhr === 0 ? (isKm ? "ត្រឹមត្រូវ" : "Balanced") : (varianceKhr > 0 ? (isKm ? "ប្រាក់លើស" : "Surplus") : (isKm ? "ប្រាក់ខ្វះ" : "Shortage"))}
                </div>
              </div>
            </div>
          </div>

          {/* Notes textarea */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
              {isKm ? "កំណត់ចំណាំរបស់បេឡាករ / មន្ត្រីទទួលបន្ទុក" : "Cashier EoD Closing Notes"}
            </label>
            <textarea
              className="input"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={isKm ? "បញ្ជាក់អំពីមូលហេតុប្រាក់លើស/ខ្វះ ឬចំណាំប្រតិបត្តិការ..." : "Explain any cash variances or end of day notes..."}
              style={{ width: "100%", fontSize: 13, padding: 10, borderRadius: 8, resize: "vertical" }}
            />
          </div>

          {/* Submit Action */}
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleReconcile}
            disabled={submitting}
            style={{ width: "100%", padding: "10px 16px", borderRadius: 8, fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            <FileCheck size={16} />
            <span>{submitting ? (isKm ? "កំពុងកត់ត្រា..." : "Recording...") : (isKm ? "កត់ត្រាការបិទបញ្ជីបេឡាផ្លូវការ" : "Confirm & Submit EoD Closing")}</span>
          </button>

          {/* Print Signatures Block (Visible when printed) */}
          <div className="print-only" style={{ display: "none", marginTop: 40, borderTop: "1px dashed #cbd5e1", paddingTop: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, textAlign: "center" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>{isKm ? "ហត្ថលេខាបេឡាករ" : "Cashier Signature"}</div>
                <div style={{ height: 60 }}></div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{user?.name || "Cashier"}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>{isKm ? "ហត្ថលេខាប្រធានសាខា / អ្នកគ្រប់គ្រង" : "Branch Manager Approval"}</div>
                <div style={{ height: 60 }}></div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>___________________________</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Transactions Log Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <Receipt size={18} color="#059669" />
            {isKm ? "ប្រតិបត្តិការចំណូលសាច់ប្រាក់ និងបេឡាប្រចាំថ្ងៃ" : "Today's Payment Transactions"}
          </h2>
          <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
            {isKm ? "ចំនួនប្រតិបត្តិការ៖ " : "Total records: "}{data?.payments.length || 0}
          </span>
        </div>

        <div className="table-container" style={{ margin: 0 }}>
          <table className="table" style={{ width: "100%", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ padding: "12px 16px" }}>{isKm ? "អតិថិជន / អ្នកខ្ចី" : "Borrower"}</th>
                <th style={{ padding: "12px 16px" }}>{isKm ? "វិធីសាស្ត្រទូទាត់" : "Method"}</th>
                <th style={{ padding: "12px 16px" }}>{isKm ? "បេឡាករ" : "Teller"}</th>
                <th style={{ padding: "12px 16px" }}>{isKm ? "ពេលវេលា" : "Time"}</th>
                <th style={{ padding: "12px 16px", textAlign: "right" }}>{isKm ? "ចំនួនទឹកប្រាក់" : "Amount"}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: 30, color: "var(--color-text-muted)" }}>
                    <div className="skeleton skeleton-text" style={{ maxWidth: 260, margin: "0 auto" }}></div>
                  </td>
                </tr>
              ) : !data?.payments || data.payments.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: 40, color: "var(--color-text-muted)" }}>
                    {isKm ? "មិនមានប្រតិបត្តិការប្រាក់ចូលក្នុងថ្ងៃនេះទេ" : "No cash or digital payments recorded on this date"}
                  </td>
                </tr>
              ) : (
                data.payments.map((p) => (
                  <tr key={p.payment_id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td style={{ padding: "12px 16px", fontWeight: 600 }}>{p.client_name}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "2px 8px",
                          borderRadius: 12,
                          fontSize: 11,
                          fontWeight: 700,
                          background: p.method === "cash" ? "#ecfdf5" : "#eff6ff",
                          color: p.method === "cash" ? "#047857" : "#1d4ed8",
                        }}
                      >
                        {p.method === "cash" ? (isKm ? "សាច់ប្រាក់សុទ្ធ" : "Cash") : (isKm ? "ឌីជីថល / ធនាគារ" : p.method.toUpperCase())}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--color-text-muted)" }}>{p.teller_name}</td>
                    <td style={{ padding: "12px 16px", color: "var(--color-text-muted)" }}>
                      {p.paid_at ? new Date(p.paid_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, color: "#059669" }}>
                      {formatCurrency(p.amount, p.currency)}
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
