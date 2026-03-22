import { useAppStore } from "../../store/store";
import { useFactionData } from "../../data/hooks";
import { FactionPicker } from "../faction/FactionPicker";
import { DetachmentPicker } from "../faction/DetachmentPicker";
import { UnitPicker } from "../faction/UnitPicker";
import { UnitConfigurator } from "../unit-config/UnitConfigurator";
import { AttackerState } from "../game-state/AttackerState";
import { DefenderState } from "../game-state/DefenderState";
import { StratagemPicker } from "../game-state/StratagemPicker";
import { SimulationControls } from "../simulation/SimulationControls";
import { ResultsSummary } from "../simulation/ResultsSummary";
import { ResultsChart } from "../simulation/ResultsChart";
import { filterAttackerStratagems, filterDefenderStratagems } from "../../logic/stratagems";

export function AppShell() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>WH40K Damage Calculator</h1>
        <p>10th Edition Attack Sequence Simulator</p>
      </header>
      <div className="app-panels">
        <AttackerPanel />
        <ResultsPanel />
        <DefenderPanel />
      </div>
    </div>
  );
}

function AttackerPanel() {
  const attacker = useAppStore((s) => s.attacker);
  const setFaction = useAppStore((s) => s.setAttackerFaction);
  const setDetachment = useAppStore((s) => s.setAttackerDetachment);
  const setUnit = useAppStore((s) => s.setAttackerUnit);
  const setModels = useAppStore((s) => s.setAttackerModels);
  const setWeapons = useAppStore((s) => s.setAttackerSelectedWeapons);
  const setGameState = useAppStore((s) => s.setAttackerGameState);
  const toggleStratagem = useAppStore((s) => s.toggleAttackerStratagem);
  const loadFaction = useAppStore((s) => s.loadFaction);

  const { data } = useFactionData(attacker.factionSlug);

  const datasheet = data?.datasheets.datasheets.find(
    (d) => d.name === attacker.unitName,
  );
  const detachment = data?.rules.detachments.find(
    (d) => d.name === attacker.detachmentName,
  );

  const applicableStratagems =
    detachment && datasheet
      ? filterAttackerStratagems(detachment, datasheet)
      : [];

  return (
    <div className="panel attacker-panel">
      <h2>Attacker</h2>

      <FactionPicker
        label="Attacking Faction"
        value={attacker.factionSlug}
        onChange={(slug) => {
          setFaction(slug);
          loadFaction(slug);
        }}
      />

      {data && (
        <DetachmentPicker
          detachments={data.rules.detachments}
          value={attacker.detachmentName}
          onChange={setDetachment}
        />
      )}

      {data && (
        <UnitPicker
          units={data.datasheets.datasheets}
          value={attacker.unitName}
          onChange={setUnit}
        />
      )}

      {datasheet && (
        <UnitConfigurator
          datasheet={datasheet}
          models={attacker.models}
          onModelsChange={setModels}
          selectedWeapons={attacker.selectedWeapons}
          onWeaponsChange={setWeapons}
          side="attacker"
        />
      )}

      {datasheet && (
        <AttackerState
          state={attacker.gameState}
          onChange={setGameState}
        />
      )}

      {applicableStratagems.length > 0 && (
        <StratagemPicker
          available={applicableStratagems}
          active={attacker.activeStratagems}
          onToggle={toggleStratagem}
        />
      )}
    </div>
  );
}

function DefenderPanel() {
  const defender = useAppStore((s) => s.defender);
  const setFaction = useAppStore((s) => s.setDefenderFaction);
  const setDetachment = useAppStore((s) => s.setDefenderDetachment);
  const setUnit = useAppStore((s) => s.setDefenderUnit);
  const setModels = useAppStore((s) => s.setDefenderModels);
  const setGameState = useAppStore((s) => s.setDefenderGameState);
  const toggleStratagem = useAppStore((s) => s.toggleDefenderStratagem);
  const loadFaction = useAppStore((s) => s.loadFaction);

  const { data } = useFactionData(defender.factionSlug);

  const datasheet = data?.datasheets.datasheets.find(
    (d) => d.name === defender.unitName,
  );
  const detachment = data?.rules.detachments.find(
    (d) => d.name === defender.detachmentName,
  );

  const applicableStratagems =
    detachment && datasheet
      ? filterDefenderStratagems(detachment, datasheet)
      : [];

  return (
    <div className="panel defender-panel">
      <h2>Defender</h2>

      <FactionPicker
        label="Defending Faction"
        value={defender.factionSlug}
        onChange={(slug) => {
          setFaction(slug);
          loadFaction(slug);
        }}
      />

      {data && (
        <DetachmentPicker
          detachments={data.rules.detachments}
          value={defender.detachmentName}
          onChange={setDetachment}
        />
      )}

      {data && (
        <UnitPicker
          units={data.datasheets.datasheets}
          value={defender.unitName}
          onChange={setUnit}
        />
      )}

      {datasheet && (
        <UnitConfigurator
          datasheet={datasheet}
          models={defender.models}
          onModelsChange={setModels}
          side="defender"
        />
      )}

      {datasheet && (
        <DefenderState
          state={defender.gameState}
          onChange={setGameState}
        />
      )}

      {applicableStratagems.length > 0 && (
        <StratagemPicker
          available={applicableStratagems}
          active={defender.activeStratagems}
          onToggle={toggleStratagem}
        />
      )}
    </div>
  );
}

function ResultsPanel() {
  const simulation = useAppStore((s) => s.simulation);
  const attacker = useAppStore((s) => s.attacker);
  const defender = useAppStore((s) => s.defender);
  const setIterations = useAppStore((s) => s.setIterations);
  const runSim = useAppStore((s) => s.runSimulation);

  const canRun =
    !!attacker.unitName &&
    !!defender.unitName &&
    attacker.selectedWeapons.length > 0;

  return (
    <div className="panel results-panel">
      <h2>Simulation</h2>

      <SimulationControls
        iterations={simulation.iterations}
        isRunning={simulation.isRunning}
        canRun={canRun}
        onIterationsChange={setIterations}
        onRun={runSim}
      />

      {!canRun && !simulation.results && (
        <div className="results-placeholder">
          Select an attacker unit with weapons and a defender unit to run the simulation.
        </div>
      )}

      {simulation.results && (
        <>
          <ResultsSummary results={simulation.results} />
          <ResultsChart
            stats={simulation.results.summary.damage}
            label="Total Damage"
            color="#e74c3c"
          />
          <ResultsChart
            stats={simulation.results.summary.modelsKilled}
            label="Models Killed"
            color="#3498db"
          />
        </>
      )}
    </div>
  );
}
