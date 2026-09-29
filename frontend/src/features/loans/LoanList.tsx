import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Landmark,
  Search,
  LayoutGrid,
  List as ListIcon,
  Download,
  Plus,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  X,
  CreditCard,
  Calculator,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { listLoans } from "../../api/loans";
import type { Loan } from "../../api/types";
import { usePermission } from "../../hooks/usePermission";
import { formatCurrency, formatDate, formatPercent } from "../../utils/format";
import StatusPill from "../../components/ui/StatusPill";
import Pagination from "../../components/ui/Pagination";
import LoanForm from "./LoanForm";
import LoanCalculatorModal from "../../components/calculator/LoanCalculatorModal";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useToast } from "../../context/ToastContext";

const STATUS_FILTERS: { label: string; value: string }[] = [
  { label: "All", value: "" },
  { label: "Active", value: "active" },
  { label: "Pending", value: "pending_approval" },
  { label: "Overdue", value: "overdue" },
  { label: "Closed", value: "closed" },
  { label: "Rejected", value: "rejected" },
  { label: "Written Off", value: "written_off" },
];

export default function LoanList() {
  useDocumentTitle("Loans");
  const { t } = useTranslation();
  const toast = useToast();
  const canCreate = usePermission("loans.create");

  const [loans, setLoans] = useState<Loan[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [calcOpen, setCalcOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "cards">(() => {
    try {
      return (localStorage.getItem("smartloan_loan_view") as "table" | "cards") || "cards";
    } catch {
      return "cards";
    }
  });

  useEffect(() => {
    if (searchParams.get("action") === "new") {
      setShowForm(true);
    }
  }, [searchParams]);

  function toggleViewMode(mode: "table" | "cards") {
    setViewMode(mode);
    try {
      localStorage.setItem("smartloan_loan_view", mode);
    } catch {}
  }

  function load(p: number, status?: string) {
    setLoading(true);
    listLoans(p, status || undefined)
      .then((res) => {
        setLoans(res.items);
        setTotal(res.total);
        setPageSize(res.page_size);
        setPage(res.page);
      })
      .catch(() => toast.error("Failed to fetch loans"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load(1, statusFilter);
  }, [statusFilter]);

  // Client-side instant filter by borrower search term if entered
  const filteredLoans = useMemo(() => {
    if (!search.trim()) return loans;
    const q = search.toLowerCase();
    return loans.filter((l) => {
      const name = (l.client_name || "").toLowerCase();
      const amount = String(l.principal_amount);
      const status = (l.status || "").toLowerCase();
      return name.includes(q) || amount.includes(q) || status.includes(q);
    });
  }, [loans, search]);

  // Quick stats
  const stats = useMemo(() => {
    const active = loans.filter((l) => l.status === "active").length;
    const pending = loans.filter((l) => l.status === "pending_approval").length;
    const overdue = loans.filter((l) => l.status === "overdue").length;
    const totalPrincipal = loans.reduce((acc, l) => acc + (Number(l.principal_amount) || 0), 0);
    return { active, pending, overdue, totalPrincipal };
  }, [loans]);

  // Export current list to CSV
  function exportCSV() {
    if (filteredLoans.length === 0) {
      toast.warning("No loans to export.");
      return;
    }
    const headers = ["Loan ID", "Client Name", "Principal", "Currency", "Interest Rate (%)", "Term (Months)", "Start Date", "Status"];
    const rows = filteredLoans.map((l) => [
      l.id,
      `"${(l.client_name || "").replace(/"/g, '""')}"`,
      l.principal_amount,
      l.principal_currency,
      l.interest_rate_percent,
      l.term_months,
      l.start_date,
      l.status,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `loans-export-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${filteredLoans.length} loans to CSV.`);
  }

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>{t("nav.loans")}</h1>
          <div className="page-subtitle">
            Manage, approve, and track loan portfolios with real-time analytics
          </div>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setCalcOpen(true)}
            title="Open Smart Loan Simulator"
          >
            <Calculator size={15} />
            <span>Simulator</span>
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={exportCSV}
            title="Export filtered loans as CSV"
          >
            <Download size={15} />
            <span>Export CSV</span>
          </button>
          {canCreate && (
            <button
              className="btn btn-primary"
              onClick={() => setShowForm((s) => !s)}
            >
              <Plus size={16} />
              <span>{showForm ? "Close Form" : t("loans.newLoan")}</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Pills */}
      <div className="stats-summary-strip">
        <div className="stats-summary-pill">
          <div className="stats-summary-icon" style={{ background: "rgba(99, 102, 241, 0.12)", color: "var(--color-accent)" }}>
            <Landmark size={18} />
          </div>
          <div className="stats-summary-meta">
            <span className="stats-summary-label">Total Loans</span>
            <span className="stats-summary-num">{total}</span>
          </div>
        </div>
        <div className="stats-summary-pill">
          <div className="stats-summary-icon" style={{ background: "rgba(16, 185, 129, 0.12)", color: "var(--color-success)" }}>
            <CheckCircle2 size={18} />
          </div>
          <div className="stats-summary-meta">
            <span className="stats-summary-label">Active</span>
            <span className="stats-summary-num">{stats.active}</span>
          </div>
        </div>
        <div className="stats-summary-pill">
          <div className="stats-summary-icon" style={{ background: "rgba(245, 158, 11, 0.12)", color: "var(--color-warning)" }}>
            <Clock size={18} />
          </div>
          <div className="stats-summary-meta">
            <span className="stats-summary-label">Pending Approval</span>
            <span className="stats-summary-num">{stats.pending}</span>
          </div>
        </div>
        <div className="stats-summary-pill">
          <div className="stats-summary-icon" style={{ background: "rgba(239, 68, 68, 0.12)", color: "var(--color-danger)" }}>
            <AlertTriangle size={18} />
          </div>
          <div className="stats-summary-meta">
            <span className="stats-summary-label">Overdue</span>
            <span className="stats-summary-num">{stats.overdue}</span>
          </div>
        </div>
      </div>

      {/* Interactive Create Card Drawer/Box */}
      {showForm && (
        <LoanForm
          initialPrincipal={searchParams.get("principal") || undefined}
          initialCurrency={(searchParams.get("currency") as "USD" | "KHR") || undefined}
          initialRate={searchParams.get("rate") || undefined}
          initialTermMonths={searchParams.get("term") || undefined}
          initialInterestType={(searchParams.get("type") as "flat" | "reducing") || undefined}
          onCreated={() => {
            setShowForm(false);
            load(page, statusFilter);
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Filter and View Controls Toolbar */}
      <div className="toolbar" style={{ justifyContent: "space-between", gap: 12 }}>
        {/* Status Filter Tabs */}
        <div className="filter-tabs" style={{ overflowX: "auto" }}>
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              className={`filter-tab${statusFilter === f.value ? " active" : ""}`}
              onClick={() => {
                setStatusFilter(f.value);
                setPage(1);
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search & View Switcher */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div className="search-input-wrapper" style={{ minWidth: 240 }}>
            <Search size={15} />
            <input
              type="search"
              placeholder="Filter by borrower or amount..."
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

          {/* View Mode Toggle: Cards vs Table */}
          <div className="view-mode-toggle" title="Switch view">
            <button
              type="button"
              className={`view-mode-btn${viewMode === "cards" ? " active" : ""}`}
              onClick={() => toggleViewMode("cards")}
              aria-label="Card View"
            >
              <LayoutGrid size={14} />
              <span>Cards</span>
            </button>
            <button
              type="button"
              className={`view-mode-btn${viewMode === "table" ? " active" : ""}`}
              onClick={() => toggleViewMode("table")}
              aria-label="Table View"
            >
              <ListIcon size={14} />
              <span>Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Card View vs Table View */}
      {viewMode === "cards" ? (
        <div>
          {loading ? (
            <div className="entity-card-grid">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="entity-card">
                  <div className="skeleton" style={{ height: 20, width: "60%", marginBottom: 12 }} />
                  <div className="skeleton" style={{ height: 32, width: "80%", marginBottom: 16 }} />
                  <div className="skeleton" style={{ height: 60, width: "100%", marginBottom: 16 }} />
                  <div className="skeleton" style={{ height: 32, width: "100%" }} />
                </div>
              ))}
            </div>
          ) : filteredLoans.length === 0 ? (
            <div className="card">
              <div className="table-empty">
                <Landmark size={36} className="table-empty-icon" />
                <div className="table-empty-text">
                  {statusFilter || search
                    ? "No loans match your current filter criteria."
                    : canCreate
                    ? "No loans recorded yet -- create your first loan to get started."
                    : "No loans found."}
                </div>
                {canCreate && !showForm && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{ marginTop: 8 }}
                    onClick={() => setShowForm(true)}
                  >
                    <Plus size={14} /> Create First Loan
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="entity-card-grid">
              {filteredLoans.map((loan) => (
                <div key={loan.id} className="entity-card">
                  {/* Top row: Client name + Status Pill */}
                  <div className="entity-card-top">
                    <div>
                      <div className="entity-card-title">{loan.client_name || "Borrower"}</div>
                      <div className="entity-card-sub">Started {formatDate(loan.start_date)}</div>
                    </div>
                    <StatusPill status={loan.status} />
                  </div>

                  {/* Prominent Loan Amount */}
                  <div style={{ margin: "4px 0 10px" }}>
                    <div style={{ fontSize: 11, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
                      Principal Amount
                    </div>
                    <div
                      className="num"
                      style={{
                        fontSize: 22,
                        fontWeight: 800,
                        color: "var(--color-text)",
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {formatCurrency(loan.principal_amount, loan.principal_currency)}
                    </div>
                  </div>

                  {/* Metrics Box */}
                  <div className="entity-card-metrics">
                    <div className="entity-metric-item">
                      <span className="entity-metric-label">Monthly Rate</span>
                      <span className="entity-metric-value">{formatPercent(loan.interest_rate_percent)}</span>
                    </div>
                    <div className="entity-metric-item">
                      <span className="entity-metric-label">Tenure</span>
                      <span className="entity-metric-value">{loan.term_months} Months</span>
                    </div>
                    <div className="entity-metric-item">
                      <span className="entity-metric-label">Method</span>
                      <span className="entity-metric-value" style={{ textTransform: "capitalize" }}>
                        {loan.interest_type}
                      </span>
                    </div>
                    <div className="entity-metric-item">
                      <span className="entity-metric-label">Grace Period</span>
                      <span className="entity-metric-value">{loan.grace_period_days} Days</span>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="entity-card-actions">
                    <span style={{ fontSize: 11, color: "var(--color-text-muted)", fontFamily: "var(--font-sans)", fontVariantNumeric: "tabular-nums" }}>
                      ID: {loan.id.slice(0, 8)}...
                    </span>
                    <Link to={`/loans/${loan.id}`} className="btn btn-sm btn-primary">
                      <span>View Details</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Table View */
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Borrower / Client</th>
                <th>{t("loans.principal")}</th>
                <th>{t("loans.interestRate")}</th>
                <th>{t("loans.termMonths")}</th>
                <th>Interest Method</th>
                <th>{t("common.date")}</th>
                <th>{t("common.status")}</th>
                <th style={{ textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} style={{ color: "var(--color-text-muted)", padding: 24, textAlign: "center" }}>
                    {t("common.loading")}
                  </td>
                </tr>
              )}
              {!loading &&
                filteredLoans.map((l) => (
                  <tr key={l.id}>
                    <td style={{ fontWeight: 600 }}>{l.client_name || "--"}</td>
                    <td className="num" style={{ fontWeight: 700 }}>
                      {formatCurrency(l.principal_amount, l.principal_currency)}
                    </td>
                    <td className="num">{formatPercent(l.interest_rate_percent)} / mo</td>
                    <td className="num">{l.term_months} mo</td>
                    <td style={{ textTransform: "capitalize", fontSize: 12 }}>{l.interest_type}</td>
                    <td className="num">{formatDate(l.start_date)}</td>
                    <td>
                      <StatusPill status={l.status} />
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <Link to={`/loans/${l.id}`} className="btn btn-sm btn-ghost">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              {!loading && filteredLoans.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <div className="table-empty">
                      <Landmark size={32} className="table-empty-icon" />
                      <div className="table-empty-text">
                        {statusFilter || search
                          ? "No loans match your filter criteria."
                          : "No loans yet -- create the first one to get started."}
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
        onChange={(p) => load(p, statusFilter)}
      />

      {/* Smart Loan Simulator Modal */}
      <LoanCalculatorModal
        isOpen={calcOpen}
        onClose={() => setCalcOpen(false)}
      />
    </div>
  );
}
