import type { Stratagem } from '../types/data';
import type { ParsedWeaponKeywords } from '../types/simulation';
import type { UnitEffect } from '../types/effects';
import { formatEffectLabel, summarizeModifiers } from '../types/effects';
import { modifierMatchesSide, modifiersMatchSide } from './modifier-templates';
import { parseStratagemEffectText } from './stratagem-parser';
import { STRATAGEM_EFFECTS } from './stratagem-effect-table';

// ─── Types ──────────────────────────────────────────────────────

export type CombatType = 'ranged' | 'melee' | 'any';

/** Modifier fields a stratagem can contribute. All optional — only set fields are applied. */
export interface StratagemModifier {
  // Attacker offensive
  hitModifier?: number;
  woundModifier?: number;
  apImprovement?: number;
  rerollHits?: 'ones' | 'all';
  rerollWounds?: 'ones' | 'all';
  critHitOn?: number;
  critWoundOn?: number;
  lethalHits?: boolean;
  sustainedHits?: number;
  devastatingWounds?: boolean;
  ignoresCover?: boolean;
  lance?: boolean;
  bonusAttacks?: number;
  strengthBonus?: number;
  damageBonus?: number;
  // Defender defensive
  feelNoPain?: number;
  damageReduction?: number;
  saveModifier?: number;
  invulnerableSave?: number;
  rerollSaves?: 'ones' | 'all';
  // Defender stat bonuses
  toughnessBonus?: number; // +N to Toughness characteristic
  woundsBonus?: number; // +N to Wounds characteristic
  saveOverride?: number; // Set Save to N+ (absolute, e.g. 2 = Sv 2+)
  // Ability grants
  grantsStealth?: boolean; // Defender: -1 to ranged hit rolls
  grantsBenefitOfCover?: boolean; // Defender: +1 to save
  ignoreHitPenalties?: boolean; // Attacker: clamp hit modifier to >= 0
  ignoreWoundPenalties?: boolean; // Attacker: clamp wound modifier to >= 0
}

// ─── Conditions ─────────────────────────────────────────────────

export type ConditionType =
  | 'remainedStationary'
  | 'charged'
  | 'advanced'
  | 'closestTarget'
  | 'targetInHalfRange'
  | 'weaponHasKeyword'
  | 'belowHalfStrength'
  | 'battleShocked';

export interface StratagemCondition {
  type: ConditionType;
  weaponKeyword?: keyof ParsedWeaponKeywords;
}

export interface ConditionalModifier {
  condition: StratagemCondition;
  modifiers: StratagemModifier;
}

/** Simple modifier OR base + conditionals for game-state-dependent effects. */
export type StratagemEffectEntry =
  | StratagemModifier
  | { base: StratagemModifier; conditionals: ConditionalModifier[] };

function isConditionalEntry(
  entry: StratagemEffectEntry
): entry is { base: StratagemModifier; conditionals: ConditionalModifier[] } {
  return 'conditionals' in entry;
}

/** A resolved stratagem effect ready for the engine. */
export interface ParsedStratagemEffect {
  combatType: CombatType;
  modifiers: StratagemModifier;
  conditionals: ConditionalModifier[];
  isParsed: boolean;
  confidence: 'manual' | 'high' | 'low';
}

// ─── Combat Type Classifier ────────────────────────────────────

export function classifyCombatType(when: string, effect: string): CombatType {
  const effectLower = effect.toLowerCase();
  const whenLower = when.toLowerCase();

  const hasRanged = effectLower.includes('ranged attack') || effectLower.includes('ranged weapons');
  const hasMelee = effectLower.includes('melee attack') || effectLower.includes('melee weapons');

  if (hasRanged && !hasMelee) return 'ranged';
  if (hasMelee && !hasRanged) return 'melee';
  if (hasRanged && hasMelee) return 'any';

  const isShootingOnly = whenLower.includes('shooting phase') && !whenLower.includes('fight phase');
  const isFightOnly = whenLower.includes('fight phase') && !whenLower.includes('shooting phase');

  if (isShootingOnly) return 'ranged';
  if (isFightOnly) return 'melee';

  return 'any';
}

