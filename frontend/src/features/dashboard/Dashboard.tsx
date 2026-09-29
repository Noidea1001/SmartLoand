import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Landmark,
  Users,
  AlertTriangle,
  ClipboardCheck,
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  Plus,
  Calculator,
  Download,
  Activity,
  Layers,
  BarChart2,
  PieChart as PieIcon,
  ShieldCheck,
  CheckCircle2,
  FileSpreadsheet,
} from "lucide-react";
import { getSeries, getDashboardSummary } from "../../api/dashboard";
import type { DashboardSummary, SeriesResponse } from "../../api/types";
import AnalyticsChart from "./AnalyticsChart";
import PortfolioDistributionDonut from "./PortfolioDistributionDonut";
import PendingApprovalsQueue from "./PendingApprovalsQueue";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { formatCurrency } from "../../utils/format";
import { Link } from "react-router-dom";
import LoanCalculatorModal from "../../components/calculator/LoanCalculatorModal";
import { useToast } from "../../context/ToastContext";

type Metric = "new_loans" | "collections" | "disbursed_amount";
type Granularity = "week" | "month" | "year";
type ChartType = "area" | "bar" | "line";

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  subtitle,
  link,
}: {
  icon: typeof Landmark;
  label: string;
  value: string | number;
  color: string;
  subtitle?: string;
  link?: string;
}) {
  const card = (
    <div className="stat-card" style={{ transition: "all 0.2s ease" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div className="stat-icon" style={{ background: color + "14", color }}>
          <Icon size={24} />
        </div>
        {link && (
          <ArrowUpRight size={16} style={{ color: "var(--color-text-muted)", marginTop: 2 }} />
        )}
      </div>
      <div className="stat-label">{label}</div>
      <div className="stat-value num">{value}</div>
      {subtitle && (
        <div style={{ fontSize: 12, color: "var(--color-text-muted)", fontWeight: 500, marginTop: 4 }}>
          {subtitle}
        </div>
      )}
    </div>
  );

  return link ? (
    <Link to={link} style={{ textDecoration: "none", color: "inherit" }}>
      {card}
    </Link>
  ) : (
    card
  );
}

function SkeletonStats() {
  return (
    <div className="stat-grid">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="stat-card">
          <div className="skeleton" style={{ width: 42, height: 42, borderRadius: "var(--radius)" }} />
          <div className="skeleton skeleton-text" style={{ width: "50%" }} />
          <div className="skeleton" style={{ width: "70%", height: 28 }} />
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  useDocumentTitle("Dashboard");
  const { t } = useTranslation();
  const toast = useToast();

  const [metric, setMetric] = useState<Metric>("new_loans");
  const [granularity, setGranularity] = useState<Granularity>("month");
  const [chartType, setChartType] = useState<ChartType>("area");
  const [currency, setCurrency] = useState<"USD" | "KHR">("USD");
  const [series, setSeries] = useState<SeriesResponse | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [calcOpen, setCalcOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    getSeries(metric, granularity, currency)
      .then(setSeries)
      .finally(() => setLoading(false));
  }, [metric, granularity, currency]);

  useEffect(() => {
    setSummaryLoading(true);
    getDashboardSummary(currency)
      .then(setSummary)
      .catch(() => {})
      .finally(() => setSummaryLoading(false));
  }, [currency]);

  const metricLabels: Record<Metric, string> = {
    new_loans: t("dashboard.newLoans"),
    collections: t("dashboard.collections"),
    disbursed_amount: t("dashboard.disbursedAmount"),
  };

  // Financial Health Ratios
  const healthMetrics = useMemo(() => {
    if (!summary) return { recoveryRate: "0.0", riskRate: "0.0", utilization: "0.0", avgLoan: 0 };
    const disbursed = Number(summary.total_disbursed) || 0;
    const collected = Number(summary.total_collected) || 0;
    const active = Number(summary.total_active_loans) || 0;
    const overdue = Number(summary.overdue_loans) || 0;
    const clients = Number(summary.total_clients) || 0;

    const recoveryRate = disbursed > 0 ? ((collected / disbursed) * 100).toFixed(1) : "0.0";
    const totalExposure = active + overdue;
    const riskRate = totalExposure > 0 ? ((overdue / totalExposure) * 100).toFixed(1) : "0.0";
    const utilization = clients > 0 ? ((active / clients) * 100).toFixed(1) : "0.0";
    const avgLoan = active > 0 ? disbursed / active : 0;

    return { recoveryRate, riskRate, utilization, avgLoan };
  }, [summary]);

  // Export Analytics Summary CSV
  function exportAnalyticsReport() {
    if (!summary) return;
    const headers = ["Metric", "Value", "Currency", "Timestamp"];
    const rows = [
      ["Active Loans", summary.total_active_loans, currency, new Date().toISOString()],
      ["Total Disbursed", summary.total_disbursed, currency, new Date().toISOString()],
      ["Total Collected", summary.total_collected, currency, new Date().toISOString()],
      ["Pending Approvals", summary.pending_approvals, currency, new Date().toISOString()],
      ["Overdue Loans", summary.overdue_loans, currency, new Date().toISOString()],
      ["Total Clients", summary.total_clients, currency, new Date().toISOString()],
      ["Capital Recovery Rate (%)", `${healthMetrics.recoveryRate}%`, currency, new Date().toISOString()],
      ["Portfolio At Risk NPL (%)", `${healthMetrics.riskRate}%`, currency, new Date().toISOString()],
    ];

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `portfolio-analytics-${currency}-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Analytics report exported.");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1>{t("nav.dashboard")}</h1>
          <div className="page-subtitle">{t("dashboard.subtitle")}</div>
        </div>
        <div className="page-actions">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={exportAnalyticsReport}
            title={t("dashboard.exportReport")}
          >
            <Download size={14} /> <span>{t("common.exportCsv")}</span>
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setCalcOpen(true)}
            title="Open Smart Loan Simulator"
          >
            <Calculator size={14} /> <span>{t("dashboard.simulator")}</span>
          </button>
          <Link to="/loans" className="btn btn-primary btn-sm">
            <Plus size={14} /> <span>{t("loans.newLoan")}</span>
          </Link>
          <Link to="/clients" className="btn btn-ghost btn-sm">
            <Users size={14} /> <span>{t("dashboard.addClient")}</span>
          </Link>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as "USD" | "KHR")}
            style={{ width: "auto", padding: "6px 12px", fontSize: 13, fontWeight: 700 }}
          >
            <option value="USD">USD ($)</option>
            <option value="KHR">KHR (៛)</option>
          </select>
        </div>
      </div>

      {/* Financial Health & Portfolio Indicators Banner */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
          padding: "16px 20px",
          background: "linear-gradient(135deg, rgba(99,102,241,0.06), rgba(16,185,129,0.04))",
          borderRadius: "var(--radius-lg, 12px)",
          border: "1px solid var(--color-border)",
        }}
      >
        {/* Recovery Rate */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "var(--radius-md)",
              background: "rgba(16, 185, 129, 0.12)",
              color: "var(--color-success)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ShieldCheck size={20} />
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", fontWeight: 600 }}>
              {t("dashboard.recoveryRate")}
            </div>
            <div className="num" style={{ fontSize: 18, fontWeight: 800, color: "var(--color-success)" }}>
              {healthMetrics.recoveryRate}%
            </div>
          </div>
        </div>

        {/* Portfolio Risk (NPL) */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "var(--radius-md)",
              background: Number(healthMetrics.riskRate) > 5 ? "rgba(239, 68, 68, 0.12)" : "rgba(245, 158, 11, 0.12)",
              color: Number(healthMetrics.riskRate) > 5 ? "var(--color-danger)" : "var(--color-warning)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AlertTriangle size={20} />
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", fontWeight: 600 }}>
              {t("dashboard.portfolioRisk")}
            </div>
            <div
              className="num"
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: Number(healthMetrics.riskRate) > 5 ? "var(--color-danger)" : "var(--color-text)",
              }}
            >
              {healthMetrics.riskRate}%{" "}
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-muted)" }}>
                ({Number(healthMetrics.riskRate) <= 5 ? t("dashboard.healthy") : t("dashboard.attention")})
              </span>
            </div>
          </div>
        </div>

        {/* Borrower Ratio */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "var(--radius-md)",
              background: "rgba(99, 102, 241, 0.12)",
              color: "var(--color-accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Activity size={20} />
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", fontWeight: 600 }}>
              {t("dashboard.clientUtilization")}
            </div>
            <div className="num" style={{ fontSize: 18, fontWeight: 800, color: "var(--color-accent)" }}>
              {healthMetrics.utilization}%
            </div>
          </div>
        </div>

        {/* Average Loan Size */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "var(--radius-md)",
              background: "rgba(14, 165, 233, 0.12)",
              color: "#0ea5e9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Layers size={20} />
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", fontWeight: 600 }}>
              {t("dashboard.avgLoanSize")}
            </div>
            <div className="num" style={{ fontSize: 18, fontWeight: 800, color: "#0ea5e9" }}>
              {formatCurrency(healthMetrics.avgLoan, currency)}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stat Cards */}
      {summaryLoading ? (
        <SkeletonStats />
      ) : (
        <div className="stat-grid">
          <StatCard
            icon={Landmark}
            label={t("dashboard.activeLoans")}
            value={summary?.total_active_loans ?? "0"}
            color="#6366f1"
            link="/loans"
            subtitle={t("dashboard.activeLoansSub")}
          />
          <StatCard
            icon={DollarSign}
            label={t("dashboard.totalDisbursed")}
            value={summary ? formatCurrency(summary.total_disbursed, summary.currency) : formatCurrency(0, currency)}
            color="#059669"
            subtitle={t("dashboard.totalDisbursedSub")}
          />
          <StatCard
            icon={TrendingUp}
            label={t("dashboard.totalCollected")}
            value={summary ? formatCurrency(summary.total_collected, summary.currency) : formatCurrency(0, currency)}
            color="#0284c7"
            subtitle={t("dashboard.totalCollectedSub")}
          />
          <StatCard
            icon={ClipboardCheck}
            label={t("dashboard.pendingApprovals")}
            value={summary?.pending_approvals ?? "0"}
            color="#d97706"
            link="/loans/pending-approval"
            subtitle={t("dashboard.pendingApprovalsSub")}
          />
          <StatCard
            icon={AlertTriangle}
            label={t("dashboard.overdueLoans")}
            value={summary?.overdue_loans ?? "0"}
            color="#dc2626"
            subtitle={t("dashboard.overdueLoansSub")}
          />
          <StatCard
            icon={Users}
            label={t("dashboard.totalClients")}
            value={summary?.total_clients ?? "0"}
            color="#8b5cf6"
            link="/clients"
            subtitle={t("dashboard.totalClientsSub")}
          />
        </div>
      )}

      {/* Main Financial Analytics Center */}
      <div className="card" style={{ padding: 26 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 800, margin: 0 }}>
              {t("dashboard.analyticsTitle")}
            </h2>
            <div style={{ fontSize: 12.5, color: "var(--color-text-muted)", marginTop: 3 }}>
              {t("dashboard.analyticsSub")}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            {/* Metric Selector */}
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value as Metric)}
              style={{ width: "auto", padding: "6px 12px", fontSize: 13, fontWeight: 600 }}
            >
              {(["new_loans", "collections", "disbursed_amount"] as Metric[]).map((m) => (
                <option key={m} value={m}>
                  {metricLabels[m]}
                </option>
              ))}
            </select>

            {/* Time Granularity Tabs */}
            <div className="filter-tabs" style={{ margin: 0 }}>
              {(["week", "month", "year"] as Granularity[]).map((g) => (
                <button
                  key={g}
                  onClick={() => setGranularity(g)}
                  className={`filter-tab${granularity === g ? " active" : ""}`}
                  style={{ padding: "5px 12px", fontSize: 12 }}
                >
                  {t(`dashboard.${g}`)}
                </button>
              ))}
            </div>

            {/* Chart Type Selector (Area / Bar / Line) */}
            <div
              style={{
                display: "flex",
                background: "var(--color-surface-sunken)",
                padding: 3,
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
              }}
            >
              <button
                type="button"
                onClick={() => setChartType("area")}
                className="btn btn-ghost btn-xs"
                style={{
                  background: chartType === "area" ? "var(--color-accent)" : "transparent",
                  color: chartType === "area" ? "#ffffff" : "var(--color-text-muted)",
                  padding: "4px 8px",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                }}
                title={t("dashboard.areaChart")}
              >
                <Activity size={14} />
              </button>
              <button
                type="button"
                onClick={() => setChartType("bar")}
                className="btn btn-ghost btn-xs"
                style={{
                  background: chartType === "bar" ? "var(--color-accent)" : "transparent",
                  color: chartType === "bar" ? "#ffffff" : "var(--color-text-muted)",
                  padding: "4px 8px",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                }}
                title={t("dashboard.barChart")}
              >
                <BarChart2 size={14} />
              </button>
              <button
                type="button"
                onClick={() => setChartType("line")}
                className="btn btn-ghost btn-xs"
                style={{
                  background: chartType === "line" ? "var(--color-accent)" : "transparent",
                  color: chartType === "line" ? "#ffffff" : "var(--color-text-muted)",
                  padding: "4px 8px",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                }}
                title={t("dashboard.lineChart")}
              >
                <TrendingUp size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Analytics Chart */}
        {loading || !series ? (
          <div style={{ height: 320, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <div className="skeleton" style={{ width: "100%", maxWidth: 600, height: 220, borderRadius: "var(--radius)" }} />
              <div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>Loading analytics series...</div>
            </div>
          </div>
        ) : (
          <AnalyticsChart
            points={series.points}
            chartType={chartType}
            metric={metric}
            currency={currency}
          />
        )}
      </div>

      {/* Side-by-Side In-Depth Analytics Section */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: 20,
        }}
      >
        {/* Left: Portfolio Status Composition Donut */}
        <PortfolioDistributionDonut
          activeCount={summary?.total_active_loans ?? 0}
          pendingCount={summary?.pending_approvals ?? 0}
          overdueCount={summary?.overdue_loans ?? 0}
        />

        {/* Right: Credit Committee Approval Queue */}
        <PendingApprovalsQueue />
      </div>

      {/* Smart Loan Simulator Modal */}
      <LoanCalculatorModal
        isOpen={calcOpen}
        onClose={() => setCalcOpen(false)}
        defaultCurrency={currency}
      />
    </div>
  );
}
