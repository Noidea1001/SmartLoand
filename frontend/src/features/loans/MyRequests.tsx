import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FileText, ArrowRight, LayoutGrid, List as ListIcon, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { listMyRequests } from "../../api/loans";
import type { Loan } from "../../api/types";
import { formatCurrency, formatPercent, formatDate } from "../../utils/format";
import StatusPill from "../../components/ui/StatusPill";
import Pagination from "../../components/ui/Pagination";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import LoanForm from "./LoanForm";

export default function MyRequests() {
  useDocumentTitle("My Requests");
  const { t } = useTranslation();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [viewMode, setViewMode] = useState<"table" | "cards">(() => {
    try {
      return (localStorage.getItem("smartloan_myrequests_view") as "table" | "cards") || "cards";
    } catch {
      return "cards";
    }
  });

  function toggleViewMode(mode: "table" | "cards") {
    setViewMode(mode);
    try {
      localStorage.setItem("smartloan_myrequests_view", mode);
    } catch {}
  }

  function load(p: number) {
    setLoading(true);
    listMyRequests(p)
      .then((res) => {
        setLoans(res.items);
        setTotal(res.total);
        setPageSize(res.page_size);
        setPage(res.page);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load(1);
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{t("nav.myRequests")}</h1>
          <div className="page-subtitle">Track loan applications originated by your account</div>
        </div>

        <div className="page-actions">
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

          <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
            <Plus size={16} />
            <span>{showForm ? "Close Form" : "New Loan Request"}</span>
          </button>
        </div>
      </div>

      {showForm && (
        <LoanForm
          onCreated={() => {
            setShowForm(false);
            load(page);
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {viewMode === "cards" ? (
        <div>
          {loading ? (
            <div className="entity-card-grid">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="entity-card">
                  <div className="skeleton" style={{ height: 24, width: "60%", marginBottom: 12 }} />
                  <div className="skeleton" style={{ height: 32, width: "80%", marginBottom: 16 }} />
                  <div className="skeleton" style={{ height: 50, width: "100%", marginBottom: 16 }} />
                  <div className="skeleton" style={{ height: 32, width: "100%" }} />
                </div>
              ))}
            </div>
          ) : loans.length === 0 ? (
            <div className="card">
              <div className="table-empty">
                <FileText size={36} className="table-empty-icon" />
                <div className="table-empty-text">You haven't requested any loans yet.</div>
                {!showForm && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{ marginTop: 8 }}
                    onClick={() => setShowForm(true)}
                  >
                    <Plus size={14} /> Create First Request
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="entity-card-grid">
              {loans.map((loan) => (
                <div key={loan.id} className="entity-card">
                  <div className="entity-card-top">
                    <div>
                      <div className="entity-card-title">{loan.client_name || "Borrower"}</div>
                      <div className="entity-card-sub">Originated {formatDate(loan.created_at)}</div>
                    </div>
                    <StatusPill status={loan.status} />
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
                  </div>

                  <div className="entity-card-actions">
                    <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Application</span>
                    <Link to={`/loans/${loan.id}`} className="btn btn-sm btn-ghost">
                      <span>View</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Borrower</th>
                <th>{t("loans.principal")}</th>
                <th>{t("loans.interestRate")}</th>
                <th>{t("common.status")}</th>
                <th style={{ textAlign: "right" }}></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} style={{ color: "var(--color-text-muted)", padding: 24, textAlign: "center" }}>
                    {t("common.loading")}
                  </td>
                </tr>
              )}
              {!loading &&
                loans.map((l) => (
                  <tr key={l.id}>
                    <td style={{ fontWeight: 600 }}>{l.client_name || "Borrower"}</td>
                    <td className="num" style={{ fontWeight: 700 }}>
                      {formatCurrency(l.principal_amount, l.principal_currency)}
                    </td>
                    <td className="num">{formatPercent(l.interest_rate_percent)} / mo</td>
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
              {!loading && loans.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 40, textAlign: "center" }}>
                    <FileText size={28} color="var(--color-text-muted)" style={{ marginBottom: 8 }} />
                    <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>
                      You haven't requested any loans yet.
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} totalPages={Math.ceil(total / pageSize) || 1} onChange={load} />
    </div>
  );
}
