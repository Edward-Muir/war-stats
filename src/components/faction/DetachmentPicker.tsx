import type { Detachment } from "../../types/data";

interface Props {
  detachments: Detachment[];
  value: string | null;
  onChange: (name: string) => void;
}

export function DetachmentPicker({ detachments, value, onChange }: Props) {
  if (detachments.length === 0) return null;

  return (
    <div className="picker">
      <label>Detachment</label>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">-- Select Detachment --</option>
        {detachments.map((d) => (
          <option key={d.name} value={d.name}>
            {d.name} ({d.stratagems.length} stratagems)
          </option>
        ))}
      </select>
    </div>
  );
}
