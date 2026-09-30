import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  X,
  Calculator,
  DollarSign,
  TrendingUp,
  Percent,
  Copy,
  Check,
  Download,
  ArrowRight,
  PieChart as PieIcon,
  Table as TableIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "../../utils/format";
import { useToast } from "../../context/ToastContext";
import { useBranding } from "../../context/BrandingContext";

interface LoanCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPrincipal?: number;
  defaultCurrency?: "USD" | "KHR";
  defaultRate?: number;
  defaultTerm?: number;
  defaultType?: "flat" | "reducing";
}

interface ScheduleRow {
  month: number;
  dateStr: string;
  beginningBalance: number;
  principal: number;
  interest: number;
  total: number;
  endingBalance: number;
}

const PRESETS_USD = [1000, 3000, 5000, 10000, 20000, 50000];
const PRESETS_KHR = [4000000, 10000000, 20000000, 40000000, 80000000];
const TERM_PRESETS = [3, 6, 12, 18, 24, 36, 48, 60];

export default function LoanCalculatorModal({
  isOpen,
  onClose,
  defaultPrincipal = 5000,
  defaultCurrency,
  defaultRate = 1.5,
  defaultTerm = 12,
  defaultType = "reducing",
}: LoanCalculatorModalProps) {
  const { t, i18n } = useTranslation();
  const isKm = i18n.language === "km";
  const toast = useToast();
  const navigate = useNavigate();
  const { usdToKhrRate, companyName, baseCurrency } = useBranding();

  const effectiveDefaultCurrency = defaultCurrency || baseCurrency || "USD";
  const [currency, setCurrency] = useState<"USD" | "KHR">(effectiveDefaultCurrency);
  const [principal, setPrincipal] = useState<number>(
    effectiveDefaultCurrency === "KHR" && defaultPrincipal < 100000 ? 20000000 : defaultPrincipal
  );

  useEffect(() => {
    if (isOpen) {
      const initCurr = defaultCurrency || baseCurrency || "USD";
      setCurrency(initCurr);
      if (initCurr === "KHR" && defaultPrincipal < 100000) {
        setPrincipal(20000000);
      } else {
        setPrincipal(defaultPrincipal);
      }
    }
  }, [isOpen, baseCurrency, defaultCurrency, defaultPrincipal]);
  const [rate, setRate] = useState<number>(defaultRate);
  const [term, setTerm] = useState<number>(defaultTerm);
  const [interestType, setInterestType] = useState<"flat" | "reducing">(defaultType);
  const [activeTab, setActiveTab] = useState<"summary" | "schedule">("summary");
  const [copied, setCopied] = useState(false);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  // Convert principal accurately by exchange rate when currency changes
  function handleCurrencyChange(newCurr: "USD" | "KHR") {
    if (newCurr === currency) return;
    setCurrency(newCurr);
    const r = usdToKhrRate || 4100;
    if (newCurr === "KHR") {
      setPrincipal(Math.round(principal * r));
    } else {
      setPrincipal(Math.max(100, Math.round(principal / r)));
    }
  }

  // Math Calculations
  const calculations = useMemo(() => {
    const P = Number(principal) || 0;
    const n = Math.max(1, Math.round(Number(term) || 1));
    const rMonthly = (Number(rate) || 0) / 100;
    const now = new Date();

    let monthlyInstallment = 0;
    let totalInterest = 0;
    let totalRepayment = 0;
    const schedule: ScheduleRow[] = [];

    if (interestType === "flat") {
      totalInterest = P * rMonthly * n;
      totalRepayment = P + totalInterest;
      monthlyInstallment = n > 0 ? totalRepayment / n : 0;

      const monthlyPrincipal = P / n;
      const monthlyInt = totalInterest / n;
      let balance = P;

      for (let i = 1; i <= n; i++) {
        const dueDate = new Date(now.getFullYear(), now.getMonth() + i, now.getDate());
        const beg = balance;
        const princ = i === n ? balance : monthlyPrincipal;
        const intPart = monthlyInt;
        balance = Math.max(0, balance - princ);

        schedule.push({
          month: i,
          dateStr: dueDate.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
          beginningBalance: beg,
          principal: princ,
          interest: intPart,
          total: princ + intPart,
          endingBalance: balance,
        });
      }
    } else {
      // Reducing balance (French amortization)
      if (rMonthly === 0) {
        monthlyInstallment = P / n;
        totalInterest = 0;
        totalRepayment = P;
      } else {
        const factor = Math.pow(1 + rMonthly, n);
        monthlyInstallment = (P * (rMonthly * factor)) / (factor - 1);
        totalRepayment = monthlyInstallment * n;
        totalInterest = totalRepayment - P;
      }

      let balance = P;
      for (let i = 1; i <= n; i++) {
        const dueDate = new Date(now.getFullYear(), now.getMonth() + i, now.getDate());
        const beg = balance;
        const intPart = balance * rMonthly;
        let princPart = monthlyInstallment - intPart;

        if (i === n || princPart > balance) {
          princPart = balance;
        }
        balance = Math.max(0, balance - princPart);

        schedule.push({
          month: i,
          dateStr: dueDate.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
          beginningBalance: beg,
          principal: princPart,
          interest: intPart,
          total: princPart + intPart,
          endingBalance: balance,
        });
      }
    }

    const principalPct = totalRepayment > 0 ? (P / totalRepayment) * 100 : 100;
    const interestPct = totalRepayment > 0 ? (totalInterest / totalRepayment) * 100 : 0;
    const apr = Number(rate) * 12;

    const payoffDate = new Date(now.getFullYear(), now.getMonth() + n, now.getDate());

    return {
      monthlyInstallment,
      totalInterest,
      totalRepayment,
      principalPct,
      interestPct,
      apr,
      schedule,
      payoffDateStr: payoffDate.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    };
  }, [principal, rate, term, interestType]);

  // Copy Quotation to Clipboard
  function copyQuotation() {
    const text = isKm
      ? `
╔══════════════════════════════════════════╗
║        តារាងប៉ាន់ស្មានការទូទាត់កម្ចី        ║
╚══════════════════════════════════════════╝
• ទំហំប្រាក់កម្ចីដើម៖     ${formatCurrency(principal, currency)}
• រយៈពេលកម្ចី៖          ${term} ខែ
• អត្រាការប្រាក់៖        ${rate}% / ខែ (${calculations.apr.toFixed(1)}% APR)
• វិធីសាស្ត្រគណនា៖       ${interestType === "flat" ? "ការប្រាក់ថេរ (Flat Rate)" : "ថយចុះតាមសមតុល្យ (Reducing Balance)"}
────────────────────────────────────────────
▶ ប្រាក់ត្រូវបង់ប្រចាំខែ៖ ${formatCurrency(calculations.monthlyInstallment, currency)} / ខែ
▶ ការប្រាក់សរុប៖       ${formatCurrency(calculations.totalInterest, currency)}
▶ ចំនួនទឹកប្រាក់សងសរុប៖  ${formatCurrency(calculations.totalRepayment, currency)}
▶ កាលបរិច្ឆេទបញ្ចប់កម្ចី៖ ${calculations.payoffDateStr}
────────────────────────────────────────────
បង្កើតដោយ ${companyName || (isKm ? "ប្រព័ន្ធគ្រប់គ្រងឥណទាន" : "Smart Loan Enterprise Credit System")}
      `.trim()
      : `
╔══════════════════════════════════════════╗
║    SMART LOAN SIMULATION QUOTATION       ║
╚══════════════════════════════════════════╝
• Principal Amount:     ${formatCurrency(principal, currency)}
• Loan Term:            ${term} Months
• Interest Rate:        ${rate}% / month (${calculations.apr.toFixed(1)}% APR)
• Method:               ${interestType === "flat" ? "Flat Interest Rate" : "Reducing Balance (Amortized)"}
────────────────────────────────────────────
▶ Estimated Monthly:    ${formatCurrency(calculations.monthlyInstallment, currency)} / mo
▶ Total Interest Paid:  ${formatCurrency(calculations.totalInterest, currency)}
▶ Total Repayment:      ${formatCurrency(calculations.totalRepayment, currency)}
▶ Estimated Payoff:     ${calculations.payoffDateStr}
────────────────────────────────────────────
Generated by ${companyName || "Smart Loan Enterprise Credit System"}
      `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(isKm ? "បានចម្លងតារាងប៉ាន់ស្មានទៅក្ដារតម្បៀតខ្ទាស់!" : t("calculator.quoteCopied"));
    setTimeout(() => setCopied(false), 2500);
  }

  // Export Schedule as CSV
  function exportScheduleCSV() {
    const headers = isKm
      ? ["វគ្គ", "កាលបរិច្ឆេទបង់", "សមតុល្យដើមគ្រា", "ប្រាក់ដើម", "ការប្រាក់", "ប្រាក់ត្រូវបង់សរុប", "សមតុល្យចុងគ្រា"]
      : ["Installment #", "Due Date", "Beginning Balance", "Principal", "Interest", "Total Payment", "Ending Balance"];
    const rows = calculations.schedule.map((r) => [
      r.month,
      r.dateStr,
      r.beginningBalance.toFixed(2),
      r.principal.toFixed(2),
      r.interest.toFixed(2),
      r.total.toFixed(2),
      r.endingBalance.toFixed(2),
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `loan-schedule-${currency}-${principal}-${term}m.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(isKm ? "បានទាញយកតារាងបង់រំលស់ជាឯកសារ CSV ដោយជោគជ័យ!" : "Schedule exported to CSV.");
  }

  // Direct action to create loan with this calculation
  function handleApplyAsLoan() {
    onClose();
    navigate(
      `/loans?action=new&principal=${principal}&currency=${currency}&rate=${rate}&term=${term}&type=${interestType}`
    );
  }

  if (!isOpen) return null;

  return createPortal(
    <div className="no-print modal-backdrop" onClick={onClose}>
      <div
        className="modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 860,
          width: "100%",
          background: "var(--color-surface)",
          borderRadius: "14px",
          boxShadow: "0 20px 45px -10px rgba(0, 0, 0, 0.25)",
          border: "1px solid var(--color-border)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "90vh",
          overflow: "hidden",
        }}
      >
        {/* Modal Header */}
        <div
          className="modal-header-banner"
          style={{
            background: "var(--color-surface)",
            borderBottom: "1px solid var(--color-border)",
            padding: "20px 24px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              className="modal-header-badge"
              style={{
                width: 42,
                height: 42,
                borderRadius: "10px",
                backgroundColor: "var(--color-surface-sunken)",
                color: "var(--color-accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Calculator size={22} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "var(--color-text)", letterSpacing: "-0.01em" }}>
                  {t("calculator.title")}
                </h2>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: "8px",
                    background: "var(--color-surface-sunken)",
                    color: "var(--color-text-secondary)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  USD / KHR
                </span>
              </div>
              <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--color-text-muted)" }}>
                {t("calculator.subtitle")}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Currency Switcher */}
            <div
              style={{
                display: "flex",
                background: "var(--color-surface-sunken)",
                padding: 3,
                borderRadius: "8px",
                border: "1px solid var(--color-border)",
              }}
            >
              <button
                type="button"
                onClick={() => handleCurrencyChange("USD")}
                style={{
                  padding: "5px 12px",
                  borderRadius: "6px",
                  fontSize: 12,
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  background: currency === "USD" ? "var(--color-accent)" : "transparent",
                  color: currency === "USD" ? "#ffffff" : "var(--color-text-muted)",
                  transition: "all 0.15s ease",
                }}
              >
                USD ($)
              </button>
              <button
                type="button"
                onClick={() => handleCurrencyChange("KHR")}
                style={{
                  padding: "5px 12px",
                  borderRadius: "6px",
                  fontSize: 12,
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  background: currency === "KHR" ? "var(--color-accent)" : "transparent",
                  color: currency === "KHR" ? "#ffffff" : "var(--color-text-muted)",
                  transition: "all 0.15s ease",
                }}
              >
                KHR (៛)
              </button>
            </div>

            <button
              onClick={onClose}
              type="button"
              className="btn-icon"
              style={{ borderRadius: "8px" }}
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body - 2 Columns */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.1fr 1fr",
            flex: 1,
            overflowY: "auto",
            background: "var(--color-surface)",
          }}
        >
          {/* Left Column: Interactive Controls */}
          <div
            style={{
              padding: 24,
              borderRight: "1px solid var(--color-border)",
              display: "flex",
              flexDirection: "column",
              gap: 20,
              background: "var(--color-surface)",
            }}
          >
            {/* Principal Amount Input */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: 13, margin: 0, color: "var(--color-text)" }}>
                  {t("calculator.loanAmount")} ({currency})
                </label>
                <span className="num" style={{ fontSize: 15, fontWeight: 700, color: "var(--color-accent)" }}>
                  {formatCurrency(principal, currency)}
                </span>
              </div>
              <input
                type="number"
                min="100"
                step={currency === "KHR" ? "500000" : "100"}
                value={principal}
                onChange={(e) => setPrincipal(Math.max(0, Number(e.target.value)))}
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  fontFamily: "var(--font-sans)",
                  fontVariantNumeric: "tabular-nums",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  width: "100%",
                }}
              />

              {/* Quick Amount Chips */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                {(currency === "USD" ? PRESETS_USD : PRESETS_KHR).map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setPrincipal(amt)}
                    style={{
                      fontSize: 11.5,
                      fontWeight: 600,
                      padding: "4px 9px",
                      borderRadius: "8px",
                      border: principal === amt ? "1.5px solid var(--color-accent)" : "1px solid var(--color-border)",
                      background: principal === amt ? "var(--color-accent-soft)" : "var(--color-surface)",
                      color: principal === amt ? "var(--color-accent)" : "var(--color-text-secondary)",
                      cursor: "pointer",
                      fontFamily: "var(--font-sans)",
                      fontVariantNumeric: "tabular-nums",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {formatCurrency(amt, currency)}
                  </button>
                ))}
              </div>
            </div>

            {/* Interest Rate */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: 13, margin: 0, color: "var(--color-text)" }}>
                  {t("calculator.monthlyRate")} (% / mo)
                </label>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span className="num" style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text)" }}>
                    {rate}% / mo
                  </span>
                  <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                    ({calculations.apr.toFixed(1)}% APR)
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <input
                  type="range"
                  min="0.5"
                  max="5.0"
                  step="0.1"
                  value={rate}
                  onChange={(e) => setRate(Number(e.target.value))}
                  style={{ flex: 1, accentColor: "var(--color-accent)" }}
                />
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="10.0"
                  value={rate}
                  onChange={(e) => setRate(Number(e.target.value))}
                  style={{ width: 80, fontSize: 14, fontWeight: 700, textAlign: "right", borderRadius: "8px" }}
                />
              </div>
            </div>

            {/* Term Duration */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: 13, margin: 0, color: "var(--color-text)" }}>
                  {t("calculator.duration")}
                </label>
                <span className="num" style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text)" }}>
                  {term} {t("calculator.months")}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <input
                  type="range"
                  min="1"
                  max="60"
                  step="1"
                  value={term}
                  onChange={(e) => setTerm(Number(e.target.value))}
                  style={{ flex: 1, accentColor: "var(--color-accent)" }}
                />
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={term}
                  onChange={(e) => setTerm(Math.max(1, Number(e.target.value)))}
                  style={{ width: 80, fontSize: 14, fontWeight: 700, textAlign: "right", borderRadius: "8px" }}
                />
              </div>

              {/* Term presets */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                {TERM_PRESETS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setTerm(m)}
                    style={{
                      fontSize: 11.5,
                      fontWeight: 600,
                      padding: "4px 9px",
                      borderRadius: "8px",
                      border: term === m ? "1.5px solid var(--color-accent)" : "1px solid var(--color-border)",
                      background: term === m ? "var(--color-accent-soft)" : "var(--color-surface)",
                      color: term === m ? "var(--color-accent)" : "var(--color-text-secondary)",
                      cursor: "pointer",
                      fontFamily: "var(--font-sans)",
                      fontVariantNumeric: "tabular-nums",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {m}M
                  </button>
                ))}
              </div>
            </div>

            {/* Interest Calculation Method: Flat vs Reducing */}
            <div>
              <label className="form-label" style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: "var(--color-text)" }}>
                {t("calculator.interestType")}
              </label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
              >
                <div
                  onClick={() => setInterestType("reducing")}
                  style={{
                    padding: "12px 14px",
                    borderRadius: "8px",
                    border: interestType === "reducing" ? "1.5px solid var(--color-accent)" : "1px solid var(--color-border)",
                    background: interestType === "reducing" ? "var(--color-accent-soft)" : "var(--color-surface)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 13, color: interestType === "reducing" ? "var(--color-accent)" : "var(--color-text)" }}>
                    <TrendingUp size={15} color="var(--color-accent)" />
                    <span>{t("calculator.reducing")}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 4, lineHeight: 1.4 }}>
                    Interest drops as principal is repaid (Standard)
                  </div>
                </div>

                <div
                  onClick={() => setInterestType("flat")}
                  style={{
                    padding: "12px 14px",
                    borderRadius: "8px",
                    border: interestType === "flat" ? "1.5px solid var(--color-accent)" : "1px solid var(--color-border)",
                    background: interestType === "flat" ? "var(--color-accent-soft)" : "var(--color-surface)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: 13, color: interestType === "flat" ? "var(--color-accent)" : "var(--color-text)" }}>
                    <Percent size={15} color="var(--color-text-secondary)" />
                    <span>{t("calculator.flat")}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 4, lineHeight: 1.4 }}>
                    Fixed interest on initial principal throughout
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Clean White Results & Summary */}
          <div
            style={{
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 16,
              background: "var(--color-surface)",
            }}
          >
            {/* View Switcher Tabs (Overview vs Schedule) */}
            <div
              style={{
                display: "flex",
                gap: 6,
                background: "var(--color-surface-sunken)",
                padding: 3,
                borderRadius: "8px",
                border: "1px solid var(--color-border)",
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab("summary")}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  padding: "7px 12px",
                  borderRadius: "6px",
                  fontSize: 12.5,
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  background: activeTab === "summary" ? "var(--color-accent)" : "transparent",
                  color: activeTab === "summary" ? "#ffffff" : "var(--color-text-secondary)",
                  transition: "all 0.15s ease",
                }}
              >
                <PieIcon size={14} />
                <span>Executive Summary</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("schedule")}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  padding: "7px 12px",
                  borderRadius: "6px",
                  fontSize: 12.5,
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  background: activeTab === "schedule" ? "var(--color-accent)" : "transparent",
                  color: activeTab === "schedule" ? "#ffffff" : "var(--color-text-secondary)",
                  transition: "all 0.15s ease",
                }}
              >
                <TableIcon size={14} />
                <span>{t("calculator.amortizationSchedule")}</span>
              </button>
            </div>

            {activeTab === "summary" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Clean White Monthly Installment Card */}
                <div
                  style={{
                    background: "var(--color-surface)",
                    padding: "20px 22px",
                    borderRadius: "8px",
                    border: "1px solid var(--color-border)",
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        color: "var(--color-text-muted)",
                      }}
                    >
                      {t("calculator.monthlyInstallment")}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: "8px",
                        background: "var(--color-surface-sunken)",
                        color: "var(--color-text-secondary)",
                        border: "1px solid var(--color-border)",
                      }}
                    >
                      {interestType === "reducing" ? "Reducing Balance" : "Flat Rate"}
                    </span>
                  </div>
                  <div
                    className="num"
                    style={{
                      fontSize: 32,
                      fontWeight: 800,
                      marginTop: 6,
                      color: "var(--color-text)",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {formatCurrency(calculations.monthlyInstallment, currency)}
                    <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-muted)", marginLeft: 6 }}>
                      / month
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      marginTop: 14,
                      paddingTop: 12,
                      borderTop: "1px solid var(--color-border)",
                      fontSize: 12,
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    <span>
                      Payoff: <strong style={{ color: "var(--color-text)" }}>{calculations.payoffDateStr}</strong>
                    </span>
                    <span style={{ color: "var(--color-border)" }}>•</span>
                    <span>
                      APR: <strong style={{ color: "var(--color-text)" }}>{calculations.apr.toFixed(1)}%</strong>
                    </span>
                  </div>
                </div>

                {/* Key Metrics Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div
                    style={{
                      background: "var(--color-surface)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "8px",
                      padding: "14px 16px",
                      boxShadow: "var(--shadow-sm)",
                    }}
                  >
                    <div style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 600 }}>
                      {t("calculator.totalInterest")}
                    </div>
                    <div
                      className="num"
                      style={{ fontSize: 18, fontWeight: 800, color: "var(--color-text)", marginTop: 4 }}
                    >
                      +{formatCurrency(calculations.totalInterest, currency)}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>
                      {calculations.interestPct.toFixed(1)}% of total payment
                    </div>
                  </div>

                  <div
                    style={{
                      background: "var(--color-surface)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "8px",
                      padding: "14px 16px",
                      boxShadow: "var(--shadow-sm)",
                    }}
                  >
                    <div style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 600 }}>
                      {t("calculator.totalRepayment")}
                    </div>
                    <div
                      className="num"
                      style={{ fontSize: 18, fontWeight: 800, color: "var(--color-accent)", marginTop: 4 }}
                    >
                      {formatCurrency(calculations.totalRepayment, currency)}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>
                      Principal + All Interest
                    </div>
                  </div>
                </div>

                {/* Visual Ratio Progress Bar */}
                <div
                  style={{
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "8px",
                    padding: "14px 16px",
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 12,
                      fontWeight: 600,
                      marginBottom: 6,
                    }}
                  >
                    <span style={{ color: "var(--color-text-secondary)" }}>
                      Principal ({calculations.principalPct.toFixed(0)}%)
                    </span>
                    <span style={{ color: "var(--color-text-muted)" }}>
                      Interest ({calculations.interestPct.toFixed(0)}%)
                    </span>
                  </div>
                  <div
                    style={{
                      height: 8,
                      borderRadius: "4px",
                      display: "flex",
                      overflow: "hidden",
                      background: "var(--color-surface-sunken)",
                    }}
                  >
                    <div
                      style={{
                        width: `${calculations.principalPct}%`,
                        background: "var(--color-accent)",
                        transition: "width 0.3s ease",
                      }}
                    />
                    <div
                      style={{
                        width: `${calculations.interestPct}%`,
                        background: "var(--color-border)",
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* Schedule Table Tab */
              <div
                style={{
                  maxHeight: 320,
                  overflowY: "auto",
                  padding: 0,
                  borderRadius: "8px",
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface)",
                }}
              >
                <table style={{ width: "100%", fontSize: 12.5, borderCollapse: "collapse" }}>
                  <thead style={{ position: "sticky", top: 0, background: "var(--color-surface-sunken)", zIndex: 1 }}>
                    <tr>
                      <th style={{ padding: "8px 10px", textAlign: "left", borderBottom: "1px solid var(--color-border)" }}>#</th>
                      <th style={{ padding: "8px 10px", textAlign: "left", borderBottom: "1px solid var(--color-border)" }}>Due</th>
                      <th style={{ padding: "8px 10px", textAlign: "right", borderBottom: "1px solid var(--color-border)" }}>Principal</th>
                      <th style={{ padding: "8px 10px", textAlign: "right", borderBottom: "1px solid var(--color-border)" }}>Interest</th>
                      <th style={{ padding: "8px 10px", textAlign: "right", borderBottom: "1px solid var(--color-border)" }}>Total</th>
                      <th style={{ padding: "8px 10px", textAlign: "right", borderBottom: "1px solid var(--color-border)" }}>Remaining</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculations.schedule.map((row) => (
                      <tr key={row.month} style={{ borderBottom: "1px solid var(--color-border)" }}>
                        <td className="num" style={{ padding: "8px 10px", fontWeight: 700 }}>
                          {row.month}
                        </td>
                        <td style={{ padding: "8px 10px", color: "var(--color-text-muted)" }}>{row.dateStr}</td>
                        <td className="num" style={{ padding: "8px 10px", textAlign: "right" }}>
                          {formatCurrency(row.principal, currency)}
                        </td>
                        <td className="num" style={{ padding: "8px 10px", textAlign: "right", color: "var(--color-text-secondary)" }}>
                          {formatCurrency(row.interest, currency)}
                        </td>
                        <td className="num" style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700 }}>
                          {formatCurrency(row.total, currency)}
                        </td>
                        <td className="num" style={{ padding: "8px 10px", textAlign: "right", color: "var(--color-text-muted)" }}>
                          {formatCurrency(row.endingBalance, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Quick Actions Row */}
            <div style={{ display: "flex", gap: 8, marginTop: "auto", paddingTop: 12 }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={copyQuotation}
                style={{ flex: 1, fontSize: 12.5, borderRadius: "8px" }}
                title="Copy formatted quotation for messaging apps"
              >
                {copied ? <Check size={15} color="var(--color-success)" /> : <Copy size={15} />}
                <span>{copied ? "Copied!" : t("calculator.copyQuote")}</span>
              </button>

              <button
                type="button"
                className="btn btn-ghost"
                onClick={exportScheduleCSV}
                style={{ fontSize: 12.5, borderRadius: "8px" }}
                title="Download CSV"
              >
                <Download size={15} />
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleApplyAsLoan}
                style={{ flex: 1.3, fontSize: 12.5, borderRadius: "8px" }}
              >
                <span>{t("calculator.applyLoan")}</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
