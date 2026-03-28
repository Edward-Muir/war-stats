import type { StateCreator } from 'zustand';
import type { DefenderGameState, ConfiguredModel } from '../../types/config';
import { getConflicting } from '../../logic/effect-keys';
import { DEFAULT_DEFENDER_STATE } from '../../types/config';
import { buildWargearSlots, buildDefaultModels } from '../../logic/wargear-slots';
import { loadStoredDefaults } from '../../utils/local-storage';
import type { AppStore } from '../store';

export interface DefenderSlice {
  defender: {
    factionSlug: string | null;
    chapter: string | null;
    detachmentName: string | null;
    unitName: string | null;
    models: ConfiguredModel[];
    gameState: DefenderGameState;
    activeEffects: string[];
  };
  setDefenderFaction: (slug: string, chapter?: string | null) => void;
  setDefenderDetachment: (name: string) => void;
  setDefenderUnit: (name: string) => void;
  setDefenderModels: (models: ConfiguredModel[]) => void;
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
  models: [],
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
    const faction = state.defender.factionSlug;
    const chapter = state.defender.chapter;
    if (!faction) return;
    const data = state.loadedFactions[faction];
    if (!data) return;

    const datasheet =
      (chapter && chapter !== 'ADEPTUS ASTARTES'
        ? data.datasheets.datasheets.find(
            (d) => d.name === name && d.factionKeywords.some((k) => k.toUpperCase() === chapter)
          )
        : undefined) ?? data.datasheets.datasheets.find((d) => d.name === name);
    if (!datasheet) return;

    const slots = buildWargearSlots(datasheet);
    const models = buildDefaultModels(datasheet, slots);

    // Auto-enable stealth if the unit has Stealth as a core ability
    const hasStealth = datasheet.abilities.core.some((a) => a.toUpperCase() === 'STEALTH');

    set({
      defender: {
        ...state.defender,
        unitName: name,
        models,
        activeEffects: [],
        gameState: {
          ...state.defender.gameState,
          stealthAll: hasStealth,
        },
      },
    });
  },

  setDefenderModels: (models) => set((state) => ({ defender: { ...state.defender, models } })),

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
