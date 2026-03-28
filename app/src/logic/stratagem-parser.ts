import type { StratagemModifier } from './stratagem-effects';

// ─── Auto-Parser for Stratagem Effect Text ─────────────────────

export interface ParserResult {
  modifiers: StratagemModifier;
  confidence: 'high' | 'low';
}

/** Detect conditional language that makes auto-parsed results unreliable. */
const CONDITIONAL_MARKERS = [
  /\bif\b.*(?:below half|starting strength)/i,
  /\bif\b.*battle-shocked/i,
  /\bif\b.*remained stationary/i,
  /\bif\b.*charged/i,
  /\bif\b.*advanced/i,
  /\bif\b.*closest/i,
  /\bif\b.*within \d+/i,
  /\binstead\b/i,
];

function hasConditionalLanguage(text: string): boolean {
  return CONDITIONAL_MARKERS.some((re) => re.test(text));
}

type PatternRule = [RegExp, (m: RegExpMatchArray) => Partial<StratagemModifier>];

const PARSER_RULES: PatternRule[] = [
  // Hit roll modifiers
  [/add (\d+) to the Hit roll/i, (m) => ({ hitModifier: parseInt(m[1]) })],
  [/subtract (\d+) from the Hit roll/i, (m) => ({ hitModifier: -parseInt(m[1]) })],

  // Wound roll modifiers
  [/add (\d+) to the Wound roll/i, (m) => ({ woundModifier: parseInt(m[1]) })],
  [/subtract (\d+) from the Wound roll/i, (m) => ({ woundModifier: -parseInt(m[1]) })],

  // Rerolls (specific "of 1" must come before general)
  [/re-roll (?:a )?Hit roll(?:s)? of 1/i, () => ({ rerollHits: 'ones' as const })],
  [/re-roll (?:the |all )?Hit roll/i, () => ({ rerollHits: 'all' as const })],
  [/re-roll (?:a )?Wound roll(?:s)? of 1/i, () => ({ rerollWounds: 'ones' as const })],
  [/re-roll (?:the |all )?Wound roll/i, () => ({ rerollWounds: 'all' as const })],

  // AP
  [/improve.*Armour Penetration.*by (\d+)/i, (m) => ({ apImprovement: parseInt(m[1]) })],
  [/worsen.*Armour Penetration.*by (\d+)/i, (m) => ({ saveModifier: parseInt(m[1]) })],

  // Weapon abilities
  [/\[LETHAL HITS\]/i, () => ({ lethalHits: true })],
  [/\[SUSTAINED HITS (\d+)\]/i, (m) => ({ sustainedHits: parseInt(m[1]) })],
  [/\[DEVASTATING WOUNDS\]/i, () => ({ devastatingWounds: true })],
  [/\[LANCE\]/i, () => ({ lance: true })],
  [/\[IGNORES COVER\]/i, () => ({ ignoresCover: true })],
  [/cannot have.*Benefit of Cover/i, () => ({ ignoresCover: true })],

  // Crit threshold
  [/(\d)\+\s*(?:is |scores )a Critical Hit/i, (m) => ({ critHitOn: parseInt(m[1]) })],

  // Defensive
  [/Feel No Pain (\d)\+/i, (m) => ({ feelNoPain: parseInt(m[1]) })],
  [/(\d)\+\s*invulnerable save/i, (m) => ({ invulnerableSave: parseInt(m[1]) })],
  [/subtract (\d+) from the Damage/i, (m) => ({ damageReduction: parseInt(m[1]) })],

  // Characteristic bonuses
  [/add (\d+) to the Attacks/i, (m) => ({ bonusAttacks: parseInt(m[1]) })],
  [/add (\d+) to the Strength/i, (m) => ({ strengthBonus: parseInt(m[1]) })],
  [/add (\d+) to the Damage/i, (m) => ({ damageBonus: parseInt(m[1]) })],
];

/**
 * Parse stratagem effect text using regex patterns.
 * Returns null if no patterns match or if conditional language is detected.
 */
export function parseStratagemEffectText(effectText: string): ParserResult | null {
  const modifiers: StratagemModifier = {};
  let matched = false;

  for (const [regex, extract] of PARSER_RULES) {
    const match = effectText.match(regex);
    if (match) {
      Object.assign(modifiers, extract(match));
      matched = true;
    }
  }

  if (!matched) return null;

  // Don't auto-parse conditional effects — they need manual mapping
  if (hasConditionalLanguage(effectText)) return null;

  return { modifiers, confidence: 'high' };
}
