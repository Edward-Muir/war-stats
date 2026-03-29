import { useState } from 'react';
import { Overlay } from '../layout/Overlay';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { useAppStore } from '../../store/store';
import { BUILTIN_DEFAULTS } from '../../utils/local-storage';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const sectionTitle = 'text-xs font-semibold uppercase tracking-wide text-muted-foreground';

const MIN_ITERATIONS = 10000;
const MAX_ITERATIONS = 1000000;
const STEP = 10000;

function clampIterations(n: number): number {
  return Math.max(MIN_ITERATIONS, Math.min(MAX_ITERATIONS, Math.round(n / STEP) * STEP));
}

/** Inner form that mounts fresh each time the overlay opens, so draft starts from store defaults. */
function SettingsForm({ onClose }: { onClose: () => void }) {
  const defaults = useAppStore((s) => s.defaults);
  const setDefaults = useAppStore((s) => s.setDefaults);
  const resetDefaults = useAppStore((s) => s.resetDefaults);

  const [draftIterations, setDraftIterations] = useState(() =>
    clampIterations(defaults.simulationIterations)
  );

  const handleSave = () => {
    setDefaults({ ...defaults, simulationIterations: draftIterations });
    onClose();
  };

  const handleReset = () => {
    resetDefaults();
    setDraftIterations(BUILTIN_DEFAULTS.simulationIterations);
  };

  return (
    <div className="space-y-5">
      {/* Simulation Settings */}
      <section className="space-y-3">
        <h3 className={sectionTitle}>Simulation</h3>
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-xs text-muted-foreground">Iterations</p>
            <span className="text-sm font-semibold tabular-nums">
              {draftIterations.toLocaleString()}
            </span>
          </div>
          <input
            type="range"
            min={MIN_ITERATIONS}
            max={MAX_ITERATIONS}
            step={STEP}
            value={draftIterations}
            onChange={(e) => setDraftIterations(Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer bg-muted accent-foreground
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:shadow-sm
              [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background
              [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5
              [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-foreground [&::-moz-range-thumb]:shadow-sm
              [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-background [&::-moz-range-thumb]:border-solid"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>10K</span>
            <span>1M</span>
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button className="flex-1" onClick={handleSave}>
          Save
        </Button>
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="h-4 w-4 mr-1.5" />
          Reset
        </Button>
      </div>
    </div>
  );
}

export function SettingsOverlay({ isOpen, onClose }: Props) {
  return (
    <Overlay isOpen={isOpen} onClose={onClose} title="Settings">
      {isOpen && <SettingsForm onClose={onClose} />}
    </Overlay>
  );
}
