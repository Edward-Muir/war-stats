"""
Pydantic models for Warhammer 40,000 10th Edition datasheets and rules.

Every field uses the exact terminology from the game rules so that
downstream consumers (damage calculators, army builders, etc.) can
work with familiar names.

Stat values are strictly validated — they must match the patterns
actually used in the game (integers, dice expressions like D6/2D3+1,
roll targets like 3+, etc.).

Rules models (stratagems, enhancements, detachments) support keyword-based
matching to datasheets, enabling the damage calculator to determine which
stratagems and enhancements apply to which units.
"""

from __future__ import annotations

import math
import re
from enum import Enum
from typing import Annotated, Optional

from pydantic import (
    BaseModel,
    Field,
    GetCoreSchemaHandler,
    computed_field,
    field_validator,
    model_validator,
)
from pydantic_core import CoreSchema, core_schema


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class WeaponType(str, Enum):
    """Whether a weapon is ranged or melee."""
    RANGED = "ranged"
    MELEE = "melee"


# ---------------------------------------------------------------------------
# Core value types
# ---------------------------------------------------------------------------

# Regex that matches all valid dice expressions we've observed:
#   "3", "D3", "D6", "2D3", "2D6", "4D6", "D6+2", "2D3+3", "2D6+6" etc.
_DICE_RE = re.compile(
    r"^(?P<num>[1-9]\d*)?D(?P<sides>[36])(?:\+(?P<mod>[1-9]\d*))?$", re.IGNORECASE
)
_INT_RE = re.compile(r"^[0-9]+$")


class DiceExpr:
    """
    An immutable value object representing either a fixed integer or a
    dice expression (e.g. D6, 2D3+1).  Parses from strings, provides
    min / max / average for the damage calculator.

    Valid forms:
        "5"       -> fixed 5
        "D6"      -> 1D6+0
        "2D3"     -> 2D3+0
        "D6+2"    -> 1D6+2
        "2D3+3"   -> 2D3+3
    """

    __slots__ = ("num_dice", "die_sides", "modifier", "raw")

    def __init__(self, raw: str, *, num_dice: int = 0, die_sides: int = 0, modifier: int = 0):
        object.__setattr__(self, "raw", raw)
        object.__setattr__(self, "num_dice", num_dice)
        object.__setattr__(self, "die_sides", die_sides)
        object.__setattr__(self, "modifier", modifier)

    # -- Factories -----------------------------------------------------------

    @classmethod
    def parse(cls, value: str | int | DiceExpr) -> DiceExpr:
        """Parse a string or int into a DiceExpr, or pass through if already one."""
        if isinstance(value, cls):
            return value
        if isinstance(value, int):
            return cls(str(value), modifier=value)

        raw = str(value).strip()

        # Plain integer
        if _INT_RE.match(raw):
            return cls(raw, modifier=int(raw))

        # Dice expression
        m = _DICE_RE.match(raw)
        if m:
            num = int(m.group("num") or 1)
            sides = int(m.group("sides"))
            mod = int(m.group("mod") or 0)
            return cls(raw, num_dice=num, die_sides=sides, modifier=mod)

        raise ValueError(
            f"Invalid dice expression: {raw!r}. "
            f"Expected an integer or NdX+Y pattern (e.g. '3', 'D6', '2D3+1')."
        )

    # -- Properties ----------------------------------------------------------

    @property
    def is_fixed(self) -> bool:
        """True when there is no randomness (plain integer)."""
        return self.num_dice == 0

    @property
    def fixed_value(self) -> int | None:
        """The exact integer value, or None if this involves dice."""
        return self.modifier if self.is_fixed else None

    @property
    def min(self) -> int:
        """Minimum possible result."""
        return self.num_dice * 1 + self.modifier if not self.is_fixed else self.modifier

    @property
    def max(self) -> int:
        """Maximum possible result."""
        return self.num_dice * self.die_sides + self.modifier if not self.is_fixed else self.modifier

    @property
    def average(self) -> float:
        """Statistical average (expected value)."""
        if self.is_fixed:
            return float(self.modifier)
        avg_per_die = (1 + self.die_sides) / 2.0
        return self.num_dice * avg_per_die + self.modifier

    # -- Dunder methods ------------------------------------------------------

    def __repr__(self) -> str:
        return f"DiceExpr({self.raw!r})"

    def __str__(self) -> str:
        return self.raw

    def __eq__(self, other: object) -> bool:
        if isinstance(other, DiceExpr):
            return (self.num_dice, self.die_sides, self.modifier) == (
                other.num_dice,
                other.die_sides,
                other.modifier,
            )
        return NotImplemented

    def __hash__(self) -> int:
        return hash((self.num_dice, self.die_sides, self.modifier))

    def __int__(self) -> int:
        """Return fixed value, or truncated average for dice expressions."""
        if self.is_fixed:
            return self.modifier
        return math.floor(self.average)

    # -- Pydantic integration ------------------------------------------------

    @classmethod
    def __get_pydantic_core_schema__(
        cls, source_type: type, handler: GetCoreSchemaHandler
    ) -> CoreSchema:
        return core_schema.no_info_plain_validator_function(
            cls._pydantic_validate,
            serialization=core_schema.plain_serializer_function_ser_schema(
                lambda v: v.raw, info_arg=False
            ),
        )

    @classmethod
    def _pydantic_validate(cls, value: str | int | DiceExpr) -> DiceExpr:
        return cls.parse(value)


