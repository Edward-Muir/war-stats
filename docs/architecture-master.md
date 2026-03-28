# Warstats Master Architecture

Comprehensive reference for the WH40K 10th Edition damage statistics calculator. Describes the full data pipeline from BattleScribe XML through to Monte Carlo simulation results.

---

## 1. System Overview

```
BattleScribe XML (BSData/wh40k-10e)
  │
  ▼
Python Converter (warstats/bsdata/)
  ├── registry.py     — Load .gst + .cat XML, build global ID index (99,863 elements)
  ├── extractor.py    — Extract units: stats, weapons, abilities, keywords, points
  ├── wargear.py      — Convert selectionEntryGroup trees → SelectionGroup/Selection
  └── faction_map.py  — Map catalogue names → canonical faction names (merge SM chapters etc.)
  │
  ▼
all_datasheets.json (2,124 units across 24 factions, v2 schema)
  │
  ▼
split_factions.py  — Per-faction JSON with self-contained weapon registries
  │
  ▼
factions/
  ├── index.json                  (9 KB — faction metadata)
  ├── datasheets/{slug}.json      (50–470 KB per faction)
  └── rules/{slug}.json           (stratagems, enhancements, detachments — from Wahapedia)
  │
  ▼ symlinked into app/public/data/factions/
  │
React App (TypeScript)
  ├── types/          — JSON boundary types (strings for stats, dice expressions)
  ├── data/           — Fetch + cache faction JSON
  ├── logic/          — Wargear slots, model pools, weapon resolution, stratagem filtering
  ├── store/          — Zustand slices (attacker, defender, simulation)
  ├── components/     — 3-panel layout with overlay system
  └── engine/         — Pure TypeScript simulation (Web Worker)
      └── 5-step attack sequence → Monte Carlo → distribution stats
```

**Hybrid pipeline:** BattleScribe provides datasheets (stats, weapons, models, wargear). Wahapedia still provides rules (stratagems, enhancements, detachments, army rules) — BattleScribe lacks these entirely.

---

## 2. BattleScribe Converter (Python)

### Entry Point: `battlescribe_converter.py`

- Auto-clones BSData/wh40k-10e repo to `bsdata_repo/` (gitignored)
- Git pull with commit hash change detection (`.bsdata_last_build`)
- Flags: `--no-pull`, `--force`
- Output: `all_datasheets.json`

### Registry (`warstats/bsdata/registry.py`)

Loads all `.gst` (game system) + `.cat` (catalogue) XML files. Builds a global ID index mapping BattleScribe UUIDs to XML elements. Key capabilities:

- **Cross-file UUID resolution:** `resolve_link(element)` follows `targetId` references across catalogues
- **Unit iteration:** `iter_unit_entries()` yields both `type="unit"` and `type="model"` entries (characters are `type="model"` in sharedSelectionEntries)
- **Duplicate tracking:** `seen` set prevents yielding same unit twice

### Extractor (`warstats/bsdata/extractor.py`)

Converts XML elements into v2 JSON schema dicts:

- **Stats extraction** (`_extract_unit_stats()`): Checks inline `<profile typeName="Unit">` first, then falls back to `<infoLink type="profile">` resolution for multi-model squads
- **Weapon extraction:** Builds per-faction weapon registry keyed by slugified names (e.g., `"bolt-pistol"`, `"infernus-heavy-bolter--heavy-flamer"`). BattleScribe UUIDs used for dedup during extraction but not exposed in output JSON
- **Keyword extraction:** From `categoryLinks`, with `SKIP_CATEGORIES` filter removing internal BattleScribe categories (`"ATTACKS DX WEAPON"`, `"MELEE WEAPON"`, `"CONFIGURATION"`, etc.)
- **Abilities:** Core abilities as string array, structured `feelNoPain` number, structured `damaged: {threshold, description}`
- **Model definitions:** Per-model stats, `defaultWeaponIds`, `selectionGroups` with min/max constraints
- **Movement normalization:** Ensures `M` stat ends with `"` (e.g., `"10"` → `"10\"`)
- **Legends filtering:** Units with `[Legends]` in name are excluded

### Wargear (`warstats/bsdata/wargear.py`)

Converts BattleScribe `selectionEntryGroup` trees into flat `SelectionGroup`/`Selection` dicts with:
- `min`/`max` constraints
- Weapon ID references (slugified names matching the weapon registry)
- `defaultSelectionId` detection

### Faction Map (`warstats/bsdata/faction_map.py`)

Maps BattleScribe catalogue names to canonical names:
- Merges 12 Space Marine chapters → `"Space Marines"`
- Aeldari sub-faction consolidation
- `T'au` → `Tau`

### Split Factions (`split_factions.py`)

Takes monolithic `all_datasheets.json` and produces:
- Per-faction `datasheets/{slug}.json` with self-contained weapon registries (faction-level registry dropped; per-datasheet weapon maps are self-contained)
- `index.json` with counts, file sizes, slugs

---

## 3. V2 JSON Schema

### Datasheet JSON Shape

