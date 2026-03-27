# Session Summary: BattleScribe Data Converter + Data Model Evolution

**Date:** 2026-03-27
**Plan file:** `.claude/plans/generic-floating-puddle.md`

## Overview

Investigated switching from Wahapedia HTML scraping to BattleScribe XML (BSData/wh40k-10e) as the data source for unit/weapon profiles. This led to both building a converter AND designing an evolved v2 data model that learns from BattleScribe's structure to fix real pain points in the app.

## What Was Accomplished

### Research & Planning
- Explored the BSData/wh40k-10e repo structure (51 .cat files, 1 .gst file)
- Analyzed the BattleScribe XML schema in detail: profiles, selection trees, constraints, categories, cross-file references
- Identified what BS provides (stats, weapons, keywords, points, wargear, abilities) and what it doesn't (stratagems, complete enhancements, detachment rules)
- Mapped all data consumption points in the React/TypeScript app to understand blast radius of schema changes
- Designed a hybrid pipeline: BS for datasheets, keep Wahapedia rules scraper for stratagems/enhancements

### Data Model Evolution (v2 Schema Design)
Designed 4 key improvements inspired by BattleScribe's structure:

1. **Weapon Registry** — Weapons defined once per faction with stable IDs (e.g., `"bolt-pistol"`) instead of inlined per-unit. Eliminates the fragile 4-step fuzzy name matching in `getGroupWeapons()`.
2. **Tree-Based Wargear** — `SelectionGroup` with `min`/`max` constraints and `Selection` entries replaces flat `WargearOption`. Selection groups ARE the slots — `wargear-slots.ts` shrinks from 654 lines to ~100.
3. **Per-Model Stats** — `stats` moves from `UnitDatasheet` to `ModelDefinition`, enabling multi-profile units (different T/W per model type).
4. **Structured Ability Effects** — `feelNoPain` as a number, `damaged` as a structured object — extracted at scrape time instead of runtime regex.

### Python Converter (Part 2 — Complete)
Built the full BattleScribe-to-JSON converter:

- **`warstats/bsdata/registry.py`** — Loads all .gst + .cat XML, builds global ID index (99,863 elements), resolves cross-file UUID references, collects 1,701 categories and core ability names
- **`warstats/bsdata/extractor.py`** — Extracts units into v2 schema: per-model stats, weapon registry with IDs, structured abilities, keywords from categoryLinks, points with tier detection, leader units, model definitions with selection groups. Modified by other session to also handle infoLink-based stat resolution and movement normalization.
- **`warstats/bsdata/wargear.py`** — Converts BS `selectionEntryGroup` trees into `SelectionGroup`/`Selection` dicts with min/max constraints and weapon ID references
- **`warstats/bsdata/faction_map.py`** — Maps BS catalogue names to our faction names (merges 12 SM chapters → "Space Marines", Aeldari sub-factions, T'au → Tau, etc.)
- **`battlescribe_converter.py`** — Main script with auto-clone, git pull, commit hash change detection (`.bsdata_last_build`), `--no-pull` and `--force` flags

### First Successful Run
```
python3 battlescribe_converter.py --no-pull --force
→ 398 datasheets across 24 factions
→ all_datasheets.json (1,565 KB)
```

## Files Created
| File | Purpose |
|---|---|
| `battlescribe_converter.py` | Main conversion script |
| `warstats/bsdata/__init__.py` | Package init |
| `warstats/bsdata/registry.py` | XML loading + cross-file ID resolution |
| `warstats/bsdata/extractor.py` | Unit/weapon/ability/keyword extraction |
| `warstats/bsdata/wargear.py` | SelectionGroup conversion |
| `warstats/bsdata/faction_map.py` | Faction name mapping |
| `.claude/plans/generic-floating-puddle.md` | Full implementation plan |

## Files Modified
| File | Change |
|---|---|
| `.gitignore` | Added `bsdata_repo/` and `.bsdata_last_build` |

## Key Decisions & Rationale

1. **Hybrid pipeline** (BS datasheets + Wahapedia rules) — BattleScribe completely lacks stratagems and has incomplete enhancement data. The existing rules scraper stays.
2. **Evolve data model simultaneously** — User chose to redesign the schema alongside the converter rather than convert to the old format first. More work upfront but avoids building on a known-flawed model.
3. **Skip Legends units** — `[Legends]` units are deprecated; BS has them but we filter them out (398 vs ~500+ total).
4. **Engine layer untouched** — The simulation engine only consumes `ResolvedWeaponGroup` and `DefenderProfile`, which are internal types. All changes are in types → logic → store → components.
5. **Weapon IDs from slugified names** — e.g., `"bolt-pistol"`, `"infernus-heavy-bolter--heavy-flamer"`. BattleScribe UUIDs are used for dedup during extraction but not exposed in the JSON.

## Unfinished Work / Next Steps

### Immediate (converter validation)
- Validate converter output quality — compare stats, weapons, keywords, points against existing Wahapedia datasheets for several factions
- Fix any extraction bugs found (empty stats, missing weapons, incorrect keyword classification)
- Some unit counts are lower than Wahapedia (e.g., Space Marines: 59 vs 299) — likely due to Legends filtering + BS having different unit granularity. Needs investigation.

### App Layer Updates (Part 3 of plan)
1. **Update TypeScript types** (`app/src/types/data.ts`) — `WeaponRegistry`, `SelectionGroup`, `Selection`, updated `UnitDatasheet`, `ModelDefinition`, `AbilityBlock`
2. **Rewrite `wargear-slots.ts`** — SelectionGroups are the slots, direct weapon ID lookup from registry
3. **Update store** (`attacker.ts`/`defender.ts`) — unit selection flow for new model/wargear structure
4. **Update components** (`ModelGroup.tsx`, `UnitInfoCard.tsx`) — stats from model definitions, weapons by ID
5. **Update `split_factions.py`** — handle v2 schema (weapon registry at faction level)
6. **Update `unit-config.ts`** — remove FNP regex, use structured `abilities.feelNoPain` field
7. **End-to-end validation** — `npm run build`, dev server, simulation test

### Key Files to Modify (app side)
- `app/src/types/data.ts` — new types + updated interfaces
- `app/src/logic/wargear-slots.ts` — major rewrite (654 → ~100 lines)
- `app/src/logic/unit-config.ts` — remove FNP regex, weapons from registry
- `app/src/store/attacker.ts` / `defender.ts` — new model/wargear flow
- `app/src/components/ModelGroup.tsx` — stats from model, weapons by ID
- `app/src/components/UnitInfoCard.tsx` — stats from primary model
- `split_factions.py` — v2 schema support

## Context for Future Sessions

- The `extractor.py` was modified in a parallel session to add infoLink-based stat resolution and movement normalization — those changes are already on disk
- The `registry.py` was also modified to handle `type="model"` entries as standalone units (single-model characters like Canoness)
- The BSData repo is at `bsdata_repo/` (gitignored). Run `python3 battlescribe_converter.py --no-pull --force` to regenerate
- Existing Wahapedia datasheets are in `factions/datasheets/*.json` for comparison — all 25 factions have data
- The project memory file notes 717 missing generic weapons from Wahapedia — the BS converter fixes this since it has all weapon profiles inline
