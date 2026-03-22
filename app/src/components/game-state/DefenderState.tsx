import type { DefenderGameState } from '../../types/config';

interface Props {
  state: DefenderGameState;
  onChange: (state: Partial<DefenderGameState>) => void;
}

export function DefenderState({ state, onChange }: Props) {
  return (
    <div className="game-state">
      <label>Game State</label>
      <div className="chip-group">
        <button
          type="button"
          className={`chip ${state.benefitOfCover ? 'chip--active' : ''}`}
          onClick={() => onChange({ benefitOfCover: !state.benefitOfCover })}
        >
          Benefit of Cover
        </button>
        <button
          type="button"
          className={`chip ${state.stealthAll ? 'chip--active' : ''}`}
          onClick={() => onChange({ stealthAll: !state.stealthAll })}
        >
          Stealth (all models)
        </button>
      </div>
    </div>
  );
}
