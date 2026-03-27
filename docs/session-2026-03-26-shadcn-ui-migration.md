# Session: shadcn/ui Migration with Grimdark Theme

**Date:** 2026-03-26

## Overview

Full UI migration from hand-written vanilla CSS (1,211 lines in a single `App.css`) to **shadcn/ui** components + **Tailwind CSS v4** with a custom grimdark dark theme. All 23 React components were migrated across 7 phases. After migration, the Drawer-based overlay was replaced with a centered Framer Motion modal for better UX.

## What Was Accomplished

### Phase 0: Foundation
- Installed **Tailwind CSS v4** with `@tailwindcss/vite` plugin
- Installed **shadcn/ui** (base-nova style, neutral base color)
- Added `@/` path alias in `vite.config.ts` and `tsconfig.app.json`
- Created `src/lib/utils.ts` with `cn()` utility (clsx + tailwind-merge)
- Defined **grimdark theme** in `index.css` — dark-only palette using CSS custom properties:
  - Core: `--background` (#121212), `--card` (#1e1e1e), `--foreground` (#e4e4e4)
  - Domain tokens: `--attacker` (red #e74c3c), `--defender` (blue #3498db), `--success` (green), `--warning` (orange), `--cp` (purple)
  - Keyword badge variants: `--keyword-unit-bg/fg`, `--keyword-faction-bg/fg`, etc.

### Phase 1: Leaf Components
- `KeywordBadge` → shadcn Badge with 4 color variants (unit/faction/weapon/ability)
- `StatLine` → Tailwind utility classes (flex layout, bg-card, bg-cp for invuln)
- `CountStepper` → shadcn Button (outline, icon size) + Lucide Minus/Plus icons
- `WeaponProfile` → Tailwind utility classes
- `SimulationStatus` → Tailwind `animate-pulse`

### Phase 2: Overlay System
- Replaced custom Framer Motion `Overlay.tsx` with shadcn **Drawer** (vaul)
- Same `{isOpen, onClose, title, children}` interface — all 4 consumers unchanged
- Removed framer-motion dependency (later re-added, see below)

### Phase 3: Interactive Controls
- `GameState` chips → shadcn **Toggle** with attacker/defender color variants
- `StratagemChips` → shadcn **Toggle** + conditional active/unparsed styles
- `DetachmentPicker` → shadcn **Select** / SelectItem
- Attack mode toggle (AppShell) → shadcn **ToggleGroup**

### Phase 4: Cards & Collapsibles
- `UnitInfoCard` → shadcn **Card** + **Collapsible** (replaced `<details>`)
- `ModelGroup` → Card + Collapsible with variant left-border for non-base groups
- `WeaponRow` → Collapsible + shadcn **Checkbox** + CountStepper
- `StratagemPicker` → Card + Badge with active state border
- Slot `<select>` elements → shadcn **Select**
- Note: base-ui Collapsible doesn't support `asChild` — used className directly on CollapsibleTrigger

### Phase 5: Drill-Down Pickers
- `FactionPicker` → shadcn **Button** (ghost) + **Badge** for counts + Lucide ChevronRight/ChevronLeft
- `UnitPicker` → Same pattern

### Phase 6: Layout Shell & Results
- `AppShell` → Full Tailwind layout with shadcn Button, ToggleGroup, Card
- `ResultsSummary` → Card in `grid grid-cols-3` layout
- `ResultsChart` → Updated Recharts colors to use CSS variables (`var(--attacker)`, `var(--border)`, etc.)
- `StatsOverlay` → Updated to use CSS var colors
- `ConfigOverlay` → Added `space-y-4` spacing

### Phase 7: Cleanup
- **Deleted `App.css`** (1,211 lines) — removed import from `App.tsx`
- Removed `framer-motion` dependency (was unused after Drawer migration)
- Verified zero legacy CSS class references remain

### Post-Migration: Overlay UX Fix
- User reported the Drawer (bottom-sheet) felt wrong: slow scroll-up, 3/4 screen coverage
- **Re-installed framer-motion**
- Rewrote `Overlay.tsx` as a **centered pop-out modal** with:
  - `bg-black/50 backdrop-blur-sm` backdrop (was barely-visible `bg-black/10`)
  - Spring animation: `scale 0.95→1`, stiffness 500, damping 30 (~200ms snappy pop)
  - ESC + backdrop click dismissal, body scroll lock
- All 4 overlay consumers unchanged (same interface)

## Files Modified

### New Files
- `app/src/lib/utils.ts` — `cn()` utility
- `app/src/components/ui/*.tsx` — 11 shadcn primitives (badge, button, card, checkbox, collapsible, drawer, select, separator, toggle, toggle-group)
- `app/components.json` — shadcn configuration

### Modified Files (every component migrated)
| File | Change |
|------|--------|
| `app/vite.config.ts` | Added Tailwind plugin + `@/` path alias |
| `app/tsconfig.app.json` | Added `baseUrl` + `paths` for `@/` alias |
| `app/tsconfig.json` | Added `compilerOptions` with path alias |
| `app/src/index.css` | Complete rewrite: Tailwind import + grimdark theme vars |
| `app/src/App.tsx` | Removed `App.css` import |
| `app/src/components/layout/Overlay.tsx` | Drawer → Framer Motion centered modal |
| `app/src/components/layout/AppShell.tsx` | Full migration to Tailwind + shadcn |
| `app/src/components/shared/KeywordBadge.tsx` | → shadcn Badge |
| `app/src/components/shared/StatLine.tsx` | → Tailwind classes |
| `app/src/components/shared/WeaponProfile.tsx` | → Tailwind classes |
| `app/src/components/unit-config/CountStepper.tsx` | → shadcn Button + Lucide icons |
| `app/src/components/unit-config/UnitInfoCard.tsx` | → Card + Collapsible |
| `app/src/components/unit-config/ModelGroup.tsx` | → Card + Collapsible + Select |
| `app/src/components/unit-config/WeaponRow.tsx` | → Collapsible + Checkbox |
| `app/src/components/unit-config/UnitConfigurator.tsx` | → Tailwind spacing |
| `app/src/components/faction/FactionPicker.tsx` | → Button + Badge + Lucide |
| `app/src/components/faction/UnitPicker.tsx` | → Button + Badge + Lucide |
| `app/src/components/faction/DetachmentPicker.tsx` | → shadcn Select |
| `app/src/components/game-state/GameState.tsx` | → shadcn Toggle |
| `app/src/components/game-state/StratagemChips.tsx` | → shadcn Toggle |
| `app/src/components/game-state/StratagemPicker.tsx` | → Card + Badge |
| `app/src/components/simulation/SimulationControls.tsx` | → Tailwind animate-pulse |
| `app/src/components/simulation/ResultsChart.tsx` | → CSS var colors |
| `app/src/components/simulation/ResultsSummary.tsx` | → Card grid layout |
| `app/src/components/overlays/StatsOverlay.tsx` | → CSS var colors |
| `app/src/components/overlays/ConfigOverlay.tsx` | → spacing improvements |

### Deleted Files
- `app/src/App.css` (1,211 lines)

## Key Decisions & Rationale

1. **shadcn/ui over other libraries** — User specifically requested it after seeing Shadcn Admin dashboard; copies components into project (no runtime dep), highly customizable via CSS vars
2. **Tailwind v4** (not v3) — Current version uses Vite plugin directly, CSS-first config via `@theme`, no `tailwind.config.js` needed
3. **base-ui (not Radix)** — shadcn 2026 uses `@base-ui/react` primitives instead of Radix; no `asChild` prop (use `className` directly on triggers instead)
4. **ToggleGroup uses `value: string[]`** (not single string) — base-ui API difference from Radix
5. **Select `onValueChange` passes `string | null`** — Needs null guard wrapper
6. **Drawer → Framer Motion modal** — Vaul's bottom-sheet felt wrong for this app; centered pop-out with spring physics (stiffness 500, damping 30) per game-feel skill matches the desired snappy UX
7. **Dark-only theme** — No light mode toggle; grimdark is the only theme, so vars go on `:root` not `.dark`

## Dependencies Changed

### Added
- `tailwindcss`, `@tailwindcss/vite` — Tailwind CSS v4
- `tailwind-merge`, `clsx`, `class-variance-authority` — shadcn utilities
- `lucide-react` — Icons (replaces unicode symbols)
- `framer-motion` — Modal animations (re-added after initial removal)
- `vaul`, `@base-ui/react`, `tw-animate-css`, `@fontsource-variable/geist` — shadcn transitive deps

### Removed then Re-added
- `framer-motion` — Removed during Phase 7 cleanup, re-added for centered modal

## Unfinished Work / Next Steps

1. **vaul/Drawer cleanup** — `drawer.tsx` still exists in `components/ui/` but is unused; can be deleted along with `npm uninstall vaul` if desired
2. **Visual QA pass** — Colors match the original palette, but touch targets, scroll behavior, and iOS Safari specifics need manual testing
3. **Desktop layout** — Tailwind infra supports `md:` breakpoints; could expand beyond 600px max-width in the future
4. **Faction-adaptive theming** — CSS custom properties make it easy to shift accent colors per faction (Option C from design research)
5. **Geist font** — shadcn init pulled in `@fontsource-variable/geist` but the theme overrides it with the system font stack; could adopt Geist or another display font for headers

## Context for Future Sessions

- The app uses **shadcn/ui base-nova style** with **base-ui** (not Radix) primitives
- All custom domain colors are available as Tailwind utilities: `bg-attacker`, `text-defender`, `bg-cp`, `border-warning`, etc.
- The Overlay component uses **Framer Motion** `AnimatePresence` for mount/unmount animations — any changes to overlay behavior should modify `Overlay.tsx` only
- The `components.json` at project root configures shadcn CLI for future `npx shadcn add` commands
