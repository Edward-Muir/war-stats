import { Overlay } from '../layout/Overlay';
import { ResultsSummary } from '../simulation/ResultsSummary';
import { ResultsChart } from '../simulation/ResultsChart';
import { useAppStore } from '../../store/store';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function StatsOverlay({ isOpen, onClose }: Props) {
  const results = useAppStore((s) => s.simulation.results);

  if (!results) return null;

  return (
    <Overlay isOpen={isOpen} onClose={onClose} title="Detailed Results">
      <div className="space-y-6">
        <ResultsSummary results={results} />
        <ResultsChart
          stats={results.summary.damage}
          iterations={results.iterations}
          label="Total Damage"
          color="var(--attacker)"
        />
        <ResultsChart
          stats={results.summary.modelsKilled}
          iterations={results.iterations}
          label="Models Killed"
          color="var(--defender)"
        />
      </div>
    </Overlay>
  );
}
