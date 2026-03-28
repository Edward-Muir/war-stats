import { Card, CardContent } from '@/components/ui/card';
import { SimulationStatus } from './SimulationControls';
import { ResultsChart } from './ResultsChart';
import type { AppStore } from '../../store/store';

interface Props {
  hasUnits: boolean;
  simulation: AppStore['simulation'];
}

export function StatsPreview({ hasUnits, simulation }: Props) {
  return (
    <section className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-success">Stats</h2>
      <SimulationStatus isRunning={simulation.isRunning} />
      {!hasUnits ? (
        <p className="text-sm text-muted-foreground">
          Select an attacker and defender unit to see results.
        </p>
      ) : simulation.results ? (
        <Card>
          <CardContent className="p-3">
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-muted-foreground">Damage</span>
                <span className="text-2xl font-bold tabular-nums">
                  {simulation.results.summary.damage.mean.toFixed(1)}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-muted-foreground">Models</span>
                <span className="text-2xl font-bold tabular-nums">
                  {simulation.results.summary.modelsKilled.mean.toFixed(1)}
                </span>
              </div>
            </div>
            <ResultsChart
              stats={simulation.results.summary.damage}
              iterations={simulation.results.iterations}
              label="Damage Distribution"
              color="var(--attacker)"
            />
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}
