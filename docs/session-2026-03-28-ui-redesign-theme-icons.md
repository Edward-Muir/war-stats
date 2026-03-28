# Session: UI Redesign — Inline Stats, Dark/Light Theme, Game State Grouping, Faction Icons

**Date:** 2026-03-28

## Overview

Major UI redesign to match reference mockup images. Five changes implemented:

1. **Inline stats** — Removed the StatsOverlay modal; stats (Damage, Models, chart) now display directly on the main page in a compact card layout.
2. **Dark/light theme toggle** — Added a light mode color scheme and a toggle in the burger menu. Theme persists in localStorage with system preference fallback. FOUC prevention via inline script.
3. **Game state grouping** — Moved attacker game state chips (Stationary, Advanced, Charged, Half Range, Engagement Range) into the attacker section and defender chips (Cover, Stealth, Closest Unit) into the defender section. Removed the standalone mixed GameState section.
4. **Faction icons** — Faction buttons now show an icon-only button (no text) with the faction's symbol. 24 of 25 factions have SVG icons copied from local assets or downloaded from the archived wh40k-icon GitHub repo.
5. **Chapter-specific icons** — Space Marine sub-chapters (Blood Angels, Ultramarines, etc.) display their chapter-specific icon instead of the generic Adeptus Astartes symbol, with fallback to the generic icon.

A prerequisite extraction (Phase 0) was performed first to bring AppShell.tsx from 426 lines down to ~301, creating headroom for all subsequent changes.

## Files Created

| File | Description |
|------|-------------|
| `app/src/components/simulation/StatsPreview.tsx` | Extracted from AppShell. Inline stats card with Damage/Models grid + Damage Distribution chart |
| `app/src/hooks/useFilteredStratagems.ts` | Extracted from AppShell. Hook to filter stratagems by side/unit/detachment |
| `app/src/hooks/useGameStateRelevance.ts` | Extracted from AppShell. Hook to compute which game state toggles are relevant |
| `app/src/hooks/useTheme.ts` | Theme hook: `useTheme()` returns `{ theme, toggle }`, manages localStorage + `.dark` class |
| `app/src/components/shared/FactionIcon.tsx` | Renders faction SVG icon with optional `chapter` prop for SM sub-chapters. Dark mode inversion via CSS. Fallback chain: chapter icon → faction icon → hidden |
| `app/public/icons/factions/*.svg` | 24 faction SVG icons (15 from `data/icons/wh40k/`, 9 downloaded from GitHub) |
| `app/public/icons/chapters/*.svg` | 12 Space Marine chapter SVG icons (Blood Angels, Ultramarines, Dark Angels, Space Wolves, Black Templars, Deathwatch, Imperial Fists, White Scars, Iron Hands, Salamanders, Raven Guard, Blood Ravens) |

## Files Modified

| File | Changes |
|------|---------|
| `app/src/components/layout/AppShell.tsx` | Extracted 3 blocks (StatsPreview, useFilteredStratagems, useGameStateRelevance). Removed StatsOverlay. Integrated GameState per-side, useTheme, FactionIcon with chapter support. 426→301 lines. |
| `app/src/index.css` | Restructured: light theme in `:root`, dark grimdark theme in `.dark`. Added full light mode color palette (near-white surfaces, adjusted domain colors for white backgrounds, lighter keyword badge variants). |
| `app/index.html` | Added FOUC prevention inline script (applies `.dark` class before React mounts). Updated title to "WH40K Damage Calculator". |
| `app/src/components/layout/BurgerMenu.tsx` | Added `theme` and `onToggleTheme` props. Sun/Moon toggle as first menu item. |
| `app/src/components/game-state/GameState.tsx` | Added `side: 'attacker' | 'defender'` prop. Attacker chips render only when `side === 'attacker'`, defender chips only when `side === 'defender'`. Returns null if no chips relevant for that side. |
| `app/src/components/simulation/ResultsChart.tsx` | Reduced chart height from 250→200. Tightened YAxis width to 40, font size to 11. |

## Files Deleted

| File | Reason |
|------|--------|
| `app/src/components/overlays/StatsOverlay.tsx` | Stats now inline, no modal needed |
| `app/src/components/simulation/ResultsSummary.tsx` | Only used by StatsOverlay |

## Key Decisions