```json
{
  "faction": "Space Marines",
  "datasheet_count": 448,
  "datasheets": [
    {
      "name": "Intercessor Squad",
      "baseSize": "32mm",
      "invulnerableSave": null,        // "4+" or null
      "weapons": {                      // Record<slug, RawWeapon> — weapon registry
        "bolt-rifle": {
          "name": "Bolt rifle",
          "type": "ranged",             // "ranged" | "melee"
          "range": "30\"",
          "A": "2",                     // Dice expressions: "D6", "2D3+1", "3"
          "BS": "3+",                   // null for melee
          "WS": null,                   // null for ranged
          "S": "4",
          "AP": "-1",
          "D": "1",
          "keywords": ["assault", "heavy"]
        }
      },
      "abilities": {
        "core": ["Oath of Moment"],
        "faction": ["Combat Doctrines"],
        "other": [{ "name": "Ability Name", "description": "..." }],
        "feelNoPain": null,             // number (e.g., 5) or null
        "damaged": null                 // { "threshold": "6", "description": "..." } or null
      },
      "keywords": ["INFANTRY", "BATTLELINE", "IMPERIUM", "TACTICUS", "INTERCESSOR SQUAD"],
      "factionKeywords": ["ADEPTUS ASTARTES"],
      "composition": {
        "models": ["1 Intercessor Sergeant", "4-9 Intercessors"],
        "equipment": "...",
        "points": [{ "models": "5", "points": "80" }, { "models": "10", "points": "160" }]
      },
      "leaderUnits": ["Captain", "Chaplain", "..."],
      "models": [
        {
          "id": "intercessor-sergeant",
          "name": "Intercessor Sergeant",
          "min": 1,
          "max": 1,
          "stats": { "M": "6\"", "T": "4", "Sv": "3+", "W": "2", "Ld": "6+", "OC": "2" },
          "defaultWeaponIds": ["bolt-rifle", "close-combat-weapon"],
          "selectionGroups": [
            {
              "id": "sg-001",
              "name": "Ranged Weapons",
              "min": 1,
              "max": 1,
              "defaultSelectionId": "sel-001",
              "selections": [
                {
                  "id": "sel-001",
                  "label": "Bolt rifle",
                  "weaponIds": ["bolt-rifle"],
                  "pointsDelta": 0
                }
              ]
            }
          ]
        },
        {
          "id": "intercessor",
          "name": "Intercessor",
          "min": 4,
          "max": 9,
          "stats": { "M": "6\"", "T": "4", "Sv": "3+", "W": "2", "Ld": "6+", "OC": "2" },
          "defaultWeaponIds": ["bolt-rifle", "close-combat-weapon"],
          "selectionGroups": []
        },
        {
          "id": "intercessor-w-grenade-launcher",
          "name": "Intercessor w/ Grenade Launcher",
          "min": 0,
          "max": 2,
          "stats": { "M": "6\"", "T": "4", "Sv": "3+", "W": "2", "Ld": "6+", "OC": "2" },
          "defaultWeaponIds": ["bolt-rifle", "astartes-grenade-launcher--frag", "astartes-grenade-launcher--krak", "close-combat-weapon"],
          "selectionGroups": []
        }
      ]
    }
  ]
}
```

### Rules JSON Shape

