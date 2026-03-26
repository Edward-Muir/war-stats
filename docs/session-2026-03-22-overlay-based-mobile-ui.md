# Session Summary: Overlay-Based Mobile UI

**Date:** 2026-03-22

## Overview

Replaced the collapsible `<details>` panel layout and 3-column desktop grid with a single mobile-first UI using overlay panels. The main screen shows compact Faction/Unit/Cog buttons for attacker and defender, inline game state chips, and a tappable stats preview. All configuration happens in slide-up overlays powered by framer-motion, keeping the user visually connected to their session.

## Files Modified

### New Components

| File | Purpose |
|------|---------|
| `app/src/components/layout/Overlay.tsx` | Reusable slide-up overlay component with backdrop, close button, ESC key dismissal, and framer-motion spring animation. Pattern adapted from Timeline/When app's SettingsPopup/Menu components. |
| `app/src/components/overlays/FactionOverlay.tsx` | Wraps `FactionPicker` in an overlay. Parameterized by `side` (attacker/defender). |
| `app/src/components/overlays/UnitOverlay.tsx` | Wraps `UnitPicker` in an overlay. Auto-closes on unit selection. |
| `app/src/components/overlays/ConfigOverlay.tsx` | Wraps `DetachmentPicker` + `UnitConfigurator` (weapons, wargear, models) + `StratagemPicker` in an overlay. The "cog" button's destination. |
| `app/src/components/overlays/StatsOverlay.tsx` | Full `ResultsSummary` + both `ResultsChart` components in an overlay. Opened by tapping the stats preview on the main screen. |

### Modified Files

| File | Change |
|------|--------|
| `app/src/components/layout/AppShell.tsx` | Complete rewrite. Removed `AttackerPanel`, `DefenderPanel`, `GameStateSection`, `ResultsPanel` local components and all `<details>`/`<summary>` markup. Now renders a compact main screen with: header (title + Ranged/Melee toggle), attacker row (3 buttons: Faction/Unit/Cog), defender row (same), inline game state chips via `GameState` component, and stats preview section. Seven overlay components rendered at the bottom. All overlay open/close state is local `useState`. |
| `app/src/App.css` | Removed: 3-column desktop grid (`@media min-width: 1024px`), `.app-panels`, `.panel`/`details.panel`/`summary` styles, `.attacker-panel`/`.defender-panel`/`.game-state-panel`/`.results-panel` color-coded headers, all `order` properties, `.game-state-unified` styles. Added: `.overlay-*` styles (backdrop, panel, topbar, close, content), `.main-content`/`.main-section`, `.nav-row`/`.nav-btn`/`.nav-btn--cog`, `.stats-preview`/`.stats-headline`, `.section-label` with color variants, `.chip-row` (horizontal scroll, no wrap, hidden scrollbar). App shell now has `max-width: 600px; margin: 0 auto` for all screen sizes. Attack mode toggle moved into header row (compact). Active color changed from red to green to match wireframe. |
| `app/src/types/config.ts` | Added `closestTarget: boolean` to `DefenderGameState` interface and `DEFAULT_DEFENDER_STATE` (defaults to `true`). |
| `app/src/components/game-state/GameState.tsx` | Merged two `chip-group` divs into a single `chip-row` div. Added "Closest Unit" chip with `chip--defender` class. Shortened "Benefit of Cover" to "Cover". |

### Deleted Files

| File | Reason |
|------|--------|
| `app/src/components/game-state/AttackerState.tsx` | Unused since session 2 (mobile UX overhaul). All game state UI is in `GameState.tsx`. |
| `app/src/components/game-state/DefenderState.tsx` | Same — unused since session 2. |

### Dependencies

| Package | Change |
|---------|--------|
| `framer-motion` | Added. Used for `AnimatePresence` + `motion.div` in `Overlay.tsx` for slide-up/backdrop animations. |

## Key Decisions

1. **Overlays instead of page navigation** — User wanted config panels to pop out over the current page (keeping session context visible), not navigate to separate pages. Adapted the overlay pattern from the Timeline/When app (framer-motion slide-up with backdrop).

2. **Three buttons per row: Faction, Unit, Cog** — Faction and Unit buttons enable quick selection. The Cog button opens advanced configuration (weapons, wargear, models, stratagems) separately, so users don't have to wade through config just to pick a unit.

3. **No router or Zustand UI slice** — All overlay state is local `useState` in AppShell. No URL routing or global view state needed since overlays are simple boolean toggles.

4. **One UI for all screen sizes** — No desktop layout, no media queries for layout changes. The app is mobile-first with `max-width: 600px` centering. The same interaction model everywhere.

5. **Stats preview on main screen** — Shows headline numbers (Damage, Models) and the damage histogram inline. Tapping opens a detailed stats overlay with all charts. This gives at-a-glance results without leaving the main screen.

6. **Attack mode toggle in header** — Moved from a full-width standalone section to compact buttons in the header row (top-right), matching the wireframe. Active color changed to green.

7. **Detachment moved to Config overlay (cog)** — Detachment is rarely changed, so it was moved out of the Faction overlay into the Config overlay, displayed at the top before unit configuration. This keeps faction selection fast and focused.

8. **Horizontally scrollable game state chips** — All game state chips (attacker + defender) merged into a single `.chip-row` that scrolls horizontally. No wrapping, hidden scrollbar. Keeps vertical space minimal on the main screen.

9. **"Closest Unit" toggle added** — New `closestTarget: boolean` field on `DefenderGameState` (defaults to `true`). Important for abilities like Lone Operative and Stealth interactions. Not yet wired into the simulation engine — UI-only flag for now.

## Unfinished Work / Next Steps

- **Visual testing on real mobile device** — Verify overlay animations, touch targets, and scroll behavior at 375px viewport.
- **Overlay scroll position** — When opening an overlay, the main screen scroll position should be preserved. May need `overflow: hidden` on body while overlay is open.
- **Button labels when selected** — Faction/Unit buttons show the selected name with `text-overflow: ellipsis`. May want to show a truncated version or abbreviation for very long names.
- **Wire `closestTarget` into engine** — The flag exists in `DefenderGameState` but the simulation engine doesn't use it yet. Needed for Lone Operative, indirect fire targeting, and other closest-unit-dependent abilities.

## Context for Future Sessions

The app now uses a compact main screen + overlay pattern. All configuration happens in overlays that slide up from the bottom. The existing picker components (`FactionPicker`, `UnitPicker`, `DetachmentPicker`) and config components (`UnitConfigurator`, `WeaponSelector`, `WargearConfigurator`, `StratagemPicker`) are unchanged — they're just rendered inside overlay wrappers now.

The `Overlay` component at `components/layout/Overlay.tsx` is the reusable building block. It takes `isOpen`, `onClose`, `title`, and `children`. It handles backdrop, animation, ESC key, and scroll containment.

There is no desktop-specific layout. The `max-width: 600px` on `.app-shell` keeps content readable on wider screens. If a wider layout is ever wanted, it would be a future addition.

The old `AttackerPanel`/`DefenderPanel`/`GameStateSection`/`ResultsPanel` local components in AppShell are gone. The old `.panel` / `<details>` CSS classes are gone. The `@media (min-width: 1024px)` desktop grid is gone.

`DetachmentPicker` now lives inside `ConfigOverlay` (the cog button), not `FactionOverlay`. Game state chips are a single horizontally scrollable row on the main screen. `DefenderGameState` has a new `closestTarget` boolean (defaults `true`) — UI-only, not yet in the engine.
