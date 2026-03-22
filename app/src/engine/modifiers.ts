import type { ResolvedModifiers, ResolvedWeaponGroup, DefenderProfile } from "../types/simulation";
import type { AttackerGameState, DefenderGameState } from "../types/config";

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/** Hit modifier: Heavy, Stealth, Indirect Fire (capped ±1). */
function computeHitModifier(
  kw: ResolvedWeaponGroup["keywords"],
  weaponType: string,
  attackerState: AttackerGameState,
  defenderState: DefenderGameState,
): number {
  let hitMod = 0;
  if (kw.heavy && attackerState.remainedStationary && weaponType === "ranged") hitMod += 1;
  if (defenderState.stealthAll && weaponType === "ranged") hitMod -= 1;
  if (kw.indirectFire && weaponType === "ranged") hitMod -= 1;
  return clamp(hitMod, -1, 1);
}

/** Wound modifier: Lance (capped ±1). */
function computeWoundModifier(
  kw: ResolvedWeaponGroup["keywords"],
  attackerState: AttackerGameState,
): number {
  let woundMod = 0;
  if (kw.lance && attackerState.charged) woundMod += 1;
  return clamp(woundMod, -1, 1);
}

/** Cover bonus from Benefit of Cover and Indirect Fire. */
function computeCoverBonus(
  weapon: ResolvedWeaponGroup,
  defenderState: DefenderGameState,
  defender: DefenderProfile,
): number {
  const kw = weapon.keywords;
  if (weapon.type !== "ranged" || kw.ignoresCover) return 0;

  const coverRestricted = defender.save <= 3 && weapon.ap === 0;
  if (coverRestricted) return 0;

  if (defenderState.benefitOfCover || kw.indirectFire) return 1;
  return 0;
}

/** Critical wound threshold, accounting for Anti-X keywords. */
function computeCritWoundOn(
  kw: ResolvedWeaponGroup["keywords"],
  defender: DefenderProfile,
): number {
  if (kw.antiKeyword && kw.antiThreshold > 0) {
    const defenderHasKeyword = defender.keywords.some(
      (k) => k.toUpperCase() === kw.antiKeyword,
    );
    if (defenderHasKeyword) return kw.antiThreshold;
  }
  return 6;
}

/**
 * Compute the effective modifiers for an attack given all context.
 * Applies modifier caps as per 10th Edition rules.
 */
export function computeModifiers(
  weapon: ResolvedWeaponGroup,
  attackerState: AttackerGameState,
  defenderState: DefenderGameState,
  defender: DefenderProfile,
): ResolvedModifiers {
  const kw = weapon.keywords;

  let attacksBonus = 0;
  if (kw.rapidFire > 0 && weapon.targetInHalfRange) attacksBonus += kw.rapidFire;
  if (kw.blast) attacksBonus += Math.floor(defender.modelCount / 5);

  let damageBonus = 0;
  if (kw.melta > 0 && weapon.targetInHalfRange) damageBonus += kw.melta;

  return {
    hitModifier: computeHitModifier(kw, weapon.type, attackerState, defenderState),
    woundModifier: computeWoundModifier(kw, attackerState),
    apValue: weapon.ap,
    coverBonus: computeCoverBonus(weapon, defenderState, defender),
    rerollHits: "none",
    rerollWounds: kw.twinLinked ? "all" as const : "none" as const,
    attacksBonus,
    damageBonus,
    critHitOn: 6,
    critWoundOn: computeCritWoundOn(kw, defender),
    autoHit: kw.torrent,
    lethalHits: kw.lethalHits,
    sustainedHits: kw.sustainedHits,
    devastatingWounds: kw.devastatingWounds,
  };
}

/**
 * Compute the wound roll threshold from Strength vs Toughness.
 */
export function getWoundThreshold(strength: number, toughness: number): number {
  if (strength >= toughness * 2) return 2;
  if (strength > toughness) return 3;
  if (strength === toughness) return 4;
  if (strength * 2 <= toughness) return 6;
  return 5; // S < T but not half
}