class RollTarget:
    """
    An immutable value object for "roll N or higher" values like 3+, 4+.
    Used for Sv, Ld, BS, WS, and invulnerable saves.

    Stores the numeric threshold so `RollTarget("3+").value == 3`.
    """

    __slots__ = ("value", "raw")

    def __init__(self, raw: str, value: int):
        object.__setattr__(self, "raw", raw)
        object.__setattr__(self, "value", value)

    @classmethod
    def parse(cls, v: str | int | RollTarget) -> RollTarget:
        if isinstance(v, cls):
            return v
        if isinstance(v, int):
            return cls(f"{v}+", v)
        raw = str(v).strip()
        m = re.match(r"^(\d+)\+\*?$", raw)
        if m:
            return cls(raw, int(m.group(1)))
        raise ValueError(
            f"Invalid roll target: {raw!r}. Expected 'N+' pattern (e.g. '3+', '4+')."
        )

    @property
    def probability(self) -> float:
        """Probability of succeeding on a D6 (e.g. 3+ -> 4/6)."""
        if self.value > 6:
            return 0.0
        if self.value <= 1:
            return 1.0
        return (7 - self.value) / 6.0

    def __repr__(self) -> str:
        return f"RollTarget({self.raw!r})"

    def __str__(self) -> str:
        return self.raw

    def __int__(self) -> int:
        return self.value

    def __eq__(self, other: object) -> bool:
        if isinstance(other, RollTarget):
            return self.value == other.value
        return NotImplemented

    def __hash__(self) -> int:
        return hash(self.value)

    @classmethod
    def __get_pydantic_core_schema__(
        cls, source_type: type, handler: GetCoreSchemaHandler
    ) -> CoreSchema:
        return core_schema.no_info_plain_validator_function(
            cls._pydantic_validate,
            serialization=core_schema.plain_serializer_function_ser_schema(
                lambda v: v.raw, info_arg=False
            ),
        )

    @classmethod
    def _pydantic_validate(cls, value: str | int | RollTarget) -> RollTarget:
        return cls.parse(value)


class Movement:
    """
    Unit movement value.  Valid forms:
        '7"'   -> inches=7, is_minimum=False
        '20+"' -> inches=20, is_minimum=True  (20" minimum move)
        '-'    -> inches=0, immobile=True
    """

    __slots__ = ("inches", "is_minimum", "immobile", "raw")

    def __init__(self, raw: str, *, inches: int = 0, is_minimum: bool = False, immobile: bool = False):
        object.__setattr__(self, "raw", raw)
        object.__setattr__(self, "inches", inches)
        object.__setattr__(self, "is_minimum", is_minimum)
        object.__setattr__(self, "immobile", immobile)

    @classmethod
    def parse(cls, v: str | Movement) -> Movement:
        if isinstance(v, cls):
            return v
        raw = str(v).strip()
        if raw == "-":
            return cls(raw, immobile=True)
        m = re.match(r'^(\d+)\+"?$', raw.rstrip('"'))
        if m:
            return cls(raw, inches=int(m.group(1)), is_minimum=True)
        m = re.match(r'^(\d+)"?$', raw.rstrip('"'))
        if m:
            return cls(raw, inches=int(m.group(1)))
        raise ValueError(
            f"Invalid movement: {raw!r}. Expected 'N\"', 'N+\"', or '-'."
        )

    def __repr__(self) -> str:
        return f"Movement({self.raw!r})"

    def __str__(self) -> str:
        return self.raw

    def __int__(self) -> int:
        return self.inches

    def __eq__(self, other: object) -> bool:
        if isinstance(other, Movement):
            return (self.inches, self.is_minimum, self.immobile) == (
                other.inches,
                other.is_minimum,
                other.immobile,
            )
        return NotImplemented

    def __hash__(self) -> int:
        return hash((self.inches, self.is_minimum, self.immobile))

    @classmethod
    def __get_pydantic_core_schema__(
        cls, source_type: type, handler: GetCoreSchemaHandler
    ) -> CoreSchema:
        return core_schema.no_info_plain_validator_function(
            cls._pydantic_validate,
            serialization=core_schema.plain_serializer_function_ser_schema(
                lambda v: v.raw, info_arg=False
            ),
        )

    @classmethod
    def _pydantic_validate(cls, value: str | Movement) -> Movement:
        return cls.parse(value)


