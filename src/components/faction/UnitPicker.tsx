import { useState, useMemo } from 'react';
import type { UnitDatasheet } from '../../types/data';
import { groupUnitsByCategory } from '../../data/unit-categories';

interface Props {
  units: UnitDatasheet[];
  onChange: (name: string) => void;
}

export function UnitPicker({ units, onChange }: Props) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = useMemo(() => groupUnitsByCategory(units), [units]);

  // Stage 2: show units in active category
  if (activeCategory) {
    const group = categories.find((g) => g.category === activeCategory);
    if (!group) return null;

    return (
      <div className="picker">
        <label>Unit</label>
        <button className="faction-back-btn" onClick={() => setActiveCategory(null)}>
          ◂ {group.displayName}
        </button>
        {group.units.map((u) => (
          <button key={u.name} className="faction-btn" onClick={() => onChange(u.name)}>
            {u.name}
          </button>
        ))}
      </div>
    );
  }

  // Stage 1: show categories
  return (
    <div className="picker">
      <label>Unit</label>
      {categories.map((group) => (
        <button
          key={group.category}
          className="faction-group-btn"
          onClick={() => setActiveCategory(group.category)}
        >
          {group.displayName}
          <span className="faction-count">{group.units.length}</span>
        </button>
      ))}
    </div>
  );
}
