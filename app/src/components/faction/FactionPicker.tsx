import { useFactionIndex } from "../../data/hooks";

interface Props {
  value: string | null;
  onChange: (slug: string) => void;
  label: string;
}

export function FactionPicker({ value, onChange, label }: Props) {
  const { index, loading } = useFactionIndex();

  if (loading || !index) return <div className="picker-loading">Loading factions...</div>;

  return (
    <div className="picker">
      <label>{label}</label>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">-- Select Faction --</option>
        {index.factions.map((f) => (
          <option key={f.slug} value={f.slug}>
            {f.faction} ({f.datasheet_count} units)
          </option>
        ))}
      </select>
    </div>
  );
}
