import type { StateCreator } from 'zustand';
import type {
  DefenderGameState,
  ConfiguredModel,
  WargearSlot,
  WeaponFiringConfig,
  SelectedWeapon,
} from '../../types/config';
import type { UnitEffect } from '../../types/effects';
import { DEFAULT_DEFENDER_STATE } from '../../types/config';
import {
  buildWargearSlots,
  buildDefaultModels,
  buildDefaultFiringConfig,
  deriveSelectedWeapons,
} from '../../logic/wargear-slots';
import { loadStoredDefaults } from '../../utils/local-storage';
import { deriveAbilityUnitEffects } from '../../logic/ability-effects';
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
    activeEffectIds: string[];
    availableEffects: UnitEffect[];
  };
  setDefenderFaction: (slug: string, chapter?: string | null) => void;
  setDefenderDetachment: (name: string) => void;
  setDefenderUnit: (name: string) => void;
  setDefenderGameState: (state: Partial<DefenderGameState>) => void;
  toggleDefenderEffect: (id: string) => void;
  setDefenderAvailableEffects: (effects: UnitEffect[]) => void;
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
  activeEffectIds: [],
  availableEffects: [],
};

/** Get IDs of always-on effects from a UnitEffect array. */
function getAutoApplyIds(effects: UnitEffect[]): string[] {
  return effects.filter((e) => e.activation === 'always').map((e) => e.id);
}

export const createDefenderSlice: StateCreator<AppStore, [], [], DefenderSlice> = (set, get) => ({
  defender: { ...initialDefender },

  setDefenderFaction: (slug, chapter) =>
    set({ defender: { ...initialDefender, factionSlug: slug, chapter: chapter ?? null } }),

  setDefenderDetachment: (name) =>
    set((state) => {
      const autoIds = getAutoApplyIds(state.defender.availableEffects);
      return {
        defender: {
          ...state.defender,
          detachmentName: name,
          activeEffectIds: [...autoIds],
        },
      };
    }),

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

    // Auto-apply always-on defensive ability effects
    const abilityEffects = deriveAbilityUnitEffects(
      datasheet,
      state.defender.factionSlug!,
      'defender'
    );
    const autoIds = getAutoApplyIds(abilityEffects);

    set({
      defender: {
        ...state.defender,
        unitName: name,
        slots,
        models,
        firingConfig,
        selectedWeapons,
        activeEffectIds: [...autoIds],
        availableEffects: abilityEffects,
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

  toggleDefenderEffect: (id) =>
    set((state) => {
      // Prevent toggling always-on effects
      const effect = state.defender.availableEffects.find((e) => e.id === id);
      if (effect?.activation === 'always') return {};

      const existing = state.defender.activeEffectIds;
      const isActive = existing.includes(id);
      if (isActive) {
        return {
          defender: { ...state.defender, activeEffectIds: existing.filter((k) => k !== id) },
        };
      }
      return { defender: { ...state.defender, activeEffectIds: [...existing, id] } };
    }),

  setDefenderAvailableEffects: (effects) =>
    set((state) => {
      const newIds = new Set(effects.map((e) => e.id));
      const preserved = state.defender.activeEffectIds.filter((id) => newIds.has(id));
      const autoIds = getAutoApplyIds(effects);
      const merged = [...new Set([...preserved, ...autoIds])];

      return {
        defender: {
          ...state.defender,
          availableEffects: effects,
          activeEffectIds: merged,
        },
      };
    }),

  resetDefender: () => set({ defender: { ...initialDefender } }),
});
