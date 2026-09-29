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
} from "recharts";
import type { SeriesPoint } from "../../api/types";
import { formatCurrency } from "../../utils/format";

interface AnalyticsChartProps {
  points: SeriesPoint[];
  chartType: "area" | "bar" | "line";
  metric: "new_loans" | "collections" | "disbursed_amount";
  currency: "USD" | "KHR";
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  metric: string;
  currency: "USD" | "KHR";
}

function CustomTooltip({ active, payload, label, metric, currency }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const rawVal = payload[0].value;
  const isCurrency = metric === "collections" || metric === "disbursed_amount";
  const displayVal = isCurrency ? formatCurrency(rawVal, currency) : `${Number(rawVal).toLocaleString()} loans`;

  return (
    <div
      style={{
        background: "rgba(15, 23, 42, 0.95)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        borderRadius: "var(--radius-md, 10px)",
        padding: "10px 14px",
        boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
        color: "#ffffff",
        minWidth: 150,
      }}
    >
      <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4, fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: "var(--color-accent, #6366f1)",
            display: "inline-block",
            boxShadow: "0 0 8px var(--color-accent, #6366f1)",
          }}
        />
        <span
          className="num"
          style={{
            fontSize: 16,
            fontWeight: 800,
            color: "#38bdf8",
          }}
        >
          {displayVal}
        </span>
      </div>
    </div>
  );
}

export default function AnalyticsChart({ points, chartType, metric, currency }: AnalyticsChartProps) {
  const isCurrency = metric === "collections" || metric === "disbursed_amount";

  const chartData = useMemo(() => {
    return points.map((p) => {
      let formattedDate = p.bucket_start;
      try {
        const d = new Date(p.bucket_start);
        if (!isNaN(d.getTime())) {
          formattedDate = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        }
      } catch {}

      return {
        date: formattedDate,
        fullDate: p.bucket_start,
        value: Number(p.value) || 0,
      };
    });
  }, [points]);

  // Compute Peak, Average, and Total
  const { total, avg, peak } = useMemo(() => {
    if (!chartData.length) return { total: 0, avg: 0, peak: 0 };
    let sum = 0;
    let max = 0;
    for (const d of chartData) {
      sum += d.value;
      if (d.value > max) max = d.value;
    }
    return {
      total: sum,
      avg: sum / chartData.length,
      peak: max,
    };
  }, [chartData]);

  const colorAccent = "var(--color-accent, #6366f1)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Metric Mini Stat Pill Strip */}
      <div
        style={{
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          padding: "12px 18px",
          background: "var(--color-surface-sunken)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div style={{ flex: 1, minWidth: 120 }}>
          <div style={{ fontSize: 11, color: "var(--color-text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
            Total in View
          </div>
          <div className="num" style={{ fontSize: 17, fontWeight: 800, color: "var(--color-accent)", marginTop: 2 }}>
            {isCurrency ? formatCurrency(total, currency) : `${total.toLocaleString()}`}
          </div>
        </div>

        <div style={{ width: 1, background: "var(--color-border)" }} />

        <div style={{ flex: 1, minWidth: 120 }}>
          <div style={{ fontSize: 11, color: "var(--color-text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
            Period Average
          </div>
          <div className="num" style={{ fontSize: 17, fontWeight: 800, color: "var(--color-success, #10b981)", marginTop: 2 }}>
            {isCurrency ? formatCurrency(avg, currency) : `${avg.toFixed(1)}`}
          </div>
        </div>

        <div style={{ width: 1, background: "var(--color-border)" }} />

        <div style={{ flex: 1, minWidth: 120 }}>
          <div style={{ fontSize: 11, color: "var(--color-text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
            Peak Record
          </div>
          <div className="num" style={{ fontSize: 17, fontWeight: 800, color: "var(--color-warning, #f59e0b)", marginTop: 2 }}>
            {isCurrency ? formatCurrency(peak, currency) : `${peak.toLocaleString()}`}
          </div>
        </div>
      </div>

      {/* Main Chart Area */}
      <div style={{ width: "100%", height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "area" ? (
            <AreaChart data={chartData} margin={{ top: 12, right: 16, left: -10, bottom: 8 }}>
              <defs>
                <linearGradient id="analyticsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colorAccent} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={colorAccent} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.6} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fontFamily: "var(--font-sans)", fontWeight: 500, fill: "var(--color-text-muted)" }}
                axisLine={{ stroke: "var(--color-border)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fontFamily: "var(--font-sans)", fontWeight: 500, fill: "var(--color-text-muted)" }}
                axisLine={{ stroke: "var(--color-border)" }}
                tickLine={false}
                tickFormatter={(v) => {
                  if (isCurrency && v >= 1000) {
                    return currency === "KHR" ? `${(v / 1000000).toFixed(1)}M` : `$${(v / 1000).toFixed(0)}k`;
                  }
                  return String(v);
                }}
              />
              <Tooltip content={<CustomTooltip metric={metric} currency={currency} />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={colorAccent}
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#analyticsGradient)"
                dot={{ r: 3, fill: colorAccent, strokeWidth: 1.5, stroke: "#fff" }}
                activeDot={{ r: 6, fill: colorAccent, stroke: "#fff", strokeWidth: 2 }}
              />
            </AreaChart>
          ) : chartType === "bar" ? (
            <BarChart data={chartData} margin={{ top: 12, right: 16, left: -10, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.6} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fontFamily: "var(--font-sans)", fontWeight: 500, fill: "var(--color-text-muted)" }}
                axisLine={{ stroke: "var(--color-border)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fontFamily: "var(--font-sans)", fontWeight: 500, fill: "var(--color-text-muted)" }}
                axisLine={{ stroke: "var(--color-border)" }}
                tickLine={false}
                tickFormatter={(v) => {
                  if (isCurrency && v >= 1000) {
                    return currency === "KHR" ? `${(v / 1000000).toFixed(1)}M` : `$${(v / 1000).toFixed(0)}k`;
                  }
                  return String(v);
                }}
              />
              <Tooltip content={<CustomTooltip metric={metric} currency={currency} />} />
              <Bar
                dataKey="value"
                fill={colorAccent}
                radius={[6, 6, 0, 0]}
                maxBarSize={44}
              />
            </BarChart>
          ) : (
            <LineChart data={chartData} margin={{ top: 12, right: 16, left: -10, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.6} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fontFamily: "var(--font-sans)", fontWeight: 500, fill: "var(--color-text-muted)" }}
                axisLine={{ stroke: "var(--color-border)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fontFamily: "var(--font-sans)", fontWeight: 500, fill: "var(--color-text-muted)" }}
                axisLine={{ stroke: "var(--color-border)" }}
                tickLine={false}
                tickFormatter={(v) => {
                  if (isCurrency && v >= 1000) {
                    return currency === "KHR" ? `${(v / 1000000).toFixed(1)}M` : `$${(v / 1000).toFixed(0)}k`;
                  }
                  return String(v);
                }}
              />
              <Tooltip content={<CustomTooltip metric={metric} currency={currency} />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke={colorAccent}
                strokeWidth={2.5}
                dot={{ r: 3, fill: colorAccent, strokeWidth: 1.5, stroke: "#fff" }}
                activeDot={{ r: 6, fill: colorAccent, stroke: "#fff", strokeWidth: 2 }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