class Range:
    """
    Weapon range value.  Valid forms:
        '24"'   -> inches=24
        'Melee' -> melee=True
        'N/A'   -> not_applicable=True
    """

    __slots__ = ("inches", "melee", "not_applicable", "raw")

    def __init__(
        self,
        raw: str,
        *,
        inches: int = 0,
        melee: bool = False,
        not_applicable: bool = False,
    ):
        object.__setattr__(self, "raw", raw)
        object.__setattr__(self, "inches", inches)
        object.__setattr__(self, "melee", melee)
        object.__setattr__(self, "not_applicable", not_applicable)

    @classmethod
    def parse(cls, v: str | Range) -> Range:
        if isinstance(v, cls):
            return v
        raw = str(v).strip()
        if raw.lower() == "melee":
            return cls(raw, melee=True)
        if raw.upper() == "N/A":
            return cls(raw, not_applicable=True)
        m = re.match(r'^(\d+)"?$', raw)
        if m:
            return cls(raw, inches=int(m.group(1)))
        raise ValueError(
            f"Invalid range: {raw!r}. Expected 'N\"', 'Melee', or 'N/A'."
        )

    def __repr__(self) -> str:
        return f"Range({self.raw!r})"

    def __str__(self) -> str:
        return self.raw

    def __int__(self) -> int:
        return self.inches

    def __eq__(self, other: object) -> bool:
        if isinstance(other, Range):
            return (self.inches, self.melee, self.not_applicable) == (
                other.inches,
                other.melee,
                other.not_applicable,
            )
        return NotImplemented

    def __hash__(self) -> int:
        return hash((self.inches, self.melee, self.not_applicable))

    @classmethod
    def __get_pydantic_core_schema__(
        cls, source_type: type, handler: GetCoreSchemaHandler
    ) -> CoreSchema:
        return core_schema.no_info_plain_validator_function(
            cls._pydantic_validate,
            serialization=core_schema.plain_serializer_function_ser_schema(
                lambda v: v.raw, info_arg=False
            ),
        )

    @classmethod
    def _pydantic_validate(cls, value: str | Range) -> Range:
        return cls.parse(value)


class Skill:
    """
    BS or WS value — a roll target like 3+, or N/A for auto-hitting
    weapons (Torrent).
    """

    __slots__ = ("value", "auto_hit", "raw")

    def __init__(self, raw: str, *, value: int = 0, auto_hit: bool = False):
        object.__setattr__(self, "raw", raw)
        object.__setattr__(self, "value", value)
        object.__setattr__(self, "auto_hit", auto_hit)

    @classmethod
    def parse(cls, v: str | int | Skill | None) -> Skill | None:
        if v is None:
            return None
        if isinstance(v, cls):
            return v
        raw = str(v).strip()
        if raw.upper() in ("N/A", "-", ""):
            return cls(raw, auto_hit=True)
        m = re.match(r"^(\d+)\+$", raw)
        if m:
            return cls(raw, value=int(m.group(1)))
        raise ValueError(
            f"Invalid skill: {raw!r}. Expected 'N+' or 'N/A'."
        )

    @property
    def probability(self) -> float:
        """Probability of hitting on a D6."""
        if self.auto_hit:
            return 1.0
        if self.value > 6:
            return 0.0
        if self.value <= 1:
            return 1.0
        return (7 - self.value) / 6.0

    def __repr__(self) -> str:
        return f"Skill({self.raw!r})"

    def __str__(self) -> str:
        return self.raw

    def __int__(self) -> int:
        return self.value

    def __eq__(self, other: object) -> bool:
        if isinstance(other, Skill):
            return (self.value, self.auto_hit) == (other.value, other.auto_hit)
        return NotImplemented

    def __hash__(self) -> int:
        return hash((self.value, self.auto_hit))

    @classmethod
    def __get_pydantic_core_schema__(
        cls, source_type: type, handler: GetCoreSchemaHandler
    ) -> CoreSchema:
        return core_schema.no_info_plain_validator_function(
            cls._pydantic_validate,
            serialization=core_schema.plain_serializer_function_ser_schema(
                lambda v: v.raw if v is not None else None, info_arg=False
            ),
        )

    @classmethod
    def _pydantic_validate(cls, value: str | int | Skill | None) -> Skill | None:
        return cls.parse(value)


