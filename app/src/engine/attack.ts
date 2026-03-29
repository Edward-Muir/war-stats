import type { ResolvedModifiers, DefenderProfile, DiceExpr } from '../types/simulation';
import { rollD6, rollDiceExpr } from './dice';
import { getWoundThreshold } from './modifiers';

/** Result of resolving a single attack through the 5-step sequence. */
export interface AttackResult {
  hit: boolean;
  isCritHit: boolean;
  wound: boolean;
  isCritWound: boolean;
  saved: boolean;
  damage: number; // Normal damage dealt (after FNP)
  mortalWounds: number; // From devastating wounds
  sustainedExtraHits: number; // Additional hits generated
}

function makeEmptyResult(): AttackResult {
  return {
    hit: false,
    isCritHit: false,
    wound: false,
    isCritWound: false,
    saved: false,
    damage: 0,
    mortalWounds: 0,
    sustainedExtraHits: 0,
  };
}

/** Step 1: resolve the hit roll, returning whether we hit and if it's a crit. */
function resolveHitRoll(
  skill: number,
  modifiers: ResolvedModifiers,
  isAutoHit: boolean
): { hit: boolean; isCritHit: boolean } | null {
  if (modifiers.autoHit || isAutoHit) {
    return { hit: true, isCritHit: false };
  }

  let hitRoll = rollD6();
  const unmodifiedHit = hitRoll;

  // Rerolls happen before modifiers (10e rules)
  if (
    modifiers.rerollHits === 'all' &&
    unmodifiedHit < skill &&
    unmodifiedHit < modifiers.critHitOn
  ) {
    hitRoll = rollD6();
  } else if (modifiers.rerollHits === 'ones' && unmodifiedHit === 1) {
    hitRoll = rollD6();
  }

  if (hitRoll === 1) return null; // Nat 1 always fails

  if (hitRoll >= modifiers.critHitOn) {
    return { hit: true, isCritHit: true };
  }

  const modifiedHit = hitRoll + modifiers.hitModifier;
  return { hit: modifiedHit >= skill, isCritHit: false };
}

/** Step 2: resolve the wound roll, returning whether we wound and if it's a crit. */
function resolveWoundRoll(
  strength: number,
  toughness: number,
  modifiers: ResolvedModifiers
): { wound: boolean; isCritWound: boolean } | null {
  const woundThreshold = getWoundThreshold(strength, toughness);
  let woundRoll = rollD6();
  const unmodifiedWound = woundRoll;

  if (
    modifiers.rerollWounds === 'all' &&
    unmodifiedWound < woundThreshold &&
    unmodifiedWound < modifiers.critWoundOn
  ) {
    woundRoll = rollD6();
  } else if (modifiers.rerollWounds === 'ones' && unmodifiedWound === 1) {
    woundRoll = rollD6();
  }

  if (woundRoll === 1) return null; // Nat 1 always fails

  if (woundRoll >= modifiers.critWoundOn) {
    return { wound: true, isCritWound: true };
  }

  const modifiedWound = woundRoll + modifiers.woundModifier;
  return { wound: modifiedWound >= woundThreshold, isCritWound: false };
}

/** Step 4: resolve the saving throw. */
function resolveSave(modifiers: ResolvedModifiers, defender: DefenderProfile): boolean {
  let saveRoll = rollD6();

  // Use best invuln between defender's base and stratagem override
  let effectiveInvuln = defender.invulnerableSave;
  if (modifiers.invulnOverride !== null) {
    effectiveInvuln =
      effectiveInvuln === null
        ? modifiers.invulnOverride
        : Math.min(effectiveInvuln, modifiers.invulnOverride);
  }

  /** Check whether a roll passes the save. */
  const passes = (roll: number): boolean => {
    if (roll === 1) return false;
    const armourSave = roll - modifiers.apValue + modifiers.coverBonus;
    const invulnPasses = effectiveInvuln !== null && roll >= effectiveInvuln;
    return armourSave >= defender.save || invulnPasses;
  };

  // Reroll saves from stratagems
  if (!passes(saveRoll) && modifiers.rerollSaves !== 'none') {
    if (modifiers.rerollSaves === 'all' || (modifiers.rerollSaves === 'ones' && saveRoll === 1)) {
      saveRoll = rollD6();
    }
  }

  return passes(saveRoll);
}

/**
 * Resolve a single attack through the 5-step sequence.
 *
 * @param skill       - BS/WS threshold (0 = auto-hit)
 * @param strength    - Weapon strength
 * @param damage      - Weapon damage dice expression
 * @param modifiers   - All computed modifiers
 * @param defender    - Defender's profile
 * @param isAutoHit   - true for sustained hits extras (skip hit roll)
 */
export function resolveAttack(
  skill: number,
  strength: number,
  damage: DiceExpr,
  modifiers: ResolvedModifiers,
  defender: DefenderProfile,
  isAutoHit: boolean = false
): AttackResult {
  const result = makeEmptyResult();

  // ── Step 1: Hit Roll ──
  const hitResult = resolveHitRoll(skill, modifiers, isAutoHit);
  if (!hitResult || !hitResult.hit) return result;

  result.hit = hitResult.hit;
  result.isCritHit = hitResult.isCritHit;

  // Sustained Hits: generate extra hits on critical hit
  if (result.isCritHit && modifiers.sustainedHits > 0) {
    result.sustainedExtraHits = modifiers.sustainedHits;
  }

  // ── Step 2: Wound Roll ──
  if (result.isCritHit && modifiers.lethalHits) {
    // Lethal Hits: critical hit auto-wounds (not a critical wound)
    result.wound = true;
  } else {
    const woundResult = resolveWoundRoll(strength, defender.toughness, modifiers);
    if (!woundResult || !woundResult.wound) return result;
    result.wound = woundResult.wound;
    result.isCritWound = woundResult.isCritWound;
  }

  if (!result.wound) return result;

  // ── Devastating Wounds: on critical wound, inflict mortal wounds = D ──
  if (result.isCritWound && modifiers.devastatingWounds) {
    result.mortalWounds = rollDiceExpr(damage) + modifiers.damageBonus;
    return result;
  }

  // ── Step 4: Saving Throw ──
  result.saved = resolveSave(modifiers, defender);
  if (result.saved) return result;

  // ── Step 5: Inflict Damage ──
  const rawDamage = rollDiceExpr(damage) + modifiers.damageBonus;
  result.damage = Math.max(1, rawDamage - modifiers.damageReduction);

  return result;
}
