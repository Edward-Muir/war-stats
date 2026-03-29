import type { StratagemEffectEntry } from './stratagem-effects';
import {
  PLUS_1_HIT,
  MINUS_1_HIT,
  PLUS_1_WOUND,
  MINUS_1_WOUND,
  AP_IMPROVE_1,
  AP_WORSEN_1,
  REROLL_HITS,
  REROLL_HITS_ONES,
  REROLL_WOUNDS,
  REROLL_WOUNDS_ONES,
  LETHAL_HITS,
  SUSTAINED_1,
  DEVASTATING_WOUNDS,
  IGNORES_COVER,
  LANCE,
  CRIT_HIT_5,
  FNP_4,
  FNP_5,
  FNP_6,
  MINUS_1_DAMAGE,
  INVULN_4,
  INVULN_5,
  BONUS_ATTACKS_1,
  STRENGTH_BONUS_1,
  DAMAGE_BONUS_1,
  GRANTS_STEALTH,
  GRANTS_COVER,
  IGNORE_ALL_PENALTIES,
  merge,
  conditional,
} from './modifier-templates';

// ─── Enhancement Name-to-Effect Mapping Table ──────────────────
// Most enhancement names are unique across the game, so key by name.
// For collisions use "Faction::Detachment::Name" as key.

