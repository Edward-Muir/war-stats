import type { StateCreator } from 'zustand';
import type { Stratagem } from '../../types/data';
import type { DefenderGameState, ConfiguredModel, ActiveStratagem } from '../../types/config';
import { DEFAULT_DEFENDER_STATE } from '../../types/config';
import { buildWargearSlots, buildDefaultModels } from '../../logic/wargear-slots';
import type { AppStore } from '../store';

export interface DefenderSlice {
  defender: {
    factionSlug: string | null;
    chapter: string | null;
    detachmentName: string | null;
    unitName: string | null;
    models: ConfiguredModel[];
    gameState: DefenderGameState;
    activeStratagems: ActiveStratagem[];
  };
  setDefenderFaction: (slug: string, chapter?: string | null) => void;
  setDefenderDetachment: (name: string) => void;
  setDefenderUnit: (name: string) => void;
  setDefenderModels: (models: ConfiguredModel[]) => void;
  setDefenderGameState: (state: Partial<DefenderGameState>) => void;
  toggleDefenderStratagem: (stratagem: Stratagem) => void;
  resetDefender: () => void;
}

const initialDefender: DefenderSlice['defender'] = {
  factionSlug: 'space-marines',
  chapter: null,
  detachmentName: null,
  unitName: null,
  models: [],
  gameState: { ...DEFAULT_DEFENDER_STATE },
  activeStratagems: [],
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
        activeStratagems: [],
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
        activeStratagems: [],
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

  toggleDefenderStratagem: (stratagem) =>
    set((state) => {
      const existing = state.defender.activeStratagems;
      const isActive = existing.some((a) => a.stratagem.name === stratagem.name);
      return {
        defender: {
          ...state.defender,
          activeStratagems: isActive
            ? existing.filter((a) => a.stratagem.name !== stratagem.name)
            : [...existing, { stratagem }],
        },
      };
    }),

  resetDefender: () => set({ defender: { ...initialDefender } }),
});
