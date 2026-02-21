from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Literal

Scope = Literal["global", "user"]

EQUIPMENT_LABELS: dict[str, str] = {
    "barbell": "Barbell",
    "dumbbell": "Dumbbell",
    "kettlebell": "Kettlebell",
    "machine": "Machine",
    "cable": "Cable",
    "band": "Band",
    "bodyweight": "Bodyweight",
    "landmine": "Landmine",
    "ez_bar": "EZ-Bar",
    "medicine_ball": "Medicine Ball",
    "preacher_bench": "Preacher Bench",
    "ghd": "GHD",
    "bosu": "BOSU",
    "stability_ball": "Stability Ball",
    "rings": "Rings",
    "trap_bar": "Trap Bar",
    "smith_machine": "Smith Machine",
    "roman_chair": "Roman Chair",
    "pullup_bar": "Pull-Up Bar",
}

EQUIPMENT_ABBREVIATIONS: dict[str, str] = {
    "barbell": "BB",
    "dumbbell": "DB",
    "kettlebell": "KB",
    "machine": "Machine",
    "cable": "CBL",
    "band": "Band",
    "bodyweight": "BW",
    "landmine": "LM",
    "ez_bar": "EZ",
    "medicine_ball": "MB",
    "preacher_bench": "PB",
    "ghd": "GHD",
    "bosu": "BOSU",
    "stability_ball": "SB",
    "rings": "Rings",
    "trap_bar": "TB",
    "smith_machine": "SM",
    "roman_chair": "RC",
    "pullup_bar": "PU",
}

_LEGACY_CANONICAL_IDS: dict[str, str] = {
    "back squat": "global-back-squat",
    "bench press": "global-bench-press",
    "barbell row": "global-barbell-row",
}


@dataclass(frozen=True)
class ExerciseBlueprint:
    canonical_name: str
    region_tags: tuple[str, ...]
    equipment_options: tuple[str, ...] = ()
    aliases: tuple[str, ...] = ()
    preserve_legacy_equipment_aliases: bool = False


@dataclass(frozen=True)
class ExerciseCatalogEntry:
    id: str
    scope: Scope
    canonical_name: str
    aliases: tuple[str, ...]
    region_tags: tuple[str, ...]
    owner_user_id: str | None
    equipment_options: tuple[str, ...]


