import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  Shield,
  Layers,
  DollarSign,
  Building,
  Key,
  Award,
  Download,
  Printer,
  CheckCircle2,
  ExternalLink,
  Edit2,
  Lock,
  RefreshCw,
  Search,
  FileText,
  X,
} from "lucide-react";
import {
  getCollateralVaultReport,
  updateCollateralCustody,
  type CollateralVaultResponse,
  type CollateralItem,
} from "../../api/reports";
import { formatCurrency, convertCurrencyAmount } from "../../utils/format";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useToast } from "../../context/ToastContext";
import { useBranding } from "../../context/BrandingContext";

export default function CollateralVault() {
  useDocumentTitle("Collateral Asset Vault");
  const { t, i18n } = useTranslation();
  const isKm = i18n.language === "km";
  const toast = useToast();
  const { companyName, baseCurrency, usdToKhrRate } = useBranding();

  const [data, setData] = useState<CollateralVaultResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Edit Custody Location Modal State
  const [selectedItem, setSelectedItem] = useState<CollateralItem | null>(null);
  const [editLocation, setEditLocation] = useState("");
  const [editStatus, setEditStatus] = useState("in_vault");
  const [savingCustody, setSavingCustody] = useState(false);

  // Release Certificate Modal State
  const [certItem, setCertItem] = useState<CollateralItem | null>(null);

  function loadVault() {
    setLoading(true);
    getCollateralVaultReport()
      .then(setData)
      .catch((err) => {
        console.error("Failed to load collateral vault:", err);
        toast.error(isKm ? "បរាជ័យក្នុងការទាញយកទិន្នន័យឃ្លាំងទ្រព្យបញ្ចាំ" : "Failed to load collateral vault.");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadVault();
  }, []);

  // Filtered collateral items
  const filteredItems = useMemo(() => {
    if (!data) return [];
    return data.collaterals.filter((item) => {
      const q = search.toLowerCase();
      const matchSearch =
        item.client_name.toLowerCase().includes(q) ||
        item.title_deed_no.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.loan_id.toLowerCase().includes(q);

      const matchType = typeFilter === "all" || item.asset_type === typeFilter;
      const matchStatus = statusFilter === "all" || item.custody_status === statusFilter;

      return matchSearch && matchType && matchStatus;
    });
  }, [data, search, typeFilter, statusFilter]);

  async function handleSaveCustody(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedItem) return;
    setSavingCustody(true);
    try {
      await updateCollateralCustody(selectedItem.loan_id, {
        custody_location: editLocation,
        custody_status: editStatus,
      });
      toast.success(isKm ? "បានធ្វើបច្ចុប្បន្នភាពទីតាំងរក្សាទុកជោគជ័យ។" : "Custody details updated successfully.");
      setSelectedItem(null);
      loadVault();
    } catch {
      toast.error(isKm ? "បរាជ័យក្នុងការធ្វើបច្ចុប្បន្នភាពទីតាំង" : "Failed to update custody details.");
    } finally {
      setSavingCustody(false);
    }
  }

  function openEditModal(item: CollateralItem) {
    setSelectedItem(item);
    setEditLocation(item.custody_location || "Main Vault (ប្រអប់សុវត្ថិភាពចម្បង)");
    setEditStatus(item.custody_status || "in_vault");
  }

  function getAssetTypeBadge(type: string) {
    switch (type) {
      case "land_hard_title":
        return { label: isKm ? "ប័ណ្ណកម្មសិទ្ធិ (ប្លង់រឹង)" : "Land Hard Title", color: "#10b981", bg: "rgba(16, 185, 129, 0.12)" };
      case "land_soft_title":
        return { label: isKm ? "លិខិតផ្ទេរសិទ្ធិ (ប្លង់ទន់)" : "Land Soft Title", color: "#0ea5e9", bg: "rgba(14, 165, 233, 0.12)" };
      case "vehicle":
        return { label: isKm ? "យានយន្ត / កាតគ្រី" : "Vehicle Card", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.12)" };
      case "equipment":
        return { label: isKm ? "សម្ភារៈ / គ្រឿងចក្រ" : "Machinery / Equipment", color: "#6366f1", bg: "rgba(99, 102, 241, 0.12)" };
      case "gold":
        return { label: isKm ? "មាស / គ្រឿងអលង្ការ" : "Gold / Jewelry", color: "#eab308", bg: "rgba(234, 179, 8, 0.12)" };
      default:
        return { label: isKm ? "ទ្រព្យធានាផ្សេងៗ" : "Other Security", color: "#64748b", bg: "rgba(100, 116, 139, 0.12)" };
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1>{isKm ? "ឃ្លាំងគ្រប់គ្រងទ្រព្យបញ្ចាំ & វត្ថុធានា" : "Collateral Management & Asset Vault"}</h1>
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                padding: "3px 8px",
                borderRadius: 4,
                background: "rgba(99, 102, 241, 0.12)",
                color: "var(--color-accent)",
                border: "1px solid rgba(99, 102, 241, 0.3)",
              }}
            >
              SECURED REGISTRY
            </span>
          </div>
          <div className="page-subtitle">
            {isKm
              ? "តាមដានប័ណ្ណកម្មសិទ្ធិដីធ្លី (ប្លង់រឹង/ប្លង់ទន់) កាតគ្រីយានយន្ត ទីតាំងតម្កល់ក្នុងទូដែក និងការចេញលិខិតដោះលែង"
              : "Pledged title deed catalog, valuation registry, physical vault custody tracking, and release deeds"}
          </div>
        </div>

        <div className="page-actions no-print">
          <button type="button" className="btn btn-ghost" onClick={loadVault} title={isKm ? "ផ្ទុកឡើងវិញ" : "Refresh"}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>{isKm ? "ផ្ទុកឡើងវិញ" : "Refresh"}</span>
          </button>
          <button type="button" className="btn btn-primary" onClick={() => window.print()}>
            <Printer size={14} />
            <span>{isKm ? "បោះពុម្ពបញ្ជី" : "Print Registry"}</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
        }}
      >
        {/* Total Market Value */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                {isKm ? "តម្លៃទីផ្សារទ្រព្យបញ្ចាំសរុប" : "Total Market Valuation"}
              </div>
              <div className="num" style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text)", marginTop: 4 }}>
                {baseCurrency === "KHR"
                  ? formatCurrency(data?.summary.total_market_value_khr || 0, "KHR")
                  : formatCurrency(data?.summary.total_market_value_usd || 0, "USD")}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginTop: 2 }}>
                ≈ {baseCurrency === "KHR"
                  ? formatCurrency(data?.summary.total_market_value_usd || 0, "USD")
                  : formatCurrency(data?.summary.total_market_value_khr || 0, "KHR")}
              </div>
            </div>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "var(--radius-md)",
                background: "rgba(16, 185, 129, 0.12)",
                color: "#10b981",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <DollarSign size={20} />
            </div>
          </div>
        </div>

        {/* Forced Sale Value */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                {isKm ? "តម្លៃលក់បង្ខំ" : "Liquidation Value (Forced)"}
              </div>
              <div className="num" style={{ fontSize: 22, fontWeight: 800, color: "var(--color-warning, #f59e0b)", marginTop: 4 }}>
                {baseCurrency === "KHR"
                  ? formatCurrency(
                      Math.round((data?.summary.total_forced_sale_usd || 0) * (usdToKhrRate || 4100)),
                      "KHR"
                    )
                  : formatCurrency(data?.summary.total_forced_sale_usd || 0, "USD")}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginTop: 2 }}>
                {baseCurrency === "KHR"
                  ? `≈ ${formatCurrency(data?.summary.total_forced_sale_usd || 0, "USD")}`
                  : (isKm ? "ស្តង់ដារកាត់បន្ថយ ៧៥% នៃតម្លៃទីផ្សារ" : "75% liquidation benchmark")}
              </div>
            </div>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "var(--radius-md)",
                background: "rgba(245, 158, 11, 0.12)",
                color: "#f59e0b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Shield size={20} />
            </div>
          </div>
        </div>

        {/* Items in Vault */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                {isKm ? "ឯកសារក្នុងទូដែក" : "Physical Deeds In Vault"}
              </div>
              <div className="num" style={{ fontSize: 22, fontWeight: 800, color: "var(--color-accent)", marginTop: 4 }}>
                {data?.summary.total_in_vault || 0}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginTop: 2 }}>
                {isKm ? "រក្សាទុកក្រោមការគ្រប់គ្រងសុវត្ថិភាព" : "Secured in bank-grade safe"}
              </div>
            </div>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "var(--radius-md)",
                background: "rgba(99, 102, 241, 0.12)",
                color: "var(--color-accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Lock size={20} />
            </div>
          </div>
        </div>

        {/* Released Collateral */}
        <div className="card" style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", fontWeight: 700, textTransform: "uppercase" }}>
                {isKm ? "ទ្រព្យបានដោះលែង" : "Released to Borrowers"}
              </div>
              <div className="num" style={{ fontSize: 22, fontWeight: 800, color: "#10b981", marginTop: 4 }}>
                {data?.summary.total_released || 0}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginTop: 2 }}>
                {isKm ? "បានប្រគល់ជូនក្រោយបង់ដាច់" : "Fully discharged loans"}
              </div>
            </div>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "var(--radius-md)",
                background: "rgba(16, 185, 129, 0.12)",
                color: "#10b981",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Award size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="card no-print"
        style={{
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 260 }}>
          <Search size={16} color="var(--color-text-muted)" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isKm ? "ស្វែងរកតាមឈ្មោះអ្នកខ្ចី, លេខប័ណ្ណប្លង់, ឬលេខកម្ចី..." : "Search by borrower, deed number, description..."}
            style={{ width: "100%", border: "none", background: "transparent", outline: "none", fontSize: 13 }}
          />
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {/* Asset Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ width: "auto", fontSize: 12.5, padding: "6px 12px", fontWeight: 600 }}
          >
            <option value="all">{isKm ? "គ្រប់ប្រភេទទ្រព្យ" : "All Asset Types"}</option>
            <option value="land_hard_title">{isKm ? "ប្លង់រឹង" : "Land Hard Title"}</option>
            <option value="land_soft_title">{isKm ? "ប្លង់ទន់" : "Land Soft Title"}</option>
            <option value="vehicle">{isKm ? "យានយន្ត" : "Vehicle Card"}</option>
            <option value="equipment">{isKm ? "គ្រឿងចក្រ" : "Machinery"}</option>
            <option value="gold">{isKm ? "មាស" : "Gold"}</option>
          </select>

          {/* Custody Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: "auto", fontSize: 12.5, padding: "6px 12px", fontWeight: 600 }}
          >
            <option value="all">{isKm ? "គ្រប់ស្ថានភាព" : "All Statuses"}</option>
            <option value="in_vault">{isKm ? "ក្នុងទូដែក" : "In Vault"}</option>
            <option value="released">{isKm ? "បានដោះលែង" : "Released"}</option>
          </select>
        </div>
      </div>

      {/* Main Collateral Table */}
      <div className="card" style={{ padding: 22 }}>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>{isKm ? "កម្ចី / អ្នកខ្ចី" : "Loan & Borrower"}</th>
                <th>{isKm ? "ប្រភេទទ្រព្យធានា" : "Asset Type"}</th>
                <th>{isKm ? "លេខប័ណ្ណ / លម្អិត" : "Title Deed / ID"}</th>
                <th style={{ textAlign: "right" }}>{isKm ? "តម្លៃទីផ្សារ" : "Market Value"}</th>
                <th style={{ textAlign: "right" }}>{isKm ? "តម្លៃលក់បង្ខំ" : "Forced Value"}</th>
                <th>{isKm ? "ទីតាំងរក្សាទុក" : "Custody Location"}</th>
                <th style={{ textAlign: "center" }}>{isKm ? "ស្ថានភាព" : "Status"}</th>
                <th className="no-print" style={{ textAlign: "center" }}>{isKm ? "សកម្មភាព" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: 36, color: "var(--color-text-muted)" }}>
                    {isKm ? "មិនមានទិន្នន័យទ្រព្យបញ្ចាំស្របតាមការស្វែងរកទេ" : "No collateral records matched your criteria."}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const badge = getAssetTypeBadge(item.asset_type);
                  const isReleased = item.custody_status === "released";

                  return (
                    <tr key={item.loan_id}>
                      <td>
                        <Link
                          to={`/loans/${item.loan_id}`}
                          style={{ color: "var(--color-accent)", fontWeight: 700, fontSize: 13, textDecoration: "none" }}
                        >
                          #{item.loan_id.slice(0, 8).toUpperCase()}
                        </Link>
                        <div style={{ fontWeight: 700, fontSize: 13.5, marginTop: 2 }}>{item.client_name}</div>
                        {item.client_phone && (
                          <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{item.client_phone}</div>
                        )}
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: 11.5,
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: 4,
                            background: badge.bg,
                            color: badge.color,
                            display: "inline-block",
                          }}
                        >
                          {badge.label}
                        </span>
                        <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 3 }}>
                          {item.description}
                        </div>
                      </td>
                      <td>
                        <div className="num" style={{ fontWeight: 800, fontSize: 13 }}>
                          {item.title_deed_no}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                          {item.location_details}
                        </div>
                      </td>
                      <td style={{ textAlign: "right" }} className="num">
                        <strong style={{ fontSize: 13.5 }}>
                          {formatCurrency(item.estimated_value, item.valuation_currency)}
                        </strong>
                        {item.valuation_currency !== baseCurrency && (
                          <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                            ≈ {formatCurrency(convertCurrencyAmount(item.estimated_value, item.valuation_currency, baseCurrency, usdToKhrRate), baseCurrency)}
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }} className="num">
                        <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                          {formatCurrency(item.forced_sale_value, item.valuation_currency)}
                        </span>
                        {item.valuation_currency !== baseCurrency && (
                          <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                            ≈ {formatCurrency(convertCurrencyAmount(item.forced_sale_value, item.valuation_currency, baseCurrency, usdToKhrRate), baseCurrency)}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600 }}>
                          <Lock size={13} color="var(--color-accent)" />
                          <span>{item.custody_location}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            padding: "3px 8px",
                            borderRadius: 4,
                            background: isReleased ? "rgba(16, 185, 129, 0.12)" : "rgba(99, 102, 241, 0.12)",
                            color: isReleased ? "#10b981" : "var(--color-accent)",
                          }}
                        >
                          {isReleased
                            ? isKm ? "បានដោះលែង" : "RELEASED"
                            : isKm ? "ក្នុងទូដែក" : "IN VAULT"}
                        </span>
                      </td>
                      <td className="no-print" style={{ textAlign: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            className="btn btn-ghost btn-xs"
                            style={{ borderRadius: 6 }}
                            title={isKm ? "កែសម្រួលទីតាំងទូដែក" : "Update Vault Location"}
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setCertItem(item)}
                            className="btn btn-ghost btn-xs"
                            style={{ borderRadius: 6, color: "#10b981" }}
                            title={isKm ? "លិខិតដោះលែងទ្រព្យ" : "Release Certificate"}
                          >
                            <Award size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Edit Physical Custody Location */}
      {selectedItem && (
        <div 
          className="modal-backdrop" 
          onClick={() => setSelectedItem(null)}
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          <div 
            className="modal-box" 
            onClick={(e) => e.stopPropagation()} 
            style={{ backgroundColor: "var(--color-bg-elevated)", borderRadius: 12, width: "100%", maxWidth: 480, overflow: "hidden", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}
          >
            <div className="modal-header" style={{ padding: "20px 24px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "var(--color-bg-canvas)" }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 10, color: "var(--color-text)" }}>
                <Lock size={20} color="var(--color-accent)" />
                <span>{isKm ? "កែសម្រួលទីតាំងតម្កល់ទ្រព្យ" : "Update Custody"}</span>
              </h3>
              <button type="button" className="btn-icon" onClick={() => setSelectedItem(null)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-muted)" }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveCustody} style={{ padding: "24px" }}>
              <div style={{ padding: "16px", backgroundColor: "var(--color-bg-canvas)", borderRadius: 8, marginBottom: 20, border: "1px solid var(--color-border)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, padding: "2px 8px", backgroundColor: "var(--color-accent-soft)", color: "var(--color-accent)", borderRadius: 12, textTransform: "uppercase" }}>
                    {selectedItem.asset_type === "real_estate" ? (isKm ? "អចលនទ្រព្យ" : "Real Estate") : selectedItem.asset_type === "vehicle" ? (isKm ? "យានយន្ត" : "Vehicle") : (isKm ? "ផ្សេងៗ" : "Other")}
                  </span>
                  <Link to={`/loans/${selectedItem.loan_id}`} style={{ fontSize: 12, color: "var(--color-accent)", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
                    {isKm ? "មើលកម្ចី" : "View Loan"} <ExternalLink size={12} />
                  </Link>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: "var(--color-text)" }}>{selectedItem.client_name}</div>
                <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                  <span style={{ fontWeight: 600, color: "var(--color-text)" }}>{selectedItem.title_deed_no}</span> • {selectedItem.description}
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: 13, color: "var(--color-text)" }}>
                  {isKm ? "ទីតាំងប្រអប់សុវត្ថិភាព / ទូដែក" : "Vault Box / Safety Location"}
                </label>
                <input
                  type="text"
                  required
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  placeholder={isKm ? "ឧទាហរណ៍៖ ទូដែកកណ្តាល ប្រអប់ A-12..." : "e.g. Main Vault Box A-12, Branch Safe 01..."}
                  style={{ width: "100%", padding: "10px 12px", fontSize: 14, borderRadius: 6, border: "1px solid var(--color-border)", backgroundColor: "var(--color-bg-surface)", color: "var(--color-text)" }}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: 13, color: "var(--color-text)" }}>
                  {isKm ? "ស្ថានភាពតម្កល់" : "Custody Status"}
                </label>
                <div style={{ position: "relative" }}>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", paddingLeft: 32, fontSize: 14, fontWeight: 500, borderRadius: 6, border: "1px solid var(--color-border)", backgroundColor: "var(--color-bg-surface)", color: "var(--color-text)", appearance: "none" }}
                  >
                    <option value="in_vault">{isKm ? "តម្កល់ក្នុងទូដែក" : "Pledged in Vault"}</option>
                    <option value="released">{isKm ? "បានដោះលែងជូនអតិថិជន" : "Discharged & Released"}</option>
                  </select>
                  <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 12, height: 12, borderRadius: "50%", backgroundColor: editStatus === "in_vault" ? "#10b981" : "var(--color-accent)" }}></div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, paddingTop: 16, borderTop: "1px solid var(--color-border)" }}>
                <button type="button" onClick={() => setSelectedItem(null)} style={{ padding: "8px 16px", borderRadius: 6, fontSize: 14, fontWeight: 600, backgroundColor: "transparent", border: "1px solid var(--color-border)", color: "var(--color-text)", cursor: "pointer" }}>
                  {isKm ? "បោះបង់" : "Cancel"}
                </button>
                <button type="submit" disabled={savingCustody} style={{ padding: "8px 16px", borderRadius: 6, fontSize: 14, fontWeight: 600, backgroundColor: "var(--color-accent)", color: "#fff", border: "none", cursor: savingCustody ? "not-allowed" : "pointer", opacity: savingCustody ? 0.7 : 1 }}>
                  {savingCustody ? (isKm ? "កំពុងរក្សាទុក..." : "Saving...") : (isKm ? "រក្សាទុកការកែប្រែ" : "Save Custody")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Official Collateral Release Certificate Deed */}
      {certItem && (
        <div className="modal-backdrop" onClick={() => setCertItem(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 650, background: "#ffffff" }}>
            <div className="no-print" style={{ display: "flex", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid #e2e8f0" }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>
                {isKm ? "លិខិតដោះលែង និងប្រគល់ទ្រព្យបញ្ចាំ" : "Collateral Discharge & Release Certificate"}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" className="btn btn-primary btn-xs" onClick={() => window.print()}>
                  <Printer size={13} /> {isKm ? "បោះពុម្ពលិខិត" : "Print Certificate"}
                </button>
                <button type="button" className="btn-icon btn-xs" onClick={() => setCertItem(null)}>
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Printable Deed Content */}
            <div style={{ padding: "32px 36px", color: "#0f172a", fontFamily: "var(--font-sans)" }}>
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.1em" }}>
                  ព្រះរាជាណាចក្រកម្ពុជា
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.08em" }}>
                  ជាតិ សាសនា ព្រះមហាក្សត្រ
                </div>
                <div style={{ fontSize: 18, fontWeight: 900, marginTop: 18, textTransform: "uppercase" }}>
                  {isKm ? "លិខិតដោះលែង និងប្រគល់វត្ថុធានាឥណទាន" : "DEED OF COLLATERAL DISCHARGE & RELEASE"}
                </div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                  {isKm ? "លេខយោងកិច្ចសន្យា៖ " : "Loan Reference: "} #{certItem.loan_id.slice(0, 8).toUpperCase()}
                </div>
              </div>

              <div style={{ fontSize: 13.5, lineHeight: 1.8, marginBottom: 16 }}>
                {isKm ? (
                  <>
                    គ្រឹះស្ថាន <strong>{companyName || "SMART LOAN PLATFORM"}</strong> សូមបញ្ជាក់ជាផ្លូវការថា អតិថិជនឈ្មោះ <strong>{certItem.client_name}</strong> អត្តសញ្ញាណប័ណ្ណលេខ <strong>{certItem.client_national_id || "........................"}</strong> បានទូទាត់សងកម្ចីប្រាក់ដើម និងការប្រាក់រួចរាល់ជាស្ថាពរ។
                  </>
                ) : (
                  <>
                    The financial institution <strong>{companyName || "SMART LOAN PLATFORM"}</strong> hereby certifies that the borrower <strong>{certItem.client_name}</strong> has fully settled and paid off all principal and interest obligations.
                  </>
                )}
              </div>

              <div style={{ background: "#f8fafc", padding: "14px 18px", borderRadius: 8, border: "1px solid #e2e8f0", marginBottom: 20, fontSize: 13 }}>
                <div style={{ fontWeight: 800, marginBottom: 6, color: "var(--color-accent)" }}>
                  {isKm ? "ព័ត៌មានលម្អិតនៃទ្រព្យដែលត្រូវបានដោះលែង៖" : "Particulars of Discharged Asset:"}
                </div>
                <div>• {isKm ? "ប្រភេទទ្រព្យ៖ " : "Asset Type: "} <strong>{certItem.asset_type}</strong></div>
                <div>• {isKm ? "លេខសម្គាល់ប័ណ្ណ/កាតគ្រី៖ " : "Title Deed / Registration No: "} <strong>{certItem.title_deed_no}</strong></div>
                <div>• {isKm ? "បរិយាយទ្រព្យ៖ " : "Description: "} {certItem.description}</div>
                <div>• {isKm ? "តម្លៃវាយតម្លៃដំបូង៖ " : "Valuation: "} {formatCurrency(certItem.estimated_value, certItem.valuation_currency)}</div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 30, marginTop: 40, textAlign: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{isKm ? "ហត្ថលេខា និងស្នាមមេដៃអ្នកទទួល" : "Borrower / Asset Owner"}</div>
                  <div style={{ height: 60 }} />
                  <div style={{ borderTop: "1px dashed #94a3b8", paddingTop: 4, fontSize: 12 }}>
                    {certItem.client_name}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{isKm ? "តំណាងគ្រឹះស្ថានអ្នកប្រគល់" : "For Authorized Institution"}</div>
                  <div style={{ height: 60 }} />
                  <div style={{ borderTop: "1px dashed #94a3b8", paddingTop: 4, fontSize: 12 }}>
                    {isKm ? "ប្រធានគ្រប់គ្រងឃ្លាំងទ្រព្យ" : "Chief Vault Custodian"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
