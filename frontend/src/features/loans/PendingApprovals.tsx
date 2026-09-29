import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Landmark,
  LayoutGrid,
  List as ListIcon,
  Search,
  AlertCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { decideLoan, listPendingApprovals } from "../../api/loans";
import type { Loan } from "../../api/types";
import { useToast } from "../../context/ToastContext";
import { useConfirm } from "../../context/ConfirmContext";
import { formatCurrency, formatPercent, formatDate } from "../../utils/format";
import Pagination from "../../components/ui/Pagination";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";

export default function PendingApprovals() {
  useDocumentTitle("Pending Approvals");
  const { t } = useTranslation();
  const toast = useToast();
  const confirm = useConfirm();

  const [loans, setLoans] = useState<Loan[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [commentsById, setCommentsById] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<"table" | "cards">(() => {
    try {
      return (localStorage.getItem("smartloan_approvals_view") as "table" | "cards") || "cards";
    } catch {
      return "cards";
    }
  });

  function toggleViewMode(mode: "table" | "cards") {
    setViewMode(mode);
    try {
      localStorage.setItem("smartloan_approvals_view", mode);
    } catch {}
  }

  function load(p: number) {
    setLoading(true);
    listPendingApprovals(p)
      .then((res) => {
        setLoans(res.items);
        setTotal(res.total);
        setPageSize(res.page_size);
        setPage(res.page);
      })
      .catch(() => toast.error("Failed to load approval requests."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load(1);
  }, []);

  const totalCapitalPending = useMemo(() => {
    return loans.reduce((sum, l) => sum + (Number(l.principal_amount) || 0), 0);
  }, [loans]);

  async function handleDecision(loanId: string, approve: boolean, clientName?: string) {
    const comment = commentsById[loanId];
    if (!approve && !comment?.trim()) {
      toast.warning("Please provide a reason comment when rejecting a loan request.", {
        title: "Comment Required",
      });
      return;
    }

    const actionText = approve ? "Approve" : "Reject";
    const ok = await confirm({
      title: `${actionText} Loan Request?`,
      message: approve
        ? `Are you sure you want to approve this loan of for ${clientName || "the borrower"}? This will activate the installment schedule.`
        : `Are you sure you want to reject this loan application? Reason: "${comment}"`,
      confirmLabel: actionText,
      danger: !approve,
    });
    if (!ok) return;

    setBusyId(loanId);
    try {
      await decideLoan(loanId, approve, comment || undefined);
      toast.success(
        approve
          ? `Loan approved successfully. Schedule is now active.`
          : `Loan request has been rejected.`,
        { title: approve ? "Loan Approved" : "Loan Rejected" }
      );
      load(page);
    } catch {
      toast.error("Failed to record the approval decision.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>{t("nav.pendingApprovals")}</h1>
          <div className="page-subtitle">
            Review, scrutinize risk, and decision awaiting credit applications
          </div>
        </div>

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

      {/* KPI Stats Strip */}
      <div className="stats-summary-strip">
        <div className="stats-summary-pill">
          <div
            className="stats-summary-icon"
            style={{ background: "rgba(245, 158, 11, 0.12)", color: "var(--color-warning)" }}
          >
            <Clock size={18} />
          </div>
          <div className="stats-summary-meta">
            <span className="stats-summary-label">Awaiting Decision</span>
            <span className="stats-summary-num">{total}</span>
          </div>
        </div>

        <div className="stats-summary-pill">
          <div
            className="stats-summary-icon"
            style={{ background: "rgba(99, 102, 241, 0.12)", color: "var(--color-accent)" }}
          >
            <Landmark size={18} />
          </div>
          <div className="stats-summary-meta">
            <span className="stats-summary-label">Total Requested Capital</span>
            <span className="stats-summary-num">
              {loans.length > 0
                ? formatCurrency(totalCapitalPending, loans[0]?.principal_currency || "USD")
                : "--"}
            </span>
          </div>
        </div>
      </div>

      {/* Content: Cards vs Table */}
      {viewMode === "cards" ? (
        <div>
          {loading ? (
            <div className="entity-card-grid">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="entity-card">
                  <div className="skeleton" style={{ height: 24, width: "60%", marginBottom: 12 }} />
                  <div className="skeleton" style={{ height: 32, width: "80%", marginBottom: 16 }} />
                  <div className="skeleton" style={{ height: 60, width: "100%", marginBottom: 16 }} />
                  <div className="skeleton" style={{ height: 36, width: "100%" }} />
                </div>
              ))}
            </div>
          ) : loans.length === 0 ? (
            <div className="card">
              <div className="table-empty">
                <ClipboardCheck size={36} className="table-empty-icon" />
                <div className="table-empty-text">
                  All caught up! There are no pending loan requests waiting for approval right now.
                </div>
              </div>
            </div>
          ) : (
            <div className="entity-card-grid">
              {loans.map((loan) => (
                <div key={loan.id} className="entity-card">
                  <div className="entity-card-top">
                    <div>
                      <div className="entity-card-title">{loan.client_name || "Borrower Request"}</div>
                      <div className="entity-card-sub">Requested on {formatDate(loan.created_at)}</div>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "#d97706",
                        background: "#fef3c7",
                        padding: "3px 10px",
                        borderRadius: 999,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Clock size={12} /> Awaiting Review
                    </span>
                  </div>

                  <div style={{ margin: "4px 0 10px" }}>
                    <div style={{ fontSize: 11, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
                      Requested Principal
                    </div>
                    <div
                      className="num"
                      style={{ fontSize: 24, fontWeight: 800, color: "var(--color-text)", marginTop: 2 }}
                    >
                      {formatCurrency(loan.principal_amount, loan.principal_currency)}
                    </div>
                  </div>

                  <div className="entity-card-metrics">
                    <div className="entity-metric-item">
                      <span className="entity-metric-label">Rate</span>
                      <span className="entity-metric-value">{formatPercent(loan.interest_rate_percent)} / mo</span>
                    </div>
                    <div className="entity-metric-item">
                      <span className="entity-metric-label">Term</span>
                      <span className="entity-metric-value">{loan.term_months} Months</span>
                    </div>
                    <div className="entity-metric-item">
                      <span className="entity-metric-label">Type</span>
                      <span className="entity-metric-value" style={{ textTransform: "capitalize" }}>
                        {loan.interest_type}
                      </span>
                    </div>
                    <div className="entity-metric-item">
                      <span className="entity-metric-label">Start Date</span>
                      <span className="entity-metric-value">{formatDate(loan.start_date)}</span>
                    </div>
                  </div>

                  {/* Decision Comments Input */}
                  <div style={{ marginBottom: 12 }}>
                    <input
                      type="text"
                      placeholder="Decision notes / rejection reason..."
                      value={commentsById[loan.id] || ""}
                      onChange={(e) =>
                        setCommentsById((prev) => ({ ...prev, [loan.id]: e.target.value }))
                      }
                      style={{ fontSize: 12 }}
                    />
                  </div>

                  {/* Decision Actions */}
                  <div className="entity-card-actions">
                    <Link to={`/loans/${loan.id}`} className="btn btn-sm btn-ghost">
                      Details
                    </Link>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        disabled={busyId === loan.id}
                        onClick={() => handleDecision(loan.id, true, loan.client_name)}
                      >
                        <CheckCircle2 size={14} />
                        <span>Approve</span>
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        disabled={busyId === loan.id}
                        onClick={() => handleDecision(loan.id, false, loan.client_name)}
                      >
                        <XCircle size={14} />
                        <span>Reject</span>
                      </button>
                    </div>
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
                <th>Borrower</th>
                <th>{t("loans.principal")}</th>
                <th>{t("loans.interestRate")}</th>
                <th>{t("loans.termMonths")}</th>
                <th>Decision Comment</th>
                <th style={{ textAlign: "right" }}>{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} style={{ color: "var(--color-text-muted)", padding: 24, textAlign: "center" }}>
                    {t("common.loading")}
                  </td>
                </tr>
              )}
              {!loading &&
                loans.map((l) => (
                  <tr key={l.id}>
                    <td style={{ fontWeight: 600 }}>
                      <Link to={`/loans/${l.id}`}>{l.client_name || "Borrower"}</Link>
                    </td>
                    <td className="num" style={{ fontWeight: 700 }}>
                      {formatCurrency(l.principal_amount, l.principal_currency)}
                    </td>
                    <td className="num">{formatPercent(l.interest_rate_percent)} / mo</td>
                    <td className="num">{l.term_months} mo</td>
                    <td>
                      <input
                        type="text"
                        placeholder="Required if rejecting"
                        value={commentsById[l.id] || ""}
                        onChange={(e) =>
                          setCommentsById((prev) => ({ ...prev, [l.id]: e.target.value }))
                        }
                        style={{ maxWidth: 220 }}
                      />
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 6 }}>
                        <button
                          className="btn btn-sm btn-primary"
                          disabled={busyId === l.id}
                          onClick={() => handleDecision(l.id, true, l.client_name)}
                        >
                          Approve
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          disabled={busyId === l.id}
                          onClick={() => handleDecision(l.id, false, l.client_name)}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              {!loading && loans.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 40, textAlign: "center" }}>
                    <ClipboardCheck size={28} color="var(--color-text-muted)" style={{ marginBottom: 8 }} />
                    <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>
                      Nothing waiting on your approval right now.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <Pagination page={page} totalPages={Math.ceil(total / pageSize) || 1} onChange={load} />
    </div>
  );
}
