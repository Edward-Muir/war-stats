import type { StateCreator } from 'zustand';
import type { UnitDatasheet } from '../../types/data';
import type {
  ConfiguredModel,
  WargearSlot,
  WeaponFiringConfig,
  SelectedWeapon,
} from '../../types/config';
import {
  buildDefaultFiringConfig,
  deriveSelectedWeapons,
  applySlotSelection,
  setVariableCount,
  setDefinitionTotal,
  getProfileBaseName,
} from '../../logic/wargear-slots';
import type { AppStore } from '../store';

export type Side = 'attacker' | 'defender';

// ─── Shared helpers ─────────────────────────────────────────────

/** Find a datasheet for the given side, preferring chapter-specific variant. */
export function findSideDatasheet(
  state: AppStore,
  side: Side,
  unitNameOverride?: string
): UnitDatasheet | null {
  const sideState = state[side];
  const { factionSlug, chapter } = sideState;
  const unitName = unitNameOverride ?? sideState.unitName;
  if (!factionSlug || !unitName) return null;
  const data = state.loadedFactions[factionSlug];
  if (!data) return null;
  return (
    (chapter && chapter !== 'ADEPTUS ASTARTES'
      ? data.datasheets.datasheets.find(
          (d) => d.name === unitName && d.factionKeywords.some((k) => k.toUpperCase() === chapter)
        )
      : undefined) ??
    data.datasheets.datasheets.find((d) => d.name === unitName) ??
    null
  );
}

/**
 * Update firing configs after model group counts change.
 * If a weapon's firing count matched the old group count ("all models fire"),
 * auto-scale to the new group count. Otherwise just clamp down.
 *
 * When a group goes from 0 to N, rebuild its firing config from scratch
 * (to respect profile weapon defaults).
 */
export function updateFiringConfigForNewCounts(
  oldFC: WeaponFiringConfig[],
  oldModels: ConfiguredModel[],
  newModels: ConfiguredModel[],
  slots: WargearSlot[],
  datasheet: UnitDatasheet
): WeaponFiringConfig[] {
  const activatedGroupIds = new Set<string>();
  for (const newGroup of newModels) {
    if (newGroup.count === 0) continue;
    const oldGroup = oldModels.find((m) => m.groupId === newGroup.groupId);
    if (oldGroup && oldGroup.count === 0) {
      activatedGroupIds.add(newGroup.groupId);
    }
  }

  if (activatedGroupIds.size > 0) {
    const rebuiltForActivated = buildDefaultFiringConfig(
      newModels.filter((m) => activatedGroupIds.has(m.groupId)),
      slots,
      datasheet
    );
    const rebuiltMap = new Map(
      rebuiltForActivated.map((fc) => [`${fc.groupId}::${fc.weaponName}`, fc])
    );

    return oldFC.map((fc) => {
      if (activatedGroupIds.has(fc.groupId)) {
        return rebuiltMap.get(`${fc.groupId}::${fc.weaponName}`) ?? fc;
      }
      const oldGroup = oldModels.find((m) => m.groupId === fc.groupId);
      const newGroup = newModels.find((m) => m.groupId === fc.groupId);
      if (!newGroup) return fc;
      if (!oldGroup)
        return { ...fc, firingModelCount: Math.min(fc.firingModelCount, newGroup.count) };
      if (fc.firingModelCount === oldGroup.count) {
        return { ...fc, firingModelCount: newGroup.count };
      }
      return { ...fc, firingModelCount: Math.min(fc.firingModelCount, newGroup.count) };
    });
  }

  return oldFC.map((fc) => {
    const oldGroup = oldModels.find((m) => m.groupId === fc.groupId);
    const newGroup = newModels.find((m) => m.groupId === fc.groupId);
    if (!newGroup) return fc;
    if (!oldGroup)
      return { ...fc, firingModelCount: Math.min(fc.firingModelCount, newGroup.count) };
    if (fc.firingModelCount === oldGroup.count) {
      return { ...fc, firingModelCount: newGroup.count };
    }
    return { ...fc, firingModelCount: Math.min(fc.firingModelCount, newGroup.count) };
  });
}

// ─── Internal helpers ───────────────────────────────────────────

function getAttackerFilters(state: AppStore) {
  return {
    attackMode: state.attacker.gameState.attackMode,
    pistolMode: state.attacker.gameState.pistolMode,
  };
}

function deriveWeapons(
  side: Side,
  state: AppStore,
  models: ConfiguredModel[],
  firingConfig: WeaponFiringConfig[],
  slots: WargearSlot[],
  datasheet: UnitDatasheet
): SelectedWeapon[] {
  const { attackMode, pistolMode } =
    side === 'attacker'
      ? getAttackerFilters(state)
      : { attackMode: 'ranged' as const, pistolMode: null };
  return deriveSelectedWeapons(models, firingConfig, slots, datasheet, attackMode, pistolMode);
}

function applySideUpdates(
  state: AppStore,
  side: Side,
  updates: {
    models?: ConfiguredModel[];
    firingConfig?: WeaponFiringConfig[];
    selectedWeapons?: SelectedWeapon[];
  }
): Partial<AppStore> {
  if (side === 'attacker') {
    return { attacker: { ...state.attacker, ...updates } };
  }
  return { defender: { ...state.defender, ...updates } };
}

