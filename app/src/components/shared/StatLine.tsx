import { cn } from '@/lib/utils';
import type { RawStats } from '../../types/data';

interface Props {
  stats: RawStats;
  invulnerableSave?: string | null;
}

export function StatLine({ stats, invulnerableSave }: Props) {
  const entries = [
    { label: 'M', value: stats.M },
    { label: 'T', value: stats.T },
    { label: 'Sv', value: stats.Sv },
    { label: 'W', value: stats.W },
    { label: 'Ld', value: stats.Ld },
    { label: 'OC', value: stats.OC },
  ];

  return (
    <div className="flex gap-1 my-2">
      {entries.map((e) => (
        <div key={e.label} className="flex flex-col items-center px-2 py-1 bg-card rounded-md min-w-9">
          <span className="text-[0.6875rem] text-muted-foreground uppercase">{e.label}</span>
          <span className="text-[0.9375rem] font-bold">{e.value}</span>
        </div>
      ))}
      {invulnerableSave && (
        <div className={cn('flex flex-col items-center px-2 py-1 rounded-md min-w-9 bg-cp text-cp-foreground')}>
          <span className="text-[0.6875rem] uppercase opacity-80">Inv</span>
          <span className="text-[0.9375rem] font-bold">{invulnerableSave}</span>
        </div>
      )}
    </div>
  );
}
