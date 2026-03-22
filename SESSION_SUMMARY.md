# Warhammer 40K Stats App — Session Summary

## Project Overview

Building a Warhammer 40,000 damage calculator app. The project scrapes Wahapedia HTML pages into structured JSON, then hydrates them into strict Pydantic models that will power a stats backend.

## Completed Phases

### Phase 1: Datasheet Scraping (Complete)

**Script:** `wahapedia_scraper.py`

Scrapes saved Wahapedia datasheet HTML pages into structured JSON. Handles standard units and aircraft, weapon profiles, abilities, keywords, points costs, invulnerable saves, damaged profiles, and leader attachments.

- **1,632 datasheets** across **27 factions** parsed with 0 errors
- Output: `all_datasheets.json` (4.8MB)
- Source HTML: `pages/` directory (27 files)

Notable fixes during development: Cyrillic С in CSS class names, aircraft alternate div classes, Bubblechukka column-shift bug, faction name detection fallback chain, exact-match-first faction lookup.

### Phase 2: Rules Scraping (Complete)

**Script:** `wahapedia_rules_scraper.py`

Scrapes faction rules pages for army rules, detachments, enhancements, and stratagems. Extracts the full WHEN/TARGET/EFFECT/RESTRICTIONS structure for stratagems, plus target keywords for linking stratagems to datasheets.

- **25 factions**, **164 detachments**, **1,044 stratagems**, **588 enhancements**
- Output: `all_rules.json`
- Source HTML: `rules_pages/` directory (25 files)

### Pydantic Data Package (`warstats/`)

#### Strict Value Types

All stat values use custom immutable types with full Pydantic integration:

| Type | Examples | Properties |
|------|----------|------------|
| `DiceExpr` | `"3"`, `"D6"`, `"2D3+1"` | `.min`, `.max`, `.average`, `.is_fixed` |
| `RollTarget` | `"3+"`, `"4+*"` | `.value`, `.probability` |
| `Movement` | `'7"'`, `'20+"'`, `'-'` | `.inches`, `.is_minimum`, `.immobile` |
| `Range` | `'24"'`, `'Melee'`, `'N/A'` | `.inches`, `.melee`, `.not_applicable` |
| `Skill` | `"3+"`, `"N/A"` | `.value`, `.auto_hit`, `.probability` |

#### Datasheet Models (`models.py`)

- `Stats` — M/T/Sv/W/Ld/OC stat line
- `Weapon` — full weapon profile with computed `hit_probability`, `average_attacks`, `average_damage`
- `Ability`, `AbilityBlock` — core/faction/other abilities + damaged profile
- `UnitDatasheet` — complete datasheet with `effective_save(ap)`, `has_keyword()`, keyword lists
- `Faction` — wraps datasheets with `get_unit()`, `search_units()`, `units_with_keyword()`
- `GameData` — top-level container with `get_faction()`, `get_unit()`, `search_units()`

#### Rules Models (`models.py`)

- `TurnPhase` — enum: `your` / `opponent` / `either`
- `ArmyRule` — faction-level rule (name + description)
- `DetachmentRule` — detachment special rule with keywords mentioned
- `Enhancement` — with `can_equip(unit)` for keyword restriction matching
- `Stratagem` — full WHEN/TARGET/EFFECT/RESTRICTIONS with `applies_to(unit)` for keyword matching
- `Detachment` — bundles rule + enhancements + stratagems, with `applicable_stratagems(unit)` and `applicable_enhancements(unit)`
- `FactionRules` — all detachments for a faction, with `get_detachment()`, `applicable_stratagems(unit, detachment_name)`
- `RulesData` — top-level container with `get_faction_rules()`

#### Wargear & Composition Models (`models.py`)

- `ModelDefinition` — model type within a unit: name, min/max count, default equipment
- `WargearOption` — structured wargear swap/add rule with type (replace/add), scope (this_model/all_models/named_model/specific_count/per_n_models), replaces list, choices list, and optional model name

Added to `UnitDatasheet`: `model_definitions` and `wargear_options` fields.

