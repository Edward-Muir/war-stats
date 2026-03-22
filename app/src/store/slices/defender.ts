import type { StateCreator } from "zustand";
import type { Stratagem } from "../../types/data";
import type {
  DefenderGameState,
  ConfiguredModel,
  WargearChoice,
  ActiveStratagem,
} from "../../types/config";
import { DEFAULT_DEFENDER_STATE } from "../../types/config";
import { buildDefaultModels } from "../../logic/wargear";
import type { AppStore } from "../store";

export interface DefenderSlice {
  defender: {
    factionSlug: string | null;
    detachmentName: string | null;
    unitName: string | null;
    models: ConfiguredModel[];
    wargearChoices: WargearChoice[];
    gameState: DefenderGameState;
    activeStratagems: ActiveStratagem[];
  };
  setDefenderFaction: (slug: string) => void;
  setDefenderDetachment: (name: string) => void;
  setDefenderUnit: (name: string) => void;
  setDefenderModels: (models: ConfiguredModel[]) => void;
  setDefenderGameState: (state: Partial<DefenderGameState>) => void;
  toggleDefenderStratagem: (stratagem: Stratagem) => void;
  resetDefender: () => void;
}

const initialDefender: DefenderSlice["defender"] = {
  factionSlug: null,
  detachmentName: null,
  unitName: null,
  models: [],
  wargearChoices: [],
  gameState: { ...DEFAULT_DEFENDER_STATE },
  activeStratagems: [],
};

export const createDefenderSlice: StateCreator<AppStore, [], [], DefenderSlice> = (
  set,
  get,
) => ({
  defender: { ...initialDefender },

  setDefenderFaction: (slug) =>
    set({ defender: { ...initialDefender, factionSlug: slug } }),

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
    if (!faction) return;
    const data = state.loadedFactions[faction];
    if (!data) return;

    const datasheet = data.datasheets.datasheets.find((d) => d.name === name);
    if (!datasheet) return;

    const models = buildDefaultModels(datasheet);

    set({
      defender: {
        ...state.defender,
        unitName: name,
        models,
        wargearChoices: [],
        activeStratagems: [],
      },
    });
  },

  setDefenderModels: (models) =>
    set((state) => ({ defender: { ...state.defender, models } })),

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
      const isActive = existing.some(
        (a) => a.stratagem.name === stratagem.name,
      );
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
