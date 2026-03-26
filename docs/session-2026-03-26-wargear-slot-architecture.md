# Session Summary: Wargear Slot Architecture Rewrite

**Date:** 2026-03-26

## Overview

Complete rewrite of the wargear configuration system. The previous variant-based approach (`model-variants.ts`) treated every wargear choice as a mutually exclusive variant, which broke for units like the Intercessor Sergeant that have two independent wargear options (replace bolt rifle + replace close combat weapon). The new "wargear slot" architecture groups options into independent slots based on what they replace, enabling correct combination of independent choices.

## Problem

The Intercessor Sergeant has:
- Option 0: Replace `bolt rifle` → [chainsword, hand flamer, plasma pistol, power weapon]
- Option 1: Replace `close combat weapon` → [chainsword, power fist, power weapon, thunder hammer]

These replace **different** equipment items and should be combinable (e.g., hand flamer + power fist). The old system generated 8+ mutually exclusive variants, making it impossible to select from both options simultaneously.

## Architecture

### Core Concept: Wargear Slots

Options are grouped into **slots** based on `(definitionName, replaces_key, scope)`:
- Same replaces + same scope → merge into one slot (exclusive choices)
- Different replaces → separate slots (independent)
- Different scopes → separate slots even for same replaces

### Three Slot Scopes

| Scope | UI Control | Example |
|-------|-----------|---------|
| `single_model` | Dropdown per model | Sergeant weapon swaps (fixed-count-1 definitions) |
| `all_or_nothing` | Toggle/radio for entire unit | Aggressor flamestorm↔boltstorm |
| `variable_count` | Count redistribution steppers | Hearthkyn heavy weapons ("up to 2 can replace...") |

### Equipment Derivation

Equipment is always derived from scratch: `defaultEquipment + apply all active slot selections`. No surgical apply/revert — this avoids the duplicate-weapon-name pitfall (e.g., "Astartes chainsword" appearing in both Intercessor Sergeant options).

### Simulation Pipeline Unchanged

The `SelectedWeapon[]` boundary between the config layer and the simulation engine is stable. `deriveSelectedWeapons()` aggregates across all model groups, filters by attack mode, and produces the same type the engine has always consumed.

## Files Created

| File | Description |
|------|-------------|
| `app/src/logic/choice-parser.ts` | Parses "up to N", "duplicates are not allowed", weapon name matching from raw wargear text |
| `app/src/logic/wargear-slots.ts` | Core logic: `buildWargearSlots`, `computeEquipment`, `buildDefaultModels`, `applySlotSelection`, `setVariableCount`, `deriveSelectedWeapons`, `getGroupWeapons`, `buildDefaultFiringConfig` |
| `app/src/__tests__/wargear-slots.test.ts` | 10 test cases using real datasheet JSON (Intercessors, Aggressors, Hearthkyn Warriors) |

## Files Rewritten

