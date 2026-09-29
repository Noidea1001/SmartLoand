import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Printer,
  X,
  CheckCircle2,
  Download,
  Building2,
  Calendar,
  User,
  CreditCard,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import type { PaymentItem } from "../../api/payments";
import { formatCurrency, formatDateTime } from "../../utils/format";
import { useBranding } from "../../context/BrandingContext";

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: PaymentItem | null;
}

export default function ReceiptModal({ isOpen, onClose, payment }: ReceiptModalProps) {
  const { t } = useTranslation();
  const { websiteName, companyName, tagline, usdToKhrRate } = useBranding();

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !payment) return null;

  function handlePrint() {
    window.print();
  }

  const effectiveRate = payment.exchange_rate_used || usdToKhrRate || 4100;
  const isUSD = payment.currency === "USD";
  const convertedAltAmount = isUSD
    ? Number(payment.amount) * effectiveRate
    : Number(payment.amount) / effectiveRate;
  const altCurrency = isUSD ? "KHR" : "USD";

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 480,
          width: "100%",
          background: "#ffffff",
          borderRadius: "14px",
          boxShadow: "0 20px 45px -10px rgba(0, 0, 0, 0.25)",
          border: "1px solid var(--color-border)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Modal Controls Banner (hidden during print) */}
        <div
          className="no-print"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 20px",
            borderBottom: "1px solid var(--color-border)",
            background: "var(--color-surface-sunken)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CheckCircle2 size={18} color="var(--color-success)" />
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text)" }}>
              {t("repaymentsPage.paymentSuccess")}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handlePrint}
              style={{ borderRadius: "8px", fontSize: 12.5 }}
            >
              <Printer size={14} />
              <span>{t("repaymentsPage.printBtn")}</span>
            </button>
            <button
              type="button"
              className="btn-icon"
              onClick={onClose}
              aria-label="Close"
              style={{ borderRadius: "8px" }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Printable Official Receipt Body */}
        <div
          id="printable-receipt"
          style={{
            padding: 28,
            background: "#ffffff",
            color: "#0f172a",
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          {/* Header */}
          <div style={{ textAlign: "center", paddingBottom: 16, borderBottom: "2px dashed #cbd5e1" }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: "#0f172a", letterSpacing: "-0.01em" }}>
              {companyName || "Smart Loan Enterprise"}
            </h2>
            <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2, fontWeight: 500 }}>
              {websiteName} • {tagline || "Credit Suite"}
            </div>
            <div
              style={{
                marginTop: 10,
                display: "inline-block",
                padding: "3px 12px",
                borderRadius: "6px",
                background: "#f1f5f9",
                border: "1px solid #e2e8f0",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#334155",
              }}
            >
              {t("repaymentsPage.officialReceipt")}
            </div>
          </div>

          {/* Receipt Info Strip */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              padding: "14px 0",
              borderBottom: "1px solid #e2e8f0",
              fontSize: 12,
            }}
          >
            <div>
              <span style={{ color: "#64748b" }}>{t("repaymentsPage.receiptNo")}:</span>
              <div className="num" style={{ fontWeight: 700, color: "#0f172a", marginTop: 1 }}>
                {payment.receipt_number || `REC-${payment.id.slice(0, 8).toUpperCase()}`}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ color: "#64748b" }}>{t("repaymentsPage.dateTime")}:</span>
              <div style={{ fontWeight: 600, color: "#0f172a", marginTop: 1 }}>
                {formatDateTime(payment.paid_at)}
              </div>
            </div>

            <div>
              <span style={{ color: "#64748b" }}>{t("repaymentsPage.clientName")}:</span>
              <div style={{ fontWeight: 700, color: "#0f172a", marginTop: 1 }}>
                {payment.client_name || "Valued Client"}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ color: "#64748b" }}>{t("repaymentsPage.phone")}:</span>
              <div className="num" style={{ fontWeight: 600, color: "#0f172a", marginTop: 1 }}>
                {payment.client_phone || "--"}
              </div>
            </div>

            <div>
              <span style={{ color: "#64748b" }}>{t("repaymentsPage.installmentNo")}:</span>
              <div className="num" style={{ fontWeight: 700, color: "#0f172a", marginTop: 1 }}>
                {t("repaymentsPage.installmentNo")} {payment.installment_number || 1}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ color: "#64748b" }}>{t("repaymentsPage.method")}:</span>
              <div style={{ fontWeight: 700, color: "#0f172a", marginTop: 1, textTransform: "capitalize" }}>
                {payment.method.replace("_", " ")}
              </div>
            </div>
          </div>

          {/* Total Amount Box */}
          <div
            style={{
              margin: "18px 0",
              padding: "16px 18px",
              borderRadius: "8px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b" }}>
              {t("repaymentsPage.amountPaid")}
            </div>
            <div
              className="num"
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: "#0f172a",
                letterSpacing: "-0.02em",
                marginTop: 2,
              }}
            >
              {formatCurrency(payment.amount, payment.currency)}
            </div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
              Equivalent: <strong>{formatCurrency(convertedAltAmount, altCurrency)}</strong>
              <span style={{ fontSize: 10.5, color: "#94a3b8", marginLeft: 6 }}>
                (@ 1 USD = {effectiveRate.toLocaleString()} KHR)
              </span>
            </div>
          </div>

          {/* Balance & Notes */}
          <div style={{ fontSize: 12, display: "grid", gap: 6, paddingBottom: 16, borderBottom: "1px solid #e2e8f0" }}>
            {payment.remaining_balance !== undefined && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>{t("repaymentsPage.remainingBalance")}:</span>
                <span className="num" style={{ fontWeight: 700, color: "#0f172a" }}>
                  {formatCurrency(payment.remaining_balance, payment.loan_principal_currency || payment.currency)}
                </span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#64748b" }}>{t("repaymentsPage.recordedBy")}:</span>
              <span style={{ fontWeight: 600, color: "#0f172a" }}>
                {payment.recorded_by_name || "Bank Cashier"}
              </span>
            </div>
          </div>

          {/* Signatures & Verification */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 24,
              marginTop: 24,
              textAlign: "center",
              fontSize: 11,
              color: "#64748b",
            }}
          >
            <div>
              <div style={{ height: 40 }} />
              <div style={{ borderTop: "1px solid #cbd5e1", paddingTop: 4 }}>
                <strong>{t("repaymentsPage.cashierSignature")}</strong>
              </div>
            </div>
            <div>
              <div style={{ height: 40 }} />
              <div style={{ borderTop: "1px solid #cbd5e1", paddingTop: 4 }}>
                <strong>{t("repaymentsPage.clientSignature")}</strong>
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 18,
              textAlign: "center",
              fontSize: 10.5,
              color: "#94a3b8",
            }}
          >
            Thank you for your repayment. This voucher serves as official proof of payment.
          </div>
        </div>

        {/* Print Styles */}
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #printable-receipt, #printable-receipt * {
              visibility: visible;
            }
            #printable-receipt {
              position: fixed;
              left: 0;
              top: 0;
              width: 100%;
              max-width: 480px;
              margin: 0 auto;
              padding: 20px;
            }
            .no-print {
              display: none !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
}
