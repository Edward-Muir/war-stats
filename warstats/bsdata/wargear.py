"""
Convert BattleScribe selectionEntryGroups into our v2 SelectionGroup format.

BattleScribe models wargear options as nested selection trees with constraints.
We flatten these into SelectionGroup objects with min/max and selection lists.
"""

from __future__ import annotations

import xml.etree.ElementTree as ET
from typing import Any

from .registry import (
    GST_NS,
    CatalogueRegistry,
    get_characteristics,
)
from .extractor import slugify_weapon, _get_constraints


def extract_selection_groups(
    parent_elem: ET.Element,
    ns: str,
    registry: CatalogueRegistry,
    weapon_registry: dict[str, dict],
) -> list[dict[str, Any]]:
    """
    Extract SelectionGroup objects from a model or unit element.

    Looks for selectionEntryGroups that represent equipment choices
    (not model-count groups or configuration groups).
    """
    groups: list[dict[str, Any]] = []
    seg_tag = f"{{{ns}}}selectionEntryGroup"

    # Direct child groups
    groups_container = parent_elem.find(f"./{{{ns}}}selectionEntryGroups")
    if groups_container is None:
        return groups

    for group in groups_container:
        if group.tag != seg_tag:
            continue

        group_name = group.get("name", "")

        # Skip non-equipment groups (model count groups, crusade, detachment, etc.)
        if _is_non_equipment_group(group_name):
            continue

        # Skip groups that contain model-type entries (those are model composition)
        if _has_model_entries(group, ns):
            continue

        sg = _convert_group(group, ns, registry, weapon_registry)
        if sg and sg["selections"]:
            groups.append(sg)

    # Also check upgrade-type selectionEntries that contain weapon choices
    entries_container = parent_elem.find(f"./{{{ns}}}selectionEntries")
    if entries_container is not None:
        for entry in entries_container:
            if entry.get("type") != "upgrade":
                continue
            # Check if this upgrade entry has sub-groups (weapon option menus)
            for sub_group in entry.findall(f"./{{{ns}}}selectionEntryGroups/{{{ns}}}selectionEntryGroup"):
                group_name = sub_group.get("name", "")
                if _is_non_equipment_group(group_name):
                    continue
                sg = _convert_group(sub_group, ns, registry, weapon_registry)
                if sg and sg["selections"]:
                    groups.append(sg)

    return groups


def _convert_group(
    group: ET.Element,
    ns: str,
    registry: CatalogueRegistry,
    weapon_registry: dict[str, dict],
) -> dict[str, Any] | None:
    """Convert a single selectionEntryGroup into a SelectionGroup dict."""
    group_name = group.get("name", "")
    group_id = group.get("id", "")

    min_val, max_val = _get_constraints(group, ns)

    # Default selection
    default_id = group.get("defaultSelectionEntryId")

    # Collect selections from child entries and entryLinks
    selections: list[dict[str, Any]] = []

    se_tag = f"{{{ns}}}selectionEntry"
    el_tag = f"{{{ns}}}entryLink"

    # Direct child selection entries
    entries_container = group.find(f"./{{{ns}}}selectionEntries")
    if entries_container is not None:
        for entry in entries_container:
            if entry.tag != se_tag:
                continue
            sel = _entry_to_selection(entry, ns, registry, weapon_registry)
            if sel:
                selections.append(sel)

    # EntryLinks in the group
    links_container = group.find(f"./{{{ns}}}entryLinks")
    if links_container is not None:
        for link in links_container:
            if link.tag != el_tag:
                continue
            target = registry.resolve_link(link)
            if target is not None:
                sel = _entry_to_selection(target, ns, registry, weapon_registry, link_id=link.get("id"))
                if sel:
                    selections.append(sel)

    # Also check for nested selectionEntryGroups (sub-menus)
    sub_groups_container = group.find(f"./{{{ns}}}selectionEntryGroups")
    if sub_groups_container is not None:
        for sub_group in sub_groups_container:
            # Recurse for nested groups
            sub_sg = _convert_group(sub_group, ns, registry, weapon_registry)
            if sub_sg and sub_sg["selections"]:
                # Flatten nested groups into selections with composite labels
                for sel in sub_sg["selections"]:
                    sel["label"] = f"{sub_sg['name']}: {sel['label']}" if sub_sg["name"] else sel["label"]
                    selections.append(sel)

    if not selections:
        return None

    # Determine default selection ID
    default_sel_id = None
    if default_id:
        # Map from BattleScribe entry ID to our selection ID
        for sel in selections:
            if sel.get("_bsEntryId") == default_id:
                default_sel_id = sel["id"]
                break

    # Clean up internal fields
    for sel in selections:
        sel.pop("_bsEntryId", None)

    return {
        "id": group_id,
        "name": group_name,
        "min": min_val,
        "max": max_val,
        "defaultSelectionId": default_sel_id,
        "selections": selections,
    }