// ─── Unicode Normalization ──────────────────────────────────────

function normalizeName(name: string): string {
  return name
    .replace(/\u2011/g, '-')
    .replace(/\u2013/g, '-')
    .replace(/\u2018|\u2019/g, "'")
    .replace(/\u201C|\u201D/g, '"');
}

// ─── Lookup ────────────────────────────────────────────────────

export function resolveStratagemEffect(stratagem: Stratagem): ParsedStratagemEffect {
  const combatType = classifyCombatType(stratagem.when, stratagem.effect);

  // 1. Manual table (highest confidence)
  const entry =
    STRATAGEM_EFFECTS[stratagem.name] ?? STRATAGEM_EFFECTS[normalizeName(stratagem.name)];

  if (entry !== undefined) {
    if (isConditionalEntry(entry)) {
      return {
        combatType,
        modifiers: entry.base,
        conditionals: entry.conditionals,
        isParsed: true,
        confidence: 'manual',
      };
    }
    return {
      combatType,
      modifiers: entry,
      conditionals: [],
      isParsed: true,
      confidence: 'manual',
    };
  }

  // 2. Auto-parser fallback
  const parsed = parseStratagemEffectText(stratagem.effect);
  if (parsed) {
    return {
      combatType,
      modifiers: parsed.modifiers,
      conditionals: [],
      isParsed: true,
      confidence: parsed.confidence,
    };
  }

  // 3. No mapping found
  return {
    combatType,
    modifiers: {},
    conditionals: [],
    isParsed: false,
    confidence: 'low',
  };
}

// ─── Derive UnitEffect[] from Stratagems ──────────────────────

/**
 * Convert available stratagems into structured UnitEffect[].
 * Only includes stratagems with parseable effects.
 */
export function deriveStratagemUnitEffects(
  stratagems: Stratagem[],
  attackMode: 'ranged' | 'melee',
  side: 'attacker' | 'defender'
): UnitEffect[] {
  const effects: UnitEffect[] = [];

  for (const strat of stratagems) {
    const resolved = resolveStratagemEffect(strat);
    if (!resolved.isParsed) continue;

    // Filter by combat type
    if (resolved.combatType !== 'any' && resolved.combatType !== attackMode) continue;

    if (resolved.conditionals.length > 0) {
      // Skip conditional entries with no modifiers matching this side
      const baseMatch = modifiersMatchSide(resolved.modifiers, side);
      const condMatch = resolved.conditionals.some((c) => modifiersMatchSide(c.modifiers, side));
      if (!baseMatch && !condMatch) continue;

      // Keep conditional entries as single chips
      const baseSummary = summarizeModifiers(resolved.modifiers);
      const label =
        baseSummary !== 'No effect'
          ? baseSummary
          : summarizeModifiers(resolved.conditionals[0].modifiers);

      effects.push({
        id: `stratagem::${strat.name}`,
        label,
        source: `Stratagem: ${strat.name}`,
        side,
        activation: 'toggle',
        combatType: resolved.combatType,
        modifiers: resolved.modifiers,
        conditionals: resolved.conditionals,
      });
    } else {
      // Decompose into per-modifier chips
      for (const [key, value] of Object.entries(resolved.modifiers)) {
        if (value === undefined || value === false || value === 0) continue;
        if (!modifierMatchesSide(key, value, side)) continue;
        const singleMod = { [key]: value } as StratagemModifier;
        effects.push({
          id: `stratagem::${strat.name}::${key}`,
          label: formatEffectLabel(singleMod),
          source: `Stratagem: ${strat.name}`,
          side,
          activation: 'toggle',
          combatType: resolved.combatType,
          modifiers: singleMod,
          conditionals: [],
        });
      }
    }
  }

  return effects;
}
