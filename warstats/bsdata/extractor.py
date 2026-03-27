"""
Extract unit datasheets from BattleScribe XML elements into our v2 JSON format.

Handles: stats, weapons, abilities, keywords, points, model definitions,
invulnerable saves, leader info, and composition.
"""

from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from typing import Any

from .registry import (
    CAT_NS,
    GST_NS,
    ABILITIES_TYPE,
    MELEE_WEAPON_TYPE,
    POINTS_COST_TYPE,
    RANGED_WEAPON_TYPE,
    UNIT_PROFILE_TYPE,
    CatalogueRegistry,
    Catalogue,
    get_characteristics,
)


def slugify_weapon(name: str) -> str:
    """Generate a stable weapon ID from its name."""
    s = name.lower().strip()
    s = re.sub(r"[''']", "", s)
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def extract_unit(
    unit_elem: ET.Element,
    unit_name: str,
    registry: CatalogueRegistry,
    source_cat: Catalogue,
) -> dict[str, Any] | None:
    """
    Convert a BattleScribe unit selectionEntry into our v2 datasheet dict.

    Returns None if the unit should be skipped (e.g. Legends units).
    """
    ns = source_cat.ns

    # Skip Legends units
    if "[Legends]" in unit_name or "[Legend]" in unit_name:
        return None

    # ── Weapon registry ──
    weapon_registry: dict[str, dict] = {}  # weapon_id -> weapon profile dict
    _collect_weapons(unit_elem, ns, registry, weapon_registry)

    # ── Unit-level profiles ──
    stats = _extract_unit_stats(unit_elem, ns, registry)
    abilities = _extract_abilities(unit_elem, ns, registry)
    invuln = _extract_invulnerable_save(unit_elem, ns, registry)
    keywords, faction_keywords = _extract_keywords(unit_elem, ns, registry)
    points_options = _extract_points(unit_elem, ns)
    leader_units = _extract_leader_units(unit_elem, ns, registry)

    # ── Model definitions + selection groups ──
    models = _extract_model_definitions(unit_elem, ns, registry, weapon_registry, stats)

    # If no model definitions were found, create a single one from the unit itself
    if not models:
        all_weapon_ids = list(weapon_registry.keys())
        models = [{
            "id": slugify_weapon(unit_name),
            "name": unit_name,
            "min": 1,
            "max": 1,
            "stats": stats,
            "defaultWeaponIds": all_weapon_ids,
            "selectionGroups": [],
        }]

    # Build composition
    composition = _build_composition(models, weapon_registry, points_options)

    return {
        "name": unit_name,
        "baseSize": "",
        "lore": "",
        "invulnerableSave": invuln,
        "weapons": weapon_registry,
        "abilities": abilities,
        "keywords": keywords,
        "factionKeywords": faction_keywords,
        "models": models,
        "composition": composition,
        "leaderUnits": leader_units,
    }


# ── Stats ──

def _extract_unit_stats(elem: ET.Element, ns: str, registry: CatalogueRegistry | None = None) -> dict[str, str]:
    """Extract M/T/Sv/W/Ld/OC from the first Unit profile found."""
    profile_tag = f"{{{ns}}}profile"
    info_link_tag = f"{{{ns}}}infoLink"

    def normalize_movement(m: str) -> str:
        """Ensure movement stat ends with double-quote."""
        m = m.strip()
        if m and not m.endswith('"') and m != '-' and m.lower() not in ('n/a', '*'):
            return m + '"'
        return m

    # First, check for inline profiles
    for profile in elem.iter(profile_tag):
        if profile.get("typeName") == "Unit":
            chars = get_characteristics(profile, ns)
            return {
                "M": normalize_movement(chars.get("M", "")),
                "T": chars.get("T", ""),
                "Sv": chars.get("SV", chars.get("Sv", "")),
                "W": chars.get("W", ""),
                "Ld": chars.get("LD", chars.get("Ld", "")),
                "OC": chars.get("OC", ""),
            }

    # If no inline profile found, check for infoLinks to Unit profiles
    if registry:
        for link in elem.iter(info_link_tag):
            if link.get("type") == "profile":
                target = registry.resolve_link(link)
                if target is not None and target.get("typeName") == "Unit":
                    chars = get_characteristics(target, ns)
                    return {
                        "M": normalize_movement(chars.get("M", "")),
                        "T": chars.get("T", ""),
                        "Sv": chars.get("SV", chars.get("Sv", "")),
                        "W": chars.get("W", ""),
                        "Ld": chars.get("LD", chars.get("Ld", "")),
                        "OC": chars.get("OC", ""),
                    }
                # Also check GST namespace
                elif target is not None:
                    profile_tag_gst = f"{{{GST_NS}}}profile"
                    if target.tag == profile_tag_gst and target.get("typeName") == "Unit":
                        chars = get_characteristics(target, GST_NS)
                        return {
                            "M": normalize_movement(chars.get("M", "")),
                            "T": chars.get("T", ""),
                            "Sv": chars.get("SV", chars.get("Sv", "")),
                            "W": chars.get("W", ""),
                            "Ld": chars.get("LD", chars.get("Ld", "")),
                            "OC": chars.get("OC", ""),
                        }

    return {"M": "", "T": "", "Sv": "", "W": "", "Ld": "", "OC": ""}