# ---------------------------------------------------------------------------
# Datasheet models
# ---------------------------------------------------------------------------

class Stats(BaseModel):
    """
    The core stat line for a unit: Movement, Toughness, Save, Wounds,
    Leadership, Objective Control.

    All values are strictly typed:
      M  -> Movement  (e.g. 7", 20+", -)
      T  -> int       (Toughness — always a plain integer)
      Sv -> RollTarget (e.g. 3+)
      W  -> int       (Wounds — always a plain integer)
      Ld -> RollTarget (e.g. 6+)
      OC -> int       (Objective Control — always a plain integer)
    """
    M: Movement = Field(description="Movement (e.g. 7\", 20+\", -)")
    T: int = Field(ge=0, description="Toughness")
    Sv: RollTarget = Field(description="Save (e.g. 3+)")
    W: int = Field(ge=0, description="Wounds")
    Ld: RollTarget = Field(description="Leadership (e.g. 6+)")
    OC: int = Field(ge=0, description="Objective Control")

    # -- Convenience aliases for back-compat / readability -------------------

    @computed_field
    @property
    def toughness(self) -> int:
        return self.T

    @computed_field
    @property
    def wounds(self) -> int:
        return self.W

    @computed_field
    @property
    def save_value(self) -> int:
        """Numeric save (e.g. 3+ -> 3)."""
        return self.Sv.value


class Weapon(BaseModel):
    """
    A single weapon profile (ranged or melee).

    Numeric stats use strict types:
      range -> Range    (24", Melee, N/A)
      A     -> DiceExpr (2, D6, 2D3+3)
      BS/WS -> Skill    (3+, N/A, None)
      S     -> DiceExpr (4, D6+6, 2D6)
      AP    -> int      (0, -1, -4)
      D     -> DiceExpr (1, D6, D6+2)
    """
    name: str = Field(description="Weapon name")
    type: WeaponType = Field(description="'ranged' or 'melee'")
    range: Range = Field(description="Range (24\", Melee, N/A)")
    A: DiceExpr = Field(description="Attacks (2, D6, 2D3+3)")
    BS: Optional[Skill] = Field(default=None, description="Ballistic Skill (3+, N/A)")
    WS: Optional[Skill] = Field(default=None, description="Weapon Skill (2+)")
    S: DiceExpr = Field(description="Strength (4, D6+6)")
    AP: int = Field(le=0, description="Armour Penetration (0, -1, -4)")
    D: DiceExpr = Field(description="Damage (1, D6, D6+2)")
    keywords: list[str] = Field(default_factory=list, description="Weapon keywords")

    @computed_field
    @property
    def skill(self) -> Optional[Skill]:
        """The relevant hit roll stat — BS for ranged, WS for melee."""
        return self.BS if self.type == WeaponType.RANGED else self.WS

    @computed_field
    @property
    def skill_value(self) -> int:
        """Numeric skill value (e.g. 3+ -> 3). Returns 0 for auto-hit weapons."""
        s = self.skill
        if s is None or s.auto_hit:
            return 0
        return s.value

    @computed_field
    @property
    def hit_probability(self) -> float:
        """Probability of hitting per attack (0.0–1.0)."""
        s = self.skill
        return s.probability if s else 1.0

    @computed_field
    @property
    def average_attacks(self) -> float:
        """Expected number of attacks."""
        return self.A.average

    @computed_field
    @property
    def average_damage(self) -> float:
        """Expected damage per unsaved wound."""
        return self.D.average

    def has_keyword(self, keyword: str) -> bool:
        """Case-insensitive check if this weapon has a given keyword."""
        kw_lower = keyword.lower()
        return any(kw_lower in k.lower() for k in self.keywords)


