import type { StateCreator } from "zustand";
import type { SimulationResults } from "../../types/simulation";
import type { AppStore } from "../store";

export interface SimulationSlice {
  simulation: {
    iterations: number;
    isRunning: boolean;
    results: SimulationResults | null;
    worker: Worker | null;
  };
  setIterations: (n: number) => void;
  runSimulation: () => void;
  clearResults: () => void;
}

export const createSimulationSlice: StateCreator<
  AppStore,
  [],
  [],
  SimulationSlice
> = (set, get) => ({
  simulation: {
    iterations: 10000,
    isRunning: false,
    results: null,
    worker: null,
  },

  setIterations: (n) =>
    set((state) => ({
      simulation: { ...state.simulation, iterations: Math.max(100, Math.min(100000, n)) },
    })),

  runSimulation: () => {
    const state = get();
    if (state.simulation.isRunning) return;

    // Build simulation input from current attacker/defender state
    const input = buildSimulationInput(state);
    if (!input) return;

    set((s) => ({
      simulation: { ...s.simulation, isRunning: true, results: null },
    }));

    // Create a web worker
    const worker = new Worker(
      new URL("../../engine/simulation.worker.ts", import.meta.url),
      { type: "module" },
    );

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
      console.error("Simulation worker error:", err);
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

import type { SimulationInput } from "../../types/simulation";
import { resolveWeaponGroups, buildDefenderProfile } from "../../logic/unit-config";
import { getTotalModels } from "../../logic/wargear";

function buildSimulationInput(state: AppStore): SimulationInput | null {
  const { attacker, defender, simulation } = state;

  // Need both units selected and weapons chosen
  if (!attacker.factionSlug || !attacker.unitName) return null;
  if (!defender.factionSlug || !defender.unitName) return null;
  if (attacker.selectedWeapons.length === 0) return null;

  const defenderData = state.loadedFactions[defender.factionSlug];
  if (!defenderData) return null;

  const defenderDatasheet = defenderData.datasheets.datasheets.find(
    (d) => d.name === defender.unitName,
  );
  if (!defenderDatasheet) return null;

  const weaponGroups = resolveWeaponGroups(attacker.selectedWeapons);
  const defenderModelCount = getTotalModels(defender.models);
  const defenderProfile = buildDefenderProfile(defenderDatasheet, defenderModelCount);

  return {
    attacker: {
      weaponGroups,
      gameState: attacker.gameState,
      stratagems: attacker.activeStratagems,
    },
    defender: {
      ...defenderProfile,
      gameState: defender.gameState,
      stratagems: defender.activeStratagems,
    },
    iterations: simulation.iterations,
  };
}
