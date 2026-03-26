import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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

  if (loading || !index)
    return <div className="py-8 text-center text-sm text-muted-foreground">Loading factions...</div>;

  const factionLookup = new Map<string, FactionIndexEntry>(
    index.factions.map((f) => [f.faction.toLowerCase(), f]),
  );

  // Stage 2: factions within a super-faction
  if (activeSuperFaction) {
    const superFaction = SUPER_FACTIONS.find((sf) => sf.id === activeSuperFaction);
    if (!superFaction) return null;

    const matchingFactions = superFaction.factions
      .map((name) => factionLookup.get(name.toLowerCase()))
      .filter((f): f is FactionIndexEntry => f != null);

    const chapters = superFaction.chapters ?? [];

    return (
      <div className="space-y-1">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </label>
        <Button
          variant="ghost"
          className="w-full justify-start gap-1 h-11 px-3 text-sm text-muted-foreground"
          onClick={() => setActiveSuperFaction(null)}
        >
          <ChevronLeft className="h-4 w-4" />
          {superFaction.name}
        </Button>
        {matchingFactions.map((f) => (
          <Button
            key={f.slug}
            variant="ghost"
            className="w-full justify-between h-11 px-3 text-sm"
            onClick={() => onChange(f.slug)}
          >
            {f.faction}
            <Badge variant="secondary" className="text-xs">
              {f.datasheet_count}
            </Badge>
          </Button>
        ))}
        {chapters.map((ch) => (
          <Button
            key={ch.name}
            variant="ghost"
            className="w-full justify-between h-11 px-3 text-sm"
            onClick={() => onChange(ch.factionSlug, ch.chapterKeyword)}
          >
            {ch.name}
            {ch.unitCount != null && (
              <Badge variant="secondary" className="text-xs">
                {ch.unitCount}
              </Badge>
            )}
          </Button>
        ))}
      </div>
    );
  }

  // Stage 1: super-factions
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {SUPER_FACTIONS.map((sf) => {
        const factionCount = sf.factions.filter((name) =>
          factionLookup.has(name.toLowerCase()),
        ).length;
        const count = factionCount + (sf.chapters?.length ?? 0);
        return (
          <Button
            key={sf.id}
            variant="ghost"
            className="w-full justify-between h-11 px-3 text-sm"
            onClick={() => setActiveSuperFaction(sf.id)}
          >
            {sf.name}
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {count}
              </Badge>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </Button>
        );
      })}
    </div>
  );
}
