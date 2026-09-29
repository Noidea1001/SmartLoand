import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { SeriesPoint } from "../../api/types";

export default function AnalyticsLineChart({ points }: { points: SeriesPoint[] }) {
  const data = points.map((p) => ({ date: p.bucket_start, value: Number(p.value) }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fontFamily: "var(--font-sans)", fontWeight: 500 }} stroke="var(--color-text-muted)" />
        <YAxis tick={{ fontSize: 11, fontFamily: "var(--font-sans)", fontWeight: 500 }} stroke="var(--color-text-muted)" />
        <Tooltip />
        <Line type="monotone" dataKey="value" stroke="var(--color-accent)" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
