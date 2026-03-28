import type { StateCreator } from 'zustand';
import type {
  DefenderGameState,
  ConfiguredModel,
  WargearSlot,
  WeaponFiringConfig,
  SelectedWeapon,
} from '../../types/config';
import { getConflicting } from '../../logic/effect-keys';
import { DEFAULT_DEFENDER_STATE } from '../../types/config';
import {
  buildWargearSlots,
  buildDefaultModels,
  buildDefaultFiringConfig,
  deriveSelectedWeapons,
} from '../../logic/wargear-slots';
import { loadStoredDefaults } from '../../utils/local-storage';
import { findSideDatasheet } from './unit-config';
import type { AppStore } from '../store';

export interface DefenderSlice {
  defender: {
    factionSlug: string | null;
    chapter: string | null;
    detachmentName: string | null;
    unitName: string | null;
    slots: WargearSlot[];
    models: ConfiguredModel[];
    firingConfig: WeaponFiringConfig[];
    selectedWeapons: SelectedWeapon[];
    gameState: DefenderGameState;
    activeEffects: string[];
  };
  setDefenderFaction: (slug: string, chapter?: string | null) => void;
  setDefenderDetachment: (name: string) => void;
  setDefenderUnit: (name: string) => void;
  setDefenderGameState: (state: Partial<DefenderGameState>) => void;
  toggleDefenderEffect: (key: string) => void;
  resetDefender: () => void;
}

const _stored = loadStoredDefaults();

const initialDefender: DefenderSlice['defender'] = {
  factionSlug: _stored?.defenderFactionSlug ?? 'space-marines',
  chapter: _stored?.defenderChapter ?? null,
  detachmentName: null,
  unitName: null,
  slots: [],
  models: [],
  firingConfig: [],
  selectedWeapons: [],
  gameState: { ...DEFAULT_DEFENDER_STATE, ...(_stored?.defenderGameState ?? {}) },
  activeEffects: [],
};

export const createDefenderSlice: StateCreator<AppStore, [], [], DefenderSlice> = (set, get) => ({
  defender: { ...initialDefender },

  setDefenderFaction: (slug, chapter) =>
    set({ defender: { ...initialDefender, factionSlug: slug, chapter: chapter ?? null } }),

  setDefenderDetachment: (name) =>
    set((state) => ({
      defender: {
        ...state.defender,
        detachmentName: name,
        activeEffects: [],
      },
    })),

  setDefenderUnit: (name) => {
    const state = get();
    if (!state.defender.factionSlug) return;
    const datasheet = findSideDatasheet(state, 'defender', name);
    if (!datasheet) return;

    const slots = buildWargearSlots(datasheet);
    const models = buildDefaultModels(datasheet, slots);
    const firingConfig = buildDefaultFiringConfig(models, slots, datasheet);
    const selectedWeapons = deriveSelectedWeapons(models, firingConfig, slots, datasheet, 'ranged');

    // Auto-enable stealth if the unit has Stealth as a core ability
    const hasStealth = datasheet.abilities.core.some((a) => a.toUpperCase() === 'STEALTH');

    set({
      defender: {
        ...state.defender,
        unitName: name,
        slots,
        models,
        firingConfig,
        selectedWeapons,
        activeEffects: [],
        gameState: {
          ...state.defender.gameState,
          stealthAll: hasStealth,
        },
      },
    });
  },

  setDefenderGameState: (partial) =>
    set((state) => ({
      defender: {
        ...state.defender,
        gameState: { ...state.defender.gameState, ...partial },
      },
    })),

  toggleDefenderEffect: (key) =>
    set((state) => {
      const existing = state.defender.activeEffects;
      const isActive = existing.includes(key);
      if (isActive) {
        return {
          defender: { ...state.defender, activeEffects: existing.filter((k) => k !== key) },
        };
      }
      const conflicts = getConflicting(key);
      const filtered =
        conflicts.length > 0 ? existing.filter((k) => !conflicts.includes(k)) : existing;
      return { defender: { ...state.defender, activeEffects: [...filtered, key] } };
    }),

  resetDefender: () => set({ defender: { ...initialDefender } }),
});
