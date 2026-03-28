# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Warhammer 40K 10th Edition damage statistics calculator. Two parts:

1. **Python scrapers + data package** (`warstats/`) — scrapes Wahapedia HTML and converts BattleScribe `.cat`/`.gst` files into structured JSON, hydrates into Pydantic models
2. **React/TypeScript app** (`app/`) — mobile-first overlay UI for configuring attacker/defender units, runs Monte Carlo simulations of the 10th Edition attack sequence

## Commands

All commands run from `app/`:

```bash
npm run dev          # Dev server at http://localhost:5173
npm run build        # TypeScript check (tsc -b) + Vite production build
npm run lint         # ESLint (strict: complexity 15, max-lines 450, max-depth 4, no-explicit-any error)
npm run test         # Vitest single pass
npm run test:watch   # Vitest watch mode
npm run preview      # Preview production build
```

Pre-commit hook (husky + lint-staged) auto-fixes and formats `.ts`/`.tsx` and prettifies `.json`/`.md`/`.css`.

## Architecture

### Data Pipeline

```
Wahapedia HTML (pages/, rules_pages/)
  → Python scrapers (wahapedia_scraper.py, wahapedia_rules_scraper.py)
  → Monolithic JSON (all_datasheets.json, all_rules.json)
  → split_factions.py
  → Per-faction JSON (factions/datasheets/*.json, factions/rules/*.json, factions/index.json)
  → Symlinked into app/public/data/factions/ for static serving

BattleScribe data (bsdata_repo/)
  → battlescribe_converter.py + warstats/bsdata/
  → Same per-faction JSON output
```

### React App Layers (app/src/)

**`types/`** — TypeScript interfaces. `data.ts` = JSON boundary types (strings for stats, dice expressions). `config.ts` = user configuration state. `simulation.ts` = engine I/O types with parsed numeric values.

**`engine/`** — Pure TypeScript simulation engine, zero React dependencies. Runs in a Web Worker (`simulation.worker.ts`). Implements the full 5-step attack sequence (Hit → Wound → Allocate → Save → Damage). Key flow: `simulation.ts` → `weapon-resolver.ts` → `attack.ts` (per attack) → `allocation.ts` (damage to models).

**`data/`** — Fetches static JSON. `loader.ts` fetches, `hooks.ts` provides `useFactionIndex()` and `useFactionData(slug)` with cache-aware loading.

**`logic/`** — Business logic bridging data to engine:
- `wargear-slots.ts` — wargear slot system with 3 scope types (`single_model`, `all_or_nothing`, `variable_count`) and `ModelPool` groups (definitions with identical stats sharing a count pool)
- `stratagems.ts` — filters by detachment + compound keyword matching
- `stratagem-effects.ts` — maps 400+ stratagem names to structured simulation modifiers via `STRATAGEM_EFFECTS` lookup table and `resolveStratagemEffect()`
- `pistol-restrictions.ts` — engagement range / pistol-only shooting rules
- `unit-config.ts` — resolves datasheets into `ResolvedWeaponGroup[]` and `DefenderProfile` for the engine

**`store/`** — Zustand with slices: `attacker` (faction/detachment/unit/weapons/game state), `defender` (faction/unit/game state), `simulation` (iterations/running/results). Data cache lives at store root. The simulation slice has a 300ms debounced auto-run subscriber that triggers simulation whenever attacker or defender state changes. The attacker slice's `findDatasheet()` prefers chapter-specific datasheets for Space Marines sub-chapters.

**`components/`** — Mobile-first overlay architecture:
- `layout/` — `AppShell.tsx` (main orchestrator, manages 7 overlay states), `Overlay.tsx` (shared container)
- `overlays/` — `FactionOverlay`, `UnitOverlay`, `ConfigOverlay`, `StatsOverlay`
- `faction/` — `FactionPicker`, `DetachmentPicker`, `UnitPicker`
- `unit-config/` — `UnitConfigurator`, `ModelGroup`, `WeaponRow`, `CountStepper`, `UnitInfoCard`
- `game-state/` — `GameState`, `StratagemPicker`, `StratagemChips`
- `simulation/` — `SimulationControls`, `ResultsSummary`, `ResultsChart`
- `shared/` — `KeywordBadge`, `StatLine`, `WeaponProfile`
- `ui/` — shadcn/ui components (button, card, badge, checkbox, collapsible, drawer, select, etc.)

**`lib/`** — `utils.ts` contains only the shadcn-standard `cn()` helper.

**`utils/`** — Domain utilities: `format.ts` (dice/stat formatting), `keyword-match.ts` (compound keyword matching for stratagems).

### Python Package (warstats/)

`models.py` defines all Pydantic models (DiceExpr, Weapon, UnitDatasheet, Stratagem, Enhancement, Detachment, etc.). `loader.py` provides monolithic and per-faction loaders with normalisation layers. `bsdata/` handles BattleScribe data conversion. The TypeScript types in `app/src/types/data.ts` mirror these models.

## Key Domain Concepts

- **Weapon keywords** are lowercase strings in JSON: `"sustained hits 2"`, `"anti-vehicle 4+"`, `"lethal hits"`. Parsed by `engine/keywords.ts` into a typed `ParsedWeaponKeywords` struct.
- **Compound keyword matching** for stratagems: `"ADEPTUS ASTARTES INFANTRY"` decomposes into individual words, each must exist in the unit's `keywords` + `faction_keywords`. Implemented in `utils/keyword-match.ts`.
- **Model pools** group wargear definitions with identical stat lines, sharing a count pool. Variant models within a pool can be independently equipped.
- **Modifier caps**: Hit ±1, Wound ±1, Save improvement +1 max. Nat 1 always fails, nat 6 on hit/wound is always a critical. All enforced in `engine/modifiers.ts`.

## Tech Stack

- React 19 + TypeScript (strict, ES2023 target)
- Vite + `@tailwindcss/vite`
- shadcn/ui + Base UI (`@base-ui/react`) + Vaul (drawers)
- Framer Motion for animations, Recharts for histograms, Lucide icons
- Path alias: `@/` → `./src/`

## Tests

Three test files in `app/src/__tests__/` (vitest):
- `simulation.test.ts` — engine scenarios (hit rolls, FNP, invuln, TORRENT, MELTA, LETHAL HITS)
- `wargear-slots.test.ts` — slot construction, model pools, wargear selection
- `complex-datasheets.test.ts` — structural integrity of real faction JSON + detailed wargear scenarios

Tests are excluded from `tsconfig.app.json` — vitest handles its own transpilation, so tests can import Node APIs (`fs`, `path`) that the app cannot.

## Rules Reference

`wh40k_10e_attack_rules_reference.md` is the authoritative spec for the simulation engine. Every weapon ability and modifier rule is documented there.

## Current Limitations

Enhancement effects are free-text — filterable/displayable but not parsed into simulation modifiers. Attached units (leader + bodyguard), multi-profile units, damaged profiles, and hazardous self-damage are not yet implemented. See `APP_PLAN.md` section 5 for the full list.

## Data

25 factions, 1,632 datasheets, 1,044 stratagems, 164 detachments, 588 enhancements. Index is 9 KB; largest faction datasheet is ~370 KB. Factions are lazy-loaded on selection.
