import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  Calculator,
  Printer,
  DollarSign,
  Calendar,
  Percent,
  TrendingDown,
  Clock,
  ArrowRight,
  FileSpreadsheet,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { formatCurrency, formatDate } from "../../utils/format";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useBranding } from "../../context/BrandingContext";

export default function LoanCalculator() {
  const { t, i18n } = useTranslation();
  const isKm = i18n.language === "km";
  useDocumentTitle(isKm ? "ម៉ាស៊ីនគណនាកម្ចី & តារាងបង់រំលស់" : "Loan Calculator & Amortization Schedule");
  const { companyName, websiteName, baseCurrency, usdToKhrRate } = useBranding();

  // Inputs
  const [currency, setCurrency] = useState<"USD" | "KHR">(baseCurrency || "USD");
  const [principal, setPrincipal] = useState<number>(baseCurrency === "KHR" ? 20000000 : 5000);
  const [termMonths, setTermMonths] = useState<number>(12);
  const [monthlyRate, setMonthlyRate] = useState<number>(1.2);
  const [method, setMethod] = useState<"flat" | "reducing">("flat");
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [gracePeriod, setGracePeriod] = useState<number>(0);

  // Synchronize when base currency setting changes
  useEffect(() => {
    if (baseCurrency) {
      setCurrency(baseCurrency);
      setPrincipal(baseCurrency === "KHR" ? 20000000 : 5000);
    }
  }, [baseCurrency]);


  // Amortization Schedule Calculation
  const schedule = useMemo(() => {
    const p = Math.max(0, principal);
    const n = Math.max(1, termMonths);
    const r = Math.max(0, monthlyRate) / 100;
    const g = Math.min(gracePeriod, n - 1);
    const activeTerms = Math.max(1, n - g);

    const rows = [];
    let remainingPrincipal = p;
    let totalInterest = 0;

    const startDt = new Date(startDate || new Date());

    if (method === "flat") {
      // Flat Rate: Constant monthly interest based on initial principal
      const monthlyPrincipal = p / activeTerms;
      const monthlyInterest = p * r;

      for (let i = 1; i <= n; i++) {
        const dueDate = new Date(startDt);
        dueDate.setMonth(dueDate.getMonth() + i);

        const isGrace = i <= g;
        const princPaid = isGrace ? 0 : monthlyPrincipal;
        const intPaid = monthlyInterest;
        const totalInstallment = princPaid + intPaid;

        remainingPrincipal = Math.max(0, remainingPrincipal - princPaid);
        totalInterest += intPaid;

        rows.push({
          period: i,
          dueDate: dueDate.toISOString().split("T")[0],
          isGrace,
          principalPaid: princPaid,
          interestPaid: intPaid,
          totalInstallment,
          remainingBalance: remainingPrincipal,
        });
      }
    } else {
      // Reducing Balance (Amortized Equal Installment)
      const monthlyAmort = r === 0 ? p / activeTerms : (p * r * Math.pow(1 + r, activeTerms)) / (Math.pow(1 + r, activeTerms) - 1);

      for (let i = 1; i <= n; i++) {
        const dueDate = new Date(startDt);
        dueDate.setMonth(dueDate.getMonth() + i);

        const isGrace = i <= g;
        const intPaid = remainingPrincipal * r;
        let princPaid = 0;
        let totalInstallment = 0;

        if (isGrace) {
          princPaid = 0;
          totalInstallment = intPaid;
        } else {
          princPaid = monthlyAmort - intPaid;
          totalInstallment = monthlyAmort;
          remainingPrincipal = Math.max(0, remainingPrincipal - princPaid);
        }

        totalInterest += intPaid;

        rows.push({
          period: i,
          dueDate: dueDate.toISOString().split("T")[0],
          isGrace,
          principalPaid: princPaid,
          interestPaid: intPaid,
          totalInstallment,
          remainingBalance: remainingPrincipal,
        });
      }
    }

    const firstRegularPayment = rows.find((r) => !r.isGrace)?.totalInstallment || rows[0]?.totalInstallment || 0;
    const totalRepayable = p + totalInterest;
    const effectiveApr = ((totalInterest / (p || 1)) / (n / 12)) * 100;

    return {
      rows,
      firstRegularPayment,
      totalInterest,
      totalRepayable,
      effectiveApr,
    };
  }, [principal, termMonths, monthlyRate, method, startDate, gracePeriod]);

  return (
    <div>
      {/* Header */}
      <div className="page-header no-print" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 10 }}>
            <Calculator size={26} color="var(--color-accent)" />
            {isKm ? "ម៉ាស៊ីនគណនាកម្ចី & តារាងបង់រំលស់" : "Loan Calculator & Amortization Schedule"}
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-muted)" }}>
            {isKm
              ? "គណនាការប្រាក់ប្រចាំខែ ទាំងការប្រាក់ថេរ និងការប្រាក់ថយចុះ ព្រមទាំងបោះពុម្ពតារាងជូនអតិថិជន"
              : "Simulate monthly installments for flat & reducing balance loans, and print official schedules for clients"}
          </p>
        </div>

        <div className="page-actions" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => window.print()}
            style={{ borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Printer size={15} />
            {isKm ? "បោះពុម្ពតារាងបង់ប្រាក់" : "Print Schedule"}
          </button>
        </div>
      </div>

      {/* Main Grid: Inputs Left, KPIs & Table Right */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
        {/* Left: Input Parameters Form */}
        <div className="card no-print" style={{ padding: 22, height: "fit-content" }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 }}>
            <FileSpreadsheet size={18} color="var(--color-accent)" />
            {isKm ? "ប៉ារ៉ាម៉ែត្រកម្ចី" : "Loan Parameters"}
          </h2>

          {/* Currency Toggle */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
              {isKm ? "រូបិយប័ណ្ណកម្ចី" : "Currency"}
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className={`btn btn-sm ${currency === "USD" ? "btn-primary" : ""}`}
                onClick={() => {
                  if (currency !== "USD") {
                    setCurrency("USD");
                    const rate = Number(usdToKhrRate) || 4100;
                    setPrincipal(Math.max(100, Math.round(principal / rate)));
                  }
                }}
                style={{ flex: 1, borderRadius: 8 }}
              >
                USD ($)
              </button>
              <button
                type="button"
                className={`btn btn-sm ${currency === "KHR" ? "btn-primary" : ""}`}
                onClick={() => {
                  if (currency !== "KHR") {
                    setCurrency("KHR");
                    const rate = Number(usdToKhrRate) || 4100;
                    setPrincipal(Math.round(principal * rate));
                  }
                }}
                style={{ flex: 1, borderRadius: 8 }}
              >
                KHR (៛)
              </button>
            </div>
          </div>

          {/* Principal Amount */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
              {isKm ? "ទំហំប្រាក់កម្ចី" : "Principal Amount"} ({currency})
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="number"
                step={currency === "USD" ? 100 : 100000}
                className="input"
                value={principal}
                onChange={(e) => setPrincipal(parseFloat(e.target.value) || 0)}
                style={{ width: "100%", padding: "10px 12px", fontSize: 15, fontWeight: 700, borderRadius: 8 }}
              />
            </div>
          </div>

          {/* Interest Method */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
              {isKm ? "វិធីសាស្ត្រគណនាការប្រាក់" : "Interest Method"}
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button
                type="button"
                className={`btn btn-sm ${method === "flat" ? "btn-primary" : ""}`}
                onClick={() => setMethod("flat")}
                style={{ borderRadius: 8, fontSize: 12, padding: "8px 6px" }}
              >
                {isKm ? "ការប្រាក់ថេរ (Flat)" : "Flat Rate"}
              </button>
              <button
                type="button"
                className={`btn btn-sm ${method === "reducing" ? "btn-primary" : ""}`}
                onClick={() => setMethod("reducing")}
                style={{ borderRadius: 8, fontSize: 12, padding: "8px 6px" }}
              >
                {isKm ? "ការប្រាក់ថយ (Reducing)" : "Reducing Balance"}
              </button>
            </div>
          </div>

          {/* Monthly Rate & Term Months in 2 Cols */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                {isKm ? "អត្រាការប្រាក់ (%/ខែ)" : "Rate (% / month)"}
              </label>
              <input
                type="number"
                step="0.05"
                className="input"
                value={monthlyRate}
                onChange={(e) => setMonthlyRate(parseFloat(e.target.value) || 0)}
                style={{ width: "100%", padding: 8, fontSize: 13, borderRadius: 6 }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                {isKm ? "រយៈពេល (ខែ)" : "Term (Months)"}
              </label>
              <input
                type="number"
                step="1"
                min="1"
                max="120"
                className="input"
                value={termMonths}
                onChange={(e) => setTermMonths(parseInt(e.target.value) || 1)}
                style={{ width: "100%", padding: 8, fontSize: 13, borderRadius: 6 }}
              />
            </div>
          </div>

          {/* Start Date & Grace Period in 2 Cols */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                {isKm ? "កាលបរិច្ឆេទទទួលប្រាក់" : "Disbursal Date"}
              </label>
              <input
                type="date"
                className="input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ width: "100%", padding: 8, fontSize: 13, borderRadius: 6 }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                {isKm ? "អនុគ្រោះមិនបង់ប្រាក់ដើម" : "Grace (Months)"}
              </label>
              <input
                type="number"
                min="0"
                max={termMonths - 1}
                className="input"
                value={gracePeriod}
                onChange={(e) => setGracePeriod(parseInt(e.target.value) || 0)}
                style={{ width: "100%", padding: 8, fontSize: 13, borderRadius: 6 }}
              />
            </div>
          </div>

          <Link
            to="/loans"
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center", display: "flex", alignItems: "center", gap: 6, borderRadius: 8 }}
          >
            <span>{isKm ? "បង្កើតសំណើកម្ចីជាមួយតួលេខនេះ" : "Create Loan with these Terms"}</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Right: Calculations & Amortization Table */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Printable Header for Print Mode */}
          <div className="print-only" style={{ display: "none", marginBottom: 20, textAlign: "center" }}>
            <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 800 }}>{companyName || websiteName}</h2>
            <div style={{ fontSize: 14, fontWeight: 700 }}>
              {isKm ? "តារាងបង់រំលស់ប្រាក់កម្ចីផ្លូវការ" : "OFFICIAL LOAN AMORTIZATION REPAYMENT SCHEDULE"}
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
              {isKm ? "កាលបរិច្ឆេទបង្កើត៖ " : "Generated on: "} {formatDate(new Date().toISOString(), isKm ? "km" : "en")}
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 14,
              marginBottom: 20,
            }}
          >
            {/* Monthly Installment */}
            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                {isKm ? "ប្រាក់ត្រូវបង់ប្រចាំខែ" : "Monthly Payment"}
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4, color: "var(--color-accent)" }}>
                {formatCurrency(schedule.firstRegularPayment, currency)}
              </div>
              <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>
                {gracePeriod > 0 ? (isKm ? `(ក្រោយអនុគ្រោះ ${gracePeriod} ខែ)` : `(After ${gracePeriod}m grace)`) : (isKm ? "រៀងរាល់ខែ" : "Every month")}
              </div>
            </div>

            {/* Total Interest */}
            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                {isKm ? "ការប្រាក់សរុប" : "Total Interest"}
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4, color: "var(--color-warning)" }}>
                {formatCurrency(schedule.totalInterest, currency)}
              </div>
              <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>
                {monthlyRate}% / {isKm ? "ខែ" : "month"}
              </div>
            </div>

            {/* Total Repayable */}
            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                {isKm ? "ប្រាក់សរុបត្រូវសង" : "Total Repayable"}
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4, color: "var(--color-success)" }}>
                {formatCurrency(schedule.totalRepayable, currency)}
              </div>
              <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>
                {isKm ? "ដើម + ការប្រាក់" : "Principal + Interest"}
              </div>
            </div>

            {/* Effective APR */}
            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                {isKm ? "អត្រាការប្រាក់ប្រចាំឆ្នាំ (APR)" : "Effective APR"}
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4, color: "var(--color-accent)" }}>
                {schedule.effectiveApr.toFixed(1)}%
              </div>
              <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>
                {isKm ? "គណនាតាមច្បាប់ NBC" : "Annual percentage rate"}
              </div>
            </div>
          </div>

          {/* Amortization Table */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                <Clock size={16} color="var(--color-accent)" />
                {isKm ? "តារាងបង់រំលស់លម្អិតតាមវគ្គនីមួយៗ" : "Detailed Installment Schedule"}
              </h3>
              <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                {schedule.rows.length} {isKm ? "វគ្គបង់ប្រាក់" : "Installments"}
              </span>
            </div>

            <div className="table-container" style={{ margin: 0 }}>
              <table className="table" style={{ width: "100%", fontSize: 12.5 }}>
                <thead>
                  <tr>
                    <th style={{ padding: "10px 14px", width: 50, textAlign: "center" }}>{isKm ? "វគ្គ" : "#"}</th>
                    <th style={{ padding: "10px 14px" }}>{isKm ? "កាលបរិច្ឆេទ" : "Due Date"}</th>
                    <th style={{ padding: "10px 14px", textAlign: "right" }}>{isKm ? "ប្រាក់ដើម" : "Principal"}</th>
                    <th style={{ padding: "10px 14px", textAlign: "right" }}>{isKm ? "ការប្រាក់" : "Interest"}</th>
                    <th style={{ padding: "10px 14px", textAlign: "right" }}>{isKm ? "សរុបត្រូវបង់" : "Payment"}</th>
                    <th style={{ padding: "10px 14px", textAlign: "right" }}>{isKm ? "សមតុល្យនៅសល់" : "Balance"}</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.rows.map((row) => (
                    <tr key={row.period} style={{ borderBottom: "1px solid var(--color-border)", background: row.isGrace ? "var(--color-warning-soft)" : "transparent" }}>
                      <td style={{ padding: "10px 14px", textAlign: "center", fontWeight: 700 }}>
                        {row.period}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <div>{formatDate(row.dueDate, isKm ? "km" : "en")}</div>
                        {row.isGrace && (
                          <span style={{ fontSize: 10, color: "var(--color-warning)", fontWeight: 600 }}>
                            {isKm ? "អនុគ្រោះប្រាក់ដើម" : "Grace Period"}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600 }}>
                        {formatCurrency(row.principalPaid, currency)}
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "right", color: "var(--color-warning)" }}>
                        {formatCurrency(row.interestPaid, currency)}
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 800, color: "var(--color-accent)" }}>
                        {formatCurrency(row.totalInstallment, currency)}
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "right", color: "var(--color-text-muted)" }}>
                        {formatCurrency(row.remainingBalance, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Printable Signature Area */}
          <div className="print-only" style={{ display: "none", marginTop: 40 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, textAlign: "center" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{isKm ? "ហត្ថលេខាអតិថិជនអ្នកខ្ចី" : "Borrower's Signature"}</div>
                <div style={{ height: 60 }} />
                <div style={{ borderTop: "1px dashed var(--color-border)", paddingTop: 4, fontSize: 12 }}>
                  {isKm ? "ឈ្មោះ និងកាលបរិច្ឆេទ" : "Name & Date"}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{isKm ? "ហត្ថលេខាមន្ត្រីឥណទានអ្នករៀបចំ" : "Credit Officer's Signature"}</div>
                <div style={{ height: 60 }} />
                <div style={{ borderTop: "1px dashed var(--color-border)", paddingTop: 4, fontSize: 12 }}>
                  {companyName || "Smart Loan Platform"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
