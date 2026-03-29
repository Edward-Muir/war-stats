import type { StateCreator } from 'zustand';
import type {
  AttackerGameState,
  ConfiguredModel,
  WargearSlot,
  WeaponFiringConfig,
  SelectedWeapon,
} from '../../types/config';
import type { UnitEffect } from '../../types/effects';
import { DEFAULT_ATTACKER_STATE } from '../../types/config';
import { loadStoredDefaults } from '../../utils/local-storage';
import {
  buildWargearSlots,
  buildDefaultModels,
  buildDefaultFiringConfig,
  deriveSelectedWeapons,
} from '../../logic/wargear-slots';
import { parseWeaponKeywords } from '../../engine/keywords';
import { deriveAbilityUnitEffects } from '../../logic/ability-effects';
import { findSideDatasheet } from './unit-config';
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
    activeEffectIds: string[];
    availableEffects: UnitEffect[];
  };
  setAttackerFaction: (slug: string, chapter?: string | null) => void;
  setAttackerDetachment: (name: string) => void;
  setAttackerUnit: (name: string) => void;
  setAttackerGameState: (state: Partial<AttackerGameState>) => void;
  toggleAttackerEffect: (id: string) => void;
  setAttackerAvailableEffects: (effects: UnitEffect[]) => void;
  resetAttacker: () => void;
}

const _stored = loadStoredDefaults();

const initialAttacker: AttackerSlice['attacker'] = {
  factionSlug: _stored?.attackerFactionSlug ?? 'space-marines',
  chapter: _stored?.attackerChapter ?? null,
  detachmentName: null,
  unitName: null,
  slots: [],
  models: [],
  firingConfig: [],
  selectedWeapons: [],
  gameState: { ...DEFAULT_ATTACKER_STATE, ...(_stored?.attackerGameState ?? {}) },
  activeEffectIds: [],
  availableEffects: [],
};

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

/** Get IDs of always-on effects from a UnitEffect array. */
function getAutoApplyIds(effects: UnitEffect[]): string[] {
  return effects.filter((e) => e.activation === 'always').map((e) => e.id);
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
    set((state) => {
      const autoIds = getAutoApplyIds(state.attacker.availableEffects);
      return {
        attacker: {
          ...state.attacker,
          detachmentName: name,
          activeEffectIds: [...autoIds],
        },
      };
    }),

  setAttackerUnit: (name) => {
    const state = get();
    if (!state.attacker.factionSlug) return;
    const datasheet = findSideDatasheet(state, 'attacker', name);
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

    // Auto-apply always-on offensive ability effects
    const abilityEffects = deriveAbilityUnitEffects(
      datasheet,
      state.attacker.factionSlug!,
      'attacker'
    );
    const autoIds = getAutoApplyIds(abilityEffects);

    set({
      attacker: {
        ...state.attacker,
        unitName: name,
        slots,
        models,
        firingConfig,
        selectedWeapons,
        gameState: clearedGameState,
        activeEffectIds: [...autoIds],
        availableEffects: abilityEffects,
      },
    });
  },

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
        const datasheet = findSideDatasheet(state, 'attacker');
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
        const datasheet = findSideDatasheet(state, 'attacker');
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

  toggleAttackerEffect: (id) =>
    set((state) => {
      // Prevent toggling always-on effects
      const effect = state.attacker.availableEffects.find((e) => e.id === id);
      if (effect?.activation === 'always') return {};

      const existing = state.attacker.activeEffectIds;
      const isActive = existing.includes(id);
      if (isActive) {
        return {
          attacker: { ...state.attacker, activeEffectIds: existing.filter((k) => k !== id) },
        };
      }
      return { attacker: { ...state.attacker, activeEffectIds: [...existing, id] } };
    }),

  setAttackerAvailableEffects: (effects) =>
    set((state) => {
      // Preserve active selections that still exist in new available set,
      // and auto-enable always-on effects
      const newIds = new Set(effects.map((e) => e.id));
      const preserved = state.attacker.activeEffectIds.filter((id) => newIds.has(id));
      const autoIds = getAutoApplyIds(effects);
      const merged = [...new Set([...preserved, ...autoIds])];

      return {
        attacker: {
          ...state.attacker,
          availableEffects: effects,
          activeEffectIds: merged,
        },
      };
    }),

  resetAttacker: () => set({ attacker: { ...initialAttacker } }),
});