**Validation results:**
- 2,216 wargear options across 948 units (100% typed and scoped, 0 empties)
- Types: replace=1,453, add=763
- Scopes: this_model=1,440, named_model=235, all_models=235, specific_count=210, per_n_models=96
- 2,014 model definitions across all 1,632 units (100% coverage)
- 97.5% of model definitions have default equipment populated

#### Keyword Matching

Stratagems and enhancements link to datasheets via keyword matching. The `applies_to()` method checks target keywords against both unit keywords and faction keywords. Compound keywords like `"ADEPTUS ASTARTES INFANTRY"` are decomposed and matched individually.

**Validation results:** 995/1,002 stratagems (99.3%) match at least one unit in their faction. The 7 unmatched are all explained by missing datasheets (specific SM unit names, one CK War Dog variant), not matching bugs.

#### Loaders (`loader.py`)

Monolithic loaders (for bulk/backend use):

- `load_json(path)` → `GameData` — load combined datasheets JSON
- `load_faction(path)` → `Faction` — load single faction datasheets
- `load_directory(path)` → `GameData` — load directory of datasheet JSONs
- `load_rules_json(path)` → `RulesData` — load combined rules JSON
- `load_rules_directory(path)` → `RulesData` — load directory of rules JSONs

Split-faction loaders (for webapp lazy loading):

- `load_index(base_dir)` → `FactionIndex` — load 9 KB index with faction names, slugs, file sizes
- `load_faction_by_slug(base_dir, slug)` → `Faction` — load one faction's datasheets by slug or name
- `load_faction_rules_by_slug(base_dir, slug)` → `FactionRules` — load one faction's rules by slug or name

`FactionIndex` provides `get_faction_meta()`, `faction_names()`, and `faction_slugs()` for building picker UIs without loading any datasheet data.

All loaders include normalisation layers that fill defaults and coerce raw JSON into the shapes the strict Pydantic models expect.

### Phase 2c: Per-Faction Splitting (Complete)

**Script:** `split_factions.py`

Splits monolithic JSON files into per-faction files for mobile webapp lazy loading. A two-faction matchup loads ~600 KB instead of 5.7 MB.

- **25 factions** split into individual datasheet + rules files
- Output: `factions/` directory with `index.json` + `datasheets/*.json` + `rules/*.json`
- Index file: 9 KB (faction names, slugs, unit/detachment/stratagem counts, file sizes)
- Largest faction datasheet: Genestealer Cults at 373 KB
- Worst-case two-faction load: ~740 KB datasheets + ~190 KB rules ≈ 930 KB (before gzip)

## File Structure

```
warstats/
├── pages/                        # 27 saved Wahapedia datasheet HTML files
├── rules_pages/                  # 25 saved Wahapedia rules HTML files
├── wahapedia_scraper.py          # Datasheet HTML → JSON scraper
├── wahapedia_rules_scraper.py    # Rules HTML → JSON scraper
├── split_factions.py             # Splits monolithic JSON into per-faction files
├── all_datasheets.json           # 1,632 datasheets across 27 factions (monolithic)
├── all_rules.json                # 1,044 stratagems, 588 enhancements, 164 detachments (monolithic)
├── factions/                     # Per-faction split files (for webapp)
│   ├── index.json                # 9 KB faction index with metadata
│   ├── datasheets/               # 25 per-faction datasheet JSON files
│   └── rules/                    # 25 per-faction rules JSON files
└── warstats/                     # Python data package
    ├── __init__.py               # Package exports
    ├── models.py                 # All Pydantic models (datasheet + rules)
    ├── loader.py                 # JSON → Pydantic hydration (monolithic + split loaders)
    ├── py.typed                  # PEP 561 marker
    └── data/
        └── __init__.py
```

## Phase 3 (Next)

Build the damage calculator backend using this data package. The workflow: select attacking and defending units, configure each unit (choose wargear loadout + number of models using `model_definitions` and `wargear_options`), apply stratagems (matched by keyword), then calculate damage output.

The groundwork is laid: datasheets have typed weapon profiles with computed hit/damage stats, wargear options support full unit configuration, and stratagems can be matched to units by keyword for modifier application.
