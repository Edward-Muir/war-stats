"""
Load all BattleScribe XML files (.gst + .cat) and build a global ID registry
for cross-file reference resolution.
"""

from __future__ import annotations

import os
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Iterator

# BattleScribe XML namespaces
GST_NS = "http://www.battlescribe.net/schema/gameSystemSchema"
CAT_NS = "http://www.battlescribe.net/schema/catalogueSchema"

# Profile type IDs (from the .gst)
UNIT_PROFILE_TYPE = "c547-1836-d8a-ff4f"
RANGED_WEAPON_TYPE = "f77d-b953-8fa4-b762"
MELEE_WEAPON_TYPE = "8a40-4aaa-c780-9046"
ABILITIES_TYPE = "9cc3-6d83-4dd3-9b64"
TRANSPORT_TYPE = "74f8-5443-9d6d-1f1e"

# Cost type ID for points
POINTS_COST_TYPE = "51b2-306e-1021-d207"


class Catalogue:
    """A parsed .cat or .gst file with its metadata."""

    def __init__(self, path: Path, root: ET.Element, ns: str):
        self.path = path
        self.root = root
        self.ns = ns
        self.id: str = root.get("id", "")
        self.name: str = root.get("name", "")
        self.is_library: bool = root.get("library", "false") == "true"
        self.is_gst: bool = ns == GST_NS

    def tag(self, local: str) -> str:
        return f"{{{self.ns}}}{local}"

    def __repr__(self) -> str:
        kind = "GST" if self.is_gst else ("LIB" if self.is_library else "CAT")
        return f"<{kind} {self.name!r}>"


