# Session Summary: Model Pools, Engagement Range, and Profile Weapons

**Date:** 2026-03-28

## Overview

Fixed several bugs in the unit configuration system and replaced the pistol toggle UI with an Engagement Range game state chip. The main achievement was implementing **model pools** — a system that detects when model definitions share a count space (e.g., Intercessor + Intercessor w/ Grenade Launcher) and automatically redistributes counts between them, matching BattleScribe's behavior.

## What Was Accomplished

### 1. Model Pools — Shared Count Space for Related Model Definitions

**Problem:** The Intercessor Squad has 3 model definitions in the BattleScribe data: Sergeant (min:1, max:1), Intercessor (min:4, max:9), and Intercessor w/ Grenade Launcher (min:0, max:2). The app treated each independently — adding a GL model added to the total instead of redistributing from the Intercessor pool. Users couldn't represent "1 Sgt + 3 Intercessors + 1 GL = 5 total" because the Intercessor min=4 prevented reducing below 4.

**Solution:** Added a `ModelPool` detection system in `wargear-slots.ts`:
- **Detection heuristic:** Groups model definitions by identical stats (M/T/Sv/W/Ld/OC). If a stat group has exactly one def with `min > 0` (base) and one or more with `min = 0` (variants), they form a pool.
- **Pool redistribution:** Setting a variant's count subtracts from the base model (pool total stays the same). Setting the base count adjusts only the base (variants unchanged).
- Validated across all 24 factions: 63 pools detected, all correct. Edge cases (multi-base like Custodian Guard, all-optional like Deathwatch Veterans) correctly excluded.

### 2. Engagement Range Game State Chip

**Problem:** The UI had a "Pistols only / Other ranged weapons" toggle bar that was unnecessarily complex.

**Solution:** Replaced with a single "Engagement Range" GameChip:
- Added `engagementRange: boolean` to `AttackerGameState`
- When toggled on, non-Monster/Vehicle units are restricted to pistol weapons only
- `pistolMode` is now derived from `engagementRange` + unit keywords in the store
- Removed the old toggle UI, `hasPistolRestriction` prop chain, and AppShell memo

### 3. Firing Count Auto-Increment

**Problem:** When adding models to a group (e.g., Intercessor 4→5), weapon firing counts stayed at the old value.

**Solution:** Added `updateFiringConfigForNewCounts()` helper that auto-scales firing counts when `firingModelCount === oldGroupCount` (meaning "all models fire"). When a group activates from 0→N, its firing config is rebuilt from scratch via `buildDefaultFiringConfig` to respect profile weapon defaults.

### 4. Multi-Profile Weapon Mutual Exclusion

**Problem:** Profile weapons (e.g., "➤ Astartes grenade launcher - krak" and "- frag") both defaulted to full firing count. In 40K, you pick ONE profile per weapon.

**Solution:**
- `buildDefaultFiringConfig` now detects profile weapons (name starts with "➤") and only fires the first profile by default; others default to 0
- `setWeaponFiringCount` enforces mutual exclusion: activating one profile deselects siblings with the same base name
- Added `getProfileBaseName()` utility that extracts the shared base from "➤ Base Name - profile"
- Affects 398+ profile weapons across Space Marines alone

## Files Modified

| File | Change |
|------|--------|
| `app/src/logic/wargear-slots.ts` | Added `ModelPool`, `buildModelPools()`, `getProfileBaseName()`. Made `setDefinitionTotal()` pool-aware with `setPoolVariantCount()` and `setPoolTotal()`. Updated `buildDefaultFiringConfig()` for profile weapon defaults. |
| `app/src/store/slices/attacker.ts` | Added `updateFiringConfigForNewCounts()` helper with profile-aware rebuild for 0→N groups. Added `getProfileBaseName` import for profile mutual exclusion in `setWeaponFiringCount`. Derived `pistolMode` from `engagementRange` in `setAttackerUnit` and `setAttackerGameState`. |
| `app/src/types/config.ts` | Added `engagementRange: boolean` to `AttackerGameState` and default state. |
| `app/src/components/game-state/GameState.tsx` | Removed pistol toggle UI. Added "Engagement Range" GameChip. Removed `hasPistolRestriction` prop. |
| `app/src/components/layout/AppShell.tsx` | Removed `attackerHasPistolRestriction` memo and `hasPistolRestriction` import/prop. |
| `app/src/components/unit-config/UnitConfigurator.tsx` | Pool-aware `displayCount`, `maxCount`, `minCount` computation. Pool base shows base count (not pool total). |
| `app/src/components/unit-config/ModelGroup.tsx` | Added `displayCount` and `minCount` props for stepper display. |
| `app/src/__tests__/complex-datasheets.test.ts` | Added "Model Pools" test suite (7 tests): pool detection for Intercessor/Terminator/Deathwatch/Crusader, redistribution scenarios. Updated 3 existing tests for profile weapon defaults. |

## Key Decisions & Rationale

1. **Stats-based pool detection over explicit metadata:** Pools are detected by matching model stat lines rather than requiring explicit pool IDs in the data. Validated against all 1,600+ datasheets — the heuristic correctly classifies every unit. This avoids changing the data format or converter.

2. **Base count display (not pool total):** The pool base model's stepper shows its own count (e.g., "3" for 3 base Intercessors) rather than the pool total (4). This matches user expectations — they see how many of each model type they have.

3. **Profile weapon first-only default:** Only the first profile fires by default. This matches the 40K rule that you pick one profile per shooting. The user can switch profiles via the weapon row UI.

4. **Rebuild on 0→N activation:** When a model group goes from count 0 to N, its firing config is fully rebuilt rather than scaled, ensuring profile weapon defaults are respected.

## Unfinished Work / Next Steps

- **Total unit size constraint:** For free-composition squads (like Terminators where all models have min=0), there's no enforced total unit size constraint. Users can theoretically add more models than the squad allows. The pool system only handles the base+variant pattern.
- **Profile weapon UI polish:** The weapon rows truncate long profile names ("➤ Astartes gre..."). Consider showing the profile suffix only (e.g., "krak" / "frag") when inside a collapsible profile group.
- **Per-N constraints at pool level:** The "for every 5 models, 1 can take grenade launcher" rule isn't enforced at the pool level. The GL model has max=2 in the data, but the per-5-models ratio isn't validated. Users must self-enforce.

## Context for Future Sessions

- The `buildModelPools()` function in `wargear-slots.ts` is the core detection logic — grep for `ModelPool` to find all pool-related code.
- The `getProfileBaseName()` function parses weapon names with "➤" prefix and " - " separator to extract profile groups.
- The `updateFiringConfigForNewCounts()` in `attacker.ts` has special handling for groups going from 0→N — it rebuilds from scratch instead of scaling.
- The pistol restriction logic (`pistol-restrictions.ts`) still exists but `hasPistolRestriction` is no longer imported anywhere. `filterWeaponsByPistolMode` is still used by `wargear-slots.ts`. `getAvailablePistolModes` is unused.