# ── Weapons ──

def _collect_weapons(
    elem: ET.Element,
    ns: str,
    registry: CatalogueRegistry,
    weapon_registry: dict[str, dict],
) -> None:
    """
    Walk the element tree collecting all weapon profiles.
    Resolves entryLinks to shared weapon definitions.
    Also adds weapon IDs to the registry, deduplicating by name.
    """
    profile_tag = f"{{{ns}}}profile"
    entry_link_tag = f"{{{ns}}}entryLink"

    # Collect from inline profiles
    for profile in elem.iter(profile_tag):
        type_name = profile.get("typeName", "")
        if type_name in ("Ranged Weapons", "Melee Weapons"):
            weapon = _parse_weapon_profile(profile, ns, type_name)
            if weapon:
                weapon_registry[weapon["_id"]] = weapon

    # Resolve entryLinks that point to shared weapon entries
    for link in elem.iter(entry_link_tag):
        target = registry.resolve_link(link)
        if target is None:
            continue
        # Check if the target contains weapon profiles
        for profile in target.iter(profile_tag):
            type_name = profile.get("typeName", "")
            if type_name in ("Ranged Weapons", "Melee Weapons"):
                weapon = _parse_weapon_profile(profile, ns, type_name)
                if weapon:
                    weapon_registry[weapon["_id"]] = weapon
        # Also check the GST namespace if the link crossed from a .cat to .gst
        for profile in target.iter(f"{{{GST_NS}}}profile"):
            type_name = profile.get("typeName", "")
            if type_name in ("Ranged Weapons", "Melee Weapons"):
                weapon = _parse_weapon_profile(profile, GST_NS, type_name)
                if weapon:
                    weapon_registry[weapon["_id"]] = weapon


def _parse_weapon_profile(
    profile: ET.Element, ns: str, type_name: str
) -> dict | None:
    """Parse a weapon profile element into a weapon dict."""
    name = profile.get("name", "").strip()
    if not name:
        return None

    chars = get_characteristics(profile, ns)
    weapon_type = "ranged" if type_name == "Ranged Weapons" else "melee"

    # Parse keywords from comma-separated string
    keywords_raw = chars.get("Keywords", "-")
    keywords = []
    if keywords_raw and keywords_raw not in ("-", "–", ""):
        keywords = [kw.strip().lower() for kw in keywords_raw.split(",") if kw.strip()]

    weapon_id = slugify_weapon(name)

    skill_key = "BS" if weapon_type == "ranged" else "WS"
    skill_value = chars.get(skill_key, chars.get("BS", chars.get("WS")))

    weapon = {
        "_id": weapon_id,
        "name": name,
        "type": weapon_type,
        "range": chars.get("Range", "Melee" if weapon_type == "melee" else ""),
        "A": chars.get("A", ""),
        "S": chars.get("S", ""),
        "AP": chars.get("AP", "0"),
        "D": chars.get("D", ""),
        "keywords": keywords,
    }
    # Set the correct skill field
    if weapon_type == "ranged":
        weapon["BS"] = skill_value or ""
        weapon["WS"] = None
    else:
        weapon["WS"] = skill_value or ""
        weapon["BS"] = None

    return weapon


# ── Abilities ──

