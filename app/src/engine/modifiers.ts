import type {
  ResolvedModifiers,
  ResolvedWeaponGroup,
  DefenderProfile,
  RerollPolicy,
} from '../types/simulation';
import type { AttackerGameState, DefenderGameState } from '../types/config';
import type {
  ParsedStratagemEffect,
  StratagemCondition,
  StratagemModifier,
} from '../logic/stratagem-effects';

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/** Hit modifier: Heavy, Stealth, Indirect Fire (capped ±1). */
function computeHitModifier(
  kw: ResolvedWeaponGroup['keywords'],
  weaponType: string,
  attackerState: AttackerGameState,
  defenderState: DefenderGameState
): number {
  let hitMod = 0;
  if (kw.heavy && attackerState.remainedStationary && weaponType === 'ranged') hitMod += 1;
  if (defenderState.stealthAll && weaponType === 'ranged') hitMod -= 1;
  if (kw.indirectFire && weaponType === 'ranged') hitMod -= 1;
  return clamp(hitMod, -1, 1);
}

/** Wound modifier: Lance (capped ±1). */
function computeWoundModifier(
  kw: ResolvedWeaponGroup['keywords'],
  attackerState: AttackerGameState
): number {
  let woundMod = 0;
  if (kw.lance && attackerState.charged) woundMod += 1;
  return clamp(woundMod, -1, 1);
}

/** Cover bonus from Benefit of Cover and Indirect Fire. */
function computeCoverBonus(
  weapon: ResolvedWeaponGroup,
  defenderState: DefenderGameState,
  defender: DefenderProfile
): number {
  const kw = weapon.keywords;
  if (weapon.type !== 'ranged' || kw.ignoresCover) return 0;

  const coverRestricted = defender.save <= 3 && weapon.ap === 0;
  if (coverRestricted) return 0;

  if (defenderState.benefitOfCover || kw.indirectFire) return 1;
  return 0;
}

/** Critical wound threshold, accounting for Anti-X keywords. */
function computeCritWoundOn(
  kw: ResolvedWeaponGroup['keywords'],
  defender: DefenderProfile
): number {
  if (kw.antiKeyword && kw.antiThreshold > 0) {
    const defenderHasKeyword = defender.keywords.some((k) => k.toUpperCase() === kw.antiKeyword);
    if (defenderHasKeyword) return kw.antiThreshold;
  }
  return 6;
}

/** Upgrade a reroll policy: 'all' > 'ones' > 'none'. */
function upgradeReroll(current: RerollPolicy, incoming: 'ones' | 'all'): RerollPolicy {
  if (current === 'all') return 'all';
  return incoming;
}

/** Evaluate a stratagem condition against current game state and weapon. */
export function evaluateCondition(
  cond: StratagemCondition,
  weapon: ResolvedWeaponGroup,
  attackerState: AttackerGameState,
  defenderState: DefenderGameState
): boolean {
  switch (cond.type) {
    case 'remainedStationary':
      return attackerState.remainedStationary;
    case 'charged':
      return attackerState.charged;
    case 'advanced':
      return attackerState.advanced;
    case 'closestTarget':
      return defenderState.closestTarget;
    case 'targetInHalfRange':
      return weapon.targetInHalfRange;
    case 'weaponHasKeyword':
      return cond.weaponKeyword ? !!weapon.keywords[cond.weaponKeyword] : false;
    case 'belowHalfStrength':
      return false;
    case 'battleShocked':
      return false;
  }
}

// ─── Mutable accumulator for modifier folding ───────────────────

interface ModState {
  hitMod: number;
  woundMod: number;
  apValue: number;
  rerollHits: RerollPolicy;
  rerollWounds: RerollPolicy;
  rerollSaves: RerollPolicy;
  critHitOn: number;
  critWoundOn: number;
  lethalHits: boolean;
  sustainedHits: number;
  devastatingWounds: boolean;
  ignoresCover: boolean;
  grantsStealth: boolean;
  grantsBenefitOfCover: boolean;
  ignoreHitPenalties: boolean;
  ignoreWoundPenalties: boolean;
  attacksBonus: number;
  strengthBonus: number;
  damageBonus: number;
  damageReduction: number;
  feelNoPainOverride: number | null;
  invulnOverride: number | null;
  toughnessBonus: number;
  woundsBonus: number;
  saveOverride: number | null;
}

