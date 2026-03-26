import { useState } from 'react';
import { useFactionIndex } from '../../data/hooks';
import { SUPER_FACTIONS } from '../../data/super-factions';
import type { FactionIndexEntry } from '../../types/data';

interface Props {
  onChange: (slug: string, chapterKeyword?: string) => void;
  label: string;
}

export function FactionPicker({ onChange, label }: Props) {
  const { index, loading } = useFactionIndex();
  const [activeSuperFaction, setActiveSuperFaction] = useState<string | null>(null);

  if (loading || !index) return <div className="picker-loading">Loading factions...</div>;

  // Build a lookup from faction name (lowercase) to index entry
  const factionLookup = new Map<string, FactionIndexEntry>(
    index.factions.map((f) => [f.faction.toLowerCase(), f])
  );

  // Stage 2: show factions within the selected super-faction
  if (activeSuperFaction) {
    const superFaction = SUPER_FACTIONS.find((sf) => sf.id === activeSuperFaction);
    if (!superFaction) return null;

    const matchingFactions = superFaction.factions
      .map((name) => factionLookup.get(name.toLowerCase()))
      .filter((f): f is FactionIndexEntry => f != null);

    const chapters = superFaction.chapters ?? [];

    return (
      <div className="picker">
        <label>{label}</label>
        <button className="faction-back-btn" onClick={() => setActiveSuperFaction(null)}>
          ◂ {superFaction.name}
        </button>
        {matchingFactions.map((f) => (
          <button key={f.slug} className="faction-btn" onClick={() => onChange(f.slug)}>
            {f.faction}
            <span className="faction-count">{f.datasheet_count} units</span>
          </button>
        ))}
        {chapters.map((ch) => (
          <button
            key={ch.name}
            className="faction-btn"
            onClick={() => onChange(ch.factionSlug, ch.chapterKeyword)}
          >
            {ch.name}
            {ch.unitCount != null && <span className="faction-count">{ch.unitCount} unique</span>}
          </button>
        ))}
      </div>
    );
  }

  // Stage 1: show super-factions
  return (
    <div className="picker">
      <label>{label}</label>
      {SUPER_FACTIONS.map((sf) => {
        const factionCount = sf.factions.filter((name) =>
          factionLookup.has(name.toLowerCase())
        ).length;
        const count = factionCount + (sf.chapters?.length ?? 0);
        return (
          <button
            key={sf.id}
            className="faction-group-btn"
            onClick={() => setActiveSuperFaction(sf.id)}
          >
            {sf.name}
            <span className="faction-count">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