```json
{
  "faction": "Space Marines",
  "army_rules": [{ "name": "Oath of Moment", "description": "..." }],
  "detachment_count": 8,
  "detachments": [
    {
      "name": "Gladius Task Force",
      "rule": { "name": "Combat Doctrines", "description": "..." },
      "enhancements": [
        {
          "name": "Artificer Armour",
          "points": 10,
          "description": "...",
          "keyword_restrictions": ["CHARACTER", "ADEPTUS ASTARTES"],
          "keywords_mentioned": ["ADEPTUS ASTARTES"]
        }
      ],
      "stratagems": [
        {
          "name": "Honour the Chapter",
          "cp_cost": 1,
          "type": "Battle Tactic",
          "category": "...",
          "turn": "your",
          "when": "Fight phase, just after...",
          "target": "One ADEPTUS ASTARTES unit...",
          "effect": "Until the end of the phase, melee weapons... improve AP by 1...",
          "restrictions": "",
          "cost": "1 CP",
          "fluff": "...",
          "keywords_mentioned": ["ADEPTUS ASTARTES"],
          "target_keywords": ["ADEPTUS ASTARTES"]
        }
      ]
    }
  ]
}
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Weapon registry at datasheet level** | `Record<string, RawWeapon>` keyed by slug. Eliminates fuzzy name matching — v1 had 4-step fallback; v2 uses direct ID lookup |
| **Stats per model, not per unit** | Enables multi-profile units (Crusader Squad: marines Sv 3+ vs neophytes Sv 4+). Toughness = highest T among all models per Rules Commentary |
| **All stats remain strings at JSON boundary** | No runtime parsing at data load. Engine parses on-demand: `"D6"` → `DiceExpr`, `"3+"` → `number` |
| **Profile weapons use `➤` prefix** | Dual-fire weapons: `"➤ Plasma pistol - standard"`, `"➤ Plasma pistol - supercharge"`. Parsed by `getProfileBaseName()` for mutual exclusion |
| **`selectionGroups` replace text-based wargear** | Tree structure with min/max constraints. Wargear-slots.ts reduced from 654 → ~400 lines by eliminating all text parsing |

---

## 4. TypeScript Type System

### `types/data.ts` — JSON Boundary Types

These mirror the JSON schema exactly. All stat values are strings.

| Type | Purpose |
|------|---------|
| `FactionIndex` / `FactionIndexEntry` | Faction metadata: slug, counts, file paths |
| `UnitDatasheet` | Full unit: name, weapons, abilities, keywords, models, composition, leaderUnits |
| `RawWeapon` | Weapon profile: name, type, range, A/BS/WS/S/AP/D as strings, keywords[] |
| `RawStats` | M/T/Sv/W/Ld/OC as strings |
| `V2ModelDefinition` | id, name, min, max, stats, defaultWeaponIds, selectionGroups |
| `V2SelectionGroup` | id, name, min, max, defaultSelectionId, selections[] |
| `V2Selection` | id, label, weaponIds[], pointsDelta |
| `AbilityBlock` | core[], faction[], other[], feelNoPain: number|null, damaged: {threshold, description}|null |
| `Stratagem` | name, cp_cost, type, turn, when, target, effect, target_keywords[] |
| `Detachment` | name, rule, enhancements[], stratagems[] |
| `FactionRules` | army_rules[], detachments[] |

### `types/config.ts` — UI Configuration State

Represents user selections and configuration choices.

| Type | Purpose |
|------|---------|
| `WargearSlot` | One equipment position: slotId, definitionName, replaces[], type, options[], scope |
| `WargearSlotOption` | One choice: selectionGroupId, selectionId, weaponIds[], label, pointsDelta |
| `SlotScope` | `single_model` / `all_or_nothing` / `variable_count` (with maxCount, noDuplicates, perN, maxPerN) |
| `SlotSelection` | Active choice: slotId, optionKey (`"${groupId}:${selectionId}"`), modelCount |
| `ConfiguredModel` | Group of models: groupId, definitionName, count, isBase, slotSelections[] |
| `WeaponFiringConfig` | Per weapon: groupId, weaponName, firingModelCount |
| `SelectedWeapon` | Resolved for simulation: weapon (RawWeapon), firingModelCount |
| `AttackerGameState` | attackMode, remainedStationary, advanced, charged, targetInHalfRange, engagementRange, pistolMode |
| `DefenderGameState` | inCover, benefitOfCover, stealthAll, closestTarget |
| `ActiveStratagem` | Wraps a Stratagem |

### `types/simulation.ts` — Engine I/O Types

All values are parsed numbers/booleans — no strings.

| Type | Purpose |
|------|---------|
| `DiceExpr` | `{ type: "fixed", value }` or `{ type: "dice", count, sides, modifier }` |
| `ParsedWeaponKeywords` | All 18 keyword abilities as typed fields (sustainedHits: number, lethalHits: boolean, etc.) |
| `ResolvedWeaponGroup` | Weapon ready for simulation: parsed attacks, skill, strength, ap, damage, keywords, firingModels |
| `ResolvedModifiers` | Computed modifiers: hitModifier, woundModifier, apValue, coverBonus, rerolls, critThresholds, etc. |
| `DefenderProfile` | toughness, save, invulnerableSave, wounds, modelCount, feelNoPain, keywords[] |
| `SimulationInput` | weaponGroups[] + attackerGameState + defenderProfile + defenderGameState + effects + iterations |
| `SimulationResults` | N iterations → summary with damage/modelsKilled/mortalWounds DistributionStats (mean, median, stddev, percentiles, histogram) |

### Type Boundary Flow

```
JSON (strings) → data.ts types → logic layer (some parsing) → config.ts types
                                                                      │
                                                                      ▼
                                                              unit-config.ts
                                                              (full parsing)
                                                                      │
                                                                      ▼
                                                            simulation.ts types
                                                            (all numbers/bools)
                                                                      │
                                                                      ▼
                                                              engine/ (pure math)
```

---

## 5. Unit Construction Flow

This is the core pipeline from "user selects a unit" to "simulation runs." Every step is traceable.

### Step 1: Faction Load

```
User selects faction → store.loadFaction(slug)
  → Parallel fetch: datasheets/{slug}.json + rules/{slug}.json
  → Cached in store.loadedFactions[slug]
```

**Files:** `data/loader.ts` (fetchFactionData), `data/hooks.ts` (useFactionData), `store/store.ts`

### Step 2: Unit Selection

```
User selects unit → store.setAttackerUnit(name)
  → Finds UnitDatasheet from loaded faction data
  → Triggers full configuration rebuild (steps 3-7)
