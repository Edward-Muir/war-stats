import type { StratagemEffectEntry } from './stratagem-effects';
import {
  PLUS_1_HIT,
  PLUS_1_WOUND,
  REROLL_HITS,
  REROLL_HITS_ONES,
  LETHAL_HITS,
  SUSTAINED_1,
  DEVASTATING_WOUNDS,
  STRENGTH_BONUS_1,
  BONUS_ATTACKS_1,
  INVULN_5,
  merge,
} from './modifier-templates';

// ─── Army Rule Effect Lookup Table ─────────────────────────────
// Keyed by "Faction::RuleName". Where an army rule has multiple
// modes or tiers, each variant gets its own suffixed key.

export const ARMY_RULE_EFFECTS: Record<string, StratagemEffectEntry> = {
  // --- Space Marines: Oath of Moment ---
  'Space Marines::Oath of Moment': REROLL_HITS,
  'Space Marines::Oath of Moment (Full)': merge(REROLL_HITS, PLUS_1_WOUND),

  // --- Chaos Space Marines: Dark Pacts ---
  'Chaos Space Marines::Dark Pacts (Lethal)': LETHAL_HITS,
  'Chaos Space Marines::Dark Pacts (Sustained)': SUSTAINED_1,

  // --- Thousand Sons: Cabal of Sorcerers (rituals) ---
  "Thousand Sons::Destiny's Ruin": REROLL_HITS_ONES,
  "Thousand Sons::Destiny's Ruin (10+)": REROLL_HITS,
  'Thousand Sons::Twist of Fate': { apImprovement: 1 },
  'Thousand Sons::Twist of Fate (12+)': { apImprovement: 2 },

  // --- World Eaters: Blessings of Khorne (melee) ---
  'World Eaters::Martial Excellence': SUSTAINED_1,
  'World Eaters::Warp Blades': LETHAL_HITS,
  'World Eaters::Decapitating Strikes': DEVASTATING_WOUNDS,

  // --- Adeptus Custodes: Martial Ka'tah (melee) ---
  'Adeptus Custodes::Dacatarai Stance': SUSTAINED_1,
  'Adeptus Custodes::Rendax Stance': LETHAL_HITS,

  // --- Adeptus Mechanicus: Doctrina Imperatives ---
  'Adeptus Mechanicus::Protector Imperative': PLUS_1_HIT,
  'Adeptus Mechanicus::Conqueror Imperative': merge(PLUS_1_HIT, {
    apImprovement: 1,
  }),

  // --- Astra Militarum: Voice of Command ---
  'Astra Militarum::Take Aim!': PLUS_1_HIT,
  'Astra Militarum::Fix Bayonets!': PLUS_1_HIT,
  'Astra Militarum::First Rank, Fire!': BONUS_ATTACKS_1,

  // --- T'au Empire: For the Greater Good ---
  "T'au Empire::Guided (Spotted)": PLUS_1_HIT,
  "T'au Empire::Guided (Markerlight)": merge(PLUS_1_HIT, {
    ignoresCover: true,
  }),

  // --- Leagues of Votann: Prioritised Efficiency ---
  'Leagues of Votann::Hostile Acquisition': PLUS_1_HIT,
  'Leagues of Votann::Fortify Takeover': merge(PLUS_1_HIT, {
    woundModifier: -1,
  }),

  // --- Orks: Waaagh! (melee S/A, any invuln) ---
  'Orks::Waaagh!': merge(STRENGTH_BONUS_1, BONUS_ATTACKS_1, INVULN_5),

  // --- Tyranids: Synapse (melee) ---
  'Tyranids::Synapse': STRENGTH_BONUS_1,
};
