import type { StateCreator } from 'zustand';
import type { Stratagem } from '../../types/data';
import type {
  AttackerGameState,
  ConfiguredModel,
  SelectedWeapon,
  WargearChoice,
  ActiveStratagem,
} from '../../types/config';
import { DEFAULT_ATTACKER_STATE } from '../../types/config';
import { buildDefaultModels } from '../../logic/wargear';
import { getAvailableWeapons } from '../../logic/unit-config';
import type { AppStore } from '../store';

export interface AttackerSlice {
  attacker: {
    factionSlug: string | null;
    detachmentName: string | null;
    unitName: string | null;
    models: ConfiguredModel[];
    wargearChoices: WargearChoice[];
    selectedWeapons: SelectedWeapon[];
    gameState: AttackerGameState;
    activeStratagems: ActiveStratagem[];
  };
  setAttackerFaction: (slug: string) => void;
  setAttackerDetachment: (name: string) => void;
  setAttackerUnit: (name: string) => void;
  setAttackerModels: (models: ConfiguredModel[]) => void;
  setAttackerSelectedWeapons: (weapons: SelectedWeapon[]) => void;
  setAttackerGameState: (state: Partial<AttackerGameState>) => void;
  toggleAttackerStratagem: (stratagem: Stratagem) => void;
  resetAttacker: () => void;
}

const initialAttacker: AttackerSlice['attacker'] = {
  factionSlug: null,
  detachmentName: null,
  unitName: null,
  models: [],
  wargearChoices: [],
  selectedWeapons: [],
  gameState: { ...DEFAULT_ATTACKER_STATE },
  activeStratagems: [],
};

export const createAttackerSlice: StateCreator<AppStore, [], [], AttackerSlice> = (set, get) => ({
  attacker: { ...initialAttacker },

  setAttackerFaction: (slug) =>
    set({
      attacker: {
        ...initialAttacker,
        factionSlug: slug,
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
    const data = state.loadedFactions[faction];
    if (!data) return;

    const datasheet = data.datasheets.datasheets.find((d) => d.name === name);
    if (!datasheet) return;

    const models = buildDefaultModels(datasheet);
    const available = getAvailableWeapons(datasheet, models);
    const selectedWeapons = available.map(({ weapon, maxFiringModels }) => ({
      weapon,
      firingModelCount: maxFiringModels,
    }));

    set({
      attacker: {
        ...state.attacker,
        unitName: name,
        models,
        wargearChoices: [],
        selectedWeapons,
        activeStratagems: [],
      },
    });
  },

  setAttackerModels: (models) => set((state) => ({ attacker: { ...state.attacker, models } })),

  setAttackerSelectedWeapons: (weapons) =>
    set((state) => ({ attacker: { ...state.attacker, selectedWeapons: weapons } })),

  setAttackerGameState: (partial) =>
    set((state) => ({
      attacker: {
        ...state.attacker,
        gameState: { ...state.attacker.gameState, ...partial },
      },
    })),

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
