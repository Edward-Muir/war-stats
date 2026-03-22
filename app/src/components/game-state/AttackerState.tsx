import type { AttackerGameState } from '../../types/config';

interface Props {
  state: AttackerGameState;
  onChange: (state: Partial<AttackerGameState>) => void;
}

export function AttackerState({ state, onChange }: Props) {
  return (
    <div className="game-state">
      <label>Game State</label>
      <div className="chip-group">
        <button
          type="button"
          className={`chip ${state.remainedStationary ? 'chip--active' : ''}`}
          onClick={() => onChange({ remainedStationary: !state.remainedStationary })}
        >
          Remained Stationary
        </button>
        <button
          type="button"
          className={`chip ${state.advanced ? 'chip--active' : ''}`}
          onClick={() => onChange({ advanced: !state.advanced })}
        >
          Advanced
        </button>
        <button
          type="button"
          className={`chip ${state.charged ? 'chip--active' : ''}`}
          onClick={() => onChange({ charged: !state.charged })}
        >
          Charged
        </button>
      </div>
    </div>
  );
}
