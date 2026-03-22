# Session Summary: WH40K Damage Calculator App Skeleton

**Date:** 2026-03-22
**Scope:** Full app skeleton for a Warhammer 40K 10th Edition damage statistics calculator

---

## Overview

Built a complete TypeScript React application skeleton that lets users configure an attacking and defending unit from any 10th Edition faction, then runs Monte Carlo simulations of the full attack sequence to produce damage distributions. The app loads pre-scraped JSON data (1,632 datasheets, 1,044 stratagems, 164 detachments across 25 factions) and serves it statically.

The session covered: architecture planning, project setup, all type definitions, a full simulation engine implementing the 5-step attack sequence with every weapon ability, data loading, business logic for wargear/stratagems, Zustand state management, and a complete UI with dark theme. The app builds with zero TypeScript errors.

---

## Files Created

### Project Setup
| File | Description |
|------|-------------|
| `app/` | New Vite + React + TypeScript project (via `create-vite`) |
| `app/public/data/factions/` | Symlink to `../../factions` for static JSON serving |
| `APP_PLAN.md` | Comprehensive architecture plan with MVP limitations |

### Type Definitions (`app/src/types/`)
| File | Description |
|------|-------------|
| `data.ts` | JSON data shape types mirroring Pydantic models: `FactionIndex`, `UnitDatasheet`, `RawWeapon`, `Stratagem`, `Detachment`, `FactionRules`, etc. |
| `config.ts` | Unit configuration types: `ConfiguredModel`, `SelectedWeapon`, `AttackerGameState`, `DefenderGameState`, `WargearChoice`, `ActiveStratagem` |
| `simulation.ts` | Engine I/O types: `DiceExpr`, `ParsedWeaponKeywords`, `ResolvedWeaponGroup`, `ResolvedModifiers`, `DefenderProfile`, `SimulationResults`, `DistributionStats` |
| `index.ts` | Barrel exports |

### Simulation Engine (`app/src/engine/`) — Pure TS, zero React deps
| File | Description |
|------|-------------|
| `dice.ts` | DiceExpr parser + roller. Handles "D6", "2D3+1", fixed values. Also `parseRollTarget`, `parseAP`, `parseRange`. |
| `keywords.ts` | Parses weapon keyword strings ("sustained hits 2", "anti-vehicle 4+", "lethal hits") into typed `ParsedWeaponKeywords` struct. Uses lookup table for boolean keywords, regex for parameterized. |
| `modifiers.ts` | Computes effective hit/wound/save modifiers from game state + weapon keywords. Applies ±1 caps. Handles Heavy, Stealth, Indirect Fire, Lance, Anti-X, Cover, Rapid Fire, Blast, Melta, Twin-linked, Torrent. |
| `attack.ts` | Full 5-step attack sequence: Hit Roll → Wound Roll → Allocate → Save → Damage. Implements Lethal Hits, Sustained Hits, Devastating Wounds, all crit mechanics. Refactored by linter into helper functions (`resolveHitRoll`, `resolveWoundRoll`, `resolveSave`). |
| `weapon-resolver.ts` | Resolves all attacks from a weapon group. Queues sustained hits extras as auto-hit attacks. Returns damage sequence + mortal wounds. |
| `allocation.ts` | Damage allocation to defender model pool. Normal damage: no carry-over. Mortal wounds: carry-over. FNP per wound lost. Priority: wounded model first. |
| `simulation.ts` | Monte Carlo runner. N iterations, each resolves all weapon groups then allocates damage. Computes `DistributionStats` (mean, median, stddev, percentiles, histogram). |
| `simulation.worker.ts` | Web Worker wrapper for non-blocking simulation. |
| `index.ts` | Barrel exports |

### Data Layer (`app/src/data/`)
| File | Description |
|------|-------------|
| `loader.ts` | `fetchFactionIndex()` and `fetchFactionData(slug)` — parallel fetch of datasheets + rules JSON |
| `hooks.ts` | `useFactionIndex()`, `useFactionData(slug)` — React hooks with cache-aware loading |

### Business Logic (`app/src/logic/`)
| File | Description |
|------|-------------|
| `wargear.ts` | `buildDefaultModels`, `setModelCount`, `getApplicableOptions`, `applyWargearChoice` — validates all 5 wargear scope types |
| `stratagems.ts` | `filterStratagems`, `filterAttackerStratagems`, `filterDefenderStratagems` — compound keyword matching |
| `unit-config.ts` | `getAvailableWeapons`, `resolveWeaponGroups`, `buildDefenderProfile` — bridges datasheet data to simulation input |

