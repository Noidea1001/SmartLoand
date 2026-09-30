import { useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { useTranslation } from "react-i18next";
import {
  TrendingUp,
  TrendingDown,
  Layers,
  Activity,
  ArrowUpRight,
  DollarSign,
  Calendar,
  Sparkles,
} from "lucide-react";
import type { SeriesPoint } from "../../api/types";
import { formatCurrency } from "../../utils/format";
import { useBranding } from "../../context/BrandingContext";

interface AnalyticsChartProps {
  points: SeriesPoint[];
  chartType: "area" | "bar" | "line";
  metric: "new_loans" | "collections" | "disbursed_amount";
  currency: "USD" | "KHR";
}

const KM_MONTHS = [
  "មករា",
  "កុម្ភៈ",
  "មីនា",
  "មេសា",
  "ឧសភា",
  "មិថុនា",
  "កក្កដា",
  "សីហា",
  "កញ្ញា",
  "តុលា",
  "វិច្ឆិកា",
  "ធ្នូ",
];

function formatChartDate(dateStr: string, isKm: boolean, isFull = false): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;

    if (isKm) {
      const day = d.getDate();
      const month = KM_MONTHS[d.getMonth()];
      const year = d.getFullYear();
      return isFull ? `${day} ${month} ${year}` : `${day} ${month}`;
    }

    if (isFull) {
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

// Executive metric themes for financial dashboard
const METRIC_THEMES = {
  new_loans: {
    primary: "#6366f1", // Indigo
    secondary: "#818cf8",
    dark: "#4338ca",
    glow: "rgba(99, 102, 241, 0.45)",
    soft: "rgba(99, 102, 241, 0.10)",
    border: "rgba(99, 102, 241, 0.25)",
    labelKh: "កម្ចីថ្មី",
    labelEn: "New Loans",
    unitKh: "កម្ចី",
    unitEn: "loans",
  },
  collections: {
    primary: "#10b981", // Emerald
    secondary: "#34d399",
    dark: "#059669",
    glow: "rgba(16, 185, 129, 0.45)",
    soft: "rgba(16, 185, 129, 0.10)",
    border: "rgba(16, 185, 129, 0.25)",
    labelKh: "ការប្រមូលប្រាក់",
    labelEn: "Repayment Collections",
    unitKh: "",
    unitEn: "",
  },
  disbursed_amount: {
    primary: "#0ea5e9", // Sky / Cyan
    secondary: "#38bdf8",
    dark: "#0284c7",
    glow: "rgba(14, 165, 233, 0.45)",
    soft: "rgba(14, 165, 233, 0.10)",
    border: "rgba(14, 165, 233, 0.25)",
    labelKh: "ទម្លាក់ប្រាក់កម្ចី",
    labelEn: "Disbursed Capital",
    unitKh: "",
    unitEn: "",
  },
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  metric: "new_loans" | "collections" | "disbursed_amount";
  currency: "USD" | "KHR";
  isKm: boolean;
  avgValue: number;
}

function CustomTooltip({ active, payload, label, metric, currency, isKm, avgValue }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const rawVal = Number(payload[0].value) || 0;
  const isCurrency = metric === "collections" || metric === "disbursed_amount";
  const theme = METRIC_THEMES[metric];
  const { usdToKhrRate } = useBranding();
  const effectiveRate = Number(usdToKhrRate) || 4100;

  // Benchmark difference vs period average
  const diffPct = avgValue > 0 ? (((rawVal - avgValue) / avgValue) * 100).toFixed(1) : "0.0";
  const isAbove = Number(diffPct) >= 0;

  // Approximate currency conversion
  const approxConverted = isCurrency
    ? currency === "USD"
      ? `~ ៛${Math.round(rawVal * effectiveRate).toLocaleString()}`
      : `~ $${Math.round((rawVal / effectiveRate) * 100) / 100}`
    : null;

  const displayDate = label ? formatChartDate(label, isKm, true) : "";

  return (
    <div
      style={{
        background: "rgba(15, 23, 42, 0.95)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(255, 255, 255, 0.14)",
        borderRadius: "12px",
        padding: "14px 18px",
        boxShadow: "0 14px 35px rgba(0, 0, 0, 0.4), 0 0 15px " + theme.glow,
        color: "#ffffff",
        minWidth: 210,
      }}
    >
      {/* Date Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 11.5,
          color: "#94a3b8",
          fontWeight: 600,
          marginBottom: 8,
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          paddingBottom: 6,
        }}
      >
        <Calendar size={13} style={{ color: theme.secondary }} />
        <span>{displayDate}</span>
      </div>

      {/* Metric Label & Badge */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: theme.primary,
              display: "inline-block",
              boxShadow: `0 0 8px ${theme.primary}`,
            }}
          />
          <span style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>
            {isKm ? theme.labelKh : theme.labelEn}
          </span>
        </div>

        {/* Above/Below Benchmark Pill */}
        {avgValue > 0 && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: "2px 6px",
              borderRadius: 4,
              background: isAbove ? "rgba(16, 185, 129, 0.18)" : "rgba(239, 68, 68, 0.18)",
              color: isAbove ? "#34d399" : "#f87171",
              border: `1px solid ${isAbove ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
            }}
          >
            {isAbove ? `+${diffPct}%` : `${diffPct}%`}
          </span>
        )}
      </div>

      {/* Primary Value */}
      <div style={{ marginTop: 2 }}>
        <div
          className="num"
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: theme.secondary,
            letterSpacing: "-0.01em",
          }}
        >
          {isCurrency ? formatCurrency(rawVal, currency) : `${rawVal.toLocaleString()} ${isKm ? theme.unitKh : theme.unitEn}`}
        </div>

        {/* Currency Dual Equivalent */}
        {approxConverted && (
          <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500, marginTop: 2 }}>
            <span style={{ color: "#64748b" }}>{isKm ? "សមមូល: " : "Equiv: "}</span>
            <span className="num" style={{ color: "#cbd5e1" }}>{approxConverted}</span>
          </div>
        )}
      </div>

      {/* Benchmark comparison note */}
      {avgValue > 0 && (
        <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 6 }}>
          {isKm
            ? `${isAbove ? "ខ្ពស់ជាង" : "ទាបជាង"} មធ្យមប្រចាំវគ្គ`
            : `${isAbove ? "Above" : "Below"} period baseline`}
        </div>
      )}
    </div>
  );
}

export default function AnalyticsChart({ points, chartType, metric, currency }: AnalyticsChartProps) {
  const { i18n } = useTranslation();
  const isKm = i18n.language === "km";
  const isCurrency = metric === "collections" || metric === "disbursed_amount";
  const theme = METRIC_THEMES[metric];

  // Process data points and localize dates cleanly
  const chartData = useMemo(() => {
    return points.map((p) => {
      const formattedDate = formatChartDate(p.bucket_start, isKm, false);
      return {
        date: formattedDate,
        fullDate: p.bucket_start,
        value: Number(p.value) || 0,
      };
    });
  }, [points, isKm]);

  // Compute Peak, Average, Total, and Peak Date
  const { total, avg, peak, peakDate } = useMemo(() => {
    if (!chartData.length) return { total: 0, avg: 0, peak: 0, peakDate: "" };
    let sum = 0;
    let max = 0;
    let maxDate = "";
    for (const d of chartData) {
      sum += d.value;
      if (d.value >= max) {
        max = d.value;
        maxDate = d.date;
      }
    }
    return {
      total: sum,
      avg: sum / chartData.length,
      peak: max,
      peakDate: maxDate,
    };
  }, [chartData]);

  // Compute Momentum / Trend Delta % between first half and second half
  const momentum = useMemo(() => {
    if (chartData.length < 2) return { pct: "0.0", isPositive: true };
    const mid = Math.floor(chartData.length / 2);
    const firstHalf = chartData.slice(0, mid).reduce((acc, d) => acc + d.value, 0);
    const secondHalf = chartData.slice(mid).reduce((acc, d) => acc + d.value, 0);
    if (firstHalf === 0) {
      return { pct: secondHalf > 0 ? "+100" : "0.0", isPositive: secondHalf >= 0 };
    }
    const delta = ((secondHalf - firstHalf) / firstHalf) * 100;
    return {
      pct: `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`,
      isPositive: delta >= 0,
    };
  }, [chartData]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Executive Financial KPI Metric Ribbon */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 12,
        }}
      >
        {/* Total in View */}
        <div
          style={{
            padding: "14px 18px",
            background: "var(--color-surface-sunken)",
            borderRadius: "var(--radius-lg, 12px)",
            border: "1px solid var(--color-border)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: "var(--color-text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>
              {isKm ? "បរិមាណសរុបក្នុងវគ្គ" : "Total in View"}
            </div>
            <div
              className="num"
              style={{
                fontSize: 19,
                fontWeight: 800,
                color: theme.primary,
                marginTop: 4,
                letterSpacing: "-0.01em",
              }}
            >
              {isCurrency ? formatCurrency(total, currency) : `${total.toLocaleString()} ${isKm ? theme.unitKh : theme.unitEn}`}
            </div>
            <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>
              {isCurrency
                ? (isKm ? "ទំហំហិរញ្ញវត្ថុសរុប" : "Aggregated volume")
                : (isKm ? "កិច្ចសន្យាសរុប" : "Total contracts")}
            </div>
          </div>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: theme.soft,
              color: theme.primary,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: `1px solid ${theme.border}`,
            }}
          >
            {isCurrency ? <DollarSign size={18} /> : <Layers size={18} />}
          </div>
        </div>

        {/* Period Average */}
        <div
          style={{
            padding: "14px 18px",
            background: "var(--color-surface-sunken)",
            borderRadius: "var(--radius-lg, 12px)",
            border: "1px solid var(--color-border)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: "var(--color-text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>
              {isKm ? "មធ្យមភាគប្រចាំវគ្គ" : "Period Average"}
            </div>
            <div
              className="num"
              style={{
                fontSize: 19,
                fontWeight: 800,
                color: "var(--color-success, #10b981)",
                marginTop: 4,
                letterSpacing: "-0.01em",
              }}
            >
              {isCurrency ? formatCurrency(avg, currency) : avg.toFixed(1)}
            </div>
            <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>
              {isKm ? "កម្រិតគោលជាមធ្យម" : "Benchmark baseline"}
            </div>
          </div>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "rgba(16, 185, 129, 0.10)",
              color: "#10b981",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid rgba(16, 185, 129, 0.25)",
            }}
          >
            <Activity size={18} />
          </div>
        </div>

        {/* Peak Record */}
        <div
          style={{
            padding: "14px 18px",
            background: "var(--color-surface-sunken)",
            borderRadius: "var(--radius-lg, 12px)",
            border: "1px solid var(--color-border)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: "var(--color-text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>
              {isKm ? "កម្រិតខ្ពស់បំផុត" : "Peak Record"}
            </div>
            <div
              className="num"
              style={{
                fontSize: 19,
                fontWeight: 800,
                color: "var(--color-warning, #f59e0b)",
                marginTop: 4,
                letterSpacing: "-0.01em",
              }}
            >
              {isCurrency ? formatCurrency(peak, currency) : peak.toLocaleString()}
            </div>
            <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>
              {peakDate ? (isKm ? `ឈានដល់: ${peakDate}` : `Reached: ${peakDate}`) : (isKm ? "កំណត់ត្រាខ្ពស់" : "Peak volume")}
            </div>
          </div>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "rgba(245, 158, 11, 0.10)",
              color: "#f59e0b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid rgba(245, 158, 11, 0.25)",
            }}
          >
            <ArrowUpRight size={18} />
          </div>
        </div>

        {/* Trend Momentum */}
        <div
          style={{
            padding: "14px 18px",
            background: "var(--color-surface-sunken)",
            borderRadius: "var(--radius-lg, 12px)",
            border: "1px solid var(--color-border)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: "var(--color-text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>
              {isKm ? "កំណើននិន្នាការ" : "Trend Momentum"}
            </div>
            <div
              className="num"
              style={{
                fontSize: 19,
                fontWeight: 800,
                color: momentum.isPositive ? "#10b981" : "#ef4444",
                marginTop: 4,
                letterSpacing: "-0.01em",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {momentum.isPositive ? "▲" : "▼"} {momentum.pct}
            </div>
            <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>
              {isKm
                ? (momentum.isPositive ? "និន្នាការកើនឡើង" : "និន្នាការថយចុះ")
                : (momentum.isPositive ? "Accelerating" : "Decelerating")}
            </div>
          </div>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: momentum.isPositive ? "rgba(16, 185, 129, 0.10)" : "rgba(239, 68, 68, 0.10)",
              color: momentum.isPositive ? "#10b981" : "#ef4444",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: `1px solid ${momentum.isPositive ? "rgba(16, 185, 129, 0.25)" : "rgba(239, 68, 68, 0.25)"}`,
            }}
          >
            {momentum.isPositive ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
          </div>
        </div>
      </div>

      {/* Main Interactive Chart Canvas */}
      <div
        style={{
          width: "100%",
          height: 350,
          background: "var(--color-surface)",
          borderRadius: "var(--radius-lg, 12px)",
          padding: "16px 12px 10px 0",
          border: "1px solid var(--color-border)",
          boxShadow: "inset 0 1px 3px rgba(0, 0, 0, 0.02)",
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "area" ? (
            <AreaChart data={chartData} margin={{ top: 14, right: 24, left: 0, bottom: 6 }}>
              <defs>
                <linearGradient id="analyticsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={theme.primary} stopOpacity={0.42} />
                  <stop offset="45%" stopColor={theme.secondary} stopOpacity={0.16} />
                  <stop offset="95%" stopColor={theme.secondary} stopOpacity={0.0} />
                </linearGradient>
                <filter id="areaLineGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor={theme.glow} />
                </filter>
              </defs>
              <CartesianGrid
                strokeDasharray="4 4"
                stroke="var(--color-border)"
                strokeOpacity={0.45}
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11.5, fontFamily: "var(--font-sans)", fontWeight: 600, fill: "var(--color-text-muted)" }}
                axisLine={{ stroke: "var(--color-border)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fontFamily: "var(--font-sans)", fontWeight: 600, fill: "var(--color-text-muted)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => {
                  if (!isCurrency) return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v);
                  if (currency === "KHR") {
                    if (v >= 1000000000) return `${(v / 1000000000).toFixed(1)}B ៛`;
                    if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M ៛`;
                    if (v >= 1000) return `${(v / 1000).toFixed(0)}k ៛`;
                    return `${v} ៛`;
                  }
                  if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
                  if (v >= 1000) return `$${(v / 1000).toFixed(0)}k`;
                  return `$${v}`;
                }}
              />
              <Tooltip
                content={
                  <CustomTooltip
                    metric={metric}
                    currency={currency}
                    isKm={isKm}
                    avgValue={avg}
                  />
                }
              />
              {avg > 0 && (
                <ReferenceLine
                  y={avg}
                  stroke="var(--color-text-muted)"
                  strokeDasharray="4 4"
                  strokeOpacity={0.45}
                  label={{
                    value: `${isKm ? "មធ្យម" : "Avg"}: ${isCurrency ? formatCurrency(avg, currency) : avg.toFixed(1)}`,
                    fill: "var(--color-text-muted)",
                    fontSize: 10.5,
                    position: "insideTopRight",
                    offset: 8,
                    fontWeight: 600,
                  }}
                />
              )}
              <Area
                type="monotone"
                dataKey="value"
                stroke={theme.primary}
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#analyticsGradient)"
                style={{ filter: "url(#areaLineGlow)" }}
                dot={
                  chartData.length > 25
                    ? false
                    : {
                        r: 3.5,
                        fill: theme.primary,
                        strokeWidth: 2,
                        stroke: "#ffffff",
                      }
                }
                activeDot={{
                  r: 6.5,
                  fill: theme.secondary,
                  stroke: "#ffffff",
                  strokeWidth: 2.5,
                  style: { filter: `drop-shadow(0 0 8px ${theme.glow})` },
                }}
                animationDuration={900}
                animationEasing="ease-out"
              />
            </AreaChart>
          ) : chartType === "bar" ? (
            <BarChart data={chartData} margin={{ top: 14, right: 24, left: 0, bottom: 6 }}>
              <defs>
                <linearGradient id="barColumnGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={theme.secondary} stopOpacity={1} />
                  <stop offset="100%" stopColor={theme.dark} stopOpacity={0.9} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="4 4"
                stroke="var(--color-border)"
                strokeOpacity={0.45}
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11.5, fontFamily: "var(--font-sans)", fontWeight: 600, fill: "var(--color-text-muted)" }}
                axisLine={{ stroke: "var(--color-border)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fontFamily: "var(--font-sans)", fontWeight: 600, fill: "var(--color-text-muted)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => {
                  if (!isCurrency) return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v);
                  if (currency === "KHR") {
                    if (v >= 1000000000) return `${(v / 1000000000).toFixed(1)}B ៛`;
                    if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M ៛`;
                    if (v >= 1000) return `${(v / 1000).toFixed(0)}k ៛`;
                    return `${v} ៛`;
                  }
                  if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
                  if (v >= 1000) return `$${(v / 1000).toFixed(0)}k`;
                  return `$${v}`;
                }}
              />
              <Tooltip
                content={
                  <CustomTooltip
                    metric={metric}
                    currency={currency}
                    isKm={isKm}
                    avgValue={avg}
                  />
                }
              />
              {avg > 0 && (
                <ReferenceLine
                  y={avg}
                  stroke="var(--color-text-muted)"
                  strokeDasharray="4 4"
                  strokeOpacity={0.45}
                  label={{
                    value: `${isKm ? "មធ្យម" : "Avg"}: ${isCurrency ? formatCurrency(avg, currency) : avg.toFixed(1)}`,
                    fill: "var(--color-text-muted)",
                    fontSize: 10.5,
                    position: "insideTopRight",
                    offset: 8,
                    fontWeight: 600,
                  }}
                />
              )}
              <Bar
                dataKey="value"
                fill="url(#barColumnGradient)"
                radius={[7, 7, 0, 0]}
                maxBarSize={44}
                animationDuration={900}
                animationEasing="ease-out"
              />
            </BarChart>
          ) : (
            <LineChart data={chartData} margin={{ top: 14, right: 24, left: 0, bottom: 6 }}>
              <defs>
                <filter id="lineFilterGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor={theme.glow} />
                </filter>
              </defs>
              <CartesianGrid
                strokeDasharray="4 4"
                stroke="var(--color-border)"
                strokeOpacity={0.45}
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11.5, fontFamily: "var(--font-sans)", fontWeight: 600, fill: "var(--color-text-muted)" }}
                axisLine={{ stroke: "var(--color-border)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fontFamily: "var(--font-sans)", fontWeight: 600, fill: "var(--color-text-muted)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => {
                  if (!isCurrency) return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v);
                  if (currency === "KHR") {
                    if (v >= 1000000000) return `${(v / 1000000000).toFixed(1)}B ៛`;
                    if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M ៛`;
                    if (v >= 1000) return `${(v / 1000).toFixed(0)}k ៛`;
                    return `${v} ៛`;
                  }
                  if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
                  if (v >= 1000) return `$${(v / 1000).toFixed(0)}k`;
                  return `$${v}`;
                }}
              />
              <Tooltip
                content={
                  <CustomTooltip
                    metric={metric}
                    currency={currency}
                    isKm={isKm}
                    avgValue={avg}
                  />
                }
              />
              {avg > 0 && (
                <ReferenceLine
                  y={avg}
                  stroke="var(--color-text-muted)"
                  strokeDasharray="4 4"
                  strokeOpacity={0.45}
                  label={{
                    value: `${isKm ? "មធ្យម" : "Avg"}: ${isCurrency ? formatCurrency(avg, currency) : avg.toFixed(1)}`,
                    fill: "var(--color-text-muted)",
                    fontSize: 10.5,
                    position: "insideTopRight",
                    offset: 8,
                    fontWeight: 600,
                  }}
                />
              )}
              <Line
                type="monotone"
                dataKey="value"
                stroke={theme.primary}
                strokeWidth={3}
                style={{ filter: "url(#lineFilterGlow)" }}
                dot={
                  chartData.length > 25
                    ? false
                    : {
                        r: 3.5,
                        fill: theme.primary,
                        strokeWidth: 2,
                        stroke: "#ffffff",
                      }
                }
                activeDot={{
                  r: 6.5,
                  fill: theme.secondary,
                  stroke: "#ffffff",
                  strokeWidth: 2.5,
                  style: { filter: `drop-shadow(0 0 8px ${theme.glow})` },
                }}
                animationDuration={900}
                animationEasing="ease-out"
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
