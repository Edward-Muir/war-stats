import type { AttackerGameState, DefenderGameState, ActiveStratagem } from "./config";

// ─── Dice Expressions ────────────────────────────────────────────

/** Parsed dice expression: either a fixed value or NdS+M. */
export type DiceExpr =
  | { type: "fixed"; value: number }
  | { type: "dice"; count: number; sides: number; modifier: number };

// ─── Parsed Weapon Keywords ──────────────────────────────────────

export interface ParsedWeaponKeywords {
  sustainedHits: number;       // 0 if not present
  lethalHits: boolean;
  devastatingWounds: boolean;
  antiKeyword: string | null;  // e.g. "VEHICLE"
  antiThreshold: number;       // e.g. 4 for ANTI-VEHICLE 4+, 0 if not present
  rapidFire: number;           // 0 if not present
  blast: boolean;
  torrent: boolean;
  heavy: boolean;
  assault: boolean;
  lance: boolean;
  melta: number;               // 0 if not present
  twinLinked: boolean;
  ignoresCover: boolean;
  indirectFire: boolean;
  precision: boolean;
  hazardous: boolean;
  extraAttacks: boolean;
  pistol: boolean;
}

export const EMPTY_KEYWORDS: ParsedWeaponKeywords = {
  sustainedHits: 0,
  lethalHits: false,
  devastatingWounds: false,
  antiKeyword: null,
  antiThreshold: 0,
  rapidFire: 0,
  blast: false,
  torrent: false,
  heavy: false,
  assault: false,
  lance: false,
  melta: 0,
  twinLinked: false,
  ignoresCover: false,
  indirectFire: false,
  precision: false,
  hazardous: false,
  extraAttacks: false,
  pistol: false,
};

// ─── Resolved Weapon Group ───────────────────────────────────────

/** A weapon group ready for simulation — all values parsed from strings. */
export interface ResolvedWeaponGroup {
  name: string;
  type: "ranged" | "melee";
  rangeInches: number;         // 0 for melee
  attacks: DiceExpr;
  skill: number;               // BS/WS as number (0 = auto-hit / torrent)
  strength: number;
  ap: number;                  // Positive number (e.g. 2 for AP -2)
  damage: DiceExpr;
  keywords: ParsedWeaponKeywords;
  firingModels: number;
  targetInHalfRange: boolean;
}

// ─── Resolved Modifiers ──────────────────────────────────────────

export type RerollPolicy = "none" | "ones" | "all";

export interface ResolvedModifiers {
  hitModifier: number;        // Capped [-1, +1]
  woundModifier: number;      // Capped [-1, +1]
  apValue: number;            // Positive (e.g. 2 for AP -2)
  coverBonus: number;         // 0 or 1
  rerollHits: RerollPolicy;
  rerollWounds: RerollPolicy;
  attacksBonus: number;       // From rapid fire, blast
  damageBonus: number;        // From melta
  critHitOn: number;          // Default 6
  critWoundOn: number;        // Default 6, ANTI-X can lower
  autoHit: boolean;           // TORRENT
  lethalHits: boolean;
  sustainedHits: number;
  devastatingWounds: boolean;
}

// ─── Defender Profile ────────────────────────────────────────────

export interface DefenderProfile {
  toughness: number;
  save: number;                // e.g. 3 for Sv 3+
  invulnerableSave: number | null; // e.g. 4, or null
  wounds: number;              // Per model
  modelCount: number;
  feelNoPain: number | null;   // e.g. 5 for FNP 5+, or null
  keywords: string[];          // For ANTI-X matching
}

// ─── Simulation Input ────────────────────────────────────────────

export interface SimulationInput {
  attacker: {
    weaponGroups: ResolvedWeaponGroup[];
    gameState: AttackerGameState;
    stratagems: ActiveStratagem[];
  };
  defender: DefenderProfile & {
    gameState: DefenderGameState;
    stratagems: ActiveStratagem[];
  };
  iterations: number;
}

// ─── Simulation Output ───────────────────────────────────────────

export interface SingleSimulationResult {
  totalDamage: number;
  modelsKilled: number;
  mortalWoundsDealt: number;
  normalDamageDealt: number;
  totalHits: number;
  totalWounds: number;
  unsavedWounds: number;
}

export interface DistributionStats {
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  percentiles: { p10: number; p25: number; p75: number; p90: number };
  histogram: { bucket: number; count: number }[];
}

export interface SimulationResults {
  iterations: number;
  results: SingleSimulationResult[];
  summary: {
    damage: DistributionStats;
    modelsKilled: DistributionStats;
    mortalWounds: DistributionStats;
  };
}
