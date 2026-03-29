import type { StateCreator } from 'zustand';
import type { AppStore } from '../store';
import {
  type StoredDefaults,
  BUILTIN_DEFAULTS,
  loadStoredDefaults,
  saveStoredDefaults,
  clearStoredDefaults,
} from '../../utils/local-storage';

export interface DefaultsSlice {
  defaults: StoredDefaults;
  setDefaults: (update: Partial<StoredDefaults>) => void;
  setCurrentAsDefaults: () => void;
  resetDefaults: () => void;
}

export const createDefaultsSlice: StateCreator<AppStore, [], [], DefaultsSlice> = (set, get) => ({
  defaults: loadStoredDefaults() ?? { ...BUILTIN_DEFAULTS },

  setDefaults: (update) => {
    const merged = { ...get().defaults, ...update };
    saveStoredDefaults(merged);
    set({ defaults: merged });
  },

  setCurrentAsDefaults: () => {
    const { attacker, defender, defaults } = get();
    const snapshot: StoredDefaults = {
      attackerFactionSlug: attacker.factionSlug ?? defaults.attackerFactionSlug,
      attackerChapter: attacker.chapter,
      attackerUnitName: attacker.unitName,
      attackerDetachmentName: attacker.detachmentName,
      attackerGameState: attacker.gameState,
      defenderFactionSlug: defender.factionSlug ?? defaults.defenderFactionSlug,
      defenderChapter: defender.chapter,
      defenderUnitName: defender.unitName,
      defenderDetachmentName: defender.detachmentName,
      defenderGameState: defender.gameState,
      simulationIterations: defaults.simulationIterations,
    };
    saveStoredDefaults(snapshot);
    set({ defaults: snapshot });
  },

  resetDefaults: () => {
    clearStoredDefaults();
    set({ defaults: { ...BUILTIN_DEFAULTS } });
  },
});
