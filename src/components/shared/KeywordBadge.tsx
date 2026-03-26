import { cn } from '@/lib/utils';

interface Props {
  keyword: string;
  variant?: 'unit' | 'faction' | 'weapon' | 'ability';
}

const variantStyles = {
  unit: 'bg-[var(--keyword-unit-bg)] text-[var(--keyword-unit-fg)] border-[var(--keyword-unit-fg)]/20',
  faction: 'bg-[var(--keyword-faction-bg)] text-[var(--keyword-faction-fg)] border-[var(--keyword-faction-fg)]/20',
  weapon: 'bg-[var(--keyword-weapon-bg)] text-[var(--keyword-weapon-fg)] border-[var(--keyword-weapon-fg)]/20',
  ability: 'bg-[var(--keyword-ability-bg)] text-[var(--keyword-ability-fg)] border-[var(--keyword-ability-fg)]/20',
} as const;

export function KeywordBadge({ keyword, variant = 'unit' }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium',
        variantStyles[variant],
      )}
    >
      {keyword}
    </span>
  );
}
