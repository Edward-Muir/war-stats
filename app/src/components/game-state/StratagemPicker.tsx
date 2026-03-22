import type { Stratagem } from "../../types/data";
import type { ActiveStratagem } from "../../types/config";

interface Props {
  available: Stratagem[];
  active: ActiveStratagem[];
  onToggle: (stratagem: Stratagem) => void;
}

export function StratagemPicker({ available, active, onToggle }: Props) {
  if (available.length === 0) return null;

  const isActive = (name: string) =>
    active.some((a) => a.stratagem.name === name);

  return (
    <div className="stratagem-picker">
      <label>Stratagems</label>
      <div className="stratagem-list">
        {available.map((strat) => (
          <div
            key={strat.name}
            className={`stratagem-card ${isActive(strat.name) ? "active" : ""}`}
            onClick={() => onToggle(strat)}
          >
            <div className="stratagem-header">
              <span className="stratagem-name">{strat.name}</span>
              <span className="stratagem-cp">{strat.cp_cost}CP</span>
              <span className="stratagem-category">{strat.category}</span>
            </div>
            <div className="stratagem-details">
              <div><strong>When:</strong> {strat.when}</div>
              <div><strong>Target:</strong> {strat.target}</div>
              <div><strong>Effect:</strong> {strat.effect}</div>
            </div>
            <div className="stratagem-badge">Not simulated</div>
          </div>
        ))}
      </div>
    </div>
  );
}