class Ability(BaseModel):
    """A single named ability with its rules text."""
    name: str = Field(description="Ability name (e.g. 'Tactical Acumen')")
    description: str = Field(default="", description="Rules text for the ability")


class AbilityBlock(BaseModel):
    """
    All abilities for a unit, categorised by type.
    """
    core: list[str] = Field(default_factory=list)
    faction: list[str] = Field(default_factory=list)
    other: list[Ability] = Field(default_factory=list)
    damaged: Optional[str] = Field(default=None)
    damaged_description: Optional[str] = Field(default=None)


class PointsOption(BaseModel):
    """Points cost for a particular model count."""
    models: str = Field(description="Model count description (e.g. '5 models')")
    points: int = Field(ge=0, description="Points cost")

    @field_validator("points", mode="before")
    @classmethod
    def _coerce_points(cls, v: str | int) -> int:
        return int(v)


class ModelDefinition(BaseModel):
    """
    A type of model in a unit with its count range and default equipment.

    e.g. "5-10 Cthonian Beserks" armed with heavy plasma axe
         "1 Repentia Superior" armed with bolt pistol, neural whips
    """
    name: str = Field(description="Model type name (e.g. 'Shock Trooper Sergeant')")
    min_models: int = Field(ge=0, description="Minimum count of this model type")
    max_models: int = Field(ge=0, description="Maximum count of this model type")
    default_equipment: list[str] = Field(
        default_factory=list,
        description="Weapon/equipment names each model starts with",
    )


class WargearOption(BaseModel):
    """
    A single wargear swap or addition rule from the WARGEAR OPTIONS section.

    The raw text is always preserved. Structured fields are best-effort
    extraction from the natural language rules text.

    Scope types:
      - 'all_models': every model in the unit can take this option
      - 'per_n_models': for every N models, up to max_per_n can take it
      - 'this_model': a single-model unit option
      - 'named_model': applies to a specific named model (model_name field)
      - 'specific_count': N specific models can take it

    The damage calculator uses this to validate and enumerate valid loadouts.
    """
    raw: str = Field(description="Full original wargear option text")
    type: str = Field(default="", description="'replace' or 'add'")
    scope: str = Field(default="", description="Scope: all_models, per_n_models, this_model, named_model, specific_count")
    per_n_models: Optional[int] = Field(default=None, description="For per-N rules: the N value")
    max_per_n: Optional[int] = Field(default=None, description="Max models that can take this per N")
    replaces: list[str] = Field(default_factory=list, description="Weapon name(s) being replaced")
    choices: list[str] = Field(default_factory=list, description="Weapon name(s) that can be chosen")
    model_name: Optional[str] = Field(default=None, description="For named_model scope: which model")


class UnitComposition(BaseModel):
    """Unit composition details — what models come in the box and their cost."""
    models: list[str] = Field(default_factory=list)
    equipment: str = Field(default="")
    points: list[PointsOption] = Field(default_factory=list)


