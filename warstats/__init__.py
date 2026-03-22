"""
warstats - Warhammer 40,000 10th Edition datasheet and rules data package.

Provides typed Pydantic models for datasheets, weapons, abilities, factions,
stratagems, enhancements, and detachments, plus loaders to hydrate them from
scraped JSON files.

Quick start (datasheets):
    from warstats import load_json, GameData

    game = load_json("all_datasheets.json")
    for faction in game.factions:
        for unit in faction.datasheets:
            print(unit.name, unit.stats.T, unit.stats.Sv)

Quick start (rules):
    from warstats import load_rules_json, RulesData

    rules = load_rules_json("all_rules.json")
    sm = rules.get_faction_rules("Space Marines")
    gladius = sm.get_detachment("Gladius Task Force")
    for strat in gladius.stratagems:
        print(strat.name, strat.cp_cost, strat.target_keywords)
"""

from warstats.models import (
    Ability,
    AbilityBlock,
    ArmyRule,
    Detachment,
    DetachmentRule,
    DiceExpr,
    Enhancement,
    Faction,
    FactionRules,
    GameData,
    ModelDefinition,
    Movement,
    PointsOption,
    Range,
    RollTarget,
    RulesData,
    Skill,
    Stats,
    Stratagem,
    TurnPhase,
    UnitComposition,
    UnitDatasheet,
    WargearOption,
    Weapon,
    WeaponType,
)
from warstats.loader import (
    load_json,
    load_directory,
    load_faction,
    load_rules_json,
    load_rules_directory,
    FactionIndex,
    load_index,
    load_faction_by_slug,
    load_faction_rules_by_slug,
)

__all__ = [
    "Ability",
    "AbilityBlock",
    "ArmyRule",
    "Detachment",
    "DetachmentRule",
    "DiceExpr",
    "Enhancement",
    "Faction",
    "FactionRules",
    "GameData",
    "ModelDefinition",
    "Movement",
    "PointsOption",
    "Range",
    "RollTarget",
    "RulesData",
    "Skill",
    "Stats",
    "Stratagem",
    "TurnPhase",
    "UnitComposition",
    "UnitDatasheet",
    "WargearOption",
    "Weapon",
    "WeaponType",
    "load_json",
    "load_directory",
    "load_faction",
    "load_rules_json",
    "load_rules_directory",
    "FactionIndex",
    "load_index",
    "load_faction_by_slug",
    "load_faction_rules_by_slug",
]
