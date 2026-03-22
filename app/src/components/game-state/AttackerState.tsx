import type { AttackerGameState } from "../../types/config";

interface Props {
  state: AttackerGameState;
  onChange: (state: Partial<AttackerGameState>) => void;
}

export function AttackerState({ state, onChange }: Props) {
  return (
    <div className="game-state">
      <label>Game State</label>
      <div className="toggle-group">
        <label>
          <input
            type="checkbox"
            checked={state.remainedStationary}
            onChange={(e) => onChange({ remainedStationary: e.target.checked })}
          />
          Remained Stationary
        </label>
        <label>
          <input
            type="checkbox"
            checked={state.advanced}
            onChange={(e) => onChange({ advanced: e.target.checked })}
          />
          Advanced
        </label>
        <label>
          <input
            type="checkbox"
            checked={state.charged}
            onChange={(e) => onChange({ charged: e.target.checked })}
          />
          Charged
        </label>
      </div>
    </div>
  );
}
