import type { AttackerGameState, DefenderGameState } from '../../types/config';

interface Props {
  attackerState: AttackerGameState;
  defenderState: DefenderGameState;
  onAttackerChange: (state: Partial<AttackerGameState>) => void;
  onDefenderChange: (state: Partial<DefenderGameState>) => void;
}

export function GameState({
  attackerState,
  defenderState,
  onAttackerChange,
  onDefenderChange,
}: Props) {
  return (
    <div className="chip-row">
      <button
        type="button"
        className={`chip chip--attacker ${attackerState.remainedStationary ? 'chip--active' : ''}`}
        onClick={() => onAttackerChange({ remainedStationary: !attackerState.remainedStationary })}
      >
        Stationary
      </button>
      <button
        type="button"
        className={`chip chip--attacker ${attackerState.advanced ? 'chip--active' : ''}`}
        onClick={() => onAttackerChange({ advanced: !attackerState.advanced })}
      >
        Advanced
      </button>
      {attackerState.attackMode === 'melee' && (
        <button
          type="button"
          className={`chip chip--attacker ${attackerState.charged ? 'chip--active' : ''}`}
          onClick={() => onAttackerChange({ charged: !attackerState.charged })}
        >
          Charged
        </button>
      )}
      {attackerState.attackMode === 'ranged' && (
        <button
          type="button"
          className={`chip chip--attacker ${attackerState.targetInHalfRange ? 'chip--active' : ''}`}
          onClick={() => onAttackerChange({ targetInHalfRange: !attackerState.targetInHalfRange })}
        >
          Half Range
        </button>
      )}
      <button
        type="button"
        className={`chip chip--defender ${defenderState.closestTarget ? 'chip--active' : ''}`}
        onClick={() => onDefenderChange({ closestTarget: !defenderState.closestTarget })}
      >
        Closest Unit
      </button>
      {attackerState.attackMode === 'ranged' && (
        <button
          type="button"
          className={`chip chip--defender ${defenderState.benefitOfCover ? 'chip--active' : ''}`}
          onClick={() => onDefenderChange({ benefitOfCover: !defenderState.benefitOfCover })}
        >
          Cover
        </button>
      )}
      {attackerState.attackMode === 'ranged' && (
        <button
          type="button"
          className={`chip chip--defender ${defenderState.stealthAll ? 'chip--active' : ''}`}
          onClick={() => onDefenderChange({ stealthAll: !defenderState.stealthAll })}
        >
          Stealth
        </button>
      )}
    </div>
  );
}