export const ENHANCEMENT_EFFECTS: Record<string, StratagemEffectEntry> = {
  // ── Space Marines ────────────────────────────────────────────
  'Artificer Armour': merge({ saveOverride: 2 }, FNP_5),
  'The Honour Vehement': { bonusAttacks: 1, strengthBonus: 1 },
  'Fire Discipline': SUSTAINED_1,
  'Stoic Defender': FNP_6,
  'Architect of War': IGNORES_COVER,
  'Target Augury Web': LETHAL_HITS,
  'The Flesh is Weak': FNP_4,
  'Fury of the Storm': conditional(
    { strengthBonus: 1, apImprovement: 1 },
    { condition: { type: 'charged' }, modifiers: { strengthBonus: 2, apImprovement: 2 } }
  ),
  'Ghostweave Cloak': GRANTS_STEALTH,
  "The Imperium's Sword": BONUS_ATTACKS_1,
  'Iron Resolve': FNP_5,
  'Blades of Valour': AP_IMPROVE_1,
  'Bearer of the Evanescent Ion': GRANTS_STEALTH,
  "Bearer of the Judicant's Helm": IGNORES_COVER,
  "Purgation's Hand": merge(REROLL_HITS_ONES, REROLL_WOUNDS_ONES),
  'Augury Halo': IGNORES_COVER,
  'Pennant of Silvered Fury': { sustainedHits: 2 },
  "Mentor's Pride": REROLL_HITS_ONES,
  'Omnissian Champion': { woundsBonus: 4 },
  'Knight of the Opus Machina': REROLL_HITS_ONES,

  // ── Grey Knights ─────────────────────────────────────────────
  'Sanctic Reaper': { bonusAttacks: 3 },
  'Sigil of the Hunt': REROLL_HITS_ONES,
  'The Sixty-sixth Seal': AP_IMPROVE_1,
  'Spiritus Machina': REROLL_WOUNDS,
  'Grimoire of Conjunctions': { strengthBonus: 4 },
  'Shield of Prophecy': { toughnessBonus: 2 },

  // ── Imperial Agents ──────────────────────────────────────────
  'Blackweave Shroud': FNP_4,
  'Grimoire of True Names': merge(MINUS_1_HIT, MINUS_1_WOUND),

  // ── Imperial Knights ─────────────────────────────────────────
  'Wyrmslayer Divination': REROLL_HITS,
  'Diabolical Resilience': FNP_6,

  // ── Aeldari ──────────────────────────────────────────────────
  'Psychic Destroyer': DAMAGE_BONUS_1,
  'Mirage Field': MINUS_1_HIT,
  'Rune of Mists': GRANTS_COVER,
  'Gaze of Ynnead': DEVASTATING_WOUNDS,
  'Borrowed Vigour': { bonusAttacks: 2 },
  'Morbid Might': REROLL_WOUNDS,
  'Aspect of Murder': DAMAGE_BONUS_1,
  'Mantle of Wisdom': merge(REROLL_HITS_ONES, REROLL_WOUNDS_ONES),
  Shimmerstone: MINUS_1_WOUND,
  'Guiding Presence': PLUS_1_HIT,
  "Weavers' Wail": { strengthBonus: 3, bonusAttacks: 1 },
  "Murder's Jest": CRIT_HIT_5,

  // ── Drukhari ─────────────────────────────────────────────────
  'Eye of Spite': { bonusAttacks: 1, apImprovement: 1 },
  'Sadistic Fulcrum': REROLL_HITS,
  "Morghenna's Curse": merge(AP_IMPROVE_1, DAMAGE_BONUS_1),
  'Leechbite Plate': { saveOverride: 3 },
  'Master Artisan': { woundsBonus: 1, toughnessBonus: 1 },

  // ── T'au Empire ──────────────────────────────────────────────
  'Precision of the Patient Hunter': PLUS_1_HIT,
  'Through Unity, Devastation': LETHAL_HITS,
  'Coordinated Exploitation': SUSTAINED_1,
  'Borthrod Gland': CRIT_HIT_5,
  'Kroothawk Flock': IGNORES_COVER,
  'Root-carved Weapons': DEVASTATING_WOUNDS,
  'Prototype Weapon System (Lethal)': LETHAL_HITS,
  'Prototype Weapon System (Sustained)': SUSTAINED_1,
  'Supernova Launcher': { strengthBonus: 3, apImprovement: 1, damageBonus: 1 },
  'Thermoneutronic Projector': { strengthBonus: 2, apImprovement: 1, damageBonus: 1 },
  'Plasma Accelerator Rifle': {
    strengthBonus: 2,
    bonusAttacks: 1,
    apImprovement: 1,
    damageBonus: 1,
  },

  // ── Leagues of Votann ────────────────────────────────────────
  'Oathbound Speculator': REROLL_WOUNDS_ONES,
  'Oathbound Speculator (+1 Wound)': PLUS_1_WOUND,
  'Quake Supervisor': PLUS_1_HIT,
  'Trivarg Cyber Implant': { sustainedHits: 2 },
  'Bastion Shield': AP_WORSEN_1,
  Ironskein: { woundsBonus: 2 },

  // ── Chaos Space Marines ──────────────────────────────────────
  "Warmaster's Gift": { critWoundOn: 5 },
  'Cursed Fang': AP_IMPROVE_1,
  'Shroud of Obfuscation': GRANTS_STEALTH,
  'Dread Reaver': merge(REROLL_HITS, REROLL_WOUNDS),
  'Ironbound Enmity': PLUS_1_WOUND,
  'Warp Tracer': IGNORES_COVER,
  'Intoxicating Elixir': FNP_5,
  'Talisman of Burning Blood': merge(BONUS_ATTACKS_1, STRENGTH_BONUS_1),
  'Incendiary Goad': STRENGTH_BONUS_1,
  "Forge's Blessing": FNP_6,
  'Mind Blade': LANCE,
  'Infernal Avatar': { strengthBonus: 2, apImprovement: 1 },
  "Night's Shroud": GRANTS_STEALTH,
  'Greyveil Hex': GRANTS_STEALTH,
  'Voice of the Tyrant': PLUS_1_HIT,
  'Eager for Vengeance': PLUS_1_HIT,
  'Prime Test Subject': merge(DAMAGE_BONUS_1, REROLL_HITS),
  'Living Carapace': merge({ woundsBonus: 1 }, FNP_5),

  // ── Death Guard ──────────────────────────────────────────────
  'Daemon Weapon of Nurgle': CRIT_HIT_5,
  'Furnace of Plagues': merge(BONUS_ATTACKS_1, STRENGTH_BONUS_1, DEVASTATING_WOUNDS),
  'Arch Contaminator': REROLL_WOUNDS,
  'Revolting Regeneration': FNP_5,
  'Eye of Affliction': IGNORES_COVER,
  'Tendrilous Emissions': REROLL_WOUNDS_ONES,
  'Fell Harvester': { bonusAttacks: 2 },
  Sorrowsyphon: DAMAGE_BONUS_1,
  'Talisman of Burgeoning': { toughnessBonus: 1 },

  // ── Thousand Sons ────────────────────────────────────────────
  "Eldritch Vortex of E'taph": merge(STRENGTH_BONUS_1, DAMAGE_BONUS_1),
  'Tome of True Names': { invulnerableSave: 2 },
  'Diamond of Distortion': MINUS_1_HIT,
  'Flowing Flesh': FNP_4,
  'Lord of the Rubricae': PLUS_1_HIT,
  'The Stave Abominus': merge({ sustainedHits: 2 }, DEVASTATING_WOUNDS),

  // ── World Eaters ─────────────────────────────────────────────
  'Berzerker Glaive': merge(BONUS_ATTACKS_1, DAMAGE_BONUS_1),
  'Helm of Brazen Ire': MINUS_1_DAMAGE,
  'Brazen Form': merge({ toughnessBonus: 1 }, FNP_5),
  'Blood-forged Armour': { saveOverride: 2 },
  'Blade of Endless Bloodshed': merge(BONUS_ATTACKS_1, STRENGTH_BONUS_1, DAMAGE_BONUS_1),
  'Frenzied Focus': CRIT_HIT_5,

  // ── Emperor's Children ───────────────────────────────────────
  'Steeped in Suffering': PLUS_1_HIT,
  'Intoxicating Musk': MINUS_1_WOUND,
  Distortion: merge(BONUS_ATTACKS_1, DAMAGE_BONUS_1),
  'Dark Blessings': { invulnerableSave: 3 },
  'Possessed Blade': BONUS_ATTACKS_1,
  'Tears of the Phoenix': IGNORE_ALL_PENALTIES,
  Spiritsliver: merge(STRENGTH_BONUS_1, BONUS_ATTACKS_1),
  'Slayer of Champions': { strengthBonus: 1, apImprovement: 1 },

  // ── Chaos Knights ────────────────────────────────────────────
  'Profane Altar': merge(LETHAL_HITS, SUSTAINED_1),
  'Veil of Medrengard': INVULN_4,
  'Knight Diabolus': PLUS_1_HIT,
  'Blasphemous Engine': { woundsBonus: 2 },
  'Fleshmetal Fusion': { toughnessBonus: 1 },
  'Putrid Carapace': { saveOverride: 2 },
  'Final Howl': REROLL_WOUNDS_ONES,
  'Panoply of the Cursed Knight': AP_WORSEN_1,

  // ── Chaos Daemons ────────────────────────────────────────────
  "A'rgath, the King of Blades": merge(BONUS_ATTACKS_1, STRENGTH_BONUS_1),
  'The Endless Gift': FNP_5,
  'The Everstave': STRENGTH_BONUS_1,
  Slaughterthirst: LANCE,
  "Fury's Cage": merge(REROLL_HITS, REROLL_WOUNDS),
  'False Majesty': PLUS_1_WOUND,
  'Dreaming Crown': PLUS_1_HIT,
  'Font of Spores': AP_IMPROVE_1,

  // ── Adepta Sororitas ─────────────────────────────────────────
  'Through Suffering, Strength': { bonusAttacks: 1, strengthBonus: 1, damageBonus: 1 },
  'Refrain of Enduring Faith': INVULN_5,
  'Righteous Rage': { bonusAttacks: 3, strengthBonus: 3 },
  'Fire and Fury': SUSTAINED_1,
  'Iron Surplice of Saint Istalela': merge({ saveOverride: 2 }, FNP_5),
  'Blade of Saint Ellynor': { strengthBonus: 1, apImprovement: 1 },

  // ── Adeptus Custodes ─────────────────────────────────────────
  'Gift of Terran Artifice': PLUS_1_WOUND,
  'Radiant Mantle': MINUS_1_HIT,
  'From the Hall of Armouries': { strengthBonus: 1, damageBonus: 1 },
  Panoptispex: IGNORES_COVER,
  'Enhanced Voidsheen Cloak': MINUS_1_DAMAGE,
  'Oblivion Knight': PLUS_1_HIT,
  'Raptor Blade': { bonusAttacks: 1, strengthBonus: 1, damageBonus: 1 },
  'Veiled Blade': { bonusAttacks: 2 },
  'Adamantine Talisman': { bonusAttacks: 1, strengthBonus: 1, damageBonus: 1 },
  'Augury Uplink': FNP_5,
  'Honoured Fallen': REROLL_HITS_ONES,

  // ── Adeptus Mechanicus ───────────────────────────────────────
  'Malphonic Susurrus': GRANTS_STEALTH,
  'Peerless Eradicator': SUSTAINED_1,
  Genetor: INVULN_4,
  Logis: PLUS_1_HIT,

  // ── Astra Militarum ──────────────────────────────────────────
  'Drill Commander': conditional(
    {},
    { condition: { type: 'remainedStationary' }, modifiers: CRIT_HIT_5 }
  ),
  'Sacred Unguents': REROLL_HITS,
  'Smoke Grenades': merge(GRANTS_COVER, GRANTS_STEALTH),
  'Indomitable Steed': FNP_6,
  'Veteran Crew': REROLL_HITS_ONES,

  // ── Necrons ──────────────────────────────────────────────────
  'Nether-realm Casket': GRANTS_STEALTH,
  'Phasal Subjugator': PLUS_1_HIT,
  'Enaegic Dermal Bond': FNP_4,
  'Arisen Tyrant': REROLL_HITS_ONES,
  'Hyperphasic Fulcrum': REROLL_WOUNDS_ONES,
  'Warrior Noble': MINUS_1_HIT,
  'Eternal Conqueror': REROLL_HITS,
  'Dread Majesty': merge(REROLL_HITS_ONES, REROLL_WOUNDS_ONES),
  'Miniaturised Nebuloscope': IGNORES_COVER,
  'Chrono-impedance Fields': MINUS_1_DAMAGE,
  'Destroyer Ankh': { bonusAttacks: 2 },
  'Mark of the Nekrosor': PLUS_1_HIT,

  // ── Orks ─────────────────────────────────────────────────────
  "Headwoppa's Killchoppa": DEVASTATING_WOUNDS,
  'Supa-Cybork Body': FNP_4,
  'Proper Killy': DAMAGE_BONUS_1,
  'Surly as a Squiggoth': MINUS_1_WOUND,
  'Gitfinder Googlez': IGNORES_COVER,
  'Smoky Gubbinz': GRANTS_STEALTH,
  'Mek Kaptin': REROLL_HITS,
  'Da Gobshot Thunderbuss': DEVASTATING_WOUNDS,
  "Targetin' Squigs": PLUS_1_HIT,
  'Ferocious Show Off': STRENGTH_BONUS_1,

  // ── Tyranids ─────────────────────────────────────────────────
  'Adaptive Biology': FNP_5,
  'Monstrous Nemesis': PLUS_1_WOUND,
  'Naturalised Camouflage': GRANTS_COVER,
  Chameleonic: merge(GRANTS_STEALTH, GRANTS_COVER),
  Stalker: merge(PLUS_1_HIT, PLUS_1_WOUND),
  'Power of the Hive Mind': merge(STRENGTH_BONUS_1, AP_IMPROVE_1),
  'Synaptic Control': MINUS_1_DAMAGE,
  'Parasitic Biomorphology': STRENGTH_BONUS_1,

  // ── Genestealer Cults ────────────────────────────────────────
  'A Chink in Their Armour': LETHAL_HITS,
  'Assassination Edict': PLUS_1_HIT,
  'Denunciator of Tyrants': merge(PLUS_1_HIT, PLUS_1_WOUND),
  'Biomorph Adaptation': merge(AP_IMPROVE_1, DAMAGE_BONUS_1),
  'Assault Commando': REROLL_HITS,
  'Martial Espionage': AP_IMPROVE_1,
};
