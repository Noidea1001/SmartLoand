import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  Calculator,
  ArrowRightLeft,
  Printer,
  Sparkles,
  CheckCircle2,
  TrendingDown,
  DollarSign,
  Calendar,
  FileCheck,
  ShieldCheck,
  Building,
  User,
  Clock,
  ExternalLink,
} from "lucide-react";
import {
  simulateLoanRestructuring,
  type RestructureSimulationResult,
} from "../../api/reports";
import { listLoans } from "../../api/loans";
import type { Loan, Paginated } from "../../api/types";
import { formatCurrency, formatPercent, formatDate } from "../../utils/format";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useToast } from "../../context/ToastContext";
import { useBranding } from "../../context/BrandingContext";

export default function RestructureSimulator() {
  const { t, i18n } = useTranslation();
  const isKm = i18n.language === "km";
  useDocumentTitle(isKm ? "ឧបករណ៍គណនារៀបចំកម្ចីឡើងវិញ" : "Loan Restructuring Simulator");
  const toast = useToast();
  const { companyName } = useBranding();

  const [loans, setLoans] = useState<Loan[]>([]);
  const [loadingLoans, setLoadingLoans] = useState(true);
  const [selectedLoanId, setSelectedLoanId] = useState<string>("");

  // Restructuring input params
  const [newTermMonths, setNewTermMonths] = useState<number>(24);
  const [newRatePercent, setNewRatePercent] = useState<number>(1.2);
  const [gracePeriodMonths, setGracePeriodMonths] = useState<number>(3);

  // Simulation result
  const [result, setResult] = useState<RestructureSimulationResult | null>(null);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    listLoans(1)
      .then((res: Paginated<Loan>) => {
        const activeLoans = (res.items || []).filter((l: Loan) => l.status === "active" || l.status === "overdue");
        setLoans(activeLoans);
        if (activeLoans.length > 0) {
          setSelectedLoanId(activeLoans[0].id);
        }
      })
      .catch((err: any) => {
        console.error("Failed to load loans for simulator:", err);
      })
      .finally(() => setLoadingLoans(false));
  }, []);

  function runSimulation() {
    if (!selectedLoanId) return;
    setSimulating(true);
    simulateLoanRestructuring({
      loan_id: selectedLoanId,
      new_term_months: newTermMonths,
      new_rate_percent: newRatePercent,
      grace_period_months: gracePeriodMonths,
    })
      .then(setResult)
      .catch((err) => {
        console.error("Simulation error:", err);
        toast.error(isKm ? "បរាជ័យក្នុងការគណនាកម្ចីរៀបចំឡើងវិញ" : "Failed to simulate loan restructuring.");
      })
      .finally(() => setSimulating(false));
  }

  useEffect(() => {
    if (selectedLoanId) {
      runSimulation();
    }
  }, [selectedLoanId, newTermMonths, newRatePercent, gracePeriodMonths]);

  const selectedLoanObj = useMemo(() => {
    return loans.find((l) => l.id === selectedLoanId);
  }, [loans, selectedLoanId]);

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
              {isKm ? "កំណត់ហេតុអនុម័តរៀបចំរចនាសម្ព័ន្ធឥណទានឡើងវិញ (គណៈកម្មការឥណទាន)" : "Credit Committee Restructuring Approval Memorandum"}
            </p>
          </div>
          <div style={{ textAlign: "right", fontSize: 12, color: "#64748b" }}>
            <div style={{ fontWeight: 700, color: "#0f172a" }}>
              {result?.impact_analysis.memo_reference || "RESTRUCT-MEMO"}
            </div>
            <div>{isKm ? "កាលបរិច្ឆេទអនុម័ត៖ " : "Approval Date: "}{formatDate(new Date().toISOString(), isKm ? "km" : "en")}</div>
          </div>
        </div>
      </div>

      {/* Screen Header */}
      <div className="page-header no-print" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 10 }}>
            <ArrowRightLeft size={26} color="var(--color-accent)" />
            {isKm ? "ឧបករណ៍គណនារៀបចំរចនាសម្ព័ន្ធកម្ចីឡើងវិញ" : "Loan Restructuring & Refinancing Simulator"}
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-muted)" }}>
            {isKm
              ? "គណនា និងប្រៀបធៀបលក្ខខណ្ឌកម្ចីថ្មី (ពន្យារពេល បន្ថយការប្រាក់ អំឡុងពេលអនុគ្រោះ) និងបង្កើតកំណត់ហេតុអនុម័តផ្លូវការ"
              : "Simulate loan workout scenarios (tenor extension, interest concession, grace period) and generate credit committee underwriting memo"}
          </p>
        </div>

        <div className="page-actions" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => window.print()}
            disabled={!result}
            style={{ borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Printer size={15} />
            {isKm ? "បោះពុម្ពកំណត់ហេតុអនុម័ត" : "Print Approval Memo"}
          </button>
        </div>
      </div>

      {/* Control Box: Loan Picker & Interactive Sliders */}
      <div className="card no-print" style={{ padding: 22, marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 }}>
          <Calculator size={18} color="var(--color-accent)" />
          {isKm ? "ជ្រើសរើសកម្ចី & កំណត់លក្ខខណ្ឌរៀបចំថ្មី" : "Select Loan & Restructuring Parameters"}
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
          {/* Loan Selector */}
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
              {isKm ? "កម្ចីដែលត្រូវរៀបចំឡើងវិញ" : "Target Loan for Restructuring"}
            </label>
            {loadingLoans ? (
              <div className="skeleton skeleton-text"></div>
            ) : (
              <select
                className="input"
                value={selectedLoanId}
                onChange={(e) => setSelectedLoanId(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", fontSize: 13, borderRadius: 8 }}
              >
                {loans.map((l) => (
                  <option key={l.id} value={l.id}>
                    #{l.id.slice(0, 8).toUpperCase()} — {l.client_name || "Borrower"} ({formatCurrency(l.principal_amount, l.principal_currency)}) [{l.status}]
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* New Term Slider */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
              <span style={{ fontWeight: 700 }}>{isKm ? "រយៈពេលកម្ចីថ្មី (ខែ)៖" : "New Term (Months):"}</span>
              <span style={{ fontWeight: 800, color: "var(--color-accent)" }}>{newTermMonths} {isKm ? "ខែ" : "months"}</span>
            </div>
            <input
              type="range"
              min="6"
              max="60"
              step="3"
              value={newTermMonths}
              onChange={(e) => setNewTermMonths(Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--color-accent)" }}
            />
          </div>

          {/* New Interest Rate Slider */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
              <span style={{ fontWeight: 700 }}>{isKm ? "អត្រាការប្រាក់ថ្មី (% ក្នុងមួយខែ)៖" : "New Rate (% monthly):"}</span>
              <span style={{ fontWeight: 800, color: "var(--color-accent)" }}>{newRatePercent}%</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.1"
              value={newRatePercent}
              onChange={(e) => setNewRatePercent(Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--color-accent)" }}
            />
          </div>

          {/* Grace Period Months */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
              <span style={{ fontWeight: 700 }}>{isKm ? "អំឡុងពេលអនុគ្រោះប្រាក់ដើម (ខែ)៖" : "Grace Period (Months):"}</span>
              <span style={{ fontWeight: 800, color: "var(--color-accent)" }}>{gracePeriodMonths} {isKm ? "ខែ" : "months"}</span>
            </div>
            <input
              type="range"
              min="0"
              max="6"
              step="1"
              value={gracePeriodMonths}
              onChange={(e) => setGracePeriodMonths(Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--color-accent)" }}
            />
          </div>
        </div>
      </div>

      {/* Side-by-Side Comparison Grid */}
      {result && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20, marginBottom: 24 }}>
          {/* Card 1: Current Terms */}
          <div className="card" style={{ padding: 22 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", marginBottom: 12 }}>
              {isKm ? "លក្ខខណ្ឌកម្ចីបច្ចុប្បន្ន" : "Current Active Terms"}
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 16 }}>
              {formatCurrency(result.current_terms.monthly_payment, result.currency)}
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-muted)", marginLeft: 6 }}>
                {isKm ? "/ ខែ" : "/ mo"}
              </span>
            </div>

            <div style={{ fontSize: 13, lineHeight: 2 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-text-muted)" }}>{isKm ? "រយៈពេលដើម៖" : "Original Term:"}</span>
                <strong>{result.current_terms.term_months} {isKm ? "ខែ" : "months"}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-text-muted)" }}>{isKm ? "អត្រាការប្រាក់៖" : "Interest Rate:"}</span>
                <strong>{result.current_terms.monthly_rate_percent}% {isKm ? "/ ខែ" : "/ mo"}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-text-muted)" }}>{isKm ? "ការប្រាក់សរុប៖" : "Total Interest:"}</span>
                <strong>{formatCurrency(result.current_terms.total_interest, result.currency)}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--color-border)", paddingTop: 8 }}>
                <span style={{ color: "var(--color-text-muted)" }}>{isKm ? "ទឹកប្រាក់ត្រូវសងសរុប៖" : "Total Payable:"}</span>
                <strong style={{ fontSize: 15 }}>{formatCurrency(result.current_terms.total_payable, result.currency)}</strong>
              </div>
            </div>
          </div>

          {/* Card 2: Proposed Restructured Terms */}
          <div className="card" style={{ padding: 22 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-accent)", textTransform: "uppercase", marginBottom: 12 }}>
              {isKm ? "លក្ខខណ្ឌស្នើសុំរៀបចំថ្មី" : "Proposed Restructured Terms"}
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "var(--color-accent)", marginBottom: 16 }}>
              {formatCurrency(result.proposed_terms.monthly_regular_payment, result.currency)}
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-muted)", marginLeft: 6 }}>
                {isKm ? "/ ខែ (ធម្មតា)" : "/ mo (regular)"}
              </span>
            </div>

            <div style={{ fontSize: 13, lineHeight: 2 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-text-muted)" }}>{isKm ? "រយៈពេលថ្មី៖" : "New Extended Term:"}</span>
                <strong style={{ color: "var(--color-accent)" }}>{result.proposed_terms.term_months} {isKm ? "ខែ" : "months"}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-text-muted)" }}>{isKm ? "អត្រាការប្រាក់ថ្មី៖" : "Concession Rate:"}</span>
                <strong style={{ color: "var(--color-accent)" }}>{result.proposed_terms.monthly_rate_percent}% {isKm ? "/ ខែ" : "/ mo"}</strong>
              </div>
              {result.proposed_terms.grace_period_months > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", background: "var(--color-accent-soft)", padding: "2px 8px", borderRadius: 4 }}>
                  <span style={{ color: "var(--color-accent)" }}>{isKm ? "បង់តែការប្រាក់ក្នុងអំឡុងអនុគ្រោះ៖" : "Interest-Only in Grace:"}</span>
                  <strong style={{ color: "var(--color-accent)" }}>{formatCurrency(result.proposed_terms.monthly_payment_during_grace, result.currency)}</strong>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--color-border)", paddingTop: 8 }}>
                <span style={{ color: "var(--color-text-muted)" }}>{isKm ? "ទឹកប្រាក់ត្រូវសងសរុប៖" : "Total Payable:"}</span>
                <strong style={{ fontSize: 15 }}>{formatCurrency(result.proposed_terms.total_payable, result.currency)}</strong>
              </div>
            </div>
          </div>

          {/* Card 3: Debt Relief & Impact */}
          <div className="card" style={{ padding: 22 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#047857", textTransform: "uppercase", marginBottom: 12 }}>
              {isKm ? "ការកាត់បន្ថយបន្ទុកបំណុល" : "Borrower Debt Relief Impact"}
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#10b981", marginBottom: 16 }}>
              {result.impact_analysis.payment_relief_percent > 0 ? `-${result.impact_analysis.payment_relief_percent}%` : "0%"}
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-muted)", marginLeft: 6 }}>
                {isKm ? "កាត់បន្ថយការបង់ប្រចាំខែ" : "Monthly Payment Drop"}
              </span>
            </div>

            <div style={{ fontSize: 13, lineHeight: 2 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-text-muted)" }}>{isKm ? "ទឹកប្រាក់បន្ថយក្នុងមួយខែ៖" : "Monthly Cash Relief:"}</span>
                <strong style={{ color: "#10b981" }}>
                  {formatCurrency(result.impact_analysis.payment_reduction_amount, result.currency)}
                </strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-text-muted)" }}>{isKm ? "កម្រិតសម្រួលបន្ទុក៖" : "Relief Rating:"}</span>
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: 10,
                    fontSize: 11,
                    fontWeight: 700,
                    background: "#ecfdf5",
                    color: "#047857",
                  }}
                >
                  {result.impact_analysis.borrower_cashflow_relief === "high" ? (isKm ? "ប្រសិទ្ធភាពខ្ពស់" : "High Impact") : (isKm ? "មធ្យម" : "Moderate")}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--color-border)", paddingTop: 8 }}>
                <span style={{ color: "var(--color-text-muted)" }}>{isKm ? "លេខប័ណ្ណអនុម័ត៖" : "Approval Ref:"}</span>
                <strong>{result.impact_analysis.memo_reference}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Official Credit Committee Signature Block (Visible when printed) */}
      <div className="print-only" style={{ display: "none", marginTop: 40, borderTop: "1px dashed #cbd5e1", paddingTop: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, textAlign: "center" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>{isKm ? "មន្ត្រីឥណទានស្នើសុំ" : "Originating Officer"}</div>
            <div style={{ height: 60 }}></div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>___________________________</div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>{isKm ? "ប្រធានគ្រប់គ្រងហានិភ័យ" : "Risk Management Head"}</div>
            <div style={{ height: 60 }}></div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>___________________________</div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>{isKm ? "ប្រធានគណៈកម្មការឥណទាន" : "Credit Committee Chair"}</div>
            <div style={{ height: 60 }}></div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>___________________________</div>
          </div>
        </div>
      </div>
    </div>
  );
}
