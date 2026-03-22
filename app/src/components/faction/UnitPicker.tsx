import { useState, useMemo } from 'react';
import type { UnitDatasheet } from '../../types/data';
import { groupUnitsByCategory } from '../../data/unit-categories';

interface Props {
  units: UnitDatasheet[];
  value: string | null;
  onChange: (name: string) => void;
  onClear?: () => void;
}

export function UnitPicker({ units, value, onChange, onClear }: Props) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = useMemo(() => groupUnitsByCategory(units), [units]);

  const searchResults = useMemo(() => {
    if (!search) return null;
    const lower = search.toLowerCase();
    return units.filter((u) => u.name.toLowerCase().includes(lower));
  }, [units, search]);

  // Selected unit: show name with Change button
  if (value) {
    const selected = units.find((u) => u.name === value);
    return (
      <div className="picker">
        <label>Unit</label>
        <button
          className="faction-selected-btn"
          onClick={() => {
            onClear?.();
            setActiveCategory(null);
            setSearch('');
          }}
        >
          {selected?.name ?? value}
          <span className="faction-change-hint">Change</span>
        </button>
      </div>
    );
  }

  // Search active: show flat results bypassing categories
  if (searchResults) {
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
        {searchResults.map((u) => (
          <button key={u.name} className="faction-btn" onClick={() => onChange(u.name)}>
            {u.name}
          </button>
        ))}
        {searchResults.length === 0 && (
          <div className="picker-loading">No units match "{search}"</div>
        )}
      </div>
    );
  }

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
        <input
          type="text"
          placeholder="Search units..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
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
      <input
        type="text"
        placeholder="Search units..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="search-input"
      />
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
