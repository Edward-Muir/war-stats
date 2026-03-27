import type { RawWeapon, Stratagem } from './data';

// ─── Wargear Slots ──────────────────────────────────────────────

/** A single choosable option within a wargear slot. */
export interface WargearSlotOption {
  optionIndex: number; // Index into datasheet.wargear_options
  choiceIndex: number; // Index into that option's choices[]
  choiceRaw: string; // Raw string, e.g. "auto boltstorm gauntlets and 1 fragstorm grenade launcher"
  label: string; // Human display name
}

/** How a wargear slot behaves in the UI. */
export type SlotScope =
  | { kind: 'single_model' } // Dropdown per model (Sergeant weapon swaps)
  | { kind: 'all_or_nothing' } // Toggle/radio for entire unit (Aggressor swap)
  | { kind: 'variable_count'; maxCount: number; noDuplicates: boolean;
      perN?: number; maxPerN?: number }; // Count redistribution (perN/maxPerN for dynamic recalc)

/** A wargear slot: one equipment position that can be swapped. */
export interface WargearSlot {
  slotId: string; // e.g. "Sergeant::bolt_rifle::single_model"
  definitionName: string; // Which ModelDefinition this applies to
  replaces: string[]; // What gets swapped out (lowercased)
  type: 'replace' | 'add';
  options: WargearSlotOption[]; // Available choices
  scope: SlotScope;
  raw: string; // First option's raw text for tooltip
  budgetGroup?: string; // Shared budget constraint ID for slots competing for the same model pool
}

// ─── User Selections ────────────────────────────────────────────

/** An active selection within a wargear slot. */
export interface SlotSelection {
  slotId: string;
  optionKey: string; // "${optionIndex}:${choiceIndex}"
  modelCount: number; // 1 for single_model, unitSize for all_or_nothing, N for variable_count
}

// ─── Configured Model Groups ────────────────────────────────────

/** A group of models sharing the same definition and loadout. */
export interface ConfiguredModel {
  groupId: string; // Unique ID for this group
  definitionName: string; // Which ModelDefinition this is from
  count: number; // How many models in this group
  isBase: boolean; // true for the default-equipment group
  slotSelections: SlotSelection[]; // Active wargear choices for this group
}

// ─── Weapon Firing Config ───────────────────────────────────────

/** How many models in a group fire a specific weapon. */
export interface WeaponFiringConfig {
  groupId: string;
  weaponName: string;
  firingModelCount: number;
}

/** A weapon selected for firing, with how many models use it. (Simulation boundary) */
export interface SelectedWeapon {
  weapon: RawWeapon;
  firingModelCount: number;
}

// ─── Game State ──────────────────────────────────────────────────

export interface AttackerGameState {
  attackMode: 'ranged' | 'melee';
  remainedStationary: boolean;
  advanced: boolean;
  charged: boolean;
  targetInHalfRange: boolean;
}

export interface DefenderGameState {
  inCover: boolean;
  benefitOfCover: boolean;
  stealthAll: boolean;
  closestTarget: boolean;
}

export const DEFAULT_ATTACKER_STATE: AttackerGameState = {
  attackMode: 'ranged',
  remainedStationary: false,
  advanced: false,
  charged: false,
  targetInHalfRange: false,
};

export const DEFAULT_DEFENDER_STATE: DefenderGameState = {
  inCover: false,
  benefitOfCover: false,
  stealthAll: false,
  closestTarget: true,
};

// ─── Active Stratagems ───────────────────────────────────────────

export interface ActiveStratagem {
  stratagem: Stratagem;
}
