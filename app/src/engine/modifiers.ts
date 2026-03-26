import type { ResolvedModifiers, ResolvedWeaponGroup, DefenderProfile, RerollPolicy } from "../types/simulation";
import type { AttackerGameState, DefenderGameState } from "../types/config";
import type { ParsedStratagemEffect } from "../logic/stratagem-effects";

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

/** Upgrade a reroll policy: 'all' > 'ones' > 'none'. */
function upgradeReroll(current: RerollPolicy, incoming: 'ones' | 'all'): RerollPolicy {
  if (current === 'all') return 'all';
  return incoming;
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
  attackerEffects: ParsedStratagemEffect[] = [],
  defenderEffects: ParsedStratagemEffect[] = [],
): ResolvedModifiers {
  const kw = weapon.keywords;

  let attacksBonus = 0;
  if (kw.rapidFire > 0 && weapon.targetInHalfRange) attacksBonus += kw.rapidFire;
  if (kw.blast) attacksBonus += Math.floor(defender.modelCount / 5);

  let damageBonus = 0;
  if (kw.melta > 0 && weapon.targetInHalfRange) damageBonus += kw.melta;

  // Base values from weapon keywords
  let hitMod = computeHitModifier(kw, weapon.type, attackerState, defenderState);
  let woundMod = computeWoundModifier(kw, attackerState);
  let apValue = weapon.ap;
  let coverBonus = computeCoverBonus(weapon, defenderState, defender);
  let rerollHits: RerollPolicy = "none";
  let rerollWounds: RerollPolicy = kw.twinLinked ? "all" : "none";
  let critHitOn = 6;
  let critWoundOn = computeCritWoundOn(kw, defender);
  let lethalHits = kw.lethalHits;
  let sustainedHits = kw.sustainedHits;
  let devastatingWounds = kw.devastatingWounds;
  let ignoresCover = kw.ignoresCover;
  let damageReduction = 0;
  let feelNoPainOverride: number | null = null;
  let invulnOverride: number | null = null;

  // Fold in attacker stratagem effects
  for (const effect of attackerEffects) {
    if (effect.combatType !== 'any' && effect.combatType !== weapon.type) continue;
    const m = effect.modifiers;
    if (m.hitModifier) hitMod += m.hitModifier;
    if (m.woundModifier) woundMod += m.woundModifier;
    if (m.apImprovement) apValue += m.apImprovement;
    if (m.rerollHits) rerollHits = upgradeReroll(rerollHits, m.rerollHits);
    if (m.rerollWounds) rerollWounds = upgradeReroll(rerollWounds, m.rerollWounds);
    if (m.critHitOn) critHitOn = Math.min(critHitOn, m.critHitOn);
    if (m.critWoundOn) critWoundOn = Math.min(critWoundOn, m.critWoundOn);
    if (m.lethalHits) lethalHits = true;
    if (m.sustainedHits) sustainedHits += m.sustainedHits;
    if (m.devastatingWounds) devastatingWounds = true;
    if (m.ignoresCover) ignoresCover = true;
    if (m.lance && attackerState.charged) woundMod += 1;
  }

  // Fold in defender stratagem effects
  for (const effect of defenderEffects) {
    if (effect.combatType !== 'any' && effect.combatType !== weapon.type) continue;
    const m = effect.modifiers;
    if (m.hitModifier) hitMod += m.hitModifier;
    if (m.woundModifier) woundMod += m.woundModifier;
    if (m.saveModifier) apValue = Math.max(0, apValue - m.saveModifier);
    if (m.feelNoPain) {
      feelNoPainOverride = feelNoPainOverride === null ? m.feelNoPain : Math.min(feelNoPainOverride, m.feelNoPain);
    }
    if (m.damageReduction) damageReduction += m.damageReduction;
    if (m.invulnerableSave) {
      invulnOverride = invulnOverride === null ? m.invulnerableSave : Math.min(invulnOverride, m.invulnerableSave);
    }
  }

  // Re-evaluate cover after ignoresCover from stratagems
  if (ignoresCover && !kw.ignoresCover) {
    coverBonus = 0;
  }

  return {
    hitModifier: clamp(hitMod, -1, 1),
    woundModifier: clamp(woundMod, -1, 1),
    apValue,
    coverBonus,
    rerollHits,
    rerollWounds,
    attacksBonus,
    damageBonus,
    critHitOn,
    critWoundOn,
    autoHit: kw.torrent,
    lethalHits,
    sustainedHits,
    devastatingWounds,
    damageReduction,
    feelNoPainOverride,
    invulnOverride,
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
