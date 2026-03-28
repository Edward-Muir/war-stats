import { useMemo } from 'react';
import type { FactionDatasheets, FactionRules, Stratagem } from '../types/data';
import { filterAttackerStratagems, filterDefenderStratagems } from '../logic/stratagems';

export type FactionData = {
  datasheets: FactionDatasheets;
  rules: FactionRules;
};

/** Filter stratagems for a given side's unit + detachment. */
export function useFilteredStratagems(
  side: 'attacker' | 'defender',
  factionData: FactionData | undefined,
  unitName: string | null,
  detachmentName: string | null,
  chapter: string | null
): Stratagem[] {
  return useMemo(() => {
    if (!factionData || !unitName || !detachmentName) return [];
    const detachment = factionData.rules.detachments.find((d) => d.name === detachmentName);
    const datasheet =
      (chapter && chapter !== 'ADEPTUS ASTARTES'
        ? factionData.datasheets.datasheets.find(
            (d) => d.name === unitName && d.factionKeywords.some((k) => k.toUpperCase() === chapter)
          )
        : undefined) ?? factionData.datasheets.datasheets.find((d) => d.name === unitName);
    if (!detachment || !datasheet) return [];
    return side === 'attacker'
      ? filterAttackerStratagems(detachment, datasheet)
      : filterDefenderStratagems(detachment, datasheet);
  }, [side, factionData, unitName, detachmentName, chapter]);
}
