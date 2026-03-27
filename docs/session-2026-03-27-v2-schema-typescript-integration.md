# Session Summary: V2 Schema TypeScript Integration

**Date**: March 27, 2026
**Topic**: Part 3 — Migrate TypeScript app from Wahapedia v1 schema to BattleScribe v2 schema
**Status**: Complete — build passes, data regenerated

---

## Overview

Migrated the entire React/TypeScript app from the Wahapedia v1 data schema to the BattleScribe v2 schema produced by the converter built in Parts 1-2. This was a clean break — no backward compatibility with v1. The simulation engine (`engine/`) was unchanged; only the data types, logic layer, store, and components were updated.

**Key Achievement**: 15 files modified, 1 deleted, build passes cleanly with 2,124 datasheets across 24 factions in v2 format.

---

## Files Modified

### Types (Foundation)

#### `app/src/types/data.ts` — Major rewrite
- Added new v2 types: `V2Selection`, `V2SelectionGroup`, `V2ModelDefinition`
- `UnitDatasheet.weapons`: `RawWeapon[]` → `Record<string, RawWeapon>` (weapon registry keyed by slug)
- Removed `stats: RawStats` from `UnitDatasheet` (stats now per-model in `models[]`)
- `model_definitions` → `models: V2ModelDefinition[]` with `id`, `min`, `max`, `stats`, `defaultWeaponIds`, `selectionGroups`
- Removed `wargear_options` (replaced by `selectionGroups` on each model)
- `AbilityBlock`: added `feelNoPain: number | null`, restructured `damaged` to `{threshold, description} | null`
- Renamed all snake_case fields to camelCase: `base_size`→`baseSize`, `invulnerable_save`→`invulnerableSave`, `faction_keywords`→`factionKeywords`, `leader_units`→`leaderUnits`
- Removed dead types: `WargearOption`, `WargearScope`, old `ModelDefinition`

#### `app/src/types/config.ts` — Medium update
- `WargearSlotOption`: replaced `optionIndex`/`choiceIndex` with `selectionGroupId`/`selectionId`/`weaponIds`
- Added `pointsDelta` field
- Removed `choiceRaw` field
- `SlotSelection.optionKey` format changed to `"${selectionGroupId}:${selectionId}"`
- Removed `raw` field from `WargearSlot`

### Logic Layer

#### `app/src/logic/wargear-slots.ts` — Major rewrite (~650 → ~400 lines)
- `buildWargearSlots()`: Iterates `datasheet.models` → `model.selectionGroups` (was parsing `wargear_options` text)
- New `computeWeaponIds()`: Replaces `computeEquipment()`, works with weapon IDs instead of equipment name strings
- `getGroupWeapons()`: Direct ID lookup from `datasheet.weapons[id]` — eliminated all fuzzy name matching, plural fallbacks, multi-profile splitting
- `buildDefaultModels()`: Handles `min: 0` optional models (creates groups with count 0)
- Removed: `getApplicableOptionIndices()`, `determineSlotScope()` (simplified inline), choice-parser imports
- All `model_definitions` → `models`, `min_models`→`min`, `max_models`→`max`

#### `app/src/logic/unit-config.ts` — Small update
- `buildDefenderProfile()`: Toughness uses `Math.max(...models.map(m => parseInt(m.stats.T)))` per Rules Commentary (highest T among all models)
- Save/Wounds from `datasheet.models[0].stats`
- FNP from `datasheet.abilities.feelNoPain` directly (was regex parsing from core abilities)
- `invulnerableSave`, `factionKeywords` (camelCase)

#### `app/src/logic/stratagems.ts` — Trivial rename
- `unit.faction_keywords` → `unit.factionKeywords`

#### `app/src/logic/index.ts` — Export rename
- `computeEquipment` → `computeWeaponIds`

### Store Slices

#### `app/src/store/slices/attacker.ts` — Small rename
- `d.faction_keywords` → `d.factionKeywords` in `findDatasheet()`

#### `app/src/store/slices/defender.ts` — Small rename
- `d.faction_keywords` → `d.factionKeywords` in `setDefenderUnit()`

### Components

#### `app/src/components/unit-config/UnitInfoCard.tsx`
- `datasheet.stats` → `datasheet.models[0].stats`
- `datasheet.invulnerable_save` → `datasheet.invulnerableSave`
- `abilities.damaged` + `abilities.damaged_description` → `abilities.damaged?.threshold` + `abilities.damaged?.description`

#### `app/src/components/unit-config/ModelGroup.tsx`
- `datasheet.model_definitions` → `datasheet.models`
- `def.min_models`/`max_models` → `def.min`/`def.max`
- All `optionIndex:choiceIndex` key formats → `selectionGroupId:selectionId`
- Removed `title={slot.raw}` (field no longer exists)

#### `app/src/components/unit-config/UnitConfigurator.tsx`
- `datasheet.model_definitions` → `datasheet.models`
- `def.max_models` → `def.max`