def _extract_abilities(
    elem: ET.Element, ns: str, registry: CatalogueRegistry
) -> dict[str, Any]:
    """Extract abilities, classifying them as core/faction/other."""
    core: list[str] = []
    faction: list[str] = []
    other: list[dict[str, str]] = []
    feel_no_pain: int | None = None
    damaged: dict[str, str] | None = None

    profile_tag = f"{{{ns}}}profile"
    rule_tag = f"{{{ns}}}rule"
    info_link_tag = f"{{{ns}}}infoLink"

    # Collect from infoLinks to shared rules (these are typically core abilities)
    for link in elem.iter(info_link_tag):
        if link.get("type") == "rule":
            rule_name = link.get("name", "")
            if rule_name and rule_name in registry.core_ability_names:
                if rule_name not in core:
                    core.append(rule_name)

    # Collect from inline ability profiles
    for profile in elem.iter(profile_tag):
        if profile.get("typeName") != "Abilities":
            continue
        name = profile.get("name", "").strip()
        chars = get_characteristics(profile, ns)
        desc = chars.get("Description", "")

        if not name:
            continue

        # Check if it's an invulnerable save (handled separately)
        if "invulnerable save" in name.lower():
            continue

        # Check for Feel No Pain
        fnp_match = re.search(r"(\d)\+.*(?:ignore|is not lost|feel no pain)", desc, re.IGNORECASE)
        if not fnp_match:
            fnp_match = re.search(r"feel no pain (\d)\+", desc, re.IGNORECASE)
        if fnp_match:
            fnp_val = int(fnp_match.group(1))
            if feel_no_pain is None or fnp_val < feel_no_pain:
                feel_no_pain = fnp_val

        # Check for damaged profile
        dmg_match = re.search(r"(\d+[-–]\d+\s*wounds?\s*remaining)", name + " " + desc, re.IGNORECASE)
        if dmg_match or "damaged" in name.lower():
            damaged = {
                "threshold": dmg_match.group(1) if dmg_match else name,
                "description": desc,
            }
            continue

        # Classify: is this a core ability?
        if name in registry.core_ability_names:
            if name not in core:
                core.append(name)
        else:
            other.append({"name": name, "description": desc})

    # Also resolve entryLinks that point to ability-carrying elements
    for link in elem.iter(info_link_tag):
        if link.get("type") != "rule":
            continue
        target = registry.resolve_link(link)
        if target is not None:
            rule_name = target.get("name", link.get("name", ""))
            if rule_name in registry.core_ability_names and rule_name not in core:
                core.append(rule_name)

    return {
        "core": core,
        "faction": faction,  # Will be populated from faction rule names
        "other": other,
        "feelNoPain": feel_no_pain,
        "damaged": damaged,
    }


def _extract_invulnerable_save(
    elem: ET.Element, ns: str, registry: CatalogueRegistry
) -> str | None:
    """Extract invulnerable save from ability profiles."""
    profile_tag = f"{{{ns}}}profile"

    for profile in elem.iter(profile_tag):
        if profile.get("typeName") != "Abilities":
            continue
        name = profile.get("name", "").lower()
        if "invulnerable" not in name:
            continue
        chars = get_characteristics(profile, ns)
        desc = chars.get("Description", "")

        # Extract the value (e.g., "4+" from "This model has a 4+ invulnerable save")
        match = re.search(r"(\d\+)\s*invulnerable", desc, re.IGNORECASE)
        if match:
            return match.group(1)
        # Also try the ability name itself
        match = re.search(r"(\d\+)", name)
        if match:
            return match.group(1)

    return None


# ── Keywords ──

def _extract_keywords(
    elem: ET.Element, ns: str, registry: CatalogueRegistry
) -> tuple[list[str], list[str]]:
    """Extract unit keywords and faction keywords from categoryLinks."""
    keywords: list[str] = []
    faction_keywords: list[str] = []

    # BattleScribe internal categories to skip (not game keywords)
    SKIP_CATEGORIES = {
        "ATTACKS DX WEAPON", "DAMAGE DX WEAPON", "UNIT", "MODEL",
        "CONFIGURATION", "CRUSADE", "UNCATEGORISED",
        "MELEE WEAPON", "RANGED WEAPON"
    }

    cat_link_tag = f"{{{ns}}}categoryLink"

    for link in elem.iter(cat_link_tag):
        target_id = link.get("targetId", "")
        name = link.get("name", "")

        if not name:
            # Try looking up from the category registry
            name = registry.categories.get(target_id, "")

        if not name:
            continue

        # Faction keywords are prefixed with "Faction: " in BattleScribe
        if name.startswith("Faction: "):
            fk = name[len("Faction: "):].strip().upper()
            if fk and fk not in faction_keywords:
                faction_keywords.append(fk)
        else:
            kw = name.upper()
            if kw and kw not in keywords and kw not in SKIP_CATEGORIES:
                keywords.append(kw)

    return keywords, faction_keywords


# ── Points ──