```

**File:** `store/slices/attacker.ts` → `setAttackerUnit()`

### Step 3: Build Wargear Slots

```
buildWargearSlots(datasheet) → WargearSlot[]
```

Iterates each `V2ModelDefinition` → each `V2SelectionGroup` and creates a `WargearSlot`:
- **slotId:** `"${model.id}::${group.id}"`
- **replaces:** Intersects `group.selections[default].weaponIds` with `model.defaultWeaponIds`
- **type:** `"replace"` if replaces has entries, otherwise `"add"`
- **scope:** Determined by model min/max:
  - `min === max === 1` → `single_model`
  - `group.min === group.max` → `all_or_nothing`
  - Otherwise → `variable_count` with maxCount/perN/maxPerN

**File:** `logic/wargear-slots.ts` → `buildWargearSlots()`

### Step 4: Build Model Pools

```
buildModelPools(datasheet) → ModelPool[]
```

Detects model definitions that share a count space:
1. Group all V2ModelDefinitions by identical stat lines (M|T|Sv|W|Ld|OC)
2. If a stat group has exactly **one** base (min > 0, not a fixed-1 sergeant) and **one+** variants (min = 0), they form a pool
3. Pool has `baseDefName`, `variantDefNames[]`, `minTotal` (base.min), `maxTotal` (base.max)

**Example:** Intercessor Squad
- Intercessor (min:4, max:9) = base
- Intercessor w/ Grenade Launcher (min:0, max:2) = variant
- Pool total starts at 4. Adding 1 GL → base becomes 3, GL becomes 1 (total stays 4)

Validated: 63 pools detected across 24 factions, all correct. Edge cases excluded: all-optional units (Deathwatch Veterans where every model has min:0), multi-base groups (Custodian Guard).

**File:** `logic/wargear-slots.ts` → `buildModelPools()`

### Step 5: Build Default Models

```
buildDefaultModels(datasheet, slots) → ConfiguredModel[]
```

Creates one `ConfiguredModel` group per V2ModelDefinition:
- `count` = definition's `min` value
- `isBase` = true (default equipment)
- `slotSelections` = default selections from each wargear slot

Models with `min: 0` start as inactive groups (count = 0).

**File:** `logic/wargear-slots.ts` → `buildDefaultModels()`

### Step 6: Build Default Firing Config

```
buildDefaultFiringConfig(models, slots, datasheet) → WeaponFiringConfig[]
```

For each model group, resolves which weapons are equipped and sets initial firing counts:
1. Start with `defaultWeaponIds` from the definition
2. Apply any active slot selections (replace/add weapon IDs)
3. Look up each weapon ID in `datasheet.weapons` registry
4. **Profile weapon awareness:** Weapons starting with `"➤"` are profile variants. Only the first profile defaults to full firing count; others default to 0
5. Set `firingModelCount` = group's model count (all models fire by default)

**File:** `logic/wargear-slots.ts` → `buildDefaultFiringConfig()`

### Step 7: Derive Selected Weapons

```
deriveSelectedWeapons(models, firingConfig, slots, datasheet, pistolMode) → SelectedWeapon[]
```

Aggregates weapons across all model groups:
1. For each model group, compute equipped weapon IDs (defaults + slot modifications)
2. Look up `RawWeapon` from `datasheet.weapons[id]`
3. Match firing config entries by groupId + weaponName
4. Filter by pistol mode (engagement range restriction)
5. Aggregate: if same weapon appears in multiple groups, sum firingModelCounts

Result: `SelectedWeapon[]` — the simulation boundary type.

**File:** `logic/wargear-slots.ts` → `deriveSelectedWeapons()`

### Step 8: Resolve Weapon Groups

```
resolveWeaponGroups(selectedWeapons) → ResolvedWeaponGroup[]
```

Parses all string values into numbers:
- `A: "D6+1"` → `DiceExpr { type: "dice", count: 1, sides: 6, modifier: 1 }`
- `BS: "3+"` → skill: `3`
- `AP: "-2"` → ap: `2` (positive number)
- `keywords: ["sustained hits 2", "lethal hits"]` → `ParsedWeaponKeywords { sustainedHits: 2, lethalHits: true, ... }`

**File:** `logic/unit-config.ts` → `resolveWeaponGroups()`

### Step 9: Build Defender Profile

```
buildDefenderProfile(datasheet, modelCount) → DefenderProfile
```

- **Toughness:** `Math.max(...datasheet.models.map(m => parseInt(m.stats.T)))` (highest T per Rules Commentary)
- **Save/Wounds:** From first model definition (per-model allocation not yet modelled)
- **Invulnerable Save:** From `datasheet.invulnerableSave`
- **Feel No Pain:** From `datasheet.abilities.feelNoPain`
- **Keywords:** Merged `keywords` + `factionKeywords` (for Anti-X matching)

**File:** `logic/unit-config.ts` → `buildDefenderProfile()`

### Step 10: Assemble Simulation Input

```
buildSimulationInput() → SimulationInput
```

Combines:
- Attacker weapon groups (resolved)
- Attacker game state
- Attacker stratagem effects (parsed)
- Defender profile
- Defender game state
- Defender stratagem effects (parsed)
- Iteration count (default 10,000)

**File:** `store/slices/simulation.ts` → `buildSimulationInput()`

### Full Pipeline Diagram

```
UnitDatasheet (JSON)
  │
  ├── buildWargearSlots() ──────────────────────────► WargearSlot[]
  ├── buildModelPools() ────────────────────────────► ModelPool[]
  ├── buildDefaultModels(slots) ────────────────────► ConfiguredModel[]
  │                                                        │
  │   User adjusts: model counts, wargear selections       │
  │                         │                              │
  │                         ▼                              ▼
  ├── buildDefaultFiringConfig(models, slots) ──────► WeaponFiringConfig[]
  │                                                        │
  │   User adjusts: firing counts                          │
  │                         │                              │
  │                         ▼                              ▼
  ├── deriveSelectedWeapons(all state) ─────────────► SelectedWeapon[]
  │                                                        │
  │                                                        ▼
  ├── resolveWeaponGroups() ────────────────────────► ResolvedWeaponGroup[]
  │                                                        │
  ├── buildDefenderProfile() ───────────────────────► DefenderProfile
  │                                                        │
  └── buildSimulationInput() ───────────────────────► SimulationInput
                                                           │
                                                           ▼
                                                    Web Worker
                                                    Monte Carlo
                                                           │
                                                           ▼
                                                    SimulationResults