### 1. Light theme as `:root` default, dark in `.dark`
Follows the standard shadcn/Tailwind pattern where `:root` is light and `.dark` overrides. The `@custom-variant dark (&:is(.dark *))` already existed but was unused. The FOUC prevention script in `index.html` applies `.dark` before React mounts based on localStorage/system preference.

### 2. Faction button is icon-only
The user requested removing faction name text from the button. The faction button is now the same size as the settings gear button (`h-11 w-11`), showing only the faction SVG icon. An "F" placeholder appears when no faction is selected.

### 3. Chapter icons via fallback chain
`FactionIcon` accepts an optional `chapter` prop. When set and not `"ADEPTUS ASTARTES"`, it first tries `/icons/chapters/{chapter-slug}.svg`. On error, it falls back to `/icons/factions/{faction-slug}.svg`. On second error, the image hides. This avoids 404 console noise for chapters without dedicated icons.

### 4. AppShell extraction before modifications
AppShell was at 426/450 lines (ESLint max-lines). All three extracted pieces (`StatsPreview`, `useFilteredStratagems`, `useGameStateRelevance`) were moved to their own files before any layout changes, bringing it to ~301 lines with ~150 lines of headroom.

### 5. SVG theming via CSS `dark:invert`
The SVG icons use black fills. Rather than modifying each SVG to use `currentColor` (which requires inline SVGs), we use `<img>` with Tailwind's `dark:invert` class to flip black→white in dark mode.

### 6. Single inline chart
The user chose to show only the Damage Distribution chart inline (no Models Killed chart), keeping the layout compact.

## Icon Coverage

### Faction Icons (24/25)
All factions covered except `unaligned-forces` (no icon available, hidden via `onError`).

### Chapter Icons (12/13)
All Space Marine chapters covered except "Other Chapters" (`ADEPTUS ASTARTES`), which correctly falls back to the generic Space Marines icon.

### Icon Sources
- **Local** (`data/icons/wh40k/`): 15 faction icons
- **Downloaded** (GitHub `Certseeds/wh40k-icon`): 9 faction icons (orks, necrons, tyranids, tau, genestealer-cults, leagues-of-votann, adeptus-mechanicus, adeptus-titanicus, space-marines)
- **User's Downloads** (`~/Downloads/icons/wh40k/Imperium/`): 12 chapter icons

## Verification

- `npx tsc -b --noEmit` — Clean
- `npm run test` — 117/117 pass
- `npm run build` — Success (939 KB JS, 58 KB CSS)
- `npm run lint` — Only pre-existing errors (ModelGroup complexity 26, UnitConfigurator complexity 23, wargear-slots 469 lines, test file unused vars)

## Unfinished Work / Next Steps

1. **Light mode visual polish**: The light mode colors are functional but may need visual tuning once reviewed in-browser (contrast ratios, chart colors on white, keyword badge readability).

2. **Faction icons in FactionPicker overlay**: Currently icons only appear on the main page faction buttons. The FactionPicker overlay (stage 2 chapter list) could also show chapter icons next to each chapter name.

3. **Missing `unaligned-forces` icon**: No suitable icon found. Could create a generic skull or crosshairs icon, or leave as text fallback.

4. **SVG optimization**: The copied SVGs are unoptimized (contain Adobe Illustrator metadata, inline styles). Running `svgo` could reduce their size significantly.

5. **Theme-aware chart colors**: Recharts uses CSS variables (`var(--border)`, `var(--muted-foreground)`) which auto-adapt. But the bar fill colors are hardcoded to `var(--attacker)` which changes between themes — may need fine-tuning for light mode contrast.

## Context for Future Sessions

- Theme state is managed by `useTheme()` hook in `app/src/hooks/useTheme.ts`, not in Zustand. It reads/writes `warstats-theme` localStorage key.
- The `.dark` class is toggled on `document.documentElement`.
- `FactionIcon` at `app/src/components/shared/FactionIcon.tsx` handles the chapter→faction fallback chain via React state (`fallback` flag) and `onError`.
- The `GameState` component now requires a `side` prop — it renders only the chips relevant to that side.
- AppShell is at 301 lines with room for ~150 more lines before hitting the ESLint 450-line limit.
- The `gameStateProps` object in AppShell bundles shared props to avoid duplication across the two `<GameState>` calls.
