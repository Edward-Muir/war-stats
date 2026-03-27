#!/usr/bin/env python3
"""
Wahapedia 40K 10th Edition Datasheet Scraper
=============================================
Parses saved Wahapedia HTML pages and extracts all datasheets into
structured JSON. Designed for the Warhammer stats/damage calculator app.

Usage:
    python wahapedia_scraper.py <html_file_or_directory> [-o output.json]

The script works on locally-saved HTML files (use "Save As > Webpage, Complete"
in your browser). Point it at a single file or a directory of faction pages.
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path
from bs4 import BeautifulSoup, Tag


# ---------------------------------------------------------------------------
# Utility helpers
# ---------------------------------------------------------------------------

def clean_text(el) -> str:
    """Extract visible text from an element, normalising whitespace."""
    if el is None or isinstance(el, str):
        return el or ""
    text = el.get_text(separator=" ", strip=True)
    # Collapse multiple spaces / newlines
    text = re.sub(r"\s+", " ", text).strip()
    return text


def extract_weapon_keywords(name_cell) -> tuple[str, list[str]]:
    """
    Given the weapon-name <td>, return (weapon_name, [keyword, ...]).
    Keywords appear inside <span class="kwb2 ..."> or <span class="tt kwbu">.
    """
    # Collect keyword spans
    keywords = []
    for kw_span in name_cell.select("span.kwb2"):
        kw_text = clean_text(kw_span)
        if kw_text:
            # Normalise: strip brackets, lowercase
            kw_text = re.sub(r"[\[\]]", "", kw_text).strip()
            keywords.append(kw_text)

    # The weapon name is the text *before* keyword spans
    # Clone the cell and remove keyword spans to get clean name
    from copy import copy
    cell_copy = copy(name_cell)
    # Can't deep-copy BS4 easily; just get text and strip keywords
    full_text = clean_text(name_cell)
    weapon_name = full_text
    for kw in keywords:
        weapon_name = weapon_name.replace(kw, "")
    weapon_name = re.sub(r"\s+", " ", weapon_name).strip()

    return weapon_name, keywords


# ---------------------------------------------------------------------------
# Core parser
# ---------------------------------------------------------------------------

def parse_stats(profile_wrap) -> dict:
    """Parse the M/T/Sv/W/Ld/OC stat block from a dsProfileWrap div."""
    stats = {}
    # Standard units use dsCharWrap; aircraft/some vehicles use dsCharWrapM
    char_wraps = profile_wrap.select("div.dsCharWrap, div.dsCharWrapM")
    for char_wrap in char_wraps:
        name_el = char_wrap.select_one("div.dsCharName")
        # Value can be in dsCharValue or directly in dsCharFrame/dsCharFrameM
        value_el = char_wrap.select_one("div.dsCharValue")
        if not value_el:
            # Aircraft variant: value is in dsCharFrame or dsCharFrameM > dsCharFrameBack
            value_el = char_wrap.select_one("div.dsCharFrameBack")
            if not value_el:
                frame = char_wrap.select_one("div.dsCharFrame, div.dsCharFrameM")
                if frame:
                    value_el = frame
        if name_el and value_el:
            stat_name = clean_text(name_el)
            stat_value = clean_text(value_el)
            stats[stat_name] = stat_value
    return stats


def parse_invulnerable_save(datasheet_div) -> str | None:
    """Extract invulnerable save value if present."""
    invul_el = datasheet_div.select_one("div.dsCharInvulValue")
    if invul_el:
        return clean_text(invul_el)
    return None


def parse_weapon_table(table_tag, weapon_type: str) -> list[dict]:
    """
    Parse weapon rows from a wTable. Returns list of weapon dicts.
    weapon_type is 'ranged' or 'melee'.
    """
    weapons = []
    current_weapon_name = None
    current_keywords = []

    stat_columns = ["range", "A", "BS" if weapon_type == "ranged" else "WS", "S", "AP", "D"]

    for tbody in table_tag.find_all("tbody"):
        rows = tbody.find_all("tr")
        for row in rows:
            cells = row.find_all("td")
            if not cells:
                continue

            # Check if this is a header row (RANGED WEAPONS / MELEE WEAPONS)
            header_check = row.select_one("div.dsHeader")
            if header_check:
                header_text = clean_text(header_check)
                if "RANGED" in header_text or "MELEE" in header_text or header_text in ("RANGE", "A", "BS", "WS", "S", "AP", "D"):
                    continue

            # Long-form name row (weapon name spanning multiple columns)
            if row.get("class") and "wTable2_long" in row.get("class", []):
                name_cell = None
                for td in cells:
                    colspan = td.get("colspan")
                    if colspan:
                        name_cell = td
                        break
                if name_cell:
                    current_weapon_name, current_keywords = extract_weapon_keywords(name_cell)
                continue

            # Stat row: look for cells with pad2626 class containing stats
            stat_cells = row.select("div.ct.pad2626, td.pad2626")
            if not stat_cells:
                # Try alternate: direct td children with ct divs
                stat_cells = [td.select_one("div.ct") for td in cells if td.select_one("div.ct")]
                stat_cells = [s for s in stat_cells if s]

            if len(stat_cells) >= 6:
                # This row has stats - extract weapon name from the short form cell
                name_cell = row.select_one("td.wTable2_short")
                if name_cell:
                    wname, wkeywords = extract_weapon_keywords(name_cell)
                    if wname:
                        current_weapon_name = wname
                        current_keywords = wkeywords

                stat_values = [clean_text(s) for s in stat_cells[:6]]

                # Determine BS vs WS column name
                skill_key = "BS" if weapon_type == "ranged" else "WS"

                weapon = {
                    "name": current_weapon_name or "Unknown",
                    "type": weapon_type,
                    "range": stat_values[0],
                    "A": stat_values[1],
                    skill_key: stat_values[2],
                    "S": stat_values[3],
                    "AP": stat_values[4],
                    "D": stat_values[5],
                    "keywords": current_keywords if current_keywords else [],
                }
                weapons.append(weapon)
                # Reset for next weapon
                current_weapon_name = None
                current_keywords = []

    return weapons


def parse_weapons(ds_div) -> list[dict]:
    """
    Parse all weapons (ranged + melee) from the left column of a datasheet.
    """
    weapons = []
    left_col = ds_div.select_one("div.dsLeftСol")  # Note: Cyrillic С
    if not left_col:
        # Fallback: try finding the wTable directly
        left_col = ds_div

    table = left_col.select_one("table.wTable")
    if not table:
        return weapons

    # The table contains both ranged and melee sections.
    # We detect transitions by looking for RANGED WEAPONS / MELEE WEAPONS headers
    # Split the table's tbody sections by weapon type
    current_type = "ranged"  # default start

    all_tbodies = table.find_all("tbody")

    # We need to process row by row through all tbodies
    current_weapon_name = None
    current_keywords = []

    for tbody in all_tbodies:
        for row in tbody.find_all("tr"):
            cells = row.find_all("td")
            if not cells:
                continue

            # Check for section header (RANGED WEAPONS or MELEE WEAPONS)
            for cell in cells:
                header_div = cell.select_one("div.dsHeader")
                if header_div:
                    header_text = clean_text(header_div)
                    if "RANGED" in header_text:
                        current_type = "ranged"
                    elif "MELEE" in header_text:
                        current_type = "melee"

                # Check for ranged/melee icon
                if cell.select_one("div.dsRangedIcon"):
                    current_type = "ranged"
                elif cell.select_one("div.dsMeleeIcon"):
                    current_type = "melee"

            # Skip pure header rows (column headers like RANGE, A, BS, etc.)
            has_header = any(cell.select_one("div.dsHeader") for cell in cells)
            if has_header and not row.get("class"):
                continue

            # Long-form name row
            if row.get("class") and "wTable2_long" in row.get("class", []):
                for td in cells:
                    if td.get("colspan"):
                        current_weapon_name, current_keywords = extract_weapon_keywords(td)
                        break
                continue

            # Stat row — grab the LAST 6 ct.pad2626 divs to skip any
            # leading roll-result columns (e.g. Bubblechukka "1-2", "3-4")
            stat_divs = row.select("div.ct.pad2626")
            if len(stat_divs) > 6:
                stat_divs = stat_divs[-6:]
            if len(stat_divs) >= 6:
                name_cell = row.select_one("td.wTable2_short, td.pad2626")
                if name_cell and "wTable2_short" in (name_cell.get("class") or []):
                    wname, wkeywords = extract_weapon_keywords(name_cell)
                    if wname:
                        current_weapon_name = wname
                        current_keywords = wkeywords
                elif name_cell and not current_weapon_name:
                    wname, wkeywords = extract_weapon_keywords(name_cell)
                    if wname:
                        current_weapon_name = wname
                        current_keywords = wkeywords

                stat_values = [clean_text(s) for s in stat_divs[:6]]
                skill_key = "BS" if current_type == "ranged" else "WS"

                weapon = {
                    "name": current_weapon_name or "Unknown",
                    "type": current_type,
                    "range": stat_values[0],
                    "A": stat_values[1],
                    skill_key: stat_values[2],
                    "S": stat_values[3],
                    "AP": stat_values[4],
                    "D": stat_values[5],
                    "keywords": current_keywords[:],
                }
                weapons.append(weapon)
                current_weapon_name = None
                current_keywords = []

    return weapons


def parse_abilities(ds_div) -> dict:
    """
    Parse abilities from the right column. Returns dict with:
      core: list of core abilities
      faction: list of faction abilities
      other: list of {name, description} dicts
      damaged: str or None (damaged profile text)
    """
    abilities = {
        "core": [],
        "faction": [],
        "other": [],
        "damaged": None,
    }

    right_col = ds_div.select_one("div.dsRightСol")  # Cyrillic С
    if not right_col:
        return abilities

    current_section = "abilities"

    for child in right_col.children:
        if not isinstance(child, Tag):
            continue

        text = clean_text(child)

        # Section headers
        if "dsHeader" in (child.get("class") or []):
            header_text = text.upper()
            if "ABILITIES" in header_text:
                current_section = "abilities"
            elif "UNIT COMPOSITION" in header_text:
                current_section = "composition"
            elif "LEADER" in header_text:
                current_section = "leader"
            elif "WARGEAR OPTIONS" in header_text:
                current_section = "wargear"
            elif "DAMAGED" in header_text:
                current_section = "damaged"
                # Extract the damage threshold from header
                match = re.search(r"DAMAGED:\s*(.+)", text, re.IGNORECASE)
                if match:
                    abilities["damaged"] = match.group(1).strip()
            continue

        if not text:
            continue

        if current_section == "abilities":
            # Check for CORE / FACTION prefix
            if text.startswith("CORE:"):
                core_text = text.replace("CORE:", "").strip()
                abilities["core"] = [a.strip() for a in core_text.split(",") if a.strip()]
            elif text.startswith("FACTION:"):
                faction_text = text.replace("FACTION:", "").strip()
                abilities["faction"] = [a.strip() for a in faction_text.split(",") if a.strip()]
            else:
                # Named ability: look for <b> tag for name
                bold = child.find("b")
                if bold:
                    ability_name = clean_text(bold)
                    # Remove the name from the full text to get description
                    # Handle "Name:" pattern
                    if ":" in ability_name:
                        ability_name = ability_name.rstrip(":")
                    desc = text
                    # Try to split at first colon after bold name
                    colon_pos = desc.find(":", len(ability_name) - 5 if len(ability_name) > 5 else 0)
                    if colon_pos > 0:
                        desc = desc[colon_pos + 1:].strip()
                    abilities["other"].append({
                        "name": ability_name,
                        "description": desc,
                    })
                else:
                    abilities["other"].append({
                        "name": "",
                        "description": text,
                    })
        elif current_section == "damaged":
            abilities["damaged_description"] = text

    return abilities


def parse_keywords(ds_div) -> dict:
    """Parse keywords and faction keywords from the bottom bar."""
    result = {"keywords": [], "faction_keywords": []}

    kw_section = ds_div.select_one("div.ds2colKW")
    if not kw_section:
        return result

    left_kw = kw_section.select_one("div.dsLeftСolKW")  # Cyrillic С
    right_kw = kw_section.select_one("div.dsRightСolKW")

    if left_kw:
        text = clean_text(left_kw)
        text = re.sub(r"^KEYWORDS:\s*", "", text, flags=re.IGNORECASE)
        result["keywords"] = [k.strip() for k in text.split(",") if k.strip()]

    if right_kw:
        text = clean_text(right_kw)
        text = re.sub(r"^FACTION KEYWORDS:\s*", "", text, flags=re.IGNORECASE)
        result["faction_keywords"] = [k.strip() for k in text.split(",") if k.strip()]

    return result


def parse_unit_composition(ds_div) -> dict:
    """Parse unit composition and points from the right column."""
    comp = {"models": [], "equipment": "", "points": []}

    right_col = ds_div.select_one("div.dsRightСol")
    if not right_col:
        return comp

    in_composition = False
    for child in right_col.children:
        if not isinstance(child, Tag):
            continue
        text = clean_text(child)

        if "dsHeader" in (child.get("class") or []):
            if "UNIT COMPOSITION" in text.upper():
                in_composition = True
                continue
            elif in_composition:
                in_composition = False
                continue

        if in_composition and "dsAbility" in (child.get("class") or []):
            # Check for points tag
            price_tag = child.select_one("div.PriceTag")
            if price_tag:
                # Parse the model count and points
                tds = child.select("td")
                if len(tds) >= 2:
                    model_count = clean_text(tds[0])
                    points = clean_text(price_tag)
                    comp["points"].append({"models": model_count, "points": points})
                continue

            # Model entries and equipment
            lis = child.select("li")
            if lis:
                for li in lis:
                    comp["models"].append(clean_text(li))

            # Equipment text
            equip_bold = child.find("b", string=re.compile(r"equipped with", re.IGNORECASE))
            if equip_bold:
                equip_text = text
                idx = equip_text.lower().find("equipped with:")
                if idx >= 0:
                    comp["equipment"] = equip_text[idx:].strip()

    return comp


def parse_wargear_options(ds_div) -> list[dict]:
    """
    Parse WARGEAR OPTIONS from the left column.
    These are <ul><li> elements after the weapon table containing swap/equip rules.
    Returns list of dicts with raw text + best-effort structured extraction.
    """
    options = []

    # Wargear options live in the left column
    left_col = ds_div.select_one("div.dsLeftСol")  # Cyrillic С
    if not left_col:
        return options

    # Find all <ul> in the left column that are NOT inside the weapon table
    table = left_col.select_one("table.wTable")

    for ul in left_col.select("ul"):
        # Skip ULs inside the weapon table
        if table and table in ul.parents:
            continue
        # Skip dsUl (unit composition lists)
        if "dsUl" in (ul.get("class") or []):
            continue

        for li in ul.find_all("li", recursive=False):
            raw_text = clean_text(li)
            if not raw_text:
                continue
            # Must contain wargear-relevant language
            text_lower = raw_text.lower()
            if not any(kw in text_lower for kw in ("replaced", "equipped with", "can have", "can replace", "must be equipped")):
                continue
            # Filter out composition description lines: "X is equipped with: items."
            # These describe default loadout, not wargear options.
            if re.match(r"^[\w\s]+ is equipped with:", raw_text, re.IGNORECASE):
                continue

            option = _parse_wargear_option_text(raw_text, li)
            options.append(option)

    return options


def _split_choice_items(choice_text: str) -> list[str]:
    """Split a compound choice string into individual equipment items.

    Only splits on boundaries with numeric quantity prefixes (e.g. "and 1 ",
    ", 1 ") to preserve weapon names that contain "and" or commas
    (e.g. "transonic blades and chordclaw").
    """
    parts = re.split(r"\s+and\s+(?=\d+\s)", choice_text)
    items: list[str] = []
    for part in parts:
        subparts = re.split(r",\s+(?=\d+\s)", part)
        for sp in subparts:
            cleaned = re.sub(r"^\d+\s+", "", sp.strip())
            if cleaned:
                items.append(cleaned)
    return items


def _parse_wargear_option_text(raw_text: str, li_element) -> dict:
    """
    Parse a single wargear option line into structured data.

    Patterns handled:
      - "This model's X can be replaced with 1 Y"
      - "All models ... can each have their X replaced with 1 Y"
      - "For every N models ..., 1/up to M model(s) ... X replaced with Y"
      - "This model can be equipped with 1 X"
      - "The <Name>'s X can be replaced with Y"
      - Multi-choice via nested <ul> ("one of the following:")
    """
    option = {"raw": raw_text}
    text = raw_text

    # --- Extract nested choices if present ---
    nested_ul = li_element.find("ul")
    choices = []
    if nested_ul:
        for nli in nested_ul.find_all("li", recursive=False):
            choice_text = clean_text(nli).strip()
            # Strip leading "1 " quantity
            choice_text = re.sub(r"^1\s+", "", choice_text)
            if choice_text:
                choices.append(_split_choice_items(choice_text))
    elif "one of the following" in text.lower():
        # Choices run together without nested UL - split on numbered items
        idx = text.lower().find("one of the following")
        after = text[idx + len("one of the following"):].strip(": ")
        # Try splitting on "1 " boundaries
        parts = re.split(r"(?:^|(?<=\d))\s*1\s+", after)
        choices = [_split_choice_items(p.strip().rstrip(".*")) for p in parts if p.strip()]

    if choices:
        option["choices"] = choices

    # --- Per-N-models pattern ---
    per_n = re.match(
        r"[Ff]or every (\d+) (?:models?|[\w\s]+?) in (?:this unit|the unit),?\s*"
        r"(?:up to )?(\d+)?\s*(?:[\w\s]*?)(?:can each have|can have|can be equipped|can replace|'s\s)",
        text,
    )
    if per_n:
        option["per_n_models"] = int(per_n.group(1))
        if per_n.group(2):
            option["max_per_n"] = int(per_n.group(2))
        else:
            option["max_per_n"] = 1

    # --- Replacement vs addition ---
    # Order matters: check "can be equipped" first since some add-type options
    # contain "cannot be replaced" as a constraint, and we don't want the
    # "replaced" check to trigger on constraint text.
    text_lower_type = text.lower()
    _is_add_equipped = (
        "can be equipped" in text_lower_type or "can each be equipped" in text_lower_type
    ) and "replaced" not in text_lower_type.split("can be equipped")[0]
    _is_add_have = "can have" in text_lower_type and "replaced" not in text_lower_type

    if _is_add_equipped:
        option["type"] = "add"
        if not choices:
            equip_match = re.search(
                r"can (?:each )?be equipped with\s+(.+?)(?:\.\s*\*?\s*$|\(|$)",
                text, re.IGNORECASE,
            )
            if equip_match:
                item = equip_match.group(1).strip().rstrip(".*")
                item = re.sub(r"^1\s+", "", item)
                option["choices"] = [_split_choice_items(item)]

    elif _is_add_have:
        option["type"] = "add"
        if not choices:
            have_match = re.search(
                r"can have\s+(.+?)(?:\.\s*\*?\s*$|\(|$)",
                text, re.IGNORECASE,
            )
            if have_match:
                item = have_match.group(1).strip().rstrip(".*")
                item = re.sub(r"^\d+\s+", "", item)
                option["choices"] = [_split_choice_items(item)]

    elif "must be equipped" in text_lower_type:
        option["type"] = "replace"

    elif "replaced" in text_lower_type or "can replace" in text_lower_type:
        option["type"] = "replace"
        # Extract what's being replaced - look for possessive + weapon name before "replaced"
        # NOTE: \b word boundaries are critical — without them, "his" matches
        # inside "this" and "her" matches inside "other".
        replace_match = re.search(
            r"\b(?:their|its)\s+(.+?)\s+(?:can be )?replaced",
            text, re.IGNORECASE,
        )
        if not replace_match:
            # Unicode-aware apostrophe variants: ' and '
            replace_match = re.search(
                r"(?:model[\u2019']s|[\u2019']s)\s+(.+?)\s+(?:can be )?replaced",
                text, re.IGNORECASE,
            )
        if not replace_match:
            # "can replace their X with"
            replace_match = re.search(
                r"can (?:each )?(?:have )?replace \b(?:their|its)\s+(.+?)\s+with",
                text, re.IGNORECASE,
            )

        if replace_match:
            replaces_raw = replace_match.group(1).strip()
            # Split on " and ", " or ", or ", " for multiple weapons
            replaces_list = re.split(r"\s+(?:and|or)\s+|,\s+", replaces_raw)
            # Strip quantity prefixes and trailing punctuation
            replaces_list = [
                re.sub(r"^\d+\s+", "", r.strip().rstrip(",;."))
                for r in replaces_list
                if r.strip()
            ]
            option["replaces"] = replaces_list

        # Extract replacement if single choice (no nested list)
        if not choices:
            with_match = re.search(r"replaced with\s+(.+?)(?:\.|$)", text, re.IGNORECASE)
            if with_match:
                replacement = with_match.group(1).strip()
                replacement = re.sub(r"^1\s+", "", replacement)
                option["choices"] = [_split_choice_items(replacement)]

    # --- Applies-to scope ---
    text_lower = text.lower()
    if "per_n_models" in option:
        # Per-N-models takes precedence (even if "each have" appears)
        option["scope"] = "per_n_models"
    elif text_lower.startswith("all models") or (
        "each have" in text_lower and "for every" not in text_lower
    ):
        option["scope"] = "all_models"
    elif re.match(r"^The \w", text):
        # Named model: "The Obsessionist's ...", "The Sister Superior can be equipped"
        name_match = re.match(r"^The (.+?)(?:[\u2019']s)\s", text)
        if name_match:
            option["scope"] = "named_model"
            option["model_name"] = name_match.group(1)
        else:
            # No possessive: "The Sister Superior can be equipped with..."
            name_match2 = re.match(r"^The (.+?)\s+can\s", text)
            if name_match2:
                option["scope"] = "named_model"
                option["model_name"] = name_match2.group(1)
            else:
                option["scope"] = "this_model"
    elif re.match(r"^\d+ \w", text):
        # "1 Infractor can be equipped..."
        count_match = re.match(r"^(\d+)\s+(.+?)\s+can\s", text)
        if count_match:
            option["scope"] = "specific_count"
            option["max_per_n"] = int(count_match.group(1))
            option["model_name"] = count_match.group(2)
        else:
            option["scope"] = "this_model"
    else:
        option["scope"] = "this_model"

    return option


def parse_model_definitions(ds_div) -> list[dict]:
    """
    Parse model definitions from the UNIT COMPOSITION section.

    Extracts each model type with its count range and default equipment.
    e.g. "1 Obsessionist" equipped with bolt pistol; power sword
         "4-9 Infractors" equipped with bolt pistol; duelling sabre
    """
    models = []

    right_col = ds_div.select_one("div.dsRightСol")
    if not right_col:
        return models

    in_composition = False
    for child in right_col.children:
        if not isinstance(child, Tag):
            continue
        text = clean_text(child)

        if "dsHeader" in (child.get("class") or []):
            if "UNIT COMPOSITION" in text.upper():
                in_composition = True
                continue
            elif in_composition:
                in_composition = False
                continue

        if not in_composition or "dsAbility" not in (child.get("class") or []):
            continue

        # Skip price tag rows
        if child.select_one("div.PriceTag"):
            continue

        # Extract model entries: <ul class="dsUl"><li><b>COUNT NAME</b></li></ul>
        # Also handle "OR" separators between size options and compound entries
        # like "1 Sergeant and 9 Troopers"
        raw_entries = []
        for li in child.select("ul.dsUl > li"):
            bold = li.find("b")
            if bold:
                entry_text = bold.get_text(strip=True)
                # Strip keyword spans (EPIC HERO etc)
                for kw_span in bold.select("span.kwb"):
                    entry_text = entry_text.replace(kw_span.get_text(strip=True), "")
                entry_text = re.sub(r"\s+", " ", entry_text).strip().rstrip("–").strip()
                if entry_text:
                    raw_entries.append(entry_text)

        # Split compound entries like "1 Sergeant and 9 Troopers" into separate models
        model_entries = []
        for entry in raw_entries:
            # Pattern: "N NameA and M NameB"
            compound = re.match(
                r"^(\d+(?:\s*-\s*\d+)?)\s+(.+?)\s+and\s+(\d+(?:\s*-\s*\d+)?)\s+(.+)$",
                entry,
            )
            if compound:
                model_entries.append(f"{compound.group(1)} {compound.group(2)}")
                model_entries.append(f"{compound.group(3)} {compound.group(4)}")
            else:
                model_entries.append(entry)

        # Extract equipment lines: <b>... equipped with:</b> weapons
        # Get the full HTML text and parse equipment assignments
        full_html = str(child)
        equip_sections = re.findall(
            r"<b>([^<]*equipped with[^<]*?):\s*</b>\s*([^<]+)",
            full_html,
            re.IGNORECASE,
        )

        # Build model definitions
        if model_entries:
            # Parse each model entry for count range
            parsed_entries = []
            for entry in model_entries:
                match = re.match(r"^(\d+)(?:\s*-\s*(\d+))?\s+(.+)$", entry)
                if match:
                    min_count = int(match.group(1))
                    max_count = int(match.group(2)) if match.group(2) else min_count
                    model_name = match.group(3).strip()
                    parsed_entries.append({
                        "name": model_name,
                        "min_models": min_count,
                        "max_models": max_count,
                    })
                else:
                    parsed_entries.append({
                        "name": entry,
                        "min_models": 1,
                        "max_models": 1,
                    })

            # Match equipment to model entries
            if equip_sections:
                for prefix, equip_text in equip_sections:
                    equip_list = [
                        e.strip().rstrip(".")
                        for e in equip_text.split(";")
                        if e.strip() and e.strip() != "."
                    ]
                    # Strip "1 " prefix from equipment names
                    equip_list = [re.sub(r"^\d+\s+", "", e) for e in equip_list]

                    prefix_lower = prefix.lower()
                    matched = False

                    if "every model" in prefix_lower or "this model" in prefix_lower:
                        # Applies to all model entries
                        for entry in parsed_entries:
                            entry["default_equipment"] = equip_list
                        matched = True
                    else:
                        # Score each entry by how well its name matches the prefix.
                        # Penalise entries with unmatched name words (avoids
                        # "Shock Trooper Sergeant" matching "Shock Trooper" prefix)
                        # and entries that already have equipment assigned.
                        best_entry = None
                        best_score = -1
                        for entry in parsed_entries:
                            name_parts = [p for p in entry["name"].lower().split() if len(p) > 2]
                            if not name_parts:
                                continue
                            matched_count = 0
                            for part in name_parts:
                                if part in prefix_lower:
                                    matched_count += 1
                                elif part.rstrip("s") in prefix_lower or part.rstrip("es") in prefix_lower:
                                    matched_count += 0.8
                                elif len(part) >= 4 and part[:4] in prefix_lower:
                                    matched_count += 0.5
                            # Score = fraction of name words matched (0 to 1)
                            score = matched_count / len(name_parts) if name_parts else 0
                            # Penalise if already has equipment
                            if entry.get("default_equipment") and score > 0:
                                score *= 0.5
                            if score > best_score:
                                best_score = score
                                best_entry = entry

                        if best_entry and best_score > 0.3:
                            best_entry["default_equipment"] = equip_list
                            matched = True

                    if not matched and len(parsed_entries) == 1:
                        # Single model type, assign equipment to it
                        parsed_entries[0]["default_equipment"] = equip_list

            # Merge duplicate model names (from OR groups) — keep broadest count range
            # Normalise name for dedup: strip trailing s/es for plural matching
            def _dedup_key(name: str) -> str:
                """Normalise model name for deduplication (singular form)."""
                n = name.lower().strip()
                if n.endswith("es") and len(n) > 4:
                    return n[:-2]
                if n.endswith("s") and len(n) > 3:
                    return n[:-1]
                return n

            merged = {}
            for entry in parsed_entries:
                key = _dedup_key(entry["name"])
                if key in merged:
                    existing = merged[key]
                    existing["min_models"] = min(existing["min_models"], entry["min_models"])
                    existing["max_models"] = max(existing["max_models"], entry["max_models"])
                    if not existing["default_equipment"] and entry.get("default_equipment"):
                        existing["default_equipment"] = entry["default_equipment"]
                else:
                    entry.setdefault("default_equipment", [])
                    merged[key] = entry

            models = list(merged.values())

    return models


def parse_leader_info(ds_div) -> list[str]:
    """Parse which units this model can lead."""
    leaders = []
    right_col = ds_div.select_one("div.dsRightСol")
    if not right_col:
        return leaders

    in_leader = False
    for child in right_col.children:
        if not isinstance(child, Tag):
            continue
        text = clean_text(child)

        if "dsHeader" in (child.get("class") or []):
            if "LEADER" in text.upper():
                in_leader = True
                continue
            elif in_leader:
                in_leader = False
                continue

        if in_leader:
            for li in child.select("li"):
                link = li.select_one("a")
                if link:
                    leaders.append(clean_text(link))
                else:
                    leaders.append(clean_text(li))

    return leaders


def parse_datasheet(ds_div) -> dict:
    """Parse a single datasheet div into a structured dict."""

    # Unit name from dsH2Header
    name_el = ds_div.select_one("div.dsH2Header > div")
    unit_name = clean_text(name_el) if name_el else "Unknown"

    # Base size
    base_el = ds_div.select_one("span.dsModelBase2")
    base_size = clean_text(base_el) if base_el else ""
    # Clean up: remove parentheses
    base_size = base_size.strip("()")

    # Lore / flavour text from picLegend tooltip
    lore = ""
    lore_el = ds_div.select_one("div.picLegend.tooltip_")
    if lore_el and lore_el.get("title"):
        lore = lore_el["title"]

    # Stats
    profile_wrap = ds_div.select_one("div.dsProfileWrap")
    stats = parse_stats(profile_wrap) if profile_wrap else {}

    # Invulnerable save
    invuln = parse_invulnerable_save(ds_div)

    # Weapons
    weapons = parse_weapons(ds_div)

    # Abilities
    abilities = parse_abilities(ds_div)

    # Keywords
    kw_data = parse_keywords(ds_div)

    # Unit composition & points
    composition = parse_unit_composition(ds_div)

    # Model definitions (structured count + default equipment)
    model_definitions = parse_model_definitions(ds_div)

    # Wargear options
    wargear_options = parse_wargear_options(ds_div)

    # Leader info
    leader_units = parse_leader_info(ds_div)

    datasheet = {
        "name": unit_name,
        "base_size": base_size,
        "lore": lore,
        "stats": stats,
        "invulnerable_save": invuln,
        "weapons": weapons,
        "abilities": abilities,
        "keywords": kw_data["keywords"],
        "faction_keywords": kw_data["faction_keywords"],
        "composition": composition,
        "model_definitions": model_definitions,
        "wargear_options": wargear_options,
        "leader_units": leader_units,
    }

    return datasheet


# ---------------------------------------------------------------------------
# File-level parsing
# ---------------------------------------------------------------------------

def parse_faction_page(html_path: str) -> dict:
    """
    Parse an entire faction datasheets HTML page.
    Returns dict with faction info and list of datasheets.
    """
    with open(html_path, "r", encoding="utf-8") as f:
        soup = BeautifulSoup(f.read(), "lxml")

    # Try to detect faction name from the page
    faction_name = "Unknown"

    # Method 1: Look in the page title (online: "Aeldari – Datasheets | Wahapedia")
    title_el = soup.select_one("title")
    if title_el:
        title_text = clean_text(title_el)
        match = re.match(r"(.+?)\s*[–—-]\s*Datasheets", title_text)
        if match:
            faction_name = match.group(1).strip()

    # Method 2: Derive from filename
    if faction_name == "Unknown":
        basename = os.path.splitext(os.path.basename(html_path))[0]
        # Capitalise and clean, strip common suffixes
        faction_name = basename.replace("_", " ").replace("-", " ").title()
        for suffix in (" Datasheets", " Datasheet"):
            if faction_name.endswith(suffix):
                faction_name = faction_name[: -len(suffix)]

    # Method 3: Look at first datasheet's faction keywords
    if faction_name == "Unknown" or faction_name.lower() == "datasheets":
        first_ds = soup.select_one("div.dsOuterFrame.datasheet")
        if first_ds:
            fk_div = first_ds.select_one("div.dsRightСolKW")
            if fk_div:
                text = clean_text(fk_div)
                text = re.sub(r"^FACTION KEYWORDS:\s*", "", text, flags=re.IGNORECASE)
                if text:
                    faction_name = text.split(",")[0].strip().title()

    # Find all datasheet divs
    ds_divs = soup.select("div.dsOuterFrame.datasheet")

    datasheets = []
    for ds_div in ds_divs:
        try:
            ds = parse_datasheet(ds_div)
            datasheets.append(ds)
        except Exception as e:
            # Get name for error reporting
            name_el = ds_div.select_one("div.dsH2Header > div")
            name = clean_text(name_el) if name_el else "Unknown"
            print(f"  WARNING: Failed to parse '{name}': {e}", file=sys.stderr)

    return {
        "faction": faction_name,
        "source": os.path.basename(html_path),
        "datasheet_count": len(datasheets),
        "datasheets": datasheets,
    }


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Parse Wahapedia 40K datasheets HTML into JSON"
    )
    parser.add_argument(
        "input",
        help="Path to an HTML file or directory of HTML files",
    )
    parser.add_argument(
        "-o", "--output",
        default=None,
        help="Output JSON file path (default: <input_name>_datasheets.json)",
    )
    parser.add_argument(
        "--pretty",
        action="store_true",
        default=True,
        help="Pretty-print JSON output (default: True)",
    )

    args = parser.parse_args()
    input_path = Path(args.input)

    if input_path.is_file():
        html_files = [input_path]
    elif input_path.is_dir():
        html_files = sorted(input_path.glob("*.html"))
    else:
        print(f"Error: {input_path} is not a valid file or directory", file=sys.stderr)
        sys.exit(1)

    if not html_files:
        print(f"Error: No HTML files found in {input_path}", file=sys.stderr)
        sys.exit(1)

    all_factions = []
    total_sheets = 0

    for html_file in html_files:
        print(f"Parsing {html_file.name}...", file=sys.stderr)
        result = parse_faction_page(str(html_file))
        all_factions.append(result)
        total_sheets += result["datasheet_count"]
        print(f"  Found {result['datasheet_count']} datasheets for {result['faction']}", file=sys.stderr)

    # Build output
    output_data = {
        "game": "Warhammer 40,000",
        "edition": "10th",
        "total_datasheets": total_sheets,
        "factions": all_factions,
    }

    # Determine output path
    if args.output:
        out_path = Path(args.output)
    elif input_path.is_file():
        out_path = input_path.with_suffix("").with_name(input_path.stem + "_datasheets.json")
    else:
        out_path = input_path / "all_datasheets.json"

    indent = 2 if args.pretty else None
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output_data, f, indent=indent, ensure_ascii=False)

    print(f"\nWrote {total_sheets} datasheets to {out_path}", file=sys.stderr)
    return str(out_path)


if __name__ == "__main__":
    main()
