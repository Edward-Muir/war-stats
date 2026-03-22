import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { DistributionStats } from '../../types/simulation';

interface Props {
  stats: DistributionStats;
  iterations: number;
  label: string;
  color?: string;
}

export function ResultsChart({ stats, iterations, label, color = '#e74c3c' }: Props) {
  // Convert counts to percentages and compute cumulative "X or more"
  const raw = stats.histogram.map((h) => ({
    value: h.bucket,
    pct: (h.count / iterations) * 100,
  }));

  // Cumulative from right: chance of getting this value or more
  const data = raw.map((item, i) => {
    const cumulativePct = raw.slice(i).reduce((sum, r) => sum + r.pct, 0);
    return {
      ...item,
      cumulativePct: Math.round(cumulativePct * 10) / 10,
      pct: Math.round(item.pct * 10) / 10,
    };
  });

  return (
    <div className="results-chart">
      <h4>{label}</h4>
      <ResponsiveContainer width="100%" height={250}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" />
          <XAxis dataKey="value" stroke="#999" />
          <YAxis stroke="#999" tickFormatter={(v) => `${v}%`} />
          <Tooltip
            contentStyle={{ backgroundColor: '#1E1E1E', border: '1px solid #444' }}
            formatter={(value, name) => {
              if (name === 'pct') return [`${value}%`, 'Chance'];
              return [`${value}%`, 'This or better'];
            }}
            labelFormatter={(l) => `${label}: ${l}`}
          />
          <Bar dataKey="pct" fill={color} />
          <Line
            dataKey="cumulativePct"
            type="monotone"
            stroke="#2ecc71"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
