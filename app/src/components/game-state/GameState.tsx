import { Toggle } from '@/components/ui/toggle';
import { cn } from '@/lib/utils';
import type { AttackerGameState, DefenderGameState } from '../../types/config';

interface Props {
  attackerState: AttackerGameState;
  defenderState: DefenderGameState;
  onAttackerChange: (state: Partial<AttackerGameState>) => void;
  onDefenderChange: (state: Partial<DefenderGameState>) => void;
}

function GameChip({
  pressed,
  onPressedChange,
  side,
  children,
  className,
}: {
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  side: 'attacker' | 'defender';
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Toggle
      pressed={pressed}
      onPressedChange={onPressedChange}
      className={cn(
        'h-9 rounded-full border border-border px-3.5 text-xs font-semibold data-[state=off]:bg-transparent transition-transform hover:-translate-y-0.5 active:scale-95',
        pressed && side === 'attacker' && 'border-attacker bg-attacker/15 text-attacker',
        pressed && side === 'defender' && 'border-defender bg-defender/15 text-defender',
        className,
      )}
    >
      {children}
    </Toggle>
  );
}

export function GameState({
  attackerState,
  defenderState,
  onAttackerChange,
  onDefenderChange,
}: Props) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <GameChip
          pressed={attackerState.remainedStationary}
          onPressedChange={(v) => onAttackerChange({ remainedStationary: v })}
          side="attacker"
        >
          Stationary
        </GameChip>
        <GameChip
          pressed={attackerState.advanced}
          onPressedChange={(v) => onAttackerChange({ advanced: v })}
          side="attacker"
        >
          Advanced
        </GameChip>
        {attackerState.attackMode === 'melee' && (
          <GameChip
            pressed={attackerState.charged}
            onPressedChange={(v) => onAttackerChange({ charged: v })}
            side="attacker"
          >
            Charged
          </GameChip>
        )}
        {attackerState.attackMode === 'ranged' && (
          <GameChip
            pressed={attackerState.targetInHalfRange}
            onPressedChange={(v) => onAttackerChange({ targetInHalfRange: v })}
            side="attacker"
          >
            Half Range
          </GameChip>
        )}
        <GameChip
          pressed={defenderState.closestTarget}
          onPressedChange={(v) => onDefenderChange({ closestTarget: v })}
          side="defender"
        >
          Closest Unit
        </GameChip>
        {attackerState.attackMode === 'ranged' && (
          <GameChip
            pressed={defenderState.benefitOfCover}
            onPressedChange={(v) => onDefenderChange({ benefitOfCover: v })}
            side="defender"
          >
            Cover
          </GameChip>
        )}
        {attackerState.attackMode === 'ranged' && (
          <GameChip
            pressed={defenderState.stealthAll}
            onPressedChange={(v) => onDefenderChange({ stealthAll: v })}
            side="defender"
          >
            Stealth
          </GameChip>
        )}
        {attackerState.attackMode === 'ranged' && (
          <GameChip
            pressed={attackerState.engagementRange}
            onPressedChange={(v) => onAttackerChange({ engagementRange: v })}
            side="attacker"
          >
            Engagement Range
          </GameChip>
        )}
      </div>
    </div>
  );
}
