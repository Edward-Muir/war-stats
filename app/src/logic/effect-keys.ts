import type { Stratagem } from '../types/data';
import type { StratagemModifier, ParsedStratagemEffect } from './stratagem-effects';
import { resolveStratagemEffect, classifyCombatType } from './stratagem-effects';

// ─── Effect Key ────────────────────────────────────────────────

/** A string that uniquely identifies a toggleable modifier effect. */
export type EffectKey = string;

// ─── Labels ────────────────────────────────────────────────────

/** Human-readable chip labels for each effect key. */
export const EFFECT_LABELS: Record<string, string> = {
  'hitModifier:+1': '+1 to Hit',
  'hitModifier:-1': '-1 to Hit',
  'woundModifier:+1': '+1 to Wound',
  'woundModifier:-1': '-1 to Wound',
  'apImprovement:1': '+1 AP',
  'rerollHits:ones': 'Reroll 1s (Hit)',
  'rerollHits:all': 'Reroll Hits',
  'rerollWounds:ones': 'Reroll 1s (Wound)',
  'rerollWounds:all': 'Reroll Wounds',
  'critHitOn:5': 'Crit Hit 5+',
  'critWoundOn:5': 'Crit Wound 5+',
  lethalHits: 'Lethal Hits',
  'sustainedHits:1': 'Sustained 1',
  'sustainedHits:2': 'Sustained 2',
  devastatingWounds: 'Dev. Wounds',
  ignoresCover: 'Ignores Cover',
  lance: 'Lance',
  'bonusAttacks:1': '+1 Attacks',
  'strengthBonus:1': '+1 Strength',
  'damageBonus:1': '+1 Damage',
  'feelNoPain:4': '4+ FNP',
  'feelNoPain:5': '5+ FNP',
  'feelNoPain:6': '6+ FNP',
  'damageReduction:1': '-1 Damage',
  'saveModifier:1': 'Worsen AP -1',
  'invulnerableSave:4': '4++ Invuln',
  'invulnerableSave:5': '5++ Invuln',
  'rerollSaves:ones': 'Reroll 1s (Save)',
  'rerollSaves:all': 'Reroll Saves',
  grantsStealth: 'Stealth',
  grantsBenefitOfCover: 'Cover',
  ignoreHitPenalties: 'Ignore Hit Penalty',
  ignoreWoundPenalties: 'Ignore Wound Penalty',
};

/** Fallback label for keys not in the table. */
export function getEffectLabel(key: EffectKey): string {
  return EFFECT_LABELS[key] ?? key;
}

// ─── Conflict Groups ───────────────────────────────────────────

/** Mutually exclusive effect groups — toggling one removes others in the group. */
export const CONFLICT_GROUPS: EffectKey[][] = [
  ['rerollHits:ones', 'rerollHits:all'],
  ['rerollWounds:ones', 'rerollWounds:all'],
  ['rerollSaves:ones', 'rerollSaves:all'],
  ['feelNoPain:4', 'feelNoPain:5', 'feelNoPain:6'],
  ['invulnerableSave:4', 'invulnerableSave:5'],
  ['sustainedHits:1', 'sustainedHits:2'],
  ['hitModifier:+1', 'hitModifier:-1'],
  ['woundModifier:+1', 'woundModifier:-1'],
];

/** Get all keys in the same conflict group as `key`, excluding `key` itself. */
export function getConflicting(key: EffectKey): EffectKey[] {
  for (const group of CONFLICT_GROUPS) {
    if (group.includes(key)) return group.filter((k) => k !== key);
  }
  return [];
}

// ─── Decompose / Recompose ─────────────────────────────────────

