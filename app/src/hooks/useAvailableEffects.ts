import { useMemo } from 'react';
import type { Stratagem, UnitDatasheet } from '../types/data';
import type { FactionData } from './useFilteredStratagems';
import type { UnitEffect } from '../types/effects';
import { deriveStratagemUnitEffects } from '../logic/stratagem-effects';
import { deriveRuleUnitEffects } from '../logic/rule-effects';
import { deriveAbilityUnitEffects } from '../logic/ability-effects';

/**
 * Derives the full set of available UnitEffect[] for one side (attacker or defender)
 * by merging stratagem effects, army rule / detachment rule / enhancement effects,
 * and unit ability effects.
 */
export function useAvailableEffects(
  stratagems: Stratagem[],
  attackMode: 'ranged' | 'melee',
  factionData: FactionData | undefined,
  detachmentName: string | null,
  datasheet: UnitDatasheet | null,
  factionSlug: string | null,
  side: 'attacker' | 'defender'
): UnitEffect[] {
  const stratagemEffects = useMemo(
    () => deriveStratagemUnitEffects(stratagems, attackMode, side),
    [stratagems, attackMode, side]
  );

  const ruleEffects = useMemo(
    () => deriveRuleUnitEffects(factionData?.rules, detachmentName, side, datasheet),
    [factionData?.rules, detachmentName, side, datasheet]
  );

  const abilityEffects = useMemo(
    () => (datasheet && factionSlug ? deriveAbilityUnitEffects(datasheet, factionSlug, side) : []),
    [datasheet, factionSlug, side]
  );

  return useMemo(() => {
    const all = [...abilityEffects, ...ruleEffects, ...stratagemEffects];
    // Deduplicate by label — first occurrence wins (abilities → rules → stratagems)
    const seen = new Map<string, UnitEffect>();
    for (const effect of all) {
      if (!seen.has(effect.label)) {
        seen.set(effect.label, effect);
      }
    }
    return Array.from(seen.values());
  }, [abilityEffects, ruleEffects, stratagemEffects]);
}
