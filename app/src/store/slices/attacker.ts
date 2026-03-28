import type { StateCreator } from 'zustand';
import type {
  AttackerGameState,
  ConfiguredModel,
  WargearSlot,
  WeaponFiringConfig,
  SelectedWeapon,
} from '../../types/config';
import { getConflicting } from '../../logic/effect-keys';
import { DEFAULT_ATTACKER_STATE } from '../../types/config';
import { loadStoredDefaults } from '../../utils/local-storage';
import {
  buildWargearSlots,
  buildDefaultModels,
  buildDefaultFiringConfig,
  deriveSelectedWeapons,
} from '../../logic/wargear-slots';
import { parseWeaponKeywords } from '../../engine/keywords';
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
    activeEffects: string[];
  };
  setAttackerFaction: (slug: string, chapter?: string | null) => void;
  setAttackerDetachment: (name: string) => void;
  setAttackerUnit: (name: string) => void;
  setAttackerGameState: (state: Partial<AttackerGameState>) => void;
  toggleAttackerEffect: (key: string) => void;
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
  activeEffects: [],
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
        activeEffects: [],
      },
    })),

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

    set({
      attacker: {
        ...state.attacker,
        unitName: name,
        slots,
        models,
        firingConfig,
        selectedWeapons,
        gameState: clearedGameState,
        activeEffects: [],
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

  toggleAttackerEffect: (key) =>
    set((state) => {
      const existing = state.attacker.activeEffects;
      const isActive = existing.includes(key);
      if (isActive) {
        return {
          attacker: { ...state.attacker, activeEffects: existing.filter((k) => k !== key) },
        };
      }
      // Remove conflicting keys (e.g., rerollHits:ones when enabling rerollHits:all)
      const conflicts = getConflicting(key);
      const filtered =
        conflicts.length > 0 ? existing.filter((k) => !conflicts.includes(k)) : existing;
      return { attacker: { ...state.attacker, activeEffects: [...filtered, key] } };
    }),

  resetAttacker: () => set({ attacker: { ...initialAttacker } }),
});
