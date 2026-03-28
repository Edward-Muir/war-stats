import type { RawWeapon } from './data';

// ─── Wargear Slots ──────────────────────────────────────────────

/** A single choosable option within a wargear slot (maps to a V2Selection). */
export interface WargearSlotOption {
  selectionGroupId: string; // V2SelectionGroup.id
  selectionId: string; // V2Selection.id
  weaponIds: string[]; // Weapon registry IDs from V2Selection.weaponIds
  label: string; // Human display name
  pointsDelta: number;
}

/** How a wargear slot behaves in the UI. */
export type SlotScope =
  | { kind: 'single_model' } // Dropdown per model (Sergeant weapon swaps)
  | { kind: 'all_or_nothing' } // Toggle/radio for entire unit (Aggressor swap)
  | {
      kind: 'variable_count';
      maxCount: number;
      noDuplicates: boolean;
      perN?: number;
      maxPerN?: number;
    }; // Count redistribution (perN/maxPerN for dynamic recalc)

/** A wargear slot: one equipment position that can be swapped. */
export interface WargearSlot {
  slotId: string; // e.g. "model-id::selection-group-id"
  definitionName: string; // Which V2ModelDefinition this applies to
  replaces: string[]; // Default weapon IDs that get replaced (lowercased)
  type: 'replace' | 'add';
  options: WargearSlotOption[]; // Available choices
  scope: SlotScope;
  budgetGroup?: string; // Shared budget constraint ID for slots competing for the same model pool
}

// ─── User Selections ────────────────────────────────────────────

/** An active selection within a wargear slot. */
export interface SlotSelection {
  slotId: string;
  optionKey: string; // "${selectionGroupId}:${selectionId}"
  modelCount: number; // 1 for single_model, unitSize for all_or_nothing, N for variable_count
}

// ─── Configured Model Groups ────────────────────────────────────

/** A group of models sharing the same definition and loadout. */
export interface ConfiguredModel {
  groupId: string; // Unique ID for this group
  definitionName: string; // Which V2ModelDefinition this is from
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
  engagementRange: boolean;
  pistolMode: 'pistols_only' | 'non_pistols_only' | null;
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
  engagementRange: false,
  pistolMode: null,
};

export const DEFAULT_DEFENDER_STATE: DefenderGameState = {
  inCover: false,
  benefitOfCover: false,
  stealthAll: false,
  closestTarget: true,
};

// ─── Game State Relevance ───────────────────────────────────────

/** Which game state toggles are relevant given current weapons/abilities/stratagems. */
export interface GameStateRelevance {
  remainedStationary: boolean;
  advanced: boolean;
  charged: boolean;
  targetInHalfRange: boolean;
  engagementRange: boolean;
  benefitOfCover: boolean;
  stealthAll: boolean | 'locked'; // 'locked' = inherent ability, auto-on, non-toggleable
  closestTarget: boolean;
}

// ─── Active Effects ─────────────────────────────────────────────

/** Effect keys are strings like 'apImprovement:1', 'lethalHits', etc. */
export type ActiveEffectKey = string;
