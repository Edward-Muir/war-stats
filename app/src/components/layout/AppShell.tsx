import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Crosshair, Settings, Swords } from 'lucide-react';
import { useAppStore } from '../../store/store';
import { useFactionData } from '../../data/hooks';
import { GameState } from '../game-state/GameState';
import { StratagemChips } from '../game-state/StratagemChips';
import { SimulationStatus } from '../simulation/SimulationControls';
import { ResultsChart } from '../simulation/ResultsChart';
import { FactionOverlay } from '../overlays/FactionOverlay';
import { UnitOverlay } from '../overlays/UnitOverlay';
import { ConfigOverlay } from '../overlays/ConfigOverlay';
import { StatsOverlay } from '../overlays/StatsOverlay';
import { filterAttackerStratagems, filterDefenderStratagems } from '../../logic/stratagems';

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

  const attackerDetachmentName = useAppStore((s) => s.attacker.detachmentName);
  const defenderDetachmentName = useAppStore((s) => s.defender.detachmentName);
  const attackerChapter = useAppStore((s) => s.attacker.chapter);
  const defenderChapter = useAppStore((s) => s.defender.chapter);
  const attackerActiveStratagems = useAppStore((s) => s.attacker.activeStratagems);
  const defenderActiveStratagems = useAppStore((s) => s.defender.activeStratagems);
  const toggleAttackerStratagem = useAppStore((s) => s.toggleAttackerStratagem);
  const toggleDefenderStratagem = useAppStore((s) => s.toggleDefenderStratagem);
  const attackerFactionData = useAppStore((s) =>
    attackerFactionSlug ? s.loadedFactions[attackerFactionSlug] : undefined,
  );
  const defenderFactionData = useAppStore((s) =>
    defenderFactionSlug ? s.loadedFactions[defenderFactionSlug] : undefined,
  );

  useFactionData(attackerFactionSlug);
  useFactionData(defenderFactionSlug);

  const setAttackerUnit = useAppStore((s) => s.setAttackerUnit);
  const setDefenderUnit = useAppStore((s) => s.setDefenderUnit);
  useEffect(() => {
    if (attackerFactionData && !attackerUnitName) {
      setAttackerUnit('Intercessor Squad');
    }
  }, [attackerFactionData, attackerUnitName, setAttackerUnit]);
  useEffect(() => {
    if (defenderFactionData && !defenderUnitName) {
      setDefenderUnit('Intercessor Squad');
    }
  }, [defenderFactionData, defenderUnitName, setDefenderUnit]);

  const attackerFactionName = factionIndex?.factions.find(
    (f) => f.slug === attackerFactionSlug,
  )?.faction;
  const defenderFactionName = factionIndex?.factions.find(
    (f) => f.slug === defenderFactionSlug,
  )?.faction;

  const attackerStratagems = useMemo(() => {
    if (!attackerFactionData || !attackerUnitName || !attackerDetachmentName) return [];
    const detachment = attackerFactionData.rules.detachments.find(
      (d) => d.name === attackerDetachmentName,
    );
    const datasheet =
      (attackerChapter && attackerChapter !== 'ADEPTUS ASTARTES'
        ? attackerFactionData.datasheets.datasheets.find(
            (d) =>
              d.name === attackerUnitName &&
              d.factionKeywords.some((k) => k.toUpperCase() === attackerChapter),
          )
        : undefined) ??
      attackerFactionData.datasheets.datasheets.find((d) => d.name === attackerUnitName);
    if (!detachment || !datasheet) return [];
    return filterAttackerStratagems(detachment, datasheet);
  }, [attackerFactionData, attackerUnitName, attackerDetachmentName, attackerChapter]);

  const defenderStratagems = useMemo(() => {
    if (!defenderFactionData || !defenderUnitName || !defenderDetachmentName) return [];
    const detachment = defenderFactionData.rules.detachments.find(
      (d) => d.name === defenderDetachmentName,
    );
    const datasheet =
      (defenderChapter && defenderChapter !== 'ADEPTUS ASTARTES'
        ? defenderFactionData.datasheets.datasheets.find(
            (d) =>
              d.name === defenderUnitName &&
              d.factionKeywords.some((k) => k.toUpperCase() === defenderChapter),
          )
        : undefined) ??
      defenderFactionData.datasheets.datasheets.find((d) => d.name === defenderUnitName);
    if (!detachment || !datasheet) return [];
    return filterDefenderStratagems(detachment, datasheet);
  }, [defenderFactionData, defenderUnitName, defenderDetachmentName, defenderChapter]);


  return (
    <div className="mx-auto max-w-[600px] min-h-dvh flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <h1 className="text-base font-bold text-attacker m-0">WH40K Damage Calculator</h1>
        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-muted transition-transform active:scale-95 hover:bg-accent"
          onClick={() =>
            setAttackerGameState({ attackMode: attackMode === 'ranged' ? 'melee' : 'ranged' })
          }
          aria-label={attackMode === 'ranged' ? 'Switch to melee' : 'Switch to ranged'}
        >
          {attackMode === 'ranged' ? (
            <Crosshair className="h-5 w-5" />
          ) : (
            <Swords className="h-5 w-5" />
          )}
        </button>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Attacker section */}
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-attacker">Attacker</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="h-11 px-3 text-sm shrink-0"
              onClick={() => setAttackerFactionOpen(true)}
            >
              {attackerFactionName || 'Faction'}
            </Button>
            <Button
              variant="outline"
              className="h-11 px-3 text-sm flex-1 min-w-0 justify-start truncate"
              onClick={() => setAttackerUnitOpen(true)}
              disabled={!attackerFactionSlug}
            >
              {attackerUnitName || 'Unit'}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11 shrink-0"
              onClick={() => setAttackerConfigOpen(true)}
              disabled={!attackerUnitName}
              aria-label="Attacker configuration"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
          {attackerStratagems.length > 0 && (
            <StratagemChips
              side="attacker"
              stratagems={attackerStratagems}
              activeStratagems={attackerActiveStratagems}
              onToggle={toggleAttackerStratagem}
              attackMode={attackMode}
            />
          )}
        </section>

        {/* Defender section */}
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-defender">Defender</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="h-11 px-3 text-sm shrink-0"
              onClick={() => setDefenderFactionOpen(true)}
            >
              {defenderFactionName || 'Faction'}
            </Button>
            <Button
              variant="outline"
              className="h-11 px-3 text-sm flex-1 min-w-0 justify-start truncate"
              onClick={() => setDefenderUnitOpen(true)}
              disabled={!defenderFactionSlug}
            >
              {defenderUnitName || 'Unit'}
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11 shrink-0"
              onClick={() => setDefenderConfigOpen(true)}
              disabled={!defenderUnitName}
              aria-label="Defender configuration"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
          {defenderStratagems.length > 0 && (
            <StratagemChips
              side="defender"
              stratagems={defenderStratagems}
              activeStratagems={defenderActiveStratagems}
              onToggle={toggleDefenderStratagem}
              attackMode={attackMode}
            />
          )}
        </section>

        {/* Game state chips */}
        <section>
          <GameState
            attackerState={attackerState}
            defenderState={defenderState}
            onAttackerChange={setAttackerGameState}
            onDefenderChange={setDefenderGameState}
          />
        </section>

        {/* Stats preview */}
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-success">Stats</h2>

          <SimulationStatus isRunning={simulation.isRunning} />

          {!attackerUnitName || !defenderUnitName ? (
            <p className="text-sm text-muted-foreground">
              Select an attacker and defender unit to see results.
            </p>
          ) : simulation.results ? (
            <Card
              className="cursor-pointer transition-all hover:border-muted-foreground hover:scale-[1.01] active:scale-[0.99]"
              onClick={() => setStatsOpen(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') setStatsOpen(true);
              }}
            >
              <CardContent className="p-4">
                <div className="flex gap-6 mb-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs text-muted-foreground">Damage</span>
                    <span className="text-2xl font-bold tabular-nums">
                      {simulation.results.summary.damage.mean.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs text-muted-foreground">Models</span>
                    <span className="text-2xl font-bold tabular-nums">
                      {simulation.results.summary.modelsKilled.mean.toFixed(1)}
                    </span>
                  </div>
                </div>
                <ResultsChart
                  stats={simulation.results.summary.damage}
                  iterations={simulation.results.iterations}
                  label="Damage Distribution"
                  color="var(--attacker)"
                />
              </CardContent>
            </Card>
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