/** Apply roll-modifier fields (hit/wound/AP/rerolls/crit thresholds). */
function applyRollMods(s: ModState, m: StratagemModifier, charged: boolean): void {
  if (m.hitModifier) s.hitMod += m.hitModifier;
  if (m.woundModifier) s.woundMod += m.woundModifier;
  if (m.apImprovement) s.apValue += m.apImprovement;
  if (m.rerollHits) s.rerollHits = upgradeReroll(s.rerollHits, m.rerollHits);
  if (m.rerollWounds) s.rerollWounds = upgradeReroll(s.rerollWounds, m.rerollWounds);
  if (m.critHitOn) s.critHitOn = Math.min(s.critHitOn, m.critHitOn);
  if (m.critWoundOn) s.critWoundOn = Math.min(s.critWoundOn, m.critWoundOn);
  if (m.lance && charged) s.woundMod += 1;
}

/** Apply keyword-ability and characteristic-bonus fields. */
function applyAbilityMods(s: ModState, m: StratagemModifier): void {
  if (m.lethalHits) s.lethalHits = true;
  if (m.sustainedHits) s.sustainedHits += m.sustainedHits;
  if (m.devastatingWounds) s.devastatingWounds = true;
  if (m.ignoresCover) s.ignoresCover = true;
  if (m.ignoreHitPenalties) s.ignoreHitPenalties = true;
  if (m.ignoreWoundPenalties) s.ignoreWoundPenalties = true;
  if (m.bonusAttacks) s.attacksBonus += m.bonusAttacks;
  if (m.strengthBonus) s.strengthBonus += m.strengthBonus;
  if (m.damageBonus) s.damageBonus += m.damageBonus;
}

/** Apply an attacker stratagem modifier to the accumulator. */
function applyAttackerMod(s: ModState, m: StratagemModifier, charged: boolean): void {
  applyRollMods(s, m, charged);
  applyAbilityMods(s, m);
}

/** Apply defender stat-override fields (toughness, wounds, save). */
function applyDefenderStatOverrides(s: ModState, m: StratagemModifier): void {
  if (m.toughnessBonus) s.toughnessBonus += m.toughnessBonus;
  if (m.woundsBonus) s.woundsBonus += m.woundsBonus;
  if (m.saveOverride) {
    s.saveOverride =
      s.saveOverride === null ? m.saveOverride : Math.min(s.saveOverride, m.saveOverride);
  }
}

/** Apply a defender stratagem modifier to the accumulator. */
function applyDefenderMod(s: ModState, m: StratagemModifier): void {
  if (m.hitModifier) s.hitMod += m.hitModifier;
  if (m.woundModifier) s.woundMod += m.woundModifier;
  if (m.saveModifier) s.apValue = Math.max(0, s.apValue - m.saveModifier);
  if (m.feelNoPain) {
    s.feelNoPainOverride =
      s.feelNoPainOverride === null ? m.feelNoPain : Math.min(s.feelNoPainOverride, m.feelNoPain);
  }
  if (m.damageReduction) s.damageReduction += m.damageReduction;
  if (m.invulnerableSave) {
    s.invulnOverride =
      s.invulnOverride === null
        ? m.invulnerableSave
        : Math.min(s.invulnOverride, m.invulnerableSave);
  }
  if (m.rerollSaves) s.rerollSaves = upgradeReroll(s.rerollSaves, m.rerollSaves);
  if (m.grantsStealth) s.grantsStealth = true;
  if (m.grantsBenefitOfCover) s.grantsBenefitOfCover = true;
  applyDefenderStatOverrides(s, m);
}

/** Fold attacker stratagem effects (base + conditional) into state. */
function foldAttackerEffects(
  s: ModState,
  effects: ParsedStratagemEffect[],
  weapon: ResolvedWeaponGroup,
  attackerState: AttackerGameState,
  defenderState: DefenderGameState
): void {
  for (const effect of effects) {
    if (effect.combatType !== 'any' && effect.combatType !== weapon.type) continue;
    applyAttackerMod(s, effect.modifiers, attackerState.charged);
    for (const c of effect.conditionals) {
      if (evaluateCondition(c.condition, weapon, attackerState, defenderState)) {
        applyAttackerMod(s, c.modifiers, attackerState.charged);
      }
    }
  }
}

