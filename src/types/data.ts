// JSON data shape types — mirrors the BattleScribe v2 schema
// All values remain as strings at the JSON boundary; parsing happens in the engine layer.

// ─── Faction Index ───────────────────────────────────────────────

export interface FactionIndexEntry {
  faction: string;
  slug: string;
  datasheet_count: number;
  datasheet_file: string;
  datasheet_size_kb: number;
  rules_file: string;
  rules_size_kb: number;
  detachment_count: number;
  stratagem_count: number;
  enhancement_count: number;
}

export interface FactionIndex {
  game: string;
  edition: string;
  faction_count: number;
  total_datasheets: number;
  total_detachments: number;
  total_stratagems: number;
  total_enhancements: number;
  factions: FactionIndexEntry[];
}

// ─── Datasheet Types ─────────────────────────────────────────────

export interface RawStats {
  M: string;   // "6\"", "-"
  T: string;   // "4"
  Sv: string;  // "3+"
  W: string;   // "2"
  Ld: string;  // "6+"
  OC: string;  // "2"
}

export interface RawWeapon {
  name: string;
  type: "ranged" | "melee";
  range: string;       // "24\"", "Melee", "N/A"
  A: string;           // "2", "D6", "D6+3"
  BS: string | null;   // "3+", "N/A", null
  WS: string | null;   // "2+", null
  S: string;           // "4", "D6+6"
  AP: string;          // "0", "-1", "-4"
  D: string;           // "1", "D6", "D6+2"
  keywords: string[];  // ["sustained hits 2", "lethal hits", "torrent"]
}

export interface Ability {
  name: string;
  description: string;
}

export interface AbilityBlock {
  core: string[];
  faction: string[];
  other: Ability[];
  feelNoPain: number | null;
  damaged: { threshold: string; description: string } | null;
}

// ─── V2 Model & Selection Types ─────────────────────────────────

export interface V2Selection {
  id: string;
  label: string;
  weaponIds: string[];
  pointsDelta: number;
}

export interface V2SelectionGroup {
  id: string;
  name: string;
  min: number;
  max: number;
  defaultSelectionId: string | null;
  selections: V2Selection[];
}

export interface V2ModelDefinition {
  id: string;
  name: string;
  min: number;
  max: number;
  stats: RawStats;
  defaultWeaponIds: string[];
  selectionGroups: V2SelectionGroup[];
}

// ─── Unit Datasheet ─────────────────────────────────────────────

export interface PointsOption {
  models: string;
  points: string;
}

export interface UnitComposition {
  models: string[];
  equipment: string;
  points: PointsOption[];
}

export interface UnitDatasheet {
  name: string;
  baseSize: string;
  lore?: string;
  invulnerableSave: string | null; // "4+" or null
  weapons: Record<string, RawWeapon>;
  abilities: AbilityBlock;
  keywords: string[];
  factionKeywords: string[];
  composition: UnitComposition;
  models: V2ModelDefinition[];
  leaderUnits: string[];
}

export interface FactionDatasheets {
  faction: string;
  datasheet_count: number;
  datasheets: UnitDatasheet[];
}

// ─── Rules Types ─────────────────────────────────────────────────

export interface ArmyRule {
  name: string;
  description: string;
  keywords_mentioned?: string[];
}

export interface DetachmentRule {
  name: string;
  description: string;
  keywords_mentioned?: string[];
}

export interface Enhancement {
  name: string;
  points: number;
  description: string;
  keyword_restrictions: string[];
  keywords_mentioned: string[];
}

export type TurnPhase = "your" | "opponent" | "either";

export interface Stratagem {
  name: string;
  cp_cost: number;
  type: string;
  category: string;
  turn: TurnPhase;
  when: string;
  target: string;
  effect: string;
  restrictions: string;
  cost: string;
  fluff: string;
  keywords_mentioned: string[];
  target_keywords: string[];
}

export interface Detachment {
  name: string;
  rule: DetachmentRule | null;
  enhancements: Enhancement[];
  stratagems: Stratagem[];
}

export interface FactionRules {
  faction: string;
  army_rules: ArmyRule[];
  detachment_count: number;
  detachments: Detachment[];
}