### State Management (`app/src/store/`)
| File | Description |
|------|-------------|
| `store.ts` | Zustand store with data cache + 3 slices. `loadFactionIndex`, `loadFaction` with caching. |
| `slices/attacker.ts` | Attacker state: faction, detachment, unit, models, wargear, weapons, game state, stratagems |
| `slices/defender.ts` | Defender state: faction, unit, models, wargear, game state, stratagems |
| `slices/simulation.ts` | Simulation state: iterations, isRunning, results. `buildSimulationInput` assembles from store. Web Worker lifecycle. |

### UI Components (`app/src/components/`)
| File | Description |
|------|-------------|
| `layout/AppShell.tsx` | 3-panel layout (attacker \| results \| defender) with full wiring to store |
| `faction/FactionPicker.tsx` | Dropdown from faction index |
| `faction/DetachmentPicker.tsx` | Dropdown from faction rules |
| `faction/UnitPicker.tsx` | Searchable unit list |
| `unit-config/UnitConfigurator.tsx` | Container: stat line + keywords + model count + wargear + weapons |
| `unit-config/ModelCountSelector.tsx` | Per model definition, respects min/max bounds |
| `unit-config/WargearConfigurator.tsx` | Renders wargear options by scope, tracks choices |
| `unit-config/WeaponSelector.tsx` | Checkboxes with firing model count + half-range toggle |
| `game-state/AttackerState.tsx` | Stationary/advanced/charged toggles |
| `game-state/DefenderState.tsx` | Benefit of cover / stealth toggles |
| `game-state/StratagemPicker.tsx` | Filtered stratagem list with "not simulated" badge |
| `simulation/SimulationControls.tsx` | Run button + iteration count |
| `simulation/ResultsSummary.tsx` | Mean/median/percentile cards for damage, kills, MW |
| `simulation/ResultsChart.tsx` | Histogram via recharts |
| `shared/StatLine.tsx` | M/T/Sv/W/Ld/OC display |
| `shared/WeaponProfile.tsx` | Weapon stats row |
| `shared/KeywordBadge.tsx` | Styled keyword pill |

### Utilities (`app/src/utils/`)
| File | Description |
|------|-------------|
| `keyword-match.ts` | `matchesCompoundKeyword`, `matchesAnyTargetKeyword`, `matchesAllKeywordRestrictions` |
| `format.ts` | `formatDiceExpr`, `formatPercent`, `formatStat` |

### Styles
| File | Description |
|------|-------------|
| `App.css` | Complete dark theme (dark blue/navy palette) for all components |
| `index.css` | Global reset |

---

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| **Zustand** over React Context | Deeply nested config state; Zustand selectors avoid cascading re-renders |
| **Pure engine + Web Worker** | 10K iterations = millions of dice rolls; keeps UI responsive; engine is independently testable |
| **Static JSON from `public/`** | No API server needed; lazy-load per-faction (50-370 KB), cache in memory |
| **Types mirror JSON exactly** | No runtime parsing at data boundary; dice expressions parsed on-demand in engine |
| **Stratagems display-only in MVP** | Effects are free-text; keyword filtering works but only curated effects would feed simulation |

---

## Linter Refinements

The linter improved three engine files after creation:
- **`attack.ts`**: Extracted `resolveHitRoll`, `resolveWoundRoll`, `resolveSave` helper functions and `makeEmptyResult` factory
- **`keywords.ts`**: Extracted `tryParseParameterized` function and `BOOLEAN_KEYWORDS` lookup table
- **`modifiers.ts`**: Extracted `computeHitModifier`, `computeWoundModifier`, `computeCoverBonus`, `computeCritWoundOn` helpers; moved `clamp` to top
- **`wargear.ts`**: Removed unused `ModelDefinition` import, converted `let` to `const`

---

## MVP Limitations (Documented in APP_PLAN.md)

1. **Stratagem effects** — displayed and filterable but not simulated (free-text descriptions)
2. **Enhancement effects** — same limitation
3. **Army rules / detachment rules** — displayed but not simulated
4. **Attached units** (leader + bodyguard) — not modeled
5. **Multi-profile units** (mixed Toughness) — uses single stat line
6. **Damaged profiles** — no mid-simulation degradation
7. **Hazardous self-damage** — parsed but not simulated
8. **Overwatch** — not simulated
9. **No saved state / sharing**

---

## Next Steps

1. **Test the UI end-to-end** — run dev server, select factions, configure units, run simulation
2. **Engine unit tests** — verify against analytical expectations (e.g., 10 bolters vs 10 guardsmen ≈ 4.44 kills)
3. **Curated stratagem effects** — parse common combat effects (+1 hit, rerolls, AP changes) into simulation modifiers
4. **Attached unit support** — leader selection modifying defender profile
5. **UI polish** — responsive layout, loading states, error handling
6. **Performance** — if needed, optimize histogram computation for large result sets

---

## How to Run

```bash
cd app
npm install
npm run dev    # Dev server at http://localhost:5173
npm run build  # Production build (zero TS errors)
```

Data is served from `public/data/factions/` (symlink to `../../factions`).
