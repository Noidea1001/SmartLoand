import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  X,
  CreditCard,
  DollarSign,
  ArrowRight,
  CheckCircle2,
  Banknote,
  QrCode,
  Building,
  Smartphone,
  Info,
} from "lucide-react";
import { recordPayment, type PaymentItem, type DueInstallmentItem } from "../../api/payments";
import { formatCurrency } from "../../utils/format";
import { useToast } from "../../context/ToastContext";
import { useBranding } from "../../context/BrandingContext";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  installment: DueInstallmentItem | any | null;
  onPaymentSuccess: (payment: PaymentItem) => void;
}

export default function PaymentModal({
  isOpen,
  onClose,
  installment,
  onPaymentSuccess,
}: PaymentModalProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const { usdToKhrRate } = useBranding();

  const [payCurrency, setPayCurrency] = useState<"USD" | "KHR">("USD");
  const [amount, setAmount] = useState<string>("");
  const [method, setMethod] = useState<"cash" | "aba_bakong" | "bank_transfer" | "wing">("cash");
  const [referenceNote, setReferenceNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  // Initialize payment values when installment changes
  useEffect(() => {
    if (!installment) return;
    const loanCurr = (installment.currency as "USD" | "KHR") || "USD";
    setPayCurrency(loanCurr);

    const net = Number(installment.net_due ?? (installment.amount_due - (installment.amount_paid || 0)));
    setAmount(net > 0 ? String(net) : "");
    setMethod("cash");
    setReferenceNote("");
  }, [installment]);

  const effectiveRate = usdToKhrRate || 4100;

  // Calculation of converted amount credited to the loan
  const conversionInfo = useMemo(() => {
    if (!installment) return { credited: 0, altEquivalent: 0 };
    const numAmount = parseFloat(amount) || 0;
    const loanCurr = installment.currency || "USD";

    let credited = numAmount;
    if (payCurrency !== loanCurr) {
      if (loanCurr === "USD" && payCurrency === "KHR") {
        credited = Number((numAmount / effectiveRate).toFixed(2));
      } else if (loanCurr === "KHR" && payCurrency === "USD") {
        credited = Math.round(numAmount * effectiveRate);
      }
    }

    const altEquivalent =
      payCurrency === "USD"
        ? Math.round(numAmount * effectiveRate)
        : Number((numAmount / effectiveRate).toFixed(2));

    return { credited, altEquivalent };
  }, [amount, payCurrency, installment, effectiveRate]);

  if (!isOpen || !installment) return null;

  const loanCurrency = (installment.currency as "USD" | "KHR") || "USD";
  const netDueInLoanCurrency = Number(
    installment.net_due ?? (installment.amount_due - (installment.amount_paid || 0))
  );

  function handleCurrencySwitch(curr: "USD" | "KHR") {
    if (curr === payCurrency) return;
    setPayCurrency(curr);
    const numAmount = parseFloat(amount) || 0;
    if (curr === "KHR") {
      setAmount(String(Math.round(numAmount * effectiveRate)));
    } else {
      setAmount(String(Number((numAmount / effectiveRate).toFixed(2))));
    }
  }

  function handleFillFullDue() {
    if (payCurrency === loanCurrency) {
      setAmount(String(netDueInLoanCurrency));
    } else if (payCurrency === "KHR") {
      setAmount(String(Math.round(netDueInLoanCurrency * effectiveRate)));
    } else {
      setAmount(String(Number((netDueInLoanCurrency / effectiveRate).toFixed(2))));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      toast.warning("Please enter a valid payment amount.");
      return;
    }

    setSubmitting(true);
    try {
      const instId = installment.installment_id || installment.id;
      const result = await recordPayment({
        installment_id: instId,
        amount: numAmount,
        currency: payCurrency,
        method,
        reference_note: referenceNote.trim() || undefined,
      });

      toast.success(
        `Recorded ${formatCurrency(numAmount, payCurrency)} payment successfully.`,
        { title: "Payment Completed" }
      );

      onClose();
      onPaymentSuccess(result);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Failed to record payment.";
      toast.error(msg, { title: "Payment Error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="no-print modal-backdrop" onClick={onClose} style={{ zIndex: 9998 }}>
      <div
        className="modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 520,
          width: "100%",
          background: "var(--color-surface)",
          borderRadius: "14px",
          boxShadow: "0 20px 45px -10px rgba(0, 0, 0, 0.25)",
          border: "1px solid var(--color-border)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          className="modal-header-banner"
          style={{
            background: "var(--color-surface)",
            borderBottom: "1px solid var(--color-border)",
            padding: "20px 24px 16px",
          }}
        >
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
            <CreditCard size={22} />
          </div>
          <div className="modal-header-text">
            <h2 className="modal-header-title">{t("repaymentsPage.collectModalTitle")}</h2>
            <p className="modal-header-desc">
              {t("repaymentsPage.subtitle")}
            </p>
          </div>
          <button
            type="button"
            className="btn-icon"
            onClick={onClose}
            aria-label="Close"
            style={{ borderRadius: "8px" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "20px 24px", display: "grid", gap: 16 }}>
            {/* Installment Summary Box */}
            <div
              style={{
                padding: "14px 16px",
                borderRadius: "8px",
                background: "var(--color-surface-sunken)",
                border: "1px solid var(--color-border)",
                display: "grid",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text)" }}>
                  {installment.client_name || t("repaymentsPage.clientLabel")}
                </span>
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: "6px",
                    background: "var(--color-surface)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  {t("repaymentsPage.installmentNo")} {installment.installment_number}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{t("repaymentsPage.scheduledDue")}:</span>
                <div style={{ textAlign: "right" }}>
                  <span className="num" style={{ fontSize: 18, fontWeight: 800, color: "var(--color-text)" }}>
                    {formatCurrency(netDueInLoanCurrency, loanCurrency)}
                  </span>
                  <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                    ≈{" "}
                    {formatCurrency(
                      loanCurrency === "USD"
                        ? netDueInLoanCurrency * effectiveRate
                        : netDueInLoanCurrency / effectiveRate,
                      loanCurrency === "USD" ? "KHR" : "USD"
                    )}{" "}
                    (@ {effectiveRate.toLocaleString()})
                  </div>
                </div>
              </div>
            </div>

            {/* Currency Selector */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: 13, margin: 0 }}>
                  {t("repaymentsPage.payCurrency")}
                </label>
                <button
                  type="button"
                  onClick={handleFillFullDue}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--color-accent)",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  {t("repaymentsPage.payFull")}
                </button>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  background: "var(--color-surface-sunken)",
                  padding: 3,
                  borderRadius: "8px",
                  border: "1px solid var(--color-border)",
                }}
              >
                <button
                  type="button"
                  onClick={() => handleCurrencySwitch("USD")}
                  style={{
                    flex: 1,
                    padding: "6px 12px",
                    borderRadius: "6px",
                    fontSize: 12.5,
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    background: payCurrency === "USD" ? "var(--color-accent)" : "transparent",
                    color: payCurrency === "USD" ? "#ffffff" : "var(--color-text-secondary)",
                    transition: "all 0.15s ease",
                  }}
                >
                  USD ($)
                </button>
                <button
                  type="button"
                  onClick={() => handleCurrencySwitch("KHR")}
                  style={{
                    flex: 1,
                    padding: "6px 12px",
                    borderRadius: "6px",
                    fontSize: 12.5,
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    background: payCurrency === "KHR" ? "var(--color-accent)" : "transparent",
                    color: payCurrency === "KHR" ? "#ffffff" : "var(--color-text-secondary)",
                    transition: "all 0.15s ease",
                  }}
                >
                  KHR (៛)
                </button>
              </div>
            </div>

            {/* Amount Input */}
            <div>
              <label className="form-label" style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
                {t("repaymentsPage.amountToPay")} ({payCurrency})
              </label>
              <input
                type="number"
                step={payCurrency === "KHR" ? "500" : "0.01"}
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                style={{
                  width: "100%",
                  fontSize: 18,
                  fontWeight: 800,
                  fontFamily: "var(--font-sans)",
                  fontVariantNumeric: "tabular-nums",
                  padding: "10px 14px",
                  borderRadius: "8px",
                }}
              />

              {payCurrency !== loanCurrency && parseFloat(amount) > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginTop: 6,
                    fontSize: 12,
                    color: "var(--color-text-muted)",
                  }}
                >
                  <Info size={13} />
                  <span>
                    {t("repaymentsPage.amountCredited")}: <strong>{formatCurrency(conversionInfo.credited, loanCurrency)}</strong> (@ 1 USD = {effectiveRate.toLocaleString()} KHR)
                  </span>
                </div>
              )}
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="form-label" style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
                {t("repaymentsPage.paymentMethod")}
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { id: "cash", label: t("repaymentsPage.cash"), icon: Banknote },
                  { id: "aba_bakong", label: t("repaymentsPage.bakong"), icon: QrCode },
                  { id: "bank_transfer", label: t("repaymentsPage.bankTransfer"), icon: Building },
                  { id: "wing", label: t("repaymentsPage.wing"), icon: Smartphone },
                ].map((m) => {
                  const Icon = m.icon;
                  const isSel = method === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMethod(m.id as any)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "10px 12px",
                        borderRadius: "8px",
                        border: isSel ? "1.5px solid var(--color-accent)" : "1px solid var(--color-border)",
                        background: isSel ? "var(--color-accent-soft)" : "var(--color-surface)",
                        color: isSel ? "var(--color-accent)" : "var(--color-text)",
                        cursor: "pointer",
                        fontWeight: 600,
                        fontSize: 12.5,
                        transition: "all 0.15s ease",
                        textAlign: "left",
                      }}
                    >
                      <Icon size={16} />
                      <span>{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Reference Note */}
            <div>
              <label className="form-label" style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
                {t("repaymentsPage.notes")}
              </label>
              <input
                type="text"
                value={referenceNote}
                onChange={(e) => setReferenceNote(e.target.value)}
                placeholder={t("repaymentsPage.notesPlaceholder")}
                style={{
                  width: "100%",
                  fontSize: 13,
                  padding: "8px 12px",
                  borderRadius: "8px",
                }}
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div
            className="modal-footer-bar"
            style={{
              padding: "16px 24px 20px",
              borderTop: "1px solid var(--color-border)",
              background: "var(--color-surface-sunken)",
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
            }}
          >
            <button
              type="button"
              className="btn btn-ghost"
              onClick={onClose}
              disabled={submitting}
              style={{ borderRadius: "8px", fontSize: 13 }}
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || !parseFloat(amount)}
              style={{ borderRadius: "8px", fontSize: 13, minWidth: 160 }}
            >
              {submitting ? t("repaymentsPage.processing") : t("repaymentsPage.processPayment")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
