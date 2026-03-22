import { useState, useMemo } from "react";
import type { UnitDatasheet } from "../../types/data";

interface Props {
  units: UnitDatasheet[];
  value: string | null;
  onChange: (name: string) => void;
}

export function UnitPicker({ units, value, onChange }: Props) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return units;
    const lower = search.toLowerCase();
    return units.filter((u) => u.name.toLowerCase().includes(lower));
  }, [units, search]);

  return (
    <div className="picker">
      <label>Unit</label>
      <input
        type="text"
        placeholder="Search units..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="search-input"
      />
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        size={8}
        className="unit-list"
      >
        {filtered.map((u) => (
          <option key={u.name} value={u.name}>
            {u.name}
          </option>
        ))}
      </select>
    </div>
  );
}