def _extract_points(elem: ET.Element, ns: str) -> list[dict[str, str]]:
    """Extract points cost(s) from the unit element."""
    cost_tag = f"{{{ns}}}cost"
    modifier_tag = f"{{{ns}}}modifier"
    condition_tag = f"{{{ns}}}condition"

    base_pts = 0
    for cost in elem.findall(f"./{{{ns}}}costs/{{{ns}}}cost"):
        if cost.get("name") == "pts":
            try:
                base_pts = int(float(cost.get("value", "0")))
            except ValueError:
                pass
            break

    # Check for modifier-based points scaling (e.g., Necron Warriors: 90 for 10, 200 for 20)
    points_tiers: list[tuple[int, int]] = []  # (threshold, pts)

    for mod in elem.findall(f"./{{{ns}}}modifiers/{{{ns}}}modifier"):
        field = mod.get("field", "")
        if field != POINTS_COST_TYPE:
            continue
        mod_type = mod.get("type", "")
        if mod_type != "set":
            continue
        try:
            pts_value = int(float(mod.get("value", "0")))
        except ValueError:
            continue

        # Look for the condition that triggers this tier
        for cond in mod.iter(condition_tag):
            if cond.get("type") == "atLeast":
                try:
                    threshold = int(float(cond.get("value", "0")))
                    points_tiers.append((threshold, pts_value))
                except ValueError:
                    pass

    if not points_tiers:
        # Single points tier
        return [{"models": "1 model" if base_pts > 0 else "", "points": str(base_pts)}]

    # Sort tiers by threshold and build options
    # The base cost applies below the first threshold
    points_tiers.sort(key=lambda t: t[0])

    # Figure out model counts from the tiers
    result: list[dict[str, str]] = []
    min_models = points_tiers[0][0] - 1 if points_tiers else 1
    if min_models < 1:
        min_models = 1

    # Base tier
    if base_pts > 0:
        result.append({
            "models": f"{min_models} model{'s' if min_models != 1 else ''}",
            "points": str(base_pts),
        })

    for threshold, pts in points_tiers:
        result.append({
            "models": f"{threshold} models",
            "points": str(pts),
        })

    return result


# ── Leader Units ──

def _extract_leader_units(
    elem: ET.Element, ns: str, registry: CatalogueRegistry
) -> list[str]:
    """Extract leader unit names from Leader ability description text."""
    profile_tag = f"{{{ns}}}profile"

    for profile in elem.iter(profile_tag):
        if profile.get("typeName") != "Abilities":
            continue
        name = profile.get("name", "")
        if name != "Leader":
            continue
        chars = get_characteristics(profile, ns)
        desc = chars.get("Description", "")

        # Parse "This model can be attached to the following units: UnitA, UnitB"
        match = re.search(r"attached to the following units?:\s*(.+?)(?:\.|$)", desc, re.IGNORECASE)
        if match:
            units_text = match.group(1)
            # Split on commas, clean up
            units = [u.strip() for u in units_text.split(",") if u.strip()]
            # Remove trailing periods, HTML entities
            units = [re.sub(r"[.\s]+$", "", u) for u in units]
            return units

    return []


# ── Model Definitions ──

def _extract_model_definitions(
    unit_elem: ET.Element,
    ns: str,
    registry: CatalogueRegistry,
    weapon_registry: dict[str, dict],
    unit_stats: dict[str, str],
) -> list[dict[str, Any]]:
    """
    Extract model definitions from the unit's selection tree.

    BattleScribe uses nested selectionEntry type="model" or
    selectionEntryGroup containing model entries to define composition.
    """
    models: list[dict[str, Any]] = []
    se_tag = f"{{{ns}}}selectionEntry"
    seg_tag = f"{{{ns}}}selectionEntryGroup"
    constraint_tag = f"{{{ns}}}constraint"

    # Pattern 1: Direct model-type selectionEntries
    for entry in unit_elem.findall(f"./{{{ns}}}selectionEntries/{{{ns}}}selectionEntry"):
        if entry.get("type") == "model":
            model = _parse_model_entry(entry, ns, registry, weapon_registry, unit_stats)
            if model:
                models.append(model)

    # Pattern 2: selectionEntryGroups containing model entries
    for group in unit_elem.findall(f"./{{{ns}}}selectionEntryGroups/{{{ns}}}selectionEntryGroup"):
        min_val, max_val = _get_constraints(group, ns)
        for entry in group.iter(se_tag):
            if entry.get("type") == "model":
                model = _parse_model_entry(entry, ns, registry, weapon_registry, unit_stats)
                if model:
                    # Override min/max from group if model doesn't have its own
                    if model["min"] == 0 and model["max"] == 0:
                        model["min"] = min_val
                        model["max"] = max_val
                    models.append(model)

    return models


