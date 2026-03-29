import type { FactionRules, Enhancement, UnitDatasheet } from '../types/data';
import type {
  StratagemModifier,
  StratagemEffectEntry,
  ConditionalModifier,
  CombatType,
} from './stratagem-effects';
import type { UnitEffect } from '../types/effects';
import { formatEffectLabel, summarizeModifiers } from '../types/effects';
import { modifierMatchesSide, modifiersMatchSide } from './modifier-templates';
import { ARMY_RULE_EFFECTS } from './army-rule-effect-table';
import { DETACHMENT_RULE_EFFECTS } from './detachment-rule-effect-table';
import { ENHANCEMENT_EFFECTS } from './enhancement-effect-table';

// ─── Entry Helpers ────────────────────────────────────────────

function isConditionalEntry(
  entry: StratagemEffectEntry
): entry is { base: StratagemModifier; conditionals: ConditionalModifier[] } {
  return 'conditionals' in entry;
}

function entryModifiers(entry: StratagemEffectEntry): StratagemModifier {
  return isConditionalEntry(entry) ? entry.base : entry;
}

function entryConditionals(entry: StratagemEffectEntry): ConditionalModifier[] {
  return isConditionalEntry(entry) ? entry.conditionals : [];
}

// ─── Name Normalisation ────────────────────────────────────────

const FACTION_NAME_MAP: Record<string, string> = {
  'Leagues Of Votann': 'Leagues of Votann',
  'Tau Empire': "T'au Empire",
  'Emperors Children': "Emperor's Children",
};

function normaliseFaction(name: string): string {
  return FACTION_NAME_MAP[name] ?? name;
}

/** Extract display name from a table key like "Space Marines::Oath of Moment (Full)" → "Oath of Moment (Full)" */
function extractDisplayName(tableKey: string): string {
  const parts = tableKey.split('::');
  return parts[parts.length - 1];
}

// ─── Decompose Helpers ────────────────────────────────────────

/**
 * Decompose a modifier object into individual per-modifier UnitEffects.
 * Each modifier field becomes its own chip.
 */
function decomposeModifiers(
  mods: StratagemModifier,
  idPrefix: string,
  sourceName: string,
  side: 'attacker' | 'defender',
  combatType: CombatType
): UnitEffect[] {
  const effects: UnitEffect[] = [];
  for (const [key, value] of Object.entries(mods)) {
    if (value === undefined || value === false || value === 0) continue;
    if (!modifierMatchesSide(key, value, side)) continue;
    const singleMod = { [key]: value } as StratagemModifier;
    effects.push({
      id: `${idPrefix}::${key}`,
      label: formatEffectLabel(singleMod),
      source: sourceName,
      side,
      activation: 'toggle',
      combatType,
      modifiers: singleMod,
      conditionals: [],
    });
  }
  return effects;
}

/**
 * Emit a single non-decomposed UnitEffect for entries with conditionals.
 * Label falls back to conditional modifier summary if base is empty.
 */
function emitConditionalEffect(
  mods: StratagemModifier,
  conditionals: ConditionalModifier[],
  id: string,
  displayName: string,
  sourceType: string,
  side: 'attacker' | 'defender',
  combatType: CombatType
): UnitEffect {
  const baseSummary = summarizeModifiers(mods);
  const label =
    baseSummary !== 'No effect'
      ? baseSummary
      : conditionals.length > 0
        ? summarizeModifiers(conditionals[0].modifiers)
        : displayName;

  return {
    id,
    label,
    source: `${sourceType}: ${displayName}`,
    side,
    activation: 'toggle',
    combatType,
    modifiers: mods,
    conditionals,
  };
}

// ─── Resolve + Emit ──────────────────────────────────────────

/**
 * Resolve a table entry into UnitEffect[] with side filtering.
 * Decomposes flat modifiers into per-chip effects; keeps conditional entries as single chips.
 * Returns empty array if no modifiers match the requested side.
 */
