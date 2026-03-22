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
    chapter: string | null;
    detachmentName: string | null;
    unitName: string | null;
    models: ConfiguredModel[];
    wargearChoices: WargearChoice[];
    selectedWeapons: SelectedWeapon[];
    gameState: AttackerGameState;
    activeStratagems: ActiveStratagem[];
  };
  setAttackerFaction: (slug: string, chapter?: string | null) => void;
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
  chapter: null,
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
    const chapter = state.attacker.chapter;
    if (!faction) return;
    const data = state.loadedFactions[faction];
    if (!data) return;

    // Prefer chapter-specific variant when a chapter is selected
    const datasheet =
      (chapter && chapter !== 'ADEPTUS ASTARTES'
        ? data.datasheets.datasheets.find(
            (d) => d.name === name && d.faction_keywords.some((k) => k.toUpperCase() === chapter)
          )
        : undefined) ?? data.datasheets.datasheets.find((d) => d.name === name);
    if (!datasheet) return;

    const models = buildDefaultModels(datasheet);
    const available = getAvailableWeapons(datasheet, models);
    const attackMode = state.attacker.gameState.attackMode;
    const selectedWeapons = available
      .filter(({ weapon }) => weapon.type === attackMode)
      .map(({ weapon, maxFiringModels }) => ({
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
    set((state) => {
      const newGameState = { ...state.attacker.gameState, ...partial };
      let selectedWeapons = state.attacker.selectedWeapons;

      // If attackMode changed, re-filter weapons and reset mode-specific state
      if (partial.attackMode && partial.attackMode !== state.attacker.gameState.attackMode) {
        const faction = state.attacker.factionSlug;
        const unitName = state.attacker.unitName;
        if (faction && unitName) {
          const data = state.loadedFactions[faction];
          const chapter = state.attacker.chapter;
          const datasheet =
            (chapter && chapter !== 'ADEPTUS ASTARTES'
              ? data?.datasheets.datasheets.find(
                  (d) =>
                    d.name === unitName &&
                    d.faction_keywords.some((k) => k.toUpperCase() === chapter)
                )
              : undefined) ?? data?.datasheets.datasheets.find((d) => d.name === unitName);
          if (datasheet) {
            const available = getAvailableWeapons(datasheet, state.attacker.models);
            selectedWeapons = available
              .filter(({ weapon }) => weapon.type === partial.attackMode)
              .map(({ weapon, maxFiringModels }) => ({
                weapon,
                firingModelCount: maxFiringModels,
              }));
          }
        }
        // Clear state that doesn't apply to the new mode
        if (partial.attackMode === 'melee') {
          newGameState.targetInHalfRange = false;
        } else {
          newGameState.charged = false;
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
