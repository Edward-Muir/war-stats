import type { SimulationInput, SimulationResults } from "../types/simulation";
import { runSimulation } from "./simulation";

self.onmessage = (event: MessageEvent<SimulationInput>) => {
  const results: SimulationResults = runSimulation(event.data);
  self.postMessage(results);
};
