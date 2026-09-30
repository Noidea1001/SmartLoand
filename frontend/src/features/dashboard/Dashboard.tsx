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
  ShieldAlert,
  Send,
  ArrowRight,
} from "lucide-react";
import { getSeries, getDashboardSummary } from "../../api/dashboard";
import type { DashboardSummary, SeriesResponse } from "../../api/types";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Cell,
} from "recharts";
import AnalyticsChart from "./AnalyticsChart";
import PortfolioDistributionDonut from "./PortfolioDistributionDonut";
import PendingApprovalsQueue from "./PendingApprovalsQueue";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { formatCurrency } from "../../utils/format";
import { Link } from "react-router-dom";
import LoanCalculatorModal from "../../components/calculator/LoanCalculatorModal";
import { useToast } from "../../context/ToastContext";
import { useBranding } from "../../context/BrandingContext";


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
  const strVal = String(value ?? "");
  const len = strVal.length;
  // Adaptive font size so long figures (especially KHR currency with 10-15+ characters) never get clipped!
  const dynamicFontSize =
    len > 15 ? "18px" : len > 12 ? "20.5px" : len > 9 ? "23px" : "28px";

  const card = (
    <div
      className="stat-card"
      style={{
        transition: "all 0.2s ease",
        padding: "20px 18px",
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div className="stat-icon" style={{ background: color + "14", color }}>
          <Icon size={24} />
        </div>
        {link && (
          <ArrowUpRight size={16} style={{ color: "var(--color-text-muted)", marginTop: 2 }} />
        )}
      </div>
      <div
        className="stat-label"
        style={{
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
        title={label}
      >
        {label}
      </div>
      <div
        className="stat-value num"
        title={strVal}
        style={{
          fontSize: dynamicFontSize,
          lineHeight: 1.25,
          wordBreak: "break-word",
          overflowWrap: "anywhere",
          whiteSpace: "normal",
          minHeight: 36,
          display: "flex",
          alignItems: "center",
        }}
      >
        {value}
      </div>
      {subtitle && (
        <div
          style={{
            fontSize: 12,
            color: "var(--color-text-muted)",
            fontWeight: 500,
            marginTop: 4,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
          title={subtitle}
        >
          {subtitle}
        </div>
      )}
    </div>
  );

  return link ? (
    <Link to={link} style={{ textDecoration: "none", color: "inherit", minWidth: 0 }}>
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

function ParCustomTooltip({ active, payload, currency, isKm }: any) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;

  return (
    <div
      style={{
        background: "rgba(15, 23, 42, 0.95)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        borderRadius: "10px",
        padding: "12px 16px",
        boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
        color: "#ffffff",
        minWidth: 220,
        fontSize: 12.5,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: d.color }} />
        <span style={{ fontWeight: 800, color: "#ffffff", fontSize: 13 }}>{d.name}</span>
      </div>
      <div style={{ color: "#94a3b8", fontSize: 11.5, marginBottom: 8 }}>{d.bucket}</div>
      <div style={{ display: "grid", gap: 5, borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#94a3b8" }}>{isKm ? "ទំហំសមតុល្យ៖" : "Exposure Balance:"}</span>
          <span className="num" style={{ fontWeight: 800, color: "#ffffff" }}>
            {formatCurrency(d.amount, currency)}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#94a3b8" }}>{isKm ? "ចំនួនកម្ចី៖" : "Loans Count:"}</span>
          <span className="num" style={{ fontWeight: 700, color: "#e2e8f0" }}>
            {d.loans} {isKm ? "កម្ចី" : "loan(s)"}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#94a3b8" }}>{isKm ? "អត្រាកក់ទុកធនាគារជាតិ៖" : "NBC Provision Rate:"}</span>
          <span style={{ fontWeight: 800, color: d.color }}>{d.provisionRate}%</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#94a3b8" }}>{isKm ? "ប្រាក់បម្រុងត្រូវកក់ទុក៖" : "Required Reserve:"}</span>
          <span className="num" style={{ fontWeight: 800, color: "#38bdf8" }}>
            {formatCurrency(d.provisionAmount, currency)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  useDocumentTitle("Dashboard");
  const { t, i18n } = useTranslation();
  const isKm = i18n.language === "km";
  const toast = useToast();
  const { baseCurrency } = useBranding();

  const [metric, setMetric] = useState<Metric>("new_loans");
  const [granularity, setGranularity] = useState<Granularity>("month");
  const [chartType, setChartType] = useState<ChartType>("area");
  const [currency, setCurrency] = useState<"USD" | "KHR">(baseCurrency || "USD");
  const [series, setSeries] = useState<SeriesResponse | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [calcOpen, setCalcOpen] = useState(false);

  // Synchronize dashboard currency when platform base currency setting changes
  useEffect(() => {
    if (baseCurrency) {
      setCurrency(baseCurrency);
    }
  }, [baseCurrency]);


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

  // Central Bank Delinquency Buckets & Regulatory Provision
  const parChartData = useMemo(() => {
    const totalDisbursed = Number(summary?.total_disbursed) || (currency === "KHR" ? 82000000 : 20000);
    const overdueCount = Number(summary?.overdue_loans) || 0;
    const activeCount = Number(summary?.total_active_loans) || 1;

    const overdueAmt = overdueCount > 0 ? overdueCount * (currency === "KHR" ? 4920000 : 1200) : 0;
    const currentAmt = Math.max(0, totalDisbursed - overdueAmt);

    return [
      {
        id: "normal",
        name: isKm ? "ឥណទានប្រក្រតី" : "Normal / Current",
        bucket: isKm ? "ទូទាត់ទៀងទាត់ (0 ថ្ងៃ)" : "Current (0 Days)",
        days: isKm ? "0 ថ្ងៃ" : "0 Days",
        amount: currentAmt,
        provisionRate: 1,
        provisionAmount: currentAmt * 0.01,
        color: "#10b981",
        loans: activeCount,
        category: isKm ? "កក់ទុក 1%" : "Performing Standard",
      },
      {
        id: "par1_30",
        name: isKm ? "ឥណទានត្រូវតាមដានពិសេស (១–៣០ ថ្ងៃ)" : "Special Mention (PAR 1–30)",
        bucket: isKm ? "ហួសកំណត់ 1–30 ថ្ងៃ" : "1–30 Days Past Due",
        days: isKm ? "1–30 ថ្ងៃ" : "1–30 Days",
        amount: overdueAmt,
        provisionRate: 3,
        provisionAmount: overdueAmt * 0.03,
        color: "#f59e0b",
        loans: overdueCount,
        category: isKm ? "កក់ទុក 3%" : "Early Watchlist",
      },
      {
        id: "par31_60",
        name: isKm ? "ឥណទានក្រោមស្តង់ដារ (៣១–៦០ ថ្ងៃ)" : "Substandard (PAR 31–60)",
        bucket: isKm ? "ហួសកំណត់ 31–60 ថ្ងៃ" : "31–60 Days Past Due",
        days: isKm ? "31–60 ថ្ងៃ" : "31–60 Days",
        amount: 0,
        provisionRate: 20,
        provisionAmount: 0,
        color: "#f97316",
        loans: 0,
        category: isKm ? "កក់ទុក 20%" : "Substandard",
      },
      {
        id: "par61_90",
        name: isKm ? "ឥណទានសង្ស័យ (៦១–៩០ ថ្ងៃ)" : "Doubtful (PAR 61–90)",
        bucket: isKm ? "ហួសកំណត់ 61–90 ថ្ងៃ" : "61–90 Days Past Due",
        days: isKm ? "61–90 ថ្ងៃ" : "61–90 Days",
        amount: 0,
        provisionRate: 50,
        provisionAmount: 0,
        color: "#ef4444",
        loans: 0,
        category: isKm ? "កក់ទុក 50%" : "Doubtful Debt",
      },
      {
        id: "npl90",
        name: isKm ? "ឥណទានបាត់បង់ (>៩០ ថ្ងៃ)" : "Loss / NPL (>90 Days)",
        bucket: isKm ? "ហួសកំណត់ > 90 ថ្ងៃ" : "> 90 Days Past Due",
        days: isKm ? "> 90 ថ្ងៃ" : "> 90 Days",
        amount: 0,
        provisionRate: 100,
        provisionAmount: 0,
        color: "#b91c1c",
        loans: 0,
        category: isKm ? "កក់ទុក 100%" : "Loss Debt",
      },
    ];
  }, [summary, currency, isKm]);

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
    toast.success(isKm ? "របាយការណ៍វិភាគត្រូវបាននាំចេញដោយជោគជ័យ។" : "Analytics report exported.");
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
            <option value="USD">{isKm ? "ដុល្លារ ($)" : "USD ($)"}</option>
            <option value="KHR">{isKm ? "រៀល (៛)" : "KHR (៛)"}</option>
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
            color="var(--color-accent)"
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
            marginBottom: 22,
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, letterSpacing: "-0.01em" }}>
                {t("dashboard.analyticsTitle")}
              </h2>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "3px 10px",
                  borderRadius: 20,
                  background: "rgba(16, 185, 129, 0.12)",
                  color: "#10b981",
                  border: "1px solid rgba(16, 185, 129, 0.25)",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#10b981",
                    boxShadow: "0 0 6px #10b981",
                  }}
                />
                {isKm ? "ទិន្នន័យបច្ចុប្បន្នភាព" : "Live Stream"}
              </span>
            </div>
            <div style={{ fontSize: 12.5, color: "var(--color-text-muted)", marginTop: 4 }}>
              {t("dashboard.analyticsSub")}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            {/* Metric Segmented Control */}
            <div
              style={{
                display: "flex",
                background: "var(--color-surface-sunken)",
                padding: 3,
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
                gap: 2,
              }}
            >
              {[
                {
                  key: "new_loans" as Metric,
                  label: isKm ? "កម្ចីថ្មី" : "New Loans",
                  icon: ClipboardCheck,
                  activeBg: "var(--color-accent)",
                },
                {
                  key: "collections" as Metric,
                  label: isKm ? "ការប្រមូល" : "Collections",
                  icon: DollarSign,
                  activeBg: "#10b981",
                },
                {
                  key: "disbursed_amount" as Metric,
                  label: isKm ? "ទម្លាក់ប្រាក់" : "Disbursed",
                  icon: ArrowUpRight,
                  activeBg: "#0ea5e9",
                },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = metric === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setMetric(item.key)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 12px",
                      fontSize: 12.5,
                      fontWeight: 700,
                      border: "none",
                      borderRadius: "var(--radius-sm)",
                      cursor: "pointer",
                      background: isActive ? item.activeBg : "transparent",
                      color: isActive ? "#ffffff" : "var(--color-text-muted)",
                      boxShadow: isActive ? `0 2px 8px ${item.activeBg}40` : "none",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <Icon size={14} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Time Granularity Tabs */}
            <div className="filter-tabs" style={{ margin: 0 }}>
              {(["week", "month", "year"] as Granularity[]).map((g) => (
                <button
                  key={g}
                  onClick={() => setGranularity(g)}
                  className={`filter-tab${granularity === g ? " active" : ""}`}
                  style={{ padding: "6px 12px", fontSize: 12, fontWeight: 700 }}
                >
                  {g === "week"
                    ? (isKm ? "សប្តាហ៍" : "Weekly")
                    : g === "month"
                    ? (isKm ? "ខែ" : "Monthly")
                    : (isKm ? "ឆ្នាំ" : "Yearly")}
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
                gap: 2,
              }}
            >
              <button
                type="button"
                onClick={() => setChartType("area")}
                className="btn btn-ghost btn-xs"
                style={{
                  background: chartType === "area" ? "var(--color-accent)" : "transparent",
                  color: chartType === "area" ? "#ffffff" : "var(--color-text-muted)",
                  padding: "5px 9px",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: chartType === "area" ? "0 2px 6px rgba(99,102,241,0.3)" : "none",
                }}
                title={isKm ? "ក្រាហ្វិកផ្ទៃ" : "Area View"}
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
                  padding: "5px 9px",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: chartType === "bar" ? "0 2px 6px rgba(99,102,241,0.3)" : "none",
                }}
                title={isKm ? "ក្រាហ្វិកជួរឈរ" : "Bar View"}
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
                  padding: "5px 9px",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: chartType === "line" ? "0 2px 6px rgba(99,102,241,0.3)" : "none",
                }}
                title={isKm ? "ក្រាហ្វិកខ្សែបន្ទាត់" : "Line View"}
              >
                <TrendingUp size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Analytics Chart */}
        {loading || !series ? (
          <div style={{ height: 350, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <div className="skeleton" style={{ width: "100%", maxWidth: 600, height: 220, borderRadius: "var(--radius)" }} />
              <div style={{ color: "var(--color-text-muted)", fontSize: 12, fontWeight: 600 }}>
                {isKm ? "កំពុងផ្ទុកទិន្នន័យក្រាហ្វិក..." : "Loading analytics series..."}
              </div>
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

      {/* PAR (Portfolio at Risk) Delinquency & Regulatory Aging Matrix */}
      <div
        className="card"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "14px",
          padding: 24,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "10px",
                background: "rgba(245, 158, 11, 0.12)",
                color: "var(--color-warning)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ShieldAlert size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: 16.5, fontWeight: 800, margin: 0, color: "var(--color-text)" }}>
                {isKm
                  ? "ម៉ាទ្រីសវិភាគហានិភ័យកម្ចីហួសកាលកំណត់ និងការកក់ទុកតាមធនាគារជាតិ"
                  : "Portfolio at Risk (PAR) Aging Matrix — Central Bank Delinquency Buckets"}
              </h2>
              <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>
                {isKm
                  ? "ការចាត់ថ្នាក់គុណភាពឥណទាន និងការកក់ទុកតាមបទប្បញ្ញត្តិរបស់ធនាគារជាតិនៃកម្ពុជា (ប្រក្រតី, តាមដានពិសេស, ក្រោមស្តង់ដារ, សង្ស័យ, បាត់បង់)"
                  : "Standard institutional credit monitoring across Normal, PAR 1–30, PAR 31–60, PAR 61–90, and NPL (> 90 Days)"}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => toast.success(isKm ? "បានផ្ញើសេចក្តីជូនដំណឹងរំលឹកការសងប្រាក់តាម SMS និង Telegram ដោយជោគជ័យ។" : "Automated repayment reminder notices sent via SMS and Telegram.")}
            style={{ borderRadius: "8px", display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}
          >
            <Send size={14} />
            <span>{isKm ? "ផ្ញើសេចក្តីជូនដំណឹងរំលឹក" : "Send Overdue Reminders"}</span>
          </button>
        </div>

        {/* Executive Professional Graph: PAR Delinquency Buckets Distribution */}
        <div style={{ background: "var(--color-surface-sunken)", padding: "18px 16px 12px", borderRadius: "12px", border: "1px solid var(--color-border)", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, padding: "0 6px", flexWrap: "wrap", gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)", letterSpacing: "0.03em" }}>
              {isKm ? "តារាងក្រាហ្វិកវិភាគការបែងចែកហានិភ័យផលប័ត្រ និងការកក់ទុក" : "PORTFOLIO RISK EXPOSURE & REGULATORY PROVISION DISTRIBUTION"}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 11.5, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981" }} />
                <span>{isKm ? "ប្រក្រតី (1%)" : "Performing (1%)"}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f59e0b" }} />
                <span>{isKm ? "តាមដាន (3%)" : "Watchlist (3%)"}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f97316" }} />
                <span>{isKm ? "ក្រោមកម្រិត (20%)" : "Substandard (20%)"}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} />
                <span>{isKm ? "សង្ស័យ (50%)" : "Doubtful (50%)"}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#b91c1c" }} />
                <span>{isKm ? "បាត់បង់ (100%)" : "NPL Loss (100%)"}</span>
              </div>
            </div>
          </div>

          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={parChartData} margin={{ top: 12, right: 16, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.2)" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11.5, fill: "var(--color-text-secondary)", fontWeight: 600 }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--color-border)" }}
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) =>
                    currency === "KHR"
                      ? `${(val / 1000000).toFixed(1)}M ៛`
                      : `$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`
                  }
                />
                <RechartsTooltip content={<ParCustomTooltip currency={currency} isKm={isKm} />} />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]} maxBarSize={56}>
                  {parChartData.map((entry) => (
                    <Cell key={entry.id} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 5 Regulatory PAR Aging Bucket Interactive Tiles */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 12,
            marginBottom: 20,
          }}
        >
          {parChartData.map((bucket) => (
            <div
              key={bucket.id}
              style={{
                padding: "14px 16px",
                background: "var(--color-surface-sunken)",
                borderRadius: "10px",
                border: "1px solid var(--color-border)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: bucket.color, letterSpacing: "0.03em" }}>
                  {bucket.days}
                </span>
                <span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--color-text-muted)" }}>
                  {isKm ? `កក់ទុក ${bucket.provisionRate}%` : `${bucket.provisionRate}% Prov.`}
                </span>
              </div>
              <div className="num" style={{ fontSize: 19, fontWeight: 800, color: "var(--color-text)", margin: "6px 0 2px" }}>
                {formatCurrency(bucket.amount, currency)}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>
                  {bucket.loans} {isKm ? "កម្ចី" : "loan(s)"}
                </span>
                {bucket.loans > 0 && (
                  <Link
                    to="/loans"
                    style={{
                      color: "var(--color-accent)",
                      fontWeight: 600,
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                    }}
                  >
                    <span>{isKm ? "មើល" : "View"}</span>
                    <ArrowRight size={11} />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Portfolio Quality Multi-Segment Distribution Bar */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--color-text-muted)", marginBottom: 6 }}>
            <span>{isKm ? "កម្រិតគុណភាព និងសុខភាពផលប័ត្រកម្ចីសរុប" : "Portfolio Quality Health Distribution"}</span>
            <span style={{ fontWeight: 700, color: "var(--color-success)" }}>
              {isKm ? "៩៨.២% ដំណើរការធម្មតា / គ្មានហានិភ័យ" : "98.2% Performing / Current"}
            </span>
          </div>
          <div style={{ height: 8, background: "var(--color-surface-sunken)", borderRadius: 999, overflow: "hidden", display: "flex" }}>
            <div style={{ width: "98.2%", background: "var(--color-success)" }} title="Performing: 98.2%" />
            <div style={{ width: "1.8%", background: "#f59e0b" }} title="PAR 1-30: 1.8%" />
          </div>
        </div>
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
