# Session Summary: Picker UX Fixes & Defaults

**Date:** 2026-03-26

## Overview

Fixed several UX issues with the two-stage unit/faction picker overlays and added sensible defaults for new users. Four distinct fixes were made: missing CSS for the selected-state button, removing the unnecessary "Change" intermediary screen, replacing slow slide-in animations with snappy scale-pop transitions, and defaulting both attacker and defender to Space Marines / Intercessor Squad.

## Changes Made

### 1. Missing CSS for Selected Unit Button

**Problem:** "Hearthkyn WarriorsChange" — the unit name and "Change" hint were concatenated because `.faction-selected-btn` and `.faction-change-hint` CSS classes were referenced in JSX but never defined.

| File | Change |
|------|--------|
| `app/src/App.css` | Added `.faction-selected-btn` (flexbox with `justify-content: space-between`) and `.faction-change-hint` (small muted text) styles after the `.faction-back-btn` block |

### 2. Removed "Selected + Change" Intermediary Screen

**Problem:** When opening the unit overlay with a unit already selected, users saw a "Unit Name | Change" button and had to click it before browsing. Since the overlay's purpose is to change the unit, this extra step was unnecessary.

| File | Change |
|------|--------|
| `app/src/components/faction/UnitPicker.tsx` | Removed the entire selected-state view (`if (value && !isBrowsing)` block), the `isBrowsing` state, and the `value`/`onClear` props. Picker now always shows category browser. |
| `app/src/components/overlays/UnitOverlay.tsx` | Removed `value` and `onClear` props passed to UnitPicker. Removed unused `unitName` store selector. |

### 3. Snappy Overlay Animations

**Problem:** Overlays slid in from the bottom using a slow spring animation (`damping: 30, stiffness: 300`), feeling sluggish.

| File | Change |
|------|--------|
| `app/src/components/layout/Overlay.tsx` | Replaced slide-in (`y: '100%'` → `y: 0` spring) with scale-pop (`scale: 0.96, opacity: 0` → `scale: 1, opacity: 1`) using "snap" exponential easing `[0.16, 1, 0.3, 1]` at 150ms. Backdrop fade reduced to 100ms. |

**Rationale:** Used the game-feel skill's animation guide. Scale-pop feels like the panel "appears" rather than slides. The snap easing curve (`cubic-bezier(0.16, 1, 0.3, 1)`) is sharp and impactful — recommended for UI transitions that should feel instant.

### 4. Default to Space Marines / Intercessor Squad

**Problem:** App started with no faction or unit selected, requiring multiple taps before users could do anything.

| File | Change |
|------|--------|
| `app/src/store/slices/attacker.ts` | Changed `initialAttacker.factionSlug` from `null` to `'space-marines'` |
| `app/src/store/slices/defender.ts` | Changed `initialDefender.factionSlug` from `null` to `'space-marines'` |
| `app/src/components/layout/AppShell.tsx` | Added `useFactionData()` calls for both faction slugs to trigger data loading on startup. Added `useEffect` hooks that call `setAttackerUnit('Intercessor Squad')` / `setDefenderUnit('Intercessor Squad')` once faction data loads and unit is still null. |

**Key decision:** Can't just set `unitName` in initial state because `setAttackerUnit`/`setDefenderUnit` need loaded faction data to resolve datasheets and build model variants + weapon selections. The effect-based approach ensures the full unit setup flow runs correctly.

## Key Decisions

1. **Removed selected-state view entirely from UnitPicker** rather than fixing the click handler — the overlay's purpose is to change units, so showing a "you selected X" screen first is redundant.

2. **Scale-pop over slide-in** — per game-feel best practices, scale transitions feel more immediate than positional slides for modal/overlay patterns.

3. **Effect-based default unit setup** — ensures `buildAllVariants()`, `buildInitialWeaponSelections()`, and `deriveSelectedWeapons()` all run correctly, producing proper model and weapon state.

## Unfinished Work / Next Steps

- The `.faction-selected-btn` and `.faction-change-hint` CSS classes are now unused since the selected-state view was removed from UnitPicker. They could be cleaned up, or kept if the pattern is needed elsewhere.
- The FactionPicker doesn't have a selected-state view at all (no `value` prop) — consistent with the "overlay = change mode" pattern.
- Default unit only works if "Intercessor Squad" exists in the Space Marines datasheet. If the data changes, the effect silently does nothing (unit stays null).

## Context for Future Sessions

The overlay system uses framer-motion `AnimatePresence` with conditional rendering — components unmount when the overlay closes, so local state resets between opens. The `useFactionData` hook in AppShell now serves double duty: loading data for stratagem resolution AND ensuring default faction data is available on startup.