class CatalogueRegistry:
    """
    Loads all BattleScribe XML files from a directory and provides
    cross-file element lookup by ID.
    """

    def __init__(self, bsdata_dir: str | Path):
        self.bsdata_dir = Path(bsdata_dir)
        self.game_system: Catalogue | None = None
        self.catalogues: dict[str, Catalogue] = {}  # cat_id -> Catalogue
        self.by_name: dict[str, Catalogue] = {}  # cat_name -> Catalogue

        # Global element index: element_id -> (element, source_catalogue)
        self._id_index: dict[str, tuple[ET.Element, Catalogue]] = {}

        # Core ability names from the game system shared rules
        self.core_ability_names: set[str] = set()

        # Category definitions: category_id -> category_name
        self.categories: dict[str, str] = {}

        self._load_all()

    def _load_all(self) -> None:
        """Load .gst first, then all .cat files."""
        # Load game system
        for f in self.bsdata_dir.glob("*.gst"):
            self._load_file(f, GST_NS)
            break

        # Load all catalogues
        for f in sorted(self.bsdata_dir.glob("*.cat")):
            self._load_file(f, CAT_NS)

        # Build category index from game system
        if self.game_system:
            self._index_categories(self.game_system)

        # Also get categories from catalogues (some define their own)
        for cat in self.catalogues.values():
            self._index_categories(cat)

        # Collect core ability names from game system shared rules
        if self.game_system:
            self._collect_core_abilities(self.game_system)

    def _load_file(self, path: Path, ns: str) -> None:
        """Parse an XML file and index all elements with id attributes."""
        tree = ET.parse(path)
        root = tree.getroot()
        cat = Catalogue(path, root, ns)

        if ns == GST_NS:
            self.game_system = cat
        else:
            self.catalogues[cat.id] = cat
            self.by_name[cat.name] = cat

        # Index every element with an id attribute
        self._index_elements(root, cat, ns)

    def _index_elements(self, root: ET.Element, cat: Catalogue, ns: str) -> None:
        """Walk the XML tree and register every element that has an id."""
        for elem in root.iter():
            elem_id = elem.get("id")
            if elem_id:
                self._id_index[elem_id] = (elem, cat)

    def _index_categories(self, cat: Catalogue) -> None:
        """Extract category definitions from a catalogue."""
        tag = cat.tag("categoryEntry")
        for elem in cat.root.iter(tag):
            cat_id = elem.get("id", "")
            cat_name = elem.get("name", "")
            if cat_id and cat_name:
                self.categories[cat_id] = cat_name

    def _collect_core_abilities(self, gst: Catalogue) -> None:
        """Collect shared rule names from the game system as core abilities."""
        tag = gst.tag("rule")
        for rule in gst.root.iter(tag):
            name = rule.get("name", "")
            if name:
                self.core_ability_names.add(name)

    def lookup(self, element_id: str) -> ET.Element | None:
        """Look up an element by its ID across all loaded files."""
        entry = self._id_index.get(element_id)
        return entry[0] if entry else None

    def lookup_with_source(self, element_id: str) -> tuple[ET.Element, Catalogue] | None:
        """Look up an element and its source catalogue."""
        return self._id_index.get(element_id)

    def resolve_link(self, link: ET.Element) -> ET.Element | None:
        """Resolve an entryLink or infoLink to its target element."""
        target_id = link.get("targetId")
        if not target_id:
            return None
        return self.lookup(target_id)

    def faction_catalogues(self) -> Iterator[Catalogue]:
        """Yield non-library catalogues (the actual faction rosters)."""
        for cat in self.catalogues.values():
            if not cat.is_library:
                yield cat

    def get_catalogue_imports(self, cat: Catalogue) -> list[Catalogue]:
        """Get all catalogues imported by a given catalogue via catalogueLinks."""
        imports = []
        tag = cat.tag("catalogueLink")
        for link in cat.root.iter(tag):
            target_id = link.get("targetId", "")
            if target_id in self.catalogues:
                imports.append(self.catalogues[target_id])
            else:
                # Try lookup by name since some catalogueLinks use name matching
                target_name = link.get("name", "")
                if target_name in self.by_name:
                    imports.append(self.by_name[target_name])
        return imports

    def iter_unit_entries(self, cat: Catalogue) -> Iterator[tuple[ET.Element, str]]:
        """
        Yield (unit_element, unit_name) for all units in a catalogue.

        This handles three patterns:
        1. Units with type="unit"
        2. Single-model character units with type="model" (e.g., Canoness)
        3. Units imported via root-level entryLinks that reference units in libraries
        """
        ns = cat.ns
        se_tag = f"{{{ns}}}selectionEntry"
        el_tag = f"{{{ns}}}entryLink"

        # Track seen entries to avoid duplicates
        seen = set()

        # Pattern 1: Units defined directly in this catalogue
        # Look for both type="unit" and standalone type="model" (single-model character units)
        shared_entries = cat.root.find(f"{{{ns}}}sharedSelectionEntries")
        if shared_entries is not None:
            for entry in shared_entries.iter(se_tag):
                entry_type = entry.get("type", "")
                if entry_type in ("unit", "model"):
                    name = entry.get("name", "")
                    entry_id = entry.get("id", "")
                    if not _is_hidden(entry) and entry_id not in seen:
                        seen.add(entry_id)
                        yield entry, name

        # Pattern 2: Root-level entryLinks importing units from libraries
        entry_links_container = cat.root.find(f"{{{ns}}}entryLinks")
        if entry_links_container is not None:
            for link in entry_links_container:
                if link.tag != el_tag:
                    continue
                target_id = link.get("targetId", "")
                target = self.lookup(target_id)
                if target is not None:
                    target_type = target.get("type", "")
                    target_id_val = target.get("id", "")
                    if target_type in ("unit", "model") and target_id_val not in seen:
                        name = link.get("name", "") or target.get("name", "")
                        if not _is_hidden(link) and not _is_hidden(target):
                            seen.add(target_id_val)
                            yield target, name


def _is_hidden(elem: ET.Element) -> bool:
    """Check if an element is hidden by default (without evaluating modifiers)."""
    return elem.get("hidden", "false") == "true"


def get_characteristics(profile: ET.Element, ns: str) -> dict[str, str]:
    """Extract characteristic name->value map from a profile element."""
    result: dict[str, str] = {}
    char_tag = f"{{{ns}}}characteristic"
    for char in profile.iter(char_tag):
        name = char.get("name", "")
        value = (char.text or "").strip()
        if name:
            result[name] = value
    return result