// ─── Slice ──────────────────────────────────────────────────────

export interface UnitConfigSlice {
  selectSlotOption: (side: Side, slotId: string, optionKey: string | null) => void;
  setVariableSlotCount: (side: Side, groupId: string, count: number) => void;
  setVariableSlotAllocation: (side: Side, slotId: string, optionKey: string, count: number) => void;
  setDefinitionCount: (side: Side, definitionName: string, count: number) => void;
  setWeaponFiringCount: (side: Side, groupId: string, weaponName: string, count: number) => void;
}

export const createUnitConfigSlice: StateCreator<AppStore, [], [], UnitConfigSlice> = (set) => ({
  selectSlotOption: (side, slotId, optionKey) =>
    set((state) => {
      const { factionSlug, unitName, slots, models: oldModels } = state[side];
      if (!factionSlug || !unitName) return state;
      const datasheet = findSideDatasheet(state, side);
      if (!datasheet) return state;

      const models = applySlotSelection(oldModels, slots, datasheet, slotId, optionKey);
      const firingConfig = buildDefaultFiringConfig(models, slots, datasheet);
      const selectedWeapons = deriveWeapons(side, state, models, firingConfig, slots, datasheet);

      return applySideUpdates(state, side, { models, firingConfig, selectedWeapons });
    }),

  setVariableSlotCount: (side, groupId, count) =>
    set((state) => {
      const { factionSlug, unitName, slots, models: oldModels, firingConfig: oldFC } = state[side];
      if (!factionSlug || !unitName) return state;
      const datasheet = findSideDatasheet(state, side);
      if (!datasheet) return state;

      const models = setVariableCount(oldModels, groupId, count, datasheet, slots);
      const firingConfig = updateFiringConfigForNewCounts(
        oldFC,
        oldModels,
        models,
        slots,
        datasheet
      );
      const selectedWeapons = deriveWeapons(side, state, models, firingConfig, slots, datasheet);

      return applySideUpdates(state, side, { models, firingConfig, selectedWeapons });
    }),

  setVariableSlotAllocation: (side, slotId, optionKey, count) =>
    set((state) => {
      const { factionSlug, unitName, slots, models: oldModels } = state[side];
      if (!factionSlug || !unitName) return state;
      const datasheet = findSideDatasheet(state, side);
      if (!datasheet) return state;

      const slot = slots.find((s) => s.slotId === slotId);
      if (!slot) return state;

      let models = oldModels;
      const groupId = `${slot.definitionName}__${slotId}__${optionKey}`;

      if (count === 0) {
        models = applySlotSelection(models, slots, datasheet, slotId, null);
      } else {
        const existingForSlot = models.find(
          (m) => !m.isBase && m.slotSelections.some((s) => s.slotId === slotId)
        );
        if (existingForSlot && existingForSlot.groupId !== groupId) {
          models = applySlotSelection(models, slots, datasheet, slotId, null);
        }
        const existingVariant = models.find((m) => m.groupId === groupId);
        if (!existingVariant) {
          models = applySlotSelection(models, slots, datasheet, slotId, optionKey);
        }
        models = setVariableCount(models, groupId, count, datasheet, slots);
      }

      const firingConfig = buildDefaultFiringConfig(models, slots, datasheet);
      const selectedWeapons = deriveWeapons(side, state, models, firingConfig, slots, datasheet);

      return applySideUpdates(state, side, { models, firingConfig, selectedWeapons });
    }),

  setDefinitionCount: (side, definitionName, count) =>
    set((state) => {
      const { factionSlug, unitName, slots, models: oldModels, firingConfig: oldFC } = state[side];
      if (!factionSlug || !unitName) return state;
      const datasheet = findSideDatasheet(state, side);
      if (!datasheet) return state;

      const models = setDefinitionTotal(oldModels, definitionName, count, datasheet);
      const firingConfig = updateFiringConfigForNewCounts(
        oldFC,
        oldModels,
        models,
        slots,
        datasheet
      );
      const selectedWeapons = deriveWeapons(side, state, models, firingConfig, slots, datasheet);

      return applySideUpdates(state, side, { models, firingConfig, selectedWeapons });
    }),

  setWeaponFiringCount: (side, groupId, weaponName, count) =>
    set((state) => {
      const { factionSlug, unitName, slots, models } = state[side];
      if (!factionSlug || !unitName) return state;
      const datasheet = findSideDatasheet(state, side);
      if (!datasheet) return state;

      const group = models.find((m) => m.groupId === groupId);
      const clamped = Math.max(0, Math.min(count, group?.count ?? 0));

      const profileBase = getProfileBaseName(weaponName);
      const firingConfig = state[side].firingConfig.map((fc) => {
        if (fc.groupId === groupId && fc.weaponName === weaponName) {
          return { ...fc, firingModelCount: clamped };
        }
        if (profileBase && clamped > 0 && fc.groupId === groupId) {
          const siblingBase = getProfileBaseName(fc.weaponName);
          if (siblingBase === profileBase && fc.weaponName !== weaponName) {
            return { ...fc, firingModelCount: 0 };
          }
        }
        return fc;
      });
      const selectedWeapons = deriveWeapons(side, state, models, firingConfig, slots, datasheet);

      return applySideUpdates(state, side, { firingConfig, selectedWeapons });
    }),
});
