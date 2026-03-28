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

export function ResultsChart({ stats, iterations, label, color = 'var(--attacker)' }: Props) {
  const raw = stats.histogram.map((h) => ({
    value: h.bucket,
    pct: (h.count / iterations) * 100,
  }));

  const data = raw.map((item, i) => {
    const cumulativePct = raw.slice(i).reduce((sum, r) => sum + r.pct, 0);
    return {
      ...item,
      cumulativePct: Math.round(cumulativePct * 10) / 10,
      pct: Math.round(item.pct * 10) / 10,
    };
  });

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-muted-foreground">{label}</h4>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="value" stroke="var(--muted-foreground)" fontSize={11} />
          <YAxis
            stroke="var(--muted-foreground)"
            fontSize={11}
            tickFormatter={(v) => `${v}%`}
            width={40}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '0.5rem',
              color: 'var(--foreground)',
            }}
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
            stroke="var(--success)"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
