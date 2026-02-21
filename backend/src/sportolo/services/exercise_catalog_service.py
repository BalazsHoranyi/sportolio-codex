from __future__ import annotations

import re
from dataclasses import dataclass
from math import ceil
from typing import Literal

Scope = Literal["global", "user"]
MatchStrategy = Literal[
    "canonical_exact",
    "canonical_prefix",
    "canonical_substring",
    "alias_exact",
    "alias_prefix",
    "alias_substring",
    "fuzzy_canonical",
    "fuzzy_alias",
]
HighlightField = Literal["canonical", "alias"]

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
    "gripper": "Gripper",
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
    "gripper": "Grip",
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


@dataclass(frozen=True)
class ExerciseMatchHighlight:
    field: HighlightField
    value: str
    start: int
    end: int


@dataclass(frozen=True)
class ExerciseMatchMetadata:
    strategy: MatchStrategy
    score: int
    highlight: ExerciseMatchHighlight | None


@dataclass(frozen=True)
class RankedExercise:
    entry: ExerciseCatalogEntry
    match_metadata: ExerciseMatchMetadata | None


@dataclass(frozen=True)
class PaginatedExerciseSearch:
    items: tuple[RankedExercise, ...]
    page: int
    page_size: int
    total_items: int
    total_pages: int


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
        aliases=("Rear Foot Elevated Split Squat", "RFESS"),
        preserve_legacy_equipment_aliases=True,
    ),
    ExerciseBlueprint(
        canonical_name="Stationary Split Squat",
        region_tags=("quads", "glutes", "hamstrings"),
        equipment_options=("bodyweight", "dumbbell", "barbell", "kettlebell"),
        aliases=("Static Split Squat",),
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
        aliases=("Shrugs",),
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
        aliases=("Hyperextension",),
        preserve_legacy_equipment_aliases=True,
    ),
    ExerciseBlueprint(
        canonical_name="Cable Pull-Through",
        region_tags=("hamstrings", "glutes", "spinal_erectors"),
        equipment_options=("cable", "band"),
        aliases=("Pull Through", "Cable Pull Through"),
        preserve_legacy_equipment_aliases=True,
    ),
    ExerciseBlueprint(
        canonical_name="Glute-Ham Raise",
        region_tags=("hamstrings", "glutes", "spinal_erectors"),
        equipment_options=("ghd", "machine"),
        aliases=("GHR",),
        preserve_legacy_equipment_aliases=True,
    ),
    ExerciseBlueprint(
        canonical_name="Hip Abduction",
        region_tags=("glutes", "hip_stabilizers"),
        equipment_options=("machine", "cable", "band"),
        aliases=("Seated Hip Abduction", "Standing Hip Abduction"),
        preserve_legacy_equipment_aliases=True,
    ),
    ExerciseBlueprint(
        canonical_name="Hip Adduction",
        region_tags=("adductors", "hip_stabilizers"),
        equipment_options=("machine", "cable", "band"),
        aliases=("Adductor Machine", "Seated Hip Adduction", "Standing Hip Adduction"),
        preserve_legacy_equipment_aliases=True,
    ),
    ExerciseBlueprint(
        canonical_name="Copenhagen Plank",
        region_tags=("adductors", "core", "obliques"),
        equipment_options=("bodyweight", "bosu", "stability_ball"),
        preserve_legacy_equipment_aliases=True,
    ),
    ExerciseBlueprint(
        canonical_name="Tibialis Raise",
        region_tags=("tibialis_anterior", "calves"),
        equipment_options=("machine", "band", "bodyweight"),
        aliases=("Tib Raises",),
        preserve_legacy_equipment_aliases=True,
    ),
    ExerciseBlueprint(
        canonical_name="Dorsiflexion",
        region_tags=("tibialis_anterior", "calves", "ankle_stabilizers"),
        equipment_options=("band", "cable", "bodyweight"),
        aliases=("Ankle Dorsiflexion", "Dorsiflexion Raise"),
        preserve_legacy_equipment_aliases=True,
    ),
    ExerciseBlueprint(
        canonical_name="Shoulder Press",
        region_tags=("front_delts", "triceps", "upper_chest"),
        equipment_options=("barbell", "dumbbell", "machine", "ez_bar"),
        aliases=("Military Press", "Overhead Press"),
        preserve_legacy_equipment_aliases=True,
    ),
    ExerciseBlueprint(
        canonical_name="Landmine Press",
        region_tags=("front_delts", "triceps", "upper_chest", "core"),
        equipment_options=("landmine", "barbell"),
        aliases=("Angled Press",),
        preserve_legacy_equipment_aliases=True,
    ),
    ExerciseBlueprint(
        canonical_name="Triceps Pressdown",
        region_tags=("triceps", "elbow_extensors"),
        equipment_options=("cable", "band"),
        aliases=("Pressdown", "Pushdown", "Triceps Pushdown"),
        preserve_legacy_equipment_aliases=True,
    ),
    ExerciseBlueprint(
        canonical_name="Straight-Arm Pulldown",
        region_tags=("lats", "triceps", "rear_delts"),
        equipment_options=("cable", "band"),
        aliases=("Straight Arm Pulldown", "Straight-Arm Pushdown"),
        preserve_legacy_equipment_aliases=True,
    ),
    ExerciseBlueprint(
        canonical_name="Wrist Curl",
        region_tags=("forearms", "grip"),
        equipment_options=("dumbbell", "barbell", "ez_bar", "cable"),
        aliases=("Wrist Flexion Curl",),
        preserve_legacy_equipment_aliases=True,
    ),
    ExerciseBlueprint(
        canonical_name="Reverse Wrist Curl",
        region_tags=("forearms", "grip"),
        equipment_options=("dumbbell", "barbell", "ez_bar", "cable"),
        aliases=("Wrist Extension Curl",),
        preserve_legacy_equipment_aliases=True,
    ),
    ExerciseBlueprint(
        canonical_name="Pronation/Supination",
        region_tags=("forearms", "grip"),
        equipment_options=("dumbbell", "cable", "band"),
        aliases=("Forearm Pronation", "Forearm Supination"),
        preserve_legacy_equipment_aliases=True,
    ),
    ExerciseBlueprint(
        canonical_name="Gripper Squeeze",
        region_tags=("forearms", "grip"),
        equipment_options=("gripper",),
        aliases=("Grippers", "Hand Gripper"),
        preserve_legacy_equipment_aliases=True,
    ),
    ExerciseBlueprint(
        canonical_name="External Rotation",
        region_tags=("rotator_cuff", "rear_delts"),
        equipment_options=("cable", "band", "dumbbell"),
        aliases=("Shoulder External Rotation",),
        preserve_legacy_equipment_aliases=True,
    ),
    ExerciseBlueprint(
        canonical_name="Internal Rotation",
        region_tags=("rotator_cuff", "front_delts"),
        equipment_options=("cable", "band", "dumbbell"),
        aliases=("Shoulder Internal Rotation",),
        preserve_legacy_equipment_aliases=True,
    ),
    ExerciseBlueprint(
        canonical_name="Cuban Press",
        region_tags=("rotator_cuff", "rear_delts", "front_delts"),
        equipment_options=("dumbbell", "barbell", "ez_bar"),
        preserve_legacy_equipment_aliases=True,
    ),
    ExerciseBlueprint(
        canonical_name="Dead Bug",
        region_tags=("core", "obliques", "hip_flexors"),
        equipment_options=("bodyweight", "band", "stability_ball"),
        aliases=("Deadbug",),
        preserve_legacy_equipment_aliases=True,
    ),
    ExerciseBlueprint(
        canonical_name="Offset Carry",
        region_tags=("core", "obliques", "grip", "traps"),
        equipment_options=("dumbbell", "kettlebell", "trap_bar"),
        aliases=("Suitcase Carry", "Uneven Carry"),
        preserve_legacy_equipment_aliases=True,
    ),
    ExerciseBlueprint(
        canonical_name="Ab Wheel Rollout",
        region_tags=("core", "lats", "shoulders"),
        equipment_options=("bodyweight", "machine", "stability_ball"),
        aliases=("Ab Rollout", "Wheel Rollout"),
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
        page = self.search_exercises(
            scope=scope,
            search=search,
            equipment=equipment,
            muscle=muscle,
            page=1,
            page_size=max(len(self._catalog), 1),
        )
        return [item.entry for item in page.items]

    def search_exercises(
        self,
        *,
        scope: Literal["global", "user", "all"] = "all",
        search: str | None = None,
        equipment: str | None = None,
        muscle: str | None = None,
        page: int = 1,
        page_size: int = 25,
    ) -> PaginatedExerciseSearch:
        filtered = self._filtered_entries(scope=scope, equipment=equipment, muscle=muscle)
        ranked = _rank_entries(filtered=filtered, query=search)

        if page < 1:
            raise ValueError("page must be greater than or equal to 1")
        if page_size < 1:
            raise ValueError("page_size must be greater than or equal to 1")

        total_items = len(ranked)
        total_pages = ceil(total_items / page_size) if total_items else 0
        start_index = (page - 1) * page_size
        end_index = start_index + page_size
        paged_items = tuple(ranked[start_index:end_index])

        return PaginatedExerciseSearch(
            items=paged_items,
            page=page,
            page_size=page_size,
            total_items=total_items,
            total_pages=total_pages,
        )

    def _filtered_entries(
        self,
        *,
        scope: Literal["global", "user", "all"],
        equipment: str | None,
        muscle: str | None,
    ) -> list[ExerciseCatalogEntry]:
        if scope == "user":
            return []

        normalized_equipment = _normalize_token(equipment) if equipment else None
        normalized_muscle = _normalize_token(muscle) if muscle else None
        return [
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


def _rank_entries(
    *,
    filtered: list[ExerciseCatalogEntry],
    query: str | None,
) -> list[RankedExercise]:
    normalized_query = _normalize_phrase(query) if query else ""
    if not normalized_query:
        sorted_entries = sorted(
            filtered, key=lambda entry: (_normalize_phrase(entry.canonical_name), entry.id)
        )
        return [RankedExercise(entry=entry, match_metadata=None) for entry in sorted_entries]

    matches: list[tuple[int, RankedExercise]] = []
    for entry in filtered:
        metadata = _search_match(entry=entry, query=normalized_query)
        if metadata is None:
            continue
        matches.append((metadata.score, RankedExercise(entry=entry, match_metadata=metadata)))

    matches.sort(
        key=lambda item: (
            item[0],
            _normalize_phrase(item[1].entry.canonical_name),
            item[1].entry.id,
        )
    )
    return [item[1] for item in matches]


def _search_match(entry: ExerciseCatalogEntry, query: str) -> ExerciseMatchMetadata | None:
    canonical = _normalize_phrase(entry.canonical_name)
    aliases = [_normalize_phrase(alias) for alias in entry.aliases]

    if canonical == query:
        return ExerciseMatchMetadata(
            strategy="canonical_exact",
            score=0,
            highlight=_substring_highlight(
                field="canonical", value=entry.canonical_name, query=query
            ),
        )
    if canonical.startswith(query):
        return ExerciseMatchMetadata(
            strategy="canonical_prefix",
            score=1,
            highlight=_substring_highlight(
                field="canonical", value=entry.canonical_name, query=query
            ),
        )
    if query in canonical:
        return ExerciseMatchMetadata(
            strategy="canonical_substring",
            score=2,
            highlight=_substring_highlight(
                field="canonical", value=entry.canonical_name, query=query
            ),
        )

    for alias in entry.aliases:
        normalized_alias = _normalize_phrase(alias)
        if normalized_alias == query:
            return ExerciseMatchMetadata(
                strategy="alias_exact",
                score=3,
                highlight=_substring_highlight(field="alias", value=alias, query=query),
            )
        if normalized_alias.startswith(query):
            return ExerciseMatchMetadata(
                strategy="alias_prefix",
                score=4,
                highlight=_substring_highlight(field="alias", value=alias, query=query),
            )
        if query in normalized_alias:
            return ExerciseMatchMetadata(
                strategy="alias_substring",
                score=5,
                highlight=_substring_highlight(field="alias", value=alias, query=query),
            )

    return _fuzzy_match(entry=entry, query=query, canonical=canonical, aliases=aliases)


def _fuzzy_match(
    *,
    entry: ExerciseCatalogEntry,
    query: str,
    canonical: str,
    aliases: list[str],
) -> ExerciseMatchMetadata | None:
    if len(query) < 4:
        return None

    max_distance = _max_allowed_distance(query)
    canonical_distance = _levenshtein_distance(query, canonical)
    if canonical_distance <= max_distance:
        return ExerciseMatchMetadata(
            strategy="fuzzy_canonical",
            score=6 + canonical_distance,
            highlight=_full_highlight(field="canonical", value=entry.canonical_name),
        )

    best_alias_distance = max_distance + 1
    best_alias_value: str | None = None
    for alias in entry.aliases:
        normalized_alias = _normalize_phrase(alias)
        distance = _levenshtein_distance(query, normalized_alias)
        if distance < best_alias_distance:
            best_alias_distance = distance
            best_alias_value = alias

    if best_alias_value is not None and best_alias_distance <= max_distance:
        return ExerciseMatchMetadata(
            strategy="fuzzy_alias",
            score=10 + best_alias_distance,
            highlight=_full_highlight(field="alias", value=best_alias_value),
        )

    return None


def _substring_highlight(
    *, field: HighlightField, value: str, query: str
) -> ExerciseMatchHighlight:
    normalized_value = _normalize_phrase(value)
    start = normalized_value.find(query)
    if start < 0:
        return _full_highlight(field=field, value=value)
    return ExerciseMatchHighlight(
        field=field,
        value=value,
        start=start,
        end=start + len(query),
    )


def _full_highlight(*, field: HighlightField, value: str) -> ExerciseMatchHighlight:
    normalized_value = _normalize_phrase(value)
    return ExerciseMatchHighlight(
        field=field,
        value=value,
        start=0,
        end=len(normalized_value),
    )


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
