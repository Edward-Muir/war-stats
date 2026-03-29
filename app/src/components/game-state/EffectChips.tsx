import { Toggle } from '@/components/ui/toggle';
import { cn } from '@/lib/utils';
import type { UnitEffect } from '../../types/effects';

interface Props {
  side: 'attacker' | 'defender';
  availableEffects: UnitEffect[];
  activeEffectIds: string[];
  onToggle: (id: string) => void;
}

export function EffectChips({ side, availableEffects, activeEffectIds, onToggle }: Props) {
  if (availableEffects.length === 0) return null;

  return (
    <>
      {availableEffects.map((effect) => {
        const isActive = activeEffectIds.includes(effect.id);
        const isLocked = effect.activation === 'always';
        return (
          <Toggle
            key={effect.id}
            pressed={isActive}
            onPressedChange={() => !isLocked && onToggle(effect.id)}
            disabled={isLocked}
            title={effect.source}
            className={cn(
              'h-9 rounded-full border border-border px-3.5 text-xs font-semibold data-[state=off]:bg-transparent transition-transform hover:-translate-y-0.5 active:scale-95',
              isActive && side === 'attacker' && 'border-attacker bg-attacker/15 text-attacker',
              isActive && side === 'defender' && 'border-defender bg-defender/15 text-defender',
              isLocked && 'opacity-80 cursor-default ring-1 ring-inset ring-current/20'
            )}
          >
            {effect.label}
          </Toggle>
        );
      })}
    </>
  );
}
