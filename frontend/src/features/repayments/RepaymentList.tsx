import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Receipt,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  DollarSign,
  Printer,
  CreditCard,
  Building,
  RefreshCw,
  QrCode,
  ArrowRight,
  Filter,
} from "lucide-react";
import {
  getDueInstallments,
  listPayments,
  type DueInstallmentItem,
  type PaymentItem,
} from "../../api/payments";
import { formatCurrency, formatDate, formatDateTime } from "../../utils/format";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useBranding } from "../../context/BrandingContext";
import PaymentModal from "../../components/payments/PaymentModal";
import ReceiptModal from "../../components/payments/ReceiptModal";

export default function RepaymentList() {
  useDocumentTitle("Repayments & Cashier Desk");
  const { t } = useTranslation();
  const { usdToKhrRate } = useBranding();

  const [activeTab, setActiveTab] = useState<"due" | "history">("due");
  const [dueList, setDueList] = useState<DueInstallmentItem[]>([]);
  const [paymentsList, setPaymentsList] = useState<PaymentItem[]>([]);
  const [totals, setTotals] = useState<{ usd: number; khr: number; count: number }>({
    usd: 0,
    khr: 0,
    count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Selected item for payment or receipt
  const [payingInstallment, setPayingInstallment] = useState<DueInstallmentItem | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<PaymentItem | null>(null);

  const effectiveRate = usdToKhrRate || 4100;

  async function loadData() {
    setLoading(true);
    try {
      const [dueData, historyData] = await Promise.all([
        getDueInstallments({ search: search.trim() || undefined }),
        listPayments({ page: 1, page_size: 50, search: search.trim() || undefined }),
      ]);
      setDueList(dueData);
      setPaymentsList(historyData.items);
      setTotals({
        usd: historyData.total_usd,
        khr: historyData.total_khr,
        count: historyData.total,
      });
    } catch {
      // Error handled gracefully
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [search]);

  // Filter due list by status
  const filteredDueList = useMemo(() => {
    if (statusFilter === "all") return dueList;
    if (statusFilter === "overdue") return dueList.filter((d) => d.days_overdue > 0 || d.status === "overdue");
    return dueList.filter((d) => d.status === statusFilter);
  }, [dueList, statusFilter]);

  // Metrics summary
  const overdueCount = useMemo(() => {
    return dueList.filter((d) => d.days_overdue > 0 || d.status === "overdue").length;
  }, [dueList]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header Banner */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "10px",
              backgroundColor: "var(--color-surface-sunken)",
              color: "var(--color-accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid var(--color-border)",
            }}
          >
            <Receipt size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
              {t("repaymentsPage.title")}
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--color-text-muted)" }}>
              {t("repaymentsPage.subtitle")}
            </p>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-ghost"
          onClick={loadData}
          style={{ borderRadius: "8px", fontSize: 13 }}
          title={t("repaymentsPage.refresh")}
        >
          <RefreshCw size={15} />
          <span>{t("repaymentsPage.refresh")}</span>
        </button>
      </div>

      {/* Cashier Reconciliation Metrics Strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: 12,
        }}
      >
        <div
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "14px",
            padding: "16px 18px",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 600 }}>
            {t("repaymentsPage.totalUSD")}
          </div>
          <div className="num" style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text)", marginTop: 4 }}>
            {formatCurrency(totals.usd, "USD")}
          </div>
          <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>
            {t("repaymentsPage.totalUSDDesc")}
          </div>
        </div>

        <div
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "14px",
            padding: "16px 18px",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 600 }}>
            {t("repaymentsPage.totalKHR")}
          </div>
          <div className="num" style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text)", marginTop: 4 }}>
            {formatCurrency(totals.khr, "KHR")}
          </div>
          <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>
            {t("repaymentsPage.totalKHRDesc")}
          </div>
        </div>

        <div
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "14px",
            padding: "16px 18px",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 600 }}>
            {t("repaymentsPage.installmentsDue")}
          </div>
          <div className="num" style={{ fontSize: 22, fontWeight: 800, color: overdueCount > 0 ? "var(--color-danger)" : "var(--color-accent)", marginTop: 4 }}>
            {dueList.length}{" "}
            <span style={{ fontSize: 13, fontWeight: 600, color: overdueCount > 0 ? "var(--color-danger)" : "var(--color-text-muted)" }}>
              ({overdueCount} {t("repaymentsPage.overdueCount")})
            </span>
          </div>
          <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>
            {t("repaymentsPage.installmentsDueDesc")}
          </div>
        </div>

        <div
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "14px",
            padding: "16px 18px",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 600 }}>
            {t("repaymentsPage.exchangeRateTitle")}
          </div>
          <div className="num" style={{ fontSize: 22, fontWeight: 800, color: "var(--color-accent)", marginTop: 4 }}>
            1 USD = {effectiveRate.toLocaleString()} ៛
          </div>
          <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>
            {t("repaymentsPage.exchangeRateDesc")}
          </div>
        </div>
      </div>

      {/* Control Bar: Tabs & Search */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        {/* Segmented View Switcher */}
        <div
          style={{
            display: "flex",
            gap: 6,
            background: "var(--color-surface-sunken)",
            padding: 3,
            borderRadius: "8px",
            border: "1px solid var(--color-border)",
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("due")}
            style={{
              padding: "7px 16px",
              borderRadius: "6px",
              fontSize: 13,
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              background: activeTab === "due" ? "var(--color-surface)" : "transparent",
              color: activeTab === "due" ? "var(--color-text)" : "var(--color-text-secondary)",
              boxShadow: activeTab === "due" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            {t("repaymentsPage.dueTab")} ({dueList.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            style={{
              padding: "7px 16px",
              borderRadius: "6px",
              fontSize: 13,
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              background: activeTab === "history" ? "var(--color-surface)" : "transparent",
              color: activeTab === "history" ? "var(--color-text)" : "var(--color-text-secondary)",
              boxShadow: activeTab === "history" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            {t("repaymentsPage.historyTab")} ({paymentsList.length})
          </button>
        </div>

        {/* Search & Status Filters */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {activeTab === "due" && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                padding: "7px 12px",
                borderRadius: "8px",
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
              }}
            >
              <option value="all">{t("repaymentsPage.allStatuses")}</option>
              <option value="overdue">{t("repaymentsPage.overdueOnly")}</option>
              <option value="due">{t("repaymentsPage.dueSoon")}</option>
              <option value="upcoming">{t("repaymentsPage.upcoming")}</option>
            </select>
          )}

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
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("repaymentsPage.searchPlaceholder")}
              style={{
                paddingLeft: 32,
                paddingRight: 12,
                paddingTop: 7,
                paddingBottom: 7,
                fontSize: 12.5,
                borderRadius: "8px",
                width: 240,
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === "due" ? (
        <div
          style={{
            background: "var(--color-surface)",
            borderRadius: "14px",
            border: "1px solid var(--color-border)",
            boxShadow: "var(--shadow-sm)",
            overflow: "hidden",
          }}
        >
          {loading ? (
            <div style={{ padding: 48, textAlign: "center", color: "var(--color-text-muted)" }}>
              {t("common.loading")}...
            </div>
          ) : filteredDueList.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", color: "var(--color-text-muted)" }}>
              <CheckCircle2 size={32} color="var(--color-success)" style={{ margin: "0 auto 8px" }} />
              <div style={{ fontWeight: 700, fontSize: 15, color: "var(--color-text)" }}>
                {t("repaymentsPage.noDueInstallments")}
              </div>
              <div style={{ fontSize: 13, marginTop: 4 }}>
                {t("repaymentsPage.allSettled")}
              </div>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "var(--color-surface-sunken)", borderBottom: "1px solid var(--color-border)" }}>
                    <th style={{ padding: "12px 16px", textAlign: "left" }}>{t("repaymentsPage.clientLoan")}</th>
                    <th style={{ padding: "12px 16px", textAlign: "left" }}>{t("repaymentsPage.installmentNo")}</th>
                    <th style={{ padding: "12px 16px", textAlign: "left" }}>{t("repaymentsPage.dueDate")}</th>
                    <th style={{ padding: "12px 16px", textAlign: "right" }}>{t("repaymentsPage.netDue")}</th>
                    <th style={{ padding: "12px 16px", textAlign: "right" }}>{t("loans.dualCurrency")}</th>
                    <th style={{ padding: "12px 16px", textAlign: "center" }}>{t("repaymentsPage.status")}</th>
                    <th style={{ padding: "12px 16px", textAlign: "right" }}>{t("repaymentsPage.action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDueList.map((item) => {
                    const isUSD = item.currency === "USD";
                    const altAmt = isUSD
                      ? item.net_due * effectiveRate
                      : item.net_due / effectiveRate;
                    const altCurr = isUSD ? "KHR" : "USD";
                    const isLate = item.days_overdue > 0;

                    return (
                      <tr
                        key={item.installment_id}
                        style={{
                          borderBottom: "1px solid var(--color-border)",
                          background: isLate ? "rgba(239, 68, 68, 0.02)" : "transparent",
                        }}
                      >
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ fontWeight: 700, color: "var(--color-text)" }}>
                            {item.client_name}
                          </div>
                          <div style={{ fontSize: 11.5, color: "var(--color-text-muted)" }}>
                            Tel: {item.client_phone || "--"}
                          </div>
                        </td>

                        <td style={{ padding: "12px 16px" }}>
                          <span
                            style={{
                              fontSize: 11.5,
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: "6px",
                              background: "var(--color-surface-sunken)",
                              border: "1px solid var(--color-border)",
                            }}
                          >
                            Installment #{item.installment_number}
                          </span>
                        </td>

                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ fontWeight: 600 }}>{formatDate(item.due_date)}</div>
                          {isLate && (
                            <div style={{ fontSize: 11, color: "var(--color-danger)", fontWeight: 700 }}>
                              {item.days_overdue} {t("repaymentsPage.daysOverdue")}
                            </div>
                          )}
                        </td>

                        <td className="num" style={{ padding: "12px 16px", textAlign: "right", fontWeight: 800, fontSize: 14 }}>
                          {formatCurrency(item.net_due, item.currency)}
                        </td>

                        <td className="num" style={{ padding: "12px 16px", textAlign: "right", color: "var(--color-text-secondary)" }}>
                          {formatCurrency(altAmt, altCurr)}
                        </td>

                        <td style={{ padding: "12px 16px", textAlign: "center" }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: "6px",
                              background: isLate
                                ? "rgba(239, 68, 68, 0.12)"
                                : "rgba(16, 185, 129, 0.12)",
                              color: isLate ? "var(--color-danger)" : "var(--color-success)",
                            }}
                          >
                            {isLate ? t("repaymentsPage.overdueOnly") : t("repaymentsPage.dueSoon")}
                          </span>
                        </td>

                        <td style={{ padding: "12px 16px", textAlign: "right" }}>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => setPayingInstallment(item)}
                            style={{ borderRadius: "8px", fontSize: 12.5 }}
                          >
                            <CreditCard size={14} />
                            <span>{t("repaymentsPage.collectPayment")}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* History Tab */
        <div
          style={{
            background: "var(--color-surface)",
            borderRadius: "14px",
            border: "1px solid var(--color-border)",
            boxShadow: "var(--shadow-sm)",
            overflow: "hidden",
          }}
        >
          {loading ? (
            <div style={{ padding: 48, textAlign: "center", color: "var(--color-text-muted)" }}>
              {t("common.loading")}...
            </div>
          ) : paymentsList.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", color: "var(--color-text-muted)" }}>
              {t("repaymentsPage.noPaymentsRecorded")}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "var(--color-surface-sunken)", borderBottom: "1px solid var(--color-border)" }}>
                    <th style={{ padding: "12px 16px", textAlign: "left" }}>{t("repaymentsPage.receiptNo")}</th>
                    <th style={{ padding: "12px 16px", textAlign: "left" }}>{t("repaymentsPage.client")}</th>
                    <th style={{ padding: "12px 16px", textAlign: "left" }}>{t("repaymentsPage.dateTime")}</th>
                    <th style={{ padding: "12px 16px", textAlign: "right" }}>{t("repaymentsPage.paidAmount")}</th>
                    <th style={{ padding: "12px 16px", textAlign: "left" }}>{t("repaymentsPage.method")}</th>
                    <th style={{ padding: "12px 16px", textAlign: "left" }}>{t("repaymentsPage.cashier")}</th>
                    <th style={{ padding: "12px 16px", textAlign: "right" }}>{t("repaymentsPage.action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentsList.map((pay) => (
                    <tr key={pay.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                      <td className="num" style={{ padding: "12px 16px", fontWeight: 700, color: "var(--color-accent)" }}>
                        {pay.receipt_number || `REC-${pay.id.slice(0, 8).toUpperCase()}`}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontWeight: 700 }}>{pay.client_name || "--"}</div>
                        <div style={{ fontSize: 11.5, color: "var(--color-text-muted)" }}>
                          {t("repaymentsPage.installmentNo")} {pay.installment_number || 1}
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px", color: "var(--color-text-secondary)" }}>
                        {formatDateTime(pay.paid_at)}
                      </td>
                      <td className="num" style={{ padding: "12px 16px", textAlign: "right", fontWeight: 800 }}>
                        {formatCurrency(pay.amount, pay.currency)}
                      </td>
                      <td style={{ padding: "12px 16px", textTransform: "capitalize" }}>
                        {pay.method.replace("_", " ")}
                      </td>
                      <td style={{ padding: "12px 16px", color: "var(--color-text-secondary)" }}>
                        {pay.recorded_by_name || "Cashier"}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setViewingReceipt(pay)}
                          style={{ borderRadius: "8px", fontSize: 12.5 }}
                        >
                          <Printer size={14} />
                          <span>{t("repaymentsPage.printVoucher")}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Payment Processing Modal */}
      <PaymentModal
        isOpen={Boolean(payingInstallment)}
        onClose={() => setPayingInstallment(null)}
        installment={payingInstallment}
        onPaymentSuccess={(result) => {
          loadData();
          setViewingReceipt(result);
        }}
      />

      {/* Official Printable Receipt Modal */}
      <ReceiptModal
        isOpen={Boolean(viewingReceipt)}
        onClose={() => setViewingReceipt(null)}
        payment={viewingReceipt}
      />
    </div>
  );
}
