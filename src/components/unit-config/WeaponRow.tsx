import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import type { RawWeapon } from '../../types/data';
import { KeywordBadge } from '../shared/KeywordBadge';
import { CountStepper } from './CountStepper';

interface Props {
  weapon: RawWeapon;
  firingCount?: number;
  maxFiringCount?: number;
  onFiringCountChange?: (count: number) => void;
  enabled?: boolean;
  onToggle?: () => void;
  readOnly?: boolean;
}

export function WeaponRow({
  weapon,
  firingCount,
  maxFiringCount = 0,
  onFiringCountChange,
  enabled,
  onToggle,
  readOnly,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const hasCheckbox = enabled !== undefined && onToggle;
  const hasStepper = firingCount !== undefined && onFiringCountChange;
  const showKeywords = weapon.keywords.length > 0;

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <div className="rounded-md border border-border overflow-hidden">
        <CollapsibleTrigger className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 min-h-10 text-left">
          <span className="flex-1 text-sm text-foreground truncate">{weapon.name}</span>

          {hasCheckbox && !readOnly && (
            <div onClick={(e) => e.stopPropagation()}>
              <Checkbox checked={enabled} onCheckedChange={onToggle} />
            </div>
          )}

          {hasStepper && !readOnly && (
            <CountStepper
              value={firingCount}
              min={0}
              max={maxFiringCount}
              onChange={onFiringCountChange}
            />
          )}

          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
              expanded && 'rotate-180',
            )}
          />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t border-border bg-muted/50 px-3 py-2 space-y-1.5">
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              <span>Range: {weapon.range}</span>
              <span>A: {weapon.A}</span>
              <span>{weapon.type === 'ranged' ? `BS: ${weapon.BS}` : `WS: ${weapon.WS}`}</span>
              <span>S: {weapon.S}</span>
              <span>AP: {weapon.AP}</span>
              <span>D: {weapon.D}</span>
            </div>
            {showKeywords && (
              <div className="flex flex-wrap gap-1">
                {weapon.keywords.map((kw) => (
                  <KeywordBadge key={kw} keyword={kw} variant="weapon" />
                ))}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