def _entry_to_selection(
    entry: ET.Element,
    ns: str,
    registry: CatalogueRegistry,
    weapon_registry: dict[str, dict],
    link_id: str | None = None,
) -> dict[str, Any] | None:
    """Convert a selectionEntry (upgrade type) into a Selection dict."""
    entry_name = entry.get("name", "").strip()
    entry_id = link_id or entry.get("id", "")

    if not entry_name:
        return None

    # Skip hidden entries
    if entry.get("hidden", "false") == "true":
        return None

    # Collect weapon IDs granted by this selection
    weapon_ids: list[str] = []
    profile_tag = f"{{{ns}}}profile"

    # Weapons in this entry's profiles
    for profile in entry.iter(profile_tag):
        type_name = profile.get("typeName", "")
        if type_name in ("Ranged Weapons", "Melee Weapons"):
            wid = slugify_weapon(profile.get("name", ""))
            if wid and wid not in weapon_ids:
                # Also ensure the weapon is in the registry
                if wid in weapon_registry:
                    weapon_ids.append(wid)

    # Also check GST namespace profiles
    for profile in entry.iter(f"{{{GST_NS}}}profile"):
        type_name = profile.get("typeName", "")
        if type_name in ("Ranged Weapons", "Melee Weapons"):
            wid = slugify_weapon(profile.get("name", ""))
            if wid and wid not in weapon_ids and wid in weapon_registry:
                weapon_ids.append(wid)

    # Check entryLinks within this entry for additional weapons
    for link in entry.iter(f"{{{ns}}}entryLink"):
        target = registry.resolve_link(link)
        if target is None:
            continue
        for profile in target.iter(profile_tag):
            type_name = profile.get("typeName", "")
            if type_name in ("Ranged Weapons", "Melee Weapons"):
                wid = slugify_weapon(profile.get("name", ""))
                if wid and wid not in weapon_ids and wid in weapon_registry:
                    weapon_ids.append(wid)
        for profile in target.iter(f"{{{GST_NS}}}profile"):
            type_name = profile.get("typeName", "")
            if type_name in ("Ranged Weapons", "Melee Weapons"):
                wid = slugify_weapon(profile.get("name", ""))
                if wid and wid not in weapon_ids and wid in weapon_registry:
                    weapon_ids.append(wid)

    # Get points delta
    points_delta = 0
    for cost in entry.iter(f"{{{ns}}}cost"):
        if cost.get("name") == "pts":
            try:
                points_delta = int(float(cost.get("value", "0")))
            except ValueError:
                pass
            break

    return {
        "id": entry_id,
        "_bsEntryId": entry.get("id", ""),  # Internal: used for default matching
        "label": entry_name,
        "weaponIds": weapon_ids,
        "pointsDelta": points_delta,
    }


def _is_non_equipment_group(name: str) -> bool:
    """Check if a group name indicates a non-equipment group."""
    skip_names = {
        "crusade", "weapon modifications", "detachment", "detachment rules",
        "configuration", "army faction", "game type", "battle size",
        "faction upgrades", "enhancements", "warlord", "subfaction",
    }
    return name.lower().strip() in skip_names


def _has_model_entries(group: ET.Element, ns: str) -> bool:
    """Check if a group contains model-type selectionEntries."""
    se_tag = f"{{{ns}}}selectionEntry"
    entries = group.find(f"./{{{ns}}}selectionEntries")
    if entries is None:
        return False
    for entry in entries:
        if entry.tag == se_tag and entry.get("type") == "model":
            return True
    return False
