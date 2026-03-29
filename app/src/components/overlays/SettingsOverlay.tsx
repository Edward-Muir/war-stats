import { useState } from 'react';
import { Overlay } from '../layout/Overlay';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { useAppStore } from '../../store/store';
import { useFactionIndex } from '../../data/hooks';
import { FactionPicker } from '../faction/FactionPicker';
import { BUILTIN_DEFAULTS, type StoredDefaults } from '../../utils/local-storage';
import type { AttackerGameState, DefenderGameState } from '../../types/config';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const sectionTitle = 'text-xs font-semibold uppercase tracking-wide text-muted-foreground';

function DefaultChip({
  pressed,
  onPressedChange,
  side,
  children,
}: {
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  side: 'attacker' | 'defender';
  children: React.ReactNode;
}) {
  return (
    <Toggle
      pressed={pressed}
      onPressedChange={onPressedChange}
      className={cn(
        'h-9 rounded-full border border-border px-3.5 text-xs font-semibold data-[state=off]:bg-transparent transition-transform hover:-translate-y-0.5 active:scale-95',
        pressed && side === 'attacker' && 'border-attacker bg-attacker/15 text-attacker',
        pressed && side === 'defender' && 'border-defender bg-defender/15 text-defender'
      )}
    >
      {children}
    </Toggle>
  );
}

