import type { UnitDatasheet } from '../types/data';
import type { StratagemModifier, ConditionalModifier, CombatType } from './stratagem-effects';
import type { UnitEffect, WeaponScope } from '../types/effects';
import { formatEffectLabel, summarizeModifiers } from '../types/effects';
import { ABILITY_EFFECTS } from './ability-effect-tables';

// ─── Types ──────────────────────────────────────────────────────

/** Whether the ability affects the unit's attacks (offensive) or its defence. */
export type AbilitySide = 'offensive' | 'defensive';

/** Whether the ability is always active or requires a toggle. */
export type AbilityActivation = 'always' | 'conditional';

export interface AbilityEffectEntry {
  side: AbilitySide;
  activation: AbilityActivation;
  modifiers: StratagemModifier;
  conditionals?: ConditionalModifier[];
  combatType?: CombatType; // default: 'any'
  weaponScope?: WeaponScope;
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

/** Resolve an ability name to its effect entry via three-tier key lookup. */
export function resolveAbilityEffect(
  name: string,
  factionSlug?: string,
  unitName?: string
): AbilityEffectEntry | undefined {
  const norm = normalizeName(name);

  // Tier 1: bare name
  const bare = ABILITY_EFFECTS[norm] ?? ABILITY_EFFECTS[name];
  if (bare) return bare;

  // Tier 2: faction::name
  if (factionSlug) {
    const factionKey = `${factionSlug}::${norm}`;
    const factionEntry = ABILITY_EFFECTS[factionKey] ?? ABILITY_EFFECTS[`${factionSlug}::${name}`];
    if (factionEntry) return factionEntry;
  }

  // Tier 3: faction::unit::name
  if (factionSlug && unitName) {
    const fullKey = `${factionSlug}::${unitName}::${norm}`;
    const fullEntry =
      ABILITY_EFFECTS[fullKey] ?? ABILITY_EFFECTS[`${factionSlug}::${unitName}::${name}`];
    if (fullEntry) return fullEntry;
  }

  return undefined;
}

// ─── Derive UnitEffect[] from Abilities ─────────────────────────

/**
 * Scan a datasheet's `abilities.other` and return structured UnitEffect[]
 * for the given side (attacker or defender).
 *
 * Each modifier field is decomposed into its own UnitEffect chip.
 * Entries with conditionals are kept as single chips.
 */
export function deriveAbilityUnitEffects(
  datasheet: UnitDatasheet,
  factionSlug: string,
  side: 'attacker' | 'defender'
): UnitEffect[] {
  const targetSide: AbilitySide = side === 'attacker' ? 'offensive' : 'defensive';
  const effects: UnitEffect[] = [];

  for (const ability of datasheet.abilities.other) {
    const entry = resolveAbilityEffect(ability.name, factionSlug, datasheet.name);
    if (!entry) continue;
    if (entry.side !== targetSide) continue;

    const activation = entry.activation === 'always' ? 'always' : 'toggle';
    const combatType = entry.combatType ?? 'any';
    const conditionals = entry.conditionals ?? [];

    if (conditionals.length > 0) {
      // Keep conditional entries as single chips
      const baseSummary = summarizeModifiers(entry.modifiers);
      const label =
        baseSummary !== 'No effect'
          ? baseSummary
          : conditionals.length > 0
            ? summarizeModifiers(conditionals[0].modifiers)
            : ability.name;

      effects.push({
        id: `ability::${ability.name}`,
        label,
        source: `Ability: ${ability.name}`,
        side,
        activation,
        combatType,
        modifiers: entry.modifiers,
        conditionals,
        weaponScope: entry.weaponScope,
      });
    } else {
      // Decompose into per-modifier chips
      for (const [key, value] of Object.entries(entry.modifiers)) {
        if (value === undefined || value === false || value === 0) continue;
        const singleMod = { [key]: value } as StratagemModifier;
        effects.push({
          id: `ability::${ability.name}::${key}`,
          label: formatEffectLabel(singleMod, entry.weaponScope),
          source: `Ability: ${ability.name}`,
          side,
          activation,
          combatType,
          modifiers: singleMod,
          conditionals: [],
          weaponScope: entry.weaponScope,
        });
      }
    }
  }

  return effects;
}