| File | Change |
|------|--------|
| `app/src/types/config.ts` | New types: `WargearSlot`, `WargearSlotOption`, `SlotScope`, `SlotSelection`, `ConfiguredModel` (with `groupId`, `slotSelections` instead of `variantId`, `equipment`), `WeaponFiringConfig`. Removed old `WargearChoice`, `ModelWeaponSelection`, `ConfiguredUnit`. |
| `app/src/store/slices/attacker.ts` | New state: `slots`, `firingConfig`. New actions: `selectSlotOption`, `setVariableSlotCount`, `setDefinitionCount`, `setWeaponFiringCount`. All actions recompute `selectedWeapons` via `deriveSelectedWeapons`. |
| `app/src/store/slices/defender.ts` | Uses `buildWargearSlots` + `buildDefaultModels` from new module. Removed `wargearChoices`. |
| `app/src/store/slices/simulation.ts` | Updated `getTotalModels` import from `wargear-slots`. |
| `app/src/logic/unit-config.ts` | Stripped to only `resolveWeaponGroups` and `buildDefenderProfile` (simulation boundary). Removed `getAvailableWeapons`, `isWargearCustomized`. |
| `app/src/logic/index.ts` | Updated barrel exports for new module. |
| `app/src/components/unit-config/ModelGroup.tsx` | Rewritten: shows per-option `<select>` dropdowns for `single_model` slots, weapons via `getGroupWeapons`. |
| `app/src/components/unit-config/UnitConfigurator.tsx` | Rewritten: passes `slots`, `firingConfig`, slot actions to ModelGroups. |
| `app/src/components/overlays/ConfigOverlay.tsx` | Wires new store actions (`selectSlotOption`, `setVariableSlotCount`, etc.) to UnitConfigurator. |
| `app/tsconfig.app.json` | Excluded `src/__tests__` from app tsconfig (tests use node modules that aren't available in browser tsconfig). |

## Files Deleted

| File | Reason |
|------|--------|
| `app/src/logic/model-variants.ts` | Replaced by `wargear-slots.ts` |
| `app/src/logic/wargear.ts` | Functions replaced by `wargear-slots.ts` and `computeEquipment` |
| `app/src/components/unit-config/WargearConfigurator.tsx` | Replaced by slot dropdowns in ModelGroup |
| `app/src/components/unit-config/ModelCountSelector.tsx` | Already unused, replaced by CountStepper |
| `app/src/components/unit-config/WeaponSelector.tsx` | Already unused, replaced by WeaponRow |
| `app/src/__tests__/model-variants.test.ts` | Old variant tests, replaced by wargear-slots tests |
| `app/src/__tests__/wargear.test.ts` | Old wargear apply/revert tests, replaced by wargear-slots tests |

## Key Decisions

1. **Slot grouping by `(replaces_key, scope)`** — Options replacing the same item with the same scope merge into one exclusive slot. Different replaces or different scopes produce independent slots. This correctly handles the Hearthkyn Theyn (named_model bolter replace is independent from all_models bolter replace).

2. **Equipment derived, not stored** — `ConfiguredModel` no longer has an `equipment` field. Equipment is computed on-demand via `computeEquipment(definition, slotSelections, slots, datasheet)`. This eliminates stale state and the duplicate-name pitfall.

3. **Compound choices split on " and "** — Choice strings like "auto boltstorm gauntlets and 1 fragstorm grenade launcher" are split into individual equipment items by `splitCompoundChoice()`.

4. **Breaking change accepted** — Since the project is early, the entire `ConfiguredModel` shape changed. Old variant-based fields (`variantId`, `variantLabel`, `equipment`, `isBase` for variant models) replaced with slot-based fields (`groupId`, `slotSelections`).

## Test Cases (10 passing)

| # | Unit | What's tested |
|---|------|--------------|
| 1 | Intercessor Sergeant | 2 independent single_model slots created |
| 2 | Intercessor Sergeant | Select from both slots simultaneously (hand flamer + power fist) |
| 3 | Intercessor Sergeant | Duplicate weapon names ("Astartes chainsword") in both slots |
| 4 | Aggressor Squad | all_or_nothing slot created, compound choice parsed |
| 5 | Aggressor Squad | Equipment swap applies to all models |
| 6 | Hearthkyn Warriors | variable_count slots for heavy weapons |
| 7 | Hearthkyn Theyn | named_model single_model slot with pistol option |
| 8 | Equipment derivation | computeEquipment with one selection |
| 9 | Weapon derivation | deriveSelectedWeapons after wargear change, correct firing counts |
| 10 | Empty options | Placeholder options with empty choices produce no slots |

## Data Survey Findings

Analysis of all 25 factions (1,693 units, 2,441 wargear options):
- `this_model` scope: 66%, `all_models`: 11%, `named_model`: 10%, `specific_count`: 9%, `per_n_models`: 4%
- Only 26 truly empty placeholder options (not 878 as initially estimated)
- Independence rule confirmed: options replacing different items are always independent

## Unfinished Work / Next Steps

- **`all_or_nothing` and `variable_count` UI controls** — `SlotToggle` and `SlotVariableGroup` components were planned but not yet created. Currently only `single_model` slots render dropdowns in ModelGroup. The other scopes need dedicated UI controls.
- **Grenade launcher (per_n_models add type)** — The slot is created but there's no UI to enable/disable "add" type slots. Need a checkbox control.
- **Variable count group creation from UI** — `applySlotSelection` for `variable_count` creates variant groups, but the UI doesn't yet provide controls to add/configure these groups.
- **CSS for slot controls** — `.slot-dropdown-row`, `.slot-label`, `.slot-select` classes need styling in App.css.
- **Manual testing** — Build passes and all tests pass, but the new wargear UI needs manual testing in the browser.
- **`closestTarget` not wired to engine** — Carried over from previous sessions.

## Context for Future Sessions

The wargear system now has a clean separation:
1. **`buildWargearSlots(datasheet)`** — builds the slot structure (computed once on unit selection, stored in `attacker.slots`)
2. **`applySlotSelection(models, slots, datasheet, slotId, optionKey)`** — applies a user choice, returns updated models
3. **`computeEquipment(definition, slotSelections, slots, datasheet)`** — derives equipment from defaults + selections
4. **`deriveSelectedWeapons(models, firingConfig, slots, datasheet, attackMode)`** — aggregates into `SelectedWeapon[]` for simulation

The `slotId` format is `"DefinitionName::replaces_key::scope"`. The `optionKey` format is `"optionIndex:choiceIndex"` tracing back to the original datasheet wargear_options array.

Equipment is **never stored** on ConfiguredModel — it's always derived. This is the key architectural change from the previous session's variant approach.
