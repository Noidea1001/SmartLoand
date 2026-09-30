import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Download, Printer, Shield, UserPlus, Award, FileText } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import {
  downloadLoanAgreement, downloadLoanStatement, getLoan, getLoanInstallments,
  prepayLoan, recordPayment, restructureLoan, writeOffLoan,
} from "../../api/loans";
import type { Installment, Loan } from "../../api/types";
import { usePermission } from "../../hooks/usePermission";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmContext";
import { formatCurrency, formatDate, formatPercent, convertCurrencyAmount } from "../../utils/format";
import { useBranding } from "../../context/BrandingContext";
import StatusPill from "../../components/ui/StatusPill";
import PaymentModal from "../../components/payments/PaymentModal";
import ReceiptModal from "../../components/payments/ReceiptModal";
import CreditScoreCard from "../../components/loans/CreditScoreCard";
import CreditScorecardModal from "../../components/loans/CreditScorecardModal";
import LoanClearanceModal from "../../components/loans/LoanClearanceModal";
import LoanAgreementModal from "../../components/loans/LoanAgreementModal";
import type { PaymentItem } from "../../api/payments";

function errorMessage(err: any, fallback: string): string {
  return err?.response?.data?.detail || fallback;
}

export default function LoanDetail() {
  const { t, i18n } = useTranslation();
  const isKm = i18n.language === "km";
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const confirm = useConfirm();
  const { baseCurrency, usdToKhrRate } = useBranding();
  const [loan, setLoan] = useState<Loan | null>(null);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(true);
  const canRecordPayment = usePermission("payments.record");
  const canLifecycle = usePermission("loans.lifecycle");
  const canViewReports = usePermission("reports.view");

  const [paymentModalInst, setPaymentModalInst] = useState<any | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<PaymentItem | null>(null);
  const [clearanceOpen, setClearanceOpen] = useState(false);
  const [agreementOpen, setAgreementOpen] = useState(false);
  const [scorecardOpen, setScorecardOpen] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [prepayAmount, setPrepayAmount] = useState("");
  const [showRestructure, setShowRestructure] = useState(false);
  const [newTerm, setNewTerm] = useState("");
  const [newRate, setNewRate] = useState("");
  const [writeOffReason, setWriteOffReason] = useState("");
  const [showWriteOff, setShowWriteOff] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"schedule" | "actions">("schedule");

  function load() {
    if (!id) return;
    setLoading(true);
    Promise.all([getLoan(id), getLoanInstallments(id)])
      .then(([l, insts]) => {
        setLoan(l);
        setInstallments(insts);
        document.title = `Loan ${formatCurrency(l.principal_amount, l.principal_currency)} -- Smart Loan`;
      })
      .catch(() => toast.error(isKm ? "មិនអាចទាញយកទិន្នន័យកម្ចីនេះបានទេ។" : "Failed to load this loan."))
      .finally(() => setLoading(false));
  }

  useEffect(load, [id]);

  if (loading || !loan) return (
    <div style={{ padding: 60, textAlign: "center" }}>
      <div className="skeleton skeleton-heading" style={{ margin: "0 auto 12px" }}></div>
      <div className="skeleton skeleton-text" style={{ maxWidth: 300, margin: "0 auto" }}></div>
      <div className="skeleton skeleton-text" style={{ maxWidth: 200, margin: "0 auto" }}></div>
    </div>
  );

  // Compute repayment progress
  const totalDue = installments.reduce((sum, i) => sum + Number(i.amount_due), 0);
  const totalPaid = installments.reduce((sum, i) => sum + Number(i.amount_paid), 0);
  const progressPct = totalDue > 0 ? Math.min(100, Math.round((totalPaid / totalDue) * 100)) : 0;
  const paidCount = installments.filter((i) => i.status === "paid").length;

  async function handlePay(installmentId: string) {
    setSubmitting(true);
    try {
      await recordPayment(installmentId, Number(payAmount), loan!.principal_currency);
      toast.success(isKm ? "បានកត់ត្រាការបង់ប្រាក់ដោយជោគជ័យ។" : "Payment recorded.");
      setPayingId(null);
      setPayAmount("");
      load();
    } catch (err) {
      toast.error(errorMessage(err, isKm ? "មិនអាចកត់ត្រាការបង់ប្រាក់បានទេ។" : "Failed to record payment."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePrepay() {
    if (!id) return;
    setSubmitting(true);
    try {
      await prepayLoan(id, Number(prepayAmount));
      toast.success(isKm ? "បានអនុវត្តការទូទាត់មុនកាលកំណត់ដោយជោគជ័យ។" : "Prepayment applied.");
      setPrepayAmount("");
      load();
    } catch (err) {
      toast.error(errorMessage(err, isKm ? "មិនអាចអនុវត្តការទូទាត់មុនកាលកំណត់បានទេ។" : "Failed to record prepayment."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRestructure() {
    if (!id) return;
    const ok = await confirm({
      title: isKm ? "តើអ្នកចង់រៀបចំរចនាសម្ព័ន្ធកម្ចីនេះឡើងវិញមែនទេ?" : "Restructure this loan?",
      message: isKm
        ? "សកម្មភាពនេះនឹងជំនួសដំណាក់កាលដែលមិនទាន់បង់ទាំងអស់ដោយកាលវិភាគថ្មី ផ្អែកលើរយៈពេល និងអត្រាការប្រាក់ថ្មី។ ដំណាក់កាលដែលបានបង់រួចនឹងមិនផ្លាស់ប្តូរឡើយ។"
        : "This replaces every unpaid installment with a new schedule under the new term and rate. Paid installments are untouched.",
      confirmLabel: isKm ? "រៀបចំរចនាសម្ព័ន្ធ" : "Restructure",
    });
    if (!ok) return;
    setSubmitting(true);
    try {
      await restructureLoan(id, Number(newTerm), Number(newRate));
      toast.success(isKm ? "កម្ចីត្រូវបានរៀបចំរចនាសម្ព័ន្ធឡើងវិញជោគជ័យ។" : "Loan restructured.");
      setShowRestructure(false);
      load();
    } catch (err) {
      toast.error(errorMessage(err, isKm ? "មិនអាចរៀបចំរចនាសម្ព័ន្ធកម្ចីបានទេ។" : "Failed to restructure loan."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleWriteOff() {
    if (!id) return;
    const ok = await confirm({
      title: isKm ? "តើអ្នកចង់លុបចោលបំណុលកម្ចីនេះមែនទេ?" : "Write off this loan?",
      message: isKm
        ? "សកម្មភាពនេះនឹងកត់ត្រាកម្ចីនេះជាបំណុលខូចដែលលុបចោល។ សកម្មភាពនេះមិនអាចត្រឡប់វិញបានដោយងាយទេ។"
        : "This marks the loan as written off. This action cannot be easily undone.",
      confirmLabel: isKm ? "លុបចោលបំណុល" : "Write off",
      danger: true,
    });
    if (!ok) return;
    setSubmitting(true);
    try {
      await writeOffLoan(id, writeOffReason);
      toast.success(isKm ? "បានលុបចោលបំណុលកម្ចីដោយជោគជ័យ។" : "Loan written off.");
      setShowWriteOff(false);
      load();
    } catch (err) {
      toast.error(errorMessage(err, isKm ? "មិនអាចលុបចោលបំណុលកម្ចីបានទេ។" : "Failed to write off loan."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDownloadStatement() {
    if (!loan) return;
    try {
      toast.info(isKm ? "កំពុងទាញយករបាយការណ៍សង្ខេបកម្ចី..." : "Generating loan statement PDF...", { title: isKm ? "ដំណើរការឯកសារ" : "Exporting Document" });
      await downloadLoanStatement(loan.id);
      toast.success(isKm ? "បានទាញយករបាយការណ៍សង្ខេបដោយជោគជ័យ។" : "Loan statement downloaded successfully.", { title: isKm ? "បានទាញយក" : "Downloaded" });
    } catch {
      toast.error(isKm ? "មិនអាចទាញយករបាយការណ៍សង្ខេបបានទេ។" : "Failed to download statement.", { title: isKm ? "កំហុស" : "Download Error" });
    }
  }

  async function handleDownloadAgreement() {
    if (!loan) return;
    try {
      toast.info(isKm ? "កំពុងទាញយកកិច្ចសន្យាឥណទាន..." : "Generating loan agreement contract PDF...", { title: isKm ? "ដំណើរការឯកសារ" : "Exporting Document" });
      await downloadLoanAgreement(loan.id);
      toast.success(isKm ? "បានទាញយកកិច្ចសន្យាឥណទានដោយជោគជ័យ។" : "Loan agreement contract downloaded successfully.", { title: isKm ? "បានទាញយក" : "Downloaded" });
    } catch {
      toast.error(isKm ? "មិនអាចទាញយកកិច្ចសន្យាបានទេ។" : "Failed to download agreement.", { title: isKm ? "កំហុស" : "Download Error" });
    }
  }

  return (
    <div>
      {/* Back navigation */}
      <Link to="/loans" className="no-print" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--color-text-muted)", marginBottom: 16 }}>
        <ArrowLeft size={14} /> {isKm ? "ត្រឡប់ទៅ" : "Back to"} {t("nav.loans")}
      </Link>

      {/* Official Print Header (Visible only when printed) */}
      <div className="print-only" style={{ display: "none", marginBottom: 24, borderBottom: "2px solid #0f172a", paddingBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, textTransform: "uppercase", letterSpacing: "0.04em", color: "#0f172a", fontWeight: 900 }}>
              {isKm ? "គ្រឹះស្ថានមីក្រូហិរញ្ញវត្ថុ ស្មាត ឡូន ភីអិលស៊ី" : "SMART LOAN PLATFORM MFI PLC."}
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>
              {isKm ? "កិច្ចសន្យាឥណទាន និងតារាងកាលវិភាគបង់រំលស់ផ្លូវការ" : "Official Credit Contract & Amortization Statement"}
            </p>
          </div>
          <div style={{ textAlign: "right", fontSize: 11, color: "#64748b" }}>
            <div style={{ fontWeight: 700, color: "#0f172a" }}>
              {isKm ? "លេខកិច្ចសន្យា៖ " : "CONTRACT REF: "}#{loan.id.slice(0, 8).toUpperCase()}
            </div>
            <div>{isKm ? "កាលបរិច្ឆេទចេញ៖ " : "Issued: "}{formatDate(loan.start_date, isKm ? "km" : "en")}</div>
            <div>{isKm ? "កាលបរិច្ឆេទបង្កើត៖ " : "Generated: "}{formatDate(new Date().toISOString(), isKm ? "km" : "en")}</div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div>
            <h1 className="num" style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>
              {formatCurrency(loan.principal_amount, loan.principal_currency)}
            </h1>
            {loan.principal_currency !== baseCurrency && (
              <div style={{ fontSize: 13.5, color: "var(--color-text-muted)", fontWeight: 600, marginTop: 2 }}>
                ≈ {formatCurrency(convertCurrencyAmount(loan.principal_amount, loan.principal_currency, baseCurrency, usdToKhrRate), baseCurrency)}
              </div>
            )}
          </div>
          <StatusPill status={loan.status} />
        </div>
        {canViewReports && (
          <div className="page-actions no-print">
            {loan.status === "closed" && (
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => setClearanceOpen(true)}
                style={{ borderRadius: "8px", display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <Award size={15} /> {isKm ? "លិខិតបញ្ជាក់រួចបំណុល" : "Clearance Certificate"}
              </button>
            )}
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => setScorecardOpen(true)}
              style={{ borderRadius: "8px", display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <Award size={15} /> {isKm ? "ពិន្ទុឥណទាន & ហានិភ័យ" : "Credit Scorecard"}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => setAgreementOpen(true)}
              style={{ borderRadius: "8px", display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <FileText size={15} /> {isKm ? "កិច្ចសន្យាឥណទាន" : "Agreement Contract"}
            </button>
            <button className="btn btn-sm" onClick={() => window.print()}>
              <Printer size={15} /> {isKm ? "បោះពុម្ព" : "Print"}
            </button>
            <button className="btn btn-sm" onClick={handleDownloadStatement}>
              <Download size={15} /> {isKm ? "របាយការណ៍សង្ខេប" : "Statement"}
            </button>
          </div>
        )}
      </div>

      {/* Loan info cards */}
      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <div className="detail-grid">
          <div className="detail-item">
            <div className="detail-item-label">{isKm ? "អតិថិជន / អ្នកខ្ចី" : "Client"}</div>
            <div className="detail-item-value" style={{ fontSize: 16, fontWeight: 700 }}>
              {loan.client_name || (isKm ? "អតិថិជន" : "Borrower")}
            </div>
          </div>
          <div className="detail-item">
            <div className="detail-item-label">{isKm ? "អត្រាការប្រាក់" : t("loans.interestRate")}</div>
            <div className="detail-item-value num" style={{ fontSize: 16 }}>
              {formatPercent(loan.interest_rate_percent)} {isKm ? "/ ខែ" : "/ mo"}
            </div>
          </div>
          <div className="detail-item">
            <div className="detail-item-label">{isKm ? "ប្រភេទការប្រាក់" : t("loans.interestType")}</div>
            <div className="detail-item-value" style={{ fontSize: 16 }}>
              {isKm
                ? (loan.interest_type === "reducing" ? "ការប្រាក់ថយចុះ" : "ការប្រាក់ថេរ")
                : (loan.interest_type === "reducing" ? "Reducing" : "Flat")}
            </div>
          </div>
          <div className="detail-item">
            <div className="detail-item-label">{isKm ? "រយៈពេលកម្ចី" : t("loans.termMonths")}</div>
            <div className="detail-item-value num" style={{ fontSize: 16 }}>
              {loan.term_months} {isKm ? "ខែ" : "months"}
            </div>
          </div>
          <div className="detail-item">
            <div className="detail-item-label">{isKm ? "កាលបរិច្ឆេទចាប់ផ្តើម" : t("loans.startDate")}</div>
            <div className="detail-item-value num" style={{ fontSize: 16 }}>
              {formatDate(loan.start_date, isKm ? "km" : "en")}
            </div>
          </div>
          <div className="detail-item">
            <div className="detail-item-label">{isKm ? "រយៈពេលអនុគ្រោះ" : "Grace Period"}</div>
            <div className="detail-item-value num" style={{ fontSize: 16 }}>
              {loan.grace_period_days} {isKm ? "ថ្ងៃ" : "days"}
            </div>
          </div>
        </div>
      </div>

      {/* Security & Guarantor Cards */}
      {(loan.collateral_info?.description || loan.guarantor_info?.name) && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 20 }}>
          {loan.collateral_info?.description && (
            <div className="card" style={{ padding: 20, background: "#ffffff", borderRadius: "10px", border: "1px solid var(--color-border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: "6px", background: "rgba(99, 102, 241, 0.1)", color: "var(--color-accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Shield size={16} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text)" }}>
                    {isKm ? "ទ្រព្យបញ្ចាំ / វត្ថុធានា" : "Collateral Asset"}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                    {isKm ? "ការធានាសុវត្ថិភាពឥណទាន" : "Pledged Security Guarantee"}
                  </div>
                </div>
              </div>
              <div style={{ display: "grid", gap: 8, fontSize: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--color-text-muted)" }}>{isKm ? "ប្រភេទទ្រព្យ៖" : "Category:"}</span>
                  <span style={{ fontWeight: 600, textTransform: "capitalize" }}>
                    {isKm ? (
                      loan.collateral_info.asset_type === "land_hard_title" ? "ប័ណ្ណកម្មសិទ្ធិ (ប្លង់រឹង)" :
                      loan.collateral_info.asset_type === "land_soft_title" ? "លិខិតផ្ទេរសិទ្ធិ (ប្លង់ទន់)" :
                      loan.collateral_info.asset_type === "vehicle" ? "យានយន្ត" :
                      loan.collateral_info.asset_type === "equipment" ? "សម្ភារៈ/គ្រឿងចក្រ" :
                      loan.collateral_info.asset_type === "gold" ? "មាស/គ្រឿងអលង្ការ" : "ផ្សេងៗ"
                    ) : (
                      loan.collateral_info.asset_type?.replace(/_/g, " ") || "Real Estate"
                    )}
                  </span>
                </div>
                {loan.collateral_info.document_reference && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--color-text-muted)" }}>{isKm ? "លេខប័ណ្ណសម្គាល់៖" : "Doc / Title #:"}</span>
                    <span className="num" style={{ fontWeight: 700 }}>{loan.collateral_info.document_reference}</span>
                  </div>
                )}
                {Number(loan.collateral_info.estimated_value) > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--color-text-muted)" }}>{isKm ? "តម្លៃប៉ាន់ស្មាន៖" : "Assessed Value:"}</span>
                    <span className="num" style={{ fontWeight: 700, color: "var(--color-success)" }}>
                      {formatCurrency(loan.collateral_info.estimated_value || 0, loan.principal_currency)}
                    </span>
                  </div>
                )}
                <div style={{ color: "var(--color-text-secondary)", fontSize: 12, marginTop: 4, background: "var(--color-surface-sunken)", padding: "6px 10px", borderRadius: "6px" }}>
                  {loan.collateral_info.description}
                </div>
              </div>
            </div>
          )}

          {loan.guarantor_info?.name && (
            <div className="card" style={{ padding: 20, background: "#ffffff", borderRadius: "10px", border: "1px solid var(--color-border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: "6px", background: "rgba(16, 185, 129, 0.1)", color: "var(--color-success)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <UserPlus size={16} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text)" }}>
                    {isKm ? "អ្នកធានា" : "Guarantor"}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                    {isKm ? "ការធានារួមគ្នា និងកាតព្វកិច្ចច្បាប់" : "Co-Borrower & Legal Guarantee"}
                  </div>
                </div>
              </div>
              <div style={{ display: "grid", gap: 8, fontSize: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--color-text-muted)" }}>{isKm ? "ឈ្មោះពេញ៖" : "Full Name:"}</span>
                  <span style={{ fontWeight: 700 }}>{loan.guarantor_info.name}</span>
                </div>
                {loan.guarantor_info.relationship && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--color-text-muted)" }}>{isKm ? "ត្រូវជា៖" : "Relationship:"}</span>
                    <span style={{ fontWeight: 600 }}>{loan.guarantor_info.relationship}</span>
                  </div>
                )}
                {loan.guarantor_info.phone && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--color-text-muted)" }}>{isKm ? "ទូរស័ព្ទ៖" : "Phone:"}</span>
                    <span className="num" style={{ fontWeight: 600 }}>{loan.guarantor_info.phone}</span>
                  </div>
                )}
                {loan.guarantor_info.national_id && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--color-text-muted)" }}>{isKm ? "អត្តសញ្ញាណប័ណ្ណ៖" : "National ID:"}</span>
                    <span className="num" style={{ fontWeight: 600 }}>{loan.guarantor_info.national_id}</span>
                  </div>
                )}
                {Number(loan.guarantor_info.monthly_income) > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "var(--color-text-muted)" }}>{isKm ? "ប្រាក់ចំណូល៖" : "Verified Income:"}</span>
                    <span className="num" style={{ fontWeight: 700 }}>
                      {formatCurrency(loan.guarantor_info.monthly_income || 0, loan.principal_currency)} {isKm ? "/ ខែ" : "/ mo"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CBC Credit Bureau Risk Scorecard */}
      <CreditScoreCard loan={loan} installments={installments} />

      {/* Repayment progress */}
      <div className="card" style={{ padding: 22, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>
            {isKm ? "វឌ្ឍនភាពនៃការសងប្រាក់" : "Repayment Progress"}
          </span>
          <span className="num" style={{ fontSize: 14, color: "var(--color-text-muted)", fontWeight: 600 }}>
            {isKm
              ? `បានបង់ ${paidCount} / ${installments.length} ដំណាក់កាល`
              : `${paidCount} / ${installments.length} installments paid`}
          </span>
        </div>
        <div className="progress-bar" style={{ height: 10 }}>
          <div
            className="progress-bar-fill"
            style={{
              width: `${progressPct}%`,
              background: progressPct >= 100 ? "var(--color-success)" : "var(--color-accent)",
            }}
          ></div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
          <span className="num" style={{ fontSize: 13.5, color: "var(--color-text-secondary)" }}>
            {isKm ? "បានបង់រួច៖ " : "Paid: "}
            {formatCurrency(totalPaid, loan.principal_currency)}
          </span>
          <span className="num" style={{ fontSize: 13.5, color: "var(--color-text)", fontWeight: 700 }}>
            {isKm ? "សរុបទាំងអស់៖ " : "Total: "}
            {formatCurrency(totalDue, loan.principal_currency)}
          </span>
        </div>
      </div>

      {/* Tabs for installment schedule and loan actions */}
      <div className="tab-bar no-print">
        <button className={`tab-item${activeTab === "schedule" ? " active" : ""}`} onClick={() => setActiveTab("schedule")}>
          {isKm ? "កាលវិភាគបង់រំលស់" : "Installment Schedule"}
        </button>
        {loan.status === "active" && canLifecycle && (
          <button className={`tab-item${activeTab === "actions" ? " active" : ""}`} onClick={() => setActiveTab("actions")}>
            {isKm ? "សកម្មភាពកម្ចី" : "Loan Actions"}
          </button>
        )}
      </div>

      {activeTab === "schedule" && (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>{isKm ? "កាលបរិច្ឆេទ" : t("common.date")}</th>
                <th>{isKm ? "ប្រាក់ត្រូវបង់" : t("common.amount")}</th>
                <th>{isKm ? "បានបង់" : "Paid"}</th>
                <th>{isKm ? "ថ្លៃពិន័យ" : "Late Fee"}</th>
                <th>{isKm ? "ស្ថានភាព" : t("common.status")}</th>
                <th className="no-print"></th>
              </tr>
            </thead>
            <tbody>
              {installments.map((inst) => (
                <tr key={inst.id}>
                  <td className="num">{inst.installment_number}</td>
                  <td className="num">{formatDate(inst.due_date, isKm ? "km" : "en")}</td>
                  <td className="num">{formatCurrency(inst.amount_due, loan.principal_currency)}</td>
                  <td className="num">{formatCurrency(inst.amount_paid, loan.principal_currency)}</td>
                  <td className="num">{Number(inst.late_fee_applied) > 0 ? formatCurrency(inst.late_fee_applied, loan.principal_currency) : "--"}</td>
                  <td><StatusPill status={inst.status} /></td>
                  <td className="no-print">
                    {canRecordPayment && inst.status !== "paid" && inst.status !== "waived" && (
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        style={{ borderRadius: "8px", fontSize: 12, padding: "5px 12px" }}
                        onClick={() =>
                          setPaymentModalInst({
                            ...inst,
                            installment_id: inst.id,
                            currency: loan.principal_currency,
                            client_name: loan.client_name || (isKm ? "អតិថិជន" : "Borrower"),
                            net_due: Math.max(
                              0,
                              Number(inst.amount_due) + Number(inst.late_fee_applied || 0) - Number(inst.amount_paid || 0)
                            ),
                          })
                        }
                      >
                        {isKm ? "កត់ត្រាការបង់ប្រាក់" : "Record Payment"}
                      </button>
                    )}
                    {inst.status === "paid" && (
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        style={{ borderRadius: "8px", fontSize: 12, padding: "5px 10px", display: "inline-flex", alignItems: "center", gap: 5 }}
                        onClick={() =>
                          setViewingReceipt({
                            id: inst.id,
                            installment_id: inst.id,
                            installment_number: inst.installment_number,
                            client_name: loan.client_name || (isKm ? "អតិថិជន" : "Borrower"),
                            amount: inst.amount_paid,
                            currency: loan.principal_currency,
                            payment_method: "cash",
                            created_at: new Date().toISOString(),
                          } as any)
                        }
                      >
                        <Printer size={13} /> {isKm ? "បង្កាន់ដៃ" : "Receipt"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "actions" && loan.status === "active" && canLifecycle && (
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: "grid", gap: 24 }}>
            {/* Prepayment */}
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                {isKm ? "កត់ត្រាការទូទាត់មុនកាលកំណត់" : t("loans.prepay")}
              </h3>
              <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 12 }}>
                {isKm ? "ការបង់ប្រាក់ដុំដើម្បីកាត់បន្ថយសមតុល្យប្រាក់ដើមដែលនៅសល់។" : "Make a lump sum payment that reduces the outstanding balance."}
              </p>
              <div className="form-row">
                <input
                  type="number"
                  step="0.01"
                  value={prepayAmount}
                  onChange={(e) => setPrepayAmount(e.target.value)}
                  style={{ width: 180 }}
                  placeholder={isKm ? "ចំនួនទឹកប្រាក់ទូទាត់មុន" : "Prepayment amount"}
                />
                <button className="btn btn-primary" onClick={handlePrepay} disabled={!prepayAmount || submitting}>
                  {isKm ? "អនុវត្តការទូទាត់មុនកាលកំណត់" : "Apply Prepayment"}
                </button>
              </div>
            </div>

            {/* Restructure */}
            <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>
                {isKm ? "រៀបចំរចនាសម្ព័ន្ធឡើងវិញ" : t("loans.restructure")}
              </h3>
              <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 12 }}>
                {isKm
                  ? "ផ្លាស់ប្តូររយៈពេលកម្ចី និងអត្រាការប្រាក់។ ដំណាក់កាលដែលមិនទាន់បង់នឹងត្រូវបង្កើតឡើងវិញ។"
                  : "Change the loan term and interest rate. Unpaid installments will be regenerated."}
              </p>
              {!showRestructure ? (
                <button className="btn" onClick={() => setShowRestructure(true)}>
                  {isKm ? "កំណត់រចនាសម្ព័ន្ធឡើងវិញ" : "Configure Restructure"}
                </button>
              ) : (
                <div className="form-row">
                  <input
                    type="number"
                    placeholder={isKm ? "រយៈពេលកម្ចី (ខែ)" : t("loans.termMonths")}
                    value={newTerm}
                    onChange={(e) => setNewTerm(e.target.value)}
                    style={{ width: 140 }}
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder={isKm ? "អត្រាការប្រាក់ (%)" : t("loans.interestRate")}
                    value={newRate}
                    onChange={(e) => setNewRate(e.target.value)}
                    style={{ width: 140 }}
                  />
                  <button className="btn btn-primary" onClick={handleRestructure} disabled={!newTerm || !newRate || submitting}>
                    {isKm ? "រៀបចំរចនាសម្ព័ន្ធឡើងវិញ" : "Restructure"}
                  </button>
                  <button className="btn btn-ghost" onClick={() => setShowRestructure(false)}>
                    {isKm ? "បោះបង់" : "Cancel"}
                  </button>
                </div>
              )}
            </div>

            {/* Write-off */}
            <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: "var(--color-danger)" }}>
                {isKm ? "លុបចោលបំណុល" : t("loans.writeOff")}
              </h3>
              <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 12 }}>
                {isKm
                  ? "កត់ត្រាកម្ចីនេះជាបំណុលខូចដែលលុបចោល។ សកម្មភាពនេះមិនអាចត្រឡប់វិញបានដោយងាយទេ។"
                  : "Mark this loan as written off. This action cannot be easily undone."}
              </p>
              {!showWriteOff ? (
                <button className="btn btn-danger" onClick={() => setShowWriteOff(true)}>
                  {isKm ? "លុបចោលបំណុល" : "Write off loan"}
                </button>
              ) : (
                <div style={{ display: "grid", gap: 12, maxWidth: 400 }}>
                  <input
                    type="text"
                    placeholder={isKm ? "មូលហេតុនៃការលុបចោលបំណុល..." : "Reason for write-off..."}
                    value={writeOffReason}
                    onChange={(e) => setWriteOffReason(e.target.value)}
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-danger" onClick={handleWriteOff} disabled={!writeOffReason || submitting}>
                      {isKm ? "បញ្ជាក់ការលុបចោលបំណុល" : "Confirm Write-Off"}
                    </button>
                    <button className="btn btn-ghost" onClick={() => setShowWriteOff(false)}>
                      {isKm ? "បោះបង់" : "Cancel"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Processing Modal with KHQR */}
      {paymentModalInst && (
        <PaymentModal
          isOpen={Boolean(paymentModalInst)}
          onClose={() => setPaymentModalInst(null)}
          installment={paymentModalInst}
          onPaymentSuccess={(payment) => {
            setPaymentModalInst(null);
            setViewingReceipt(payment);
            load();
          }}
        />
      )}

      {/* Official Transaction Receipt Modal */}
      {viewingReceipt && (
        <ReceiptModal
          isOpen={Boolean(viewingReceipt)}
          onClose={() => setViewingReceipt(null)}
          payment={viewingReceipt}
        />
      )}

      {/* Debt Clearance Certificate Modal */}
      <LoanClearanceModal
        isOpen={clearanceOpen}
        onClose={() => setClearanceOpen(false)}
        loan={loan}
      />

      {/* Official Bilingual Loan Agreement Contract Modal */}
      <LoanAgreementModal
        isOpen={agreementOpen}
        onClose={() => setAgreementOpen(false)}
        loan={loan}
      />

      {/* Credit Scoring & Underwriting Risk Assessment Modal */}
      <CreditScorecardModal
        isOpen={scorecardOpen}
        onClose={() => setScorecardOpen(false)}
        loan={loan}
      />
    </div>
  );
}
