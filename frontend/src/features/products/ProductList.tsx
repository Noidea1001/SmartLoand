import { useEffect, useState, useMemo, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  Package,
  Search,
  Trash2,
  Pencil,
  X,
  Plus,
  LayoutGrid,
  List as ListIcon,
  Download,
  Sparkles,
  Tag,
  DollarSign,
  TrendingUp,
  Layers,
} from "lucide-react";
import { createProduct, deleteProduct, listProducts, updateProduct } from "../../api/products";
import type { Product } from "../../api/types";
import { usePermission } from "../../hooks/usePermission";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmContext";
import { formatCurrency, convertCurrencyAmount } from "../../utils/format";
import { useBranding } from "../../context/BrandingContext";
import Pagination from "../../components/ui/Pagination";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";

const CATEGORY_PRESETS = [
  "Electronics",
  "Vehicle",
  "Motorcycle",
  "Real Estate",
  "Business",
  "Personal",
  "Agriculture",
];

export default function ProductList() {
  useDocumentTitle("Products");
  const { t } = useTranslation();
  const toast = useToast();
  const confirm = useConfirm();

  const canManage = usePermission("products.manage");
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const { baseCurrency, usdToKhrRate } = useBranding();

  // Form Fields
  const [category, setCategory] = useState("Electronics");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState<"USD" | "KHR">(baseCurrency || "USD");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  // View Mode: Cards vs Table
  const [viewMode, setViewMode] = useState<"table" | "cards">(() => {
    try {
      return (localStorage.getItem("smartloan_product_view") as "table" | "cards") || "cards";
    } catch {
      return "cards";
    }
  });

  function toggleViewMode(mode: "table" | "cards") {
    setViewMode(mode);
    try {
      localStorage.setItem("smartloan_product_view", mode);
    } catch {}
  }

  function load(p: number, q: string) {
    setLoading(true);
    listProducts(p, q)
      .then((res) => {
        setProducts(res.items);
        setTotal(res.total);
        setPageSize(res.page_size);
        setPage(res.page);
      })
      .catch(() => toast.error("Failed to fetch product catalog."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load(1, search);
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => load(1, search), 300);
    return () => clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    if (!showForm) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") resetForm();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showForm]);

  function resetForm() {
    setCategory("Electronics");
    setName("");
    setPrice("");
    setCurrency(baseCurrency || "USD");
    setShowForm(false);
    setEditingProduct(null);
  }

  function startEdit(p: Product) {
    setEditingProduct(p);
    setCategory(p.category);
    setName(p.name);
    setPrice(String(p.price_amount));
    setCurrency(p.price_currency as "USD" | "KHR");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, {
          category,
          name,
          price_amount: Number(price),
          price_currency: currency,
        });
        toast.success(`Catalog item "${name}" has been updated.`, {
          title: "Product Updated",
        });
      } else {
        await createProduct({
          category,
          name,
          price_amount: Number(price),
          price_currency: currency,
        });
        toast.success(`Product "${name}" added to catalog.`, {
          title: "Product Added",
        });
      }
      resetForm();
      load(page, search);
    } catch {
      toast.error(
        editingProduct ? "Failed to update catalog item." : "Failed to add product.",
        { title: "Catalog Error" }
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(product: Product) {
    const ok = await confirm({
      title: `Remove ${product.name}?`,
      message:
        "This hides the item from product catalogs. Existing loan contracts linked to this asset remain completely intact.",
      confirmLabel: "Remove Product",
      danger: true,
    });
    if (!ok) return;

    try {
      await deleteProduct(product.id);
      toast.success(`${product.name} removed from catalog.`, { title: "Product Removed" });
      load(page, search);
    } catch {
      toast.error("Failed to remove product from catalog.");
    }
  }

  function exportCSV() {
    if (products.length === 0) {
      toast.warning("No products to export.");
      return;
    }
    const headers = ["Product ID", "Category", "Name", "Price Amount", "Currency"];
    const rows = products.map((p) => [
      p.id,
      `"${p.category.replace(/"/g, '""')}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      p.price_amount,
      p.price_currency,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `products-catalog-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${products.length} products to CSV.`);
  }

  // Quick statistics
  const stats = useMemo(() => {
    const categoriesCount = new Set(products.map((p) => p.category.toLowerCase())).size;
    const totalValuation = products.reduce((acc, p) => acc + (Number(p.price_amount) || 0), 0);
    return { categoriesCount, totalValuation };
  }, [products]);

  // Estimated financing calculation for the preview card
  const estimatedMonthlyFinance = useMemo(() => {
    const numericPrice = Number(price) || 0;
    if (numericPrice <= 0) return 0;
    // 1.5% flat over 12 months
    const total = numericPrice + numericPrice * 0.015 * 12;
    return total / 12;
  }, [price]);

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>{t("nav.products")}</h1>
          <div className="page-subtitle">{t("products.subtitle")}</div>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={exportCSV}
            title="Export products to CSV"
          >
            <Download size={15} />
            <span>{t("common.exportCsv")}</span>
          </button>
          {canManage && (
            <button
              className="btn btn-primary"
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
            >
              <Plus size={16} />
              <span>{t("products.addProduct")}</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="stats-summary-strip">
        <div className="stats-summary-pill">
          <div
            className="stats-summary-icon"
            style={{ background: "rgba(99, 102, 241, 0.12)", color: "var(--color-accent)" }}
          >
            <Package size={18} />
          </div>
          <div className="stats-summary-meta">
            <span className="stats-summary-label">Catalog Items</span>
            <span className="stats-summary-num">{total}</span>
          </div>
        </div>
        <div className="stats-summary-pill">
          <div
            className="stats-summary-icon"
            style={{ background: "rgba(16, 185, 129, 0.12)", color: "var(--color-success)" }}
          >
            <Layers size={18} />
          </div>
          <div className="stats-summary-meta">
            <span className="stats-summary-label">Categories</span>
            <span className="stats-summary-num">{stats.categoriesCount}</span>
          </div>
        </div>
        <div className="stats-summary-pill">
          <div
            className="stats-summary-icon"
            style={{ background: "rgba(245, 158, 11, 0.12)", color: "var(--color-warning)" }}
          >
            <DollarSign size={18} />
          </div>
          <div className="stats-summary-meta">
            <span className="stats-summary-label">Avg Item Price</span>
            <span className="stats-summary-num">
              {products.length > 0
                ? formatCurrency(
                    convertCurrencyAmount(stats.totalValuation / products.length, "USD", baseCurrency, usdToKhrRate),
                    baseCurrency
                  )
                : "--"}
            </span>
          </div>
        </div>
      </div>

      {/* Alert Modal Form for Create / Edit Product */}
      {showForm && (
        <div className="no-print modal-backdrop" onClick={resetForm}>
          <div
            className="modal-box"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 480,
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
                {editingProduct ? <Pencil size={20} /> : <Package size={20} />}
              </div>
              <div className="modal-header-text">
                <h2 className="modal-header-title">
                  {editingProduct ? `Edit ${editingProduct.name}` : t("products.registerProduct")}
                </h2>
                <p className="modal-header-desc">
                  {t("products.createCardDesc")}
                </p>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={resetForm}
                aria-label="Close"
                style={{ marginTop: -4, marginRight: -4, borderRadius: "8px" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body-scroll" style={{ background: "var(--color-surface)", padding: "20px 24px" }}>
              <form id="product-form" onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
                {/* Category with clean matching chips */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Category <span className="required">*</span>
                  </label>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                    {CATEGORY_PRESETS.map((cat) => (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => setCategory(cat)}
                        style={{
                          borderRadius: "8px",
                          padding: "5px 12px",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          transition: "all var(--transition-fast)",
                          border:
                            category.toLowerCase() === cat.toLowerCase()
                              ? "1px solid var(--color-accent)"
                              : "1px solid var(--color-border)",
                          background:
                            category.toLowerCase() === cat.toLowerCase()
                              ? "var(--color-accent-soft)"
                              : "var(--color-surface)",
                          color:
                            category.toLowerCase() === cat.toLowerCase()
                              ? "var(--color-accent)"
                              : "var(--color-text-secondary)",
                        }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. Electronics, Vehicle, Equipment..."
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                    style={{ borderRadius: "8px", border: "1px solid var(--color-border)" }}
                  />
                </div>

                {/* Product Name */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Product / Asset Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Honda Click 125i (2025)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    style={{ fontWeight: 500, borderRadius: "8px", border: "1px solid var(--color-border)" }}
                    autoFocus
                  />
                </div>

                {/* Price & Currency */}
                <div className="form-row" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>
                      Asset Valuation / Price <span className="required">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      placeholder="e.g. 2400"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      required
                      style={{ fontWeight: 600, fontSize: 15, borderRadius: "8px", border: "1px solid var(--color-border)" }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontWeight: 600 }}>{t("common.currency")}</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value as "USD" | "KHR")}
                      style={{ fontWeight: 600, borderRadius: "8px", border: "1px solid var(--color-border)" }}
                    >
                      <option value="USD">USD ($)</option>
                      <option value="KHR">KHR (៛)</option>
                    </select>
                  </div>
                </div>
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
                onClick={resetForm}
                style={{ minWidth: 90, borderRadius: "8px" }}
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                form="product-form"
                className="btn btn-primary"
                disabled={submitting || !name.trim() || !price}
                style={{ minWidth: 130, borderRadius: "8px" }}
              >
                {submitting ? "Saving..." : editingProduct ? "Update Catalog Item" : "Save Product"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar: Search & View Toggle */}
      <div className="toolbar" style={{ justifyContent: "space-between" }}>
        <div className="search-input-wrapper" style={{ flex: 1, maxWidth: 380 }}>
          <Search size={16} />
          <input
            type="search"
            placeholder={t("products.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--color-text-muted)",
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* View Mode Switcher */}
        <div className="view-mode-toggle">
          <button
            type="button"
            className={`view-mode-btn${viewMode === "cards" ? " active" : ""}`}
            onClick={() => toggleViewMode("cards")}
          >
            <LayoutGrid size={14} />
            <span>Cards</span>
          </button>
          <button
            type="button"
            className={`view-mode-btn${viewMode === "table" ? " active" : ""}`}
            onClick={() => toggleViewMode("table")}
          >
            <ListIcon size={14} />
            <span>Table</span>
          </button>
        </div>
      </div>

      {/* Main View: Cards vs Table */}
      {viewMode === "cards" ? (
        <div>
          {loading ? (
            <div className="entity-card-grid">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="entity-card">
                  <div className="skeleton" style={{ height: 24, width: "50%", marginBottom: 12 }} />
                  <div className="skeleton" style={{ height: 28, width: "80%", marginBottom: 16 }} />
                  <div className="skeleton" style={{ height: 40, width: "100%", marginBottom: 16 }} />
                  <div className="skeleton" style={{ height: 32, width: "100%" }} />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="card">
              <div className="table-empty">
                <Package size={36} className="table-empty-icon" />
                <div className="table-empty-text">
                  {search
                    ? "No products match your search query."
                    : "No products in catalog yet -- add your first catalog item."}
                </div>
                {canManage && !showForm && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{ marginTop: 8 }}
                    onClick={() => setShowForm(true)}
                  >
                    <Plus size={14} /> Add First Product
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="entity-card-grid">
              {products.map((p) => {
                const estFinancing = (Number(p.price_amount) * 1.18) / 12;
                return (
                  <div key={p.id} className="entity-card">
                    <div className="entity-card-top">
                      <span className="category-badge">{p.category}</span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: "var(--color-text-muted)",
                          fontFamily: "var(--font-sans)",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {p.id.slice(0, 8)}
                      </span>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <div className="entity-card-title">{p.name}</div>
                      <div
                        className="num"
                        style={{
                          fontSize: 22,
                          fontWeight: 800,
                          color: "var(--color-accent)",
                          marginTop: 8,
                        }}
                      >
                        {formatCurrency(p.price_amount, p.price_currency)}
                      </div>
                    </div>

                    <div
                      style={{
                        padding: "8px 12px",
                        background: "var(--color-surface-sunken)",
                        borderRadius: "var(--radius-sm)",
                        fontSize: 12,
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 12,
                      }}
                    >
                      <span style={{ color: "var(--color-text-muted)" }}>Financing approx:</span>
                      <span className="num" style={{ fontWeight: 600 }}>
                        {formatCurrency(estFinancing, p.price_currency)}/mo
                      </span>
                    </div>

                    {canManage && (
                      <div className="entity-card-actions">
                        <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Catalog Asset</span>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button
                            type="button"
                            className="btn-icon"
                            onClick={() => startEdit(p)}
                            title="Edit Product"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            className="btn-icon"
                            onClick={() => handleDelete(p)}
                            title="Remove Product"
                            style={{ color: "var(--color-danger)" }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Table View */
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Asset / Product Name</th>
                <th>Catalog Price</th>
                {canManage && <th style={{ textAlign: "right", width: 100 }}>{t("common.actions")}</th>}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={4} style={{ color: "var(--color-text-muted)", padding: 24, textAlign: "center" }}>
                    {t("common.loading")}
                  </td>
                </tr>
              )}
              {!loading &&
                products.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <span className="category-badge">{p.category}</span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td className="num" style={{ fontWeight: 700 }}>
                      {formatCurrency(p.price_amount, p.price_currency)}
                    </td>
                    {canManage && (
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: 4 }}>
                          <button
                            className="btn-icon"
                            onClick={() => startEdit(p)}
                            aria-label="Edit product"
                            title="Edit"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            className="btn-icon"
                            onClick={() => handleDelete(p)}
                            aria-label="Remove product"
                            title="Remove"
                            style={{ color: "var(--color-danger)" }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              {!loading && products.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    <div className="table-empty">
                      <Package size={32} className="table-empty-icon" />
                      <div className="table-empty-text">
                        {search ? "No products match your search." : "No products yet in catalog."}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <Pagination
        page={page}
        totalPages={Math.ceil(total / pageSize) || 1}
        onChange={(p) => load(p, search)}
      />
    </div>
  );
}
