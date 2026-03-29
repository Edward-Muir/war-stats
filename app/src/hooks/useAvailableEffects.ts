import { useMemo } from 'react';
import type { Stratagem } from '../types/data';
import type { FactionData } from './useFilteredStratagems';
import type { EffectKey } from '../logic/effect-keys';
import { deriveAvailableEffects } from '../logic/effect-keys';
import { deriveAvailableRuleEffects } from '../logic/rule-effects';

/**
 * Derives the full set of available effect keys for one side (attacker or defender)
 * by merging stratagem effects with army rule, detachment rule, and enhancement effects.
 */
export function useAvailableEffects(
  stratagems: Stratagem[],
  attackMode: 'ranged' | 'melee',
  factionData: FactionData | undefined,
  detachmentName: string | null
): EffectKey[] {
  const stratagemKeys = useMemo(
    () => deriveAvailableEffects(stratagems, attackMode),
    [stratagems, attackMode]
  );

  const ruleKeys = useMemo(
    () => deriveAvailableRuleEffects(factionData?.rules, detachmentName),
    [factionData?.rules, detachmentName]
  );

  return useMemo(
    () => [...new Set([...stratagemKeys, ...ruleKeys])].sort(),
    [stratagemKeys, ruleKeys]
  );
}
