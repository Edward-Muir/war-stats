import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { DistributionStats } from "../../types/simulation";

interface Props {
  stats: DistributionStats;
  label: string;
  color?: string;
}

export function ResultsChart({ stats, label, color = "#e74c3c" }: Props) {
  const data = stats.histogram.map((h) => ({
    value: h.bucket,
    count: h.count,
  }));

  return (
    <div className="results-chart">
      <h4>{label} Distribution</h4>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="value" />
          <YAxis />
          <Tooltip
            formatter={(value) => [String(value), "Count"]}
            labelFormatter={(label) => `${label} damage`}
          />
          <Bar dataKey="count" fill={color} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
