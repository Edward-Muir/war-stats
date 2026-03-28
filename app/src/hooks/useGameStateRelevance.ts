import { useMemo } from 'react';
import { useAppStore } from '../store/store';
import type { Stratagem } from '../types/data';
import type { GameStateRelevance } from '../types/config';
import { computeGameStateRelevance } from '../logic/game-state-relevance';
import type { FactionData } from './useFilteredStratagems';

/** Derive which game state toggles are relevant for the current unit/weapon selection. */
export function useGameStateRelevance(
  attackerStratagems: Stratagem[],
  defenderStratagems: Stratagem[],
  attackMode: 'ranged' | 'melee',
  attackerFactionData: FactionData | undefined,
  attackerUnitName: string | null,
  defenderFactionData: FactionData | undefined,
  defenderUnitName: string | null
): GameStateRelevance {
  const selectedWeapons = useAppStore((s) => s.attacker.selectedWeapons);
  return useMemo(() => {
    const attackerDatasheet = attackerFactionData?.datasheets.datasheets.find(
      (d) => d.name === attackerUnitName
    );
    const attackerKeywords = [
      ...(attackerDatasheet?.keywords ?? []),
      ...(attackerDatasheet?.factionKeywords ?? []),
    ];
    const defenderDatasheet = defenderFactionData?.datasheets.datasheets.find(
      (d) => d.name === defenderUnitName
    );
    return computeGameStateRelevance(
      selectedWeapons,
      attackerStratagems,
      defenderStratagems,
      attackMode,
      attackerKeywords,
      defenderDatasheet?.abilities ?? null
    );
  }, [
    selectedWeapons,
    attackerStratagems,
    defenderStratagems,
    attackMode,
    attackerFactionData,
    attackerUnitName,
    defenderFactionData,
    defenderUnitName,
  ]);
}
