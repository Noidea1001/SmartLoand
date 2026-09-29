import { useMemo } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { useTranslation } from "react-i18next";
import { PieChart as PieIcon } from "lucide-react";

interface PortfolioDistributionProps {
  activeCount: number;
  pendingCount: number;
  overdueCount: number;
  closedCount?: number;
}

const COLORS = {
  active: "#10b981",    // Emerald
  pending: "#f59e0b",   // Amber
  overdue: "#ef4444",   // Red
  closed: "#6366f1",    // Indigo
};

export default function PortfolioDistributionDonut({
  activeCount,
  pendingCount,
  overdueCount,
  closedCount = 0,
}: PortfolioDistributionProps) {
  const { t } = useTranslation();

  const total = activeCount + pendingCount + overdueCount + closedCount;

  const data = useMemo(() => {
    if (total === 0) {
      return [{ name: "No Data", value: 1, color: "var(--color-border)" }];
    }
    const items = [
      { name: t("common.active"), value: activeCount, color: COLORS.active },
      { name: t("common.pending"), value: pendingCount, color: COLORS.pending },
      { name: t("common.overdue"), value: overdueCount, color: COLORS.overdue },
    ];
    if (closedCount > 0) {
      items.push({ name: "Closed", value: closedCount, color: COLORS.closed });
    }
    return items.filter((i) => i.value > 0);
  }, [activeCount, pendingCount, overdueCount, closedCount, total, t]);

  return (
    <div className="card" style={{ padding: 24, display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <PieIcon size={18} color="var(--color-accent)" />
            <span>{t("dashboard.distributionTitle")}</span>
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--color-text-muted)" }}>
            {t("dashboard.distributionSub")}
          </p>
        </div>
      </div>

      <div style={{ position: "relative", width: "100%", height: 220, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              innerRadius={65}
              outerRadius={95}
              paddingAngle={4}
              dataKey="value"
              animationDuration={800}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
              ))}
            </Pie>
            <Tooltip
              formatter={(val: any, name: any) => [
                `${val} loans (${total > 0 ? ((Number(val) / total) * 100).toFixed(1) : 0}%)`,
                name,
              ]}
              contentStyle={{
                background: "rgba(15, 23, 42, 0.95)",
                borderRadius: "var(--radius-md)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#ffffff",
                fontSize: 12,
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Center Total Counter in the Donut */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            textAlign: "center",
            pointerEvents: "none",
          }}
        >
          <div className="num" style={{ fontSize: 28, fontWeight: 800, lineHeight: 1, color: "var(--color-text)" }}>
            {total}
          </div>
          <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 4, fontWeight: 600, textTransform: "uppercase" }}>
            Total Loans
          </div>
        </div>
      </div>

      {/* Legend & Breakdown Strip */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16 }}>
        <div
          style={{
            padding: "8px 12px",
            borderRadius: "var(--radius-sm)",
            background: "var(--color-surface-sunken)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.active }} />
            <span>{t("common.active")}</span>
          </div>
          <span className="num" style={{ fontSize: 13, fontWeight: 700, color: COLORS.active }}>
            {activeCount}
          </span>
        </div>

        <div
          style={{
            padding: "8px 12px",
            borderRadius: "var(--radius-sm)",
            background: "var(--color-surface-sunken)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.pending }} />
            <span>{t("common.pending")}</span>
          </div>
          <span className="num" style={{ fontSize: 13, fontWeight: 700, color: COLORS.pending }}>
            {pendingCount}
          </span>
        </div>

        <div
          style={{
            padding: "8px 12px",
            borderRadius: "var(--radius-sm)",
            background: "var(--color-surface-sunken)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.overdue }} />
            <span>{t("common.overdue")}</span>
          </div>
          <span className="num" style={{ fontSize: 13, fontWeight: 700, color: COLORS.overdue }}>
            {overdueCount}
          </span>
        </div>

        <div
          style={{
            padding: "8px 12px",
            borderRadius: "var(--radius-sm)",
            background: "var(--color-surface-sunken)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--color-accent)" }} />
            <span>{t("common.total")}</span>
          </div>
          <span className="num" style={{ fontSize: 13, fontWeight: 700 }}>
            {total}
          </span>
        </div>
      </div>
    </div>
  );
}
