# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Warhammer 40K 10th Edition damage statistics calculator. Two parts:

1. **Python scrapers + data package** (`warstats/`) — scrapes Wahapedia HTML into structured JSON, hydrates into Pydantic models
2. **React/TypeScript app** (`app/`) — configures attacker/defender units, runs Monte Carlo simulations of the 10th Edition attack sequence

## Commands

All commands run from `app/`:

```bash
npm run dev        # Dev server at http://localhost:5173
npm run build      # TypeScript check + Vite production build
npm run lint       # ESLint
npm run preview    # Preview production build
```

No test framework is set up yet. The build (`tsc -b && vite build`) catches all type errors.

## Architecture

### Data Pipeline

```
Wahapedia HTML (pages/, rules_pages/)
  → Python scrapers (wahapedia_scraper.py, wahapedia_rules_scraper.py)
  → Monolithic JSON (all_datasheets.json, all_rules.json)
  → split_factions.py
  → Per-faction JSON (factions/datasheets/*.json, factions/rules/*.json, factions/index.json)
  → Symlinked into app/public/data/factions/ for static serving
```

### React App Layers (app/src/)

**`types/`** — TypeScript interfaces mirroring the JSON data shapes. `data.ts` = JSON boundary types (strings for stats, dice expressions). `config.ts` = user configuration state. `simulation.ts` = engine I/O types with parsed numeric values.

**`engine/`** — Pure TypeScript simulation engine with zero React dependencies. Runs in a Web Worker. Implements the full 5-step attack sequence (Hit Roll → Wound Roll → Allocate → Save → Damage) with all weapon abilities. Key flow: `simulation.ts` → `weapon-resolver.ts` → `attack.ts` (per attack) → `allocation.ts` (damage to models).

**`data/`** — Fetches static JSON. `loader.ts` fetches, `hooks.ts` provides `useFactionIndex()` and `useFactionData(slug)` with cache-aware loading.

**`logic/`** — Business logic bridging data to engine. `wargear.ts` validates all 5 wargear scope types (this_model, all_models, named_model, specific_count, per_n_models). `stratagems.ts` filters by detachment + compound keyword matching. `unit-config.ts` resolves datasheets into `ResolvedWeaponGroup[]` and `DefenderProfile` for the engine.

**`store/`** — Zustand with slices: `attacker` (faction/detachment/unit/weapons/game state), `defender` (faction/unit/game state), `simulation` (iterations/running/results). Data cache lives at store root. `simulation.ts` slice assembles `SimulationInput` from both sides and dispatches to Web Worker.

**`components/`** — `AppShell` is a 3-panel layout (attacker | results | defender). Each panel wires to the store. `AppShell.tsx` is the main orchestrator with `AttackerPanel`, `DefenderPanel`, `ResultsPanel` as local components.

### Python Package (warstats/)

`models.py` defines all Pydantic models (DiceExpr, Weapon, UnitDatasheet, Stratagem, Enhancement, Detachment, etc.). `loader.py` provides monolithic and per-faction loaders with normalisation layers. The TypeScript types in `app/src/types/data.ts` mirror these models.

## Key Domain Concepts

- **Weapon keywords** are lowercase strings in JSON: `"sustained hits 2"`, `"anti-vehicle 4+"`, `"lethal hits"`. Parsed by `engine/keywords.ts` into a typed `ParsedWeaponKeywords` struct.
- **Compound keyword matching** for stratagems: `"ADEPTUS ASTARTES INFANTRY"` decomposes into individual words, each must exist in the unit's `keywords` + `faction_keywords`. Implemented in `utils/keyword-match.ts`.
- **Wargear options** have 5 scope types controlling which models can swap equipment. All validation lives in `logic/wargear.ts`.
- **Modifier caps**: Hit ±1, Wound ±1, Save improvement +1 max. Nat 1 always fails, nat 6 on hit/wound is always a critical. All enforced in `engine/modifiers.ts`.

## Rules Reference

`wh40k_10e_attack_rules_reference.md` is the authoritative spec for the simulation engine. Every weapon ability and modifier rule is documented there.

## MVP Limitations

Stratagem and enhancement effects are free-text — they are filterable/displayable by keyword matching but not parsed into simulation modifiers. Attached units (leader + bodyguard), multi-profile units, damaged profiles, and hazardous self-damage are not yet implemented. See `APP_PLAN.md` section 5 for the full list.

## Data

25 factions, 1,632 datasheets, 1,044 stratagems, 164 detachments, 588 enhancements. Index is 9 KB; largest faction datasheet is ~370 KB. Factions are lazy-loaded on selection.
