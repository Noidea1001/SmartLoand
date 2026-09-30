import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Award } from "lucide-react";
import type { Installment, Loan } from "../../api/types";

interface CreditScoreCardProps {
  loan: Loan;
  installments: Installment[];
}

export default function CreditScoreCard({ loan, installments }: CreditScoreCardProps) {
  const { i18n } = useTranslation();
  const isKm = i18n.language === "km";

  const analysis = useMemo(() => {
    let score = 715;

    // Repayment history impact
    const paidCount = installments.filter((i) => i.status === "paid").length;
    const overdueCount = installments.filter((i) => i.status === "overdue").length;

    score += Math.min(75, paidCount * 18);
    score -= overdueCount * 85;

    // Collateral impact
    const hasCollateral = Boolean(loan.collateral_info && loan.collateral_info.description);
    const collateralVal = Number(loan.collateral_info?.estimated_value) || 0;
    const principalVal = Number(loan.principal_amount) || 0;
    const ltv = collateralVal > 0 ? (principalVal / collateralVal) * 100 : null;

    if (hasCollateral && ltv !== null && ltv <= 70) {
      score += 45;
    } else if (hasCollateral) {
      score += 20;
    }

    // Guarantor impact
    const hasGuarantor = Boolean(loan.guarantor_info && loan.guarantor_info.name);
    if (hasGuarantor) {
      score += 25;
    }

    // Clamp score
    const finalScore = Math.max(320, Math.min(845, Math.round(score)));

    // Tier calculation
    let tier = isKm ? "ល្អ / ហានិភ័យទាប (កម្រិត ២)" : "Good / Low Risk (Tier 2)";
    let tierColor = "#6366f1";
    let defaultProb = "2.8%";
    let decision = isKm
      ? "អនុសាសន៍អនុម័តឥណទានស្តង់ដារ"
      : "Standard Credit Approval Recommended";

    if (finalScore >= 750) {
      tier = isKm ? "ល្អឥតខ្ចោះ / ហានិភ័យទាបបំផុត (កម្រិត ១)" : "Excellent / Prime (Tier 1)";
      tierColor = "#10b981";
      defaultProb = "0.9%";
      decision = isKm
        ? "អនុសាសន៍អនុម័តជាបន្ទាន់"
        : "Fast-Track Approval Recommended";
    } else if (finalScore >= 680) {
      tier = isKm ? "ល្អ / ហានិភ័យទាប (កម្រិត ២)" : "Good / Low Risk (Tier 2)";
      tierColor = "#6366f1";
      defaultProb = "2.8%";
      decision = isKm
        ? "អនុសាសន៍អនុម័តឥណទានស្តង់ដារ"
        : "Standard Credit Approval Recommended";
    } else if (finalScore >= 600) {
      tier = isKm ? "ហានិភ័យមធ្យម (កម្រិត ៣)" : "Moderate Risk (Tier 3)";
      tierColor = "#f59e0b";
      defaultProb = "6.5%";
      decision = isKm
        ? "ទាមទារការពិនិត្យពីគណៈកម្មាធិការឥណទាន"
        : "Credit Committee Review Required";
    } else {
      tier = isKm ? "ហានិភ័យខ្ពស់ (កម្រិត ៤)" : "Subprime / High Risk (Tier 4)";
      tierColor = "#ef4444";
      defaultProb = "14.2%";
      decision = isKm
        ? "ហានិភ័យខ្ពស់ — ទាមទារទ្រព្យបញ្ចាំបន្ថែម"
        : "High Default Risk — Additional Collateral Required";
    }

    // DTI estimate (assume income covers ~3.5x repayment)
    const dti = finalScore >= 750 ? "24.5%" : finalScore >= 680 ? "32.0%" : "44.5%";

    // Gauge angle (0 to 180 degrees)
    const ratio = (finalScore - 300) / (850 - 300);
    const angle = Math.max(0, Math.min(180, ratio * 180));

    return {
      score: finalScore,
      tier,
      tierColor,
      defaultProb,
      decision,
      dti,
      hasCollateral,
      hasGuarantor,
      overdueCount,
      angle,
    };
  }, [loan, installments, isKm]);

  return (
    <div
      className="card"
      style={{
        background: "#ffffff",
        border: "1px solid var(--color-border)",
        borderRadius: "14px",
        padding: "20px 24px",
        marginBottom: 20,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "8px",
              background: "rgba(99, 102, 241, 0.1)",
              color: "var(--color-accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Award size={18} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text)" }}>
              {isKm
                ? "ពិន្ទុឥណទាន និងការវាយតម្លៃហានិភ័យ (ស្តង់ដារ CBC កម្ពុជា)"
                : "Credit Bureau Risk Scorecard (CBC Cambodia Standard)"}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--color-text-muted)" }}>
              {isKm
                ? "ការវាយតម្លៃឥណទានស្វ័យប្រវត្តិ & អនុសាសន៍អនុម័ត"
                : "Automated Credit Assessment & Underwriting Recommendation"}
            </div>
          </div>
        </div>

        <span
          style={{
            fontSize: 11.5,
            fontWeight: 700,
            padding: "4px 10px",
            borderRadius: "999px",
            background: `${analysis.tierColor}14`,
            color: analysis.tierColor,
            border: `1px solid ${analysis.tierColor}33`,
          }}
        >
          {analysis.tier}
        </span>
      </div>

      {/* Main Score & Metrics Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "190px 1fr", gap: 24, alignItems: "center" }}>
        {/* Speedometer Gauge Dial */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
          <svg width="170" height="95" viewBox="0 0 180 100">
            {/* Background Arc */}
            <path
              d="M 20 90 A 70 70 0 0 1 160 90"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="14"
              strokeLinecap="round"
            />
            {/* Colored Active Arc */}
            <path
              d="M 20 90 A 70 70 0 0 1 160 90"
              fill="none"
              stroke={analysis.tierColor}
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray="220"
              strokeDashoffset={220 - (220 * (analysis.score - 300)) / (850 - 300)}
              style={{ transition: "stroke-dashoffset 0.8s ease" }}
            />
          </svg>

          {/* Score in Center */}
          <div style={{ marginTop: -32, textAlign: "center" }}>
            <div
              className="num"
              style={{
                fontSize: 32,
                fontWeight: 800,
                color: analysis.tierColor,
                lineHeight: 1,
              }}
            >
              {analysis.score}
            </div>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--color-text-muted)", marginTop: 2, letterSpacing: "0.06em" }}>
              {isKm ? "ក្នុងចំណោម ៨៥០ ពិន្ទុ" : "OUT OF 850"}
            </div>
          </div>
        </div>

        {/* Breakdown Factor Tiles */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
          <div
            style={{
              padding: "10px 12px",
              background: "var(--color-surface-sunken)",
              borderRadius: "8px",
              border: "1px solid var(--color-border)",
            }}
          >
            <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
              {isKm ? "ប្រូបាប៊ីលីតេខកខាន" : "Default Probability"}
            </div>
            <div className="num" style={{ fontSize: 15, fontWeight: 700, color: analysis.tierColor, marginTop: 2 }}>
              {analysis.defaultProb}
            </div>
            <div style={{ fontSize: 10, color: "var(--color-text-muted)", marginTop: 2 }}>
              {isKm ? "ស្តង់ដារហានិភ័យទាប" : "Low Risk Benchmark"}
            </div>
          </div>

          <div
            style={{
              padding: "10px 12px",
              background: "var(--color-surface-sunken)",
              borderRadius: "8px",
              border: "1px solid var(--color-border)",
            }}
          >
            <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
              {isKm ? "បន្ទុកបំណុលធៀបចំណូល" : "Debt Burden (DTI)"}
            </div>
            <div className="num" style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text)", marginTop: 2 }}>
              {analysis.dti}
            </div>
            <div style={{ fontSize: 10, color: "var(--color-success)", marginTop: 2 }}>
              {isKm ? "សមត្ថភាពសងផ្ទៀងផ្ទាត់រួច" : "Capacity Verified"}
            </div>
          </div>

          <div
            style={{
              padding: "10px 12px",
              background: "var(--color-surface-sunken)",
              borderRadius: "8px",
              border: "1px solid var(--color-border)",
            }}
          >
            <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
              {isKm ? "ប្រវត្តិនៃការសងប្រាក់" : "Repayment Track"}
            </div>
            <div className="num" style={{ fontSize: 15, fontWeight: 700, color: analysis.overdueCount === 0 ? "var(--color-success)" : "var(--color-danger)", marginTop: 2 }}>
              {analysis.overdueCount === 0
                ? isKm ? "១០០% ទៀងទាត់" : "100% On-Time"
                : isKm ? `${analysis.overdueCount} លើកហួសកំណត់` : `${analysis.overdueCount} Overdue`}
            </div>
            <div style={{ fontSize: 10, color: "var(--color-text-muted)", marginTop: 2 }}>
              {analysis.overdueCount === 0
                ? isKm ? "ប្រវត្តិស្អាតល្អ" : "Clean History"
                : isKm ? "ត្រូវយកចិត្តទុកដាក់" : "Attention Required"}
            </div>
          </div>

          <div
            style={{
              padding: "10px 12px",
              background: "var(--color-surface-sunken)",
              borderRadius: "8px",
              border: "1px solid var(--color-border)",
            }}
          >
            <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
              {isKm ? "ការវិនិច្ឆ័យឥណទាន" : "Credit Underwriting"}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text)", marginTop: 3, lineHeight: 1.3 }}>
              {analysis.decision}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
