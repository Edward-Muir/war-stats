import { useEffect, useRef } from 'react';
import { useAppStore } from '../../store/store';
import { useFactionData } from '../../data/hooks';
import { FactionPicker } from '../faction/FactionPicker';
import { DetachmentPicker } from '../faction/DetachmentPicker';
import { UnitPicker } from '../faction/UnitPicker';
import { UnitConfigurator } from '../unit-config/UnitConfigurator';
import { GameState } from '../game-state/GameState';
import { StratagemPicker } from '../game-state/StratagemPicker';
import { SimulationStatus } from '../simulation/SimulationControls';
import { ResultsSummary } from '../simulation/ResultsSummary';
import { ResultsChart } from '../simulation/ResultsChart';
import { filterAttackerStratagems, filterDefenderStratagems } from '../../logic/stratagems';

export function AppShell() {
  const attackMode = useAppStore((s) => s.attacker.gameState.attackMode);
  const setAttackerGameState = useAppStore((s) => s.setAttackerGameState);

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>WH40K Damage Calculator</h1>
        <p>10th Edition Attack Sequence Simulator</p>
      </header>

      <div className="attack-mode-toggle">
        <button
          type="button"
          className={`attack-mode-btn ${attackMode === 'ranged' ? 'attack-mode-btn--active' : ''}`}
          onClick={() => setAttackerGameState({ attackMode: 'ranged' })}
        >
          Ranged
        </button>
        <button
          type="button"
          className={`attack-mode-btn ${attackMode === 'melee' ? 'attack-mode-btn--active' : ''}`}
          onClick={() => setAttackerGameState({ attackMode: 'melee' })}
        >
          Melee
        </button>
      </div>

      <div className="app-panels">
        <AttackerPanel />
        <DefenderPanel />
        <GameStateSection />
        <ResultsPanel />
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
  const toggleStratagem = useAppStore((s) => s.toggleAttackerStratagem);
  const loadFaction = useAppStore((s) => s.loadFaction);

  const { data } = useFactionData(attacker.factionSlug);

  const datasheet = data?.datasheets.datasheets.find((d) => d.name === attacker.unitName);
  const detachment = data?.rules.detachments.find((d) => d.name === attacker.detachmentName);

  const applicableStratagems =
    detachment && datasheet ? filterAttackerStratagems(detachment, datasheet) : [];

  return (
    <details className="panel attacker-panel" open>
      <summary>
        <h2>Attacker</h2>
      </summary>

      <FactionPicker
        label="Attacking Faction"
        value={attacker.factionSlug}
        onChange={(slug) => {
          setFaction(slug);
          loadFaction(slug);
        }}
        onClear={() => setFaction('')}
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
          onClear={() => setUnit('')}
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
          attackMode={attacker.gameState.attackMode}
        />
      )}

      {applicableStratagems.length > 0 && (
        <StratagemPicker
          available={applicableStratagems}
          active={attacker.activeStratagems}
          onToggle={toggleStratagem}
        />
      )}
    </details>
  );
}

function DefenderPanel() {
  const defender = useAppStore((s) => s.defender);
  const setFaction = useAppStore((s) => s.setDefenderFaction);
  const setDetachment = useAppStore((s) => s.setDefenderDetachment);
  const setUnit = useAppStore((s) => s.setDefenderUnit);
  const setModels = useAppStore((s) => s.setDefenderModels);
  const toggleStratagem = useAppStore((s) => s.toggleDefenderStratagem);
  const loadFaction = useAppStore((s) => s.loadFaction);

  const { data } = useFactionData(defender.factionSlug);

  const datasheet = data?.datasheets.datasheets.find((d) => d.name === defender.unitName);
  const detachment = data?.rules.detachments.find((d) => d.name === defender.detachmentName);

  const applicableStratagems =
    detachment && datasheet ? filterDefenderStratagems(detachment, datasheet) : [];

  return (
    <details className="panel defender-panel">
      <summary>
        <h2>Defender</h2>
      </summary>

      <FactionPicker
        label="Defending Faction"
        value={defender.factionSlug}
        onChange={(slug) => {
          setFaction(slug);
          loadFaction(slug);
        }}
        onClear={() => setFaction('')}
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
          onClear={() => setUnit('')}
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

      {applicableStratagems.length > 0 && (
        <StratagemPicker
          available={applicableStratagems}
          active={defender.activeStratagems}
          onToggle={toggleStratagem}
        />
      )}
    </details>
  );
}

function GameStateSection() {
  const attackerState = useAppStore((s) => s.attacker.gameState);
  const defenderState = useAppStore((s) => s.defender.gameState);
  const setAttackerGameState = useAppStore((s) => s.setAttackerGameState);
  const setDefenderGameState = useAppStore((s) => s.setDefenderGameState);

  return (
    <details className="panel game-state-panel">
      <summary>
        <h2>Game State</h2>
      </summary>
      <GameState
        attackerState={attackerState}
        defenderState={defenderState}
        onAttackerChange={setAttackerGameState}
        onDefenderChange={setDefenderGameState}
      />
    </details>
  );
}

function ResultsPanel() {
  const simulation = useAppStore((s) => s.simulation);
  const attacker = useAppStore((s) => s.attacker);
  const defender = useAppStore((s) => s.defender);
  const detailsRef = useRef<HTMLDetailsElement>(null);

  const hasConfig = !!attacker.unitName && !!defender.unitName;

  // Auto-open results when simulation completes
  useEffect(() => {
    if (simulation.results && detailsRef.current) {
      detailsRef.current.open = true;
    }
  }, [simulation.results]);

  return (
    <details className="panel results-panel" ref={detailsRef}>
      <summary>
        <h2>Results</h2>
      </summary>

      <SimulationStatus isRunning={simulation.isRunning} />

      {!hasConfig && !simulation.results && (
        <div className="results-placeholder">
          Select an attacker and defender unit to see results.
        </div>
      )}

      {simulation.results && (
        <>
          <ResultsSummary results={simulation.results} />
          <ResultsChart
            stats={simulation.results.summary.damage}
            iterations={simulation.results.iterations}
            label="Total Damage"
            color="#e74c3c"
          />
          <ResultsChart
            stats={simulation.results.summary.modelsKilled}
            iterations={simulation.results.iterations}
            label="Models Killed"
            color="#3498db"
          />
        </>
      )}
    </details>
  );
}
