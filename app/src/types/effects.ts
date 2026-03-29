import type {
  StratagemModifier,
  ConditionalModifier,
  CombatType,
} from '../logic/stratagem-effects';

// ─── Weapon Scope ──────────────────────────────────────────────

/** Restrict an effect to specific weapons within the unit. */
export interface WeaponScope {
  /** Match weapons whose name contains this substring (case-insensitive). */
  weaponNameIncludes?: string;
  /** Match weapons with this parsed keyword (key of ParsedWeaponKeywords). */
  weaponHasKeyword?: string;
}

// ─── UnitEffect ────────────────────────────────────────────────

/**
 * A structured effect from any source (ability, stratagem, rule, enhancement),
 * carrying identity, display info, and optional weapon scope.
 *
 * Replaces the old EffectKey + ParsedStratagemEffect pipeline.
 */
export interface UnitEffect {
  /** Unique ID: "ability::Target Elimination", "stratagem::Fire Discipline", etc. */
  id: string;
  /** Human-readable chip label. */
  label: string;
  /** Source for tooltip, e.g. "Ability: Target Elimination". */
  source: string;
  /** Which side this effect applies to (determines chip color + engine routing). */
  side: 'attacker' | 'defender';
  /** Whether the effect is always-on or user-toggled. */
  activation: 'always' | 'toggle';
  /** Whether the effect applies to ranged, melee, or any attacks. */
  combatType: CombatType;
  /** The modifier fields this effect contributes. */
  modifiers: StratagemModifier;
  /** Conditional modifiers gated on game state. */
  conditionals: ConditionalModifier[];
  /** Optional: restrict this effect to matching weapons only. */
  weaponScope?: WeaponScope;
}

// ─── Label Helpers ─────────────────────────────────────────────

const MODIFIER_SUMMARIES: [keyof StratagemModifier, (v: unknown) => string][] = [
  ['hitModifier', (v) => `${(v as number) > 0 ? '+' : ''}${v} Hit`],
  ['woundModifier', (v) => `${(v as number) > 0 ? '+' : ''}${v} Wound`],
  ['apImprovement', (v) => `+${v} AP`],
  ['rerollHits', (v) => (v === 'all' ? 'Reroll Hits' : 'Reroll 1s (Hit)')],
  ['rerollWounds', (v) => (v === 'all' ? 'Reroll Wounds' : 'Reroll 1s (Wound)')],
  ['critHitOn', (v) => `Crit Hit ${v}+`],
  ['critWoundOn', (v) => `Crit Wound ${v}+`],
  ['lethalHits', () => 'Lethal Hits'],
  ['sustainedHits', (v) => `Sustained ${v}`],
  ['devastatingWounds', () => 'Dev. Wounds'],
  ['ignoresCover', () => 'Ignores Cover'],
  ['lance', () => 'Lance'],
  ['bonusAttacks', (v) => `+${v} Attacks`],
  ['strengthBonus', (v) => `+${v} Strength`],
  ['damageBonus', (v) => `+${v} Damage`],
  ['feelNoPain', (v) => `${v}+ FNP`],
  ['damageReduction', (v) => `-${v} Damage`],
  ['saveModifier', () => 'Worsen AP -1'],
  ['invulnerableSave', (v) => `${v}++ Invuln`],
  ['rerollSaves', (v) => (v === 'all' ? 'Reroll Saves' : 'Reroll 1s (Save)')],
  ['toughnessBonus', (v) => `+${v} Toughness`],
  ['woundsBonus', (v) => `+${v} Wounds`],
  ['saveOverride', (v) => `Sv ${v}+`],
  ['grantsStealth', () => 'Stealth'],
  ['grantsBenefitOfCover', () => 'Cover'],
  ['ignoreHitPenalties', () => 'Ignore Hit Penalty'],
  ['ignoreWoundPenalties', () => 'Ignore Wound Penalty'],
];

/** Generate a short human-readable summary from a StratagemModifier. */
export function summarizeModifiers(m: StratagemModifier): string {
  const parts: string[] = [];
  for (const [field, fmt] of MODIFIER_SUMMARIES) {
    const v = m[field];
    if (v !== undefined && v !== false && v !== 0) parts.push(fmt(v));
  }
  return parts.join(', ') || 'No effect';
}

/** Generate a chip label from a single-modifier object, with optional scope qualifier. */
export function formatEffectLabel(mods: StratagemModifier, scope?: WeaponScope): string {
  const summary = summarizeModifiers(mods);
  if (!scope) return summary;
  if (scope.weaponNameIncludes) return `${summary} (${scope.weaponNameIncludes})`;
  if (scope.weaponHasKeyword) return `${summary} (${scope.weaponHasKeyword})`;
  return summary;
}
