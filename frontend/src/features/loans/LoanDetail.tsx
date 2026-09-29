import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import {
  downloadLoanAgreement, downloadLoanStatement, getLoan, getLoanInstallments,
  prepayLoan, recordPayment, restructureLoan, writeOffLoan,
} from "../../api/loans";
import type { Installment, Loan } from "../../api/types";
import { usePermission } from "../../hooks/usePermission";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmContext";
import { formatCurrency, formatDate, formatPercent } from "../../utils/format";
import StatusPill from "../../components/ui/StatusPill";
import PaymentModal from "../../components/payments/PaymentModal";
import ReceiptModal from "../../components/payments/ReceiptModal";
import type { PaymentItem } from "../../api/payments";

function errorMessage(err: any, fallback: string): string {
  return err?.response?.data?.detail || fallback;
}

export default function LoanDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const confirm = useConfirm();
  const [loan, setLoan] = useState<Loan | null>(null);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(true);
  const canRecordPayment = usePermission("payments.record");
  const canLifecycle = usePermission("loans.lifecycle");
  const canViewReports = usePermission("reports.view");

  const [paymentModalInst, setPaymentModalInst] = useState<any | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<PaymentItem | null>(null);
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
      .catch(() => toast.error("Failed to load this loan."))
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
      toast.success("Payment recorded.");
      setPayingId(null);
      setPayAmount("");
      load();
    } catch (err) {
      toast.error(errorMessage(err, "Failed to record payment."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePrepay() {
    if (!id) return;
    setSubmitting(true);
    try {
      await prepayLoan(id, Number(prepayAmount));
      toast.success("Prepayment applied.");
      setPrepayAmount("");
      load();
    } catch (err) {
      toast.error(errorMessage(err, "Failed to record prepayment."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRestructure() {
    if (!id) return;
    const ok = await confirm({
      title: "Restructure this loan?",
      message: "This replaces every unpaid installment with a new schedule under the new term and rate. Paid installments are untouched.",
      confirmLabel: "Restructure",
    });
    if (!ok) return;
    setSubmitting(true);
    try {
      await restructureLoan(id, Number(newTerm), Number(newRate));
      toast.success("Loan restructured.");
      setShowRestructure(false);
      load();
    } catch (err) {
      toast.error(errorMessage(err, "Failed to restructure loan."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleWriteOff() {
    if (!id) return;
    const ok = await confirm({
      title: "Write off this loan?",
      message: "This marks the loan as written off. This action cannot be easily undone.",
      confirmLabel: "Write off",
      danger: true,
    });
    if (!ok) return;
    setSubmitting(true);
    try {
      await writeOffLoan(id, writeOffReason);
      toast.success("Loan written off.");
      setShowWriteOff(false);
      load();
    } catch (err) {
      toast.error(errorMessage(err, "Failed to write off loan."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDownloadStatement() {
    if (!loan) return;
    try {
      toast.info("Generating loan statement PDF...", { title: "Exporting Document" });
      await downloadLoanStatement(loan.id);
      toast.success("Loan statement downloaded successfully.", { title: "Downloaded" });
    } catch {
      toast.error("Failed to download statement.", { title: "Download Error" });
    }
  }

  async function handleDownloadAgreement() {
    if (!loan) return;
    try {
      toast.info("Generating loan agreement contract PDF...", { title: "Exporting Document" });
      await downloadLoanAgreement(loan.id);
      toast.success("Loan agreement contract downloaded successfully.", { title: "Downloaded" });
    } catch {
      toast.error("Failed to download agreement.", { title: "Download Error" });
    }
  }

  return (
    <div>
      {/* Back navigation */}
      <Link to="/loans" className="no-print" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--color-text-muted)", marginBottom: 16 }}>
        <ArrowLeft size={14} /> Back to {t("nav.loans")}
      </Link>

      {/* Official Print Header (Visible only when printed) */}
      <div className="print-only" style={{ display: "none", marginBottom: 24, borderBottom: "2px solid #0f172a", paddingBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, textTransform: "uppercase", letterSpacing: "0.06em", color: "#0f172a", fontWeight: 800 }}>
              SMART LOAN PLATFORM
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>
              Official Credit Contract & Amortization Statement
            </p>
          </div>
          <div style={{ textAlign: "right", fontSize: 11, color: "#64748b" }}>
            <div style={{ fontWeight: 700, color: "#0f172a" }}>CONTRACT REF: #{loan.id.slice(0, 8).toUpperCase()}</div>
            <div>Issued: {formatDate(loan.start_date)}</div>
            <div>Generated: {new Date().toLocaleDateString()}</div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <h1 className="num" style={{ fontSize: 28, fontWeight: 800 }}>{formatCurrency(loan.principal_amount, loan.principal_currency)}</h1>
          <StatusPill status={loan.status} />
        </div>
        {canViewReports && (
          <div className="page-actions no-print">
            <button className="btn btn-sm" onClick={() => window.print()}>
              <Printer size={15} /> Print
            </button>
            <button className="btn btn-sm" onClick={handleDownloadStatement}>
              <Download size={15} /> Statement
            </button>
            <button className="btn btn-sm" onClick={handleDownloadAgreement}>
              <Download size={15} /> Agreement
            </button>
          </div>
        )}
      </div>

      {/* Loan info cards */}
      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <div className="detail-grid">
          <div className="detail-item">
            <div className="detail-item-label">Client</div>
            <div className="detail-item-value" style={{ fontSize: 16 }}>{loan.client_name || "--"}</div>
          </div>
          <div className="detail-item">
            <div className="detail-item-label">{t("loans.interestRate")}</div>
            <div className="detail-item-value num" style={{ fontSize: 16 }}>{formatPercent(loan.interest_rate_percent)} / mo</div>
          </div>
          <div className="detail-item">
            <div className="detail-item-label">{t("loans.interestType")}</div>
            <div className="detail-item-value" style={{ textTransform: "capitalize", fontSize: 16 }}>{loan.interest_type}</div>
          </div>
          <div className="detail-item">
            <div className="detail-item-label">{t("loans.termMonths")}</div>
            <div className="detail-item-value num" style={{ fontSize: 16 }}>{loan.term_months} months</div>
          </div>
          <div className="detail-item">
            <div className="detail-item-label">{t("loans.startDate")}</div>
            <div className="detail-item-value num" style={{ fontSize: 16 }}>{formatDate(loan.start_date)}</div>
          </div>
          <div className="detail-item">
            <div className="detail-item-label">Grace Period</div>
            <div className="detail-item-value num" style={{ fontSize: 16 }}>{loan.grace_period_days} days</div>
          </div>
        </div>
      </div>

      {/* Repayment progress */}
      <div className="card" style={{ padding: 22, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>Repayment Progress</span>
          <span className="num" style={{ fontSize: 14, color: "var(--color-text-muted)", fontWeight: 600 }}>
            {paidCount} / {installments.length} installments paid
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
            Paid: {formatCurrency(totalPaid, loan.principal_currency)}
          </span>
          <span className="num" style={{ fontSize: 13.5, color: "var(--color-text)", fontWeight: 700 }}>
            Total: {formatCurrency(totalDue, loan.principal_currency)}
          </span>
        </div>
      </div>

      {/* Tabs for installment schedule and loan actions */}
      <div className="tab-bar no-print">
        <button className={`tab-item${activeTab === "schedule" ? " active" : ""}`} onClick={() => setActiveTab("schedule")}>
          Installment Schedule
        </button>
        {loan.status === "active" && canLifecycle && (
          <button className={`tab-item${activeTab === "actions" ? " active" : ""}`} onClick={() => setActiveTab("actions")}>
            Loan Actions
          </button>
        )}
      </div>

      {activeTab === "schedule" && (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>{t("common.date")}</th>
                <th>{t("common.amount")}</th>
                <th>Paid</th>
                <th>Late Fee</th>
                <th>{t("common.status")}</th>
                <th className="no-print"></th>
              </tr>
            </thead>
            <tbody>
              {installments.map((inst) => (
                <tr key={inst.id}>
                  <td className="num">{inst.installment_number}</td>
                  <td className="num">{formatDate(inst.due_date)}</td>
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
                            client_name: loan.client_name,
                            net_due: Math.max(
                              0,
                              Number(inst.amount_due) + Number(inst.late_fee_applied || 0) - Number(inst.amount_paid || 0)
                            ),
                          })
                        }
                      >
                        Record Payment
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
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{t("loans.prepay")}</h3>
              <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 12 }}>
                Make a lump sum payment that reduces the outstanding balance.
              </p>
              <div className="form-row">
                <input type="number" step="0.01" value={prepayAmount} onChange={(e) => setPrepayAmount(e.target.value)} style={{ width: 180 }} placeholder="Prepayment amount" />
                <button className="btn btn-primary" onClick={handlePrepay} disabled={!prepayAmount || submitting}>Apply Prepayment</button>
              </div>
            </div>

            {/* Restructure */}
            <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{t("loans.restructure")}</h3>
              <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 12 }}>
                Change the loan term and interest rate. Unpaid installments will be regenerated.
              </p>
              {!showRestructure ? (
                <button className="btn" onClick={() => setShowRestructure(true)}>Configure Restructure</button>
              ) : (
                <div className="form-row">
                  <input type="number" placeholder={t("loans.termMonths")} value={newTerm} onChange={(e) => setNewTerm(e.target.value)} style={{ width: 140 }} />
                  <input type="number" step="0.01" placeholder={t("loans.interestRate")} value={newRate} onChange={(e) => setNewRate(e.target.value)} style={{ width: 140 }} />
                  <button className="btn btn-primary" onClick={handleRestructure} disabled={!newTerm || !newRate || submitting}>Restructure</button>
                  <button className="btn btn-ghost" onClick={() => setShowRestructure(false)}>Cancel</button>
                </div>
              )}
            </div>

            {/* Write-off */}
            <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: "var(--color-danger)" }}>{t("loans.writeOff")}</h3>
              <p style={{ fontSize: 13, color: "var(--color-text-muted)", marginBottom: 12 }}>
                Mark this loan as unrecoverable. This action is difficult to reverse.
              </p>
              {!showWriteOff ? (
                <button className="btn btn-danger" onClick={() => setShowWriteOff(true)}>Begin Write-Off</button>
              ) : (
                <div className="form-row">
                  <input type="text" placeholder="Reason for write-off" value={writeOffReason} onChange={(e) => setWriteOffReason(e.target.value)} style={{ width: 240 }} />
                  <button className="btn btn-danger" onClick={handleWriteOff} disabled={!writeOffReason || submitting}>{t("loans.writeOff")}</button>
                  <button className="btn btn-ghost" onClick={() => setShowWriteOff(false)}>Cancel</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Official Signatures Section for Printing */}
      <div className="print-only" style={{ display: "none", marginTop: 48, paddingTop: 24, borderTop: "1px dashed #cbd5e1" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 36, textAlign: "center", fontSize: 12 }}>
          <div>
            <div style={{ height: 60 }} />
            <div style={{ borderTop: "1px solid #0f172a", paddingTop: 6, fontWeight: 700, color: "#0f172a" }}>Borrower Signature</div>
            <div style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>{loan.client_name || "Borrower"}</div>
          </div>
          <div>
            <div style={{ height: 60 }} />
            <div style={{ borderTop: "1px solid #0f172a", paddingTop: 6, fontWeight: 700, color: "#0f172a" }}>Loan Officer</div>
            <div style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>Authorized Signatory</div>
          </div>
          <div>
            <div style={{ height: 60 }} />
            <div style={{ borderTop: "1px solid #0f172a", paddingTop: 6, fontWeight: 700, color: "#0f172a" }}>Branch Approval</div>
            <div style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>Credit Committee</div>
          </div>
        </div>
        <div style={{ marginTop: 24, textAlign: "center", fontSize: 10, color: "#94a3b8" }}>
          This document is generated by Smart Loan Platform and serves as an official loan summary & repayment agreement.
        </div>
      </div>

      {/* Repayment Modal */}
      <PaymentModal
        isOpen={Boolean(paymentModalInst)}
        onClose={() => setPaymentModalInst(null)}
        installment={paymentModalInst}
        onPaymentSuccess={(result) => {
          load();
          setViewingReceipt(result);
        }}
      />

      {/* Official Receipt Modal */}
      <ReceiptModal
        isOpen={Boolean(viewingReceipt)}
        onClose={() => setViewingReceipt(null)}
        payment={viewingReceipt}
      />
    </div>
  );
}
