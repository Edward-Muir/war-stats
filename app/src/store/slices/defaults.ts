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
  resetDefaults: () => void;
}

export const createDefaultsSlice: StateCreator<AppStore, [], [], DefaultsSlice> = (set, get) => ({
  defaults: loadStoredDefaults() ?? { ...BUILTIN_DEFAULTS },

  setDefaults: (update) => {
    const merged = { ...get().defaults, ...update };
    saveStoredDefaults(merged);
    set({ defaults: merged });
  },

  resetDefaults: () => {
    clearStoredDefaults();
    set({ defaults: { ...BUILTIN_DEFAULTS } });
  },
});