_BLUEPRINTS: tuple[ExerciseBlueprint, ...] = (
    ExerciseBlueprint(
        canonical_name="Back Squat",
        region_tags=("quads", "glutes", "spinal_erectors"),
        equipment_options=("barbell", "smith_machine"),
        preserve_legacy_equipment_aliases=True,
    ),
    ExerciseBlueprint(
        canonical_name="Bench Press",
        region_tags=("chest", "triceps", "front_delts"),
        equipment_options=("barbell", "dumbbell", "machine"),
        preserve_legacy_equipment_aliases=True,
    ),
    ExerciseBlueprint(
        canonical_name="Barbell Row",
        region_tags=("lats", "biceps", "rear_delts"),
        equipment_options=("barbell", "dumbbell", "rings"),
        aliases=("Bent Over Row",),
        preserve_legacy_equipment_aliases=True,
    ),
    ExerciseBlueprint(
        canonical_name="Split Squat",
        region_tags=("quads", "glutes", "hamstrings"),
        equipment_options=("barbell", "dumbbell", "kettlebell", "landmine"),
        aliases=("Rear Foot Elevated Split Squat",),
        preserve_legacy_equipment_aliases=True,
    ),
    ExerciseBlueprint(
        canonical_name="Bulgarian Split Squat",
        region_tags=("quads", "glutes", "hamstrings"),
        equipment_options=("bodyweight", "dumbbell", "barbell"),
        preserve_legacy_equipment_aliases=True,
    ),
    ExerciseBlueprint(
        canonical_name="Good Morning",
        region_tags=("hamstrings", "glutes", "spinal_erectors"),
        equipment_options=("barbell", "ez_bar", "landmine"),
        preserve_legacy_equipment_aliases=True,
    ),
    ExerciseBlueprint(
        canonical_name="Shrug",
        region_tags=("traps", "upper_back"),
        equipment_options=("barbell", "dumbbell", "trap_bar", "landmine"),
        preserve_legacy_equipment_aliases=True,
    ),
    ExerciseBlueprint(
        canonical_name="Pallof Press",
        region_tags=("core", "obliques"),
        equipment_options=("cable", "band"),
        preserve_legacy_equipment_aliases=True,
    ),
    ExerciseBlueprint(
        canonical_name="Pullover",
        region_tags=("lats", "chest", "triceps"),
        equipment_options=("dumbbell", "barbell", "cable", "machine"),
        preserve_legacy_equipment_aliases=True,
    ),
    ExerciseBlueprint(
        canonical_name="Side Plank",
        region_tags=("core", "obliques", "glutes"),
        equipment_options=("bodyweight", "bosu", "stability_ball"),
        preserve_legacy_equipment_aliases=True,
    ),
    ExerciseBlueprint(
        canonical_name="Hanging Leg Raise",
        region_tags=("core", "hip_flexors"),
        equipment_options=("pullup_bar", "rings"),
        preserve_legacy_equipment_aliases=True,
    ),
    ExerciseBlueprint(
        canonical_name="Back Extension",
        region_tags=("spinal_erectors", "glutes", "hamstrings"),
        equipment_options=("ghd", "roman_chair", "stability_ball"),
        preserve_legacy_equipment_aliases=True,
    ),
    ExerciseBlueprint(
        canonical_name="Hip Abduction",
        region_tags=("glutes", "hip_stabilizers"),
        equipment_options=("machine", "cable", "band"),
        preserve_legacy_equipment_aliases=True,
    ),
    ExerciseBlueprint(
        canonical_name="Pec Deck",
        region_tags=("chest", "front_delts"),
        equipment_options=("machine", "cable"),
        aliases=("Chest Fly",),
        preserve_legacy_equipment_aliases=True,
    ),
    ExerciseBlueprint(
        canonical_name="Reverse Hyper",
        region_tags=("glutes", "hamstrings", "spinal_erectors"),
        equipment_options=("ghd", "machine"),
        preserve_legacy_equipment_aliases=True,
    ),
    ExerciseBlueprint(
        canonical_name="Preacher Curl",
        region_tags=("biceps", "forearms"),
        equipment_options=("preacher_bench", "ez_bar", "dumbbell"),
        preserve_legacy_equipment_aliases=True,
    ),
    ExerciseBlueprint(
        canonical_name="Medicine Ball Slam",
        region_tags=("core", "lats", "shoulders"),
        equipment_options=("medicine_ball",),
        preserve_legacy_equipment_aliases=True,
    ),
    ExerciseBlueprint(
        canonical_name="Running Easy",
        region_tags=("quads", "hamstrings", "calves", "glutes"),
        equipment_options=(),
    ),
)


class ExerciseCatalogService:
    """Deterministic exercise catalog generation + filtering."""

    def __init__(self) -> None:
        self._catalog = self._build_catalog()

    def list_exercises(
        self,
        *,
        scope: Literal["global", "user", "all"] = "all",
        search: str | None = None,
        equipment: str | None = None,
        muscle: str | None = None,
    ) -> list[ExerciseCatalogEntry]:
        if scope == "user":
            return []

        normalized_equipment = _normalize_token(equipment) if equipment else None
        normalized_muscle = _normalize_token(muscle) if muscle else None
        filtered = [
            entry
            for entry in self._catalog
            if (
                normalized_equipment is None
                or normalized_equipment
                in {_normalize_token(item) for item in entry.equipment_options}
            )
            and (
                normalized_muscle is None
                or normalized_muscle in {_normalize_token(item) for item in entry.region_tags}
            )
        ]

        normalized_query = _normalize_phrase(search) if search else None
        if not normalized_query:
            return sorted(
                filtered, key=lambda entry: (_normalize_phrase(entry.canonical_name), entry.id)
            )

        ranked: list[tuple[int, ExerciseCatalogEntry]] = []
        for entry in filtered:
            rank = _search_rank(entry, normalized_query)
            if rank is None:
                continue
            ranked.append((rank, entry))

        ranked.sort(
            key=lambda item: (item[0], _normalize_phrase(item[1].canonical_name), item[1].id)
        )
        return [entry for _, entry in ranked]

    def _build_catalog(self) -> tuple[ExerciseCatalogEntry, ...]:
        catalog: list[ExerciseCatalogEntry] = []
        seen_ids: set[str] = set()
        seen_names: set[str] = set()

        for blueprint in sorted(
            _BLUEPRINTS, key=lambda item: _normalize_phrase(item.canonical_name)
        ):
            canonical_key = _normalize_phrase(blueprint.canonical_name)
            if canonical_key in seen_names:
                raise ValueError(
                    f"duplicate canonical exercise name detected: {blueprint.canonical_name}"
                )
            seen_names.add(canonical_key)

            entry_id = _LEGACY_CANONICAL_IDS.get(
                canonical_key, _default_id(blueprint.canonical_name)
            )
            if entry_id in seen_ids:
                raise ValueError(f"duplicate exercise id detected: {entry_id}")
            seen_ids.add(entry_id)

            aliases = self._build_aliases(blueprint)
            catalog.append(
                ExerciseCatalogEntry(
                    id=entry_id,
                    scope="global",
                    canonical_name=blueprint.canonical_name,
                    aliases=aliases,
                    region_tags=tuple(
                        sorted({_normalize_token(tag) for tag in blueprint.region_tags})
                    ),
                    owner_user_id=None,
                    equipment_options=tuple(blueprint.equipment_options),
                )
            )

        return tuple(catalog)

    @staticmethod
    def _build_aliases(blueprint: ExerciseBlueprint) -> tuple[str, ...]:
        canonical_key = _normalize_phrase(blueprint.canonical_name)
        aliases: list[str] = list(blueprint.aliases)

        if blueprint.preserve_legacy_equipment_aliases:
            label_aliases: list[str] = []
            abbreviation_aliases: list[str] = []
            for equipment in blueprint.equipment_options:
                label = EQUIPMENT_LABELS[equipment]
                label_aliases.append(f"{label} {blueprint.canonical_name}")

                abbreviation = EQUIPMENT_ABBREVIATIONS[equipment]
                abbreviation_alias = f"{abbreviation} {blueprint.canonical_name}"
                if _normalize_phrase(abbreviation_alias) != _normalize_phrase(
                    f"{label} {blueprint.canonical_name}"
                ):
                    abbreviation_aliases.append(abbreviation_alias)

            aliases.extend(label_aliases)
            aliases.extend(abbreviation_aliases)

        unique_aliases: dict[str, str] = {}
        for alias in aliases:
            alias_key = _normalize_phrase(alias)
            if not alias_key or alias_key == canonical_key:
                continue
            unique_aliases.setdefault(alias_key, alias)

        return tuple(unique_aliases[key] for key in sorted(unique_aliases))


