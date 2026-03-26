import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { UnitDatasheet } from '../../types/data';
import { groupUnitsByCategory } from '../../data/unit-categories';

interface Props {
  units: UnitDatasheet[];
  onChange: (name: string) => void;
}

export function UnitPicker({ units, onChange }: Props) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = useMemo(() => groupUnitsByCategory(units), [units]);

  // Stage 2: units in selected category
  if (activeCategory) {
    const group = categories.find((g) => g.category === activeCategory);
    if (!group) return null;

    return (
      <div className="space-y-1">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Unit
        </label>
        <Button
          variant="ghost"
          className="w-full justify-start gap-1 h-11 px-3 text-sm text-muted-foreground"
          onClick={() => setActiveCategory(null)}
        >
          <ChevronLeft className="h-4 w-4" />
          {group.displayName}
        </Button>
        {group.units.map((u) => (
          <Button
            key={u.name}
            variant="ghost"
            className="w-full justify-start h-11 px-3 text-sm"
            onClick={() => onChange(u.name)}
          >
            {u.name}
          </Button>
        ))}
      </div>
    );
  }

  // Stage 1: categories
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Unit
      </label>
      {categories.map((group) => (
        <Button
          key={group.category}
          variant="ghost"
          className="w-full justify-between h-11 px-3 text-sm"
          onClick={() => setActiveCategory(group.category)}
        >
          {group.displayName}
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {group.units.length}
            </Badge>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </Button>
      ))}
    </div>
  );
}
