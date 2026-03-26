# Session Summary: Progressive Disclosure & Two-Stage Pickers

**Date:** 2026-03-22

## Overview

Three major mobile UX improvements: (1) progressive disclosure for unit configuration sections, (2) two-stage super-faction picker replacing flat dropdown, (3) two-stage unit picker with keyword-based category grouping. All changes follow the "collapse config, show results" pattern validated by UnitCrunch and New Recruit reference apps.

## Research Conducted

- Web research on progressive disclosure, mobile accordion patterns, stepper vs accordion tradeoffs (NN/G, IxDF, LogRocket, Smashing Magazine)
- Analyzed UnitCrunch UI (screenshot): everything collapsed into full-width bars, results always visible below
- Analyzed New Recruit UI (screenshots): collapsible category accordions (Epic Hero, Character, Battleline), model variants with nested weapon checkboxes
- Examined warpair project's `SUPER_FACTIONS` data structure and `FactionPickerModal` two-stage pattern

## Files Modified

### Progressive Disclosure (Unit Configuration)

| File | Change |
|------|--------|
| `app/src/logic/unit-config.ts` | Added `isWargearCustomized()` — compares model equipment against `default_equipment` to drive "customized" badge |
| `app/src/components/unit-config/UnitConfigurator.tsx` | Wrapped all sections in `<details className="config-section">`: Keywords (closed), Models (only if variable, closed), Wargear (only if options exist, closed, shows "customized" badge), Weapons attacker (closed, shows selected count), Weapons defender (closed) |
| `app/src/components/unit-config/ModelCountSelector.tsx` | Removed `<label>Models</label>` — parent `<summary>` provides the label |
| `app/src/components/unit-config/WargearConfigurator.tsx` | Removed `<label>Wargear Options</label>` and `wargear_options.length === 0` empty-state early return — parent handles both |
| `app/src/App.css` | Added `.config-section` (nested collapsible with 44px touch targets, `#1A1A1A` bg, chevron rotation), `.config-section-content`, `.config-badge` (orange "customized" pill) |

### Two-Stage Super-Faction Picker

| File | Change |
|------|--------|
| `app/src/data/super-factions.ts` | **New file.** 6 super-faction groups (Imperium, Chaos, Aeldari, Hive Mind, Xenos, Other) with faction names matching `index.json` exactly |
| `app/src/components/faction/FactionPicker.tsx` | Replaced flat `<select>` with two-stage button picker. Stage 1: super-faction buttons with faction counts. Stage 2: faction buttons within group with back button. Selected state shows faction name with "Change" button. Added `onClear` prop. |
| `app/src/components/layout/AppShell.tsx` | Added `onClear={() => setFaction('')}` prop to both attacker and defender FactionPicker instances |
| `app/src/App.css` | Added `.faction-group-btn`, `.faction-btn` (full-width tappable buttons), `.faction-back-btn` (back navigation), `.faction-selected-btn` (selected state with "Change" hint), `.faction-count` (muted count badge) |

### Two-Stage Unit Picker with Categories

| File | Change |
|------|--------|
| `app/src/data/unit-categories.ts` | **New file.** `getUnitCategory()` assigns primary category via priority: Epic Hero > Character > Battleline > Monster > Vehicle > Mounted > Beast > Fortification > Infantry > Other. `groupUnitsByCategory()` groups units and returns in priority order. |
| `app/src/components/faction/UnitPicker.tsx` | Replaced flat `<select>` with two-stage picker. Stage 1: category buttons with unit counts. Stage 2: units within category with back button. Search bypasses categories for flat filtering. Selected state shows unit name with "Change" button. Added `onClear` prop. |
| `app/src/components/layout/AppShell.tsx` | Added `onClear={() => setUnit('')}` prop to both attacker and defender UnitPicker instances |

## Key Decisions

1. **All config sections collapsed by default (UnitCrunch style)** — User chose this over "weapons always visible". Summary lines show current state at a glance; only power users expand.

2. **Native `<details>`/`<summary>` for nested collapsibles** — Reuses the pattern already established at panel level. No library needed. Nested `<details>` works in all modern browsers.

3. **Two-stage tap-through for pickers (not grouped dropdown)** — User chose this over `<optgroup>` or chip filters. Each stage shows 2-8 options max, much more scannable than 25 factions or 141 units.

4. **Super-faction data adapted from warpair, not shared** — Name differences between projects (apostrophes, capitalization) mean we need a warstats-specific copy. Space Marines is a single entry under Imperium (no sub-factions in warstats).

5. **Unit category via keyword priority** — Units have multiple keywords (e.g. INFANTRY + CHARACTER + EPIC HERO). Priority ordering ensures each unit appears in exactly one group. EPIC HERO wins over CHARACTER wins over INFANTRY.

6. **Search bypasses categories** — When typing in the search box, categories are ignored and all matching units show as a flat list. This keeps search fast and discoverable.

7. **`onClear` prop pattern** — Pickers use separate `onClear` callback instead of passing empty string through `onChange`, which would trigger data fetches with invalid slugs.

## Unfinished Work / Next Steps

- **Visual testing on real mobile device** — All three features need verification at 375px viewport width
- **CSS class naming** — Unit picker reuses `.faction-group-btn`, `.faction-btn`, etc. classes. Could rename to generic `.picker-group-btn` for clarity, but works as-is.
- **Detachment picker** — Still uses flat `<select>`. Could benefit from same "selected with Change button" pattern for consistency, though detachment lists are typically short.
- **Desktop behavior** — Collapsed config sections work on desktop too. May want to force-open sections at 1024px+ via CSS or attribute manipulation.
- **Category refinement** — VEHICLE currently covers walkers, aircraft, transports, dreadnoughts. Could split into sub-categories if users find the vehicle group too large for some factions.
- **Scroll-to-results** — When all config is collapsed, consider auto-scrolling to results panel after unit selection on mobile.

## Context for Future Sessions

The app now uses a consistent two-stage picker pattern for both factions and units. The pattern is: tap group → see items → tap to select. Selected items show as a button with "Change" to re-pick. The `onClear` prop handles resetting without invalid data fetches.

Unit configuration sections are all individually collapsible via nested `<details>` elements inside the panel-level `<details>`. Stat line is the only always-visible section. The "customized" badge on wargear uses `isWargearCustomized()` from `logic/unit-config.ts`.

Super-faction groupings live in `data/super-factions.ts`. Unit categories are derived from keywords at runtime via `data/unit-categories.ts` — no data pipeline changes needed.
