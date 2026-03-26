import { Card, CardContent } from '@/components/ui/card';
import type { SimulationResults } from '../../types/simulation';

interface Props {
  results: SimulationResults;
}

export function ResultsSummary({ results }: Props) {
  const { damage, modelsKilled, mortalWounds } = results.summary;

  return (
    <div className="grid grid-cols-3 gap-2 mb-4">
      <ResultCard label="Avg Damage" mean={damage.mean} />
      <ResultCard label="Avg Kills" mean={modelsKilled.mean} />
      {mortalWounds.mean > 0 && <ResultCard label="Avg Mortals" mean={mortalWounds.mean} />}
    </div>
  );
}

function ResultCard({ label, mean }: { label: string; mean: number }) {
  return (
    <Card>
      <CardContent className="p-3 text-center">
        <div className="text-[0.65rem] uppercase tracking-wide text-muted-foreground mb-1">
          {label}
        </div>
        <div className="text-xl font-bold tabular-nums">{mean.toFixed(2)}</div>
      </CardContent>
    </Card>
  );
}