function resolveEntry(
  entry: StratagemEffectEntry,
  id: string,
  displayName: string,
  sourceType: string,
  side: 'attacker' | 'defender'
): UnitEffect[] {
  const mods = entryModifiers(entry);
  const conditionals = entryConditionals(entry);

  if (conditionals.length > 0) {
    const baseMatch = modifiersMatchSide(mods, side);
    const condMatch = conditionals.some((c) => modifiersMatchSide(c.modifiers, side));
    if (!baseMatch && !condMatch) return [];
    return [emitConditionalEffect(mods, conditionals, id, displayName, sourceType, side, 'any')];
  }

  return decomposeModifiers(mods, id, `${sourceType}: ${displayName}`, side, 'any');
}

// ─── Enhancement Eligibility ─────────────────────────────────

function deriveEnhancementEffects(
  enhancements: Enhancement[],
  factionName: string,
  detachmentName: string,
  side: 'attacker' | 'defender',
  datasheet: UnitDatasheet | null
): UnitEffect[] {
  if (!datasheet) return [];
  const isCharacter = datasheet.keywords.some((k) => k.toUpperCase() === 'CHARACTER');
  if (!isCharacter) return [];

  const unitKeywords = [...datasheet.keywords, ...datasheet.factionKeywords].map((k) =>
    k.toUpperCase()
  );
  const effects: UnitEffect[] = [];

  for (const enh of enhancements) {
    if (
      enh.keyword_restrictions.length > 0 &&
      !enh.keyword_restrictions.some((req) => unitKeywords.includes(req.toUpperCase()))
    ) {
      continue;
    }

    const entry =
      ENHANCEMENT_EFFECTS[enh.name] ??
      ENHANCEMENT_EFFECTS[`${factionName}::${detachmentName}::${enh.name}`] ??
      ENHANCEMENT_EFFECTS[`${factionName}::${enh.name}`];

    if (!entry) continue;
    effects.push(...resolveEntry(entry, `enhancement::${enh.name}`, enh.name, 'Enhancement', side));
  }

  return effects;
}

// ─── Derive UnitEffect[] from Rules ───────────────────────────

/**
 * Scan army rules, detachment rules, and enhancements for the selected
 * faction/detachment and return structured UnitEffect[].
 */
export function deriveRuleUnitEffects(
  factionRules: FactionRules | undefined,
  detachmentName: string | null,
  side: 'attacker' | 'defender',
  datasheet: UnitDatasheet | null = null
): UnitEffect[] {
  if (!factionRules) return [];

  const effects: UnitEffect[] = [];
  const factionName = normaliseFaction(factionRules.faction);

  // 1. Army rules
  const armyPrefix = `${factionName}::`;
  for (const tableKey of Object.keys(ARMY_RULE_EFFECTS)) {
    if (!tableKey.startsWith(armyPrefix)) continue;
    const displayName = extractDisplayName(tableKey);
    effects.push(
      ...resolveEntry(
        ARMY_RULE_EFFECTS[tableKey],
        `army-rule::${tableKey}`,
        displayName,
        'Army Rule',
        side
      )
    );
  }

  // 2. Detachment rules + enhancements
  const detachment = detachmentName
    ? factionRules.detachments.find((d) => d.name === detachmentName)
    : undefined;

  if (detachment && detachmentName) {
    const detPrefix = `${factionName}::${detachmentName}::`;
    for (const tableKey of Object.keys(DETACHMENT_RULE_EFFECTS)) {
      if (!tableKey.startsWith(detPrefix)) continue;
      const displayName = extractDisplayName(tableKey);
      effects.push(
        ...resolveEntry(
          DETACHMENT_RULE_EFFECTS[tableKey],
          `detachment-rule::${tableKey}`,
          displayName,
          'Detachment',
          side
        )
      );
    }

    effects.push(
      ...deriveEnhancementEffects(
        detachment.enhancements,
        factionName,
        detachmentName,
        side,
        datasheet
      )
    );
  }

  return effects;
}

// ─── Exports ──────────────────────────────────────────────────

export { ARMY_RULE_EFFECTS, DETACHMENT_RULE_EFFECTS, ENHANCEMENT_EFFECTS };
