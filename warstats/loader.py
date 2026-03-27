"""
Loader module — hydrates Pydantic models from scraped JSON files.

Usage:
    from warstats.loader import load_json, load_directory, load_rules_json

    # Load a single combined JSON file
    game = load_json("all_datasheets.json")

    # Load a directory of per-faction JSON files
    game = load_directory("output/")

    # Load a single faction from a JSON file
    faction = load_faction("aeldari_datasheets.json")

    # Load rules data
    rules = load_rules_json("all_rules.json")

    # Load from split faction directory (index.json + per-faction files)
    index = load_index("factions/")
    faction = load_faction_by_slug("factions/", "space-marines")
    rules = load_faction_rules_by_slug("factions/", "space-marines")
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Union

from warstats.models import (
    Faction,
    FactionRules,
    GameData,
    RulesData,
    Stats,
    UnitDatasheet,
    Weapon,
    WeaponType,
)


def _normalise_weapon(raw: dict) -> dict:
    """
    Normalise a raw weapon dict from JSON into the shape the Weapon model expects.
    Handles the BS/WS split and ensures 'type' is a valid enum value.
    """
    out = dict(raw)

    # Ensure type is valid
    wtype = out.get("type", "ranged").lower()
    if wtype not in ("ranged", "melee"):
        wtype = "melee" if out.get("range", "").lower() == "melee" else "ranged"
    out["type"] = wtype

    # Ensure both BS and WS exist (one will be None)
    if "BS" not in out:
        out["BS"] = None
    if "WS" not in out:
        out["WS"] = None

    return out


def _normalise_stats(raw: dict) -> dict:
    """
    Normalise a raw stats dict. Fills in missing keys with sensible defaults.
    """
    defaults = {"M": "-", "T": "0", "Sv": "7+", "W": "0", "Ld": "7+", "OC": "0"}
    out = dict(defaults)
    out.update(raw)
    return out


def _normalise_wargear_option(raw: dict) -> dict:
    """Normalise a raw wargear option dict for the WargearOption model."""
    out = dict(raw)
    out.setdefault("type", "")
    out.setdefault("scope", "")
    out.setdefault("per_n_models", None)
    out.setdefault("max_per_n", None)
    out.setdefault("replaces", [])
    out.setdefault("choices", [])
    # Normalize: wrap plain strings in lists for backwards compatibility
    out["choices"] = [
        c if isinstance(c, list) else [c] for c in out["choices"]
    ]
    out.setdefault("model_name", None)
    return out


def _normalise_model_definition(raw: dict) -> dict:
    """Normalise a raw model definition dict."""
    out = dict(raw)
    out.setdefault("min_models", 1)
    out.setdefault("max_models", 1)
    out.setdefault("default_equipment", [])
    return out


def _normalise_datasheet(raw: dict) -> dict:
    """
    Normalise a raw datasheet dict to match the UnitDatasheet model.
    """
    out = dict(raw)

    # Normalise stats
    if out.get("stats"):
        out["stats"] = _normalise_stats(out["stats"])
    else:
        out["stats"] = _normalise_stats({})

    # Normalise weapons
    out["weapons"] = [_normalise_weapon(w) for w in out.get("weapons", [])]

    # Ensure abilities has all expected keys
    abilities = out.get("abilities", {})
    abilities.setdefault("core", [])
    abilities.setdefault("faction", [])
    abilities.setdefault("other", [])
    abilities.setdefault("damaged", None)
    abilities.setdefault("damaged_description", None)
    out["abilities"] = abilities

    # Ensure composition has all expected keys
    comp = out.get("composition", {})
    comp.setdefault("models", [])
    comp.setdefault("equipment", "")
    comp.setdefault("points", [])
    out["composition"] = comp

    # Normalise model definitions and wargear options
    out["model_definitions"] = [
        _normalise_model_definition(md) for md in out.get("model_definitions", [])
    ]
    out["wargear_options"] = [
        _normalise_wargear_option(wo) for wo in out.get("wargear_options", [])
    ]

    return out


def _normalise_faction(raw: dict) -> dict:
    """Normalise a raw faction dict."""
    out = dict(raw)
    out["datasheets"] = [_normalise_datasheet(ds) for ds in out.get("datasheets", [])]
    out.setdefault("datasheet_count", len(out["datasheets"]))
    return out


def load_json(path: Union[str, Path]) -> GameData:
    """
    Load a combined JSON file (output of wahapedia_scraper.py) and return
    a fully typed GameData model.

    The JSON should have the structure:
        {
            "game": "Warhammer 40,000",
            "edition": "10th",
            "total_datasheets": 1632,
            "factions": [ ... ]
        }

    Args:
        path: Path to the JSON file.

    Returns:
        A GameData instance with all factions and datasheets hydrated.
    """
    path = Path(path)
    with open(path, "r", encoding="utf-8") as f:
        raw = json.load(f)

    # Normalise each faction
    raw["factions"] = [_normalise_faction(f) for f in raw.get("factions", [])]

    return GameData.model_validate(raw)


def load_faction(path: Union[str, Path]) -> Faction:
    """
    Load a single faction JSON file. This works with either:
      - A top-level faction object:  {"faction": "Aeldari", "datasheets": [...]}
      - A full game file:            {"factions": [{"faction": "Aeldari", ...}]}
        (returns the first faction)

    Args:
        path: Path to the JSON file.

    Returns:
        A Faction instance.
    """
    path = Path(path)
    with open(path, "r", encoding="utf-8") as f:
        raw = json.load(f)

    if "factions" in raw:
        # It's a full game file — return the first faction
        faction_raw = raw["factions"][0]
    elif "datasheets" in raw:
        faction_raw = raw
    else:
        raise ValueError(f"Unrecognised JSON structure in {path}")

    faction_raw = _normalise_faction(faction_raw)
    return Faction.model_validate(faction_raw)


def load_directory(path: Union[str, Path]) -> GameData:
    """
    Load all JSON files from a directory, each assumed to be a single
    faction (or a combined game file). Merges them into one GameData.

    Args:
        path: Directory containing JSON files.

    Returns:
        A GameData instance with all factions merged.
    """
    path = Path(path)
    if not path.is_dir():
        raise ValueError(f"{path} is not a directory")

    factions: list[Faction] = []
    for json_file in sorted(path.glob("*.json")):
        with open(json_file, "r", encoding="utf-8") as f:
            raw = json.load(f)

        if "factions" in raw:
            # Combined file — load all factions from it
            for faction_raw in raw["factions"]:
                faction_raw = _normalise_faction(faction_raw)
                factions.append(Faction.model_validate(faction_raw))
        elif "datasheets" in raw:
            # Single faction file
            faction_raw = _normalise_faction(raw)
            factions.append(Faction.model_validate(faction_raw))

    total = sum(len(f.datasheets) for f in factions)

    return GameData(
        game="Warhammer 40,000",
        edition="10th",
        total_datasheets=total,
        factions=factions,
    )


# ---------------------------------------------------------------------------
# Rules loaders
# ---------------------------------------------------------------------------

def _normalise_stratagem(raw: dict) -> dict:
    """Normalise a raw stratagem dict for the Stratagem model."""
    out = dict(raw)
    out.setdefault("cp_cost", 0)
    out.setdefault("type", "")
    out.setdefault("category", "")
    out.setdefault("turn", "either")
    out.setdefault("when", "")
    out.setdefault("target", "")
    out.setdefault("effect", "")
    out.setdefault("restrictions", "")
    out.setdefault("cost", "")
    out.setdefault("fluff", "")
    out.setdefault("keywords_mentioned", [])
    out.setdefault("target_keywords", [])
    return out


def _normalise_enhancement(raw: dict) -> dict:
    """Normalise a raw enhancement dict for the Enhancement model."""
    out = dict(raw)
    out.setdefault("points", 0)
    out.setdefault("description", "")
    out.setdefault("keyword_restrictions", [])
    out.setdefault("keywords_mentioned", [])
    return out


def _normalise_detachment(raw: dict) -> dict:
    """Normalise a raw detachment dict for the Detachment model."""
    out = dict(raw)

    # Normalise rule
    rule = out.get("rule")
    if rule and isinstance(rule, dict):
        rule.setdefault("name", "")
        rule.setdefault("description", "")
        rule.setdefault("keywords_mentioned", [])
    elif rule is None or rule == "":
        out["rule"] = None

    # Normalise stratagems and enhancements
    out["stratagems"] = [_normalise_stratagem(s) for s in out.get("stratagems", [])]
    out["enhancements"] = [_normalise_enhancement(e) for e in out.get("enhancements", [])]

    return out


def _normalise_faction_rules(raw: dict) -> dict:
    """Normalise a raw faction rules dict for the FactionRules model."""
    out = dict(raw)

    # Normalise army_rules
    army_rules = out.get("army_rules", [])
    normalised_rules = []
    for ar in army_rules:
        if isinstance(ar, dict):
            ar.setdefault("name", "")
            ar.setdefault("description", "")
            normalised_rules.append(ar)
        elif isinstance(ar, str):
            normalised_rules.append({"name": ar, "description": ""})
    out["army_rules"] = normalised_rules

    # Normalise detachments
    out["detachments"] = [_normalise_detachment(d) for d in out.get("detachments", [])]
    out.setdefault("detachment_count", len(out["detachments"]))

    return out


def load_rules_json(path: Union[str, Path]) -> RulesData:
    """
    Load a combined rules JSON file (output of wahapedia_rules_scraper.py)
    and return a fully typed RulesData model.

    The JSON should have the structure:
        {
            "game": "Warhammer 40,000",
            "edition": "10th",
            "total_detachments": 50,
            "total_stratagems": 319,
            "total_enhancements": 178,
            "factions": [ ... ]
        }

    Args:
        path: Path to the JSON file.

    Returns:
        A RulesData instance with all faction rules hydrated.
    """
    path = Path(path)
    with open(path, "r", encoding="utf-8") as f:
        raw = json.load(f)

    raw["factions"] = [_normalise_faction_rules(f) for f in raw.get("factions", [])]

    return RulesData.model_validate(raw)


def load_rules_directory(path: Union[str, Path]) -> RulesData:
    """
    Load all rules JSON files from a directory and merge them into
    one RulesData.

    Args:
        path: Directory containing rules JSON files.

    Returns:
        A RulesData instance with all faction rules merged.
    """
    path = Path(path)
    if not path.is_dir():
        raise ValueError(f"{path} is not a directory")

    all_factions: list[FactionRules] = []
    for json_file in sorted(path.glob("*.json")):
        with open(json_file, "r", encoding="utf-8") as f:
            raw = json.load(f)

        if "factions" in raw:
            for faction_raw in raw["factions"]:
                faction_raw = _normalise_faction_rules(faction_raw)
                all_factions.append(FactionRules.model_validate(faction_raw))
        elif "detachments" in raw:
            faction_raw = _normalise_faction_rules(raw)
            all_factions.append(FactionRules.model_validate(faction_raw))

    total_det = sum(len(f.detachments) for f in all_factions)
    total_strat = sum(len(f.all_stratagems()) for f in all_factions)
    total_enh = sum(len(f.all_enhancements()) for f in all_factions)

    return RulesData(
        game="Warhammer 40,000",
        edition="10th",
        total_detachments=total_det,
        total_stratagems=total_strat,
        total_enhancements=total_enh,
        factions=all_factions,
    )


# ---------------------------------------------------------------------------
# Split-faction loaders (per-faction lazy loading)
# ---------------------------------------------------------------------------

class FactionIndex:
    """
    Lightweight index of available factions loaded from a split directory.

    Provides faction metadata without loading any datasheet or rules data.
    Use ``load_faction_by_slug`` or ``load_faction_rules_by_slug`` to
    load individual factions on demand.

    Attributes:
        base_dir:  Path to the split factions directory.
        factions:  List of faction metadata dicts from index.json.
        by_slug:   Dict mapping slug → faction metadata.
        by_name:   Dict mapping faction name (case-insensitive) → faction metadata.
    """

    def __init__(self, base_dir: Union[str, Path], index_data: dict):
        self.base_dir = Path(base_dir)
        self.game: str = index_data.get("game", "Warhammer 40,000")
        self.edition: str = index_data.get("edition", "10th")
        self.faction_count: int = index_data.get("faction_count", 0)
        self.total_datasheets: int = index_data.get("total_datasheets", 0)
        self.factions: list[dict] = index_data.get("factions", [])
        self.by_slug: dict[str, dict] = {f["slug"]: f for f in self.factions}
        self.by_name: dict[str, dict] = {
            f["faction"].lower(): f for f in self.factions
        }

    def get_faction_meta(self, name_or_slug: str) -> dict | None:
        """Look up a faction entry by slug or name (case-insensitive)."""
        entry = self.by_slug.get(name_or_slug)
        if entry:
            return entry
        return self.by_name.get(name_or_slug.lower())

    def faction_names(self) -> list[str]:
        """Return sorted list of faction names."""
        return [f["faction"] for f in self.factions]

    def faction_slugs(self) -> list[str]:
        """Return sorted list of faction slugs."""
        return [f["slug"] for f in self.factions]


def load_index(base_dir: Union[str, Path]) -> FactionIndex:
    """
    Load the faction index from a split factions directory.

    Args:
        base_dir: Path to the directory containing index.json.

    Returns:
        A FactionIndex with metadata for all factions.
    """
    base_dir = Path(base_dir)
    index_path = base_dir / "index.json"
    with open(index_path, "r", encoding="utf-8") as f:
        index_data = json.load(f)
    return FactionIndex(base_dir, index_data)


def load_faction_by_slug(
    base_dir: Union[str, Path],
    slug: str,
    index: FactionIndex | None = None,
) -> Faction:
    """
    Load a single faction's datasheets from the split directory.

    Args:
        base_dir: Path to the split factions directory.
        slug: Faction slug (e.g. "space-marines") or faction name.
        index: Optional pre-loaded FactionIndex (avoids re-reading index.json).

    Returns:
        A Faction instance with all datasheets hydrated.
    """
    base_dir = Path(base_dir)

    if index:
        meta = index.get_faction_meta(slug)
    else:
        idx = load_index(base_dir)
        meta = idx.get_faction_meta(slug)

    if meta is None:
        raise ValueError(f"Unknown faction: {slug}")

    ds_file = meta.get("datasheet_file")
    if not ds_file:
        raise ValueError(f"No datasheet file for faction: {slug}")

    ds_path = base_dir / ds_file
    with open(ds_path, "r", encoding="utf-8") as f:
        raw = json.load(f)

    faction_raw = _normalise_faction(raw)
    return Faction.model_validate(faction_raw)


def load_faction_rules_by_slug(
    base_dir: Union[str, Path],
    slug: str,
    index: FactionIndex | None = None,
) -> FactionRules:
    """
    Load a single faction's rules from the split directory.

    Args:
        base_dir: Path to the split factions directory.
        slug: Faction slug (e.g. "space-marines") or faction name.
        index: Optional pre-loaded FactionIndex (avoids re-reading index.json).

    Returns:
        A FactionRules instance with detachments, stratagems, and enhancements.
    """
    base_dir = Path(base_dir)

    if index:
        meta = index.get_faction_meta(slug)
    else:
        idx = load_index(base_dir)
        meta = idx.get_faction_meta(slug)

    if meta is None:
        raise ValueError(f"Unknown faction: {slug}")

    rules_file = meta.get("rules_file")
    if not rules_file:
        raise ValueError(f"No rules file for faction: {slug}")

    rules_path = base_dir / rules_file
    with open(rules_path, "r", encoding="utf-8") as f:
        raw = json.load(f)

    faction_raw = _normalise_faction_rules(raw)
    return FactionRules.model_validate(faction_raw)
