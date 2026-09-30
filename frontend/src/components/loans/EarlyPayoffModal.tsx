import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  X,
  Calculator,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Percent,
  ShieldCheck,
  Info,
  FileCheck,
  CreditCard,
  Building,
  Coins,
} from "lucide-react";
import type { Loan } from "../../api/types";
import {
  getLoanPayoffQuote,
  prepayLoan,
  type PayoffQuote,
  type PrepaymentPayload,
} from "../../api/loans";
import { formatCurrency, convertCurrencyAmount } from "../../utils/format";
import { useBranding } from "../../context/BrandingContext";
import { useToast } from "../../context/ToastContext";

interface EarlyPayoffModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: Loan;
  onSuccess: (isFullPayoff: boolean) => void;
}

export default function EarlyPayoffModal({
  isOpen,
  onClose,
  loan,
  onSuccess,
}: EarlyPayoffModalProps) {
  const { i18n } = useTranslation();
  const isKm = i18n.language === "km";
  const toast = useToast();
  const { baseCurrency, usdToKhrRate } = useBranding();

  const [tab, setTab] = useState<"full_payoff" | "partial">("full_payoff");
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [quote, setQuote] = useState<PayoffQuote | null>(null);

  // Penalty configuration
  const [penaltyRate, setPenaltyRate] = useState<number>(2.0);
  const [penaltyAmount, setPenaltyAmount] = useState<number>(0);
  const [isWaived, setIsWaived] = useState<boolean>(false);
  const [waiverReason, setWaiverReason] = useState<string>("vip_client");
  const [customReason, setCustomReason] = useState<string>("");

  // Partial prepayment
  const [partialAmount, setPartialAmount] = useState<string>("");

  // General fields
  const [settlementMethod, setSettlementMethod] = useState<string>("cash");
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !loan?.id) return;

    let isMounted = true;
    setLoadingQuote(true);

    getLoanPayoffQuote(loan.id)
      .then((data) => {
        if (!isMounted) return;
        setQuote(data);
        const rate = Number(data.default_penalty_rate_percent ?? 2.0);
        setPenaltyRate(rate);
        const pAmt = Number(data.suggested_penalty_amount ?? 0);
        setPenaltyAmount(pAmt);
      })
      .catch((err) => {
        if (!isMounted) return;
        toast.error(
          isKm
            ? "មិនអាចទាញយកទិន្នន័យសម្រង់បង់ផ្តាច់បានទេ។"
            : "Failed to load payoff quote details."
        );
      })
      .finally(() => {
        if (isMounted) setLoadingQuote(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, loan?.id, isKm]);

  // Handle ESC
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currency = loan.principal_currency || "USD";
  const remainingPrincipal = quote ? Number(quote.remaining_principal) : Number(loan.principal_amount);
  const accruedInterest = quote ? Number(quote.accrued_interest) : 0;
  const unearnedInterest = quote ? Number(quote.unearned_future_interest) : 0;

  const currentPenalty = isWaived ? 0 : Number(penaltyAmount);
  const totalSettlement = remainingPrincipal + accruedInterest + currentPenalty;
  const netSavings = Math.max(0, unearnedInterest - currentPenalty);

  const convertedSettlement =
    currency !== baseCurrency
      ? convertCurrencyAmount(totalSettlement, currency, baseCurrency, usdToKhrRate)
      : null;

  const handlePenaltyRateChange = (newRate: number) => {
    setPenaltyRate(newRate);
    const calculated = Math.round(((remainingPrincipal * newRate) / 100) * 100) / 100;
    setPenaltyAmount(calculated);
  };

  const handlePenaltyAmountChange = (newAmount: number) => {
    setPenaltyAmount(newAmount);
    if (remainingPrincipal > 0) {
      const calcRate = Math.round(((newAmount / remainingPrincipal) * 100) * 100) / 100;
      setPenaltyRate(calcRate);
    }
  };

  const waiverReasonOptions = [
    {
      value: "vip_client",
      labelKm: "អតិថិជនកិត្តិយស / ប្រវត្តិសងត្រឹមត្រូវ (VIP / Good Standing Client)",
      labelEn: "VIP / Good Standing Client",
    },
    {
      value: "manager_approval",
      labelKm: "ការយល់ព្រមពីប្រធានសាខា (Branch Manager Approval)",
      labelEn: "Branch Manager Approval",
    },
    {
      value: "promotion",
      labelKm: "យុទ្ធនាការលើកទឹកចិត្តអតិថិជន (Promotional Campaign)",
      labelEn: "Promotional Campaign",
    },
    {
      value: "refinance",
      labelKm: "ប្តូរទំហំកម្ចីថ្មី / បន្តកម្ចី (Loan Refinance / Upgrade)",
      labelEn: "Loan Refinance / Upgrade",
    },
    {
      value: "hardship",
      labelKm: "ករណីពិសេស / គ្រោះមហន្តរាយ (Hardship / Special Relief)",
      labelEn: "Hardship / Special Relief",
    },
    {
      value: "custom",
      labelKm: "មូលហេតុផ្សេងៗ (Other Specific Reason)",
      labelEn: "Other Specific Reason",
    },
  ];

  const getWaiverReasonString = () => {
    if (!isWaived) return null;
    if (waiverReason === "custom") return customReason.trim() || (isKm ? "លើកលែងពិសេស" : "Special Waiver");
    const found = waiverReasonOptions.find((o) => o.value === waiverReason);
    return isKm ? found?.labelKm || waiverReason : found?.labelEn || waiverReason;
  };

  const handleSubmitFullPayoff = async () => {
    setSubmitting(true);
    try {
      const payload: PrepaymentPayload = {
        amount: remainingPrincipal,
        penalty_amount: isWaived ? 0 : penaltyAmount,
        penalty_rate_percent: isWaived ? 0 : penaltyRate,
        waived: isWaived,
        waiver_reason: getWaiverReasonString(),
        notes: notes ? `${notes} [Method: ${settlementMethod}]` : `Full Payoff [Method: ${settlementMethod}]`,
        is_full_payoff: true,
      };

      await prepayLoan(loan.id, payload);
      toast.success(
        isKm
          ? "បានកត់ត្រាការបង់ផ្តាច់កម្ចីមុនកាលកំណត់ដោយជោគជ័យ។"
          : "Full early loan payoff completed successfully."
      );
      onClose();
      onSuccess(true);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.detail ||
          (isKm ? "មិនអាចកត់ត្រាការបង់ផ្តាច់កម្ចីបានទេ។" : "Failed to execute early payoff.")
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitPartial = async () => {
    const val = Number(partialAmount);
    if (!val || val <= 0) {
      toast.error(isKm ? "សូមបញ្ចូលចំនួនទឹកប្រាក់ត្រឹមត្រូវ។" : "Please enter a valid amount.");
      return;
    }
    if (val >= remainingPrincipal) {
      toast.error(
        isKm
          ? "ចំនួនទឹកប្រាក់ស្មើ ឬលើសសមតុល្យប្រាក់ដើម។ សូមជ្រើសរើសផ្ទាំង 'ទូទាត់ផ្តាច់ទាំងស្រុង'។"
          : "Amount is equal to or exceeds principal. Please use Full Payoff tab."
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload: PrepaymentPayload = {
        amount: val,
        penalty_amount: 0,
        waived: false,
        notes: notes ? `${notes} [Method: ${settlementMethod}]` : `Partial Lump-Sum [Method: ${settlementMethod}]`,
        is_full_payoff: false,
      };

      await prepayLoan(loan.id, payload);
      toast.success(
        isKm
          ? `បានអនុវត្តការទូទាត់ប្រាក់ដើមបន្ថែម ${formatCurrency(val, currency)} ដោយជោគជ័យ។`
          : `Partial prepayment of ${formatCurrency(val, currency)} applied.`
      );
      onClose();
      onSuccess(false);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.detail ||
          (isKm ? "មិនអាចកត់ត្រាការទូទាត់មុនកាលកំណត់បានទេ។" : "Failed to record partial prepayment.")
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      style={{
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        padding: "16px",
      }}
    >
      <div
        className="modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 680,
          width: "100%",
          maxHeight: "92vh",
          overflowY: "auto",
          background: "var(--color-surface, #ffffff)",
          borderRadius: 16,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          border: "1px solid var(--color-border, #e2e8f0)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 24px",
            borderBottom: "1px solid var(--color-border, #e2e8f0)",
            background: "var(--color-surface-sunken, #f8fafc)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "rgba(14, 165, 233, 0.12)",
                color: "#0284c7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Calculator size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--color-text, #0f172a)" }}>
                {isKm ? "ម៉ាស៊ីនគិតការទូទាត់ផ្តាច់ & កម្រៃមុនកាលកំណត់" : "Early Payoff & Penalty Engine"}
              </h2>
              <div style={{ fontSize: 12.5, color: "var(--color-text-muted, #64748b)", marginTop: 2 }}>
                {isKm ? "គណនីកម្ចីលេខ" : "Loan ID"}: #{loan.id.slice(0, 8).toUpperCase()} •{" "}
                {loan.client_name || (isKm ? "អតិថិជន" : "Borrower")}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            style={{ borderRadius: 8, padding: 6 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Selection */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid var(--color-border, #e2e8f0)",
            padding: "0 24px",
            background: "var(--color-surface, #ffffff)",
          }}
        >
          <button
            type="button"
            onClick={() => setTab("full_payoff")}
            style={{
              padding: "14px 18px",
              fontSize: 13.5,
              fontWeight: tab === "full_payoff" ? 700 : 500,
              color: tab === "full_payoff" ? "var(--color-primary, #2563eb)" : "var(--color-text-muted, #64748b)",
              borderBottom: tab === "full_payoff" ? "2px solid var(--color-primary, #2563eb)" : "2px solid transparent",
              background: "none",
              borderTop: "none",
              borderLeft: "none",
              borderRight: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <ShieldCheck size={16} />
            {isKm ? "ទូទាត់ផ្តាច់ទាំងស្រុង (Full Payoff)" : "Full Early Payoff"}
          </button>
          <button
            type="button"
            onClick={() => setTab("partial")}
            style={{
              padding: "14px 18px",
              fontSize: 13.5,
              fontWeight: tab === "partial" ? 700 : 500,
              color: tab === "partial" ? "var(--color-primary, #2563eb)" : "var(--color-text-muted, #64748b)",
              borderBottom: tab === "partial" ? "2px solid var(--color-primary, #2563eb)" : "2px solid transparent",
              background: "none",
              borderTop: "none",
              borderLeft: "none",
              borderRight: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Coins size={16} />
            {isKm ? "បង់ប្រាក់ដើមមួយផ្នែក (Partial Lump-Sum)" : "Partial Prepayment"}
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: "20px 24px", flex: 1 }}>
          {loadingQuote ? (
            <div style={{ padding: "40px 0", textAlign: "center", color: "var(--color-text-muted)" }}>
              <Calculator size={32} style={{ animation: "spin 2s linear infinite", opacity: 0.5, marginBottom: 12 }} />
              <div>{isKm ? "កំពុងគណនាសម្រង់បង់ផ្តាច់កម្ចី..." : "Calculating early settlement quote..."}</div>
            </div>
          ) : (
            <>
              {/* Snapshot KPI Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: 10,
                    background: "var(--color-surface-sunken, #f8fafc)",
                    border: "1px solid var(--color-border, #e2e8f0)",
                  }}
                >
                  <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
                    {isKm ? "សមតុល្យប្រាក់ដើមនៅសល់" : "Outstanding Principal"}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--color-text)", marginTop: 4 }}>
                    {formatCurrency(remainingPrincipal, currency)}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>
                    {quote?.remaining_installments ?? 0} {isKm ? "វគ្គនៅសល់" : "installments remaining"}
                  </div>
                </div>

                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: 10,
                    background: "var(--color-surface-sunken, #f8fafc)",
                    border: "1px solid var(--color-border, #e2e8f0)",
                  }}
                >
                  <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>
                    {isKm ? "ការប្រាក់គិតមកទល់ពេលនេះ" : "Accrued Interest"}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#d97706", marginTop: 4 }}>
                    {formatCurrency(accruedInterest, currency)}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>
                    {isKm ? "ផ្អែកលើថ្ងៃប្រើប្រាស់" : "Current billing cycle"}
                  </div>
                </div>

                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: 10,
                    background: "rgba(16, 185, 129, 0.08)",
                    border: "1px solid rgba(16, 185, 129, 0.25)",
                  }}
                >
                  <div style={{ fontSize: 11.5, color: "#047857", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 700 }}>
                    {isKm ? "ការប្រាក់សន្សំបាន (ចំណេញ)" : "Future Interest Saved"}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#059669", marginTop: 4 }}>
                    {formatCurrency(unearnedInterest, currency)}
                  </div>
                  <div style={{ fontSize: 11, color: "#047857", marginTop: 2 }}>
                    {isKm ? "មិនចាំបាច់បង់ការប្រាក់អនាគត" : "Unearned interest relief"}
                  </div>
                </div>
              </div>

              {tab === "full_payoff" ? (
                <div>
                  {/* Penalty Setting Card */}
                  <div
                    style={{
                      padding: 16,
                      borderRadius: 12,
                      border: isWaived ? "1px dashed var(--color-border, #cbd5e1)" : "1px solid rgba(239, 68, 68, 0.25)",
                      background: isWaived ? "var(--color-surface-sunken, #f8fafc)" : "rgba(254, 242, 242, 0.4)",
                      marginBottom: 20,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Percent size={16} color={isWaived ? "#64748b" : "#dc2626"} />
                        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text)" }}>
                          {isKm ? "កម្រៃផាកពិន័យទូទាត់មុនកាលកំណត់ (Early Payoff Penalty)" : "Early Payoff Penalty Fee"}
                        </span>
                      </div>

                      {/* Waiver Toggle */}
                      <label
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          cursor: "pointer",
                          fontSize: 13,
                          fontWeight: 600,
                          color: isWaived ? "#059669" : "var(--color-text)",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isWaived}
                          onChange={(e) => setIsWaived(e.target.checked)}
                          style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#059669" }}
                        />
                        {isKm ? "លើកលែងកម្រៃផាកពិន័យ (Waive Penalty)" : "Waive Early Fee"}
                      </label>
                    </div>

                    {!isWaived ? (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                        <div>
                          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", marginBottom: 4 }}>
                            {isKm ? "អត្រាពិន័យ (%) នៃប្រាក់ដើមនៅសល់" : "Penalty Rate (% of Principal)"}
                          </label>
                          <div style={{ position: "relative" }}>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="10"
                              value={penaltyRate}
                              onChange={(e) => handlePenaltyRateChange(Number(e.target.value))}
                              style={{
                                width: "100%",
                                padding: "8px 12px",
                                borderRadius: 8,
                                border: "1px solid var(--color-border, #cbd5e1)",
                                fontSize: 14,
                                fontWeight: 600,
                              }}
                            />
                            <span style={{ position: "absolute", right: 12, top: 9, fontSize: 13, color: "#64748b" }}>%</span>
                          </div>
                        </div>

                        <div>
                          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", marginBottom: 4 }}>
                            {isKm ? `ចំនួនកម្រៃផាកពិន័យ (${currency})` : `Penalty Amount (${currency})`}
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={penaltyAmount}
                            onChange={(e) => handlePenaltyAmountChange(Number(e.target.value))}
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              borderRadius: 8,
                              border: "1px solid var(--color-border, #cbd5e1)",
                              fontSize: 14,
                              fontWeight: 600,
                              color: "#dc2626",
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
                        <div
                          style={{
                            padding: "8px 12px",
                            borderRadius: 8,
                            background: "rgba(16, 185, 129, 0.12)",
                            color: "#065f46",
                            fontSize: 12.5,
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <CheckCircle2 size={16} />
                          {isKm
                            ? "កម្រៃផាកពិន័យត្រូវបានលើកលែង $0.00 (Penalty fee fully waived: 0.00)"
                            : "Penalty fee is fully waived (0.00)."}
                        </div>

                        <div>
                          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", marginBottom: 4 }}>
                            {isKm ? "មូលហេតុលើកលែងកម្រៃ (Waiver Justification)" : "Waiver Reason"}
                          </label>
                          <select
                            value={waiverReason}
                            onChange={(e) => setWaiverReason(e.target.value)}
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              borderRadius: 8,
                              border: "1px solid var(--color-border, #cbd5e1)",
                              fontSize: 13,
                              background: "var(--color-surface, #ffffff)",
                            }}
                          >
                            {waiverReasonOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {isKm ? opt.labelKm : opt.labelEn}
                              </option>
                            ))}
                          </select>
                        </div>

                        {waiverReason === "custom" && (
                          <input
                            type="text"
                            placeholder={isKm ? "បញ្ជាក់មូលហេតុលើកលែងជាក់លាក់..." : "Specify custom waiver reason..."}
                            value={customReason}
                            onChange={(e) => setCustomReason(e.target.value)}
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              borderRadius: 8,
                              border: "1px solid var(--color-border, #cbd5e1)",
                              fontSize: 13,
                            }}
                          />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Settlement Breakdown Statement */}
                  <div
                    style={{
                      background: "var(--color-surface-sunken, #f8fafc)",
                      borderRadius: 12,
                      border: "1px solid var(--color-border, #e2e8f0)",
                      padding: "16px 20px",
                      marginBottom: 20,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text)", marginBottom: 12 }}>
                      {isKm ? "តារាងគណនាលម្អិតនៃការទូទាត់ផ្តាច់" : "Settlement Calculation Summary"}
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
                      <span style={{ color: "var(--color-text-muted)" }}>
                        {isKm ? "១. សមតុល្យប្រាក់ដើមនៅសល់" : "1. Remaining Principal"}
                      </span>
                      <span style={{ fontWeight: 600 }}>{formatCurrency(remainingPrincipal, currency)}</span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
                      <span style={{ color: "var(--color-text-muted)" }}>
                        {isKm ? "២. ការប្រាក់គិតមកទល់ថ្ងៃនេះ" : "2. Accrued Interest"}
                      </span>
                      <span style={{ fontWeight: 600 }}>{formatCurrency(accruedInterest, currency)}</span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 12 }}>
                      <span style={{ color: "var(--color-text-muted)" }}>
                        {isKm ? "៣. កម្រៃទូទាត់មុនកាលកំណត់" : "3. Early Payoff Penalty"}
                      </span>
                      <span style={{ fontWeight: 600, color: isWaived ? "#059669" : "#dc2626" }}>
                        {isWaived
                          ? isKm
                            ? "បានលើកលែង (Waived $0.00)"
                            : "Waived (0.00)"
                          : `+ ${formatCurrency(penaltyAmount, currency)} (${penaltyRate}%)`}
                      </span>
                    </div>

                    <div
                      style={{
                        borderTop: "2px dashed var(--color-border, #cbd5e1)",
                        paddingTop: 12,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "var(--color-text)" }}>
                          {isKm ? "ចំនួនទឹកប្រាក់សរុបត្រូវទូទាត់" : "Total Net Payoff Amount"}
                        </div>
                        {convertedSettlement && (
                          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>
                            ≈ {formatCurrency(convertedSettlement, baseCurrency)}
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 900, color: "var(--color-primary, #2563eb)" }}>
                        {formatCurrency(totalSettlement, currency)}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Partial Prepayment Tab */
                <div style={{ marginBottom: 20 }}>
                  <div
                    style={{
                      padding: "12px 16px",
                      borderRadius: 10,
                      background: "rgba(14, 165, 233, 0.08)",
                      border: "1px solid rgba(14, 165, 233, 0.2)",
                      fontSize: 13,
                      color: "#0369a1",
                      marginBottom: 16,
                      display: "flex",
                      gap: 8,
                      alignItems: "flex-start",
                    }}
                  >
                    <Info size={16} style={{ marginTop: 2, flexShrink: 0 }} />
                    <div>
                      {isKm
                        ? "ការទូទាត់ប្រាក់ដើមមួយផ្នែកនឹងកាត់បន្ថយសមតុល្យប្រាក់ដើមកម្ចីភ្លាមៗ ដោយមិនគិតកម្រៃផាកពិន័យឡើយ។"
                        : "Partial lump-sum repayment reduces the outstanding principal balance immediately with zero penalty."}
                    </div>
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--color-text)", marginBottom: 6 }}>
                      {isKm ? `ចំនួនទឹកប្រាក់បង់ប្រាក់ដើម (${currency})` : `Lump-sum Amount (${currency})`}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      max={remainingPrincipal - 1}
                      placeholder={isKm ? "បញ្ចូលចំនួនទឹកប្រាក់..." : "Enter amount..."}
                      value={partialAmount}
                      onChange={(e) => setPartialAmount(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: 8,
                        border: "1px solid var(--color-border, #cbd5e1)",
                        fontSize: 15,
                        fontWeight: 700,
                      }}
                    />
                  </div>

                  {/* Quick percentage chips */}
                  <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                    {[10, 25, 50].map((pct) => {
                      const calculatedVal = Math.round((remainingPrincipal * (pct / 100)) * 100) / 100;
                      return (
                        <button
                          key={pct}
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{
                            borderRadius: 8,
                            fontSize: 12,
                            padding: "4px 10px",
                            border: "1px solid var(--color-border, #cbd5e1)",
                          }}
                          onClick={() => setPartialAmount(String(calculatedVal))}
                        >
                          {pct}% ({formatCurrency(calculatedVal, currency)})
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Settlement Method & Notes */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", marginBottom: 4 }}>
                    {isKm ? "វិធីសាស្ត្រទូទាត់" : "Payment Method"}
                  </label>
                  <select
                    value={settlementMethod}
                    onChange={(e) => setSettlementMethod(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid var(--color-border, #cbd5e1)",
                      fontSize: 13,
                      background: "var(--color-surface, #ffffff)",
                    }}
                  >
                    <option value="cash">{isKm ? "សាច់ប្រាក់សុទ្ធ (Cash)" : "Cash"}</option>
                    <option value="khqr_bakong">{isKm ? "បាគង KHQR (Bakong KHQR)" : "Bakong KHQR"}</option>
                    <option value="bank_transfer">{isKm ? "ផ្ទេរតាមធនាគារ (Bank Transfer)" : "Bank Transfer"}</option>
                    <option value="cheque">{isKm ? "មូលប្បទានប័ត្រ (Cheque)" : "Cheque"}</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", marginBottom: 4 }}>
                    {isKm ? "កំណត់សម្គាល់បន្ថែម" : "Notes / Remarks"}
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={isKm ? "កំណត់សម្គាល់ប្រតិបត្តិការ..." : "Transaction notes..."}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid var(--color-border, #cbd5e1)",
                      fontSize: 13,
                    }}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 24px",
            borderTop: "1px solid var(--color-border, #e2e8f0)",
            background: "var(--color-surface-sunken, #f8fafc)",
          }}
        >
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            disabled={submitting}
            style={{ borderRadius: 8 }}
          >
            {isKm ? "បោះបង់" : "Cancel"}
          </button>

          {tab === "full_payoff" ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmitFullPayoff}
              disabled={submitting || loadingQuote || remainingPrincipal <= 0}
              style={{
                borderRadius: 8,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 20px",
                fontWeight: 700,
              }}
            >
              <FileCheck size={16} />
              {submitting
                ? isKm
                  ? "កំពុងទូទាត់..."
                  : "Processing Payoff..."
                : isKm
                ? `ទូទាត់ផ្តាច់ទាំងស្រុង (${formatCurrency(totalSettlement, currency)})`
                : `Confirm Full Payoff (${formatCurrency(totalSettlement, currency)})`}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSubmitPartial}
              disabled={submitting || !partialAmount || Number(partialAmount) <= 0}
              style={{
                borderRadius: 8,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 20px",
                fontWeight: 700,
              }}
            >
              <Coins size={16} />
              {submitting
                ? isKm
                  ? "កំពុងកត់ត្រា..."
                  : "Applying Prepayment..."
                : isKm
                ? "អនុវត្តការបង់ប្រាក់ដើម"
                : "Apply Prepayment"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
