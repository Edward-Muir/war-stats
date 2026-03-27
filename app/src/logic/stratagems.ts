import type { Detachment, Stratagem, UnitDatasheet } from "../types/data";
import { matchesAnyTargetKeyword } from "../utils/keyword-match";

/**
 * Filter stratagems from a detachment that apply to a given unit.
 * Uses target_keywords matching (OR logic with compound keyword decomposition).
 */
export function filterStratagems(
  detachment: Detachment,
  unit: UnitDatasheet,
): Stratagem[] {
  return detachment.stratagems.filter((strat) =>
    matchesAnyTargetKeyword(
      strat.target_keywords,
      unit.keywords,
      unit.factionKeywords,
    ),
  );
}

/**
 * Filter stratagems that can be used in the attacker's shooting/fight phase.
 * Includes "your" and "either" turn stratagems.
 */
export function filterAttackerStratagems(
  detachment: Detachment,
  unit: UnitDatasheet,
): Stratagem[] {
  return filterStratagems(detachment, unit).filter(
    (s) => s.turn === "your" || s.turn === "either",
  );
}

/**
 * Filter stratagems that can be used in the defender's phase
 * (opponent shooting/fight phase defensive stratagems).
 * Includes "opponent" and "either" turn stratagems.
 */
export function filterDefenderStratagems(
  detachment: Detachment,
  unit: UnitDatasheet,
): Stratagem[] {
  return filterStratagems(detachment, unit).filter(
    (s) => s.turn === "opponent" || s.turn === "either",
  );
}
