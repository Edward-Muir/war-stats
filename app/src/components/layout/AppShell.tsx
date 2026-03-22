import { useState } from 'react';
import { useAppStore } from '../../store/store';
import { GameState } from '../game-state/GameState';
import { SimulationStatus } from '../simulation/SimulationControls';
import { ResultsChart } from '../simulation/ResultsChart';
import { FactionOverlay } from '../overlays/FactionOverlay';
import { UnitOverlay } from '../overlays/UnitOverlay';
import { ConfigOverlay } from '../overlays/ConfigOverlay';
import { StatsOverlay } from '../overlays/StatsOverlay';

export function AppShell() {
  // Overlay state
  const [attackerFactionOpen, setAttackerFactionOpen] = useState(false);
  const [attackerUnitOpen, setAttackerUnitOpen] = useState(false);
  const [attackerConfigOpen, setAttackerConfigOpen] = useState(false);
  const [defenderFactionOpen, setDefenderFactionOpen] = useState(false);
  const [defenderUnitOpen, setDefenderUnitOpen] = useState(false);
  const [defenderConfigOpen, setDefenderConfigOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);

  // Store state
  const attackMode = useAppStore((s) => s.attacker.gameState.attackMode);
  const setAttackerGameState = useAppStore((s) => s.setAttackerGameState);
  const attackerState = useAppStore((s) => s.attacker.gameState);
  const defenderState = useAppStore((s) => s.defender.gameState);
  const setDefenderGameState = useAppStore((s) => s.setDefenderGameState);

  const attackerFactionSlug = useAppStore((s) => s.attacker.factionSlug);
  const attackerUnitName = useAppStore((s) => s.attacker.unitName);
  const defenderFactionSlug = useAppStore((s) => s.defender.factionSlug);
  const defenderUnitName = useAppStore((s) => s.defender.unitName);

  const factionIndex = useAppStore((s) => s.factionIndex);
  const simulation = useAppStore((s) => s.simulation);

  // Derive display names
  const attackerFactionName = factionIndex?.factions.find(
    (f) => f.slug === attackerFactionSlug
  )?.faction;
  const defenderFactionName = factionIndex?.factions.find(
    (f) => f.slug === defenderFactionSlug
  )?.faction;

  return (
    <div className="app-shell">
      {/* Header with attack mode toggle */}
      <header className="app-header">
        <h1>WH40K Damage Calculator</h1>
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
      </header>

      {/* Main screen content */}
      <main className="main-content">
        {/* Attacker row */}
        <section className="main-section">
          <h2 className="section-label section-label--attacker">Attacker</h2>
          <div className="nav-row">
            <button type="button" className="nav-btn" onClick={() => setAttackerFactionOpen(true)}>
              {attackerFactionName || 'Faction'}
            </button>
            <button
              type="button"
              className="nav-btn nav-btn--wide"
              onClick={() => setAttackerUnitOpen(true)}
              disabled={!attackerFactionSlug}
            >
              {attackerUnitName || 'Unit'}
            </button>
            <button
              type="button"
              className="nav-btn nav-btn--cog"
              onClick={() => setAttackerConfigOpen(true)}
              disabled={!attackerUnitName}
              aria-label="Attacker configuration"
            >
              ⚙
            </button>
          </div>
        </section>

        {/* Defender row */}
        <section className="main-section">
          <h2 className="section-label section-label--defender">Defender</h2>
          <div className="nav-row">
            <button type="button" className="nav-btn" onClick={() => setDefenderFactionOpen(true)}>
              {defenderFactionName || 'Faction'}
            </button>
            <button
              type="button"
              className="nav-btn nav-btn--wide"
              onClick={() => setDefenderUnitOpen(true)}
              disabled={!defenderFactionSlug}
            >
              {defenderUnitName || 'Unit'}
            </button>
            <button
              type="button"
              className="nav-btn nav-btn--cog"
              onClick={() => setDefenderConfigOpen(true)}
              disabled={!defenderUnitName}
              aria-label="Defender configuration"
            >
              ⚙
            </button>
          </div>
        </section>

        {/* Game state chips */}
        <section className="main-section">
          <GameState
            attackerState={attackerState}
            defenderState={defenderState}
            onAttackerChange={setAttackerGameState}
            onDefenderChange={setDefenderGameState}
          />
        </section>

        {/* Stats preview */}
        <section className="main-section">
          <h2 className="section-label section-label--stats">Stats</h2>

          <SimulationStatus isRunning={simulation.isRunning} />

          {!attackerUnitName || !defenderUnitName ? (
            <div className="results-placeholder">
              Select an attacker and defender unit to see results.
            </div>
          ) : simulation.results ? (
            <div
              className="stats-preview"
              onClick={() => setStatsOpen(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') setStatsOpen(true);
              }}
            >
              <div className="stats-headline">
                <span className="stats-headline-item">
                  <span className="stats-headline-label">Damage</span>
                  <span className="stats-headline-value">
                    {simulation.results.summary.damage.mean.toFixed(1)}
                  </span>
                </span>
                <span className="stats-headline-item">
                  <span className="stats-headline-label">Models</span>
                  <span className="stats-headline-value">
                    {simulation.results.summary.modelsKilled.mean.toFixed(1)}
                  </span>
                </span>
              </div>
              <ResultsChart
                stats={simulation.results.summary.damage}
                iterations={simulation.results.iterations}
                label="Damage Distribution"
                color="#e74c3c"
              />
            </div>
          ) : null}
        </section>
      </main>

      {/* Overlays */}
      <FactionOverlay
        side="attacker"
        isOpen={attackerFactionOpen}
        onClose={() => setAttackerFactionOpen(false)}
      />
      <FactionOverlay
        side="defender"
        isOpen={defenderFactionOpen}
        onClose={() => setDefenderFactionOpen(false)}
      />
      <UnitOverlay
        side="attacker"
        isOpen={attackerUnitOpen}
        onClose={() => setAttackerUnitOpen(false)}
      />
      <UnitOverlay
        side="defender"
        isOpen={defenderUnitOpen}
        onClose={() => setDefenderUnitOpen(false)}
      />
      <ConfigOverlay
        side="attacker"
        isOpen={attackerConfigOpen}
        onClose={() => setAttackerConfigOpen(false)}
      />
      <ConfigOverlay
        side="defender"
        isOpen={defenderConfigOpen}
        onClose={() => setDefenderConfigOpen(false)}
      />
      <StatsOverlay isOpen={statsOpen} onClose={() => setStatsOpen(false)} />
    </div>
  );
}
