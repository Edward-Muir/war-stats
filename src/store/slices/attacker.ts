import type { StateCreator } from 'zustand';
import type { Stratagem } from '../../types/data';
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
} from '../../logic/wargear-slots';
import type { AppStore } from '../store';

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
          (d) =>
            d.name === unitName && d.faction_keywords.some((k) => k.toUpperCase() === chapter)
        )
      : undefined) ?? data.datasheets.datasheets.find((d) => d.name === unitName) ?? null
  );
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
    const selectedWeapons = deriveSelectedWeapons(
      models,
      firingConfig,
      slots,
      datasheet,
      state.attacker.gameState.attackMode
    );

    set({
      attacker: {
        ...state.attacker,
        unitName: name,
        slots,
        models,
        firingConfig,
        selectedWeapons,
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
        gameState.attackMode
      );

      return { attacker: { ...state.attacker, models, firingConfig, selectedWeapons } };
    }),

  setVariableSlotCount: (groupId, count) =>
    set((state) => {
      const { factionSlug, unitName, slots, models: oldModels, firingConfig: oldFC, gameState } =
        state.attacker;
      if (!factionSlug || !unitName) return state;
      const datasheet = findDatasheet(state, factionSlug, unitName);
      if (!datasheet) return state;

      const models = setVariableCount(oldModels, groupId, count, datasheet, slots);
      // Clamp firing configs to new counts
      const firingConfig = oldFC.map((fc) => {
        const group = models.find((m) => m.groupId === fc.groupId);
        if (!group) return fc;
        return { ...fc, firingModelCount: Math.min(fc.firingModelCount, group.count) };
      });
      const selectedWeapons = deriveSelectedWeapons(
        models,
        firingConfig,
        slots,
        datasheet,
        gameState.attackMode
      );

      return { attacker: { ...state.attacker, models, firingConfig, selectedWeapons } };
    }),

  setDefinitionCount: (definitionName, count) =>
    set((state) => {
      const { factionSlug, unitName, slots, models: oldModels, firingConfig: oldFC, gameState } =
        state.attacker;
      if (!factionSlug || !unitName) return state;
      const datasheet = findDatasheet(state, factionSlug, unitName);
      if (!datasheet) return state;

      const models = setDefinitionTotal(oldModels, definitionName, count, datasheet);
      const firingConfig = oldFC.map((fc) => {
        const group = models.find((m) => m.groupId === fc.groupId);
        if (!group) return fc;
        return { ...fc, firingModelCount: Math.min(fc.firingModelCount, group.count) };
      });
      const selectedWeapons = deriveSelectedWeapons(
        models,
        firingConfig,
        slots,
        datasheet,
        gameState.attackMode
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

      const firingConfig = state.attacker.firingConfig.map((fc) =>
        fc.groupId === groupId && fc.weaponName === weaponName
          ? { ...fc, firingModelCount: clamped }
          : fc
      );
      const selectedWeapons = deriveSelectedWeapons(
        models,
        firingConfig,
        slots,
        datasheet,
        gameState.attackMode
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

      const { factionSlug, unitName, slots, models, firingConfig } = state.attacker;
      let selectedWeapons = state.attacker.selectedWeapons;

      if (factionSlug && unitName) {
        const datasheet = findDatasheet(state, factionSlug, unitName);
        if (datasheet) {
          selectedWeapons = deriveSelectedWeapons(
            models,
            firingConfig,
            slots,
            datasheet,
            newGameState.attackMode
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
