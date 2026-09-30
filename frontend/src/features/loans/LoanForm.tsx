import { useEffect, useState, useMemo, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  CreditCard,
  Landmark,
  Calendar,
  Percent,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  X,
  CheckCircle,
  HelpCircle,
  Search,
  UserCheck,
  DollarSign,
  Shield,
  FileText,
  UserPlus,
} from "lucide-react";
import { listClients } from "../../api/clients";
import { listProducts } from "../../api/products";
import { createLoan } from "../../api/loans";
import type { Client, Product } from "../../api/types";
import { useToast } from "../../context/ToastContext";
import { formatCurrency, formatDate } from "../../utils/format";
import { useBranding } from "../../context/BrandingContext";

interface LoanFormProps {
  onCreated: () => void;
  onCancel: () => void;
  initialClientId?: string;
  initialPrincipal?: string;
  initialCurrency?: "USD" | "KHR";
  initialRate?: string;
  initialTermMonths?: string;
  initialInterestType?: "flat" | "reducing";
}

export default function LoanForm({
  onCreated,
  onCancel,
  initialClientId,
  initialPrincipal,
  initialCurrency,
  initialRate,
  initialTermMonths,
  initialInterestType,
}: LoanFormProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const { baseCurrency, usdToKhrRate } = useBranding();

  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [clientId, setClientId] = useState(initialClientId || "");
  const [productId, setProductId] = useState("");
  const effectiveCurrency = initialCurrency || baseCurrency || "USD";
  const [currency, setCurrency] = useState<"USD" | "KHR">(effectiveCurrency);
  const [principal, setPrincipal] = useState(
    initialPrincipal || (effectiveCurrency === "KHR" ? "20000000" : "5000")
  );
  const [rate, setRate] = useState(initialRate || "1.5");
  const [interestType, setInterestType] = useState<"flat" | "reducing">(initialInterestType || "flat");
  const [termMonths, setTermMonths] = useState(initialTermMonths || "12");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [gracePeriodDays, setGracePeriodDays] = useState("3");
  const [lateFeePercent, setLateFeePercent] = useState("2.0");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [borrowerSearch, setBorrowerSearch] = useState("");
  const [isSelectingBorrower, setIsSelectingBorrower] = useState(false);

  // Collateral & Guarantor State (Enterprise Lending Features)
  const [hasCollateral, setHasCollateral] = useState(false);
  const [collateralType, setCollateralType] = useState("land_hard_title");
  const [collateralDesc, setCollateralDesc] = useState("");
  const [collateralValue, setCollateralValue] = useState("");
  const [collateralDocRef, setCollateralDocRef] = useState("");

  const [hasGuarantor, setHasGuarantor] = useState(false);
  const [guarantorName, setGuarantorName] = useState("");
  const [guarantorPhone, setGuarantorPhone] = useState("");
  const [guarantorId, setGuarantorId] = useState("");
  const [guarantorRelation, setGuarantorRelation] = useState("Spouse");
  const [guarantorIncome, setGuarantorIncome] = useState("");

  const ltvRatio = useMemo(() => {
    const val = Number(collateralValue) || 0;
    const p = Number(principal) || 0;
    if (val <= 0 || p <= 0) return null;
    return (p / val) * 100;
  }, [collateralValue, principal]);

  useEffect(() => {
    listClients(1, "").then((res) => {
      setClients(res.items);
      if (!clientId && res.items.length > 0 && !initialClientId) {
        setClientId(res.items[0].id);
      }
    });
    listProducts(1, "").then((res) => setProducts(res.items));
  }, [initialClientId]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  // When a product is selected, auto-fill principal amount & currency
  function handleProductSelect(id: string) {
    setProductId(id);
    const prod = products.find((p) => p.id === id);
    if (prod) {
      setPrincipal(String(prod.price_amount));
      if (prod.price_currency === "KHR" || prod.price_currency === "USD") {
        setCurrency(prod.price_currency as "USD" | "KHR");
      }
    }
  }

  // Selected client object
  const selectedClient = useMemo(() => {
    return clients.find((c) => c.id === clientId);
  }, [clients, clientId]);

  // Real-time borrower search filter
  const filteredClients = useMemo(() => {
    if (!borrowerSearch.trim()) return clients;
    const q = borrowerSearch.toLowerCase();
    return clients.filter(
      (c) =>
        c.current_name.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.national_id && c.national_id.toLowerCase().includes(q))
    );
  }, [clients, borrowerSearch]);

  // Real-time financial calculations
  const p = Number(principal) || 0;
  const rMonthly = (Number(rate) || 0) / 100;
  const nMonths = Math.max(1, Number(termMonths) || 1);

  const calculations = useMemo(() => {
    if (p <= 0) {
      return {
        monthlyPayment: 0,
        totalInterest: 0,
        totalRepayment: 0,
        interestRatio: 0,
      };
    }

    let monthlyPayment = 0;
    let totalInterest = 0;
    let totalRepayment = 0;

    if (interestType === "flat") {
      totalInterest = p * rMonthly * nMonths;
      totalRepayment = p + totalInterest;
      monthlyPayment = totalRepayment / nMonths;
    } else {
      // Reducing balance (amortization standard EMI formula)
      if (rMonthly === 0) {
        monthlyPayment = p / nMonths;
        totalInterest = 0;
        totalRepayment = p;
      } else {
        const factor = Math.pow(1 + rMonthly, nMonths);
        monthlyPayment = (p * rMonthly * factor) / (factor - 1);
        totalRepayment = monthlyPayment * nMonths;
        totalInterest = Math.max(0, totalRepayment - p);
      }
    }

    const interestRatio = totalRepayment > 0 ? (totalInterest / totalRepayment) * 100 : 0;

    return {
      monthlyPayment,
      totalInterest,
      totalRepayment,
      interestRatio,
    };
  }, [p, rMonthly, nMonths, interestType]);

  // Estimated maturity date
  const maturityDate = useMemo(() => {
    try {
      const d = new Date(startDate);
      d.setMonth(d.getMonth() + nMonths);
      return formatDate(d.toISOString().slice(0, 10));
    } catch {
      return "--";
    }
  }, [startDate, nMonths]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!clientId) {
      setError("Please select a client for this loan.");
      return;
    }
    setError(null);
    setSubmitting(true);

    try {
      await createLoan({
        client_id: clientId,
        product_id: productId || undefined,
        principal_amount: p,
        principal_currency: currency,
        interest_rate_percent: Number(rate),
        interest_type: interestType,
        term_months: nMonths,
        start_date: startDate,
        collateral_info: hasCollateral && collateralDesc.trim() ? {
          asset_type: collateralType,
          description: collateralDesc.trim(),
          estimated_value: Number(collateralValue) || 0,
          document_reference: collateralDocRef.trim(),
        } : undefined,
        guarantor_info: hasGuarantor && guarantorName.trim() ? {
          name: guarantorName.trim(),
          phone: guarantorPhone.trim(),
          national_id: guarantorId.trim(),
          relationship: guarantorRelation,
          monthly_income: Number(guarantorIncome) || 0,
        } : undefined,
      });

      toast.success(
        `Loan of ${formatCurrency(p, currency)} for ${selectedClient?.current_name || "client"} initiated successfully.`,
        { title: "Loan Application Created" }
      );
      onCreated();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Failed to create loan application.";
      setError(msg);
      toast.error(msg, { title: "Submission Failed" });
    } finally {
      setSubmitting(false);
    }
  }

  const TERM_PRESETS = [6, 12, 18, 24, 36, 48, 60];

  return (
    <div className="no-print modal-backdrop" onClick={onCancel}>
      <div
        className="modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 620,
          background: "var(--color-surface)",
          borderRadius: "14px",
          boxShadow: "0 20px 45px -10px rgba(0, 0, 0, 0.25)",
          border: "1px solid var(--color-border)",
        }}
      >
        {/* Modal Header Banner */}
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
              backgroundColor: "var(--color-surface-sunken)",
              color: "var(--color-accent)",
              borderRadius: "10px",
            }}
          >
            <DollarSign size={20} />
          </div>
          <div className="modal-header-text">
            <h2 className="modal-header-title">{t("loans.newLoan")}</h2>
            <p className="modal-header-desc">{t("clients.createCardDesc")}</p>
          </div>
          <button
            type="button"
            className="btn-icon"
            onClick={onCancel}
            aria-label="Close"
            style={{ marginTop: -4, marginRight: -4, borderRadius: "8px" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body-scroll" style={{ background: "var(--color-surface)", padding: "20px 24px" }}>
          <form id="loan-application-form" onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
              {/* Client Selection with Instant Real-Time Search */}
              <div className="form-group">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <label className="form-label" style={{ margin: 0 }}>
                    {t("loans.client")} <span className="required">*</span>
                  </label>
                  {selectedClient && (
                    <button
                      type="button"
                      onClick={() => setIsSelectingBorrower((b) => !b)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--color-accent)",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {isSelectingBorrower ? t("common.close") : t("common.search")}
                    </button>
                  )}
                </div>

                {/* If borrower is picked and not searching, show sleek card */}
                {selectedClient && !isSelectingBorrower ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--color-border)",
                      background: "var(--color-surface-sunken)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          background: "linear-gradient(135deg, var(--color-accent), var(--color-accent-hover))",
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          fontSize: 13,
                        }}
                      >
                        {selectedClient.current_name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{selectedClient.current_name}</div>
                        <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", display: "flex", gap: 10 }}>
                          {selectedClient.phone && <span>Tel: {selectedClient.phone}</span>}
                          {selectedClient.national_id && <span>ID: {selectedClient.national_id}</span>}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-xs"
                      onClick={() => setIsSelectingBorrower(true)}
                    >
                      {t("common.edit")}
                    </button>
                  </div>
                ) : (
                  /* Borrower Search Box & Filter List */
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <div style={{ position: "relative" }}>
                      <Search
                        size={15}
                        style={{
                          position: "absolute",
                          left: 10,
                          top: "50%",
                          transform: "translateY(-50%)",
                          color: "var(--color-text-muted)",
                        }}
                      />
                      <input
                        type="text"
                        placeholder={t("loans.searchBorrower")}
                        value={borrowerSearch}
                        onChange={(e) => setBorrowerSearch(e.target.value)}
                        style={{ paddingLeft: 32, fontSize: 13 }}
                        autoFocus
                      />
                    </div>
                    <div
                      style={{
                        maxHeight: 180,
                        overflowY: "auto",
                        border: "1px solid var(--color-border)",
                        borderRadius: "var(--radius-md)",
                        background: "var(--color-surface)",
                      }}
                    >
                      {filteredClients.length === 0 ? (
                        <div style={{ padding: 12, fontSize: 12.5, color: "var(--color-text-muted)", textAlign: "center" }}>
                          {t("common.noResults")}
                        </div>
                      ) : (
                        filteredClients.map((c) => (
                          <div
                            key={c.id}
                            onClick={() => {
                              setClientId(c.id);
                              setIsSelectingBorrower(false);
                              setBorrowerSearch("");
                            }}
                            style={{
                              padding: "8px 12px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              cursor: "pointer",
                              borderBottom: "1px solid var(--color-border)",
                              background: clientId === c.id ? "var(--color-accent-soft)" : "transparent",
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{c.current_name}</div>
                              <div style={{ fontSize: 11, color: "var(--color-text-muted)", display: "flex", gap: 8 }}>
                                {c.phone && <span>Tel: {c.phone}</span>}
                                {c.national_id && <span>ID: {c.national_id}</span>}
                              </div>
                            </div>
                            {clientId === c.id && <CheckCircle size={16} color="var(--color-accent)" />}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

          {/* Optional Linked Product */}
          {products.length > 0 && (
            <div className="form-group">
              <label className="form-label" style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Asset / Product Link</span>
                <span style={{ fontSize: 11, fontWeight: 400, color: "var(--color-text-muted)" }}>
                  Optional
                </span>
              </label>
              <select value={productId} onChange={(e) => handleProductSelect(e.target.value)}>
                <option value="">-- No specific catalog item --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.category}] {p.name} - {formatCurrency(p.price_amount, p.price_currency)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Principal & Currency */}
          <div className="form-row">
            <div className="form-group" style={{ flex: 1.8 }}>
              <label className="form-label">
                {t("loans.principal")} <span className="required">*</span>
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={principal}
                  onChange={(e) => setPrincipal(e.target.value)}
                  placeholder="e.g. 5000"
                  required
                  style={{ fontWeight: 600, fontSize: 15 }}
                />
              </div>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">{t("common.currency")}</label>
              <select
                value={currency}
                onChange={(e) => {
                  const newCurr = e.target.value as "USD" | "KHR";
                  if (newCurr !== currency) {
                    const currentNum = parseFloat(principal) || 0;
                    const rate = Number(usdToKhrRate) || 4100;
                    if (newCurr === "KHR" && currentNum > 0) {
                      setPrincipal(String(Math.round(currentNum * rate)));
                    } else if (newCurr === "USD" && currentNum > 0) {
                      setPrincipal(String(Math.max(10, Math.round(currentNum / rate))));
                    }
                    setCurrency(newCurr);
                  }
                }}
                style={{ fontWeight: 600 }}
              >
                <option value="USD">USD ($)</option>
                <option value="KHR">KHR (៛)</option>
              </select>
            </div>
          </div>

          {/* Interest Rate & Type */}
          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">
                {t("loans.interestRate")} <span className="required">*</span>
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  placeholder="1.5"
                  required
                />
              </div>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">{t("loans.interestType")}</label>
              <select
                value={interestType}
                onChange={(e) => setInterestType(e.target.value as "flat" | "reducing")}
              >
                <option value="flat">{t("loans.flat")} (Equal interest)</option>
                <option value="reducing">{t("loans.reducing")} (EMI on balance)</option>
              </select>
            </div>
          </div>

          {/* Term Months with quick chips */}
          <div className="form-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label className="form-label">
                {t("loans.termMonths")} <span className="required">*</span>
              </label>
              <span className="num" style={{ fontSize: 12, color: "var(--color-accent)", fontWeight: 600 }}>
                {nMonths} months ({Number((nMonths / 12).toFixed(1))} yrs)
              </span>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
              {TERM_PRESETS.map((mo) => (
                <button
                  type="button"
                  key={mo}
                  onClick={() => setTermMonths(String(mo))}
                  className={`btn btn-xs ${nMonths === mo ? "btn-primary" : "btn-ghost"}`}
                  style={{
                    borderRadius: "8px",
                    padding: "4px 12px",
                    fontWeight: 600,
                    border: nMonths === mo ? "none" : "1px solid var(--color-border)",
                  }}
                >
                  {mo}m
                </button>
              ))}
            </div>
            <input
              type="number"
              min="1"
              max="240"
              value={termMonths}
              onChange={(e) => setTermMonths(e.target.value)}
              required
            />
          </div>

          {/* Start Date */}
          <div className="form-group">
            <label className="form-label">{t("loans.startDate")}</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>

          {/* Collateral / Asset Security Section */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid var(--color-border)",
              borderRadius: "8px",
              padding: "14px 16px",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
                margin: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Shield size={16} color="var(--color-accent)" />
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text)" }}>
                  Collateral & Asset Security (ទ្រព្យបញ្ចាំ)
                </span>
              </div>
              <input
                type="checkbox"
                checked={hasCollateral}
                onChange={(e) => setHasCollateral(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: "var(--color-accent)", cursor: "pointer" }}
              />
            </label>

            {hasCollateral && (
              <div style={{ marginTop: 14, display: "grid", gap: 12, borderTop: "1px solid var(--color-border)", paddingTop: 12 }}>
                <div className="form-row">
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label" style={{ fontSize: 12 }}>Asset Category</label>
                    <select
                      value={collateralType}
                      onChange={(e) => setCollateralType(e.target.value)}
                      style={{ borderRadius: "8px", border: "1px solid var(--color-border)", background: "#ffffff" }}
                    >
                      <option value="land_hard_title">Real Estate (Hard Title / ប្លង់រឹង)</option>
                      <option value="land_soft_title">Real Estate (Soft Title / ប្លង់ទន់)</option>
                      <option value="vehicle_moto">Vehicle (Motorbike / ម៉ូតូ)</option>
                      <option value="vehicle_car">Vehicle (Car / Truck / ឡាន)</option>
                      <option value="equipment">Machinery & Equipment</option>
                      <option value="gold">Gold & Precious Assets</option>
                      <option value="other">Other Asset</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label" style={{ fontSize: 12 }}>Title / Document / Plate #</label>
                    <input
                      type="text"
                      placeholder="e.g. TL-8891-Kandal / Plate 1AA-9988"
                      value={collateralDocRef}
                      onChange={(e) => setCollateralDocRef(e.target.value)}
                      style={{ borderRadius: "8px", border: "1px solid var(--color-border)", background: "#ffffff" }}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label" style={{ fontSize: 12 }}>Estimated Value ({currency})</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 15000"
                      value={collateralValue}
                      onChange={(e) => setCollateralValue(e.target.value)}
                      style={{ borderRadius: "8px", border: "1px solid var(--color-border)", background: "#ffffff", fontWeight: 700 }}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1.5 }}>
                    <label className="form-label" style={{ fontSize: 12 }}>Description & Location</label>
                    <input
                      type="text"
                      placeholder="e.g. Land plot 100m2 in Khan Sen Sok, Phnom Penh"
                      value={collateralDesc}
                      onChange={(e) => setCollateralDesc(e.target.value)}
                      style={{ borderRadius: "8px", border: "1px solid var(--color-border)", background: "#ffffff" }}
                    />
                  </div>
                </div>

                {/* Live LTV Indicator */}
                {ltvRatio !== null && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      borderRadius: "6px",
                      background: ltvRatio <= 70 ? "rgba(16, 185, 129, 0.08)" : ltvRatio <= 100 ? "rgba(245, 158, 11, 0.08)" : "rgba(239, 68, 68, 0.08)",
                      border: `1px solid ${ltvRatio <= 70 ? "rgba(16, 185, 129, 0.3)" : ltvRatio <= 100 ? "rgba(245, 158, 11, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
                      fontSize: 12,
                    }}
                  >
                    <span style={{ fontWeight: 600, color: "var(--color-text)" }}>
                      Loan-to-Value (LTV) Ratio:
                    </span>
                    <span
                      className="num"
                      style={{
                        fontWeight: 800,
                        color: ltvRatio <= 70 ? "var(--color-success)" : ltvRatio <= 100 ? "var(--color-warning)" : "var(--color-danger)",
                      }}
                    >
                      {ltvRatio.toFixed(1)}% — {ltvRatio <= 70 ? "Well Secured (Low Risk)" : ltvRatio <= 100 ? "Acceptable Coverage" : "Under-collateralized"}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Guarantor / Co-Borrower Section */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid var(--color-border)",
              borderRadius: "8px",
              padding: "14px 16px",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
                margin: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <UserPlus size={16} color="var(--color-accent)" />
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text)" }}>
                  Guarantor / Co-Borrower (អ្នកធានា)
                </span>
              </div>
              <input
                type="checkbox"
                checked={hasGuarantor}
                onChange={(e) => setHasGuarantor(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: "var(--color-accent)", cursor: "pointer" }}
              />
            </label>

            {hasGuarantor && (
              <div style={{ marginTop: 14, display: "grid", gap: 12, borderTop: "1px solid var(--color-border)", paddingTop: 12 }}>
                <div className="form-row">
                  <div className="form-group" style={{ flex: 1.2 }}>
                    <label className="form-label" style={{ fontSize: 12 }}>Guarantor Full Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Sokha Vanna"
                      value={guarantorName}
                      onChange={(e) => setGuarantorName(e.target.value)}
                      style={{ borderRadius: "8px", border: "1px solid var(--color-border)", background: "#ffffff", fontWeight: 600 }}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label" style={{ fontSize: 12 }}>Phone Number</label>
                    <input
                      type="tel"
                      placeholder="e.g. 012 345 678"
                      value={guarantorPhone}
                      onChange={(e) => setGuarantorPhone(e.target.value)}
                      style={{ borderRadius: "8px", border: "1px solid var(--color-border)", background: "#ffffff" }}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label" style={{ fontSize: 12 }}>National ID / Passport</label>
                    <input
                      type="text"
                      placeholder="e.g. 010992384"
                      value={guarantorId}
                      onChange={(e) => setGuarantorId(e.target.value)}
                      style={{ borderRadius: "8px", border: "1px solid var(--color-border)", background: "#ffffff" }}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label" style={{ fontSize: 12 }}>Relationship</label>
                    <select
                      value={guarantorRelation}
                      onChange={(e) => setGuarantorRelation(e.target.value)}
                      style={{ borderRadius: "8px", border: "1px solid var(--color-border)", background: "#ffffff" }}
                    >
                      <option value="Spouse">Spouse (ប្តី/ប្រពន្ធ)</option>
                      <option value="Parent">Parent (ឪពុកម្តាយ)</option>
                      <option value="Sibling">Sibling (បងប្អូន)</option>
                      <option value="Business Partner">Business Partner (ដៃគូអាជីវកម្ម)</option>
                      <option value="Employer">Employer (និយោជក)</option>
                      <option value="Other">Other (ផ្សេងទៀត)</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label" style={{ fontSize: 12 }}>Monthly Income ({currency})</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 800"
                      value={guarantorIncome}
                      onChange={(e) => setGuarantorIncome(e.target.value)}
                      style={{ borderRadius: "8px", border: "1px solid var(--color-border)", background: "#ffffff" }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Advanced Accordion Toggle */}
          <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 10 }}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setShowAdvanced((v) => !v)}
              style={{ width: "100%", justifyContent: "space-between", color: "var(--color-text-secondary)" }}
            >
              <span style={{ fontSize: 12, fontWeight: 600 }}>Advanced Settings (Grace Period, Late Fees)</span>
              {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showAdvanced && (
              <div className="form-row" style={{ marginTop: 10, animation: "slideDown 0.15s ease-out" }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Grace Period (Days)</label>
                  <input
                    type="number"
                    min="0"
                    value={gracePeriodDays}
                    onChange={(e) => setGracePeriodDays(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Late Fee (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={lateFeePercent}
                    onChange={(e) => setLateFeePercent(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

            {/* Clean Financial Breakdown Ribbon */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 10,
                padding: "12px 14px",
                background: "var(--color-surface-sunken)",
                borderRadius: "8px",
                border: "1px solid var(--color-border)",
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{t("calculator.monthlyPayment")}</div>
                <div className="num" style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text)", marginTop: 2 }}>
                  {formatCurrency(calculations.monthlyPayment, currency)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{t("calculator.totalInterest")}</div>
                <div className="num" style={{ fontSize: 15, fontWeight: 700, color: "var(--color-warning)", marginTop: 2 }}>
                  +{formatCurrency(calculations.totalInterest, currency)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{t("calculator.totalRepayment")}</div>
                <div className="num" style={{ fontSize: 15, fontWeight: 700, color: "var(--color-accent)", marginTop: 2 }}>
                  {formatCurrency(calculations.totalRepayment, currency)}
                </div>
              </div>
            </div>

            {error && (
              <div
                style={{
                  color: "var(--color-danger)",
                  fontSize: 13,
                  padding: "10px 14px",
                  background: "var(--color-danger-soft)",
                  borderRadius: "8px",
                  border: "1px solid var(--color-danger)",
                }}
              >
                {error}
              </div>
            )}
          </form>
        </div>

        {/* Modal Footer Bar */}
        <div
          className="modal-footer-bar"
          style={{
            background: "var(--color-surface-sunken)",
            borderTop: "1px solid var(--color-border)",
            padding: "14px 24px 16px",
          }}
        >
          <button
            type="button"
            className="btn"
            onClick={onCancel}
            style={{ minWidth: 90, borderRadius: "8px" }}
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            form="loan-application-form"
            className="btn btn-primary"
            disabled={submitting}
            style={{ minWidth: 140, borderRadius: "8px" }}
          >
            {submitting ? "Processing..." : t("loans.newLoan")}
          </button>
        </div>
      </div>
    </div>
  );
}
