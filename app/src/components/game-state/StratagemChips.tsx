import { Toggle } from '@/components/ui/toggle';
import { cn } from '@/lib/utils';
import type { Stratagem } from '../../types/data';
import type { ActiveStratagem } from '../../types/config';
import { classifyCombatType, resolveStratagemEffect } from '../../logic/stratagem-effects';

interface Props {
  side: 'attacker' | 'defender';
  stratagems: Stratagem[];
  activeStratagems: ActiveStratagem[];
  onToggle: (stratagem: Stratagem) => void;
  attackMode: 'ranged' | 'melee';
}

export function StratagemChips({
  side,
  stratagems,
  activeStratagems,
  onToggle,
  attackMode,
}: Props) {
  const filtered = stratagems.filter((s) => {
    const combatType = classifyCombatType(s.when, s.effect);
    return combatType === 'any' || combatType === attackMode;
  });

  if (filtered.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {filtered.map((strat) => {
        const isActive = activeStratagems.some((a) => a.stratagem.name === strat.name);
        const { isParsed } = resolveStratagemEffect(strat);
        return (
          <Toggle
            key={strat.name}
            pressed={isActive}
            onPressedChange={() => onToggle(strat)}
            title={strat.effect}
            className={cn(
              'h-9 rounded-full border border-border px-3.5 text-xs font-semibold data-[state=off]:bg-transparent transition-transform hover:-translate-y-0.5 active:scale-95',
              isActive && side === 'attacker' && 'border-attacker bg-attacker/15 text-attacker',
              isActive && side === 'defender' && 'border-defender bg-defender/15 text-defender',
              !isParsed && 'opacity-50 border-dashed',
            )}
          >
            {strat.name} {strat.cp_cost}CP
          </Toggle>
        );
      })}
    </div>
  );
}
