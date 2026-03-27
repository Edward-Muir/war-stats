import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import type { UnitDatasheet } from '../../types/data';
import { StatLine } from '../shared/StatLine';
import { KeywordBadge } from '../shared/KeywordBadge';

interface Props {
  datasheet: UnitDatasheet;
}

export function UnitInfoCard({ datasheet }: Props) {
  const [open, setOpen] = useState(true);
  const [keywordsOpen, setKeywordsOpen] = useState(false);
  const abilities = datasheet.abilities;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="mb-3 overflow-hidden">
        <CollapsibleTrigger className="flex w-full cursor-pointer items-center justify-between px-3 py-2.5 min-h-11 text-left">
          <span className="text-sm font-semibold text-foreground">{datasheet.name}</span>
          <div className="flex items-center gap-2">
            {datasheet.composition.points.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {datasheet.composition.points[0].points} pts
              </span>
            )}
            <ChevronDown
              className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')}
            />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="px-3 pb-3 pt-0 space-y-3">
            <StatLine stats={datasheet.models[0].stats} invulnerableSave={datasheet.invulnerableSave} />

            {abilities.other.map((ability) => (
              <div key={ability.name} className="space-y-0.5">
                <p className="text-sm font-semibold text-foreground">{ability.name}</p>
                <p className="text-xs text-muted-foreground">{ability.description}</p>
              </div>
            ))}

            {abilities.damaged && (
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-destructive">{abilities.damaged.threshold}</p>
                <p className="text-xs text-muted-foreground">{abilities.damaged.description}</p>
              </div>
            )}

            {abilities.core.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {abilities.core.map((a) => (
                  <KeywordBadge key={a} keyword={a} variant="ability" />
                ))}
              </div>
            )}

            <Collapsible open={keywordsOpen} onOpenChange={setKeywordsOpen}>
              <CollapsibleTrigger className="flex cursor-pointer items-center gap-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-1">
                Keywords
                <ChevronDown
                  className={cn('h-3 w-3 transition-transform', keywordsOpen && 'rotate-180')}
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="flex flex-wrap gap-1 pt-1.5">
                  {datasheet.keywords.map((k) => (
                    <KeywordBadge key={k} keyword={k} variant="unit" />
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
