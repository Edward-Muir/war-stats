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
      <ResultsSummary results={results} />
      <ResultsChart
        stats={results.summary.damage}
        iterations={results.iterations}
        label="Total Damage"
        color="#e74c3c"
      />
      <ResultsChart
        stats={results.summary.modelsKilled}
        iterations={results.iterations}
        label="Models Killed"
        color="#3498db"
      />
    </Overlay>
  );
}