def _search_rank(entry: ExerciseCatalogEntry, query: str) -> int | None:
    canonical = _normalize_phrase(entry.canonical_name)
    aliases = [_normalize_phrase(alias) for alias in entry.aliases]

    if canonical == query:
        return 0
    if canonical.startswith(query):
        return 1
    if query in canonical:
        return 2
    if any(alias == query for alias in aliases):
        return 3
    if any(alias.startswith(query) for alias in aliases):
        return 4
    if any(query in alias for alias in aliases):
        return 5
    fuzzy_rank = _fuzzy_rank(query=query, canonical=canonical, aliases=aliases)
    if fuzzy_rank is not None:
        return fuzzy_rank
    return None


def _fuzzy_rank(*, query: str, canonical: str, aliases: list[str]) -> int | None:
    if len(query) < 4:
        return None

    max_distance = _max_allowed_distance(query)
    canonical_distance = _levenshtein_distance(query, canonical)
    alias_distances = [_levenshtein_distance(query, alias) for alias in aliases]
    best_alias_distance = min(alias_distances, default=max_distance + 1)

    if canonical_distance <= max_distance:
        return 6 + canonical_distance
    if best_alias_distance <= max_distance:
        return 10 + best_alias_distance
    return None


def _max_allowed_distance(query: str) -> int:
    if " " in query and len(query) >= 8:
        return 3
    if len(query) >= 13:
        return 3
    if len(query) >= 8:
        return 2
    return 1


def _levenshtein_distance(source: str, target: str) -> int:
    if source == target:
        return 0
    if not source:
        return len(target)
    if not target:
        return len(source)

    previous_row = list(range(len(target) + 1))
    for source_index, source_char in enumerate(source, start=1):
        current_row = [source_index]
        for target_index, target_char in enumerate(target, start=1):
            substitution_cost = 0 if source_char == target_char else 1
            current_row.append(
                min(
                    previous_row[target_index] + 1,
                    current_row[target_index - 1] + 1,
                    previous_row[target_index - 1] + substitution_cost,
                )
            )
        previous_row = current_row

    return previous_row[-1]


def _normalize_phrase(value: str | None) -> str:
    if value is None:
        return ""
    collapsed = re.sub(r"[-_]+", " ", value.strip().lower())
    return re.sub(r"\s+", " ", collapsed)


def _normalize_token(value: str) -> str:
    return _normalize_phrase(value).replace(" ", "_")


def _default_id(canonical_name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", _normalize_phrase(canonical_name)).strip("-")
    return f"global-{slug}"