```

---

## 6. Wargear Slot System

### Core Concept

Each `V2SelectionGroup` on a model becomes a `WargearSlot`. Slots represent equipment positions that can be swapped.

### Slot Types

| Scope | Trigger | Example |
|-------|---------|---------|
| `single_model` | Model has min=max=1 (sergeant) | Intercessor Sergeant ranged weapon |
| `all_or_nothing` | Selection group min=max | Aggressor gauntlet swap |
| `variable_count` | min < max | "Up to 2 models can take heavy weapons" |

### Selection Flow

```
User picks option from WargearSlot dropdown
  → store.selectSlotOption(slotId, optionKey)
  → Updates ConfiguredModel.slotSelections
  → Triggers computeWeaponIds() to recalculate equipped weapons
  → Triggers buildDefaultFiringConfig() rebuild
  → Triggers deriveSelectedWeapons() rebuild
  → Triggers runSimulation() (debounced 300ms)
```

### Model Pool Redistribution

When a pool exists, model count changes are coordinated:

```
setDefinitionCount("Intercessor w/ Grenade Launcher", 1)
  → Pool detected: base="Intercessor", variant="Intercessor w/ GL"
  → setPoolVariantCount: base count = poolTotal - sum(variants)
  → Intercessor: 4→3, GL: 0→1 (total stays 4)

setDefinitionCount("Intercessor", 5)
  → setPoolTotal: adjusts base directly, variants unchanged
  → Intercessor: 3→5, GL: 1 (total 6)
```

### Profile Weapon Mutual Exclusion

Weapons with `"➤"` prefix are profile variants (e.g., krak/frag grenades):

```
getProfileBaseName("➤ Astartes grenade launcher - krak")
  → "astartes grenade launcher"

setWeaponFiringCount(groupId, "➤ Astartes grenade launcher - krak", 5)
  → Automatically sets sibling "➤ Astartes grenade launcher - frag" to 0
  → Enforces 40K rule: pick one profile per weapon per shooting