/** Fold defender stratagem effects (base + conditional) into state. */
function foldDefenderEffects(
  s: ModState,
  effects: ParsedStratagemEffect[],
  weapon: ResolvedWeaponGroup,
  attackerState: AttackerGameState,
  defenderState: DefenderGameState
): void {
  for (const effect of effects) {
    if (effect.combatType !== 'any' && effect.combatType !== weapon.type) continue;
    applyDefenderMod(s, effect.modifiers);
    for (const c of effect.conditionals) {
      if (evaluateCondition(c.condition, weapon, attackerState, defenderState)) {
        applyDefenderMod(s, c.modifiers);
      }
    }
  }
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
  defenderEffects: ParsedStratagemEffect[] = []
): ResolvedModifiers {
  const kw = weapon.keywords;

  const s: ModState = {
    hitMod: computeHitModifier(kw, weapon.type, attackerState, defenderState),
    woundMod: computeWoundModifier(kw, attackerState),
    apValue: weapon.ap,
    rerollHits: 'none',
    rerollWounds: kw.twinLinked ? 'all' : 'none',
    rerollSaves: 'none',
    critHitOn: 6,
    critWoundOn: computeCritWoundOn(kw, defender),
    lethalHits: kw.lethalHits,
    sustainedHits: kw.sustainedHits,
    devastatingWounds: kw.devastatingWounds,
    ignoresCover: kw.ignoresCover,
    grantsStealth: false,
    grantsBenefitOfCover: false,
    ignoreHitPenalties: false,
    ignoreWoundPenalties: false,
    attacksBonus: 0,
    strengthBonus: 0,
    damageBonus: 0,
    damageReduction: 0,
    feelNoPainOverride: null,
    invulnOverride: null,
    toughnessBonus: 0,
    woundsBonus: 0,
    saveOverride: null,
  };

  // Keyword-driven bonuses
  if (kw.rapidFire > 0 && weapon.targetInHalfRange) s.attacksBonus += kw.rapidFire;
  if (kw.blast) s.attacksBonus += Math.floor(defender.modelCount / 5);
  if (kw.melta > 0 && weapon.targetInHalfRange) s.damageBonus += kw.melta;

  foldAttackerEffects(s, attackerEffects, weapon, attackerState, defenderState);
  foldDefenderEffects(s, defenderEffects, weapon, attackerState, defenderState);

  return finalizeModifiers(s, weapon, defenderState, defender);
}

/** Apply post-fold adjustments (stealth, cover grants, ignore penalties) and build result. */
function finalizeModifiers(
  s: ModState,
  weapon: ResolvedWeaponGroup,
  defenderState: DefenderGameState,
  defender: DefenderProfile
): ResolvedModifiers {
  const kw = weapon.keywords;

  // Grants Stealth: apply -1 hit for ranged (same as stealthAll)
  if (s.grantsStealth && weapon.type === 'ranged') s.hitMod -= 1;

  // Grants Benefit of Cover: force cover bonus on
  const effectiveDefState = s.grantsBenefitOfCover
    ? { ...defenderState, benefitOfCover: true }
    : defenderState;

  // Ignore hit/wound penalties: clamp modifiers to >= 0
  const finalHitMod = s.ignoreHitPenalties && s.hitMod < 0 ? 0 : s.hitMod;
  const finalWoundMod = s.ignoreWoundPenalties && s.woundMod < 0 ? 0 : s.woundMod;

  // Re-evaluate cover after ignoresCover from stratagems
  let coverBonus = computeCoverBonus(weapon, effectiveDefState, defender);
  if (s.ignoresCover && !kw.ignoresCover) coverBonus = 0;

  return {
    hitModifier: clamp(finalHitMod, -1, 1),
    woundModifier: clamp(finalWoundMod, -1, 1),
    apValue: s.apValue,
    coverBonus,
    rerollHits: s.rerollHits,
    rerollWounds: s.rerollWounds,
    rerollSaves: s.rerollSaves,
    attacksBonus: s.attacksBonus,
    damageBonus: s.damageBonus,
    strengthBonus: s.strengthBonus,
    critHitOn: s.critHitOn,
    critWoundOn: s.critWoundOn,
    autoHit: kw.torrent,
    lethalHits: s.lethalHits,
    sustainedHits: s.sustainedHits,
    devastatingWounds: s.devastatingWounds,
    damageReduction: s.damageReduction,
    feelNoPainOverride: s.feelNoPainOverride,
    invulnOverride: s.invulnOverride,
    toughnessBonus: s.toughnessBonus,
    woundsBonus: s.woundsBonus,
    saveOverride: s.saveOverride,
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
