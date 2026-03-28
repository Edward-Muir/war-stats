import { Toggle } from '@/components/ui/toggle';
import { cn } from '@/lib/utils';
import type { AttackerGameState, DefenderGameState, GameStateRelevance } from '../../types/config';

interface Props {
  attackerState: AttackerGameState;
  defenderState: DefenderGameState;
  relevance: GameStateRelevance;
  onAttackerChange: (state: Partial<AttackerGameState>) => void;
  onDefenderChange: (state: Partial<DefenderGameState>) => void;
}

function GameChip({
  pressed,
  onPressedChange,
  side,
  children,
  className,
  disabled,
}: {
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  side: 'attacker' | 'defender';
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <Toggle
      pressed={pressed}
      onPressedChange={onPressedChange}
      disabled={disabled}
      className={cn(
        'h-9 rounded-full border border-border px-3.5 text-xs font-semibold data-[state=off]:bg-transparent transition-transform hover:-translate-y-0.5 active:scale-95',
        pressed && side === 'attacker' && 'border-attacker bg-attacker/15 text-attacker',
        pressed && side === 'defender' && 'border-defender bg-defender/15 text-defender',
        disabled && 'opacity-60 cursor-default hover:translate-y-0 active:scale-100',
        className
      )}
    >
      {children}
    </Toggle>
  );
}

export function GameState({
  attackerState,
  defenderState,
  relevance,
  onAttackerChange,
  onDefenderChange,
}: Props) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {relevance.remainedStationary && (
          <GameChip
            pressed={attackerState.remainedStationary}
            onPressedChange={(v) => onAttackerChange({ remainedStationary: v })}
            side="attacker"
          >
            Stationary
          </GameChip>
        )}
        {relevance.advanced && (
          <GameChip
            pressed={attackerState.advanced}
            onPressedChange={(v) => onAttackerChange({ advanced: v })}
            side="attacker"
          >
            Advanced
          </GameChip>
        )}
        {relevance.charged && (
          <GameChip
            pressed={attackerState.charged}
            onPressedChange={(v) => onAttackerChange({ charged: v })}
            side="attacker"
          >
            Charged
          </GameChip>
        )}
        {relevance.targetInHalfRange && (
          <GameChip
            pressed={attackerState.targetInHalfRange}
            onPressedChange={(v) => onAttackerChange({ targetInHalfRange: v })}
            side="attacker"
          >
            Half Range
          </GameChip>
        )}
        {relevance.closestTarget && (
          <GameChip
            pressed={defenderState.closestTarget}
            onPressedChange={(v) => onDefenderChange({ closestTarget: v })}
            side="defender"
          >
            Closest Unit
          </GameChip>
        )}
        {relevance.benefitOfCover && (
          <GameChip
            pressed={defenderState.benefitOfCover}
            onPressedChange={(v) => onDefenderChange({ benefitOfCover: v })}
            side="defender"
          >
            Cover
          </GameChip>
        )}
        {relevance.stealthAll === 'locked' ? (
          <GameChip pressed={true} onPressedChange={() => {}} side="defender" disabled>
            Stealth (always)
          </GameChip>
        ) : relevance.stealthAll ? (
          <GameChip
            pressed={defenderState.stealthAll}
            onPressedChange={(v) => onDefenderChange({ stealthAll: v })}
            side="defender"
          >
            Stealth
          </GameChip>
        ) : null}
        {relevance.engagementRange && (
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
