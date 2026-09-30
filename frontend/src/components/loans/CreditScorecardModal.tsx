import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  X,
  Printer,
  Sparkles,
  TrendingUp,
  Award,
  DollarSign,
  UserCheck,
} from "lucide-react";
import type { Loan } from "../../api/types";
import { formatCurrency } from "../../utils/format";
import { useBranding } from "../../context/BrandingContext";

interface CreditScorecardModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: Loan;
}

export default function CreditScorecardModal({ isOpen, onClose, loan }: CreditScorecardModalProps) {
  const { i18n } = useTranslation();
  const isKm = i18n.language === "km";
  const { companyName } = useBranding();

  // Interactive underwriting adjustment inputs
  const [monthlyIncome, setMonthlyIncome] = useState<number>(() => {
    return Math.round(Number(loan.principal_amount) * 0.45);
  });
  const [monthlyObligations, setMonthlyObligations] = useState<number>(() => {
    return Math.round(Number(loan.principal_amount) * 0.12);
  });
  const [businessTenureYears, setBusinessTenureYears] = useState<number>(3);
  const [hasGuarantor, setHasGuarantor] = useState<boolean>(() => {
    return Boolean(loan.guarantor_info?.name);
  });

  const principal = Number(loan.principal_amount) || 0;
  const colValue = Number(loan.collateral_info?.estimated_value) || (principal * 1.4);

  // Computations
  const scoreData = useMemo(() => {
    // 1. DTI Ratio
    const dti = monthlyIncome > 0 ? (monthlyObligations / monthlyIncome) * 100 : 50;
    let dtiPoints = 250;
    if (dti > 50) dtiPoints = 80;
    else if (dti > 35) dtiPoints = 175;

    // 2. LTV Ratio
    const ltv = colValue > 0 ? (principal / colValue) * 100 : 100;
    let ltvPoints = 250;
    if (ltv > 85) ltvPoints = 90;
    else if (ltv > 65) ltvPoints = 180;

    // 3. Business / Employment Tenure
    let tenurePoints = 150;
    if (businessTenureYears >= 5) tenurePoints = 200;
    else if (businessTenureYears >= 2) tenurePoints = 160;
    else tenurePoints = 100;

    // 4. Guarantor & Security
    const guarantorPoints = hasGuarantor ? 150 : 80;

    // Total Score (300 to 850 scale)
    const rawSum = dtiPoints + ltvPoints + tenurePoints + guarantorPoints;
    // Map raw sum (350 - 850)
    const finalScore = Math.min(850, Math.max(300, rawSum));

    let riskTier = "low";
    let grade = "A";
    let recKm = "អនុម័តជាស្ថាពរ (កម្រិតហានិភ័យទាបបំផុត)";
    let recEn = "Strong Approval (Optimal Risk Profile)";
    let color = "#10b981";

    if (finalScore < 580) {
      riskTier = "high";
      grade = "C";
      recKm = "ហានិភ័យខ្ពស់ — ត្រូវការការសម្រេចពីគណៈកម្មាធិការជាន់ខ្ពស់";
      recEn = "High Risk — Requires Executive Credit Committee Exception";
      color = "#ef4444";
    } else if (finalScore < 710) {
      riskTier = "medium";
      grade = "B";
      recKm = "អនុម័តដោយមានលក្ខខណ្ឌ — ទាមទារអ្នកធានា ឬទ្រព្យបន្ថែម";
      recEn = "Conditional Approval — Additional Security Recommended";
      color = "#f59e0b";
    }

    return {
      finalScore,
      grade,
      riskTier,
      color,
      recKm,
      recEn,
      dti: dti.toFixed(1),
      ltv: ltv.toFixed(1),
      dtiPoints,
      ltvPoints,
      tenurePoints,
      guarantorPoints,
    };
  }, [monthlyIncome, monthlyObligations, businessTenureYears, hasGuarantor, principal, colValue]);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 720,
          width: "100%",
          maxHeight: "92vh",
          overflowY: "auto",
          background: "#ffffff",
          borderRadius: "14px",
          color: "var(--color-text)",
        }}
      >
        {/* Modal Header */}
        <div
          className="no-print"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 22px",
            borderBottom: "1px solid var(--color-border)",
            background: "var(--color-surface-sunken)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Award size={20} color="var(--color-accent)" />
            <div>
              <div style={{ fontSize: 15, fontWeight: 800 }}>
                {isKm ? "ម៉ាស៊ីនវាយតម្លៃពិន្ទុឥណទាន & ហានិភ័យ" : "Credit Scoring & Risk Underwriting Scorecard"}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--color-text-muted)" }}>
                {isKm ? "ការវាយតម្លៃលទ្ធភាពសងបំណុល វត្ថុធានា និងប្រវត្តិនៃការស្នើសុំកម្ចី" : "Automated underwriting algorithm calculating DTI, LTV, and credit risk score"}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => window.print()}>
              <Printer size={13} /> {isKm ? "បោះពុម្ពកំណត់បង្ហាញ" : "Print Memo"}
            </button>
            <button type="button" className="btn-icon" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scorecard Hero Banner */}
        <div style={{ padding: "24px 28px" }}>
          <div
            style={{
              padding: "24px 28px",
              borderRadius: "14px",
              background: `linear-gradient(135deg, ${scoreData.color}15, rgba(255,255,255,0.9))`,
              border: `2px solid ${scoreData.color}40`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 20,
              marginBottom: 24,
            }}
          >
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                {isKm ? "ពិន្ទុឥណទានស្វ័យប្រវត្ត (កម្រិត ៣០០-៨៥០)" : "Computed Credit Score (Scale 300-850)"}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 4 }}>
                <span className="num" style={{ fontSize: 44, fontWeight: 900, color: scoreData.color, lineHeight: 1 }}>
                  {scoreData.finalScore}
                </span>
                <span style={{ fontSize: 16, fontWeight: 800, color: "var(--color-text-muted)" }}>/ 850</span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 900,
                    padding: "3px 10px",
                    borderRadius: 6,
                    background: scoreData.color,
                    color: "#ffffff",
                    marginLeft: 6,
                  }}
                >
                  {isKm ? "ចំណាត់ថ្នាក់ " : "GRADE "}{scoreData.grade}
                </span>
              </div>

              <div style={{ fontSize: 13.5, fontWeight: 700, color: scoreData.color, marginTop: 10 }}>
                {isKm ? scoreData.recKm : scoreData.recEn}
              </div>
            </div>

            {/* Gauge visualization pill */}
            <div
              style={{
                textAlign: "right",
                padding: "14px 18px",
                background: "#ffffff",
                borderRadius: "10px",
                border: "1px solid var(--color-border)",
                minWidth: 180,
              }}
            >
              <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", fontWeight: 600 }}>
                {isKm ? "កម្រិតបំណុលធៀបចំណូល" : "Debt-to-Income (DTI)"}
              </div>
              <div className="num" style={{ fontSize: 20, fontWeight: 800, color: Number(scoreData.dti) > 50 ? "#ef4444" : "#10b981" }}>
                {scoreData.dti}%
              </div>
              <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 6 }}>
                {isKm ? "សមាមាត្រកម្ចីធៀបទ្រព្យ" : "Loan-to-Value (LTV)"}
              </div>
              <div className="num" style={{ fontSize: 20, fontWeight: 800, color: Number(scoreData.ltv) > 80 ? "#ef4444" : "var(--color-accent)" }}>
                {scoreData.ltv}%
              </div>
            </div>
          </div>

          {/* Interactive Underwriting Assessment Sliders */}
          <div className="no-print" style={{ marginBottom: 24 }}>
            <h4 style={{ fontSize: 14, fontWeight: 800, margin: "0 0 14px 0", color: "var(--color-text)" }}>
              {isKm ? "ការកែសម្រួលទិន្នន័យវាយតម្លៃដោយមន្ត្រីឥណទាន" : "Adjust Credit Appraisal Parameters:"}
            </h4>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label className="form-label" style={{ fontWeight: 700, fontSize: 12.5 }}>
                  {isKm ? "ចំណូលសុទ្ធប្រចាំខែរបស់អ្នកខ្ចី ($)" : "Borrower Monthly Net Income ($)"}
                </label>
                <input
                  type="number"
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(Math.max(10, Number(e.target.value)))}
                  style={{ width: "100%", padding: "8px 12px", fontSize: 14, fontWeight: 700 }}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 700, fontSize: 12.5 }}>
                  {isKm ? "បំណុល និងការចំណាយប្រចាំខែសរុប ($)" : "Total Monthly Debt Obligations ($)"}
                </label>
                <input
                  type="number"
                  value={monthlyObligations}
                  onChange={(e) => setMonthlyObligations(Math.max(0, Number(e.target.value)))}
                  style={{ width: "100%", padding: "8px 12px", fontSize: 14, fontWeight: 700 }}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 700, fontSize: 12.5 }}>
                  {isKm ? "បទពិសោធន៍អាជីវកម្ម / ការងារ (ឆ្នាំ)" : "Business Experience / Tenure (Years)"}
                </label>
                <input
                  type="number"
                  min="0"
                  max="40"
                  value={businessTenureYears}
                  onChange={(e) => setBusinessTenureYears(Math.max(0, Number(e.target.value)))}
                  style={{ width: "100%", padding: "8px 12px", fontSize: 14, fontWeight: 700 }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: 12.5 }}>
                  {isKm ? "អ្នកធានា ឬសហអ្នកខ្ចី" : "Guarantor / Co-Signer"}
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", marginTop: 4 }}>
                  <input
                    type="checkbox"
                    checked={hasGuarantor}
                    onChange={(e) => setHasGuarantor(e.target.checked)}
                    style={{ width: 18, height: 18 }}
                  />
                  <span>{isKm ? "មានអ្នកធានាឥណទាន (+៧០ ពិន្ទុ)" : "Verified Guarantor Attached (+70 pts)"}</span>
                </label>
              </div>
            </div>
          </div>

          {/* Underwriting Breakdown Table */}
          <div style={{ border: "1px solid var(--color-border)", borderRadius: 10, overflow: "hidden", marginBottom: 20 }}>
            <div style={{ background: "var(--color-surface-sunken)", padding: "10px 16px", fontSize: 13, fontWeight: 800 }}>
              {isKm ? "លទ្ធផលវាយតម្លៃលម្អិតតាមផ្នែកនីមួយៗ" : "Detailed Underwriting Metric Breakdown"}
            </div>
            <div style={{ padding: "12px 16px", display: "grid", gap: 10, fontSize: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <strong>{isKm ? "១. លទ្ធភាពសងបំណុលធៀបចំណូល៖" : "1. Debt Capacity & Cash Flow (DTI):"}</strong>{" "}
                  <span>{scoreData.dti}% ({Number(scoreData.dti) <= 35 ? (isKm ? "ល្អប្រសើរ" : "Optimal") : (isKm ? "មធ្យម" : "Moderate")})</span>
                </div>
                <span className="num" style={{ fontWeight: 800, color: "var(--color-accent)" }}>{scoreData.dtiPoints} / 250</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <strong>{isKm ? "២. វត្ថុធានា និងសមាមាត្រកម្ចីធៀបទ្រព្យ៖" : "2. Collateral Security Coverage (LTV):"}</strong>{" "}
                  <span>{scoreData.ltv}% ({Number(scoreData.ltv) <= 65 ? (isKm ? "មានសុវត្ថិភាពខ្ពស់" : "Strong Equity") : (isKm ? "កម្រិតស្តង់ដារ" : "Standard")})</span>
                </div>
                <span className="num" style={{ fontWeight: 800, color: "var(--color-accent)" }}>{scoreData.ltvPoints} / 250</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <strong>{isKm ? "៣. ស្ថិរភាពអាជីវកម្ម និងការងារ៖" : "3. Business Stability & Track Record:"}</strong>{" "}
                  <span>{businessTenureYears} {isKm ? "ឆ្នាំ" : "years"}</span>
                </div>
                <span className="num" style={{ fontWeight: 800, color: "var(--color-accent)" }}>{scoreData.tenurePoints} / 200</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <strong>{isKm ? "៤. ការគាំទ្រពីអ្នកធានា៖" : "4. Guarantor / Co-Signer Backing:"}</strong>{" "}
                  <span>{hasGuarantor ? (isKm ? "មានការធានាផ្លូវច្បាប់" : "Legally Bound") : (isKm ? "គ្មានអ្នកធានា" : "No Guarantor")}</span>
                </div>
                <span className="num" style={{ fontWeight: 800, color: "var(--color-accent)" }}>{scoreData.guarantorPoints} / 150</span>
              </div>
            </div>
          </div>

          {/* Committee Official Signatures (Visible in Print) */}
          <div style={{ marginTop: 30, borderTop: "1px dashed #cbd5e1", paddingTop: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 30, textAlign: "center" }}>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700 }}>{isKm ? "មន្ត្រីវិភាគឥណទាន" : "Credit Appraisal Officer"}</div>
                <div style={{ height: 50 }} />
                <div style={{ borderTop: "1px dashed #64748b", paddingTop: 4, fontSize: 11.5 }}>
                  {isKm ? "កាលបរិច្ឆេទ និងហត្ថលេខា" : "Signature & Date"}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700 }}>{isKm ? "ប្រធានគណៈកម្មាធិការឥណទាន" : "Credit Committee Approval"}</div>
                <div style={{ height: 50 }} />
                <div style={{ borderTop: "1px dashed #64748b", paddingTop: 4, fontSize: 11.5 }}>
                  {isKm ? "កាលបរិច្ឆេទ និងហត្ថលេខា" : "Signature & Date"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
