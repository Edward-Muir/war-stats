import type { StratagemModifier, ConditionalModifier } from './stratagem-effects';

// ─── Reusable Modifier Templates ───────────────────────────────
// Shared by stratagem-effect-table, army-rule-effect-table,
// detachment-rule-effect-table, and enhancement-effect-table.

export const PLUS_1_HIT: StratagemModifier = { hitModifier: 1 };
export const MINUS_1_HIT: StratagemModifier = { hitModifier: -1 };
export const PLUS_1_WOUND: StratagemModifier = { woundModifier: 1 };
export const MINUS_1_WOUND: StratagemModifier = { woundModifier: -1 };
export const AP_IMPROVE_1: StratagemModifier = { apImprovement: 1 };
export const AP_WORSEN_1: StratagemModifier = { saveModifier: 1 };
export const REROLL_HITS: StratagemModifier = { rerollHits: 'all' };
export const REROLL_HITS_ONES: StratagemModifier = { rerollHits: 'ones' };
export const REROLL_WOUNDS: StratagemModifier = { rerollWounds: 'all' };
export const REROLL_WOUNDS_ONES: StratagemModifier = { rerollWounds: 'ones' };
export const LETHAL_HITS: StratagemModifier = { lethalHits: true };
export const SUSTAINED_1: StratagemModifier = { sustainedHits: 1 };
export const DEVASTATING_WOUNDS: StratagemModifier = { devastatingWounds: true };
export const IGNORES_COVER: StratagemModifier = { ignoresCover: true };
export const LANCE: StratagemModifier = { lance: true };
export const CRIT_HIT_5: StratagemModifier = { critHitOn: 5 };
export const FNP_4: StratagemModifier = { feelNoPain: 4 };
export const FNP_5: StratagemModifier = { feelNoPain: 5 };
export const FNP_6: StratagemModifier = { feelNoPain: 6 };
export const MINUS_1_DAMAGE: StratagemModifier = { damageReduction: 1 };
export const INVULN_4: StratagemModifier = { invulnerableSave: 4 };
export const INVULN_5: StratagemModifier = { invulnerableSave: 5 };
export const BONUS_ATTACKS_1: StratagemModifier = { bonusAttacks: 1 };
export const STRENGTH_BONUS_1: StratagemModifier = { strengthBonus: 1 };
export const DAMAGE_BONUS_1: StratagemModifier = { damageBonus: 1 };
export const GRANTS_STEALTH: StratagemModifier = { grantsStealth: true };
export const GRANTS_COVER: StratagemModifier = { grantsBenefitOfCover: true };
export const IGNORE_HIT_PENALTIES: StratagemModifier = { ignoreHitPenalties: true };
export const IGNORE_ALL_PENALTIES: StratagemModifier = {
  ignoreHitPenalties: true,
  ignoreWoundPenalties: true,
};
export const REROLL_SAVES_ONES: StratagemModifier = { rerollSaves: 'ones' };

export function merge(...mods: StratagemModifier[]): StratagemModifier {
  const result: StratagemModifier = {};
  for (const m of mods) Object.assign(result, m);
  return result;
}

export function conditional(
  base: StratagemModifier,
  ...conds: ConditionalModifier[]
): { base: StratagemModifier; conditionals: ConditionalModifier[] } {
  return { base, conditionals: conds };
}
