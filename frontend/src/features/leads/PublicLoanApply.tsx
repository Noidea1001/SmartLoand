import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Landmark,
  CheckCircle2,
  Send,
  Building,
  ShieldCheck,
  Phone,
  DollarSign,
  FileText,
  MapPin,
  Calendar,
  Sparkles,
} from "lucide-react";
import { submitPublicLoanLead } from "../../api/reports";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useBranding } from "../../context/BrandingContext";

export default function PublicLoanApply() {
  const { i18n } = useTranslation();
  const isKm = i18n.language === "km";
  useDocumentTitle(isKm ? "ពាក្យស្នើសុំកម្ចីអនឡាញរហ័ស" : "Online Loan Pre-Qualification Application");
  const { websiteName, baseCurrency, usdToKhrRate } = useBranding();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [amount, setAmount] = useState<number>(baseCurrency === "KHR" ? 4000000 : 1000);
  const [currency, setCurrency] = useState<"USD" | "KHR">((baseCurrency as "USD" | "KHR") || "USD");

  useEffect(() => {
    if (baseCurrency) {
      setCurrency(baseCurrency as "USD" | "KHR");
      setAmount(baseCurrency === "KHR" ? 4000000 : 1000);
    }
  }, [baseCurrency]);
  const [purpose, setPurpose] = useState("អាជីវកម្ម និងពាណិជ្ជកម្ម");
  const [income, setIncome] = useState("");
  const [employment, setEmployment] = useState("អាជីវករផ្ទាល់ខ្លួន");
  const [province, setProvince] = useState("ភ្នំពេញ");
  const [collateral, setCollateral] = useState("ប្លង់ទន់លំនៅឋាន");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const PROVINCES = [
    { km: "រាជធានីភ្នំពេញ", en: "Phnom Penh" },
    { km: "ខេត្តកណ្តាល", en: "Kandal" },
    { km: "ខេត្តសៀមរាប", en: "Siem Reap" },
    { km: "ខេត្តបាត់ដំបង", en: "Battambang" },
    { km: "ខេត្តកំពង់ចាម", en: "Kampong Cham" },
    { km: "ខេត្តព្រះសីហនុ", en: "Preah Sihanouk" },
    { km: "ខេត្តកំពត", en: "Kampot" },
    { km: "ខេត្តតាកែវ", en: "Takeo" },
    { km: "ខេត្តព្រៃវែង", en: "Prey Veng" },
    { km: "ខេត្តស្វាយរៀង", en: "Svay Rieng" },
    { km: "ខេត្តបន្ទាយមានជ័យ", en: "Banteay Meanchey" },
    { km: "ខេត្តកំពង់ឆ្នាំង", en: "Kampong Chhnang" },
    { km: "ខេត្តកំពង់ធំ", en: "Kampong Thom" },
    { km: "ខេត្តកំពង់ស្ពឺ", en: "Kampong Speu" },
    { km: "ខេត្តពោធិ៍សាត់", en: "Pursat" },
    { km: "ខេត្តកោះកុង", en: "Koh Kong" },
    { km: "ខេត្តក្រចេះ", en: "Kratie" },
    { km: "ខេត្តស្ទឹងត្រែង", en: "Stung Treng" },
    { km: "ខេត្តរតនគិរី", en: "Ratanakiri" },
    { km: "ខេត្តមណ្ឌលគិរី", en: "Mondulkiri" },
    { km: "ខេត្តឧត្តរមានជ័យ", en: "Oddar Meanchey" },
    { km: "ខេត្តកែប", en: "Kep" },
    { km: "ខេត្តប៉ៃលិន", en: "Pailin" },
    { km: "ខេត្តព្រះវិហារ", en: "Preah Vihear" },
    { km: "ខេត្តត្បូងឃ្មុំ", en: "Tboung Khmum" },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || amount <= 0) {
      setErrorMsg(isKm ? "សូមបញ្ចូលឈ្មោះ លេខទូរស័ព្ទ និងចំនួនទឹកប្រាក់ដែលចង់ខ្ចី" : "Please provide full name, phone number, and loan amount.");
      return;
    }
    setErrorMsg("");
    setSubmitting(true);
    try {
      const res = await submitPublicLoanLead({
        full_name: fullName.trim(),
        phone: phone.trim(),
        national_id: nationalId.trim(),
        requested_amount: amount,
        currency,
        loan_purpose: purpose,
        monthly_income: income,
        employment_status: employment,
        province,
        collateral_type: collateral,
        notes,
      });
      setSubmittedRef(res.reference_code);
    } catch {
      setErrorMsg(isKm ? "មានបញ្ហាបច្ចេកទេសក្នុងការបញ្ជូនពាក្យស្នើសុំ។ សូមព្យាយាមម្តងទៀត!" : "Submission failed. Please check network connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--color-bg)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 640 }}>
        {/* Brand Header */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: 14,
              background: "var(--color-accent)",
              color: "#ffffff",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
              boxShadow: "0 8px 16px -4px rgba(99, 102, 241, 0.4)",
            }}
          >
            <Landmark size={28} />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 6px 0", color: "var(--color-text)" }}>
            {websiteName || "Smart Loan Cambodia"}
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: "var(--color-text-muted)" }}>
            {isKm
              ? "ពាក្យស្នើសុំកម្ចីអនឡាញរហ័ស ងាយស្រួល និងសុវត្ថិភាពខ្ពស់"
              : "Fast, transparent & secure online loan pre-qualification"}
          </p>
        </div>

        {/* Form or Confirmation Card */}
        {submittedRef ? (
          <div
            className="card"
            style={{
              padding: "36px 30px",
              textAlign: "center",
              borderRadius: 16,
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3)",
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                background: "rgba(16, 185, 129, 0.15)",
                color: "#10b981",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <CheckCircle2 size={36} />
            </div>

            <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px 0", color: "var(--color-text)" }}>
              {isKm ? "ការដាក់ពាក្យទទួលបានជោគជ័យ!" : "Application Submitted Successfully!"}
            </h2>

            <p style={{ fontSize: 14, color: "var(--color-text-muted)", margin: "0 0 20px 0", lineHeight: 1.6 }}>
              {isKm
                ? "សូមអរគុណចំពោះការជឿទុកចិត្ត! មន្ត្រីឥណទានជំនាញរបស់យើងនឹងទាក់ទងមកអ្នកតាមរយៈលេខទូរស័ព្ទក្នុងពេលឆាប់ៗនេះ។"
                : "Thank you for applying. A dedicated loan officer will contact you by phone shortly to assist with next steps."}
            </p>

            <div
              style={{
                padding: "16px 20px",
                borderRadius: 12,
                background: "var(--color-surface-sunken)",
                border: "1px dashed var(--color-border)",
                display: "inline-block",
                marginBottom: 24,
              }}
            >
              <span style={{ fontSize: 12, color: "var(--color-text-muted)", display: "block", marginBottom: 4 }}>
                {isKm ? "លេខកូដតាមដានពាក្យស្នើសុំ (Reference ID)" : "Application Reference Code"}
              </span>
              <span style={{ fontSize: 20, fontWeight: 800, color: "var(--color-accent)", letterSpacing: "0.05em" }}>
                {submittedRef}
              </span>
            </div>

            <div>
              <button
                onClick={() => {
                  setSubmittedRef(null);
                  setFullName("");
                  setPhone("");
                  setAmount(1000);
                }}
                className="btn btn-secondary"
                style={{ padding: "10px 24px", fontSize: 14 }}
              >
                {isKm ? "ដាក់ពាក្យស្នើសុំថ្មីមួយទៀត" : "Submit Another Application"}
              </button>
            </div>
          </div>
        ) : (
          <div
            className="card"
            style={{
              padding: "28px 30px",
              borderRadius: 16,
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.25)",
            }}
          >
            {errorMsg && (
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: 8,
                  background: "rgba(239, 68, 68, 0.15)",
                  color: "#ef4444",
                  fontSize: 13,
                  fontWeight: 500,
                  marginBottom: 16,
                }}
              >
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Full Name & Phone */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                      {isKm ? "គោត្តនាម និងនាមខ្លួន (ឈ្មោះពេញ) *" : "Full Name *"}
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={isKm ? "ឧ. សុខ វិបុល" : "e.g. Sok Vibul"}
                      className="input"
                      style={{ width: "100%", fontSize: 14 }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                      {isKm ? "លេខទូរស័ព្ទទំនាក់ទំនង *" : "Phone Number *"}
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="012 345 678"
                      className="input"
                      style={{ width: "100%", fontSize: 14 }}
                    />
                  </div>
                </div>

                {/* Amount & Currency */}
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                      {isKm ? "ទំហំកម្ចីដែលចង់ខ្ចី *" : "Requested Loan Amount *"}
                    </label>
                    <input
                      type="number"
                      required
                      min={10}
                      step="any"
                      value={amount || ""}
                      onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                      placeholder={currency === "KHR" ? "4,000,000" : "1,000"}
                      className="input"
                      style={{ width: "100%", fontSize: 15, fontWeight: 700 }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                      {isKm ? "រូបិយប័ណ្ណ" : "Currency"}
                    </label>
                    <select
                      value={currency}
                      onChange={(e) => {
                        const newCur = e.target.value as "USD" | "KHR";
                        if (newCur !== currency) {
                          setCurrency(newCur);
                          if (newCur === "KHR" && amount <= 50000) {
                            setAmount(Math.round(amount * (usdToKhrRate || 4100)));
                          } else if (newCur === "USD" && amount >= 40000) {
                            setAmount(Math.round(amount / (usdToKhrRate || 4100)));
                          }
                        }
                      }}
                      className="input"
                      style={{ width: "100%", fontSize: 14 }}
                    >
                      <option value="USD">USD ($)</option>
                      <option value="KHR">KHR (៛)</option>
                    </select>
                  </div>
                </div>

                {/* Purpose & Province */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                      {isKm ? "គោលបំណងកម្ចី" : "Loan Purpose"}
                    </label>
                    <select
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      className="input"
                      style={{ width: "100%", fontSize: 14 }}
                    >
                      <option value="អាជីវកម្ម និងពាណិជ្ជកម្ម">{isKm ? "អាជីវកម្ម និងពាណិជ្ជកម្ម" : "Business & Trade"}</option>
                      <option value="កសិកម្ម និងដាំដុះ">{isKm ? "កសិកម្ម និងដាំដុះ" : "Agriculture & Farming"}</option>
                      <option value="ទិញ ឬជួសជុលលំនៅឋាន">{isKm ? "ទិញ ឬជួសជុលលំនៅឋាន" : "Home Purchase / Renovation"}</option>
                      <option value="ទិញយានយន្ត ឬម៉ូតូ">{isKm ? "ទិញយានយន្ត ឬម៉ូតូ" : "Vehicle / Motorbike"}</option>
                      <option value="ការសិក្សា ឬតម្រូវការបន្ទាន់">{isKm ? "ការសិក្សា ឬតម្រូវការបន្ទាន់" : "Education / Personal Need"}</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                      {isKm ? "រាជធានី / ខេត្តរស់នៅ" : "Province / City"}
                    </label>
                    <select
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                      className="input"
                      style={{ width: "100%", fontSize: 14 }}
                    >
                      {PROVINCES.map((p) => (
                        <option key={p.en} value={p.km}>
                          {isKm ? p.km : p.en}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Income & Collateral */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                      {isKm ? "ចំណូលប្រចាំខែប៉ាន់ស្មាន" : "Estimated Monthly Income"}
                    </label>
                    <input
                      type="text"
                      value={income}
                      onChange={(e) => setIncome(e.target.value)}
                      placeholder={isKm ? "ឧ. $500 - $800/ខែ" : "e.g. $500 - $800/month"}
                      className="input"
                      style={{ width: "100%", fontSize: 14 }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                      {isKm ? "ទ្រព្យបញ្ចាំ / ធានាដែលមាន" : "Available Collateral"}
                    </label>
                    <select
                      value={collateral}
                      onChange={(e) => setCollateral(e.target.value)}
                      className="input"
                      style={{ width: "100%", fontSize: 14 }}
                    >
                      <option value="ប្លង់ទន់លំនៅឋាន">{isKm ? "ប្លង់ទន់លំនៅឋាន (Soft Title)" : "Soft Title Deed"}</option>
                      <option value="ប្លង់រឹងអចលនទ្រព្យ">{isKm ? "ប្លង់រឹងអចលនទ្រព្យ (Hard Title)" : "Hard Title Deed"}</option>
                      <option value="កាតគ្រីម៉ូតូ ឬរថយន្ត">{isKm ? "កាតគ្រីម៉ូតូ ឬរថយន្ត (Vehicle Card)" : "Vehicle Registration"}</option>
                      <option value="មាស ឬត្បូងមានតម្លៃ">{isKm ? "មាស ឬត្បូងមានតម្លៃ (Gold)" : "Gold / Jewelry"}</option>
                      <option value="គ្មានទ្រព្យបញ្ចាំ (កម្ចីអត់ទ្រព្យ)">{isKm ? "គ្មានទ្រព្យបញ្ចាំ (កម្ចីអត់ទ្រព្យ)" : "Unsecured Loan"}</option>
                    </select>
                  </div>
                </div>

                {/* Additional Notes */}
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                    {isKm ? "សំណូមពរបន្ថែម (បើមាន)" : "Additional Notes (Optional)"}
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={isKm ? "បញ្ជាក់ម៉ោងដែលងាយស្រួលឱ្យមន្ត្រីទាក់ទងទៅ..." : "Preferred time to call, etc..."}
                    className="input"
                    style={{ width: "100%", resize: "vertical", fontSize: 13.5 }}
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                  style={{
                    width: "100%",
                    padding: "12px 0",
                    fontSize: 15,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    marginTop: 8,
                  }}
                >
                  <Send size={16} />
                  <span>{submitting ? (isKm ? "កំពុងបញ្ជូនពាក្យស្នើសុំ..." : "Submitting...") : (isKm ? "ផ្ញើពាក្យស្នើសុំកម្ចីឥឡូវនេះ" : "Submit Loan Application")}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Footer info */}
        <div style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: "var(--color-text-muted)" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <ShieldCheck size={14} style={{ color: "var(--color-success)" }} />
            <span>{isKm ? "ព័ត៌មានរបស់អ្នកត្រូវបានរក្សាការសម្ងាត់យ៉ាងតឹងរ៉ឹង" : "Your personal information is strictly protected and encrypted"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
