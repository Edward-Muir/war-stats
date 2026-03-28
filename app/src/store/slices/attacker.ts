import type { StateCreator } from 'zustand';
import type { Stratagem, UnitDatasheet } from '../../types/data';
import type {
  AttackerGameState,
  ConfiguredModel,
  WargearSlot,
  WeaponFiringConfig,
  SelectedWeapon,
  ActiveStratagem,
} from '../../types/config';
import { DEFAULT_ATTACKER_STATE } from '../../types/config';
import {
  buildWargearSlots,
  buildDefaultModels,
  buildDefaultFiringConfig,
  deriveSelectedWeapons,
  applySlotSelection,
  setVariableCount,
  setDefinitionTotal,
  getProfileBaseName,
} from '../../logic/wargear-slots';
import { parseWeaponKeywords } from '../../engine/keywords';
import type { AppStore } from '../store';

/**
 * Update firing configs after model group counts change.
 * If a weapon's firing count matched the old group count ("all models fire"),
 * auto-scale to the new group count. Otherwise just clamp down.
 *
 * When a group goes from 0 to N, rebuild its firing config from scratch
 * (to respect profile weapon defaults).
 */
function updateFiringConfigForNewCounts(
  oldFC: WeaponFiringConfig[],
  oldModels: ConfiguredModel[],
  newModels: ConfiguredModel[],
  slots: WargearSlot[],
  datasheet: UnitDatasheet
): WeaponFiringConfig[] {
  // Find groups that went from 0 to N — need full rebuild for profile weapon handling
  const activatedGroupIds = new Set<string>();
  for (const newGroup of newModels) {
    if (newGroup.count === 0) continue;
    const oldGroup = oldModels.find((m) => m.groupId === newGroup.groupId);
    if (oldGroup && oldGroup.count === 0) {
      activatedGroupIds.add(newGroup.groupId);
    }
  }

  if (activatedGroupIds.size > 0) {
    // Rebuild firing config for activated groups, keep existing for others
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

export interface AttackerSlice {
  attacker: {
    factionSlug: string | null;
    chapter: string | null;
    detachmentName: string | null;
    unitName: string | null;
    slots: WargearSlot[];
    models: ConfiguredModel[];
    firingConfig: WeaponFiringConfig[];
    selectedWeapons: SelectedWeapon[];
    gameState: AttackerGameState;
    activeStratagems: ActiveStratagem[];
  };
  setAttackerFaction: (slug: string, chapter?: string | null) => void;
  setAttackerDetachment: (name: string) => void;
  setAttackerUnit: (name: string) => void;
  selectSlotOption: (slotId: string, optionKey: string | null) => void;
  setVariableSlotCount: (groupId: string, count: number) => void;
  setVariableSlotAllocation: (slotId: string, optionKey: string, count: number) => void;
  setDefinitionCount: (definitionName: string, count: number) => void;
  setWeaponFiringCount: (groupId: string, weaponName: string, count: number) => void;
  setAttackerGameState: (state: Partial<AttackerGameState>) => void;
  toggleAttackerStratagem: (stratagem: Stratagem) => void;
  resetAttacker: () => void;
}

const initialAttacker: AttackerSlice['attacker'] = {
  factionSlug: 'space-marines',
  chapter: null,
  detachmentName: null,
  unitName: null,
  slots: [],
  models: [],
  firingConfig: [],
  selectedWeapons: [],
  gameState: { ...DEFAULT_ATTACKER_STATE },
  activeStratagems: [],
};

/** Helper to find the datasheet, preferring chapter-specific variant. */
function findDatasheet(state: AppStore, factionSlug: string, unitName: string) {
  const data = state.loadedFactions[factionSlug];
  if (!data) return null;
  const chapter = state.attacker.chapter;
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
 * Clear game state toggles that are no longer relevant for the given weapons.
 * Prevents stale state when switching units (e.g., stationary=true with no heavy weapons).
 */
function clearIrrelevantToggles(
  gameState: AttackerGameState,
  selectedWeapons: SelectedWeapon[]
): AttackerGameState {
  let hasHeavy = false;
  let hasAssault = false;
  let hasRapidFireOrMelta = false;
  let hasLance = false;

  for (const sw of selectedWeapons) {
    const kw = parseWeaponKeywords(sw.weapon.keywords);
    if (kw.heavy) hasHeavy = true;
    if (kw.assault) hasAssault = true;
    if (kw.rapidFire > 0 || kw.melta > 0) hasRapidFireOrMelta = true;
    if (kw.lance) hasLance = true;
  }

  return {
    ...gameState,
    remainedStationary: hasHeavy ? gameState.remainedStationary : false,
    advanced: hasAssault ? gameState.advanced : false,
    targetInHalfRange: hasRapidFireOrMelta ? gameState.targetInHalfRange : false,
    charged: hasLance ? gameState.charged : false,
  };
}

export const createAttackerSlice: StateCreator<AppStore, [], [], AttackerSlice> = (set, get) => ({
  attacker: { ...initialAttacker },

  setAttackerFaction: (slug, chapter) =>
    set({
      attacker: {
        ...initialAttacker,
        factionSlug: slug,
        chapter: chapter ?? null,
      },
    }),

  setAttackerDetachment: (name) =>
    set((state) => ({
      attacker: {
        ...state.attacker,
        detachmentName: name,
        activeStratagems: [],
      },
    })),

  setAttackerUnit: (name) => {
    const state = get();
    const faction = state.attacker.factionSlug;
    if (!faction) return;
    const datasheet = findDatasheet(state, faction, name);
    if (!datasheet) return;

    const slots = buildWargearSlots(datasheet);
    const models = buildDefaultModels(datasheet, slots);
    const firingConfig = buildDefaultFiringConfig(models, slots, datasheet);

    // Derive pistolMode from engagementRange + unit keywords
    let pistolMode: 'pistols_only' | 'non_pistols_only' | null = null;
    if (state.attacker.gameState.engagementRange) {
      const allKeywords = [
        ...datasheet.keywords.map((k) => k.toUpperCase()),
        ...datasheet.factionKeywords.map((k) => k.toUpperCase()),
      ];
      const isMonsterOrVehicle = allKeywords.includes('MONSTER') || allKeywords.includes('VEHICLE');
      pistolMode = isMonsterOrVehicle ? null : 'pistols_only';
    }

    const gameState: AttackerGameState = {
      ...state.attacker.gameState,
      pistolMode,
    };

    const selectedWeapons = deriveSelectedWeapons(
      models,
      firingConfig,
      slots,
      datasheet,
      gameState.attackMode,
      pistolMode
    );

    // Auto-clear game state toggles that aren't relevant for the new unit's weapons
    const clearedGameState = clearIrrelevantToggles(gameState, selectedWeapons);

    set({
      attacker: {
        ...state.attacker,
        unitName: name,
        slots,
        models,
        firingConfig,
        selectedWeapons,
        gameState: clearedGameState,
        activeStratagems: [],
      },
    });
  },

  selectSlotOption: (slotId, optionKey) =>
    set((state) => {
      const { factionSlug, unitName, slots, models: oldModels, gameState } = state.attacker;
      if (!factionSlug || !unitName) return state;
      const datasheet = findDatasheet(state, factionSlug, unitName);
      if (!datasheet) return state;

      const models = applySlotSelection(oldModels, slots, datasheet, slotId, optionKey);
      const firingConfig = buildDefaultFiringConfig(models, slots, datasheet);
      const selectedWeapons = deriveSelectedWeapons(
        models,
        firingConfig,
        slots,
        datasheet,
        gameState.attackMode,
        gameState.pistolMode
      );

      return { attacker: { ...state.attacker, models, firingConfig, selectedWeapons } };
    }),

  setVariableSlotCount: (groupId, count) =>
    set((state) => {
      const {
        factionSlug,
        unitName,
        slots,
        models: oldModels,
        firingConfig: oldFC,
        gameState,
      } = state.attacker;
      if (!factionSlug || !unitName) return state;
      const datasheet = findDatasheet(state, factionSlug, unitName);
      if (!datasheet) return state;

      const models = setVariableCount(oldModels, groupId, count, datasheet, slots);
      const firingConfig = updateFiringConfigForNewCounts(
        oldFC,
        oldModels,
        models,
        slots,
        datasheet
      );
      const selectedWeapons = deriveSelectedWeapons(
        models,
        firingConfig,
        slots,
        datasheet,
        gameState.attackMode,
        gameState.pistolMode
      );

      return { attacker: { ...state.attacker, models, firingConfig, selectedWeapons } };
    }),

  setVariableSlotAllocation: (slotId, optionKey, count) =>
    set((state) => {
      const { factionSlug, unitName, slots, models: oldModels, gameState } = state.attacker;
      if (!factionSlug || !unitName) return state;
      const datasheet = findDatasheet(state, factionSlug, unitName);
      if (!datasheet) return state;

      const slot = slots.find((s) => s.slotId === slotId);
      if (!slot) return state;

      let models = oldModels;
      const groupId = `${slot.definitionName}__${slotId}__${optionKey}`;

      if (count === 0) {
        // Remove variant group for this slot
        models = applySlotSelection(models, slots, datasheet, slotId, null);
      } else {
        // Remove any existing variant for a different option in this slot (handles dropdown change)
        const existingForSlot = models.find(
          (m) => !m.isBase && m.slotSelections.some((s) => s.slotId === slotId)
        );
        if (existingForSlot && existingForSlot.groupId !== groupId) {
          models = applySlotSelection(models, slots, datasheet, slotId, null);
        }
        // Ensure variant group exists
        const existingVariant = models.find((m) => m.groupId === groupId);
        if (!existingVariant) {
          models = applySlotSelection(models, slots, datasheet, slotId, optionKey);
        }
        // Set count (redistributes from base group)
        models = setVariableCount(models, groupId, count, datasheet, slots);
      }

      const firingConfig = buildDefaultFiringConfig(models, slots, datasheet);
      const selectedWeapons = deriveSelectedWeapons(
        models,
        firingConfig,
        slots,
        datasheet,
        gameState.attackMode,
        gameState.pistolMode
      );

      return { attacker: { ...state.attacker, models, firingConfig, selectedWeapons } };
    }),

  setDefinitionCount: (definitionName, count) =>
    set((state) => {
      const {
        factionSlug,
        unitName,
        slots,
        models: oldModels,
        firingConfig: oldFC,
        gameState,
      } = state.attacker;
      if (!factionSlug || !unitName) return state;
      const datasheet = findDatasheet(state, factionSlug, unitName);
      if (!datasheet) return state;

      const models = setDefinitionTotal(oldModels, definitionName, count, datasheet);
      const firingConfig = updateFiringConfigForNewCounts(
        oldFC,
        oldModels,
        models,
        slots,
        datasheet
      );
      const selectedWeapons = deriveSelectedWeapons(
        models,
        firingConfig,
        slots,
        datasheet,
        gameState.attackMode,
        gameState.pistolMode
      );

      return { attacker: { ...state.attacker, models, firingConfig, selectedWeapons } };
    }),

  setWeaponFiringCount: (groupId, weaponName, count) =>
    set((state) => {
      const { factionSlug, unitName, slots, models, gameState } = state.attacker;
      if (!factionSlug || !unitName) return state;
      const datasheet = findDatasheet(state, factionSlug, unitName);
      if (!datasheet) return state;

      const group = models.find((m) => m.groupId === groupId);
      const clamped = Math.max(0, Math.min(count, group?.count ?? 0));

      // For profile weapons (➤), enforce mutual exclusion: selecting one deselects siblings
      const profileBase = getProfileBaseName(weaponName);
      const firingConfig = state.attacker.firingConfig.map((fc) => {
        if (fc.groupId === groupId && fc.weaponName === weaponName) {
          return { ...fc, firingModelCount: clamped };
        }
        // Deselect sibling profiles when activating a profile weapon
        if (profileBase && clamped > 0 && fc.groupId === groupId) {
          const siblingBase = getProfileBaseName(fc.weaponName);
          if (siblingBase === profileBase && fc.weaponName !== weaponName) {
            return { ...fc, firingModelCount: 0 };
          }
        }
        return fc;
      });
      const selectedWeapons = deriveSelectedWeapons(
        models,
        firingConfig,
        slots,
        datasheet,
        gameState.attackMode,
        gameState.pistolMode
      );

      return { attacker: { ...state.attacker, firingConfig, selectedWeapons } };
    }),

  setAttackerGameState: (partial) =>
    set((state) => {
      const newGameState = { ...state.attacker.gameState, ...partial };

      if (partial.attackMode && partial.attackMode !== state.attacker.gameState.attackMode) {
        if (partial.attackMode === 'melee') {
          newGameState.targetInHalfRange = false;
        } else {
          newGameState.charged = false;
        }
      }

      // Derive pistolMode from engagementRange
      const { factionSlug, unitName, slots, models, firingConfig } = state.attacker;
      if (newGameState.engagementRange && factionSlug && unitName) {
        const datasheet = findDatasheet(state, factionSlug, unitName);
        if (datasheet) {
          const allKeywords = [
            ...datasheet.keywords.map((k) => k.toUpperCase()),
            ...datasheet.factionKeywords.map((k) => k.toUpperCase()),
          ];
          const isMonsterOrVehicle =
            allKeywords.includes('MONSTER') || allKeywords.includes('VEHICLE');
          newGameState.pistolMode = isMonsterOrVehicle ? null : 'pistols_only';
        }
      } else {
        newGameState.pistolMode = null;
      }
      let selectedWeapons = state.attacker.selectedWeapons;

      if (factionSlug && unitName) {
        const datasheet = findDatasheet(state, factionSlug, unitName);
        if (datasheet) {
          selectedWeapons = deriveSelectedWeapons(
            models,
            firingConfig,
            slots,
            datasheet,
            newGameState.attackMode,
            newGameState.pistolMode
          );
        }
      }

      return {
        attacker: {
          ...state.attacker,
          gameState: newGameState,
          selectedWeapons,
        },
      };
    }),

  toggleAttackerStratagem: (stratagem) =>
    set((state) => {
      const existing = state.attacker.activeStratagems;
      const isActive = existing.some((a) => a.stratagem.name === stratagem.name);
      return {
        attacker: {
          ...state.attacker,
          activeStratagems: isActive
            ? existing.filter((a) => a.stratagem.name !== stratagem.name)
            : [...existing, { stratagem }],
        },
      };
    }),

  resetAttacker: () => set({ attacker: { ...initialAttacker } }),
});
