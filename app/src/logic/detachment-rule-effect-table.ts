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
  FNP_6,
  INVULN_4,
  INVULN_5,
  BONUS_ATTACKS_1,
  STRENGTH_BONUS_1,
  GRANTS_STEALTH,
  GRANTS_COVER,
  IGNORE_HIT_PENALTIES,
  IGNORE_ALL_PENALTIES,
  merge,
  conditional,
} from './modifier-templates';

// ─── Detachment Rule Effect Lookup Table ──────────────────────
// Keyed by "Faction::Detachment::RuleName". Where a detachment
// rule has multiple modes or tiers, each variant gets its own
// suffixed key.

export const DETACHMENT_RULE_EFFECTS: Record<string, StratagemEffectEntry> = {
  // ═══════════════════════════════════════════════════════════════
  // SPACE MARINES
  // ═══════════════════════════════════════════════════════════════

  'Space Marines::Anvil Siege Force::Shield of the Imperium': conditional(
    {},
    { condition: { type: 'remainedStationary' }, modifiers: PLUS_1_WOUND }
  ),
  'Space Marines::Vanguard Spearhead::Shadow Masters': merge(MINUS_1_HIT, GRANTS_COVER),
  'Space Marines::1st Company Task Force::Extremis-level Threat': REROLL_WOUNDS,
  'Space Marines::Librarius Conclave::Divination Discipline': merge(
    REROLL_HITS_ONES,
    REROLL_WOUNDS_ONES
  ),
  'Space Marines::Librarius Conclave::Pyromancy Discipline': AP_IMPROVE_1,
  'Space Marines::Librarius Conclave::Telepathy Discipline': IGNORE_ALL_PENALTIES,
  'Space Marines::Bastion Task Force::Interlocking Tactics': REROLL_HITS_ONES,

  // ═══════════════════════════════════════════════════════════════
  // GREY KNIGHTS
  // ═══════════════════════════════════════════════════════════════

  'Grey Knights::Brotherhood Strike::Fury of Titan': merge(REROLL_HITS_ONES, REROLL_WOUNDS_ONES),
  'Grey Knights::Banishers::Channelled Force (Sustained)': SUSTAINED_1,
  'Grey Knights::Banishers::Channelled Force (Lethal)': LETHAL_HITS,
  'Grey Knights::Warpbane Task Force::Hallowed Ground': REROLL_HITS_ONES,

  // ═══════════════════════════════════════════════════════════════
  // IMPERIAL AGENTS
  // ═══════════════════════════════════════════════════════════════

  'Imperial Agents::Ordo Xenos::Furor Tactics': SUSTAINED_1,
  'Imperial Agents::Ordo Xenos::Malleus Tactics': LETHAL_HITS,
  'Imperial Agents::Ordo Hereticus::Root out Heresy': IGNORES_COVER,
  'Imperial Agents::Ordo Malleus::Destroy the Daemonic': REROLL_HITS_ONES,
  'Imperial Agents::Imperialis Fleet::Eliminate At All Costs': PLUS_1_HIT,

  // ═══════════════════════════════════════════════════════════════
  // IMPERIAL KNIGHTS
  // ═══════════════════════════════════════════════════════════════

  'Imperial Knights::Gate Warden Lance::Dauntless Defenders': merge(
    IGNORE_HIT_PENALTIES,
    SUSTAINED_1
  ),
  'Imperial Knights::Questor Forgepact::Divine Inspiration': REROLL_HITS_ONES,

  // ═══════════════════════════════════════════════════════════════
  // AELDARI
  // ═══════════════════════════════════════════════════════════════

  'Aeldari::Spirit Conclave::Shepherds of the Dead': merge(PLUS_1_HIT, PLUS_1_WOUND),
  'Aeldari::Guardian Battlehost::Defend at All Costs': PLUS_1_HIT,
  'Aeldari::Aspect Host::Path of the Warrior (Reroll Hits)': REROLL_HITS_ONES,
  'Aeldari::Aspect Host::Path of the Warrior (Reroll Wounds)': REROLL_WOUNDS_ONES,
  "Aeldari::Serpent's Brood::Boons of the Brood": SUSTAINED_1,

  // ═══════════════════════════════════════════════════════════════
  // DRUKHARI
  // ═══════════════════════════════════════════════════════════════

  'Drukhari::Skysplinter Assault::Rain of Cruelty (Ranged)': IGNORES_COVER,
  'Drukhari::Skysplinter Assault::Rain of Cruelty (Melee)': LANCE,
  'Drukhari::Spectacle of Spite::Adrenalight': { bonusAttacks: 1 },
  'Drukhari::Spectacle of Spite::Serpentin': PLUS_1_HIT,
  'Drukhari::Spectacle of Spite::Grave Lotus': STRENGTH_BONUS_1,
  'Drukhari::Spectacle of Spite::Splintermind': PLUS_1_HIT,
  'Drukhari::Spectacle of Spite::Painbringer': { toughnessBonus: 1 },
  'Drukhari::Covenite Coterie::Stitchflesh Abominations': MINUS_1_WOUND,
  'Drukhari::Kabalite Cartel::Sow Fear and Terror': SUSTAINED_1,
  'Drukhari::Kabalite Cartel::Show of Strength': LETHAL_HITS,
  "Drukhari::Reaper's Wager::Winning the Wager": REROLL_HITS_ONES,
  "Drukhari::Reaper's Wager::Losing the Wager": merge(REROLL_HITS_ONES, REROLL_WOUNDS_ONES),

  // ═══════════════════════════════════════════════════════════════
  // T'AU EMPIRE
  // ═══════════════════════════════════════════════════════════════

  "T'au Empire::Kauyon::Patient Hunter": SUSTAINED_1,
  "T'au Empire::Mont'ka::Killing Blow": LETHAL_HITS,
  'T\'au Empire::Retaliation Cadre::Bonded Heroes (12")': STRENGTH_BONUS_1,
  'T\'au Empire::Retaliation Cadre::Bonded Heroes (9")': merge(STRENGTH_BONUS_1, AP_IMPROVE_1),
  "T'au Empire::Kroot Hunting Pack::Hunter's Instincts (Below Starting)": PLUS_1_HIT,
  "T'au Empire::Kroot Hunting Pack::Hunter's Instincts (Below Half)": merge(
    PLUS_1_HIT,
    PLUS_1_WOUND
  ),
  "T'au Empire::Auxiliary Cadre::Targeting Triangulation": AP_IMPROVE_1,

  // ═══════════════════════════════════════════════════════════════
  // LEAGUES OF VOTANN
  // ═══════════════════════════════════════════════════════════════

  'Leagues of Votann::Brandfast Oathband::Mobile Sensor Relays': SUSTAINED_1,
  'Leagues of Votann::Hearthfyre Arsenal::Optimal Application': REROLL_HITS_ONES,
  'Leagues of Votann::Hearthband::Methodical Annihilation': REROLL_WOUNDS_ONES,

  // ═══════════════════════════════════════════════════════════════
  // CHAOS SPACE MARINES
  // ═══════════════════════════════════════════════════════════════

  'Chaos Space Marines::Veterans of the Long War::Focus of Hatred': REROLL_HITS,
  'Chaos Space Marines::Renegade Raiders::Raiders and Reavers': AP_IMPROVE_1,
  'Chaos Space Marines::Fellhammer Siege-host::Iron Fortitude': MINUS_1_WOUND,
  'Chaos Space Marines::Pactbound Zealots::Marks of Chaos (Khorne + Lethal)': CRIT_HIT_5,
  'Chaos Space Marines::Pactbound Zealots::Marks of Chaos (Tzeentch + Lethal)': CRIT_HIT_5,
  'Chaos Space Marines::Pactbound Zealots::Marks of Chaos (Undivided)': REROLL_HITS_ONES,
  'Chaos Space Marines::Pactbound Zealots::Marks of Chaos (Nurgle + Sustained)': CRIT_HIT_5,
  'Chaos Space Marines::Pactbound Zealots::Marks of Chaos (Slaanesh + Sustained)': CRIT_HIT_5,
  'Chaos Space Marines::Soulforged Warpack::Debt to the Soul Forge (Ranged)': PLUS_1_WOUND,
  'Chaos Space Marines::Soulforged Warpack::Debt to the Soul Forge (Melee)': { bonusAttacks: 2 },
  'Chaos Space Marines::Cabal of Chaos::Leaping Warpflame': STRENGTH_BONUS_1,
  'Chaos Space Marines::Cabal of Chaos::Monstrous Manifestation': AP_IMPROVE_1,
  'Chaos Space Marines::Creations of Bile::Cholinergic Accelerants': BONUS_ATTACKS_1,
  'Chaos Space Marines::Creations of Bile::Macrotensile Sinews': STRENGTH_BONUS_1,
  'Chaos Space Marines::Creations of Bile::Supracutaneous Chitination': { toughnessBonus: 1 },
  'Chaos Space Marines::Nightmare Hunt::Terror Made Manifest (+1 Hit)': PLUS_1_HIT,
  'Chaos Space Marines::Nightmare Hunt::Terror Made Manifest (+1 Wound)': PLUS_1_WOUND,
  "Chaos Space Marines::Huron's Marauders::Huron's Elite": PLUS_1_HIT,

  // ═══════════════════════════════════════════════════════════════
  // THOUSAND SONS
  // ═══════════════════════════════════════════════════════════════

  'Thousand Sons::Grand Coven::Psychic Maelstrom': PLUS_1_WOUND,
  'Thousand Sons::Grand Coven::Wrath of the Immaterium': DEVASTATING_WOUNDS,
  'Thousand Sons::Changehost of Deceit::Daemonic Illusions': INVULN_4,
  'Thousand Sons::Warpmeld Pact::Warpmeld Sacrifice (Defensive)': MINUS_1_WOUND,
  'Thousand Sons::Warpmeld Pact::Warpmeld Sacrifice (Offensive)': PLUS_1_WOUND,
  'Thousand Sons::Rubricae Phalanx::All is Dust': AP_WORSEN_1,
  'Thousand Sons::Hexwarp Thrallband::Flow of Magic': REROLL_WOUNDS_ONES,

  // ═══════════════════════════════════════════════════════════════
  // WORLD EATERS
  // ═══════════════════════════════════════════════════════════════

  'World Eaters::Berzerker Warband::Relentless Rage': conditional(
    {},
    { condition: { type: 'charged' }, modifiers: { bonusAttacks: 1, strengthBonus: 2 } }
  ),
  'World Eaters::Cult of Blood::Idol of Infinite Rage': merge(PLUS_1_HIT, PLUS_1_WOUND),
  'World Eaters::Cult of Blood::Idol of Blessed Blood': INVULN_4,
  'World Eaters::Khorne Daemonkin::Daemonic Rage': LANCE,
  'World Eaters::Khorne Daemonkin::Boon of Blood': INVULN_4,
  'World Eaters::Goretrack Onslaught::Rush to the Fray': LANCE,

  // ═══════════════════════════════════════════════════════════════
  // EMPEROR'S CHILDREN
  // ═══════════════════════════════════════════════════════════════

  "Emperor's Children::Peerless Bladesmen::Exquisite Swordsmanship (Lethal)": LETHAL_HITS,
  "Emperor's Children::Peerless Bladesmen::Exquisite Swordsmanship (Sustained)": SUSTAINED_1,
  "Emperor's Children::Rapid Evisceration::Mechanised Murder": merge(
    REROLL_HITS_ONES,
    REROLL_WOUNDS_ONES
  ),
  "Emperor's Children::Carnival of Excess::Daemonic Empowerment": SUSTAINED_1,
  "Emperor's Children::Carnival of Excess::Daemonic Empowerment (Upgrade)": CRIT_HIT_5,
  "Emperor's Children::Coterie of the Conceited::Pledges 1+": REROLL_HITS_ONES,
  "Emperor's Children::Coterie of the Conceited::Pledges 3+": merge(
    REROLL_HITS_ONES,
    REROLL_WOUNDS_ONES
  ),
  "Emperor's Children::Coterie of the Conceited::Pledges 5+": merge(
    REROLL_HITS_ONES,
    REROLL_WOUNDS_ONES,
    LETHAL_HITS,
    SUSTAINED_1
  ),
  "Emperor's Children::Coterie of the Conceited::Pledges 7+": merge(
    REROLL_HITS_ONES,
    REROLL_WOUNDS_ONES,
    LETHAL_HITS,
    SUSTAINED_1,
    CRIT_HIT_5
  ),
  "Emperor's Children::Slaanesh's Chosen::Internal Rivalries": REROLL_WOUNDS,
  "Emperor's Children::Court of the Phoenician::Sensational Performance": conditional(
    {},
    { condition: { type: 'charged' }, modifiers: merge(STRENGTH_BONUS_1, AP_IMPROVE_1) }
  ),

  // ═══════════════════════════════════════════════════════════════
  // CHAOS KNIGHTS
  // ═══════════════════════════════════════════════════════════════

  'Chaos Knights::Infernal Lance::Diabolic Power (Lethal)': LETHAL_HITS,
  'Chaos Knights::Infernal Lance::Diabolic Power (Sustained)': SUSTAINED_1,
  'Chaos Knights::Infernal Lance::Unnatural Fortitude (Invuln)': INVULN_5,
  'Chaos Knights::Infernal Lance::Unnatural Fortitude (FNP)': FNP_6,
  'Chaos Knights::Houndpack Lance::Marked Prey': SUSTAINED_1,
  'Chaos Knights::Iconoclast Fiefdom::Dread Tyrants': merge(REROLL_HITS_ONES, REROLL_WOUNDS_ONES),
  'Chaos Knights::Iconoclast Fiefdom::Dark Sacrifice (Lethal)': LETHAL_HITS,
  'Chaos Knights::Iconoclast Fiefdom::Dark Sacrifice (Sustained)': SUSTAINED_1,

  // ═══════════════════════════════════════════════════════════════
  // CHAOS DAEMONS
  // ═══════════════════════════════════════════════════════════════

  'Chaos Daemons::Blood Legion::Slaughterthirst': LANCE,
  'Chaos Daemons::Legion of Excess::False Majesty': PLUS_1_WOUND,
  'Chaos Daemons::Legion of Excess::Dreaming Crown': PLUS_1_HIT,
  'Chaos Daemons::Plague Legion::Font of Spores': AP_IMPROVE_1,

  // ═══════════════════════════════════════════════════════════════
  // ADEPTA SORORITAS
  // ═══════════════════════════════════════════════════════════════

  'Adepta Sororitas::Hallowed Martyrs::The Blood of Martyrs (Below Starting)': PLUS_1_HIT,
  'Adepta Sororitas::Hallowed Martyrs::The Blood of Martyrs (Below Half)': merge(
    PLUS_1_HIT,
    PLUS_1_WOUND
  ),
  'Adepta Sororitas::Bringers of Flame::Fervent Purgation': STRENGTH_BONUS_1,
  'Adepta Sororitas::Penitent Host::Absolution in Battle': conditional(
    {},
    { condition: { type: 'charged' }, modifiers: { bonusAttacks: 1, strengthBonus: 1 } }
  ),

  // ═══════════════════════════════════════════════════════════════
  // ADEPTUS CUSTODES
  // ═══════════════════════════════════════════════════════════════

  'Adeptus Custodes::Talons of the Emperor::Deadly Unity': PLUS_1_HIT,
  'Adeptus Custodes::Shield Host::Martial Mastery (Crit 5+)': CRIT_HIT_5,
  'Adeptus Custodes::Shield Host::Martial Mastery (+1 AP)': AP_IMPROVE_1,
  'Adeptus Custodes::Auric Champions::Assemblage of Might': PLUS_1_WOUND,
  'Adeptus Custodes::Solar Spearhead::Auric Armour (Below Starting)': REROLL_HITS_ONES,
  'Adeptus Custodes::Solar Spearhead::Auric Armour (Below Half)': merge(
    REROLL_HITS_ONES,
    REROLL_WOUNDS_ONES
  ),
  'Adeptus Custodes::Lions of the Emperor::Against All Odds': merge(PLUS_1_HIT, PLUS_1_WOUND),

  // ═══════════════════════════════════════════════════════════════
  // ADEPTUS MECHANICUS
  // ═══════════════════════════════════════════════════════════════

  'Adeptus Mechanicus::Skitarii Hunter Cohort::Stealth Optimisation': GRANTS_STEALTH,
  'Adeptus Mechanicus::Data-Psalm Conclave::Panegyric Procession': conditional(
    {},
    { condition: { type: 'targetInHalfRange' }, modifiers: AP_IMPROVE_1 }
  ),
  'Adeptus Mechanicus::Data-Psalm Conclave::Citation in Savagery': conditional(
    {},
    { condition: { type: 'charged' }, modifiers: { bonusAttacks: 1, strengthBonus: 1 } }
  ),
  'Adeptus Mechanicus::Explorator Maniple::Acquisition At Any Cost': REROLL_WOUNDS_ONES,

  // ═══════════════════════════════════════════════════════════════
  // ASTRA MILITARUM
  // ═══════════════════════════════════════════════════════════════

  'Astra Militarum::Combined Arms::Born Soldiers': LETHAL_HITS,
  'Astra Militarum::Mechanised Assault::Armoured Fist': PLUS_1_WOUND,
  'Astra Militarum::Recon Element::Masters of Camouflage': GRANTS_COVER,
  'Astra Militarum::Bridgehead Strike::Only the Best': REROLL_HITS_ONES,
  'Astra Militarum::Grizzled Company::Ruthless Discipline': REROLL_HITS_ONES,

  // ═══════════════════════════════════════════════════════════════
  // NECRONS
  // ═══════════════════════════════════════════════════════════════

  'Necrons::Awakened Dynasty::Command Protocols': PLUS_1_HIT,
  'Necrons::Annihilation Legion::Annihilation Protocol': AP_IMPROVE_1,
  'Necrons::Canoptek Court::Power Matrix': REROLL_HITS_ONES,
  'Necrons::Obeisance Phalanx::Worthy Foes': PLUS_1_WOUND,
  'Necrons::Starshatter Arsenal::Relentless Onslaught': PLUS_1_HIT,
  'Necrons::Cursed Legion::Cold Fervour': { strengthBonus: 2 },
  'Necrons::Pantheon of Woe::Cosmic Distortion': AP_IMPROVE_1,

  // ═══════════════════════════════════════════════════════════════
  // ORKS
  // ═══════════════════════════════════════════════════════════════

  'Orks::War Horde::Get Stuck In': SUSTAINED_1,
  'Orks::Da Big Hunt::Da Hunt Is On': AP_IMPROVE_1,
  'Orks::Green Tide::Mob Mentality (10+ models)': INVULN_5,
  'Orks::Green Tide::Mob Mentality (base)': { invulnerableSave: 6 },
  'Orks::Taktikal Brigade::Get On Wiv It': STRENGTH_BONUS_1,
  "Orks::Taktikal Brigade::Sneaky Stalkin'": merge(GRANTS_STEALTH, GRANTS_COVER),
  'Orks::Taktikal Brigade::Shoota Drills': PLUS_1_HIT,
  'Orks::More Dakka!::Dakka! Dakka! Dakka! (Waaagh!)': SUSTAINED_1,
  'Orks::Freebooter Krew::Here Be Loot': SUSTAINED_1,

  // ═══════════════════════════════════════════════════════════════
  // TYRANIDS
  // ═══════════════════════════════════════════════════════════════

  'Tyranids::Invasion Fleet::Swarming Instincts': SUSTAINED_1,
  'Tyranids::Invasion Fleet::Hyper-aggression': LETHAL_HITS,
  'Tyranids::Crusher Stampede::Enraged Behemoths (Below Starting)': PLUS_1_HIT,
  'Tyranids::Crusher Stampede::Enraged Behemoths (Below Half)': merge(PLUS_1_HIT, PLUS_1_WOUND),
  'Tyranids::Synaptic Nexus::Synaptic Augmentation': INVULN_5,
  'Tyranids::Synaptic Nexus::Goaded to Slaughter': PLUS_1_HIT,
  'Tyranids::Subterranean Assault::Surprise Assault': REROLL_HITS_ONES,
  'Tyranids::Warrior Bioform Onslaught::Leader-beasts': INVULN_5,

  // ═══════════════════════════════════════════════════════════════
  // GENESTEALER CULTS
  // ═══════════════════════════════════════════════════════════════

  'Genestealer Cults::Host of Ascension::A Perfect Ambush': merge(SUSTAINED_1, IGNORES_COVER),
  'Genestealer Cults::Biosanctic Broodsurge::Hypermorphic Fury': conditional(
    {},
    { condition: { type: 'charged' }, modifiers: BONUS_ATTACKS_1 }
  ),
  'Genestealer Cults::Brood Brother Auxilia::Integrated Tactics': PLUS_1_HIT,
  'Genestealer Cults::Final Day::Psionic Parasitism': PLUS_1_HIT,
};
