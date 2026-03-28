import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Crosshair, Menu, Settings, Swords } from 'lucide-react';
import { useAppStore } from '../../store/store';
import { useFactionData } from '../../data/hooks';
import { GameState } from '../game-state/GameState';
import { EffectChips } from '../game-state/EffectChips';
import { deriveAvailableEffects } from '../../logic/effect-keys';
import { StatsPreview } from '../simulation/StatsPreview';
import { FactionOverlay } from '../overlays/FactionOverlay';
import { UnitOverlay } from '../overlays/UnitOverlay';
import { ConfigOverlay } from '../overlays/ConfigOverlay';
import { MethodologyOverlay } from '../overlays/MethodologyOverlay';
import { DefaultsOverlay } from '../overlays/DefaultsOverlay';
import { BurgerMenu } from './BurgerMenu';
import { FactionIcon } from '../shared/FactionIcon';
import { useFilteredStratagems } from '../../hooks/useFilteredStratagems';
import { useGameStateRelevance } from '../../hooks/useGameStateRelevance';
import { useTheme } from '../../hooks/useTheme';

export function AppShell() {
  // Overlay state
  const [attackerFactionOpen, setAttackerFactionOpen] = useState(false);
  const [attackerUnitOpen, setAttackerUnitOpen] = useState(false);
  const [attackerConfigOpen, setAttackerConfigOpen] = useState(false);
  const [defenderFactionOpen, setDefenderFactionOpen] = useState(false);
  const [defenderUnitOpen, setDefenderUnitOpen] = useState(false);
  const [defenderConfigOpen, setDefenderConfigOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [methodologyOpen, setMethodologyOpen] = useState(false);
  const [defaultsOpen, setDefaultsOpen] = useState(false);
  const { theme, toggle: toggleTheme } = useTheme();

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
  const attackerActiveEffects = useAppStore((s) => s.attacker.activeEffects);
  const defenderActiveEffects = useAppStore((s) => s.defender.activeEffects);
  const toggleAttackerEffect = useAppStore((s) => s.toggleAttackerEffect);
  const toggleDefenderEffect = useAppStore((s) => s.toggleDefenderEffect);
  const attackerFactionData = useAppStore((s) =>
    attackerFactionSlug ? s.loadedFactions[attackerFactionSlug] : undefined
  );
  const defenderFactionData = useAppStore((s) =>
    defenderFactionSlug ? s.loadedFactions[defenderFactionSlug] : undefined
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
    (f) => f.slug === attackerFactionSlug
  )?.faction;
  const defenderFactionName = factionIndex?.factions.find(
    (f) => f.slug === defenderFactionSlug
  )?.faction;

  const attackerStratagems = useFilteredStratagems(
    'attacker',
    attackerFactionData,
    attackerUnitName,
    attackerDetachmentName,
    attackerChapter
  );
  const defenderStratagems = useFilteredStratagems(
    'defender',
    defenderFactionData,
    defenderUnitName,
    defenderDetachmentName,
    defenderChapter
  );

  // Compute game state toggle relevance
  const gameStateRelevance = useGameStateRelevance(
    attackerStratagems,
    defenderStratagems,
    attackMode,
    attackerFactionData,
    attackerUnitName,
    defenderFactionData,
    defenderUnitName
  );

  // Shared game state props
  const gameStateProps = {
    attackerState,
    defenderState,
    relevance: gameStateRelevance,
    onAttackerChange: setAttackerGameState,
    onDefenderChange: setDefenderGameState,
  };

  // Derive available effect chips from filtered stratagems
  const attackerAvailableEffects = useMemo(
    () => deriveAvailableEffects(attackerStratagems, attackMode),
    [attackerStratagems, attackMode]
  );
  const defenderAvailableEffects = useMemo(
    () => deriveAvailableEffects(defenderStratagems, attackMode),
    [defenderStratagems, attackMode]
  );

  return (
    <div className="mx-auto max-w-[600px] min-h-dvh flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
        <h1 className="text-base font-bold text-attacker m-0">WH40K Damage Calculator</h1>
        <div className="flex items-center gap-2">
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
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-muted transition-transform active:scale-95 hover:bg-accent"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Attacker section */}
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-attacker">Attacker</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11 shrink-0"
              onClick={() => setAttackerFactionOpen(true)}
              aria-label={attackerFactionName || 'Select faction'}
            >
              {attackerFactionSlug ? (
                <FactionIcon slug={attackerFactionSlug} chapter={attackerChapter} />
              ) : (
                <span className="text-xs">F</span>
              )}
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
          <EffectChips
            side="attacker"
            availableEffects={attackerAvailableEffects}
            activeEffects={attackerActiveEffects}
            onToggle={toggleAttackerEffect}
          />
          <GameState side="attacker" {...gameStateProps} />
        </section>

        {/* Defender section */}
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-defender">Defender</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11 shrink-0"
              onClick={() => setDefenderFactionOpen(true)}
              aria-label={defenderFactionName || 'Select faction'}
            >
              {defenderFactionSlug ? (
                <FactionIcon slug={defenderFactionSlug} chapter={defenderChapter} />
              ) : (
                <span className="text-xs">F</span>
              )}
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
          <EffectChips
            side="defender"
            availableEffects={defenderAvailableEffects}
            activeEffects={defenderActiveEffects}
            onToggle={toggleDefenderEffect}
          />
          <GameState side="defender" {...gameStateProps} />
        </section>

        {/* Stats inline */}
        <StatsPreview hasUnits={!!attackerUnitName && !!defenderUnitName} simulation={simulation} />
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
      <BurgerMenu
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        onOpenMethodology={() => {
          setMenuOpen(false);
          setMethodologyOpen(true);
        }}
        onOpenDefaults={() => {
          setMenuOpen(false);
          setDefaultsOpen(true);
        }}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
      <MethodologyOverlay isOpen={methodologyOpen} onClose={() => setMethodologyOpen(false)} />
      <DefaultsOverlay isOpen={defaultsOpen} onClose={() => setDefaultsOpen(false)} />
    </div>
  );
}
