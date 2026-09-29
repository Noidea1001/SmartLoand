import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ClipboardCheck, CheckCircle2, ArrowRight, Clock } from "lucide-react";
import { listPendingApprovals } from "../../api/loans";
import type { Loan } from "../../api/types";
import { formatCurrency, formatDate } from "../../utils/format";

export default function PendingApprovalsQueue() {
  const { t } = useTranslation();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listPendingApprovals(1)
      .then((res) => setLoans(res.items.slice(0, 5)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <ClipboardCheck size={18} color="var(--color-warning, #f59e0b)" />
            <span>{t("dashboard.pendingReviewTitle")}</span>
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--color-text-muted)" }}>
            {t("dashboard.pendingReviewSub")}
          </p>
        </div>

        <Link
          to="/loans/pending-approval"
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: "var(--color-accent)",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <span>View All</span>
          <ArrowRight size={14} />
        </Link>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
        {loading ? (
          <div style={{ display: "grid", gap: 8, padding: 12 }}>
            <div className="skeleton" style={{ height: 48, borderRadius: "var(--radius)" }} />
            <div className="skeleton" style={{ height: 48, borderRadius: "var(--radius)" }} />
            <div className="skeleton" style={{ height: 48, borderRadius: "var(--radius)" }} />
          </div>
        ) : loans.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "rgba(16, 185, 129, 0.12)",
                color: "var(--color-success)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              <CheckCircle2 size={24} />
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--color-text)" }}>
              {t("dashboard.noPending")}
            </div>
          </div>
        ) : (
          loans.map((loan) => (
            <div
              key={loan.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                borderRadius: "var(--radius-md)",
                background: "var(--color-surface-sunken)",
                border: "1px solid var(--color-border)",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #f59e0b, #d97706)",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12.5,
                    fontWeight: 800,
                  }}
                >
                  {(loan.client_name || "CL").slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>
                    {loan.client_name || "Borrower"}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="num">{loan.term_months}m @ {loan.interest_rate_percent}%</span>
                    <span>•</span>
                    <span>{formatDate(loan.start_date)}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ textAlign: "right" }}>
                  <div className="num" style={{ fontSize: 14.5, fontWeight: 800, color: "var(--color-accent)" }}>
                    {formatCurrency(loan.principal_amount, loan.principal_currency)}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--color-warning)", fontWeight: 700, textTransform: "uppercase" }}>
                    Pending
                  </div>
                </div>

                <Link
                  to={`/loans/${loan.id}`}
                  className="btn btn-xs btn-primary"
                  style={{ padding: "4px 10px", fontSize: 11.5 }}
                >
                  {t("dashboard.reviewBtn")}
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