function FactionSection({
  label,
  currentSlug,
  currentChapter,
  onSelect,
}: {
  label: string;
  currentSlug: string;
  currentChapter: string | null;
  onSelect: (slug: string, chapter?: string) => void;
}) {
  const { index } = useFactionIndex();
  const [expanded, setExpanded] = useState(false);

  const displayName = (() => {
    if (!index) return currentSlug;
    const entry = index.factions.find((f) => f.slug === currentSlug);
    return currentChapter ?? entry?.faction ?? currentSlug;
  })();

  return (
    <div>
      <Button
        variant="outline"
        className="w-full justify-between h-11 px-3 text-sm"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="truncate">{displayName}</span>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </Button>
      {expanded && (
        <div className="mt-2 rounded-xl border border-border p-2 max-h-64 overflow-y-auto">
          <FactionPicker
            label={label}
            onChange={(slug, chapterKeyword) => {
              onSelect(slug, chapterKeyword);
              setExpanded(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

const MIN_ITERATIONS = 10000;
const MAX_ITERATIONS = 1000000;
const STEP = 10000;

function clampIterations(n: number): number {
  return Math.max(MIN_ITERATIONS, Math.min(MAX_ITERATIONS, Math.round(n / STEP) * STEP));
}

/** Inner form that mounts fresh each time the overlay opens, so draft starts from store defaults. */
function SettingsForm({ onClose }: { onClose: () => void }) {
  const defaults = useAppStore((s) => s.defaults);
  const setDefaults = useAppStore((s) => s.setDefaults);
  const resetDefaults = useAppStore((s) => s.resetDefaults);

  const [draft, setDraft] = useState<StoredDefaults>(() => ({
    ...defaults,
    simulationIterations: clampIterations(defaults.simulationIterations),
  }));

  const updateDraft = (update: Partial<StoredDefaults>) => {
    setDraft((prev) => ({ ...prev, ...update }));
  };

  const updateAttackerGameState = (update: Partial<AttackerGameState>) => {
    setDraft((prev) => ({
      ...prev,
      attackerGameState: { ...prev.attackerGameState, ...update },
    }));
  };

  const updateDefenderGameState = (update: Partial<DefenderGameState>) => {
    setDraft((prev) => ({
      ...prev,
      defenderGameState: { ...prev.defenderGameState, ...update },
    }));
  };

  const handleSave = () => {
    setDefaults(draft);
    onClose();
  };

  const handleReset = () => {
    resetDefaults();
    setDraft({ ...BUILTIN_DEFAULTS });
  };

  const attackerGS = {
    attackMode: (draft.attackerGameState.attackMode ?? 'ranged') as 'ranged' | 'melee',
    remainedStationary: draft.attackerGameState.remainedStationary ?? false,
    advanced: draft.attackerGameState.advanced ?? false,
    charged: draft.attackerGameState.charged ?? false,
    targetInHalfRange: draft.attackerGameState.targetInHalfRange ?? false,
    engagementRange: draft.attackerGameState.engagementRange ?? false,
  };

  const defenderGS = {
    inCover: draft.defenderGameState.inCover ?? false,
    benefitOfCover: draft.defenderGameState.benefitOfCover ?? false,
    stealthAll: draft.defenderGameState.stealthAll ?? false,
    closestTarget: draft.defenderGameState.closestTarget ?? true,
  };

  return (
    <div className="space-y-5">
      {/* Attacker Defaults */}
      <section className="space-y-3">
        <h3 className={sectionTitle}>Attacker</h3>

        <FactionSection
          label="Default Attacker Faction"
          currentSlug={draft.attackerFactionSlug}
          currentChapter={draft.attackerChapter}
          onSelect={(slug, chapter) =>
            updateDraft({ attackerFactionSlug: slug, attackerChapter: chapter ?? null })
          }
        />

        <div>
          <p className="text-xs text-muted-foreground mb-2">Attack Mode</p>
          <div className="flex gap-2">
            <DefaultChip
              pressed={attackerGS.attackMode === 'ranged'}
              onPressedChange={() => updateAttackerGameState({ attackMode: 'ranged' })}
              side="attacker"
            >
              Ranged
            </DefaultChip>
            <DefaultChip
              pressed={attackerGS.attackMode === 'melee'}
              onPressedChange={() => updateAttackerGameState({ attackMode: 'melee' })}
              side="attacker"
            >
              Melee
            </DefaultChip>
          </div>
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-2">Game State</p>
          <div className="flex flex-wrap gap-2">
            <DefaultChip
              pressed={attackerGS.remainedStationary}
              onPressedChange={(v) => updateAttackerGameState({ remainedStationary: v })}
              side="attacker"
            >
              Stationary
            </DefaultChip>
            <DefaultChip
              pressed={attackerGS.advanced}
              onPressedChange={(v) => updateAttackerGameState({ advanced: v })}
              side="attacker"
            >
              Advanced
            </DefaultChip>
            <DefaultChip
              pressed={attackerGS.charged}
              onPressedChange={(v) => updateAttackerGameState({ charged: v })}
              side="attacker"
            >
              Charged
            </DefaultChip>
            <DefaultChip
              pressed={attackerGS.targetInHalfRange}
              onPressedChange={(v) => updateAttackerGameState({ targetInHalfRange: v })}
              side="attacker"
            >
              Half Range
            </DefaultChip>
            <DefaultChip
              pressed={attackerGS.engagementRange}
              onPressedChange={(v) => updateAttackerGameState({ engagementRange: v })}
              side="attacker"
            >
              Engagement Range
            </DefaultChip>
          </div>
        </div>
      </section>

      {/* Defender Defaults */}
      <section className="space-y-3">
        <h3 className={sectionTitle}>Defender</h3>

        <FactionSection
          label="Default Defender Faction"
          currentSlug={draft.defenderFactionSlug}
          currentChapter={draft.defenderChapter}
          onSelect={(slug, chapter) =>
            updateDraft({ defenderFactionSlug: slug, defenderChapter: chapter ?? null })
          }
        />

        <div>
          <p className="text-xs text-muted-foreground mb-2">Game State</p>
          <div className="flex flex-wrap gap-2">
            <DefaultChip
              pressed={defenderGS.inCover}
              onPressedChange={(v) => updateDefenderGameState({ inCover: v })}
              side="defender"
            >
              In Cover
            </DefaultChip>
            <DefaultChip
              pressed={defenderGS.benefitOfCover}
              onPressedChange={(v) => updateDefenderGameState({ benefitOfCover: v })}
              side="defender"
            >
              Benefit of Cover
            </DefaultChip>
            <DefaultChip
              pressed={defenderGS.stealthAll}
              onPressedChange={(v) => updateDefenderGameState({ stealthAll: v })}
              side="defender"
            >
              Stealth
            </DefaultChip>
            <DefaultChip
              pressed={defenderGS.closestTarget}
              onPressedChange={(v) => updateDefenderGameState({ closestTarget: v })}
              side="defender"
            >
              Closest Unit
            </DefaultChip>
          </div>
        </div>
      </section>

      {/* Simulation Settings */}
      <section className="space-y-3">
        <h3 className={sectionTitle}>Simulation</h3>
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-xs text-muted-foreground">Iterations</p>
            <span className="text-sm font-semibold tabular-nums">
              {draft.simulationIterations.toLocaleString()}
            </span>
          </div>
          <input
            type="range"
            min={MIN_ITERATIONS}
            max={MAX_ITERATIONS}
            step={STEP}
            value={draft.simulationIterations}
            onChange={(e) => updateDraft({ simulationIterations: Number(e.target.value) })}
            className="w-full h-2 rounded-full appearance-none cursor-pointer bg-muted accent-foreground
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground [&::-webkit-slider-thumb]:shadow-sm
              [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background
              [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5
              [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-foreground [&::-moz-range-thumb]:shadow-sm
              [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-background [&::-moz-range-thumb]:border-solid"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>10K</span>
            <span>1M</span>
          </div>
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        Game state toggles may be overridden when they are irrelevant to the selected unit's weapons
        or abilities.
      </p>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button className="flex-1" onClick={handleSave}>
          Save
        </Button>
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="h-4 w-4 mr-1.5" />
          Reset
        </Button>
      </div>
    </div>
  );
}

export function SettingsOverlay({ isOpen, onClose }: Props) {
  return (
    <Overlay isOpen={isOpen} onClose={onClose} title="Settings">
      {isOpen && <SettingsForm onClose={onClose} />}
    </Overlay>
  );
}
