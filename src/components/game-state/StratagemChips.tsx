import type { Stratagem } from '../../types/data';
import type { ActiveStratagem } from '../../types/config';
import { classifyCombatType, resolveStratagemEffect } from '../../logic/stratagem-effects';

interface Props {
  side: 'attacker' | 'defender';
  stratagems: Stratagem[];
  activeStratagems: ActiveStratagem[];
  onToggle: (stratagem: Stratagem) => void;
  attackMode: 'ranged' | 'melee';
}

export function StratagemChips({
  side,
  stratagems,
  activeStratagems,
  onToggle,
  attackMode,
}: Props) {
  // Filter by combat type relevance
  const filtered = stratagems.filter((s) => {
    const combatType = classifyCombatType(s.when, s.effect);
    return combatType === 'any' || combatType === attackMode;
  });

  if (filtered.length === 0) return null;

  const sideClass = side === 'attacker' ? 'chip--attacker' : 'chip--defender';

  return (
    <div className="chip-row">
      {filtered.map((strat) => {
        const isActive = activeStratagems.some((a) => a.stratagem.name === strat.name);
        const { isParsed } = resolveStratagemEffect(strat);
        return (
          <button
            key={strat.name}
            type="button"
            className={`chip ${sideClass} ${isActive ? 'chip--active' : ''} ${!isParsed ? 'chip--unparsed' : ''}`}
            onClick={() => onToggle(strat)}
            title={strat.effect}
          >
            {strat.name} {strat.cp_cost}CP
          </button>
        );
      })}
    </div>
  );
}
