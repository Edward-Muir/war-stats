interface Props {
  iterations: number;
  isRunning: boolean;
  canRun: boolean;
  onIterationsChange: (n: number) => void;
  onRun: () => void;
}

export function SimulationControls({
  iterations,
  isRunning,
  canRun,
  onIterationsChange,
  onRun,
}: Props) {
  return (
    <div className="simulation-controls">
      <label>
        Iterations:
        <input
          type="number"
          min={100}
          max={100000}
          step={1000}
          value={iterations}
          onChange={(e) => onIterationsChange(parseInt(e.target.value, 10) || 10000)}
          disabled={isRunning}
        />
      </label>
      <button
        className="run-button"
        onClick={onRun}
        disabled={isRunning || !canRun}
      >
        {isRunning ? "Simulating..." : "Run Simulation"}
      </button>
    </div>
  );
}
