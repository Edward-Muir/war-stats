import type { AbilityEffectEntry } from '../ability-effects';

/** Ability effects for Chaos factions: CSM, DG, TS, WE, EC, CK, Daemons */
export const CHAOS_ABILITY_EFFECTS: Record<string, AbilityEffectEntry> = {
  // ─── Chaos Space Marines ──────────────────────────────────────

  Prescience: { side: 'defensive', activation: 'always', modifiers: { hitModifier: -1 } },
  'Dark Zealotry': {
    side: 'offensive',
    activation: 'always',
    modifiers: { woundModifier: 1 },
    combatType: 'melee',
  },
  'Faithful Flock': { side: 'defensive', activation: 'always', modifiers: { invulnerableSave: 5 } },
  Despoilers: { side: 'offensive', activation: 'conditional', modifiers: { rerollHits: 'all' } },
  'Veterans of the Long War': {
    side: 'offensive',
    activation: 'always',
    modifiers: { rerollWounds: 'ones' },
    combatType: 'melee',
  },
  'Rapid Assault': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { strengthBonus: 1 },
    combatType: 'melee',
  },
  'Stabilisation Talons': {
    side: 'offensive',
    activation: 'always',
    modifiers: { ignoreHitPenalties: true },
    combatType: 'ranged',
  },
  'Daemonic Ordnance': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { devastatingWounds: true },
    combatType: 'ranged',
  },
  'Devoted to Destruction': {
    side: 'offensive',
    activation: 'always',
    modifiers: { bonusAttacks: 2 },
    combatType: 'melee',
  },
  'Airborne Predator': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { hitModifier: 1 },
  },
  Destructor: { side: 'offensive', activation: 'conditional', modifiers: { apImprovement: 1 } },
  'Siege Shield': {
    side: 'offensive',
    activation: 'always',
    modifiers: { ignoreHitPenalties: true },
    combatType: 'ranged',
  },
  'Reorder Reality': { side: 'defensive', activation: 'always', modifiers: { hitModifier: -1 } },
  'Twisted Defence Force': {
    side: 'defensive',
    activation: 'conditional',
    modifiers: { grantsBenefitOfCover: true },
  },
  'Mutated Bodyguard': {
    side: 'defensive',
    activation: 'conditional',
    modifiers: { feelNoPain: 4 },
  },
  'Visions of Suffering': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { hitModifier: 1 },
  },
  'Bringers of Change': {
    side: 'offensive',
    activation: 'always',
    modifiers: { rerollWounds: 'ones' },
    combatType: 'ranged',
  },
  'Icon of Flame': {
    side: 'offensive',
    activation: 'always',
    modifiers: { ignoresCover: true },
    combatType: 'ranged',
  },
  'Brutal Raider': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { strengthBonus: 1, apImprovement: 1 },
    combatType: 'melee',
  },
  'Marked by the Dark Gods': {
    side: 'offensive',
    activation: 'always',
    modifiers: { critHitOn: 5 },
  },
  'Malign Cover': {
    side: 'defensive',
    activation: 'conditional',
    modifiers: { grantsBenefitOfCover: true },
  },
  'Beguiling Form': { side: 'defensive', activation: 'always', modifiers: { hitModifier: -1 } },

  // ─── Death Guard ──────────────────────────────────────────────

  'The Destroyer Hive': {
    side: 'defensive',
    activation: 'always',
    modifiers: { hitModifier: -1 },
    combatType: 'melee',
  },
  'Virulent Aura': {
    side: 'offensive',
    activation: 'always',
    modifiers: { rerollWounds: 'all' },
    combatType: 'ranged',
  },
  'Vector of Disease': {
    side: 'offensive',
    activation: 'always',
    modifiers: { sustainedHits: 1, lance: true },
    combatType: 'melee',
  },
  'Gift of Contagion': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { sustainedHits: 1 },
  },
  'Silent Bodyguard': { side: 'defensive', activation: 'always', modifiers: { feelNoPain: 4 } },
  'Diseased Malice': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { woundModifier: 1 },
  },
  'Froth-spattered Frenzy': {
    side: 'offensive',
    activation: 'always',
    modifiers: { bonusAttacks: 2 },
    combatType: 'melee',
  },
  'Blistering Fusillade': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { strengthBonus: 1, apImprovement: 1 },
    combatType: 'ranged',
  },
  'Tank Hunters': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { hitModifier: 1, woundModifier: 1 },
    combatType: 'ranged',
  },
  'Foul Infusion': {
    side: 'offensive',
    activation: 'always',
    modifiers: { lethalHits: true, critHitOn: 5 },
  },
  'Malicious Calculations': {
    side: 'offensive',
    activation: 'always',
    modifiers: { ignoreHitPenalties: true },
  },
  'Inflamed Infections': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { critHitOn: 5 },
    combatType: 'melee',
  },
  'Barrage of Filth': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { ignoresCover: true },
  },
  'Diseased Cover': {
    side: 'defensive',
    activation: 'conditional',
    modifiers: { grantsBenefitOfCover: true },
  },
  'Font of Unreality': {
    side: 'defensive',
    activation: 'conditional',
    modifiers: { hitModifier: -1 },
  },
  'Malefic Impact': {
    side: 'offensive',
    activation: 'always',
    modifiers: { lance: true },
    combatType: 'melee',
  },

  // ─── Thousand Sons ────────────────────────────────────────────

  'Arcane Shield': { side: 'defensive', activation: 'always', modifiers: { invulnerableSave: 4 } },
  'Malefic Maelstrom': { side: 'offensive', activation: 'always', modifiers: { sustainedHits: 1 } },
  'Rites of Coalescence': {
    side: 'defensive',
    activation: 'conditional',
    modifiers: { woundModifier: -1 },
  },
  'Marked by Fate': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { hitModifier: 1 },
    combatType: 'ranged',
  },
  'Bestial Prophet': { side: 'offensive', activation: 'always', modifiers: { hitModifier: 1 } },
  'Hunter of Souls': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { rerollHits: 'ones', rerollWounds: 'ones' },
  },
  'Mischief Makers': {
    side: 'defensive',
    activation: 'always',
    modifiers: { hitModifier: -1 },
    combatType: 'melee',
  },
  'Mesmerising Form': { side: 'defensive', activation: 'always', modifiers: { hitModifier: -1 } },

  // ─── World Eaters ─────────────────────────────────────────────

  'Legendary Killer': {
    side: 'offensive',
    activation: 'always',
    modifiers: { rerollHits: 'ones', rerollWounds: 'ones' },
    combatType: 'melee',
  },
  'Devastating Assault': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { devastatingWounds: true },
    combatType: 'melee',
  },
  'A Worthy Skull': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { rerollHits: 'all', rerollWounds: 'all' },
    combatType: 'melee',
  },
  'Rend and Tear': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { damageBonus: 1 },
    combatType: 'melee',
  },
  'Blood-hungry Annihilator': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { rerollWounds: 'all' },
    combatType: 'ranged',
  },
  'Furious Onslaught': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { rerollHits: 'all' },
    combatType: 'ranged',
  },
  'Savage Exaltation': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { hitModifier: 1 },
    combatType: 'melee',
  },
  'Aura of Dark Glory': {
    side: 'defensive',
    activation: 'always',
    modifiers: { invulnerableSave: 5 },
  },

  // ─── Emperor's Children ──────────────────────────────────────

  'A Challenge Worthy of Skill': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { rerollHits: 'all', rerollWounds: 'all' },
  },
  'Stimulated by Pain': {
    side: 'defensive',
    activation: 'always',
    modifiers: { damageReduction: 1 },
  },
  Perfectionists: { side: 'offensive', activation: 'always', modifiers: { lethalHits: true } },
  'Obsessive Annunciation': {
    side: 'offensive',
    activation: 'always',
    modifiers: { sustainedHits: 1 },
    combatType: 'ranged',
  },
  'Warped Interference': {
    side: 'defensive',
    activation: 'always',
    modifiers: { grantsBenefitOfCover: true },
  },
  'Excessive Assault': {
    side: 'offensive',
    activation: 'always',
    modifiers: { rerollWounds: 'ones' },
    combatType: 'melee',
  },
  'Daemonic Patrons': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { critWoundOn: 3 },
    combatType: 'melee',
  },
  'Glutton for Punishment': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { hitModifier: 1 },
  },
  'Monarch of the Hunt': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { rerollHits: 'all', rerollWounds: 'all' },
    combatType: 'melee',
  },
  'Shining aegis': { side: 'defensive', activation: 'always', modifiers: { saveOverride: 3 } },
};