class UnitDatasheet(BaseModel):
    """
    A complete 40K 10th Edition datasheet for one unit.

    This is the central model — it holds everything needed to calculate
    damage output, survivability, and to display the unit in a UI.

    The damage calculator workflow:
      1. Select unit (this datasheet)
      2. Configure: choose model_count from model_definitions ranges,
         then assign weapons per model using wargear_options constraints
      3. Apply stratagems (matched by keywords)
      4. Calculate damage output
    """
    name: str = Field(description="Unit name")
    base_size: str = Field(default="")
    lore: str = Field(default="")
    stats: Stats
    invulnerable_save: Optional[RollTarget] = Field(default=None)
    weapons: list[Weapon] = Field(default_factory=list)
    abilities: AbilityBlock = Field(default_factory=AbilityBlock)
    keywords: list[str] = Field(default_factory=list)
    faction_keywords: list[str] = Field(default_factory=list)
    composition: UnitComposition = Field(default_factory=UnitComposition)
    model_definitions: list[ModelDefinition] = Field(
        default_factory=list,
        description="Model types in this unit with count ranges and default equipment",
    )
    wargear_options: list[WargearOption] = Field(
        default_factory=list,
        description="Wargear swap/addition rules for configuring the unit",
    )
    leader_units: list[str] = Field(default_factory=list)

    @field_validator("invulnerable_save", mode="before")
    @classmethod
    def _parse_invuln(cls, v: str | None | RollTarget) -> RollTarget | None:
        if v is None or v == "":
            return None
        if isinstance(v, RollTarget):
            return v
        return RollTarget.parse(v)

    # -- Convenience accessors -----------------------------------------------

    @computed_field
    @property
    def invulnerable_save_value(self) -> Optional[int]:
        """Numeric invulnerable save (e.g. 4+ -> 4), or None."""
        return self.invulnerable_save.value if self.invulnerable_save else None

    @computed_field
    @property
    def ranged_weapons(self) -> list[Weapon]:
        return [w for w in self.weapons if w.type == WeaponType.RANGED]

    @computed_field
    @property
    def melee_weapons(self) -> list[Weapon]:
        return [w for w in self.weapons if w.type == WeaponType.MELEE]

    @computed_field
    @property
    def points_cost(self) -> int:
        """Cheapest points option. 0 if unknown."""
        if self.composition.points:
            return min(p.points for p in self.composition.points)
        return 0

    def has_keyword(self, keyword: str) -> bool:
        """Case-insensitive keyword check across both unit and faction keywords."""
        kw_upper = keyword.upper()
        all_kws = self.keywords + self.faction_keywords
        return any(kw_upper in k.upper() for k in all_kws)

    def effective_save(self, ap: int = 0) -> int:
        """
        Best save roll after applying AP, considering invulnerable save.
        Returns the target number (2-7, where 7 = no save possible).
        """
        modified_save = self.stats.Sv.value - ap  # AP is negative, so this adds
        invuln = self.invulnerable_save.value if self.invulnerable_save else 7
        return min(max(modified_save, 2), invuln)  # Can't improve past 2+


class Faction(BaseModel):
    """A complete faction / army — wraps all its datasheets together."""
    faction: str = Field(description="Faction name")
    source: str = Field(default="")
    datasheet_count: int = Field(default=0)
    datasheets: list[UnitDatasheet] = Field(default_factory=list)

    def get_unit(self, name: str) -> Optional[UnitDatasheet]:
        """Find a unit by exact name (case-insensitive)."""
        name_lower = name.lower()
        for ds in self.datasheets:
            if ds.name.lower() == name_lower:
                return ds
        return None

    def search_units(self, query: str) -> list[UnitDatasheet]:
        """Find units whose name contains the query string (case-insensitive)."""
        q = query.lower()
        return [ds for ds in self.datasheets if q in ds.name.lower()]

    def units_with_keyword(self, keyword: str) -> list[UnitDatasheet]:
        """Return all units that have the given keyword."""
        return [ds for ds in self.datasheets if ds.has_keyword(keyword)]


class GameData(BaseModel):
    """Top-level container for all scraped game data."""
    game: str = Field(default="Warhammer 40,000")
    edition: str = Field(default="10th")
    total_datasheets: int = Field(default=0)
    factions: list[Faction] = Field(default_factory=list)

    def get_faction(self, name: str) -> Optional[Faction]:
        """Find a faction by name (case-insensitive). Prefers exact match, falls back to partial."""
        name_lower = name.lower()
        # Exact match first
        for f in self.factions:
            if f.faction.lower() == name_lower:
                return f
        # Partial match fallback
        for f in self.factions:
            if name_lower in f.faction.lower():
                return f
        return None

    def get_unit(self, name: str) -> Optional[UnitDatasheet]:
        """Search all factions for a unit by name."""
        name_lower = name.lower()
        for f in self.factions:
            for ds in f.datasheets:
                if ds.name.lower() == name_lower:
                    return ds
        return None

    def search_units(self, query: str) -> list[tuple[str, UnitDatasheet]]:
        """Search all factions for units matching query. Returns (faction_name, unit) pairs."""
        q = query.lower()
        results = []
        for f in self.factions:
            for ds in f.datasheets:
                if q in ds.name.lower():
                    results.append((f.faction, ds))
        return results

    @property
    def faction_names(self) -> list[str]:
        return [f.faction for f in self.factions]


