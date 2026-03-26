import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Stratagem } from '../../types/data';
import type { ActiveStratagem } from '../../types/config';

interface Props {
  available: Stratagem[];
  active: ActiveStratagem[];
  onToggle: (stratagem: Stratagem) => void;
}

export function StratagemPicker({ available, active, onToggle }: Props) {
  if (available.length === 0) return null;

  const isActive = (name: string) => active.some((a) => a.stratagem.name === name);

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Stratagems
      </label>
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {available.map((strat) => (
          <Card
            key={strat.name}
            className={cn(
              'cursor-pointer p-3 transition-colors',
              isActive(strat.name) && 'border-warning bg-warning/10',
            )}
            onClick={() => onToggle(strat)}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-sm font-semibold text-foreground flex-1">{strat.name}</span>
              <Badge className="bg-cp text-cp-foreground text-xs">{strat.cp_cost}CP</Badge>
              <span className="text-xs text-muted-foreground">{strat.category}</span>
            </div>
            <div className="space-y-0.5 text-xs text-muted-foreground">
              <div>
                <strong className="text-foreground">When:</strong> {strat.when}
              </div>
              <div>
                <strong className="text-foreground">Target:</strong> {strat.target}
              </div>
              <div>
                <strong className="text-foreground">Effect:</strong> {strat.effect}
              </div>
            </div>
            <Badge variant="outline" className="mt-2 text-warning border-warning/30 text-[0.65rem]">
              Not simulated
            </Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}
