"""
Map BattleScribe catalogue names to our standardised faction names.

Handles merging Space Marine chapters, Aeldari sub-factions, and
normalising naming differences (T'au → Tau, etc.).
"""

from __future__ import annotations

# BattleScribe catalogue name -> our faction name
# Catalogues that map to the same name will be merged.
FACTION_MAP: dict[str, str] = {
    # Imperium
    "Imperium - Adepta Sororitas": "Adepta Sororitas",
    "Imperium - Adeptus Custodes": "Adeptus Custodes",
    "Imperium - Adeptus Mechanicus": "Adeptus Mechanicus",
    "Imperium - Adeptus Titanicus": "Adeptus Titanicus",
    "Imperium - Agents of the Imperium": "Imperial Agents",
    "Imperium - Astra Militarum": "Astra Militarum",
    "Imperium - Astra Militarum - Library": None,  # Library, skip as standalone
    "Imperium - Grey Knights": "Grey Knights",
    "Imperium - Imperial Knights": "Imperial Knights",
    "Imperium - Imperial Knights - Library": None,  # Library
    # Space Marines (all merge into one)
    "Imperium - Adeptus Astartes - Space Marines": "Space Marines",
    "Imperium - Adeptus Astartes - Black Templars": "Space Marines",
    "Imperium - Adeptus Astartes - Blood Angels": "Space Marines",
    "Imperium - Adeptus Astartes - Dark Angels": "Space Marines",
    "Imperium - Adeptus Astartes - Deathwatch": "Space Marines",
    "Imperium - Adeptus Astartes - Imperial Fists": "Space Marines",
    "Imperium - Adeptus Astartes - Iron Hands": "Space Marines",
    "Imperium - Adeptus Astartes - Raven Guard": "Space Marines",
    "Imperium - Adeptus Astartes - Salamanders": "Space Marines",
    "Imperium - Adeptus Astartes - Space Wolves": "Space Marines",
    "Imperium - Adeptus Astartes - Ultramarines": "Space Marines",
    "Imperium - Adeptus Astartes - White Scars": "Space Marines",
    # Chaos
    "Chaos - Chaos Daemons": "Chaos Daemons",
    "Chaos - Chaos Knights": "Chaos Knights",
    "Chaos - Chaos Knights Library": None,  # Library
    "Chaos - Chaos Space Marines": "Chaos Space Marines",
    "Chaos - Death Guard": "Death Guard",
    "Chaos - Emperor's Children": "Emperors Children",
    "Chaos - Thousand Sons": "Thousand Sons",
    "Chaos - Titanicus Traitoris": "Adeptus Titanicus",  # Merge with Imperial Titans
    "Chaos - World Eaters": "World Eaters",
    "Chaos - Chaos Daemons Library": None,  # Library
    "Chaos - Daemons Library": None,  # Library (alternate name)
    # Xenos
    "Xenos - Aeldari": "Aeldari",
    "Aeldari - Aeldari Library": None,  # Library
    "Xenos - Drukhari": "Drukhari",
    "Aeldari - Ynnari": "Aeldari",  # Merge with Aeldari
    "Xenos - Genestealer Cults": "Genestealer Cults",
    "Xenos - Leagues of Votann": "Leagues Of Votann",
    "Xenos - Necrons": "Necrons",
    "Xenos - Orks": "Orks",
    "Xenos - T'au Empire": "Tau Empire",
    "Xenos - Tyranids": "Tyranids",
    # Misc
    "Unaligned Forces": "Unaligned Forces",
    # Libraries (skip)
    "Library - Astartes Heresy Legends": None,
    "Library - Titans": None,
    "Library - Tyranids": None,
}


def get_faction_name(catalogue_name: str) -> str | None:
    """
    Map a BattleScribe catalogue name to our standardised faction name.

    Returns None if the catalogue should be skipped (libraries, etc.).
    """
    return FACTION_MAP.get(catalogue_name)
