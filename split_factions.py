#!/usr/bin/env python3
"""
Split monolithic all_datasheets.json and all_rules.json into per-faction
files plus a lightweight index for lazy-loading in the webapp.

Usage:
    python split_factions.py [-o output_dir]

Reads:
    all_datasheets.json   — combined datasheets (from wahapedia_scraper.py)
    all_rules.json        — combined rules (from wahapedia_rules_scraper.py)

Produces:
    output_dir/
        index.json                       — faction list with metadata
        datasheets/
            space-marines.json           — per-faction datasheet file
            orks.json
            ...
        rules/
            space-marines.json           — per-faction rules file
            orks.json
            ...
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path


def slugify(name: str) -> str:
    """Convert a faction name to a URL-safe slug."""
    s = name.lower().strip()
    s = re.sub(r"[''']", "", s)           # Remove apostrophes
    s = re.sub(r"[^a-z0-9]+", "-", s)     # Non-alphanum → hyphen
    s = s.strip("-")
    return s


def split_datasheets(data: dict, out_dir: Path) -> list[dict]:
    """Split datasheets into per-faction files. Returns index entries."""
    ds_dir = out_dir / "datasheets"
    ds_dir.mkdir(parents=True, exist_ok=True)

    entries = []
    seen_slugs: dict[str, str] = {}

    for faction in data.get("factions", []):
        name = faction.get("faction", "unknown")
        slug = slugify(name)

        # Skip empty factions (e.g. duplicate Leagues of Votann with 0 units)
        datasheets = faction.get("datasheets", [])
        if not datasheets:
            continue

        # Handle slug collisions (e.g. duplicate Aeldari files)
        if slug in seen_slugs:
            # Keep the one with more datasheets
            existing_path = ds_dir / f"{slug}.json"
            if existing_path.exists():
                with open(existing_path, "r") as f:
                    existing = json.load(f)
                if len(existing.get("datasheets", [])) >= len(datasheets):
                    continue  # Existing is bigger, skip this one
                # Otherwise overwrite with this one and update the entry
                entries = [e for e in entries if e["slug"] != slug]

        seen_slugs[slug] = name

        faction_file = {
            "faction": name,
            "datasheet_count": len(datasheets),
            "datasheets": datasheets,
        }
        outpath = ds_dir / f"{slug}.json"
        with open(outpath, "w", encoding="utf-8") as f:
            json.dump(faction_file, f, ensure_ascii=False)

        size_kb = outpath.stat().st_size / 1024

        entries.append({
            "faction": name,
            "slug": slug,
            "datasheet_count": len(datasheets),
            "datasheet_file": f"datasheets/{slug}.json",
            "datasheet_size_kb": round(size_kb, 1),
        })

    return entries


def split_rules(data: dict, out_dir: Path, entries: list[dict]) -> list[dict]:
    """Split rules into per-faction files. Merges info into existing entries."""
    rules_dir = out_dir / "rules"
    rules_dir.mkdir(parents=True, exist_ok=True)

    # Index entries by faction name for merging
    entry_map = {e["faction"]: e for e in entries}

    for faction in data.get("factions", []):
        name = faction.get("faction", "unknown")
        slug = slugify(name)

        detachments = faction.get("detachments", [])
        strat_count = sum(len(d.get("stratagems", [])) for d in detachments)
        enh_count = sum(len(d.get("enhancements", [])) for d in detachments)

        faction_file = {
            "faction": name,
            "army_rules": faction.get("army_rules", []),
            "detachment_count": len(detachments),
            "detachments": detachments,
        }
        outpath = rules_dir / f"{slug}.json"
        with open(outpath, "w", encoding="utf-8") as f:
            json.dump(faction_file, f, ensure_ascii=False)

        size_kb = outpath.stat().st_size / 1024

        if name in entry_map:
            entry_map[name]["rules_file"] = f"rules/{slug}.json"
            entry_map[name]["rules_size_kb"] = round(size_kb, 1)
            entry_map[name]["detachment_count"] = len(detachments)
            entry_map[name]["stratagem_count"] = strat_count
            entry_map[name]["enhancement_count"] = enh_count
        else:
            # Rules-only faction (no datasheets)
            entries.append({
                "faction": name,
                "slug": slug,
                "datasheet_count": 0,
                "rules_file": f"rules/{slug}.json",
                "rules_size_kb": round(size_kb, 1),
                "detachment_count": len(detachments),
                "stratagem_count": strat_count,
                "enhancement_count": enh_count,
            })

    return entries


def main():
    parser = argparse.ArgumentParser(description="Split faction data into per-faction files")
    parser.add_argument("-o", "--output", default="factions",
                        help="Output directory (default: factions)")
    parser.add_argument("--datasheets", default="all_datasheets.json",
                        help="Path to combined datasheets JSON")
    parser.add_argument("--rules", default="all_rules.json",
                        help="Path to combined rules JSON")
    args = parser.parse_args()

    out_dir = Path(args.output)
    out_dir.mkdir(parents=True, exist_ok=True)

    # Load and split datasheets
    print(f"Loading {args.datasheets}...")
    with open(args.datasheets, "r", encoding="utf-8") as f:
        ds_data = json.load(f)

    entries = split_datasheets(ds_data, out_dir)
    print(f"  Split {sum(e['datasheet_count'] for e in entries)} datasheets "
          f"across {len(entries)} factions")

    # Load and split rules
    print(f"Loading {args.rules}...")
    with open(args.rules, "r", encoding="utf-8") as f:
        rules_data = json.load(f)

    entries = split_rules(rules_data, out_dir, entries)
    print(f"  Split rules for {sum(1 for e in entries if 'rules_file' in e)} factions")

    # Sort entries by faction name
    entries.sort(key=lambda e: e["faction"])

    # Write index
    index = {
        "game": "Warhammer 40,000",
        "edition": "10th",
        "faction_count": len(entries),
        "total_datasheets": sum(e["datasheet_count"] for e in entries),
        "total_detachments": sum(e.get("detachment_count", 0) for e in entries),
        "total_stratagems": sum(e.get("stratagem_count", 0) for e in entries),
        "total_enhancements": sum(e.get("enhancement_count", 0) for e in entries),
        "factions": entries,
    }
    index_path = out_dir / "index.json"
    with open(index_path, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)

    index_size = index_path.stat().st_size / 1024
    total_ds_size = sum(e.get("datasheet_size_kb", 0) for e in entries)
    total_rules_size = sum(e.get("rules_size_kb", 0) for e in entries)

    print(f"\nOutput: {out_dir}/")
    print(f"  index.json:        {index_size:.1f} KB")
    print(f"  datasheets/:       {total_ds_size:.0f} KB across {len(list((out_dir / 'datasheets').glob('*.json')))} files")
    print(f"  rules/:            {total_rules_size:.0f} KB across {len(list((out_dir / 'rules').glob('*.json')))} files")
    print(f"  Total:             {index_size + total_ds_size + total_rules_size:.0f} KB")


if __name__ == "__main__":
    main()
