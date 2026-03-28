# Session: Fix Game State Toggle Relevance Filtering

**Date:** 2026-03-28

## Overview

Fixed game state toggles showing when they have zero effect on simulation output. Previously, "Stealth" appeared as a free toggle for all ranged attacks (even when the defender has no Stealth ability), and "Closest Unit" appeared unconditionally (even when no stratagem conditions on it). Also fixed a pre-existing nested `<button>` HTML violation in the weapon config UI.

## Files Modified

| File | Change |
|------|--------|
| `app/src/logic/game-state-relevance.ts` | Added `anyStratagemHasCondition()` generic helper; added `availableDefenderStratagems` parameter; fixed `closestTarget` to only show when a stratagem conditions on it; fixed `stealthAll` to only show when defender has Stealth natively (locked); made `remainedStationary` stratagem-aware |
| `app/src/components/layout/AppShell.tsx` | Updated `useGameStateRelevance` hook to accept and pass through `defenderStratagems` |
| `app/src/components/unit-config/WeaponRow.tsx` | Fixed nested `<button>` HTML violation by rendering `CollapsibleTrigger` as `<div role="button">` via Base UI's `render` prop |

## Key Decisions

### 1. `closestTarget` gated by stratagem conditions
The "Closest Unit" toggle is only consumed by stratagem conditions (e.g., "ONSLAUGHT OF FIRE" +1 hit if closest, "CRUCIBLE OF BATTLE" +1 wound if closest). Now scans both attacker and defender available stratagems for any conditional with `condition.type === 'closestTarget'`. If none found, toggle is hidden.

### 2. `stealthAll` restricted to inherent ability only
Changed from `isRanged ? (defenderHasStealth ? 'locked' : true) : false` to `isRanged && defenderHasStealth ? 'locked' : false`. The Stealth toggle no longer appears as a free manual toggle. It only shows (locked) when the defender unit has Stealth as a core ability. Defender stratagems that grant -1 to hit use `hitModifier` in the stratagem effect system, not the `stealthAll` game state, so there's no loss of functionality.

### 3. `remainedStationary` now stratagem-aware
Extended to also show when a stratagem conditions on `remainedStationary` (e.g., "BATTLE DRILL RECALL" has a conditional that checks stationary state for crit 5+), not just when a weapon has the HEAVY keyword.

### 4. Generic `anyStratagemHasCondition` helper
Rather than writing narrow helpers per condition type (like the existing `anyStratagemGrantsLance`), added a generic function that checks if any stratagem has a conditional gating on a given `ConditionType`. This is reusable for future condition-based relevance checks.

### 5. WeaponRow nested button fix
The `CollapsibleTrigger` rendered a `<button>` containing `CountStepper` (which also has `<button>` elements). Used Base UI's `render` prop to render the trigger as `<div role="button" tabIndex={0}>` instead, preserving accessibility while fixing the HTML violation.

## Unfinished Work / Next Steps

1. **Cover relevance refinement**: Could hide `benefitOfCover` when ALL selected weapons have IGNORES COVER (user didn't complain, left as future improvement)
2. **TORRENT + HEAVY interaction**: When all HEAVY weapons are also TORRENT (auto-hit), the Stationary toggle is moot since +1 hit doesn't apply to auto-hits (edge case optimization)
3. **Stratagem-granted stealth**: If a future mechanism grants Stealth via game state (not hitModifier), the relevance function would need to scan defender stratagems for it

## Context for Future Sessions

- `anyStratagemHasCondition()` in `game-state-relevance.ts` is the generic pattern for condition-based relevance checks
- `anyStratagemGrantsLance()` remains separate because it checks modifier *properties* (not conditions) — different intent
- The `computeGameStateRelevance` function now takes both attacker and defender stratagems
- `ConditionType` is exported from `logic/stratagem-effects.ts` and covers: `remainedStationary`, `charged`, `advanced`, `closestTarget`, `targetInHalfRange`, `weaponHasKeyword`, `belowHalfStrength`, `battleShocked`
