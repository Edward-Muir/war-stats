import { create } from 'zustand';
import type { FactionIndex, FactionDatasheets, FactionRules } from '../types/data';
import { fetchFactionIndex, fetchFactionData } from '../data/loader';
import { createAttackerSlice, type AttackerSlice } from './slices/attacker';
import { createDefenderSlice, type DefenderSlice } from './slices/defender';
import { createUnitConfigSlice, type UnitConfigSlice } from './slices/unit-config';
import { createSimulationSlice, initAutoRun, type SimulationSlice } from './slices/simulation';
import { createDefaultsSlice, type DefaultsSlice } from './slices/defaults';

// ─── Data cache slice ────────────────────────────────────────────

interface DataSlice {
  factionIndex: FactionIndex | null;
  loadedFactions: Record<string, { datasheets: FactionDatasheets; rules: FactionRules }>;
  loadFactionIndex: () => Promise<void>;
  loadFaction: (slug: string) => Promise<void>;
}

// ─── Combined store type ─────────────────────────────────────────

export type AppStore = DataSlice &
  AttackerSlice &
  DefenderSlice &
  UnitConfigSlice &
  SimulationSlice &
  DefaultsSlice;

// ─── Store creation ──────────────────────────────────────────────

export const useAppStore = create<AppStore>()((...a) => ({
  // Data cache
  factionIndex: null,
  loadedFactions: {},

  loadFactionIndex: async () => {
    try {
      const index = await fetchFactionIndex();
      a[0]({ factionIndex: index });
    } catch (err) {
      console.error('Failed to load faction index:', err);
    }
  },

  loadFaction: async (slug: string) => {
    const state = a[1]();
    if (state.loadedFactions[slug]) return; // Already cached

    try {
      const data = await fetchFactionData(slug);
      a[0]((s) => ({
        loadedFactions: { ...s.loadedFactions, [slug]: data },
      }));
    } catch (err) {
      console.error(`Failed to load faction ${slug}:`, err);
    }
  },

  // Slices
  ...createAttackerSlice(...a),
  ...createDefenderSlice(...a),
  ...createUnitConfigSlice(...a),
  ...createSimulationSlice(...a),
  ...createDefaultsSlice(...a),
}));

// Start auto-run subscription
initAutoRun(useAppStore);