```

### Firing Count Auto-Scaling

When model counts change:
- If `firingModelCount === oldGroupCount` (all models were firing), scale to new count
- When group activates from 0→N, rebuild firing config from scratch (respects profile weapon first-only defaults)

---

## 7. Game State & Modifiers

### Attacker Game State

| Field | Effect on Simulation |
|-------|---------------------|
| `attackMode` | `"ranged"` uses BS, filters ranged weapons. `"melee"` uses WS, filters melee |
| `remainedStationary` | HEAVY weapons get +1 to hit |
| `advanced` | (informational — ASSAULT keyword allows firing) |
| `charged` | LANCE weapons get +1 to wound |
| `targetInHalfRange` | RAPID FIRE +X attacks, MELTA +X damage |
| `engagementRange` | Non-Monster/Vehicle units restricted to PISTOL weapons only |
| `pistolMode` | Derived from `engagementRange` + unit keywords. `"pistols_only"` / `"non_pistols_only"` / `null` |

### Defender Game State

| Field | Effect on Simulation |
|-------|---------------------|
| `inCover` | (UI toggle, feeds `benefitOfCover`) |
| `benefitOfCover` | +1 to armour save (restricted: Sv 3+ at AP 0 gets no benefit) |
| `stealthAll` | -1 to ranged hit rolls |
| `closestTarget` | (informational, not simulated in MVP) |

### Modifier Computation (`engine/modifiers.ts`)

`computeModifiers()` takes weapon + game state + defender + stratagem effects and produces `ResolvedModifiers`:

1. **Base modifiers from weapon keywords:**
   - Hit: HEAVY (+1 if stationary), STEALTH (-1 ranged), INDIRECT FIRE (-1 ranged)
   - Wound: LANCE (+1 if charged)
   - Attacks bonus: RAPID FIRE (+X at half range), BLAST (+1 per 5 defender models)
   - Damage bonus: MELTA (+X at half range)

2. **Fold in attacker stratagem effects** (filtered by combat type):
   - Hit/wound modifiers, AP improvement, rerolls, crit thresholds, lethal/sustained/devastating, ignores cover, lance

3. **Fold in defender stratagem effects:**
   - Hit/wound modifiers, AP worsen (saveModifier), FNP grant, damage reduction, invuln grant

4. **Apply caps:** Hit ±1, Wound ±1

5. **Cover re-evaluation:** If stratagems granted ignores cover, clear cover bonus

---

## 8. Simulation Engine

### Architecture

Pure TypeScript, zero React dependencies. Runs in a Web Worker for non-blocking UI.

```
engine/
├── dice.ts              — DiceExpr parser + rollD6()
├── keywords.ts          — Parse keyword strings → ParsedWeaponKeywords
├── modifiers.ts         — Compute ResolvedModifiers from all context
├── attack.ts            — Single attack: 5-step sequence
├── weapon-resolver.ts   — All attacks from one weapon group
├── allocation.ts        — Damage allocation to defender model pool
├── simulation.ts        — Monte Carlo runner
└── simulation.worker.ts — Web Worker wrapper
```

### 5-Step Attack Sequence (`engine/attack.ts`)

For each attack (one die):

**Step 1: Hit Roll**
- Roll D6 (or auto-hit if TORRENT)
- Compare to BS (ranged) or WS (melee) + hitModifier
- Natural 1 always fails, natural 6 always succeeds (critical hit)
- On critical hit: generate `sustainedHits` extra attacks (need wound rolls), mark as lethal if LETHAL HITS

**Step 2: Wound Roll**
- If LETHAL HITS triggered on crit: auto-wound (skip this step)
- Determine threshold from S vs T table:
  - S ≥ 2×T → 2+
  - S > T → 3+
  - S = T → 4+
  - S×2 ≤ T → 6+
  - Otherwise → 5+
- Roll D6 + woundModifier
- Natural 1 always fails, natural 6 always succeeds (critical wound)
- On critical wound + DEVASTATING WOUNDS: mortal wounds = damage value, skip save

**Step 3: Allocate Attack**
- Defender assigns wound to a model (prefer already-wounded)

**Step 4: Saving Throw**
- Roll D6
- Compare to Save characteristic - AP + coverBonus
- Or use invulnerable save (unaffected by AP), whichever is better
- Stratagem invuln override checked
- Natural 1 always fails

**Step 5: Inflict Damage**
- Roll damage dice (DiceExpr)
- Apply damage reduction (min 1)
- Apply damage bonus (MELTA)
- Normal damage: does NOT carry over to next model (excess lost)
- Mortal wounds: DO carry over between models
- Apply Feel No Pain: roll per wound lost, on target number wound is ignored
- Stratagem FNP override checked (uses better of datasheet FNP or stratagem FNP)

### Weapon Resolution (`engine/weapon-resolver.ts`)

Per weapon group:
1. Roll number of attacks: DiceExpr + RAPID FIRE bonus + BLAST bonus
2. For each attack, run the 5-step sequence
3. Collect damage values and mortal wounds
4. Queue sustained hits extras as additional attacks (auto-hit, need wound rolls)

### Damage Allocation (`engine/allocation.ts`)

Allocates resolved damage to defender model pool:
- **Normal damage:** Assign to model, excess per attack is LOST
- **Mortal wounds:** Carry over between models
- **FNP:** Roll per wound lost
- **Priority:** Wounded model first

### Monte Carlo Runner (`engine/simulation.ts`)

```
for (i = 0; i < iterations; i++) {
  // Clone fresh defender model pool
  for (each weapon group) {
    resolve all attacks → damage[] + mortalWounds
  }
  allocate all normal damage to model pool
  apply mortal wounds (carry over)
  record: { totalDamage, modelsKilled, mortalWounds, hits, wounds, unsavedWounds }
}
aggregate → DistributionStats { mean, median, stddev, min, max, percentiles, histogram }
```

### Weapon Keyword Effects (18 implemented)

| Keyword | Parsed Field | Engine Effect |
|---------|-------------|---------------|
| SUSTAINED HITS X | `sustainedHits: X` | Crit hit → X extra hits (need wound rolls) |
| LETHAL HITS | `lethalHits: true` | Crit hit → auto-wound (skip wound roll) |
| DEVASTATING WOUNDS | `devastatingWounds: true` | Crit wound → mortal wounds = D, skip save |
| ANTI-X Y+ | `antiKeyword: "X", antiThreshold: Y` | Lower crit wound threshold to Y+ vs keyword X |
| RAPID FIRE X | `rapidFire: X` | +X attacks at half range |
| BLAST | `blast: true` | +1 attack per 5 defender models |
| MELTA X | `melta: X` | +X damage at half range |
| TORRENT | `torrent: true` | Auto-hit (skip hit roll) |
| HEAVY | `heavy: true` | +1 to hit if stationary |
| LANCE | `lance: true` | +1 to wound if charged |
| TWIN-LINKED | `twinLinked: true` | Re-roll failed wound rolls |
| IGNORES COVER | `ignoresCover: true` | Negate Benefit of Cover |
| INDIRECT FIRE | `indirectFire: true` | -1 to hit, grant cover to target |
| PRECISION | `precision: true` | Can allocate to Character in attached unit |
| ASSAULT | `assault: true` | Can fire after advancing |
| PISTOL | `pistol: true` | Can fire in engagement range |
| HAZARDOUS | `hazardous: true` | Parsed but not simulated (self-damage) |
| EXTRA ATTACKS | `extraAttacks: true` | Additional attacks on top of normal |

---

## 9. Stratagem & Rules System

### Current State

**Stratagems** are sourced from Wahapedia (not BattleScribe — BS lacks them entirely). They have structured metadata (`when`, `target`, `effect` as free text, plus `target_keywords[]`, `keywords_mentioned[]`).

### Stratagem Filtering (`logic/stratagems.ts`)

Filters stratagems applicable to a selected unit:
1. Match by detachment (only show stratagems from selected detachment)
2. Compound keyword matching: `"ADEPTUS ASTARTES INFANTRY"` decomposes into individual words, each must exist in the unit's `keywords` + `factionKeywords`
3. Separate attacker vs defender filtering

### Stratagem Effect Resolution (`logic/stratagem-effects.ts`)

Two-layer approach:

**Layer 1: Name-based lookup table** (`STRATAGEM_EFFECTS`)
- ~300 stratagems mapped by exact name to `StratagemModifier` objects
- Covers: reroll hits/wounds, ±1 hit/wound, AP improve/worsen, crit 5+, lethal/sustained/devastating, ignores cover, lance, FNP, damage reduction, invuln save
- Effects are composable via `merge()` (e.g., `merge(AP_IMPROVE_1, LANCE)`)

**Layer 2: Combat type classification** (`classifyCombatType()`)
- Parses `when` and `effect` text to determine if stratagem applies to `"ranged"` / `"melee"` / `"any"`
- Checks for "ranged attack"/"melee attack" in effect text, "shooting phase"/"fight phase" in when text

**Output:** `ParsedStratagemEffect { combatType, modifiers, isParsed }`
- `isParsed: true` = found in lookup table (modifiers applied to simulation)
- `isParsed: false` = not recognized (displayed with "not simulated" badge in UI)

### `StratagemModifier` Fields

```typescript
interface StratagemModifier {
  // Attacker offensive
  hitModifier?: number;          // +1/-1
  woundModifier?: number;        // +1/-1
  apImprovement?: number;        // +1 AP
  rerollHits?: 'ones' | 'all';
  rerollWounds?: 'ones' | 'all';
  critHitOn?: number;            // e.g. 5 for crits on 5+
  critWoundOn?: number;
  lethalHits?: boolean;
  sustainedHits?: number;
  devastatingWounds?: boolean;
  ignoresCover?: boolean;
  lance?: boolean;