#### `app/src/components/overlays/UnitOverlay.tsx`
- `u.faction_keywords` → `u.factionKeywords`

#### `app/src/components/layout/AppShell.tsx`
- `d.faction_keywords` → `d.factionKeywords`

#### `app/src/components/overlays/ConfigOverlay.tsx`
- `d.faction_keywords` → `d.factionKeywords`

### Data Pipeline

#### `split_factions.py` — Small update
- Drops faction-level `weapons` key from per-faction output (each datasheet has its own)
- Made rules file optional (BattleScribe-only pipeline may not have `all_rules.json`)
- Added safety checks for missing rules directory

### Tests

#### `app/src/__tests__/wargear-slots.test.ts` — Full rewrite
- Rewritten to use v2 schema types and APIs
- Tests: slot construction, default models with min:0, weapon ID lookup, slot selection, weapon derivation, definition total, empty selection groups
- Uses real faction data (Space Marines) loaded from regenerated v2 files

### Deleted

#### `app/src/logic/choice-parser.ts`
- Dead code — all text parsing functions (`parseUpToCount`, `parseNoDuplicates`, `matchWeaponName`, `cleanChoiceLabel`) no longer needed with structured v2 data

---

## Key Decisions & Rationale

### 1. Clean Break (No Backward Compatibility)
- V1 (Wahapedia) and v2 (BattleScribe) are completely different data pipelines
- Maintaining both would double the complexity of `wargear-slots.ts` and `unit-config.ts`
- Once BattleScribe converter is validated, the old scraper is retired

### 2. Highest Toughness Rule
- Per the official Rules Commentary: a unit's Toughness is the **highest T among all models** (for non-attached units)
- Implemented as `Math.max(...datasheet.models.map(m => parseInt(m.stats.T)))`
- Sv/W from first model (per-model allocation not yet modelled by the engine)

### 3. Weapons at Datasheet Level
- The v2 monolithic file has a faction-level weapon registry AND per-datasheet weapon maps
- `split_factions.py` drops the faction-level registry; per-datasheet maps are self-contained
- Avoids needing a global weapon lookup context

### 4. Direct ID Lookup Replaces Fuzzy Matching
- V1 used equipment name strings → fuzzy matched against weapon name strings (exact, plural, multi-profile fallbacks)
- V2 uses weapon IDs → direct `datasheet.weapons[id]` lookup
- Eliminates an entire class of matching bugs

---

## Verification

- `npm run build` — passes (TypeScript check + Vite production build)
- `split_factions.py` — 2,124 datasheets across 24 factions, 4,327 KB total
- Faction data regenerated and in place (symlinked `factions/` → `app/public/data/factions/`)

---

## Known Limitations / Next Steps

### Functional Testing Needed
- Dev server testing with multiple factions (select units, configure wargear, run simulations)
- Verify wargear selection groups work correctly in the UI (Battle Sisters Squad, Intercessor Squad)
- Verify ranged/melee mode switching with v2 data

### Empty WeaponIds in Selections
- Some v2 selectionGroups have selections with `weaponIds: []` (e.g. "Heavy Weapons" in Battle Sisters)
- These render as options but selecting them adds no weapons — may need UI indication or filtering

### Models with min: 0
- V2 data has optional model slots (e.g. "Battle Sister w/ Special Weapon" with min: 0, max: 1)
- `buildDefaultModels` creates groups with count 0 for these
- UI should allow toggling these optional models on/off — needs verification

### Rules Data Still from Wahapedia
- Stratagems, enhancements, detachments still come from `all_rules.json` (Wahapedia scraper)
- BattleScribe data does not include rules — hybrid pipeline remains

### Per-Model Stats Display
- `UnitInfoCard` shows first model's stat line
- Stretch goal: show multiple stat lines when models have differing stats (e.g. Aestred Thurga + Agathae Dolan)

---

## Context for Future Sessions

### Architecture After Migration
```
BattleScribe XML → Python converter → all_datasheets.json (v2 schema)
                                        ↓
                                    split_factions.py
                                        ↓
                                    factions/ (per-faction JSON, symlinked to app/public/)
                                        ↓
                                    React app loads via fetchFactionData()
```

### V2 Schema Key Differences from V1
| Aspect | V1 | V2 |
|--------|----|----|
| Weapons | `RawWeapon[]` flat array | `Record<string, RawWeapon>` registry |
| Stats | Unit-level `stats` | Per-model `stats` in `models[]` |
| Wargear | `wargear_options[]` with text parsing | `selectionGroups[]` per model (structured tree) |
| Abilities | `damaged: string`, regex FNP | `damaged: {threshold, description}`, `feelNoPain: number` |
| Naming | snake_case | camelCase |

### Key Files
- `app/src/types/data.ts` — V2 type definitions
- `app/src/logic/wargear-slots.ts` — Wargear slot system (most complex logic)
- `app/src/logic/unit-config.ts` — Simulation profile builder
- `split_factions.py` — Data pipeline splitter
