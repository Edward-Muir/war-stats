#!/usr/bin/env python3
"""
Convert BattleScribe XML data (BSData/wh40k-10e) into our v2 JSON format.

Usage:
    python battlescribe_converter.py [--bsdata-dir DIR] [-o OUTPUT] [--no-pull] [--force]

First run:  Clones BSData/wh40k-10e into bsdata_repo/
Later runs: Pulls latest, skips conversion if nothing changed.
"""

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

from warstats.bsdata.registry import CatalogueRegistry
from warstats.bsdata.extractor import extract_unit
from warstats.bsdata.faction_map import get_faction_name

BSDATA_REPO_URL = "https://github.com/BSData/wh40k-10e.git"
DEFAULT_BSDATA_DIR = "bsdata_repo"
LAST_BUILD_FILE = ".bsdata_last_build"


def get_git_head(repo_dir: str) -> str:
    """Get the current HEAD commit hash of a git repo."""
    result = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        cwd=repo_dir,
        capture_output=True,
        text=True,
    )
    return result.stdout.strip()


def ensure_repo(bsdata_dir: str, no_pull: bool = False) -> None:
    """Clone or pull the BSData repo."""
    if not os.path.exists(bsdata_dir):
        print(f"Cloning {BSDATA_REPO_URL} into {bsdata_dir}...")
        subprocess.run(
            ["git", "clone", "--depth", "1", BSDATA_REPO_URL, bsdata_dir],
            check=True,
        )
    elif not no_pull:
        print(f"Pulling latest in {bsdata_dir}...")
        subprocess.run(
            ["git", "pull", "--ff-only"],
            cwd=bsdata_dir,
            check=True,
        )


def check_if_changed(bsdata_dir: str, force: bool = False) -> bool:
    """Check if the repo has changed since last build. Returns True if rebuild needed."""
    if force:
        return True

    current_hash = get_git_head(bsdata_dir)

    if os.path.exists(LAST_BUILD_FILE):
        with open(LAST_BUILD_FILE) as f:
            last_hash = f.read().strip()
        if last_hash == current_hash:
            print(f"Already up to date (hash: {current_hash[:8]})")
            return False

    return True


def save_build_hash(bsdata_dir: str) -> None:
    """Record the current commit hash after a successful build."""
    current_hash = get_git_head(bsdata_dir)
    with open(LAST_BUILD_FILE, "w") as f:
        f.write(current_hash)


def convert(bsdata_dir: str) -> dict:
    """
    Run the full conversion: load XML, extract units, build JSON.
    Returns the complete datasheets dict ready for JSON serialization.
    """
    print("Loading BattleScribe data...")
    registry = CatalogueRegistry(bsdata_dir)
    print(f"  Loaded {len(registry.catalogues)} catalogues, "
          f"{len(registry._id_index)} indexed elements, "
          f"{len(registry.categories)} categories")

    # Collect units by faction
    factions: dict[str, dict] = {}  # faction_name -> {"datasheets": [...], "weapons": {...}}

    for cat in registry.faction_catalogues():
        faction_name = get_faction_name(cat.name)
        if faction_name is None:
            continue

        if faction_name not in factions:
            factions[faction_name] = {"datasheets": [], "weapons": {}}

        unit_count = 0
        for unit_elem, unit_name in registry.iter_unit_entries(cat):
            datasheet = extract_unit(unit_elem, unit_name, registry, cat)
            if datasheet is None:
                continue

            # Merge weapon registry
            for wid, weapon in datasheet.get("weapons", {}).items():
                if wid not in factions[faction_name]["weapons"]:
                    factions[faction_name]["weapons"][wid] = weapon

            # Remove internal _id fields from weapons before adding to datasheet
            clean_weapons: dict[str, dict] = {}
            for wid, weapon in datasheet["weapons"].items():
                clean = {k: v for k, v in weapon.items() if not k.startswith("_")}
                clean_weapons[wid] = clean
            datasheet["weapons"] = clean_weapons

            # Deduplicate: skip if unit already exists in this faction
            existing_names = {ds["name"] for ds in factions[faction_name]["datasheets"]}
            if unit_name not in existing_names:
                factions[faction_name]["datasheets"].append(datasheet)
                unit_count += 1

        if unit_count > 0:
            print(f"  {cat.name:50s} → {faction_name:25s} ({unit_count} units)")

    # Clean up faction weapon registries (remove _id fields)
    for fname, fdata in factions.items():
        clean = {}
        for wid, weapon in fdata["weapons"].items():
            clean[wid] = {k: v for k, v in weapon.items() if not k.startswith("_")}
        fdata["weapons"] = clean

    # Build output
    total_datasheets = sum(len(f["datasheets"]) for f in factions.values())
    print(f"\nTotal: {total_datasheets} datasheets across {len(factions)} factions")

    output = {
        "game": "Warhammer 40,000",
        "edition": "10th",
        "source": "BSData/wh40k-10e",
        "schema_version": 2,
        "total_datasheets": total_datasheets,
        "factions": [
            {
                "faction": name,
                "datasheet_count": len(fdata["datasheets"]),
                "weapons": fdata["weapons"],
                "datasheets": fdata["datasheets"],
            }
            for name, fdata in sorted(factions.items())
        ],
    }

    return output


def main():
    parser = argparse.ArgumentParser(
        description="Convert BattleScribe XML data to Warstats JSON format"
    )
    parser.add_argument(
        "--bsdata-dir", default=DEFAULT_BSDATA_DIR,
        help=f"Path to BSData/wh40k-10e repo (default: {DEFAULT_BSDATA_DIR})"
    )
    parser.add_argument(
        "-o", "--output", default="all_datasheets.json",
        help="Output JSON file (default: all_datasheets.json)"
    )
    parser.add_argument(
        "--no-pull", action="store_true",
        help="Skip git pull (use existing local data)"
    )
    parser.add_argument(
        "--force", action="store_true",
        help="Force rebuild even if data hasn't changed"
    )
    args = parser.parse_args()

    # Ensure repo exists and is up to date
    ensure_repo(args.bsdata_dir, args.no_pull)

    # Check if rebuild is needed
    if not check_if_changed(args.bsdata_dir, args.force):
        return

    # Run conversion
    output = convert(args.bsdata_dir)

    # Write output
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False)

    output_size = os.path.getsize(args.output) / 1024
    print(f"\nWrote {args.output} ({output_size:.0f} KB)")

    # Save build hash
    save_build_hash(args.bsdata_dir)
    print("Build hash saved.")


if __name__ == "__main__":
    main()
