import type { StateCreator } from 'zustand';
import type { SimulationResults } from '../../types/simulation';
import type { AppStore } from '../store';
import { loadStoredDefaults } from '../../utils/local-storage';

export interface SimulationSlice {
  simulation: {
    iterations: number;
    isRunning: boolean;
    results: SimulationResults | null;
    worker: Worker | null;
  };
  runSimulation: () => void;
  clearResults: () => void;
}

const _stored = loadStoredDefaults();

export const createSimulationSlice: StateCreator<AppStore, [], [], SimulationSlice> = (
  set,
  get
) => ({
  simulation: {
    iterations: _stored?.simulationIterations ?? 10000,
    isRunning: false,
    results: null,
    worker: null,
  },

  runSimulation: () => {
    const state = get();

    // Terminate any in-flight worker
    if (state.simulation.worker) {
      state.simulation.worker.terminate();
      set((s) => ({
        simulation: { ...s.simulation, isRunning: false, worker: null },
      }));
    }

    // Build simulation input from current attacker/defender state
    const input = buildSimulationInput(get());
    if (!input) {
      // Clear stale results when there's nothing to simulate (e.g. no weapons for this mode)
      set((s) => ({ simulation: { ...s.simulation, results: null } }));
      return;
    }

    set((s) => ({
      simulation: { ...s.simulation, isRunning: true, results: null },
    }));

    // Create a web worker
    const worker = new Worker(new URL('../../engine/simulation.worker.ts', import.meta.url), {
      type: 'module',
    });

    worker.onmessage = (event: MessageEvent<SimulationResults>) => {
      set((s) => ({
        simulation: {
          ...s.simulation,
          isRunning: false,
          results: event.data,
          worker: null,
        },
      }));
      worker.terminate();
    };

    worker.onerror = (err) => {
      console.error('Simulation worker error:', err);
      set((s) => ({
        simulation: { ...s.simulation, isRunning: false, worker: null },
      }));
      worker.terminate();
    };

    set((s) => ({ simulation: { ...s.simulation, worker } }));
    worker.postMessage(input);
  },

  clearResults: () =>
    set((s) => ({
      simulation: { ...s.simulation, results: null },
    })),
});

// ─── Helper to assemble SimulationInput from store state ─────────

import type { SimulationInput } from '../../types/simulation';
import { resolveWeaponGroups, buildDefenderProfile } from '../../logic/unit-config';
import { getTotalModels } from '../../logic/wargear-slots';
import { parseWeaponKeywords } from '../../engine/keywords';

function buildSimulationInput(state: AppStore): SimulationInput | null {
  const { attacker, defender } = state;

  // Need both units selected
  if (!attacker.factionSlug || !attacker.unitName) return null;
  if (!defender.factionSlug || !defender.unitName) return null;

  const defenderData = state.loadedFactions[defender.factionSlug];
  if (!defenderData) return null;

  const defenderDatasheet = defenderData.datasheets.datasheets.find(
    (d) => d.name === defender.unitName
  );
  if (!defenderDatasheet) return null;

  // Only simulate weapons matching the current attack mode (ranged or melee)
  let modeWeapons = attacker.selectedWeapons.filter(
    (sw) => sw.weapon.type === attacker.gameState.attackMode
  );

  // Advance weapon filtering: only Assault/Pistol weapons can fire after advancing
  if (attacker.gameState.advanced) {
    modeWeapons = modeWeapons.filter((sw) => {
      const kw = parseWeaponKeywords(sw.weapon.keywords);
      return kw.assault || kw.pistol;
    });
  }

  if (modeWeapons.length === 0) return null;

  const weaponGroups = resolveWeaponGroups(modeWeapons).map((wg) => ({
    ...wg,
    targetInHalfRange: attacker.gameState.targetInHalfRange,
  }));
  const defenderModelCount = getTotalModels(defender.models);
  const defenderProfile = buildDefenderProfile(defenderDatasheet, defenderModelCount);

  // Filter available effects by active IDs to get active UnitEffect[]
  const activeIds = new Set(attacker.activeEffectIds);
  const attackerEffects = attacker.availableEffects.filter((e) => activeIds.has(e.id));

  const defActiveIds = new Set(defender.activeEffectIds);
  const defenderEffects = defender.availableEffects.filter((e) => defActiveIds.has(e.id));

  return {
    attacker: {
      weaponGroups,
      gameState: attacker.gameState,
      attackerEffects,
    },
    defender: {
      ...defenderProfile,
      gameState: defender.gameState,
      defenderEffects,
    },
    iterations: state.defaults.simulationIterations,
  };
}

// ─── Auto-run subscription ──────────────────────────────────────

import type { StoreApi } from 'zustand';

export function initAutoRun(store: StoreApi<AppStore>) {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  store.subscribe((state, prev) => {
    // React to attacker, defender, or iteration changes
    if (
      state.attacker === prev.attacker &&
      state.defender === prev.defender &&
      state.defaults.simulationIterations === prev.defaults.simulationIterations
    )
      return;

    const canRun = !!state.attacker.unitName && !!state.defender.unitName;
    if (!canRun) return;

    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      store.getState().runSimulation();
    }, 300);
  });
}
