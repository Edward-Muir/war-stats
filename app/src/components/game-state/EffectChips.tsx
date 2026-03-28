import { Toggle } from '@/components/ui/toggle';
import { cn } from '@/lib/utils';
import type { EffectKey } from '../../logic/effect-keys';
import { getEffectLabel } from '../../logic/effect-keys';

interface Props {
  side: 'attacker' | 'defender';
  availableEffects: EffectKey[];
  activeEffects: EffectKey[];
  onToggle: (key: EffectKey) => void;
}

export function EffectChips({ side, availableEffects, activeEffects, onToggle }: Props) {
  if (availableEffects.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {availableEffects.map((key) => {
        const isActive = activeEffects.includes(key);
        return (
          <Toggle
            key={key}
            pressed={isActive}
            onPressedChange={() => onToggle(key)}
            className={cn(
              'h-9 rounded-full border border-border px-3.5 text-xs font-semibold data-[state=off]:bg-transparent transition-transform hover:-translate-y-0.5 active:scale-95',
              isActive && side === 'attacker' && 'border-attacker bg-attacker/15 text-attacker',
              isActive && side === 'defender' && 'border-defender bg-defender/15 text-defender'
            )}
          >
            {getEffectLabel(key)}
          </Toggle>
        );
      })}
    </div>
  );
}
