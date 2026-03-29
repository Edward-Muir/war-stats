import type { AbilityEffectEntry } from '../ability-effects';

/** Ability effects for Xenos factions: Necrons, Orks, Tyranids, GSC (+ Aeldari, Drukhari, T'au, LoV placeholders) */
export const XENOS_ABILITY_EFFECTS: Record<string, AbilityEffectEntry> = {
  // ─── Necrons ────────────────────────────────────────────────────

  // Each time an attack targets this model, if S > T, subtract 1 from Wound roll
  'Advanced Quantum Shielding': {
    side: 'defensive',
    activation: 'conditional',
    modifiers: { woundModifier: -1 },
  },

  // Not fully visible because of this FORTIFICATION -> Benefit of Cover
  'Ancient Cover': {
    side: 'defensive',
    activation: 'conditional',
    modifiers: { grantsBenefitOfCover: true },
  },

  // 4+ invulnerable save
  'Dispersion Shield': {
    side: 'defensive',
    activation: 'always',
    modifiers: { invulnerableSave: 4 },
  },

  // Targets Below Half-strength: re-roll Hit and Wound
  'Driven by Hatred': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { rerollHits: 'all', rerollWounds: 'all' },
  },

  // Below Half-strength targets: successful Hit roll scores Critical Hit (melee)
  'Flesh Hunger': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { critHitOn: 2 },
    combatType: 'melee',
  },

  // Re-roll Hit roll of 1 (closest target; re-roll Hit roll if within objective)
  'Hard-wired for Destruction': {
    side: 'offensive',
    activation: 'always',
    modifiers: { rerollHits: 'ones' },
    combatType: 'ranged',
  },

  // Re-roll Wound roll of 1 (re-roll Wound roll if within objective)
  'Implacable Eradication': {
    side: 'offensive',
    activation: 'always',
    modifiers: { rerollWounds: 'ones' },
  },

  // Subtract 1 from Damage characteristic
  'Implacable Resilience': {
    side: 'defensive',
    activation: 'always',
    modifiers: { damageReduction: 1 },
  },

  // Subtract 1 from Damage characteristic (Dynastic Conqueror)
  'Implacable Resistance': {
    side: 'defensive',
    activation: 'always',
    modifiers: { damageReduction: 1 },
  },

  // Feel No Pain 5+
  'Nanoscarab amulet': {
    side: 'defensive',
    activation: 'always',
    modifiers: { feelNoPain: 5 },
  },

  // Ranged weapons have [IGNORES COVER]
  Nebuloscope: {
    side: 'offensive',
    activation: 'always',
    modifiers: { ignoresCover: true },
    combatType: 'ranged',
  },

  // Re-roll Wound roll of 1 (specific weapons vs specific targets, modeled as always)
  'Optimised for Slaughter': {
    side: 'offensive',
    activation: 'always',
    modifiers: { rerollWounds: 'ones' },
    combatType: 'ranged',
  },

  // Remains Stationary: doomsday cannon has [DEVASTATING WOUNDS]
  'Overwhelming Obliteration': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { devastatingWounds: true },
    combatType: 'ranged',
  },

  // Stealth ability
  Shadowloom: {
    side: 'defensive',
    activation: 'always',
    modifiers: { grantsStealth: true },
  },

  // Save characteristic of 3+
  Shieldvanes: {
    side: 'defensive',
    activation: 'always',
    modifiers: { saveOverride: 3 },
  },

  // Ranged attack within 12": ignore modifiers to BS, Hit roll, Wound roll
  'Weapon Sentinels': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { ignoreHitPenalties: true, ignoreWoundPenalties: true },
    combatType: 'ranged',
  },

  // Re-roll melee Hit roll of 1 (re-roll Hit roll if charged)
  'Whirling Onslaught': {
    side: 'offensive',
    activation: 'always',
    modifiers: { rerollHits: 'ones' },
    combatType: 'melee',
  },

  // ─── Orks ───────────────────────────────────────────────────────

  // Waaagh! active: add 1 to ranged Hit roll
  "Big an' Shooty": {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { hitModifier: 1 },
    combatType: 'ranged',
  },

  // Waaagh! active: add 1 to melee Hit roll
  "Big an' Stompy": {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { hitModifier: 1 },
    combatType: 'melee',
  },

  // Ranged attack targeting non-FLY: re-roll Hit roll of 1
  'Blastajet Attack Run': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { rerollHits: 'ones' },
    combatType: 'ranged',
  },

  // 4+ invulnerable save
  'Blastajet Force Field': {
    side: 'defensive',
    activation: 'always',
    modifiers: { invulnerableSave: 4 },
  },

  // Targets MONSTER/VEHICLE: +1 Damage (TITANIC: +2 Damage)
  'Da Bigger Dey Iz\u2026': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { damageBonus: 1 },
  },

  // Waaagh! active: +4 Attacks to melee weapons
  'Da Biggest and da Best': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { bonusAttacks: 4 },
    combatType: 'melee',
  },

  // Every successful Hit roll scores a Critical Hit
  Dakkastorm: {
    side: 'offensive',
    activation: 'always',
    modifiers: { critHitOn: 2 },
    combatType: 'ranged',
  },

  // Re-roll Hit roll of 1 (re-roll Hit roll if within objective)
  "Dat's Our Loot!": {
    side: 'offensive',
    activation: 'always',
    modifiers: { rerollHits: 'ones' },
    combatType: 'ranged',
  },

  // Ranged attack within 9": improve AP by 1
  'Drive-by Dakka': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { apImprovement: 1 },
    combatType: 'ranged',
  },

  // Charge move: melee weapons have [DEVASTATING WOUNDS]
  'Ferocious Rage': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { devastatingWounds: true },
    combatType: 'melee',
  },

  // Waaagh! active: Feel No Pain 5+
  "Krumpin' Time": {
    side: 'defensive',
    activation: 'conditional',
    modifiers: { feelNoPain: 5 },
  },

  // Targets MONSTER or VEHICLE: re-roll Hit roll
  'Monster Hunters': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { rerollHits: 'all' },
  },

  // Burna within 6": re-roll Wound roll of 1 (within objective: re-roll Wound roll)
  Pyromaniaks: {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { rerollWounds: 'ones' },
    combatType: 'ranged',
  },

  // Not fully visible because of FORTIFICATION: Benefit of Cover
  'Ramshackle Cover': {
    side: 'defensive',
    activation: 'conditional',
    modifiers: { grantsBenefitOfCover: true },
  },

  // Worsen AP by 1 on incoming attacks
  'Ramshackle but Rugged': {
    side: 'defensive',
    activation: 'always',
    modifiers: { saveModifier: 1 },
  },

  // Targets unit at Starting Strength (non-MONSTER/VEHICLE): re-roll Hit of 1
  'Splat!': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { rerollHits: 'ones' },
    combatType: 'ranged',
  },

  // Targets MONSTER or VEHICLE: +1 Hit roll and +1 Wound roll
  'Tank Hunters': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { hitModifier: 1, woundModifier: 1 },
  },

  // No penalty for ranged attacks while engaged
  'Walking Bastion': {
    side: 'offensive',
    activation: 'always',
    modifiers: { ignoreHitPenalties: true },
    combatType: 'ranged',
  },

  // Add 2 to Toughness
  "'Ard Case": {
    side: 'defensive',
    activation: 'always',
    modifiers: { toughnessBonus: 2 },
  },

  // ─── Tyranids ───────────────────────────────────────────────────

  // Choose: re-roll melee Hit roll of 1 (Aggression) OR re-roll Save of 1 (Bioregeneration)
  'Adaptive Instincts': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { rerollHits: 'ones' },
    combatType: 'melee',
  },

  // Targets FLY: add 1 to Hit roll
  'Airborne Predator': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { hitModifier: 1 },
    combatType: 'ranged',
  },

  // Weapons have [SUSTAINED HITS 1]
  'Alpha Invader': {
    side: 'offensive',
    activation: 'always',
    modifiers: { sustainedHits: 1 },
  },

  // Weapons in unit have [SUSTAINED HITS 1] (non-leader version)
  'Alpha Warrior': {
    side: 'offensive',
    activation: 'always',
    modifiers: { sustainedHits: 1 },
  },

  // Targets Battle-shocked: add 1 to Hit roll
  'Apex-beast': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { hitModifier: 1 },
  },

  // Melee vs below Starting Strength: +1 Hit; vs Below Half: +1 Wound too
  'Feeding Frenzy': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { hitModifier: 1 },
    combatType: 'melee',
  },

  // Add 1 to Wound roll (self-inflicts D3 mortal wounds after)
  'Frenzied Metabolism': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { woundModifier: 1 },
    combatType: 'ranged',
  },

  // Enemy within Engagement Range: subtract 1 from Hit roll (defensive effect)
  'Hypnotic Gaze (Psychic)': {
    side: 'defensive',
    activation: 'conditional',
    modifiers: { hitModifier: -1 },
    combatType: 'melee',
  },

  // Re-roll Hit of 1 (re-roll Wound of 1 if within objective)
  'Vanguard Predator': {
    side: 'offensive',
    activation: 'always',
    modifiers: { rerollHits: 'ones' },
  },

  // ─── Genestealer Cults ─────────────────────────────────────────

  // Re-roll Hit of 1 (re-roll Hit roll if within objective you don't control)
  'Armoured Spearhead': {
    side: 'offensive',
    activation: 'always',
    modifiers: { rerollHits: 'ones' },
  },

  // Ranged weapons have [LETHAL HITS] (unit-level, Voice of the Patriarch)
  'Biohorror Disruption (Psychic)': {
    side: 'offensive',
    activation: 'always',
    modifiers: { lethalHits: true },
    combatType: 'ranged',
  },

  // Ranged vs MONSTER/VEHICLE: re-roll Hit of 1 and Wound of 1
  'Bring it Down!': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { rerollHits: 'ones', rerollWounds: 'ones' },
    combatType: 'ranged',
  },

  // While within objective with Officer: Benefit of Cover against ranged
  'Cadia Stands!': {
    side: 'defensive',
    activation: 'conditional',
    modifiers: { grantsBenefitOfCover: true },
  },

  // No penalty for ranged attacks while engaged
  'Close-quarters Warfare': {
    side: 'offensive',
    activation: 'always',
    modifiers: { ignoreHitPenalties: true },
    combatType: 'ranged',
  },

  // FNP 5+ (Aberrants, Abominant)
  'Feel No Pain 5+': {
    side: 'defensive',
    activation: 'always',
    modifiers: { feelNoPain: 5 },
  },

  // Targets FLY: re-roll Hit roll
  'Flak Battery': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { rerollHits: 'all' },
    combatType: 'ranged',
  },

  // Below Starting Strength: +1 Hit; Below Half: +1 Wound too
  'Grim Demeanour': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { hitModifier: 1 },
  },

  // Executioner plasma cannon vs Below Half-strength: +1 Hit
  'Gung-ho Executioners': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { hitModifier: 1 },
    combatType: 'ranged',
  },

  // Re-roll Wound of 1 (re-roll Wound roll if within objective)
  'Industrialised Destruction': {
    side: 'offensive',
    activation: 'always',
    modifiers: { rerollWounds: 'ones' },
  },

  // Melee: if charged this turn, +1 Wound roll
  'Jungle Fighters': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { woundModifier: 1 },
    combatType: 'melee',
  },

  // Can target units in Engagement Range + no penalty while engaged
  'Line-breaker': {
    side: 'offensive',
    activation: 'always',
    modifiers: { ignoreHitPenalties: true },
    combatType: 'ranged',
  },

  // Vs MONSTER/VEHICLE: re-roll Wound roll
  'Mobile Hunter-killers': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { rerollWounds: 'all' },
  },

  // Punisher gatling vs non-MONSTER/VEHICLE: [DEVASTATING WOUNDS]
  'Mow Down the Enemy': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { devastatingWounds: true },
    combatType: 'ranged',
  },

  // Roll D6: on 2+, 4+ invulnerable save (risk of mortal wounds on 1)
  'Psychic Barrier (Psychic)': {
    side: 'defensive',
    activation: 'conditional',
    modifiers: { invulnerableSave: 4 },
  },

  // Selected prey: re-roll Hit and Wound
  'Psychic Spoor': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { rerollHits: 'all', rerollWounds: 'all' },
  },

  // Order + Remained Stationary: Heavy weapons have [SUSTAINED HITS 1]
  'Rearm, Reload, Fire': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { sustainedHits: 1 },
    combatType: 'ranged',
  },

  // Not fully visible because of FORTIFICATION: Benefit of Cover
  'Reinforced Cover': {
    side: 'defensive',
    activation: 'conditional',
    modifiers: { grantsBenefitOfCover: true },
  },

  // Vanquisher battle cannon vs MONSTER/VEHICLE: re-roll Wound
  'Tank-killer': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { rerollWounds: 'all' },
    combatType: 'ranged',
  },

  // Volcano cannon vs MONSTER/VEHICLE: [DEVASTATING WOUNDS] (faction-scoped to avoid T'au collision)
  'genestealer-cults::Titan-killer': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { devastatingWounds: true },
    combatType: 'ranged',
  },

  // If has Benefit of Cover: subtract 1 from Damage
  'Urban Warfare': {
    side: 'defensive',
    activation: 'conditional',
    modifiers: { damageReduction: 1 },
  },

  // ─── Aeldari / Drukhari / T'au / Leagues of Votann ────────────

  'Acrobatic Grace': { side: 'defensive', activation: 'always', modifiers: { hitModifier: -1 } },
  'Advanced Armour': { side: 'defensive', activation: 'always', modifiers: { feelNoPain: 4 } },
  'Advanced Guardian Drone': {
    side: 'defensive',
    activation: 'always',
    modifiers: { woundModifier: -1 },
  },
  'Archon of the Poisoned Tongue (Pain)': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { lethalHits: true },
  },
  'Armour Hunter': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { hitModifier: 1 },
    combatType: 'ranged',
  },
  'Assured Destruction': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { rerollHits: 'all', rerollWounds: 'all' },
    combatType: 'ranged',
  },
  'Awakened Spirit': {
    side: 'offensive',
    activation: 'always',
    modifiers: { rerollHits: 'ones', rerollWounds: 'ones' },
  },
  'Battlefield Butchery (Pain)': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { bonusAttacks: 1, strengthBonus: 1 },
    combatType: 'melee',
  },
  Bladestorm: {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { sustainedHits: 1 },
    combatType: 'ranged',
  },
  'Bloody Spectacle': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { rerollHits: 'all', rerollWounds: 'all' },
    combatType: 'melee',
  },
  'Bounty Hunters': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { lethalHits: true },
  },
  'Breach and Clear': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { rerollWounds: 'all' },
    combatType: 'ranged',
  },
  'Break the Foe': {
    side: 'offensive',
    activation: 'always',
    modifiers: { sustainedHits: 1 },
    combatType: 'melee',
  },
  'Brides of Death (Pain)': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { strengthBonus: 1, apImprovement: 1 },
    combatType: 'melee',
  },
  'Coordinated Strike': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { rerollHits: 'ones' },
    combatType: 'ranged',
  },
  'Cruel Example': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { woundModifier: 1 },
  },
  'Crystal Matrix': {
    side: 'offensive',
    activation: 'always',
    modifiers: { rerollHits: 'ones', rerollWounds: 'ones' },
    combatType: 'ranged',
  },
  'Dance of Death': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { woundModifier: 1 },
    combatType: 'melee',
  },
  'Decapitating Strikes (Pain)': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { devastatingWounds: true },
    combatType: 'melee',
  },
  'Decisive Destruction': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { rerollHits: 'ones' },
    combatType: 'ranged',
  },
  'Eradicate the Foe': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { rerollHits: 'all' },
  },
  'Faolch\u00FA': {
    side: 'offensive',
    activation: 'always',
    modifiers: { ignoresCover: true },
    combatType: 'ranged',
  },
  'Fated Hero': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { rerollHits: 'ones', rerollWounds: 'ones' },
  },
  Fireknife: {
    side: 'offensive',
    activation: 'always',
    modifiers: { rerollHits: 'ones' },
    combatType: 'ranged',
  },
  Forceshield: { side: 'defensive', activation: 'always', modifiers: { invulnerableSave: 4 } },
  'Forgewrought Skill': {
    side: 'offensive',
    activation: 'always',
    modifiers: { rerollHits: 'all' },
  },
  'Forward Observers': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { rerollHits: 'ones', rerollWounds: 'ones' },
    combatType: 'ranged',
  },
  'Geomantic Hunters': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { rerollWounds: 'all' },
    combatType: 'ranged',
  },
  'Ground Strike Fighter': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { hitModifier: 1 },
    combatType: 'ranged',
  },
  'Ground-attack Craft': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { hitModifier: 1 },
    combatType: 'ranged',
  },
  'Guided by Fate': {
    side: 'offensive',
    activation: 'always',
    modifiers: { rerollHits: 'all', rerollWounds: 'all' },
  },
  'Hatred Eternal (Pain)': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { rerollHits: 'all' },
  },
  'Inescapable Accuracy': {
    side: 'offensive',
    activation: 'always',
    modifiers: { ignoreHitPenalties: true },
    combatType: 'ranged',
  },
  Mandiblasters: {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { critHitOn: 5 },
    combatType: 'melee',
  },
  'Master of Blades (Pain)': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { woundModifier: 1 },
    combatType: 'melee',
  },
  Mistshield: { side: 'defensive', activation: 'always', modifiers: { invulnerableSave: 4 } },
  'Multi-spectral visor': {
    side: 'offensive',
    activation: 'always',
    modifiers: { rerollWounds: 'ones' },
    combatType: 'ranged',
  },
  'MultiCOG Targeting': {
    side: 'offensive',
    activation: 'always',
    modifiers: { ignoreHitPenalties: true },
    combatType: 'ranged',
  },
  'Pan-spectral Scanning': {
    side: 'offensive',
    activation: 'always',
    modifiers: { rerollHits: 'ones' },
    combatType: 'ranged',
  },
  'Pan-spectral scanner': {
    side: 'offensive',
    activation: 'always',
    modifiers: { rerollHits: 'ones' },
    combatType: 'ranged',
  },
  'Piratical Raiders': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { lethalHits: true },
  },
  'Precise Targeting': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { rerollHits: 'all' },
    combatType: 'ranged',
  },
  'Psychic Guidance': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { hitModifier: 1 },
  },
  'Reavers of the Void': {
    side: 'offensive',
    activation: 'always',
    modifiers: { rerollHits: 'ones' },
  },
  'Resource Transmutation': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { sustainedHits: 1 },
    combatType: 'ranged',
  },
  'Rollbar searchlight': {
    side: 'offensive',
    activation: 'always',
    modifiers: { ignoreHitPenalties: true },
    combatType: 'ranged',
  },
  'Runes of Battle (Psychic)': {
    side: 'offensive',
    activation: 'always',
    modifiers: { ignoresCover: true },
  },
  'Sadistic Raiders (Pain)': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { rerollWounds: 'ones' },
  },
  Scattershield: {
    side: 'defensive',
    activation: 'always',
    modifiers: { invulnerableSave: 4, damageReduction: 1 },
  },
  'Serpent Shield': { side: 'defensive', activation: 'always', modifiers: { invulnerableSave: 5 } },
  Shimmershield: { side: 'defensive', activation: 'always', modifiers: { invulnerableSave: 4 } },
  'Silent Executioner': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { rerollHits: 'all' },
  },
  Skyhunter: {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { hitModifier: 1, woundModifier: 1 },
    combatType: 'ranged',
  },
  'Soul Trap': {
    side: 'offensive',
    activation: 'always',
    modifiers: { bonusAttacks: 1, strengthBonus: 1 },
    combatType: 'melee',
  },
  Starscythe: {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { apImprovement: 1 },
    combatType: 'ranged',
  },
  'Storm of Silence': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { rerollWounds: 'all' },
  },
  Sunforge: {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { rerollWounds: 'all' },
    combatType: 'ranged',
  },
  'Support System': {
    side: 'offensive',
    activation: 'always',
    modifiers: { ignoreHitPenalties: true },
    combatType: 'ranged',
  },
  'Swift Demise': { side: 'offensive', activation: 'always', modifiers: { rerollHits: 'ones' } },
  'Target Uploaded': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { hitModifier: 1, ignoresCover: true },
    combatType: 'ranged',
  },
  'tau-empire::Titan-killer': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { rerollHits: 'all' },
    combatType: 'ranged',
  },
  'Velocity Tracker': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { rerollHits: 'all' },
    combatType: 'ranged',
  },
  'Wave Serpent Shield': {
    side: 'defensive',
    activation: 'conditional',
    modifiers: { woundModifier: -1 },
  },
  'Weapon Support System': {
    side: 'offensive',
    activation: 'always',
    modifiers: { ignoreHitPenalties: true },
    combatType: 'ranged',
  },
  'Weavefield crest': {
    side: 'defensive',
    activation: 'always',
    modifiers: { invulnerableSave: 4 },
  },
  'Winged Strike (Pain)': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { rerollHits: 'all' },
    combatType: 'ranged',
  },
  'aeldari::Overlord': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { rerollWounds: 'ones' },
  },
  'drukhari::Tormentors': {
    side: 'offensive',
    activation: 'conditional',
    modifiers: { hitModifier: 1 },
    combatType: 'melee',
  },
};