def _parse_model_entry(
    entry: ET.Element,
    ns: str,
    registry: CatalogueRegistry,
    weapon_registry: dict[str, dict],
    fallback_stats: dict[str, str],
) -> dict[str, Any] | None:
    """Parse a model-type selectionEntry into a model definition dict."""
    name = entry.get("name", "").strip()
    if not name:
        return None

    # Get constraints
    min_val, max_val = _get_constraints(entry, ns)

    # Check for model-specific stats (some models override the unit profile)
    stats = _extract_unit_stats(entry, ns, registry)
    if not stats.get("T"):
        stats = fallback_stats.copy()

    # Collect this model's default weapons
    default_weapon_ids = _get_model_weapon_ids(entry, ns, registry, weapon_registry)

    # Build selection groups for this model
    from .wargear import extract_selection_groups
    selection_groups = extract_selection_groups(entry, ns, registry, weapon_registry)

    return {
        "id": slugify_weapon(name),
        "name": name,
        "min": min_val,
        "max": max_val,
        "stats": stats,
        "defaultWeaponIds": default_weapon_ids,
        "selectionGroups": selection_groups,
    }


def _get_model_weapon_ids(
    model_entry: ET.Element,
    ns: str,
    registry: CatalogueRegistry,
    weapon_registry: dict[str, dict],
) -> list[str]:
    """Get the default weapon IDs for a model entry."""
    weapon_ids: list[str] = []
    profile_tag = f"{{{ns}}}profile"
    entry_link_tag = f"{{{ns}}}entryLink"
    se_tag = f"{{{ns}}}selectionEntry"

    # Direct weapon profiles in this model's upgrade entries
    for child_entry in model_entry.findall(f"./{{{ns}}}selectionEntries/{{{ns}}}selectionEntry"):
        if child_entry.get("type") == "upgrade":
            for profile in child_entry.iter(profile_tag):
                type_name = profile.get("typeName", "")
                if type_name in ("Ranged Weapons", "Melee Weapons"):
                    wid = slugify_weapon(profile.get("name", ""))
                    if wid and wid in weapon_registry and wid not in weapon_ids:
                        weapon_ids.append(wid)

    # EntryLinks to shared weapons
    for link in model_entry.findall(f"./{{{ns}}}entryLinks/{{{ns}}}entryLink"):
        target = registry.resolve_link(link)
        if target is None:
            continue
        # Check if target has weapon profiles
        for profile in target.iter(profile_tag):
            type_name = profile.get("typeName", "")
            if type_name in ("Ranged Weapons", "Melee Weapons"):
                wid = slugify_weapon(profile.get("name", ""))
                if wid and wid in weapon_registry and wid not in weapon_ids:
                    weapon_ids.append(wid)
        # Also check GST namespace
        for profile in target.iter(f"{{{GST_NS}}}profile"):
            type_name = profile.get("typeName", "")
            if type_name in ("Ranged Weapons", "Melee Weapons"):
                wid = slugify_weapon(profile.get("name", ""))
                if wid and wid in weapon_registry and wid not in weapon_ids:
                    weapon_ids.append(wid)

    return weapon_ids


# ── Constraints ──

def _get_constraints(elem: ET.Element, ns: str) -> tuple[int, int]:
    """Extract min/max from an element's constraints."""
    constraint_tag = f"{{{ns}}}constraint"
    min_val = 0
    max_val = 0

    constraints = elem.find(f"./{{{ns}}}constraints")
    if constraints is None:
        return min_val, max_val

    for c in constraints:
        if c.tag != constraint_tag:
            continue
        if c.get("field") != "selections" or c.get("scope") != "parent":
            continue
        try:
            val = int(float(c.get("value", "0")))
        except ValueError:
            continue
        if c.get("type") == "min":
            min_val = val
        elif c.get("type") == "max":
            max_val = val

    return min_val, max_val


# ── Composition ──

def _build_composition(
    models: list[dict],
    weapon_registry: dict[str, dict],
    points_options: list[dict[str, str]],
) -> dict[str, Any]:
    """Build the composition field from model definitions."""
    model_strs: list[str] = []
    equipment_parts: list[str] = []

    for m in models:
        count = m.get("max", 1)
        if count == 1:
            model_strs.append(f"1 {m['name']}")
        else:
            model_strs.append(f"{m.get('min', 1)}-{count} {m['name']}")

        # Build default equipment string
        weapons = [weapon_registry[wid]["name"] for wid in m.get("defaultWeaponIds", []) if wid in weapon_registry]
        if weapons:
            equipment_parts.append("; ".join(weapons))

    equipment = "equipped with: " + "; ".join(equipment_parts) + "." if equipment_parts else ""

    return {
        "models": model_strs,
        "equipment": equipment,
        "points": points_options,
    }
