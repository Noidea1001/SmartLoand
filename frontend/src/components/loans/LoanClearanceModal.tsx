import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Printer, X, Award, ShieldCheck } from "lucide-react";
import type { Loan } from "../../api/types";
import { formatCurrency, formatDate } from "../../utils/format";
import { useBranding } from "../../context/BrandingContext";

interface LoanClearanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  loan: Loan;
}

export default function LoanClearanceModal({ isOpen, onClose, loan }: LoanClearanceModalProps) {
  const { i18n } = useTranslation();
  const { companyName, tagline } = useBranding();
  const isKm = i18n.language === "km";

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const certId = `${isKm ? "វិញ្ញាបនបត្រ" : "CERT"}-${loan.id.slice(0, 8).toUpperCase()}-${new Date().getFullYear()}`;

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 680,
          width: "100%",
          background: "#ffffff",
          borderRadius: "14px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          border: "1px solid var(--color-border)",
          overflow: "hidden",
        }}
      >
        {/* Modal Controls (hidden on print) */}
        <div
          className="no-print"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 20px",
            borderBottom: "1px solid var(--color-border)",
            background: "var(--color-surface-sunken)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Award size={18} color="var(--color-success)" />
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text)" }}>
              {isKm ? "លិខិតបញ្ជាក់ការទូទាត់រួចបំណុលជាស្ថាពរ" : "Official Certificate of Debt Clearance"}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => window.print()}
              style={{ borderRadius: "8px", fontSize: 12.5 }}
            >
              <Printer size={14} /> {isKm ? "បោះពុម្ពលិខិត" : "Print Certificate"}
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

        {/* Certificate Paper Document */}
        <div
          style={{
            padding: "36px 40px",
            background: "#ffffff",
            position: "relative",
            minHeight: 520,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            fontFamily: isKm ? "'Khmer OS Battambang', 'Hanuman', 'Siemreap', sans-serif" : "inherit",
          }}
        >
          {/* Subtle Watermark Stamp */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%) rotate(-18deg)",
              fontSize: isKm ? 44 : 54,
              fontWeight: 900,
              color: "rgba(16, 185, 129, 0.06)",
              border: "6px dashed rgba(16, 185, 129, 0.15)",
              padding: "16px 36px",
              borderRadius: "14px",
              letterSpacing: isKm ? "0.05em" : "0.15em",
              pointerEvents: "none",
              userSelect: "none",
              textAlign: "center",
              lineHeight: 1.2,
            }}
          >
            {isKm ? "ទូទាត់រួចរាល់ ១០០%" : "PAID IN FULL"}
          </div>

          {/* Certificate Header */}
          <div style={{ borderBottom: "2px solid #0f172a", paddingBottom: 18, marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h1 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: "#0f172a", letterSpacing: "0.03em" }}>
                  {companyName || (isKm ? "ស្ថាប័នឥណទាន ស្មាត ឡូន ភីអិលស៊ី" : "SMART LOAN PLATFORM MFI PLC.")}
                </h1>
                <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "#64748b" }}>
                  {tagline || (isKm ? "សេវាកម្មឥណទាន និងហិរញ្ញវត្ថុស្របច្បាប់" : "Enterprise Microfinance & Credit Services")}
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11.5, fontWeight: 800, color: "var(--color-success)" }}>
                  {isKm ? "លេខយោង៖ " : "CERTIFICATE ID: "}{certId}
                </div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                  {isKm ? "កាលបរិច្ឆេទចេញ៖ " : "Issue Date: "}
                  {formatDate(new Date().toISOString(), isKm ? "km" : "en")}
                </div>
              </div>
            </div>
          </div>

          {/* Certificate Title */}
          <div style={{ textAlign: "center", margin: "10px 0 22px" }}>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: "#0f172a", margin: 0, letterSpacing: "0.02em" }}>
              {isKm ? "លិខិតបញ្ជាក់ការទូទាត់បំណុលរួចរាល់ជាស្ថាពរ" : "CERTIFICATE OF LOAN CLEARANCE"}
            </h2>
          </div>

          {/* Main Legal Body */}
          <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.8, marginBottom: 24 }}>
            <p style={{ margin: "0 0 14px", textAlign: "justify" }}>
              {isKm ? (
                <>
                  សូមបញ្ជាក់ជាផ្លូវការជូនថា អតិថិជនឈ្មោះ <strong>{loan.client_name || "កូនបំណុល"}</strong> បានទូទាត់សងបញ្ចប់នូវរាល់កាតព្វកិច្ចហិរញ្ញវត្ថុ ប្រាក់ដើមកម្ចី ការប្រាក់ និងកម្រៃផ្សេងៗទាំងអស់ ស្របតាមកិច្ចសន្យាឥណទានលេខ <strong>#{loan.id.slice(0, 8).toUpperCase()}</strong> យ៉ាងត្រឹមត្រូវ និងរួចរាល់ជាស្ថាពរ ១០០%។
                </>
              ) : (
                <>
                  This is to formally certify that borrower <strong>{loan.client_name || "Borrower"}</strong> has fully satisfied,
                  discharged, and settled all financial liabilities, principal balances, interest, and charges under Loan
                  Facility Agreement <strong>#{loan.id.slice(0, 8).toUpperCase()}</strong>.
                </>
              )}
            </p>

            {/* Key Facility Details */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                padding: "14px 18px",
                background: "var(--color-surface-sunken)",
                borderRadius: "8px",
                border: "1px solid var(--color-border)",
                margin: "16px 0",
                fontSize: 12.5,
              }}
            >
              <div>
                <span style={{ color: "var(--color-text-muted)" }}>
                  {isKm ? "ប្រាក់ដើមកម្ចីសរុប៖ " : "Total Principal Disbursed: "}
                </span>
                <strong className="num">{formatCurrency(loan.principal_amount, loan.principal_currency)}</strong>
              </div>
              <div>
                <span style={{ color: "var(--color-text-muted)" }}>
                  {isKm ? "កាលបរិច្ឆេទចាប់ផ្តើម៖ " : "Facility Start Date: "}
                </span>
                <strong className="num">{formatDate(loan.start_date, isKm ? "km" : "en")}</strong>
              </div>
              <div>
                <span style={{ color: "var(--color-text-muted)" }}>
                  {isKm ? "រយៈពេលកម្ចីសរុប៖ " : "Total Term Duration: "}
                </span>
                <strong className="num">{loan.term_months} {isKm ? "ខែ" : "Months"}</strong>
              </div>
              <div>
                <span style={{ color: "var(--color-text-muted)" }}>
                  {isKm ? "ស្ថានភាពឥណទាន៖ " : "Facility Status: "}
                </span>
                <strong style={{ color: "var(--color-success)" }}>
                  {isKm ? "បានបញ្ចប់ / រួចបំណុលជាស្ថាពរ" : "CLOSED / PAID IN FULL"}
                </strong>
              </div>
            </div>

            {/* Collateral Release Clause if collateral was pledged */}
            {loan.collateral_info?.description && (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "12px 14px",
                  background: "rgba(16, 185, 129, 0.08)",
                  borderRadius: "8px",
                  border: "1px solid rgba(16, 185, 129, 0.2)",
                  fontSize: 12,
                  color: "#0f766e",
                  lineHeight: 1.5,
                }}
              >
                <ShieldCheck size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong>{isKm ? "ការធានាដោះលែងទ្រព្យបញ្ចាំ៖ " : "Collateral Release Guarantee: "}</strong>
                  {isKm ? (
                    <>
                      រាល់ទ្រព្យបញ្ចាំដែលបានដាក់តម្កល់ (<em>{loan.collateral_info.description}</em>
                      {loan.collateral_info.document_reference ? `, លេខប័ណ្ណសម្គាល់៖ ${loan.collateral_info.document_reference}` : ""})
                      ត្រូវបានដោះលែងរួចផុតពីបន្ទុកបំណុល និងប្រគល់ជូនម្ចាស់កម្មសិទ្ធិវិញដោយឥតលក្ខខណ្ឌ។
                    </>
                  ) : (
                    <>
                      Any pledged collateral asset (<em>{loan.collateral_info.description}</em>
                      {loan.collateral_info.document_reference ? `, Title Ref: ${loan.collateral_info.document_reference}` : ""})
                      is hereby unconditionally discharged of all liens and returned to the lawful owner.
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Official Signatures Bar */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, marginTop: 24, paddingTop: 18, borderTop: "1px solid #e2e8f0" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ height: 36 }} />
              <div style={{ borderTop: "1px dashed #94a3b8", paddingTop: 8, fontSize: 11.5, fontWeight: 700, color: "#0f172a" }}>
                {isKm ? "ប្រធាននាយកដ្ឋានឥណទាន" : "HEAD OF CREDIT OPERATIONS"}
              </div>
              <div style={{ fontSize: 10.5, color: "#64748b" }}>
                {isKm ? "ហត្ថលេខីស្របច្បាប់ស្ថាប័ន" : "Authorized Bank Signatory"}
              </div>
            </div>

            <div style={{ textAlign: "center" }}>
              <div style={{ height: 36 }} />
              <div style={{ borderTop: "1px dashed #94a3b8", paddingTop: 8, fontSize: 11.5, fontWeight: 700, color: "#0f172a" }}>
                {isKm ? "នាយកប្រតិបត្តិ / ប្រធានសាខា" : "MANAGING DIRECTOR / BRANCH HEAD"}
              </div>
              <div style={{ fontSize: 10.5, color: "#64748b" }}>
                {companyName || (isKm ? "ស្ថាប័នឥណទាន ស្មាត ឡូន" : "Smart Loan Platform")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