  // Defender defensive
  feelNoPain?: number;           // e.g. 5 for FNP 5+
  damageReduction?: number;      // e.g. 1 for -1 damage
  saveModifier?: number;         // Worsen AP by this amount
  invulnerableSave?: number;     // e.g. 4 for 4+ invuln
}
```

### How Modifiers Flow Into the Engine

```
ActiveStratagem[]
  → resolveStratagemEffect() for each
  → ParsedStratagemEffect[]
  → Passed into SimulationInput.attackerEffects / defenderEffects
  → computeModifiers() folds them in (filtered by combatType vs weapon.type)
  → ResolvedModifiers applied in attack.ts
```

### Enhancement & Army Rule Effects (Not Yet Simulated)

Enhancements and army rules have free-text `description` fields. Currently:
- Displayed in UI
- Filtered by keyword restrictions
- NOT parsed into simulation modifiers
- Same `StratagemModifier` structure could be reused

---

## 10. Extension Points for Future Features

### Dynamic Game State Population

**Goal:** Only show game state options that can actually affect the selected unit.

**Where to hook in:**
- After `setAttackerUnit()` / `setDefenderUnit()` in store slices
- Scan: weapon keywords → which game state toggles are relevant
- Scan: applicable stratagems → which effects are available
- Scan: faction/detachment rules → which abilities apply

**Implementation approach:**
1. Parse weapon keywords for the unit: if any weapon has HEAVY → show "Remained Stationary"; if any has LANCE → show "Charged"; etc.
2. Parse applicable stratagem effects: if any grants Sustained Hits → show that modifier option
3. Parse army rule / detachment rule text for structured effects (same pattern as stratagem-effects.ts)

**Key files to modify:**
- `store/slices/attacker.ts` — compute available game state after unit selection
- `components/game-state/GameState.tsx` — conditionally render chips
- New: army rule / detachment rule effect parser (same `StratagemModifier` type)

### Structured Rule Effects (Army Rules, Detachment Rules, Enhancements)

**Goal:** Parse free-text rule descriptions into `StratagemModifier`-compatible effects.

**Current state:** Only stratagems have the name-based lookup table. Army rules, detachment rules, and enhancements are display-only.

**Approach:** Same pattern as `stratagem-effects.ts`:
1. Name-based lookup table per rule type
2. `StratagemModifier` output (same type)
3. Fold into `computeModifiers()` alongside stratagem effects
4. Army/detachment rules are "always on" (no CP cost, no activation)

**Conditional keywords:** Some rules grant keywords conditionally (e.g., "units in this detachment get Sustained Hits 1 when targeting the closest enemy"). These need:
- A condition type (closest target, below half strength, etc.)
- Game state toggle to indicate condition is met
- The modifier to apply when condition is true

### Attached Units (Leaders)

**Current data:** `UnitDatasheet.leaderUnits: string[]` lists which units can lead this unit.

**What's needed:**
1. UI to select a leader from `leaderUnits`
2. Leader's model added to the unit's model pool
3. Leader's weapons added to available weapons
4. Toughness uses bodyguard unit's T (per rules)
5. Allocation: can't target leader (Character) until bodyguard models dead (unless PRECISION)
6. Leader abilities may modify the combined unit

**Key changes:**
- `store/slices/attacker.ts` — leader selection state, merged model pool
- `logic/unit-config.ts` — combine leader + bodyguard datasheets
- `engine/allocation.ts` — Character allocation rule
- `types/config.ts` — leader configuration types

### Per-Model Stats & Allocation

**Current limitation:** Defender profile uses first model's Sv/W. Multi-wound units with different saves (e.g., Terminator Sergeant W:3 vs Terminator W:3 same, but Crusader Squad marine Sv:3+ vs neophyte Sv:4+) aren't modelled per-model.

**What's needed:**
- `DefenderProfile` becomes a pool of model types, each with own save/wounds/FNP
- `allocation.ts` needs to pick which model type receives each wound
- "Optimal allocation" (assign wounds to minimize damage) vs "worst case" toggle

### Data Stats Summary

| Metric | Count |
|--------|-------|
| Factions | 24 |
| Datasheets | 2,124 |
| Detachments | 164 |
| Stratagems | 1,044 |
| Enhancements | 588 |
| Mapped stratagem effects | ~300 |
| Model pools detected | 63 |
| Faction index size | 9 KB |
| Largest faction datasheet | ~470 KB |

---

## Appendix: Key File Reference

### Data Pipeline (Python)
| File | Purpose |
|------|---------|
| `battlescribe_converter.py` | Main entry point, auto-clone, change detection |
| `warstats/bsdata/registry.py` | XML loading, global ID index, cross-file resolution |
| `warstats/bsdata/extractor.py` | Unit extraction: stats, weapons, abilities, keywords |
| `warstats/bsdata/wargear.py` | SelectionGroup/Selection tree conversion |
| `warstats/bsdata/faction_map.py` | Catalogue → faction name mapping |
| `split_factions.py` | Monolithic → per-faction JSON |
| `warstats/models.py` | Pydantic data models |

### TypeScript Types
| File | Purpose |
|------|---------|
| `app/src/types/data.ts` | JSON boundary types (mirrors BattleScribe v2 schema) |
| `app/src/types/config.ts` | UI configuration state types |
| `app/src/types/simulation.ts` | Engine I/O types (all parsed values) |

### Logic Layer
| File | Purpose |
|------|---------|
| `app/src/logic/wargear-slots.ts` | Model pools, slot construction, weapon ID computation, firing config, selected weapons |
| `app/src/logic/unit-config.ts` | resolveWeaponGroups(), buildDefenderProfile() |
| `app/src/logic/stratagems.ts` | Keyword-based stratagem filtering |
| `app/src/logic/stratagem-effects.ts` | Name→modifier lookup, combat type classification |
| `app/src/logic/pistol-restrictions.ts` | Weapon filtering by engagement range |

### Engine
| File | Purpose |
|------|---------|
| `app/src/engine/dice.ts` | DiceExpr parser, rollD6(), parseRollTarget/AP/Range/Strength |
| `app/src/engine/keywords.ts` | Keyword string → ParsedWeaponKeywords |
| `app/src/engine/modifiers.ts` | computeModifiers() — all modifier sources → ResolvedModifiers |
| `app/src/engine/attack.ts` | Single attack 5-step sequence |
| `app/src/engine/weapon-resolver.ts` | All attacks from one weapon group |
| `app/src/engine/allocation.ts` | Damage allocation to defender model pool |
| `app/src/engine/simulation.ts` | Monte Carlo runner |
| `app/src/engine/simulation.worker.ts` | Web Worker wrapper |

### Store
| File | Purpose |
|------|---------|
| `app/src/store/store.ts` | Root store, data cache, faction loading |
| `app/src/store/slices/attacker.ts` | Attacker configuration, wargear, firing, game state |
| `app/src/store/slices/defender.ts` | Defender configuration |
| `app/src/store/slices/simulation.ts` | Simulation assembly, worker lifecycle |
