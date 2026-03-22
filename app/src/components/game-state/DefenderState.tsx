import type { DefenderGameState } from "../../types/config";

interface Props {
  state: DefenderGameState;
  onChange: (state: Partial<DefenderGameState>) => void;
}

export function DefenderState({ state, onChange }: Props) {
  return (
    <div className="game-state">
      <label>Game State</label>
      <div className="toggle-group">
        <label>
          <input
            type="checkbox"
            checked={state.benefitOfCover}
            onChange={(e) => onChange({ benefitOfCover: e.target.checked })}
          />
          Benefit of Cover
        </label>
        <label>
          <input
            type="checkbox"
            checked={state.stealthAll}
            onChange={(e) => onChange({ stealthAll: e.target.checked })}
          />
          Stealth (all models)
        </label>
      </div>
    </div>
  );
}