# ---------------------------------------------------------------------------
# Rules models — army rules, detachments, stratagems, enhancements
# ---------------------------------------------------------------------------

class TurnPhase(str, Enum):
    """Whose turn a stratagem can be used in."""
    YOUR = "your"
    OPPONENT = "opponent"
    EITHER = "either"


class ArmyRule(BaseModel):
    """A faction-level army rule (e.g. Acts of Faith, Oath of Moment)."""
    name: str = Field(description="Rule name")
    description: str = Field(default="", description="Full rules text")


class DetachmentRule(BaseModel):
    """The special rule granted by choosing a detachment."""
    name: str = Field(description="Rule name (e.g. 'The Blood of Martyrs')")
    description: str = Field(default="", description="Full rules text")
    keywords_mentioned: list[str] = Field(
        default_factory=list,
        description="Keywords referenced in the rule text",
    )


class Enhancement(BaseModel):
    """
    A detachment enhancement that can be equipped on a CHARACTER model.

    Keyword restrictions control which units can take the enhancement —
    the damage calculator uses this to filter applicable enhancements.
    """
    name: str = Field(description="Enhancement name")
    points: int = Field(ge=0, description="Points cost")
    description: str = Field(default="", description="Full rules text")
    keyword_restrictions: list[str] = Field(
        default_factory=list,
        description="Keywords a unit must have to equip this enhancement",
    )
    keywords_mentioned: list[str] = Field(
        default_factory=list,
        description="All keywords mentioned in the text",
    )

    def can_equip(self, unit: UnitDatasheet) -> bool:
        """
        Check if a unit can equip this enhancement.

        A unit can equip the enhancement if it has ALL of the required
        keyword restrictions. If there are no restrictions, any unit
        can take it.
        """
        if not self.keyword_restrictions:
            return True
        return all(unit.has_keyword(kw) for kw in self.keyword_restrictions)


class Stratagem(BaseModel):
    """
    A detachment stratagem with full WHEN / TARGET / EFFECT / RESTRICTIONS
    structure.

    The `target_keywords` field lists keywords extracted from the TARGET
    text — the damage calculator uses these to determine which units a
    stratagem can be applied to.
    """
    name: str = Field(description="Stratagem name (e.g. 'DIVINE INTERVENTION')")
    cp_cost: int = Field(ge=0, description="Command Point cost")
    type: str = Field(default="", description="Full type string (e.g. 'Hallowed Martyrs – Epic Deed Stratagem')")
    category: str = Field(default="", description="Category (Epic Deed, Battle Tactic, Strategic Ploy, Wargear)")
    turn: TurnPhase = Field(default=TurnPhase.EITHER, description="Whose turn this can be used in")
    when: str = Field(default="", description="WHEN field — timing/trigger")
    target: str = Field(default="", description="TARGET field — who it affects")
    effect: str = Field(default="", description="EFFECT field — what it does")
    restrictions: str = Field(default="", description="RESTRICTIONS field — limitations")
    cost: str = Field(default="", description="Additional cost beyond CP (e.g. discard Miracle dice)")
    fluff: str = Field(default="", description="Flavour text")
    keywords_mentioned: list[str] = Field(
        default_factory=list,
        description="All keywords mentioned in the stratagem text",
    )
    target_keywords: list[str] = Field(
        default_factory=list,
        description="Keywords a unit must have to be targeted by this stratagem",
    )

    @field_validator("turn", mode="before")
    @classmethod
    def _coerce_turn(cls, v: str | TurnPhase) -> TurnPhase:
        if isinstance(v, TurnPhase):
            return v
        mapping = {"your": TurnPhase.YOUR, "opponent": TurnPhase.OPPONENT, "either": TurnPhase.EITHER}
        return mapping.get(str(v).lower(), TurnPhase.EITHER)

    def applies_to(self, unit: UnitDatasheet) -> bool:
        """
        Check if this stratagem can target a given unit.

        A stratagem applies if the unit has ALL of the required target
        keywords. Keywords may be compound (e.g. 'ADEPTA SORORITAS CHARACTER')
        — each word in the compound keyword is checked individually.

        If there are no target_keywords, the stratagem is assumed to apply
        to any unit in the detachment.
        """
        if not self.target_keywords:
            return True
        return any(
            self._unit_matches_compound_keyword(unit, kw)
            for kw in self.target_keywords
        )

    @staticmethod
    def _unit_matches_compound_keyword(unit: UnitDatasheet, compound_kw: str) -> bool:
        """
        Check if a unit matches a compound keyword like 'ADEPTA SORORITAS CHARACTER'.

        For compound keywords (multiple words), all individual keywords must be
        present on the unit. This handles cases like 'ADEPTUS CUSTODES INFANTRY'
        where both the faction keyword and the unit type keyword must match.
        """
        parts = compound_kw.strip().split()
        if not parts:
            return False

        # Try exact match first (unit might have compound keywords)
        if unit.has_keyword(compound_kw):
            return True

        # For compound keywords, check if ALL parts are present as individual keywords
        if len(parts) > 1:
            return all(unit.has_keyword(part) for part in parts)

        return False


