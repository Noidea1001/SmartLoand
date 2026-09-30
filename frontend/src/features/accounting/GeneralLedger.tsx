import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  Receipt,
  Scale,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  X,
  Trash2,
  DollarSign,
  FileSpreadsheet,
  Building,
  TrendingUp,
} from "lucide-react";
import {
  getChartOfAccounts,
  getJournalEntries,
  getTrialBalance,
  postJournalEntry,
  type AccountItem,
  type JournalVoucher,
  type JournalVoucherLine,
  type TrialBalanceResponse,
} from "../../api/reports";
import { formatCurrency, convertCurrencyAmount } from "../../utils/format";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useToast } from "../../context/ToastContext";
import { useBranding } from "../../context/BrandingContext";

export default function GeneralLedger() {
  const { i18n } = useTranslation();
  const isKm = i18n.language === "km";
  useDocumentTitle(isKm ? "ប្រព័ន្ធគណនេយ្យទូទៅ & ចុះបញ្ជីទ្វេភាគ" : "General Ledger & Double-Entry Accounting");
  const toast = useToast();
  const { baseCurrency, usdToKhrRate } = useBranding();

  const [activeTab, setActiveTab] = useState<"coa" | "vouchers" | "trial_balance">("coa");
  const [loading, setLoading] = useState(true);

  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [vouchers, setVouchers] = useState<JournalVoucher[]>([]);
  const [trialBalance, setTrialBalance] = useState<TrialBalanceResponse | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // New Voucher Modal
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [voucherDescKm, setVoucherDescKm] = useState("");
  const [voucherDescEn, setVoucherDescEn] = useState("");
  const [voucherBranch, setVoucherBranch] = useState("Head Office (ភ្នំពេញ)");
  const [voucherCurrency, setVoucherCurrency] = useState<"USD" | "KHR">((baseCurrency as "USD" | "KHR") || "USD");
  const [voucherLines, setVoucherLines] = useState<JournalVoucherLine[]>([
    { account_code: "1110", account_name: "Cash on Hand & Vault", debit: 100, credit: 0 },
    { account_code: "4110", account_name: "Interest Income from Loans", debit: 0, credit: 100 },
  ]);
  const [savingVoucher, setSavingVoucher] = useState(false);

  // Selected voucher detail
  const [selectedVoucher, setSelectedVoucher] = useState<JournalVoucher | null>(null);

  function loadAllData() {
    setLoading(true);
    Promise.all([getChartOfAccounts(), getJournalEntries(), getTrialBalance()])
      .then(([coaRes, jvRes, tbRes]) => {
        setAccounts(coaRes.chart_of_accounts || []);
        setVouchers(jvRes.journal_entries || []);
        setTrialBalance(tbRes);
      })
      .catch((err) => {
        console.error("Failed to load accounting data:", err);
        toast.error(isKm ? "បរាជ័យក្នុងការទាញយកទិន្នន័យគណនេយ្យ" : "Failed to load accounting records.");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadAllData();
  }, []);

  // Voucher dynamic calculations
  const totalDebit = useMemo(() => {
    return voucherLines.reduce((acc, l) => acc + (parseFloat(l.debit as any) || 0), 0);
  }, [voucherLines]);

  const totalCredit = useMemo(() => {
    return voucherLines.reduce((acc, l) => acc + (parseFloat(l.credit as any) || 0), 0);
  }, [voucherLines]);

  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  function addVoucherLine() {
    setVoucherLines([
      ...voucherLines,
      { account_code: "1110", account_name: "Cash on Hand & Vault", debit: 0, credit: 0 },
    ]);
  }

  function removeVoucherLine(index: number) {
    if (voucherLines.length <= 2) {
      toast.warning(isKm ? "ប័ណ្ណទូទាត់ទាមទារយ៉ាងតិច ២ ជួរ (Debit និង Credit)" : "A voucher requires at least 2 lines.");
      return;
    }
    setVoucherLines(voucherLines.filter((_, i) => i !== index));
  }

  function updateVoucherLine(index: number, field: keyof JournalVoucherLine, val: any) {
    const updated = [...voucherLines];
    if (field === "account_code") {
      const acc = accounts.find((a) => a.code === val);
      updated[index].account_code = val;
      updated[index].account_name = acc ? acc.name_en : "Account";
    } else {
      (updated[index] as any)[field] = val;
    }
    setVoucherLines(updated);
  }

  async function handleSaveVoucher(e: React.FormEvent) {
    e.preventDefault();
    if (!isBalanced) {
      toast.error(isKm ? "ប័ណ្ណមិនមានតុល្យភាព! សូមពិនិត្យ Debit និង Credit" : "Voucher is out of balance!");
      return;
    }
    setSavingVoucher(true);
    try {
      await postJournalEntry({
        description_km: voucherDescKm || "ប័ណ្ណចុះបញ្ជីទូទៅ",
        description_en: voucherDescEn || "General Journal Voucher",
        branch: voucherBranch,
        currency: voucherCurrency,
        lines: voucherLines,
      });
      toast.success(isKm ? "បានចុះបញ្ជីប័ណ្ណទូទាត់ទ្វេភាគជោគជ័យ!" : "Journal entry recorded successfully!");
      setShowVoucherModal(false);
      loadAllData();
    } catch {
      toast.error(isKm ? "បរាជ័យក្នុងការចុះបញ្ជី" : "Failed to post journal entry.");
    } finally {
      setSavingVoucher(false);
    }
  }

  // Filtered COA
  const filteredAccounts = useMemo(() => {
    return accounts.filter((a) => {
      const matchSearch =
        a.code.includes(search) ||
        a.name_km.toLowerCase().includes(search.toLowerCase()) ||
        a.name_en.toLowerCase().includes(search.toLowerCase());
      const matchCat = categoryFilter === "all" || a.category === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [accounts, search, categoryFilter]);

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: "var(--color-text)" }}>
            {isKm ? "ប្រព័ន្ធគណនេយ្យទូទៅ & ចុះបញ្ជីទ្វេភាគ (GL)" : "General Ledger & Double-Entry Accounting"}
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--color-text-muted)" }}>
            {isKm
              ? "គ្រប់គ្រងតារាងគណនី (COA) ប័ណ្ណចុះបញ្ជីទ្វេភាគ និងតាមដានតារាងតុល្យការសាកល្បងតាមស្តង់ដារធនាគារជាតិ NBC"
              : "Standard Chart of Accounts (COA), balanced double-entry vouchers, and real-time trial balance."}
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            className="btn"
            onClick={loadAllData}
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
              setVoucherCurrency((baseCurrency as "USD" | "KHR") || "USD");
              setShowVoucherModal(true);
            }}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Plus size={16} />
            <span>{isKm ? "បង្កើតប័ណ្ណទូទាត់ទ្វេភាគ (JV)" : "New Journal Voucher"}</span>
          </button>
        </div>
      </div>

      {/* Trial Balance Status Bar */}
      {trialBalance && (
        <div
          className="card"
          style={{
            padding: "16px 20px",
            marginBottom: 20,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
            background: "var(--color-surface-sunken)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: trialBalance.usd.is_balanced ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                color: trialBalance.usd.is_balanced ? "#10b981" : "#ef4444",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Scale size={20} />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-text)" }}>
                {isKm ? "តុល្យភាពតារាងគណនេយ្យទូទៅ (Trial Balance Status)" : "Trial Balance Equilibrium Status"}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--color-text-muted)" }}>
                {isKm ? `គិតត្រឹមកាលបរិច្ឆេទ៖ ${trialBalance.as_of_date}` : `As of: ${trialBalance.as_of_date}`}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
            {baseCurrency === "KHR" ? (
              <div>
                <span style={{ fontSize: 11, color: "var(--color-text-muted)", display: "block" }}>KHR Equilibrium</span>
                <strong style={{ fontSize: 14 }}>
                  Debit: {formatCurrency(trialBalance.khr.total_debit, "KHR")} = Credit: {formatCurrency(trialBalance.khr.total_credit, "KHR")}
                </strong>
              </div>
            ) : (
              <div>
                <span style={{ fontSize: 11, color: "var(--color-text-muted)", display: "block" }}>USD Equilibrium</span>
                <strong style={{ fontSize: 14 }}>
                  Debit: {formatCurrency(trialBalance.usd.total_debit, "USD")} = Credit: {formatCurrency(trialBalance.usd.total_credit, "USD")}
                </strong>
              </div>
            )}

            <span
              style={{
                padding: "4px 12px",
                borderRadius: 20,
                fontSize: 11.5,
                fontWeight: 800,
                background: "rgba(16, 185, 129, 0.15)",
                color: "#10b981",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <CheckCircle2 size={13} />
              <span>{isKm ? "មានតុល្យភាព ១០០%" : "PERFECTLY BALANCED"}</span>
            </span>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div style={{ display: "flex", gap: 8, borderBottom: "1px solid var(--color-border)", marginBottom: 16 }}>
        {[
          { id: "coa", labelKm: "តារាងគណនី (Chart of Accounts)", labelEn: "Chart of Accounts" },
          { id: "vouchers", labelKm: "ប័ណ្ណចុះបញ្ជីទ្វេភាគ (Journal Vouchers)", labelEn: "Journal Vouchers" },
          { id: "trial_balance", labelKm: "តារាងតុល្យការសាកល្បង (Trial Balance)", labelEn: "Trial Balance" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            className="btn btn-ghost"
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              borderRadius: "8px 8px 0 0",
              fontWeight: activeTab === tab.id ? 700 : 500,
              borderBottom: activeTab === tab.id ? "3px solid var(--color-accent)" : "3px solid transparent",
              color: activeTab === tab.id ? "var(--color-accent)" : "var(--color-text-muted)",
              padding: "10px 16px",
            }}
          >
            {isKm ? tab.labelKm : tab.labelEn}
          </button>
        ))}
      </div>

      {/* Tab 1: Chart of Accounts */}
      {activeTab === "coa" && (
        <>
          <div className="card" style={{ padding: 14, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                { id: "all", labelKm: "គ្រប់ប្រភេទ", labelEn: "All Classes" },
                { id: "asset", labelKm: "ទ្រព្យសកម្ម (Assets)", labelEn: "Assets (1000)" },
                { id: "liability", labelKm: "បំណុល (Liabilities)", labelEn: "Liabilities (2000)" },
                { id: "equity", labelKm: "មូលធន (Equity)", labelEn: "Equity (3000)" },
                { id: "revenue", labelKm: "ចំណូល (Revenue)", labelEn: "Revenue (4000)" },
                { id: "expense", labelKm: "ចំណាយ (Expenses)", labelEn: "Expenses (5000)" },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`btn btn-sm ${categoryFilter === c.id ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setCategoryFilter(c.id)}
                  style={{ borderRadius: 6, fontSize: 12 }}
                >
                  {isKm ? c.labelKm : c.labelEn}
                </button>
              ))}
            </div>

            <div style={{ position: "relative", minWidth: 240 }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: 10, color: "var(--color-text-muted)" }} />
              <input
                type="text"
                className="input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isKm ? "ស្វែងរកលេខកូដ, ឈ្មោះគណនី..." : "Search code or account name..."}
                style={{ paddingLeft: 30, fontSize: 12.5, width: "100%", borderRadius: 6 }}
              />
            </div>
          </div>

          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--color-surface-sunken)", borderBottom: "1px solid var(--color-border)" }}>
                  <th style={{ padding: "12px 16px", textAlign: "left" }}>{isKm ? "លេខកូដគណនី" : "Code"}</th>
                  <th style={{ padding: "12px 16px", textAlign: "left" }}>{isKm ? "ឈ្មោះគណនី (ខ្មែរ / English)" : "Account Title"}</th>
                  <th style={{ padding: "12px 16px", textAlign: "center" }}>{isKm ? "ប្រភេទ" : "Category"}</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>{isKm ? "សមតុល្យឥណពន្ធ (Debit)" : "Debit Balance"}</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>{isKm ? "សមតុល្យឥណទាន (Credit)" : "Credit Balance"}</th>
                </tr>
              </thead>
              <tbody>
                {filteredAccounts.map((a) => (
                  <tr key={a.code} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td style={{ padding: "12px 16px", fontWeight: 700, fontFamily: "monospace", color: "var(--color-accent)" }}>
                      {a.code}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontWeight: 600 }}>{isKm ? a.name_km : a.name_en}</div>
                      <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{isKm ? a.name_en : a.name_km}</div>
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: 4,
                          background: "var(--color-surface-sunken)",
                          textTransform: "uppercase",
                        }}
                      >
                        {a.category}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700 }}>
                      {baseCurrency === "KHR"
                        ? formatCurrency(a.debit_khr + convertCurrencyAmount(a.debit_usd, "USD", "KHR", usdToKhrRate), "KHR")
                        : formatCurrency(a.debit_usd + convertCurrencyAmount(a.debit_khr, "KHR", "USD", usdToKhrRate), "USD")}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700 }}>
                      {baseCurrency === "KHR"
                        ? formatCurrency(a.credit_khr + convertCurrencyAmount(a.credit_usd, "USD", "KHR", usdToKhrRate), "KHR")
                        : formatCurrency(a.credit_usd + convertCurrencyAmount(a.credit_khr, "KHR", "USD", usdToKhrRate), "USD")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Tab 2: Journal Vouchers */}
      {activeTab === "vouchers" && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--color-surface-sunken)", borderBottom: "1px solid var(--color-border)" }}>
                <th style={{ padding: "12px 16px", textAlign: "left" }}>{isKm ? "លេខប័ណ្ណ / កាលបរិច្ឆេទ" : "Voucher No / Date"}</th>
                <th style={{ padding: "12px 16px", textAlign: "left" }}>{isKm ? "បរិយាយប្រតិបត្តិការ" : "Transaction Description"}</th>
                <th style={{ padding: "12px 16px", textAlign: "left" }}>{isKm ? "សាខាប្រតិបត្តិការ" : "Branch"}</th>
                <th style={{ padding: "12px 16px", textAlign: "right" }}>{isKm ? "ទំហំទឹកប្រាក់សរុប" : "Total Amount"}</th>
                <th style={{ padding: "12px 16px", textAlign: "center" }}>{isKm ? "ចំនួនជួរគណនី" : "Lines"}</th>
                <th style={{ padding: "12px 16px", textAlign: "center" }}>{isKm ? "សកម្មភាព" : "Action"}</th>
              </tr>
            </thead>
            <tbody>
              {vouchers.map((v) => (
                <tr key={v.voucher_no} style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ fontWeight: 700, fontFamily: "monospace", color: "var(--color-text)" }}>{v.voucher_no}</div>
                    <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{v.date}</div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ fontWeight: 600 }}>{isKm ? v.description_km : v.description_en}</div>
                  </td>
                  <td style={{ padding: "12px 16px", color: "var(--color-text-muted)" }}>{v.branch}</td>
                  <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 800 }}>
                    {formatCurrency(v.total_amount, v.currency)}
                    {v.currency !== baseCurrency && (
                      <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                        ≈ {formatCurrency(convertCurrencyAmount(v.total_amount, v.currency, baseCurrency, usdToKhrRate), baseCurrency)}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "center" }}>
                    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: "var(--color-surface-sunken)" }}>
                      {v.lines.length} {isKm ? "ជួរ" : "lines"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "center" }}>
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      onClick={() => setSelectedVoucher(v)}
                      style={{ borderRadius: 6, fontSize: 12 }}
                    >
                      {isKm ? "មើលប័ណ្ណ" : "View Lines"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Trial Balance */}
      {activeTab === "trial_balance" && trialBalance && (
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
              {isKm ? "តារាងតុល្យការសាកល្បង (Official Trial Balance Sheet)" : "General Ledger Trial Balance Sheet"}
            </h3>
            <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{trialBalance.as_of_date}</span>
          </div>

          <table className="table" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--color-surface-sunken)", borderBottom: "2px solid var(--color-border)" }}>
                <th style={{ padding: "10px 14px", textAlign: "left" }}>{isKm ? "លេខកូដ" : "Code"}</th>
                <th style={{ padding: "10px 14px", textAlign: "left" }}>{isKm ? "ឈ្មោះគណនី" : "Account Title"}</th>
                <th style={{ padding: "10px 14px", textAlign: "right" }}>{isKm ? "ឥណពន្ធ (Debit)" : "Debit"}</th>
                <th style={{ padding: "10px 14px", textAlign: "right" }}>{isKm ? "ឥណទាន (Credit)" : "Credit"}</th>
              </tr>
            </thead>
            <tbody>
              {trialBalance.accounts.map((a) => (
                <tr key={a.code} style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <td style={{ padding: "10px 14px", fontFamily: "monospace", fontWeight: 700 }}>{a.code}</td>
                  <td style={{ padding: "10px 14px" }}>{isKm ? a.name_km : a.name_en}</td>
                  <td style={{ padding: "10px 14px", textAlign: "right" }}>
                    {baseCurrency === "KHR"
                      ? (a.debit_khr > 0 || a.debit_usd > 0 ? formatCurrency(a.debit_khr + convertCurrencyAmount(a.debit_usd, "USD", "KHR", usdToKhrRate), "KHR") : "-")
                      : (a.debit_usd > 0 ? formatCurrency(a.debit_usd, "USD") : "-")}
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "right" }}>
                    {baseCurrency === "KHR"
                      ? (a.credit_khr > 0 || a.credit_usd > 0 ? formatCurrency(a.credit_khr + convertCurrencyAmount(a.credit_usd, "USD", "KHR", usdToKhrRate), "KHR") : "-")
                      : (a.credit_usd > 0 ? formatCurrency(a.credit_usd, "USD") : "-")}
                  </td>
                </tr>
              ))}
              {/* Total Footer Row */}
              <tr style={{ background: "var(--color-surface-sunken)", borderTop: "2px solid var(--color-border)", fontWeight: 800, fontSize: 14 }}>
                <td colSpan={2} style={{ padding: "12px 14px" }}>
                  {isKm ? "សរុបតុល្យភាពទូទៅ (Total General Balance)" : "Total Balanced Sum"}
                </td>
                <td style={{ padding: "12px 14px", textAlign: "right", color: "var(--color-success)" }}>
                  {baseCurrency === "KHR"
                    ? formatCurrency(trialBalance.khr.total_debit, "KHR")
                    : formatCurrency(trialBalance.usd.total_debit, "USD")}
                </td>
                <td style={{ padding: "12px 14px", textAlign: "right", color: "var(--color-success)" }}>
                  {baseCurrency === "KHR"
                    ? formatCurrency(trialBalance.khr.total_credit, "KHR")
                    : formatCurrency(trialBalance.usd.total_credit, "USD")}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* New Journal Voucher Modal */}
      {showVoucherModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowVoucherModal(false)}
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
            style={{ width: "100%", maxWidth: 700, maxHeight: "90vh", overflowY: "auto", padding: 24, borderRadius: 16 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
                  {isKm ? "បង្កើតប័ណ្ណចុះបញ្ជីទ្វេភាគ (New Journal Voucher)" : "Post Double-Entry Journal Voucher"}
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--color-text-muted)" }}>
                  {isKm ? "រាល់ប័ណ្ណត្រូវតែមានផលបូក Debit ស្មើ Credit យ៉ាងត្រឹមត្រូវ" : "Ensure total Debit equals total Credit before posting."}
                </p>
              </div>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setShowVoucherModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveVoucher}>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                      {isKm ? "បរិយាយប្រតិបត្តិការ (Khmer) *" : "Description (Khmer) *"}
                    </label>
                    <input
                      type="text"
                      required
                      value={voucherDescKm}
                      onChange={(e) => setVoucherDescKm(e.target.value)}
                      placeholder={isKm ? "ឧ. ការទូទាត់ចំណាយប្រតិបត្តិការ" : "e.g. Operating expenses"}
                      className="input"
                      style={{ width: "100%" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                      {isKm ? "រូបិយប័ណ្ណ" : "Currency"}
                    </label>
                    <select
                      value={voucherCurrency}
                      onChange={(e) => setVoucherCurrency(e.target.value as any)}
                      className="input"
                      style={{ width: "100%" }}
                    >
                      <option value="USD">USD ($)</option>
                      <option value="KHR">KHR (៛)</option>
                    </select>
                  </div>
                </div>

                {/* Line Items Table */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{isKm ? "ជួរគណនី Debit / Credit" : "Debit / Credit Lines"}</span>
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={addVoucherLine}
                      style={{ borderRadius: 6, fontSize: 11.5 }}
                    >
                      <Plus size={13} style={{ marginRight: 4 }} />
                      <span>{isKm ? "បន្ថែមជួរ" : "Add Line"}</span>
                    </button>
                  </div>

                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                    <thead>
                      <tr style={{ background: "var(--color-surface-sunken)" }}>
                        <th style={{ padding: "8px 10px", textAlign: "left" }}>{isKm ? "គណនី" : "Account"}</th>
                        <th style={{ padding: "8px 10px", textAlign: "right", width: 120 }}>Debit</th>
                        <th style={{ padding: "8px 10px", textAlign: "right", width: 120 }}>Credit</th>
                        <th style={{ padding: "8px 10px", width: 40 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {voucherLines.map((line, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid var(--color-border)" }}>
                          <td style={{ padding: "6px 8px" }}>
                            <select
                              value={line.account_code}
                              onChange={(e) => updateVoucherLine(idx, "account_code", e.target.value)}
                              className="input"
                              style={{ width: "100%", fontSize: 12 }}
                            >
                              {accounts.map((acc) => (
                                <option key={acc.code} value={acc.code}>
                                  {acc.code} - {isKm ? acc.name_km : acc.name_en}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td style={{ padding: "6px 8px" }}>
                            <input
                              type="number"
                              min={0}
                              step="any"
                              value={line.debit || ""}
                              onChange={(e) => updateVoucherLine(idx, "debit", parseFloat(e.target.value) || 0)}
                              className="input"
                              style={{ width: "100%", textAlign: "right", fontSize: 12 }}
                            />
                          </td>
                          <td style={{ padding: "6px 8px" }}>
                            <input
                              type="number"
                              min={0}
                              step="any"
                              value={line.credit || ""}
                              onChange={(e) => updateVoucherLine(idx, "credit", parseFloat(e.target.value) || 0)}
                              className="input"
                              style={{ width: "100%", textAlign: "right", fontSize: 12 }}
                            />
                          </td>
                          <td style={{ padding: "6px 8px", textAlign: "center" }}>
                            <button
                              type="button"
                              className="btn btn-sm btn-ghost"
                              onClick={() => removeVoucherLine(idx)}
                              style={{ padding: 4, color: "var(--color-danger)" }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: "var(--color-surface-sunken)", fontWeight: 700 }}>
                        <td style={{ padding: "8px 10px" }}>{isKm ? "សរុប (Total)" : "Total"}</td>
                        <td style={{ padding: "8px 10px", textAlign: "right", color: "var(--color-accent)" }}>
                          {formatCurrency(totalDebit, voucherCurrency)}
                        </td>
                        <td style={{ padding: "8px 10px", textAlign: "right", color: "var(--color-accent)" }}>
                          {formatCurrency(totalCredit, voucherCurrency)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>

                  {/* Balancing feedback */}
                  <div
                    style={{
                      marginTop: 10,
                      padding: "8px 12px",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      background: isBalanced ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
                      color: isBalanced ? "#10b981" : "#ef4444",
                    }}
                  >
                    {isBalanced ? (
                      <>
                        <CheckCircle2 size={15} />
                        <span>{isKm ? "ប័ណ្ណមានតុល្យភាពត្រឹមត្រូវ (Debit = Credit)" : "Voucher is balanced."}</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={15} />
                        <span>
                          {isKm ? `ប័ណ្ណពុំទាន់មានតុល្យភាព! គម្លាត៖ ` : `Voucher is out of balance by: `}
                          {formatCurrency(Math.abs(totalDebit - totalCredit), voucherCurrency)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
                <button type="button" className="btn" onClick={() => setShowVoucherModal(false)} disabled={savingVoucher}>
                  {isKm ? "បោះបង់" : "Cancel"}
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingVoucher || !isBalanced}>
                  {savingVoucher ? (isKm ? "កំពុងកត់ត្រា..." : "Posting...") : (isKm ? "ចុះបញ្ជីប័ណ្ណទូទាត់" : "Post Voucher")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Voucher Modal */}
      {selectedVoucher && (
        <div
          className="modal-backdrop"
          onClick={() => setSelectedVoucher(null)}
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
            style={{ width: "100%", maxWidth: 540, padding: 24, borderRadius: 16 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--color-accent)", fontFamily: "monospace" }}>
                  {selectedVoucher.voucher_no}
                </span>
                <h3 style={{ margin: "2px 0 0", fontSize: 17, fontWeight: 700 }}>
                  {isKm ? selectedVoucher.description_km : selectedVoucher.description_en}
                </h3>
                <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                  {selectedVoucher.date} • {selectedVoucher.branch}
                </div>
              </div>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setSelectedVoucher(null)}>
                <X size={18} />
              </button>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, marginBottom: 16 }}>
              <thead>
                <tr style={{ background: "var(--color-surface-sunken)" }}>
                  <th style={{ padding: "8px 10px", textAlign: "left" }}>Account</th>
                  <th style={{ padding: "8px 10px", textAlign: "right" }}>Debit</th>
                  <th style={{ padding: "8px 10px", textAlign: "right" }}>Credit</th>
                </tr>
              </thead>
              <tbody>
                {selectedVoucher.lines.map((l, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td style={{ padding: "8px 10px" }}>
                      <span style={{ fontWeight: 700, fontFamily: "monospace", marginRight: 6 }}>{l.account_code}</span>
                      <span>{l.account_name}</span>
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: l.debit > 0 ? 700 : 400 }}>
                      {l.debit > 0 ? formatCurrency(l.debit, selectedVoucher.currency) : "-"}
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: l.credit > 0 ? 700 : 400 }}>
                      {l.credit > 0 ? formatCurrency(l.credit, selectedVoucher.currency) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedVoucher(null)}>
                {isKm ? "បិទផ្ទាំង" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
