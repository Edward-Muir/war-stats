import type { RawWeapon, Stratagem, UnitDatasheet } from "./data";

// ─── Unit Configuration ──────────────────────────────────────────

/** A configured model within a unit after wargear choices. */
export interface ConfiguredModel {
  definitionName: string;   // Which ModelDefinition this is from
  equipment: string[];      // Current weapon/equipment names after wargear swaps
  count: number;            // How many of this exact configuration
}

/** A weapon selected for firing, with how many models use it. */
export interface SelectedWeapon {
  weapon: RawWeapon;
  firingModelCount: number;
  targetInHalfRange: boolean;
}

/** A fully configured unit ready for simulation input assembly. */
export interface ConfiguredUnit {
  datasheet: UnitDatasheet;
  models: ConfiguredModel[];
  totalModels: number;
  selectedWeapons: SelectedWeapon[];
}

// ─── Wargear Choices ─────────────────────────────────────────────

/** A single wargear option selection by the user. */
export interface WargearChoice {
  optionIndex: number;      // Index into datasheet.wargear_options
  modelName: string;        // Which model definition this applies to
  chosenEquipment: string;  // Which choice was selected from choices[]
}

// ─── Game State ──────────────────────────────────────────────────

export interface AttackerGameState {
  remainedStationary: boolean;
  advanced: boolean;
  charged: boolean;
}

export interface DefenderGameState {
  inCover: boolean;
  benefitOfCover: boolean;
  stealthAll: boolean;       // All models have STEALTH
}

export const DEFAULT_ATTACKER_STATE: AttackerGameState = {
  remainedStationary: false,
  advanced: false,
  charged: false,
};

export const DEFAULT_DEFENDER_STATE: DefenderGameState = {
  inCover: false,
  benefitOfCover: false,
  stealthAll: false,
};

// ─── Active Stratagems ───────────────────────────────────────────

/**
 * An active stratagem. For MVP, the effect is the raw text.
 * Only a curated set of effects will be parsed into simulation modifiers.
 */
export interface ActiveStratagem {
  stratagem: Stratagem;
}
