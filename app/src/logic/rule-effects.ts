import type { FactionRules } from '../types/data';
import type {
  StratagemModifier,
  StratagemEffectEntry,
  ConditionalModifier,
} from './stratagem-effects';
import type { EffectKey } from './effect-keys';
import { decomposeModifiers } from './effect-keys';
import { ARMY_RULE_EFFECTS } from './army-rule-effect-table';
import { DETACHMENT_RULE_EFFECTS } from './detachment-rule-effect-table';
import { ENHANCEMENT_EFFECTS } from './enhancement-effect-table';

// ─── Lookup Helpers ────────────────────────────────────────────

function isConditionalEntry(
  entry: StratagemEffectEntry
): entry is { base: StratagemModifier; conditionals: ConditionalModifier[] } {
  return 'conditionals' in entry;
}

function decomposeEntry(entry: StratagemEffectEntry): EffectKey[] {
  const keys: EffectKey[] = [];
  if (isConditionalEntry(entry)) {
    for (const key of decomposeModifiers(entry.base)) keys.push(key);
    for (const c of entry.conditionals) {
      for (const key of decomposeModifiers(c.modifiers)) keys.push(key);
    }
  } else {
    for (const key of decomposeModifiers(entry)) keys.push(key);
  }
  return keys;
}

// ─── Name Normalisation ────────────────────────────────────────

/** Map data-file faction names to the canonical forms used in the lookup tables. */
const FACTION_NAME_MAP: Record<string, string> = {
  'Leagues Of Votann': 'Leagues of Votann',
  'Tau Empire': "T'au Empire",
  'Emperors Children': "Emperor's Children",
};

function normaliseFaction(name: string): string {
  return FACTION_NAME_MAP[name] ?? name;
}

// ─── Derive Available Rule Effects ─────────────────────────────

/**
 * Scan army rules, detachment rules, and enhancements for the selected
 * faction/detachment and return the deduplicated set of toggleable effect keys.
 */
export function deriveAvailableRuleEffects(
  factionRules: FactionRules | undefined,
  detachmentName: string | null
): EffectKey[] {
  if (!factionRules) return [];

  const seen = new Set<EffectKey>();
  const factionName = normaliseFaction(factionRules.faction);

  // 1. Army rules
  const armyPrefix = `${factionName}::`;
  for (const tableKey of Object.keys(ARMY_RULE_EFFECTS)) {
    if (tableKey.startsWith(armyPrefix)) {
      for (const key of decomposeEntry(ARMY_RULE_EFFECTS[tableKey])) seen.add(key);
    }
  }

  // 2. Detachment rule + enhancements for the selected detachment
  const detachment = detachmentName
    ? factionRules.detachments.find((d) => d.name === detachmentName)
    : undefined;

  if (detachment) {
    addDetachmentKeys(seen, factionName, detachmentName!, detachment.enhancements);
  }

  return [...seen].sort();
}

function addDetachmentKeys(
  seen: Set<EffectKey>,
  factionName: string,
  detachmentName: string,
  enhancements: { name: string }[]
): void {
  // Detachment rule entries
  const detPrefix = `${factionName}::${detachmentName}::`;
  for (const tableKey of Object.keys(DETACHMENT_RULE_EFFECTS)) {
    if (tableKey.startsWith(detPrefix)) {
      for (const key of decomposeEntry(DETACHMENT_RULE_EFFECTS[tableKey])) seen.add(key);
    }
  }

  // Enhancement entries
  for (const enh of enhancements) {
    const entry =
      ENHANCEMENT_EFFECTS[enh.name] ??
      ENHANCEMENT_EFFECTS[`${factionName}::${detachmentName}::${enh.name}`] ??
      ENHANCEMENT_EFFECTS[`${factionName}::${enh.name}`];

    if (entry) {
      for (const key of decomposeEntry(entry)) seen.add(key);
    }
  }
}

// ─── Exports ──────────────────────────────────────────────────

export { ARMY_RULE_EFFECTS, DETACHMENT_RULE_EFFECTS, ENHANCEMENT_EFFECTS };
