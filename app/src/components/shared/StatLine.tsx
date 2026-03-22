import type { RawStats } from "../../types/data";

interface Props {
  stats: RawStats;
  invulnerableSave?: string | null;
}

export function StatLine({ stats, invulnerableSave }: Props) {
  const entries = [
    { label: "M", value: stats.M },
    { label: "T", value: stats.T },
    { label: "Sv", value: stats.Sv },
    { label: "W", value: stats.W },
    { label: "Ld", value: stats.Ld },
    { label: "OC", value: stats.OC },
  ];

  return (
    <div className="stat-line">
      {entries.map((e) => (
        <div key={e.label} className="stat-cell">
          <span className="stat-label">{e.label}</span>
          <span className="stat-value">{e.value}</span>
        </div>
      ))}
      {invulnerableSave && (
        <div className="stat-cell invuln">
          <span className="stat-label">Inv</span>
          <span className="stat-value">{invulnerableSave}</span>
        </div>
      )}
    </div>
  );
}