class Detachment(BaseModel):
    """
    A detachment — a way of playing a faction that grants a special rule,
    enhancements, and stratagems.
    """
    name: str = Field(description="Detachment name (e.g. 'Gladius Task Force')")
    rule: Optional[DetachmentRule] = Field(
        default=None,
        description="The detachment's special rule",
    )
    enhancements: list[Enhancement] = Field(
        default_factory=list,
        description="Enhancements available in this detachment",
    )
    stratagems: list[Stratagem] = Field(
        default_factory=list,
        description="Stratagems available in this detachment",
    )

    def applicable_stratagems(self, unit: UnitDatasheet) -> list[Stratagem]:
        """Return all stratagems in this detachment that can target the given unit."""
        return [s for s in self.stratagems if s.applies_to(unit)]

    def applicable_enhancements(self, unit: UnitDatasheet) -> list[Enhancement]:
        """Return all enhancements in this detachment that the unit can equip."""
        return [e for e in self.enhancements if e.can_equip(unit)]


class FactionRules(BaseModel):
    """
    All rules for a single faction — army rules plus all detachments.

    This is the rules counterpart to the `Faction` model which holds
    datasheets. The damage calculator can join them by faction name.
    """
    faction: str = Field(description="Faction name")
    source: str = Field(default="", description="Source file or URL")
    army_rules: list[ArmyRule] = Field(
        default_factory=list,
        description="Top-level army rules (e.g. Oath of Moment)",
    )
    detachment_count: int = Field(default=0)
    detachments: list[Detachment] = Field(
        default_factory=list,
        description="All detachments available to this faction",
    )

    def get_detachment(self, name: str) -> Optional[Detachment]:
        """Find a detachment by name (case-insensitive)."""
        name_lower = name.lower()
        for d in self.detachments:
            if d.name.lower() == name_lower:
                return d
        # Partial match fallback
        for d in self.detachments:
            if name_lower in d.name.lower():
                return d
        return None

    def all_stratagems(self) -> list[Stratagem]:
        """Return all stratagems across all detachments."""
        return [s for d in self.detachments for s in d.stratagems]

    def all_enhancements(self) -> list[Enhancement]:
        """Return all enhancements across all detachments."""
        return [e for d in self.detachments for e in d.enhancements]

    def applicable_stratagems(
        self, unit: UnitDatasheet, detachment_name: Optional[str] = None
    ) -> list[Stratagem]:
        """
        Return all stratagems that can target the given unit.

        If detachment_name is specified, only check that detachment.
        Otherwise check all detachments (useful for exploring options).
        """
        if detachment_name:
            det = self.get_detachment(detachment_name)
            return det.applicable_stratagems(unit) if det else []
        return [s for d in self.detachments for s in d.applicable_stratagems(unit)]


class RulesData(BaseModel):
    """Top-level container for all scraped rules data."""
    game: str = Field(default="Warhammer 40,000")
    edition: str = Field(default="10th")
    total_detachments: int = Field(default=0)
    total_stratagems: int = Field(default=0)
    total_enhancements: int = Field(default=0)
    factions: list[FactionRules] = Field(default_factory=list)

    def get_faction_rules(self, name: str) -> Optional[FactionRules]:
        """Find faction rules by name (case-insensitive). Prefers exact match."""
        name_lower = name.lower()
        for f in self.factions:
            if f.faction.lower() == name_lower:
                return f
        for f in self.factions:
            if name_lower in f.faction.lower():
                return f
        return None

    @property
    def faction_names(self) -> list[str]:
        return [f.faction for f in self.factions]
