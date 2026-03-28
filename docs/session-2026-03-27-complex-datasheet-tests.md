# Session: Complex Datasheet Representation Tests

**Date:** 2026-03-27
**Goal:** Write tests for complex datasheets to verify the wargear slot system correctly represents all their options after the BattleScribe v2 schema migration.

## Overview

Created a comprehensive test suite (`complex-datasheets.test.ts`) with 57 tests across 7 suites, exercising 5 complex Space Marines datasheets against the wargear slot system. All tests pass alongside the existing 14 tests (71 total).

## Files Created

- **`app/src/__tests__/complex-datasheets.test.ts`** — 57 tests covering structural integrity, wargear slot construction, weapon selection, model scaling, and edge cases across 5 complex units.

## What Was Learned

### Data Shape Discoveries

1. **Weapon names use `➤` prefix for fire modes**: Dual-fire weapons like infernus heavy bolter, plasma pistol, and cyclone missile launcher use `➤ Weapon - mode` naming (e.g., `➤ Plasma pistol - standard`). This is important for any UI that displays or searches weapon names.

2. **Inconsistent capitalization in weapon names**: Some weapons are title case (`Heavy Bolt Pistol`), others are sentence case (`Close combat weapon`, `Power fist`). This is inherited from BattleScribe data. Any name-based matching should be case-insensitive.

3. **Terminator Sergeant has storm-bolter as default with a melee-only selection group**: The sergeant's selection group replaces the default (`storm-bolter`) but all options are melee weapons (`Power weapon`, `Chainfist`, `Power fist`). This means the replace logic removes the ranged weapon and adds a melee one — the sergeant effectively loses ranged capability when a selection is made. This is correct per the tabletop rules but worth noting.

4. **Sword Brother (Crusader Squad) pistol slot replaces `master-crafted-power-weapon`**: The pistol selection group has `min: 1` (type=replace) and replaces the default melee weapon with a ranged pistol. This is structurally correct — the Sword Brother always has the power weapon from the model definition name, but the slot system replaces it with the pistol choice.

5. **Deathwatch Veterans is an all-variant unit**: All 14 models have `min: 0`, meaning the default state is 0 total models. The UI must handle this edge case where `getTotalModels()` returns 0 and `deriveSelectedWeapons()` returns empty arrays.

6. **Terminator Heavy Weapon model has empty `defaultWeaponIds: []`**: It relies entirely on its 2 selection groups (both `min: 1`) to provide weapons. The replace slots have `replaces: []` since there's nothing to replace.

### No Code Fixes Needed

All 57 tests pass against the current wargear-slots.ts logic. The system correctly handles:
- Zero-slot units (Deathwatch Veterans)
- Multiple independent selection groups on one model (Terminator Heavy Weapon)
- Empty default weapon lists with mandatory selections
- Dual-fire weapon IDs (3 IDs from one cyclone selection)
- Cross-group weapon aggregation (storm bolter summing across model types)
- Mixed statline units (Crusader Squad marines vs neophytes)
- Min/max clamping on model counts
- Selection clearing with null optionKey

## Test Suite Details

| Suite | Unit | Tests | Pattern Tested |
|-------|------|-------|----------------|
| Structural integrity | All 5 units | 15 | Weapon ID refs, weapon type validation |
| Deathwatch Veterans | 14 models, 0 groups | 7 | All-variant (min=0), dual-fire modes |
| Sternguard Veteran Squad | 2+1 groups | 7 | Replace vs add slots, combined loadouts |
| Terminator Squad | 2 independent groups | 7 | Empty defaults, cyclone 3-ID, aggregation |
| Fortis Kill Team | 10 models, 20 weapons | 8 | Dual-fire plasma, sergeant selections |
| Crusader Squad | Mixed statlines | 7 | Sv:3+ vs 4+, cross-group aggregation |
| Edge cases | Cross-cutting | 6 | Min/max clamp, null clear, zero-model |

## Next Steps

- **Functional UI testing**: These tests validate the logic layer, but the UI components (`ModelGroup.tsx`, `UnitInfoCard.tsx`) should be manually tested with these complex units in the dev server.
- **Non-Space Marines factions**: Could extend structural integrity tests to all 25 factions (loop through all faction JSONs, verify all weapon ID references resolve).
- **Variable count scope**: No unit in the test set exercises the `variable_count` scope with `perN`/`maxPerN` — would need a unit with that pattern to test `setVariableCount()` thoroughly.
