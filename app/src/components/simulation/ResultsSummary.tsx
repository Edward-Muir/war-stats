import type { SimulationResults } from "../../types/simulation";

interface Props {
  results: SimulationResults;
}

export function ResultsSummary({ results }: Props) {
  const { damage, modelsKilled, mortalWounds } = results.summary;

  return (
    <div className="results-summary">
      <h3>Results ({results.iterations.toLocaleString()} iterations)</h3>
      <div className="results-grid">
        <ResultCard
          label="Total Damage"
          mean={damage.mean}
          median={damage.median}
          stdDev={damage.stdDev}
          p10={damage.percentiles.p10}
          p90={damage.percentiles.p90}
        />
        <ResultCard
          label="Models Killed"
          mean={modelsKilled.mean}
          median={modelsKilled.median}
          stdDev={modelsKilled.stdDev}
          p10={modelsKilled.percentiles.p10}
          p90={modelsKilled.percentiles.p90}
        />
        <ResultCard
          label="Mortal Wounds"
          mean={mortalWounds.mean}
          median={mortalWounds.median}
          stdDev={mortalWounds.stdDev}
          p10={mortalWounds.percentiles.p10}
          p90={mortalWounds.percentiles.p90}
        />
      </div>
    </div>
  );
}

function ResultCard({
  label,
  mean,
  median,
  stdDev,
  p10,
  p90,
}: {
  label: string;
  mean: number;
  median: number;
  stdDev: number;
  p10: number;
  p90: number;
}) {
  return (
    <div className="result-card">
      <div className="result-label">{label}</div>
      <div className="result-mean">{mean.toFixed(2)}</div>
      <div className="result-details">
        <span>Median: {median}</span>
        <span>Std: {stdDev.toFixed(2)}</span>
        <span>
          P10–P90: {p10}–{p90}
        </span>
      </div>
    </div>
  );
}
