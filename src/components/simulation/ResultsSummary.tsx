import type { SimulationResults } from '../../types/simulation';

interface Props {
  results: SimulationResults;
}

export function ResultsSummary({ results }: Props) {
  const { damage, modelsKilled, mortalWounds } = results.summary;

  return (
    <div className="results-summary">
      <div className="results-grid">
        <ResultCard label="Avg Damage" mean={damage.mean} />
        <ResultCard label="Avg Kills" mean={modelsKilled.mean} />
        {mortalWounds.mean > 0 && <ResultCard label="Avg Mortals" mean={mortalWounds.mean} />}
      </div>
    </div>
  );
}

function ResultCard({ label, mean }: { label: string; mean: number }) {
  return (
    <div className="result-card">
      <div className="result-label">{label}</div>
      <div className="result-mean">{mean.toFixed(2)}</div>
    </div>
  );
}
