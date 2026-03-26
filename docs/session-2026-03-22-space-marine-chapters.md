# Session Summary: Space Marine Chapters & Data Fix

**Date:** 2026-03-22

## Overview

Three related changes were made: (1) Space Marines were promoted to their own super-faction in the faction picker with chapter sub-factions, (2) the truncated Space Marines HTML source was re-downloaded and re-scraped to capture all 299 datasheets (up from 141), and (3) chapter-based unit filtering was implemented so selecting a chapter shows only that chapter's units plus generic Adeptus Astartes units.

## Files Modified

### Data Pipeline

| File | Change |
|------|--------|
| `pages/space-marines-datasheets.html` | Re-downloaded from Wahapedia. Previous file was truncated — had TOC entries for ~299 units but only 141 actual datasheet divs. New file has all 299. |
| `all_datasheets.json` | Regenerated via `wahapedia_scraper.py`. Now contains 299 SM datasheets. |
| `factions/datasheets/space-marines.json` | Regenerated via `split_factions.py`. 299 datasheets (was 141). Includes previously missing units: Sternguard Veterans, Devastators, Hellblasters, Eradicators, Redemptor Dreadnought, Repulsor, Infernus Squad, Desolation Squad, Terminator Squad, and many more. |
| `factions/index.json` | Regenerated. SM datasheet count updated. |

### App Source

| File | Change |
|------|--------|
| `app/src/data/super-factions.ts` | Added `chapterKeyword` field to `Chapter` interface. Removed `Space Marines` from Imperium's faction list. Added new `space-marines` super-faction with 13 chapter entries (Space Wolves, Blood Angels, Black Templars, Dark Angels, Ultramarines, Deathwatch, Imperial Fists, Salamanders, Raven Guard, Iron Hands, White Scars, Blood Ravens, Other Chapters). No "All Space Marines" option — user must pick a chapter. |
| `app/src/store/slices/attacker.ts` | Added `chapter: string | null` to attacker state. `setAttackerFaction` now accepts optional `chapter` parameter. Unit lookups (`setAttackerUnit`, `setAttackerGameState`) prefer the chapter-specific variant of a datasheet when duplicates exist (e.g., Black Templars Sternguard vs generic Sternguard). |
| `app/src/store/slices/defender.ts` | Same `chapter` state and chapter-aware lookup changes as attacker slice. |
| `app/src/components/faction/FactionPicker.tsx` | `onChange` callback now passes `chapterKeyword` as second argument when a chapter button is clicked. `value`/`onClear` props removed (by user/linter between sessions). |
| `app/src/components/overlays/FactionOverlay.tsx` | Passes `chapterKeyword` through to `setFaction(slug, chapterKeyword)`. |
| `app/src/components/overlays/UnitOverlay.tsx` | Added `filterByChapter()` function that filters datasheets based on `faction_keywords`. For a specific chapter (e.g., `BLOOD ANGELS`): shows units with that keyword + generic `ADEPTUS ASTARTES`-only units. For "Other Chapters" (`ADEPTUS ASTARTES`): shows only generic units. |
| `app/src/components/overlays/ConfigOverlay.tsx` | Chapter-aware datasheet lookup to select the correct variant when duplicate unit names exist. |

## Key Decisions

1. **Space Marines as a super-faction, not a regular faction** — SM is pulled out of Imperium and gets its own top-level group in the picker. Grey Knights stays in Imperium (not a SM chapter).

2. **No "All Space Marines" option** — User must select a specific chapter. This avoids the duplicate unit name problem where `.find()` by name would always return the generic variant.

3. **Chapter = faction_keyword filter** — Each chapter maps to a `faction_keywords` value (e.g., `BLOOD ANGELS`). The filter shows chapter-specific units + generic ADEPTUS ASTARTES units. "Other Chapters" shows only generic units (for chapters like Crimson Fists that don't have unique datasheets).

4. **Chapter-aware datasheet lookup everywhere** — Store slices and ConfigOverlay prefer the chapter-specific variant when looking up by name, with fallback to the first match. This ensures Black Templars Sternguard is used when Black Templars chapter is selected.

5. **Re-scrape instead of scraper fix** — The scraper code was correct. The source HTML was simply truncated (likely incomplete download). Re-downloading fixed the issue.

## Duplicate Datasheets in Data

10 unit names appear twice in the SM data — a generic version and a Black Templars version:
- Sternguard Veteran Squad, Terminator Squad, Repulsor, Repulsor Executioner, Impulsor, Gladiator Lancer/Reaper/Valiant, Land Raider Crusader
- Wolf Scouts appears twice (both Space Wolves) — likely a true data duplicate

The chapter filtering handles this correctly for the UI, but `Wolf Scouts` duplication may warrant deduplication in the data pipeline.

## Unfinished Work / Next Steps

- **Wolf Scouts data duplicate** — Appears twice with identical `SPACE WOLVES` faction keyword. Should be deduplicated in the scraper or split pipeline.
- **Unit counts in chapter picker** — Currently hardcoded from a point-in-time count. Could be computed dynamically from the loaded data.
- **Category distribution UX** — The unit picker's "Infantry" category shows very few units because most infantry are categorized as Epic Hero or Character first. Not a bug, but could confuse users. A possible enhancement would be showing units in multiple categories or adding an "All units" flat list option.
- **`closestTarget` not wired to engine** — From previous session, the `closestTarget` flag on `DefenderGameState` exists in the UI but isn't used by the simulation engine yet.

## Context for Future Sessions

The faction picker now has a three-level hierarchy for Space Marines: super-faction group → chapter → unit. All other factions use the original two-level hierarchy (super-faction group → faction → unit). The chapter keyword is stored in `attacker.chapter` / `defender.chapter` in the Zustand store and used to filter datasheets in `UnitOverlay` and resolve the correct datasheet variant in `ConfigOverlay` and the store slices.

The `Chapter` type in `super-factions.ts` has a `chapterKeyword` field that maps directly to the `faction_keywords` array on datasheets. This is the key link between the UI grouping and the data filtering.
