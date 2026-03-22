#!/usr/bin/env python3
"""
Wahapedia 40K 10th Edition Rules Scraper
=========================================
Parses saved Wahapedia faction rules HTML pages and extracts:
  - Faction / army rules
  - Detachments (with detachment rule, enhancements, stratagems)

Usage:
    python wahapedia_rules_scraper.py <html_file_or_directory> [-o output.json]
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path

from bs4 import BeautifulSoup, Tag


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def clean_text(el) -> str:
    """Extract visible text from an element, normalising whitespace."""
    if el is None or isinstance(el, str):
        return el or ""
    text = el.get_text(separator=" ", strip=True)
    return re.sub(r"\s+", " ", text).strip()


def extract_keywords_from_element(el) -> list[str]:
    """
    Extract keyword groups from an element by reading <span class="kwb"> tags.
    Adjacent kwb spans are merged into compound keywords (e.g. ADEPTUS ASTARTES).
    """
    if el is None:
        return []

    keywords: list[str] = []
    current_group: list[str] = []

    for child in el.descendants:
        if isinstance(child, Tag) and "kwb" in (child.get("class") or []):
            current_group.append(child.get_text(strip=True))
        elif isinstance(child, Tag) and child.name in ("br", "div", "p", "li", "td"):
            # Block-level break — flush current group
            if current_group:
                keywords.append(" ".join(current_group))
                current_group = []
        elif isinstance(child, str):
            text = child.strip()
            # Comma, "or", "and" between kwb spans → flush
            if text in (",", "or", "and", "•") and current_group:
                keywords.append(" ".join(current_group))
                current_group = []

    if current_group:
        keywords.append(" ".join(current_group))

    return keywords


def extract_rules_text(el, *, skip_fluff: bool = True) -> str:
    """
    Extract rules text from an element, optionally skipping ShowFluff
    paragraphs (flavour text).
    """
    if el is None:
        return ""

    parts = []
    for child in el.children:
        if not isinstance(child, Tag):
            t = str(child).strip()
            if t:
                parts.append(t)
            continue
        if skip_fluff and "ShowFluff" in str(child.get("class", [])):
            continue
        if child.name == "h3":
            continue
        t = child.get_text(separator=" ", strip=True)
        if t:
            parts.append(t)

    return re.sub(r"\s+", " ", " ".join(parts)).strip()


# ---------------------------------------------------------------------------
# Section boundary detection
# ---------------------------------------------------------------------------

SKIP_SECTIONS = {
    "Books", "FAQ", "Introduction", "Crusade Rules",
    "Boarding Actions", "Combat Patrol",
}


def find_sections(soup: BeautifulSoup) -> list[dict]:
    """
    Walk the page and identify top-level sections (Army Rules, detachments, etc.)
    by finding h2.outline_header elements.
    Returns list of {name, element, type} dicts.
    """
    sections = []
    for h2 in soup.select("h2.outline_header"):
        text = h2.get_text(strip=True)
        if text in SKIP_SECTIONS:
            continue
        if text == "Army Rules":
            sections.append({"name": text, "element": h2, "type": "army_rules"})
        else:
            sections.append({"name": text, "element": h2, "type": "detachment"})
    return sections


# ---------------------------------------------------------------------------
# Army Rules parser
# ---------------------------------------------------------------------------

def parse_army_rules(h2_element) -> list[dict]:
    """
    Parse the Army Rules section. Returns list of named rules:
      [{name, description, keywords_mentioned}, ...]
    """
    rules = []

    # Find the next outline_header to know where this section ends
    next_outline = h2_element.find_next("h2", class_="outline_header")

    # Find all h3 elements within this section (each is a named rule)
    for h3 in h2_element.find_all_next("h3"):
        # Stop if we've reached the next section
        if next_outline:
            # Compare document position
            if _element_after(h3, next_outline):
                break

        rule_name = h3.get_text(strip=True)

        # Collect the parent BreakInsideAvoid div for this rule
        parent_div = h3.find_parent("div", class_="BreakInsideAvoid")
        if parent_div:
            rule_text = extract_rules_text(parent_div)
            # Remove the rule name from the start
            if rule_text.startswith(rule_name):
                rule_text = rule_text[len(rule_name):].strip()
            keywords = extract_keywords_from_element(parent_div)
        else:
            # Fallback: gather text from siblings
            text_parts = []
            for sib in h3.next_siblings:
                if not isinstance(sib, Tag):
                    continue
                if sib.name in ("h2", "h3"):
                    break
                t = sib.get_text(separator=" ", strip=True)
                if t and "ShowFluff" not in str(sib.get("class", [])):
                    text_parts.append(t)
            rule_text = " ".join(text_parts)
            keywords = []

        rules.append({
            "name": rule_name,
            "description": rule_text,
            "keywords_mentioned": keywords,
        })

    return rules


def _element_after(a: Tag, b: Tag) -> bool:
    """Rough check if element a appears after element b in the document."""
    # Use sourceline if available
    if a.sourceline is not None and b.sourceline is not None:
        return a.sourceline >= b.sourceline
    # Fallback: walk next siblings from b
    for el in b.find_all_next():
        if el is a:
            return True
    return False


# ---------------------------------------------------------------------------
# Detachment parser
# ---------------------------------------------------------------------------

def parse_detachment_rule(h2_element) -> dict | None:
    """
    Parse the Detachment Rule sub-section within a detachment.
    Returns {name, description, keywords_mentioned} or None.
    """
    # Find the h3 with the actual rule name
    h3 = h2_element.find_next("h3")
    if not h3:
        return None

    rule_name = h3.get_text(strip=True)

    # Get the parent BreakInsideAvoid div
    parent = h3.find_parent("div", class_="BreakInsideAvoid")
    if parent:
        rule_text = extract_rules_text(parent)
        if rule_text.startswith(rule_name):
            rule_text = rule_text[len(rule_name):].strip()
        keywords = extract_keywords_from_element(parent)
    else:
        rule_text = ""
        keywords = []

    return {
        "name": rule_name,
        "description": rule_text,
        "keywords_mentioned": keywords,
    }


def parse_enhancements(section_start, section_end) -> list[dict]:
    """
    Parse all enhancements between section_start and section_end.
    Returns list of:
      {name, points, description, keyword_restrictions, keywords_mentioned}
    """
    enhancements = []

    # Find all EnhancementsPts lists in range
    for ul in section_start.find_all_next("ul", class_="EnhancementsPts"):
        if section_end and _element_after(ul, section_end):
            break

        spans = ul.select("span")
        name = spans[0].get_text(strip=True) if spans else "Unknown"
        pts_text = spans[1].get_text(strip=True) if len(spans) > 1 else "0 pts"

        # Parse points
        pts_match = re.search(r"(\d+)\s*pts?", pts_text)
        points = int(pts_match.group(1)) if pts_match else 0

        # Get the parent td for rules text
        parent_td = ul.find_parent("td")
        if not parent_td:
            parent_td = ul.find_parent("div", class_="BreakInsideAvoid")

        rules_parts = []
        keyword_restrictions = []
        all_keywords = []

        if parent_td:
            for p in parent_td.select("p"):
                if "ShowFluff" in str(p.get("class", [])):
                    continue
                text = p.get_text(separator=" ", strip=True)
                if text:
                    rules_parts.append(text)
                    # Extract keywords
                    kws = extract_keywords_from_element(p)
                    all_keywords.extend(kws)

                    # Check for restriction pattern: "KEYWORD model only"
                    restriction_match = re.match(
                        r"^(.+?)\s+model only\b", text, re.IGNORECASE
                    )
                    if restriction_match:
                        keyword_restrictions = kws[:] if kws else [restriction_match.group(1)]

        enhancements.append({
            "name": name,
            "points": points,
            "description": " ".join(rules_parts),
            "keyword_restrictions": keyword_restrictions,
            "keywords_mentioned": all_keywords,
        })

    return enhancements


def parse_stratagems(section_start, section_end) -> list[dict]:
    """
    Parse all stratagems between section_start and section_end.
    Returns list of:
      {name, cp_cost, type, category, turn,
       when, target, effect, restrictions, cost,
       fluff, keywords_mentioned, target_keywords}
    """
    stratagems = []

    for strat_div in section_start.find_all_next("div", class_="str10Wrap"):
        if section_end and _element_after(strat_div, section_end):
            break

        name = clean_text(strat_div.select_one("div.str10Name"))
        cp_text = clean_text(strat_div.select_one("div.str10CP"))
        type_text = clean_text(strat_div.select_one("div.str10Type"))
        fluff = clean_text(strat_div.select_one("div.str10Legend"))

        # Parse CP cost
        cp_match = re.search(r"(\d+)\s*CP", cp_text)
        cp_cost = int(cp_match.group(1)) if cp_match else 0

        # Parse type text: "Detachment Name – Category Stratagem"
        # e.g. "Hallowed Martyrs – Epic Deed Stratagem"
        category = ""
        type_match = re.match(r".+?\s*[–—-]\s*(.+?)\s+Stratagem", type_text)
        if type_match:
            category = type_match.group(1).strip()

        # Determine turn from CSS classes
        classes = strat_div.get("class", [])
        if "str10ColorYour" in classes:
            turn = "your"
        elif "str10ColorEnemy" in classes:
            turn = "opponent"
        else:
            turn = "either"

        # Parse the structured text: WHEN / TARGET / EFFECT / RESTRICTIONS / COST
        text_div = strat_div.select_one("div.str10Text")
        fields = {"when": "", "target": "", "effect": "", "restrictions": "", "cost": ""}

        if text_div:
            full = text_div.get_text(separator=" ", strip=True)
            parts = re.split(r"(WHEN:|TARGET:|EFFECT:|RESTRICTIONS:|COST:)", full)
            key = None
            for p in parts:
                p = p.strip()
                lowered = p.rstrip(":").lower()
                if lowered in fields:
                    key = lowered
                elif key:
                    fields[key] = p

        # Extract all keywords mentioned in the stratagem
        all_keywords = extract_keywords_from_element(text_div) if text_div else []

        # Extract target-specific keywords
        # Parse TARGET field for keyword restrictions
        target_keywords = _extract_target_keywords(fields["target"], text_div)

        stratagems.append({
            "name": name,
            "cp_cost": cp_cost,
            "type": type_text,
            "category": category,
            "turn": turn,
            "when": fields["when"],
            "target": fields["target"],
            "effect": fields["effect"],
            "restrictions": fields["restrictions"],
            "cost": fields["cost"],
            "fluff": fluff,
            "keywords_mentioned": all_keywords,
            "target_keywords": target_keywords,
        })

    return stratagems


def _extract_target_keywords(target_text: str, text_div) -> list[str]:
    """
    Extract the unit keyword requirements from a TARGET string.
    e.g. "One ADEPTUS ASTARTES INFANTRY unit" -> ["ADEPTUS ASTARTES INFANTRY"]
    """
    if not target_text:
        return []

    # Pattern: "One/any KEYWORD KEYWORD unit/model"
    # We look for sequences of ALL-CAPS words before "unit" or "model"
    matches = re.findall(
        r"(?:One|one|Any|any|each|Each|that|your)\s+"
        r"((?:[A-Z][A-Z\s'-]+?)\s*(?:unit|model|units|models))",
        target_text,
    )

    keywords = []
    for m in matches:
        # Remove "unit"/"model" suffix
        kw = re.sub(r"\s*(units?|models?)\s*$", "", m).strip()
        if kw:
            keywords.append(kw)

    # Also try: "KEYWORD or KEYWORD unit" patterns
    or_matches = re.findall(
        r"((?:[A-Z][A-Z'-]+(?:\s+[A-Z][A-Z'-]+)*)"
        r"(?:\s+or\s+[A-Z][A-Z'-]+(?:\s+[A-Z][A-Z'-]+)*)+)"
        r"\s+(?:unit|model)",
        target_text,
    )
    for m in or_matches:
        parts = re.split(r"\s+or\s+", m)
        keywords.extend(p.strip() for p in parts if p.strip())

    return keywords


def parse_detachment(h2_element, next_h2) -> dict:
    """
    Parse a complete detachment section.
    Returns {name, rule, enhancements, stratagems}.
    """
    det_name = h2_element.get_text(strip=True)

    # Find sub-sections within this detachment
    det_rule = None
    enhancements = []
    stratagems = []

    # Find "Detachment Rule" h2 within this detachment
    for h2 in h2_element.find_all_next("h2"):
        if next_h2 and _element_after(h2, next_h2):
            break
        text = h2.get_text(strip=True)
        if text == "Detachment Rule":
            det_rule = parse_detachment_rule(h2)
        elif text == "Enhancements":
            enhancements = parse_enhancements(h2, next_h2)
        elif text == "Stratagems":
            stratagems = parse_stratagems(h2, next_h2)

    return {
        "name": det_name,
        "rule": det_rule,
        "enhancements": enhancements,
        "stratagems": stratagems,
    }


# ---------------------------------------------------------------------------
# File-level parsing
# ---------------------------------------------------------------------------

def parse_faction_rules(html_path: str) -> dict:
    """
    Parse an entire faction rules HTML page.
    Returns dict with faction_name, army_rules, and detachments.
    """
    with open(html_path, "r", encoding="utf-8") as f:
        soup = BeautifulSoup(f.read(), "lxml")

    # Detect faction name from filename
    basename = os.path.splitext(os.path.basename(html_path))[0]
    faction_name = basename.replace("_", " ").replace("-", " ").title()
    for suffix in (" Rules", " Rule"):
        if faction_name.endswith(suffix):
            faction_name = faction_name[: -len(suffix)]

    sections = find_sections(soup)

    army_rules = []
    detachments = []

    for i, section in enumerate(sections):
        next_el = sections[i + 1]["element"] if i + 1 < len(sections) else None

        if section["type"] == "army_rules":
            army_rules = parse_army_rules(section["element"])
        elif section["type"] == "detachment":
            det = parse_detachment(section["element"], next_el)
            detachments.append(det)

    return {
        "faction": faction_name,
        "source": os.path.basename(html_path),
        "army_rules": army_rules,
        "detachment_count": len(detachments),
        "detachments": detachments,
    }


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Parse Wahapedia 40K faction rules HTML into JSON"
    )
    parser.add_argument("input", help="Path to an HTML file or directory")
    parser.add_argument("-o", "--output", default=None, help="Output JSON path")

    args = parser.parse_args()
    input_path = Path(args.input)

    if input_path.is_file():
        html_files = [input_path]
    elif input_path.is_dir():
        html_files = sorted(input_path.glob("*.html"))
    else:
        print(f"Error: {input_path} not found", file=sys.stderr)
        sys.exit(1)

    all_factions = []
    total_det = 0
    total_strat = 0
    total_enh = 0

    for html_file in html_files:
        print(f"Parsing {html_file.name}...", file=sys.stderr)
        result = parse_faction_rules(str(html_file))
        all_factions.append(result)
        nd = result["detachment_count"]
        ns = sum(len(d["stratagems"]) for d in result["detachments"])
        ne = sum(len(d["enhancements"]) for d in result["detachments"])
        total_det += nd
        total_strat += ns
        total_enh += ne
        print(
            f"  {result['faction']}: {len(result['army_rules'])} army rules, "
            f"{nd} detachments, {ns} stratagems, {ne} enhancements",
            file=sys.stderr,
        )

    output_data = {
        "game": "Warhammer 40,000",
        "edition": "10th",
        "total_detachments": total_det,
        "total_stratagems": total_strat,
        "total_enhancements": total_enh,
        "factions": all_factions,
    }

    if args.output:
        out_path = Path(args.output)
    elif input_path.is_file():
        out_path = input_path.with_name(input_path.stem + "_rules.json")
    else:
        out_path = input_path / "all_rules.json"

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)

    print(
        f"\nWrote {total_det} detachments, {total_strat} stratagems, "
        f"{total_enh} enhancements to {out_path}",
        file=sys.stderr,
    )


if __name__ == "__main__":
    main()
