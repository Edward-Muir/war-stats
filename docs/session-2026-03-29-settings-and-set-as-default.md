# Session: Settings Overhaul & "Set as Default" Button

**Date:** 2026-03-29

## Overview

Redesigned the Defaults system into a streamlined Settings screen and added a "Set as Default" button in the burger menu. The user wanted to be able to default the full unit/detachment configuration without rebuilding all pickers in the defaults screen. The solution: a single "Set as Default" menu action that snapshots the current config, plus renaming "Defaults" to "Settings" and replacing iteration preset buttons with a continuous slider (10K–1M).

## Files Modified

### `app/src/utils/local-storage.ts`
- Expanded `StoredDefaults` interface with 4 new fields: `attackerUnitName`, `attackerDetachmentName`, `defenderUnitName`, `defenderDetachmentName` (all `string | null`)
- Updated `BUILTIN_DEFAULTS` with `null` for each new field
- Old localStorage data without these fields remains backward-compatible via `?? null`

### `app/src/store/slices/defaults.ts`
- Added `setCurrentAsDefaults()` action to the `DefaultsSlice` interface
- Implementation reads current attacker/defender state (faction, chapter, unit, detachment, game state) and snapshots it into `StoredDefaults`, then persists to localStorage

### `app/src/store/slices/simulation.ts`
- Changed `buildSimulationInput` to read iterations from `state.defaults.simulationIterations` instead of duplicate `state.simulation.iterations`
- Removed unused `simulation` destructuring
- Updated `initAutoRun` subscriber to also watch `state.defaults.simulationIterations` changes, triggering re-simulation when iterations change in Settings

### `app/src/components/layout/BurgerMenu.tsx`
- Renamed prop `onOpenDefaults` to `onOpenSettings`
- Added new `onSetAsDefault` callback prop
- Changed menu label from "Defaults" to "Settings" with `SlidersHorizontal` icon
- Added "Set as Default" menu item with `Save` icon, separated by a divider
- Brief checkmark confirmation animation (1.5s) after clicking "Set as Default"

### `app/src/components/layout/AppShell.tsx`
- Renamed `defaultsOpen` state to `settingsOpen`
- Replaced `DefaultsOverlay` import with `SettingsOverlay`
- Added selectors for `defaults`, `setAttackerDetachment`, `setDefenderDetachment`, `setCurrentAsDefaults`
- Updated startup effects to load default unit names from stored defaults (with fallback to "Intercessor Squad" and validation that the unit exists in faction data)
- Added new effects for auto-setting detachment from stored defaults on startup
- Wired `onSetAsDefault` prop to burger menu

## Files Created

### `app/src/components/overlays/SettingsOverlay.tsx`
- Renamed from `DefaultsOverlay`, component renamed to `SettingsOverlay` / `SettingsForm`
- Overlay title changed from "Defaults" to "Settings"
- Replaced iteration preset buttons (`ITERATION_PRESETS = [1000, 5000, 10000, 50000]`) with a styled `<input type="range">` slider:
  - Range: 10,000 – 1,000,000
  - Step: 10,000
  - Formatted value label showing current count with locale formatting
  - Min/max labels ("10K" / "1M")
  - Custom thumb styling via webkit/moz pseudo-element CSS
- Added `clampIterations()` to handle old stored values below the new 10K minimum
- Retained existing faction pickers and game state toggle sections

## Files Deleted

### `app/src/components/overlays/DefaultsOverlay.tsx`
- Replaced by `SettingsOverlay.tsx`

## Key Decisions

1. **"Set as Default" vs. full config in settings**: Rather than duplicating all the unit/detachment/wargear pickers in the settings screen, a single "Set as Default" button in the burger menu snapshots the current state. Much less code, same result.

2. **No wargear config in defaults**: Unit configuration (wargear slot selections, firing config) is not saved in defaults — too fragile across data updates. Units load with default wargear. Can be added later.

3. **Native range input over shadcn Slider**: No slider component existed in the UI library. Used a styled native `<input type="range">` with Tailwind CSS rather than adding a new dependency.

4. **Iteration range change**: Minimum increased from 1,000 to 10,000, maximum from 50,000 to 1,000,000. Old stored values below 10K are clamped up.

5. **Iterations read from defaults slice**: Removed duplicate `iterations` state from the simulation slice. `buildSimulationInput` now reads directly from `state.defaults.simulationIterations`, avoiding state sync issues.

## Verification

- `npm run build` — TypeScript + Vite build passes
- `npm run test` — All 179 tests pass
- `npm run lint` — No new lint errors in modified files

## Unfinished Work / Next Steps

- **Wargear default restoration**: If desired, saved slot selections and firing configs could be restored on startup, but requires careful handling of data changes (renamed weapons, etc.)
- **Manual testing needed**: Open app, configure full attacker/defender, click "Set as Default" in menu, refresh — verify config persists. Test the iteration slider UX on mobile.
- **Defender detachment**: The defender detachment default is wired up but the defender side may not have a detachment picker in the main UI yet (detachments are primarily an attacker concept for stratagems).
