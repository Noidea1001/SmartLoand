import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { QRCodeSVG } from "qrcode.react";
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
  const { t, i18n } = useTranslation();
  const isKm = i18n.language === "km";
  const toast = useToast();
  const { usdToKhrRate, companyName } = useBranding();

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
      toast.warning(isKm ? "សូមបញ្ចូលចំនួនទឹកប្រាក់បង់ប្រាក់ឱ្យបានត្រឹមត្រូវ។" : "Please enter a valid payment amount.");
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
        isKm
          ? `បានកត់ត្រាការបង់ប្រាក់ចំនួន ${formatCurrency(numAmount, payCurrency)} ដោយជោគជ័យ។`
          : `Recorded ${formatCurrency(numAmount, payCurrency)} payment successfully.`,
        { title: isKm ? "ការទូទាត់ជោគជ័យ" : "Payment Completed" }
      );

      onClose();
      onPaymentSuccess(result);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || (isKm ? "មិនអាចកត់ត្រាការទូទាត់បានទេ។" : "Failed to record payment.");
      toast.error(msg, { title: isKm ? "កំហុសទូទាត់" : "Payment Error" });
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
          maxHeight: "90vh",
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
            <h2 className="modal-header-title">{isKm ? "កត់ត្រាការបង់ប្រាក់រំលស់" : "Record Installment Payment"}</h2>
            <p className="modal-header-desc">
              {isKm
                ? "ប្រមូលការបង់រំលស់ថ្មីជាប្រាក់ដុល្លារ ឬរៀល មើលគណនីហួសកាលកំណត់ និងបោះពុម្ពបង្កាន់ដៃផ្លូវការ។"
                : "Collect installment repayments in USD or KHR, calculate real-time fx, and issue payment receipts."}
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
        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          <div
            className="modal-body-scroll"
            style={{
              padding: "20px 24px",
              display: "grid",
              gap: 16,
              overflowY: "auto",
              flex: 1,
            }}
          >
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
                  {installment.client_name || (isKm ? "អតិថិជនកម្ចី" : "Valued Borrower")}
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
                  {isKm ? "ដំណាក់កាលទី" : "Installment #"} {installment.installment_number}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{isKm ? "ចំនួនទឹកប្រាក់តាមកាលកំណត់៖" : "Scheduled Net Due:"}</span>
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
                  {isKm ? "រូបិយប័ណ្ណបង់ប្រាក់" : "Payment Currency"}
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
                  {isKm ? "បង់បង្គ្រប់" : "Fill Full Due"}
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
                {isKm ? "ចំនួនទឹកប្រាក់ត្រូវបង់" : "Amount to Pay"} ({payCurrency})
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
                    {isKm ? "ប្រាក់កាត់ចូលកម្ចី" : "Amount credited to loan"}: <strong>{formatCurrency(conversionInfo.credited, loanCurrency)}</strong> (@ 1 USD = {effectiveRate.toLocaleString()} KHR)
                  </span>
                </div>
              )}
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="form-label" style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
                {isKm ? "វិធីសាស្ត្រទូទាត់" : "Payment Method"}
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { id: "cash", label: isKm ? "សាច់ប្រាក់សុទ្ធ" : "Cash", icon: Banknote },
                  { id: "aba_bakong", label: isKm ? "ABA PayWay / បាកង KHQR" : "ABA PayWay / Bakong KHQR", icon: QrCode },
                  { id: "bank_transfer", label: isKm ? "ផ្ទេរប្រាក់តាមធនាគារ" : "Bank Transfer", icon: Building },
                  { id: "wing", label: isKm ? "វីង / កាបូបអេឡិចត្រូនិក" : "Wing / E-Wallet", icon: Smartphone },
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

            {/* Dynamic ABA PayWay & NBC KHQR Payment Box */}
            {method === "aba_bakong" && (
              <div
                style={{
                  background: "#ffffff",
                  border: "2px solid #003764",
                  borderRadius: "14px",
                  overflow: "hidden",
                  boxShadow: "0 8px 24px rgba(0, 55, 100, 0.12)",
                }}
              >
                {/* Official ABA PayWay Header */}
                <div
                  style={{
                    background: "#003764",
                    color: "#ffffff",
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderBottom: "3px solid #00bcd4",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        background: "#ffffff",
                        padding: "2px 8px",
                        borderRadius: "6px",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <span style={{ color: "#003764", fontWeight: 900, fontSize: 13, letterSpacing: "-0.03em" }}>ABA</span>
                      <span style={{ color: "#00a3c4", fontWeight: 800, fontSize: 12 }}>PAYWAY</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ background: "#e11d48", color: "#ffffff", fontSize: 9.5, fontWeight: 900, padding: "1px 5px", borderRadius: "3px", letterSpacing: "0.05em" }}>
                        KHQR
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.02em", color: "#ffffff" }}>
                        {isKm ? "ទូទាត់រហ័ស" : "INSTANT PAY"}
                      </span>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      background: "rgba(0, 188, 212, 0.25)",
                      color: "#e0f7fa",
                      padding: "3px 8px",
                      borderRadius: "999px",
                      border: "1px solid rgba(0, 188, 212, 0.4)",
                    }}
                  >
                    {isKm ? "ស្កេនបង់ប្រាក់" : "Scan to Pay"}
                  </span>
                </div>

                <div style={{ padding: "16px 20px", textAlign: "center", background: "#f8fafc" }}>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: "#003764", textTransform: "uppercase", letterSpacing: "0.02em" }}>
                    {companyName || "SMART LOAN PLATFORM"}
                  </div>
                  <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <span>ABA ID: <strong style={{ color: "#003764" }}>001 892 471</strong></span>
                    <span>•</span>
                    <span>{installment.client_name || (isKm ? "អតិថិជនកម្ចី" : "Borrower")}</span>
                  </div>

                  <div
                    className="num"
                    style={{
                      fontSize: 24,
                      fontWeight: 900,
                      color: "#003764",
                      margin: "10px 0 12px",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {formatCurrency(parseFloat(amount) || 0, payCurrency)}
                  </div>

                  {/* Guaranteed Visible QR Code Container */}
                  <div
                    style={{
                      display: "inline-flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 14,
                      background: "#ffffff",
                      borderRadius: "12px",
                      border: "2px solid #e2e8f0",
                      boxShadow: "0 4px 12px rgba(0, 55, 100, 0.08)",
                      minWidth: 190,
                      minHeight: 190,
                    }}
                  >
                    <QRCodeSVG
                      value={`00020101021229370016bakong@nbc.gov.kh0109${String(installment.installment_id || installment.id || "00000000").slice(0, 8)}540${payCurrency === "KHR" ? "116" : "840"}530${(parseFloat(amount) || 0).toFixed(payCurrency === "KHR" ? 0 : 2)}5802KH5916${(companyName || "Smart Loan").slice(0, 16)}6010Phnom Penh62150111LOAN-${String(installment.installment_id || installment.id || "000000").slice(0, 6)}6304`}
                      size={160}
                      level="H"
                      includeMargin={false}
                    />
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#003764", letterSpacing: "0.04em" }}>
                        ABA PAYWAY KHQR
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 10 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
                    <span style={{ fontSize: 11.5, color: "#475569", fontWeight: 600 }}>
                      {isKm
                        ? "ស្កេនជាមួយកម្មវិធី ABA Mobile, Bakong ឬកម្មវិធីធនាគារនានា"
                        : "Scan with ABA Mobile, Bakong, or any Mobile Banking App"}
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: 12,
                      display: "flex",
                      gap: 8,
                      justifyContent: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      type="button"
                      className="btn btn-xs"
                      onClick={() => {
                        const txnId = `ABA-${Date.now().toString().slice(-8)}`;
                        setReferenceNote(txnId);
                        toast.info(
                          isKm
                            ? `កំពុងបើក ABA Mobile... លេខប្រតិបត្តិការត្រូវបានបំពេញ៖ ${txnId}`
                            : `Opening ABA Mobile... Ref Note pre-filled: ${txnId}`,
                          { title: "ABA PayWay" }
                        );
                        window.location.href = `aba://pay?amount=${amount}&currency=${payCurrency}`;
                      }}
                      style={{
                        background: "#003764",
                        color: "#ffffff",
                        fontWeight: 700,
                        fontSize: 11.5,
                        padding: "5px 12px",
                        borderRadius: "6px",
                        border: "none",
                      }}
                    >
                      {isKm ? "ទូទាត់ជាមួយ ABA Mobile" : "Pay with ABA Mobile"}
                    </button>

                    <button
                      type="button"
                      className="btn btn-xs btn-ghost"
                      onClick={() => {
                        const text = `ABA PayWay Account: 001 892 471 (${companyName || "Smart Loan"}) | Amount: ${formatCurrency(parseFloat(amount) || 0, payCurrency)} | Inst #${installment.installment_number || 1}`;
                        navigator.clipboard?.writeText(text);
                        toast.success(
                          isKm ? "បានចម្លងព័ត៌មានគណនី ABA រួចរាល់។" : "Copied ABA PayWay merchant details to clipboard.",
                          { title: "Copied" }
                        );
                      }}
                      style={{ fontSize: 11.5, color: "#003764", fontWeight: 600, border: "1px solid #cbd5e1" }}
                    >
                      {isKm ? "ចម្លងលេខគណនី ABA" : "Copy ABA Info"}
                    </button>

                    <button
                      type="button"
                      className="btn btn-xs btn-ghost"
                      onClick={() => {
                        const txnId = `ABA-PW-${Date.now().toString().slice(-8)}`;
                        setReferenceNote(txnId);
                        toast.success(
                          isKm
                            ? `បានក្លែងធ្វើការទូទាត់ ABA PayWay ដោយជោគជ័យ។ លេខយោង៖ ${txnId}`
                            : `Simulated ABA PayWay customer scan. Ref: ${txnId}`,
                          { title: "ABA PayWay" }
                        );
                      }}
                      style={{ fontSize: 11.5, color: "var(--color-accent)", fontWeight: 600 }}
                    >
                      {isKm ? "បំពេញលេខយោងស្វ័យប្រវត្តិ" : "Auto-Fill Ref ID"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Reference Note */}
            <div>
              <label className="form-label" style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>
                {isKm ? "កំណត់សម្គាល់យោង (ស្រេចចិត្ត)" : "Transaction Reference Note (Optional)"}
              </label>
              <input
                type="text"
                value={referenceNote}
                onChange={(e) => setReferenceNote(e.target.value)}
                placeholder={isKm ? "ឧ. លេខកូដប្រតិបត្តិការ ABA, កំណត់ត្រាបេឡា..." : "e.g. ABA transaction ref, cash voucher note..."}
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
              flexShrink: 0,
              padding: "16px 24px",
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
              {isKm ? "បោះបង់" : "Cancel"}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || !parseFloat(amount)}
              style={{ borderRadius: "8px", fontSize: 13, minWidth: 160 }}
            >
              {submitting ? (isKm ? "កំពុងដំណើរការ..." : "Processing...") : (isKm ? "ដំណើរការការទូទាត់" : "Process Payment")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
