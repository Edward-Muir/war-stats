import type { SelectedWeapon, GameStateRelevance } from '../types/config';
import type { Stratagem, AbilityBlock } from '../types/data';
import { parseWeaponKeywords } from '../engine/keywords';
import type { ConditionType } from './stratagem-effects';
import { resolveStratagemEffect } from './stratagem-effects';

/** Which weapon keyword families are present in the selected weapons. */
interface WeaponKeywordFlags {
  heavy: boolean;
  assault: boolean;
  rapidFireOrMelta: boolean;
  lance: boolean;
  pistol: boolean;
}

function scanWeaponKeywords(selectedWeapons: SelectedWeapon[]): WeaponKeywordFlags {
  const flags: WeaponKeywordFlags = {
    heavy: false,
    assault: false,
    rapidFireOrMelta: false,
    lance: false,
    pistol: false,
  };

  for (const sw of selectedWeapons) {
    const kw = parseWeaponKeywords(sw.weapon.keywords);
    if (kw.heavy) flags.heavy = true;
    if (kw.assault) flags.assault = true;
    if (kw.rapidFire > 0 || kw.melta > 0) flags.rapidFireOrMelta = true;
    if (kw.lance) flags.lance = true;
    if (kw.pistol) flags.pistol = true;
  }

  return flags;
}

function anyStratagemGrantsLance(stratagems: Stratagem[]): boolean {
  for (const strat of stratagems) {
    const effect = resolveStratagemEffect(strat);
    if (!effect.isParsed) continue;
    if (effect.modifiers.lance) return true;
    if (effect.conditionals.some((c) => c.modifiers.lance)) return true;
  }
  return false;
}

/** Check if any available stratagem has a conditional that gates on the given condition type. */
function anyStratagemHasCondition(stratagems: Stratagem[], condType: ConditionType): boolean {
  for (const strat of stratagems) {
    const effect = resolveStratagemEffect(strat);
    if (!effect.isParsed) continue;
    if (effect.conditionals.some((c) => c.condition.type === condType)) return true;
  }
  return false;
}

/**
 * Determine which game state toggles are relevant given the current
 * selected weapons, available stratagems, attack mode, and unit data.
 */
export function computeGameStateRelevance(
  selectedWeapons: SelectedWeapon[],
  availableAttackerStratagems: Stratagem[],
  availableDefenderStratagems: Stratagem[],
  attackMode: 'ranged' | 'melee',
  attackerKeywords: string[],
  defenderAbilities: AbilityBlock | null
): GameStateRelevance {
  const wk = scanWeaponKeywords(selectedWeapons);

  const upperKeywords = attackerKeywords.map((k) => k.toUpperCase());
  const isMonsterOrVehicle = upperKeywords.includes('MONSTER') || upperKeywords.includes('VEHICLE');

  const defenderHasStealth =
    defenderAbilities?.core.some((a) => a.toUpperCase() === 'STEALTH') ?? false;

  const isRanged = attackMode === 'ranged';
  const hasLanceFromStrat = anyStratagemGrantsLance(availableAttackerStratagems);

  return {
    remainedStationary:
      wk.heavy || anyStratagemHasCondition(availableAttackerStratagems, 'remainedStationary'),
    advanced: wk.assault,
    charged: attackMode === 'melee' && (wk.lance || hasLanceFromStrat),
    targetInHalfRange: isRanged && wk.rapidFireOrMelta,
    engagementRange: isRanged && wk.pistol && !isMonsterOrVehicle,
    benefitOfCover: isRanged,
    stealthAll: isRanged && defenderHasStealth ? 'locked' : false,
    closestTarget:
      anyStratagemHasCondition(availableAttackerStratagems, 'closestTarget') ||
      anyStratagemHasCondition(availableDefenderStratagems, 'closestTarget'),
  };
}