// Numeric fields that use `field:value` format with signed prefix for +/-
const SIGNED_FIELDS = ['hitModifier', 'woundModifier'] as const;
// Numeric fields that use `field:value` format
const NUMERIC_FIELDS = [
  'apImprovement',
  'critHitOn',
  'critWoundOn',
  'sustainedHits',
  'bonusAttacks',
  'strengthBonus',
  'damageBonus',
  'feelNoPain',
  'damageReduction',
  'saveModifier',
  'invulnerableSave',
] as const;
// String enum fields (ones/all)
const ENUM_FIELDS = ['rerollHits', 'rerollWounds', 'rerollSaves'] as const;
// Boolean fields
const BOOL_FIELDS = [
  'lethalHits',
  'devastatingWounds',
  'ignoresCover',
  'lance',
  'grantsStealth',
  'grantsBenefitOfCover',
  'ignoreHitPenalties',
  'ignoreWoundPenalties',
] as const;
// Fields where lower is better (min-merge)
const MIN_FIELDS = new Set(['critHitOn', 'critWoundOn', 'feelNoPain', 'invulnerableSave']);

/** Extract individual EffectKeys from a StratagemModifier. */
export function decomposeModifiers(m: StratagemModifier): EffectKey[] {
  const keys: EffectKey[] = [];
  for (const f of SIGNED_FIELDS) {
    const v = m[f];
    if (v && v > 0) keys.push(`${f}:+${v}`);
    if (v && v < 0) keys.push(`${f}:${v}`);
  }
  for (const f of NUMERIC_FIELDS) if (m[f]) keys.push(`${f}:${m[f]}`);
  for (const f of ENUM_FIELDS) if (m[f]) keys.push(`${f}:${m[f]}`);
  for (const f of BOOL_FIELDS) if (m[f]) keys.push(f);
  return keys;
}

/** Build a StratagemModifier from a set of active EffectKeys. */
export function recomposeModifiers(keys: EffectKey[]): StratagemModifier {
  const m: Record<string, number | string | boolean> = {};
  for (const key of keys) {
    const colonIdx = key.indexOf(':');
    if (colonIdx === -1) {
      m[key] = true;
      continue;
    }
    const field = key.slice(0, colonIdx);
    const val = key.slice(colonIdx + 1);
    const numVal = parseInt(val);
    if (val === 'ones' || val === 'all') {
      if (val === 'all' || m[field] !== 'all') m[field] = val;
    } else if (MIN_FIELDS.has(field)) {
      const cur = m[field] as number | undefined;
      m[field] = cur ? Math.min(cur, numVal) : numVal;
    } else {
      m[field] = ((m[field] as number) ?? 0) + numVal;
    }
  }
  return m as unknown as StratagemModifier;
}

// ─── Derive Available Effects ──────────────────────────────────

/** Scan available stratagems and return the deduplicated set of toggleable effects. */
export function deriveAvailableEffects(
  stratagems: Stratagem[],
  attackMode: 'ranged' | 'melee'
): EffectKey[] {
  const seen = new Set<EffectKey>();

  for (const strat of stratagems) {
    const effect = resolveStratagemEffect(strat);
    if (!effect.isParsed) continue;

    // Filter by combat type (same as old StratagemChips logic)
    const combatType = classifyCombatType(strat.when, strat.effect);
    if (combatType !== 'any' && combatType !== attackMode) continue;

    // Decompose base modifiers
    for (const key of decomposeModifiers(effect.modifiers)) seen.add(key);

    // Decompose conditional modifiers (user toggles them explicitly)
    for (const c of effect.conditionals) {
      for (const key of decomposeModifiers(c.modifiers)) seen.add(key);
    }
  }

  return [...seen].sort();
}

// ─── Synthetic Effect for Simulation ───────────────────────────

/** Build a ParsedStratagemEffect from a set of active effect keys. */
export function buildSyntheticEffect(activeEffects: EffectKey[]): ParsedStratagemEffect[] {
  if (activeEffects.length === 0) return [];
  return [
    {
      combatType: 'any',
      modifiers: recomposeModifiers(activeEffects),
      conditionals: [],
      isParsed: true,
      confidence: 'manual',
    },
  ];
}
