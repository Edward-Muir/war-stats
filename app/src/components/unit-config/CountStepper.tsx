import { Button } from '@/components/ui/button';
import { Minus, Plus } from 'lucide-react';

interface Props {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}

export function CountStepper({ value, min = 0, max = Infinity, onChange }: Props) {
  return (
    <div className="inline-flex items-center" onClick={(e) => e.stopPropagation()}>
      <Button
        variant="outline"
        size="icon"
        className="h-10 w-10 rounded-r-none active:scale-90 transition-transform"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        aria-label="Decrease"
      >
        <Minus className="h-3.5 w-3.5" />
      </Button>
      <span className="flex h-10 min-w-10 items-center justify-center border-y border-border bg-background px-2 text-sm font-semibold tabular-nums">
        {value}
      </span>
      <Button
        variant="outline"
        size="icon"
        className="h-10 w-10 rounded-l-none active:scale-90 transition-transform"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        aria-label="Increase"
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
