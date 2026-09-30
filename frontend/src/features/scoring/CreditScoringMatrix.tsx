import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Calculator,
  ShieldCheck,
  TrendingUp,
  Award,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  Plus,
  X,
  UserCheck,
  Building2,
  Sliders,
  DollarSign,
  Percent,
} from "lucide-react";
import {
  getCreditScoringEvaluations,
  submitCreditUnderwritingEvaluation,
  type CreditScoreEvaluation,
  type CreditScoringResponse,
} from "../../api/reports";
import { formatCurrency, convertCurrencyAmount } from "../../utils/format";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useToast } from "../../context/ToastContext";
import { useBranding } from "../../context/BrandingContext";

export default function CreditScoringMatrix() {
  const { i18n } = useTranslation();
  const isKm = i18n.language === "km";
  useDocumentTitle(isKm ? "ប្រព័ន្ធវាយតម្លៃពិន្ទុឥណទាន 5Cs & អនុម័តហានិភ័យ" : "Automated 5Cs Credit Scoring & Underwriting Matrix");
  const toast = useToast();
  const { baseCurrency, usdToKhrRate } = useBranding();

  const [data, setData] = useState<CreditScoringResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTier, setFilterTier] = useState<string>("all");

  // Underwrite Modal
  const [showEvalModal, setShowEvalModal] = useState(false);
  const [borrowerName, setBorrowerName] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [phone, setPhone] = useState("");
  const [reqAmount, setReqAmount] = useState<number>(baseCurrency === "KHR" ? 8000000 : 2000);
  const [currency, setCurrency] = useState<"USD" | "KHR">((baseCurrency as "USD" | "KHR") || "USD");
  const [income, setIncome] = useState<number>(baseCurrency === "KHR" ? 2400000 : 600);
  const [expenses, setExpenses] = useState<number>(baseCurrency === "KHR" ? 1000000 : 250);
  const [existingDebt, setExistingDebt] = useState<number>(0);
  const [proposedInst, setProposedInst] = useState<number>(baseCurrency === "KHR" ? 600000 : 150);
  const [colValue, setColValue] = useState<number>(baseCurrency === "KHR" ? 20000000 : 5000);
  const [colType, setColType] = useState("ប្លង់រឹងលំនៅឋាន (Hard Title Deed)");
  const [cbcStatus, setCbcStatus] = useState("clean");
  const [evaluating, setEvaluating] = useState(false);

  // Detail Modal
  const [selectedEval, setSelectedEval] = useState<CreditScoreEvaluation | null>(null);

  function loadData() {
    setLoading(true);
    getCreditScoringEvaluations()
      .then(setData)
      .catch((err) => {
        console.error("Failed to load scoring evaluations:", err);
        toast.error(isKm ? "បរាជ័យក្នុងការទាញយកទិន្នន័យពិន្ទុឥណទាន" : "Failed to load scoring evaluations.");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleEvaluate(e: React.FormEvent) {
    e.preventDefault();
    if (!borrowerName || reqAmount <= 0 || income <= 0) {
      toast.error(isKm ? "សូមបំពេញព័ត៌មានចាំបាច់ឱ្យបានគ្រប់ជ្រុងជ្រោយ" : "Please fill in all mandatory fields.");
      return;
    }
    setEvaluating(true);
    try {
      const res = await submitCreditUnderwritingEvaluation({
        borrower_name: borrowerName,
        national_id: nationalId,
        phone,
        requested_amount: reqAmount,
        currency,
        monthly_income: income,
        monthly_expenses: expenses,
        monthly_debt_repayment: existingDebt,
        proposed_monthly_installment: proposedInst,
        collateral_value: colValue,
        collateral_type: colType,
        cbc_status: cbcStatus,
      });

      toast.success(isKm ? "ការវាយតម្លៃពិន្ទុឥណទានបានបញ្ចប់ជោគជ័យ!" : "Credit evaluation completed successfully!");
      setShowEvalModal(false);
      setSelectedEval(res.evaluation);
      loadData();
    } catch {
      toast.error(isKm ? "បរាជ័យក្នុងការវាយតម្លៃពិន្ទុ" : "Failed to evaluate credit score.");
    } finally {
      setEvaluating(false);
    }
  }

  const filteredEvals = useMemo(() => {
    if (!data) return [];
    return data.evaluations.filter((e) => {
      const matchSearch =
        e.borrower_name.toLowerCase().includes(search.toLowerCase()) ||
        e.id.toLowerCase().includes(search.toLowerCase()) ||
        e.national_id.includes(search);
      const matchTier = filterTier === "all" || e.risk_tier === filterTier || e.recommendation === filterTier;
      return matchSearch && matchTier;
    });
  }, [data, search, filterTier]);

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: "var(--color-text)" }}>
            {isKm ? "ប្រព័ន្ធវាយតម្លៃពិន្ទុឥណទាន 5Cs & អនុម័តហានិភ័យ" : "Automated 5Cs Credit Scoring & Underwriting Matrix"}
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--color-text-muted)" }}>
            {isKm
              ? "វិភាគទិន្នន័យ 5Cs (កេរ្តិ៍ឈ្មោះ សមត្ថភាព ដើមទុន ទ្រព្យធានា និងទីផ្សារ) គណនា DSCR & LTV និងកំណត់អនុសាសន៍អនុម័ត"
              : "Comprehensive 5Cs evaluation engine, automated DSCR/LTV calculations, and risk-adjusted credit limit recommendations."}
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
              setCurrency((baseCurrency as "USD" | "KHR") || "USD");
              setReqAmount(baseCurrency === "KHR" ? 8000000 : 2000);
              setIncome(baseCurrency === "KHR" ? 2400000 : 600);
              setExpenses(baseCurrency === "KHR" ? 1000000 : 250);
              setProposedInst(baseCurrency === "KHR" ? 600000 : 150);
              setColValue(baseCurrency === "KHR" ? 20000000 : 5000);
              setShowEvalModal(true);
            }}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Plus size={16} />
            <span>{isKm ? "វាយតម្លៃពាក្យស្នើសុំថ្មី" : "New Underwriting Evaluation"}</span>
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
              {isKm ? "ពិន្ទុមធ្យមផលប័ត្រ (Average Score)" : "Portfolio Average Score"}
            </span>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(59, 130, 246, 0.12)", color: "#3b82f6", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Award size={18} />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "var(--color-accent)" }}>
            {data?.summary.average_score || 0} / 850
          </div>
          <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginTop: 4 }}>
            {isKm ? "កម្រិតហានិភ័យមធ្យម៖ កម្រិត B+ (ល្អ)" : "Portfolio risk grade: Tier B+ (Prime)"}
          </div>
        </div>

        <div className="card" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: "var(--color-text-muted)", fontWeight: 500 }}>
              {isKm ? "អនុម័តស្វ័យប្រវត្តិ (Auto Approved)" : "Auto-Approved"}
            </span>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(16, 185, 129, 0.12)", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "var(--color-success)" }}>
            {data?.summary.auto_approved_count || 0}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginTop: 4 }}>
            {isKm ? "ពិន្ទុ >= 680, DSCR >= 1.2, LTV <= 70%" : "Met all institutional risk thresholds"}
          </div>
        </div>

        <div className="card" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: "var(--color-text-muted)", fontWeight: 500 }}>
              {isKm ? "បញ្ជូនគណៈកម្មការឥណទាន (Review)" : "Committee Review"}
            </span>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(245, 158, 11, 0.12)", color: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "var(--color-warning)" }}>
            {data?.summary.committee_review_count || 0}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginTop: 4 }}>
            {isKm ? "ទាមទារការសម្រេចពីថ្នាក់ដឹកនាំ" : "Requires credit committee escalation"}
          </div>
        </div>

        <div className="card" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: "var(--color-text-muted)", fontWeight: 500 }}>
              {isKm ? "បដិសេធ (Declined)" : "Declined"}
            </span>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: "rgba(239, 68, 68, 0.12)", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <XCircle size={18} />
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "var(--color-danger)" }}>
            {data?.summary.declined_count || 0}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginTop: 4 }}>
            {isKm ? "ហានិភ័យខ្ពស់លើសកម្រិតកំណត់" : "High credit or stacking default risk"}
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
            { id: "all", labelKm: "ការវាយតម្លៃទាំងអស់", labelEn: "All Evaluations" },
            { id: "AUTO_APPROVE", labelKm: "អនុម័តស្វ័យប្រវត្តិ", labelEn: "Auto Approved" },
            { id: "COMMITTEE_REVIEW", labelKm: "គណៈកម្មការពិនិត្យ", labelEn: "Committee Review" },
            { id: "DECLINE", labelKm: "បដិសេធ", labelEn: "Declined" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`btn btn-sm ${filterTier === tab.id ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setFilterTier(tab.id)}
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
            placeholder={isKm ? "ស្វែងរកឈ្មោះ, លេខកូដ, អត្តសញ្ញាណប័ណ្ណ..." : "Search applicant, ID, ref..."}
            style={{ paddingLeft: 32, fontSize: 13, width: "100%", borderRadius: 6 }}
          />
        </div>
      </div>

      {/* Evaluations Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--color-surface-sunken)", borderBottom: "1px solid var(--color-border)" }}>
                <th style={{ padding: "12px 16px", textAlign: "left" }}>{isKm ? "លេខកូដ / កាលបរិច្ឆេទ" : "Ref / Date"}</th>
                <th style={{ padding: "12px 16px", textAlign: "left" }}>{isKm ? "ឈ្មោះអ្នកខ្ចី & អត្តសញ្ញាណប័ណ្ណ" : "Borrower & National ID"}</th>
                <th style={{ padding: "12px 16px", textAlign: "right" }}>{isKm ? "ទំហំកម្ចីស្នើសុំ" : "Requested Loan"}</th>
                <th style={{ padding: "12px 16px", textAlign: "center" }}>{isKm ? "ពិន្ទុឥណទាន (Score)" : "Score & Tier"}</th>
                <th style={{ padding: "12px 16px", textAlign: "center" }}>{isKm ? "សូចនាករ DSCR / LTV" : "DSCR / LTV Metrics"}</th>
                <th style={{ padding: "12px 16px", textAlign: "center" }}>{isKm ? "អនុសាសន៍ប្រព័ន្ធ" : "Recommendation"}</th>
                <th style={{ padding: "12px 16px", textAlign: "center" }}>{isKm ? "សកម្មភាព" : "Action"}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "36px 0", color: "var(--color-text-muted)" }}>
                    <RefreshCw size={22} className="animate-spin" style={{ margin: "0 auto 8px" }} />
                    <div>{isKm ? "កំពុងទាញយកទិន្នន័យ..." : "Loading evaluations..."}</div>
                  </td>
                </tr>
              ) : filteredEvals.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "36px 0", color: "var(--color-text-muted)" }}>
                    {isKm ? "មិនមានការវាយតម្លៃពិន្ទុឥណទានទេ" : "No evaluations found."}
                  </td>
                </tr>
              ) : (
                filteredEvals.map((e) => (
                  <tr key={e.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    {/* Ref & Date */}
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontWeight: 700, color: "var(--color-text)", fontFamily: "monospace" }}>{e.id}</div>
                      <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>{e.created_at}</div>
                    </td>

                    {/* Borrower */}
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontWeight: 600, color: "var(--color-text)" }}>{e.borrower_name}</div>
                      <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginTop: 2 }}>
                        ID: {e.national_id || "N/A"} • {e.phone || "N/A"}
                      </div>
                    </td>

                    {/* Requested Amount */}
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "var(--color-text)" }}>
                        {formatCurrency(e.requested_amount, e.currency)}
                      </div>
                      {e.currency !== baseCurrency && (
                        <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>
                          ≈ {formatCurrency(convertCurrencyAmount(e.requested_amount, e.currency, baseCurrency, usdToKhrRate), baseCurrency)}
                        </div>
                      )}
                    </td>

                    {/* Score & Tier */}
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: e.scores.overall_score >= 700 ? "var(--color-success)" : e.scores.overall_score >= 600 ? "var(--color-warning)" : "var(--color-danger)" }}>
                        {e.scores.overall_score}
                      </div>
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          padding: "1px 6px",
                          borderRadius: 4,
                          background: "var(--color-surface-sunken)",
                          color: "var(--color-text)",
                        }}
                      >
                        Tier {e.risk_tier}
                      </span>
                    </td>

                    {/* Metrics */}
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>DSCR: {e.metrics.dscr}x</div>
                      <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>LTV: {e.metrics.ltv_pct}% • DTI: {e.metrics.dti_pct}%</div>
                    </td>

                    {/* Recommendation */}
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
                            e.recommendation === "AUTO_APPROVE"
                              ? "rgba(16, 185, 129, 0.12)"
                              : e.recommendation === "COMMITTEE_REVIEW"
                              ? "rgba(245, 158, 11, 0.12)"
                              : "rgba(239, 68, 68, 0.12)",
                          color:
                            e.recommendation === "AUTO_APPROVE"
                              ? "#10b981"
                              : e.recommendation === "COMMITTEE_REVIEW"
                              ? "#f59e0b"
                              : "#ef4444",
                        }}
                      >
                        {e.recommendation === "AUTO_APPROVE" ? (
                          <>
                            <CheckCircle2 size={12} />
                            <span>{isKm ? "អនុម័តស្វ័យប្រវត្តិ" : "Auto Approve"}</span>
                          </>
                        ) : e.recommendation === "COMMITTEE_REVIEW" ? (
                          <>
                            <AlertTriangle size={12} />
                            <span>{isKm ? "គណៈកម្មការពិនិត្យ" : "Committee Review"}</span>
                          </>
                        ) : (
                          <>
                            <XCircle size={12} />
                            <span>{isKm ? "បដិសេធ" : "Decline"}</span>
                          </>
                        )}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        onClick={() => setSelectedEval(e)}
                        style={{ borderRadius: 6, fontSize: 12 }}
                      >
                        {isKm ? "មើលលម្អិត 5Cs" : "View 5Cs Breakdown"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Evaluation Modal */}
      {showEvalModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowEvalModal(false)}
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
            style={{ width: "100%", maxWidth: 640, maxHeight: "90vh", overflowY: "auto", padding: 24, borderRadius: 16 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
                  {isKm ? "វាយតម្លៃពិន្ទុឥណទាន 5Cs & ហានិភ័យកម្ចី" : "Underwrite Loan Application (5Cs Matrix)"}
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--color-text-muted)" }}>
                  {isKm ? "បញ្ចូលទិន្នន័យហិរញ្ញវត្ថុរបស់អតិថិជនដើម្បីគណនាពិន្ទុ និងអនុសាសន៍" : "Enter applicant financial profile to compute risk score and DSCR."}
                </p>
              </div>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setShowEvalModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEvaluate}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Borrower Info */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                      {isKm ? "ឈ្មោះពេញអ្នកខ្ចី *" : "Borrower Name *"}
                    </label>
                    <input
                      type="text"
                      required
                      value={borrowerName}
                      onChange={(e) => setBorrowerName(e.target.value)}
                      placeholder={isKm ? "ឧ. សុខ វិបុល" : "e.g. Sok Vibul"}
                      className="input"
                      style={{ width: "100%" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                      {isKm ? "លេខអត្តសញ្ញាណប័ណ្ណ" : "National ID"}
                    </label>
                    <input
                      type="text"
                      value={nationalId}
                      onChange={(e) => setNationalId(e.target.value)}
                      placeholder="010992381"
                      className="input"
                      style={{ width: "100%" }}
                    />
                  </div>
                </div>

                {/* Requested Loan & Currency */}
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                      {isKm ? "ទំហំកម្ចីស្នើសុំ *" : "Requested Amount *"}
                    </label>
                    <input
                      type="number"
                      required
                      min={10}
                      step="any"
                      value={reqAmount || ""}
                      onChange={(e) => setReqAmount(parseFloat(e.target.value) || 0)}
                      className="input"
                      style={{ width: "100%", fontWeight: 700 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                      {isKm ? "រូបិយប័ណ្ណ" : "Currency"}
                    </label>
                    <select
                      value={currency}
                      onChange={(e) => {
                        const newCur = e.target.value as "USD" | "KHR";
                        setCurrency(newCur);
                        if (newCur === "KHR" && reqAmount < 50000) {
                          setReqAmount(reqAmount * (usdToKhrRate || 4100));
                          setIncome(income * (usdToKhrRate || 4100));
                          setExpenses(expenses * (usdToKhrRate || 4100));
                          setProposedInst(proposedInst * (usdToKhrRate || 4100));
                          setColValue(colValue * (usdToKhrRate || 4100));
                        } else if (newCur === "USD" && reqAmount >= 50000) {
                          setReqAmount(Math.round(reqAmount / (usdToKhrRate || 4100)));
                          setIncome(Math.round(income / (usdToKhrRate || 4100)));
                          setExpenses(Math.round(expenses / (usdToKhrRate || 4100)));
                          setProposedInst(Math.round(proposedInst / (usdToKhrRate || 4100)));
                          setColValue(Math.round(colValue / (usdToKhrRate || 4100)));
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

                {/* Income & Expenses */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                      {isKm ? "ចំណូលសុទ្ធប្រចាំខែ *" : "Monthly Net Income *"}
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      step="any"
                      value={income || ""}
                      onChange={(e) => setIncome(parseFloat(e.target.value) || 0)}
                      className="input"
                      style={{ width: "100%" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                      {isKm ? "ចំណាយជីវភាពប្រចាំខែ" : "Monthly Living Expenses"}
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={expenses || ""}
                      onChange={(e) => setExpenses(parseFloat(e.target.value) || 0)}
                      className="input"
                      style={{ width: "100%" }}
                    />
                  </div>
                </div>

                {/* Proposed Installment & Existing Debt */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                      {isKm ? "ប្រាក់ត្រូវសងកម្ចីថ្មីប្រចាំខែ *" : "Proposed Monthly Installment *"}
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      step="any"
                      value={proposedInst || ""}
                      onChange={(e) => setProposedInst(parseFloat(e.target.value) || 0)}
                      className="input"
                      style={{ width: "100%" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                      {isKm ? "ប្រាក់ត្រូវសងកម្ចីផ្សេងទៀត (បច្ចុប្បន្ន)" : "Existing Debt Repayments"}
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={existingDebt || ""}
                      onChange={(e) => setExistingDebt(parseFloat(e.target.value) || 0)}
                      className="input"
                      style={{ width: "100%" }}
                    />
                  </div>
                </div>

                {/* Collateral & CBC Status */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                      {isKm ? "តម្លៃទីផ្សារទ្រព្យធានា" : "Collateral Valuation"}
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={colValue || ""}
                      onChange={(e) => setColValue(parseFloat(e.target.value) || 0)}
                      className="input"
                      style={{ width: "100%" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                      {isKm ? "ស្ថានភាពប្រវត្តិកម្ចី CBC" : "CBC Credit History"}
                    </label>
                    <select
                      value={cbcStatus}
                      onChange={(e) => setCbcStatus(e.target.value)}
                      className="input"
                      style={{ width: "100%" }}
                    >
                      <option value="clean">{isKm ? "ប្រវត្តិស្អាតល្អ (Clean - No DPD)" : "Clean (No Delinquency)"}</option>
                      <option value="minor_overdue">{isKm ? "ធ្លាប់យឺតតិចតួច (1 - 29 DPD)" : "Minor Delinquency (1-29 DPD)"}</option>
                      <option value="major_overdue">{isKm ? "មានប្រវត្តិយឺត >30 DPD" : "Major Overdue (>30 DPD)"}</option>
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
                <button type="button" className="btn" onClick={() => setShowEvalModal(false)} disabled={evaluating}>
                  {isKm ? "បោះបង់" : "Cancel"}
                </button>
                <button type="submit" className="btn btn-primary" disabled={evaluating}>
                  {evaluating ? (isKm ? "កំពុងវិភាគ..." : "Computing...") : (isKm ? "គណនាពិន្ទុ & វាយតម្លៃ" : "Calculate & Underwrite")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5Cs Breakdown Detail Modal */}
      {selectedEval && (
        <div
          className="modal-backdrop"
          onClick={() => setSelectedEval(null)}
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
            style={{ width: "100%", maxWidth: 580, maxHeight: "90vh", overflowY: "auto", padding: 26, borderRadius: 16 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-accent)" }}>{selectedEval.id}</span>
                <h3 style={{ margin: "2px 0 0", fontSize: 20, fontWeight: 800 }}>
                  {selectedEval.borrower_name}
                </h3>
                <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                  {isKm ? "កាលបរិច្ឆេទវាយតម្លៃ៖ " : "Evaluation Date: "}{selectedEval.created_at}
                </div>
              </div>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setSelectedEval(null)}>
                <X size={18} />
              </button>
            </div>

            {/* Score Summary Box */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 20px",
                borderRadius: 12,
                background: "var(--color-surface-sunken)",
                marginBottom: 20,
              }}
            >
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase" }}>
                  {isKm ? "ពិន្ទុឥណទានសរុប (Credit Score)" : "Overall Credit Score"}
                </div>
                <div style={{ fontSize: 32, fontWeight: 900, color: "var(--color-accent)", marginTop: 2 }}>
                  {selectedEval.scores.overall_score} <span style={{ fontSize: 16, fontWeight: 600, color: "var(--color-text-muted)" }}>/ 850</span>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span
                  style={{
                    display: "inline-block",
                    padding: "4px 12px",
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 800,
                    background:
                      selectedEval.recommendation === "AUTO_APPROVE"
                        ? "rgba(16, 185, 129, 0.15)"
                        : selectedEval.recommendation === "COMMITTEE_REVIEW"
                        ? "rgba(245, 158, 11, 0.15)"
                        : "rgba(239, 68, 68, 0.15)",
                    color:
                      selectedEval.recommendation === "AUTO_APPROVE"
                        ? "#10b981"
                        : selectedEval.recommendation === "COMMITTEE_REVIEW"
                        ? "#f59e0b"
                        : "#ef4444",
                  }}
                >
                  {selectedEval.recommendation} (Tier {selectedEval.risk_tier})
                </span>
                <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginTop: 4 }}>
                  {isKm ? "ទំហំកម្ចីអតិបរមាណែនាំ៖ " : "Max Recommended Limit: "}
                  <strong>{formatCurrency(selectedEval.max_approved_limit, selectedEval.currency)}</strong>
                </div>
              </div>
            </div>

            {/* 5Cs Breakdown Bars */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
                {isKm ? "ការវិភាគលម្អិតតាមលក្ខខណ្ឌ 5Cs នៃឥណទាន៖" : "Detailed 5Cs Dimension Scoring:"}
              </div>

              {[
                { nameKm: "Character (កេរ្តិ៍ឈ្មោះ & CBC)", nameEn: "Character & CBC Integrity", score: selectedEval.scores.character },
                { nameKm: `Capacity (សមត្ថភាពសង - DSCR: ${selectedEval.metrics.dscr}x)`, nameEn: `Capacity (Debt Service - DSCR: ${selectedEval.metrics.dscr}x)`, score: selectedEval.scores.capacity },
                { nameKm: "Capital (ទំហំដើមទុន & ទ្រព្យផ្ទាល់ខ្លួន)", nameEn: "Capital & Net Worth", score: selectedEval.scores.capital },
                { nameKm: `Collateral (ទ្រព្យបញ្ចាំ - LTV: ${selectedEval.metrics.ltv_pct}%)`, nameEn: `Collateral Coverage (LTV: ${selectedEval.metrics.ltv_pct}%)`, score: selectedEval.scores.collateral },
                { nameKm: "Conditions (ស្ថានភាពទីផ្សារ & មុខរបរ)", nameEn: "Market & Economic Conditions", score: selectedEval.scores.conditions },
              ].map((c, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <span>{isKm ? c.nameKm : c.nameEn}</span>
                    <span style={{ fontWeight: 700 }}>{c.score} / 100</span>
                  </div>
                  <div style={{ width: "100%", height: 6, background: "var(--color-border)", borderRadius: 3, overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${c.score}%`,
                        height: "100%",
                        background: c.score >= 80 ? "var(--color-success)" : c.score >= 60 ? "var(--color-accent)" : "var(--color-warning)",
                        borderRadius: 3,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedEval(null)}>
                {isKm ? "បិទផ្ទាំង" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
