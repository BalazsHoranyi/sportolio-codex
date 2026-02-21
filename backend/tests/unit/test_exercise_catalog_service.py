from __future__ import annotations

import pytest

from sportolo.services.exercise_catalog_service import (
    EQUIPMENT_ABBREVIATIONS,
    EQUIPMENT_LABELS,
    ExerciseBlueprint,
    ExerciseCatalogService,
)


def test_generator_supports_non_productized_canonical_names() -> None:
    service = ExerciseCatalogService()

    catalog = service.list_exercises()
    canonical_names = {entry.canonical_name for entry in catalog}

    assert "Split Squat" in canonical_names
    assert "Good Morning" in canonical_names
    assert "Pallof Press" in canonical_names
    assert "Bulgarian Split Squat" in canonical_names
    assert "Barbell Split Squat" not in canonical_names
    assert "EZ-Bar Good Morning" not in canonical_names


def test_equipment_labels_and_abbreviations_include_new_supported_types() -> None:
    expected_equipment = {
        "landmine",
        "ez_bar",
        "medicine_ball",
        "preacher_bench",
        "ghd",
        "bosu",
        "stability_ball",
        "rings",
    }

    assert expected_equipment <= set(EQUIPMENT_LABELS)
    assert expected_equipment <= set(EQUIPMENT_ABBREVIATIONS)


def test_blueprint_additions_are_present_without_duplicate_collisions() -> None:
    service = ExerciseCatalogService()
    catalog = service.list_exercises()

    expected_blueprint_stems = {
        "Ab Wheel Rollout",
        "Back Extension",
        "Cable Pull-Through",
        "Copenhagen Plank",
        "Cuban Press",
        "Dead Bug",
        "Dorsiflexion",
        "External Rotation",
        "Glute-Ham Raise",
        "Split Squat",
        "Hip Adduction",
        "Good Morning",
        "Hanging Leg Raise",
        "Hip Abduction",
        "Internal Rotation",
        "Landmine Press",
        "Offset Carry",
        "Pronation/Supination",
        "Pallof Press",
        "Pullover",
        "Reverse Wrist Curl",
        "Shoulder Press",
        "Shrug",
        "Side Plank",
        "Stationary Split Squat",
        "Straight-Arm Pulldown",
        "Tibialis Raise",
        "Triceps Pressdown",
        "Wrist Curl",
    }
    canonical_names = {entry.canonical_name for entry in catalog}
    ids = [entry.id for entry in catalog]

    assert expected_blueprint_stems <= canonical_names
    assert len(ids) == len(set(ids))
    assert len(canonical_names) == len(catalog)


def test_existing_canonical_ids_remain_stable() -> None:
    service = ExerciseCatalogService()

    catalog = {entry.canonical_name: entry for entry in service.list_exercises()}

    assert catalog["Back Squat"].id == "global-back-squat"
    assert catalog["Bench Press"].id == "global-bench-press"
    assert catalog["Barbell Row"].id == "global-barbell-row"


def test_legacy_equipment_prefixed_alias_search_still_resolves() -> None:
    service = ExerciseCatalogService()

    split_squat_search = service.list_exercises(search="barbell split squat")
    good_morning_search = service.list_exercises(search="ez good morning")

    assert split_squat_search[0].canonical_name == "Split Squat"
    assert good_morning_search[0].canonical_name == "Good Morning"


def test_sprt71_alias_queries_resolve_expected_canonical_entries() -> None:
    service = ExerciseCatalogService()

    query_to_expected = {
        "rfess": "Split Squat",
        "stationary split squat": "Stationary Split Squat",
        "hyperextension": "Back Extension",
        "military press": "Shoulder Press",
        "pressdown": "Triceps Pressdown",
        "straight arm pulldown": "Straight-Arm Pulldown",
        "ghr": "Glute-Ham Raise",
        "adductor machine": "Hip Adduction",
        "wrist curl": "Wrist Curl",
        "reverse wrist curl": "Reverse Wrist Curl",
        "cuban press": "Cuban Press",
        "dead bug": "Dead Bug",
        "ab wheel": "Ab Wheel Rollout",
        "offset carry": "Offset Carry",
    }

    for query, expected in query_to_expected.items():
        matches = service.list_exercises(search=query)
        assert matches, f"Expected at least one match for query: {query}"
        assert matches[0].canonical_name == expected


def test_sprt71_backfill_entries_include_complete_equipment_and_muscle_metadata() -> None:
    service = ExerciseCatalogService()
    catalog = {entry.canonical_name: entry for entry in service.list_exercises()}

    assert {"quads", "glutes", "hamstrings"} <= set(catalog["Split Squat"].region_tags)
    assert {"landmine", "barbell", "dumbbell"} <= set(catalog["Split Squat"].equipment_options)
    assert {"quads", "glutes", "hamstrings"} <= set(catalog["Stationary Split Squat"].region_tags)
    assert {"bodyweight", "dumbbell", "barbell"} <= set(
        catalog["Stationary Split Squat"].equipment_options
    )
    assert {"hamstrings", "glutes", "spinal_erectors"} <= set(
        catalog["Cable Pull-Through"].region_tags
    )
    assert catalog["Cable Pull-Through"].equipment_options == ("cable", "band")
    assert {"glutes", "hip_stabilizers"} <= set(catalog["Hip Abduction"].region_tags)
    assert {"machine", "cable", "band"} <= set(catalog["Hip Abduction"].equipment_options)
    assert {"adductors", "hip_stabilizers"} <= set(catalog["Hip Adduction"].region_tags)
    assert {"machine", "cable", "band"} <= set(catalog["Hip Adduction"].equipment_options)
    assert {"calves", "tibialis_anterior"} <= set(catalog["Tibialis Raise"].region_tags)
    assert {"machine", "band", "bodyweight"} <= set(catalog["Tibialis Raise"].equipment_options)
    assert {"front_delts", "triceps", "upper_chest"} <= set(catalog["Landmine Press"].region_tags)
    assert catalog["Landmine Press"].equipment_options == ("landmine", "barbell")
    assert {"triceps", "elbow_extensors"} <= set(catalog["Triceps Pressdown"].region_tags)
    assert catalog["Triceps Pressdown"].equipment_options == ("cable", "band")
    assert {"lats", "triceps", "rear_delts"} <= set(catalog["Straight-Arm Pulldown"].region_tags)
    assert catalog["Straight-Arm Pulldown"].equipment_options == ("cable", "band")
    assert {"core", "obliques"} <= set(catalog["Dead Bug"].region_tags)
    assert {"core", "obliques", "grip"} <= set(catalog["Offset Carry"].region_tags)


def test_search_and_filters_are_deterministic() -> None:
    service = ExerciseCatalogService()

    first = service.list_exercises(search="press", equipment="cable", muscle="core")
    second = service.list_exercises(search="press", equipment="cable", muscle="core")

    assert [entry.id for entry in first] == [entry.id for entry in second]
    assert [entry.canonical_name for entry in first] == ["Pallof Press"]


def test_typo_tolerant_search_resolves_strength_exercise_names() -> None:
    service = ExerciseCatalogService()

    matches = service.list_exercises(search="splt sqaut")

    assert matches
    assert matches[0].canonical_name == "Split Squat"


def test_search_exercises_supports_deterministic_pagination() -> None:
    service = ExerciseCatalogService()

    first_page = service.search_exercises(search="press", page=1, page_size=1)
    second_page = service.search_exercises(search="press", page=2, page_size=1)

    assert first_page.total_items >= 2
    assert first_page.page == 1
    assert first_page.page_size == 1
    assert first_page.total_pages >= 2
    assert len(first_page.items) == 1
    assert second_page.page == 2
    assert len(second_page.items) == 1
    assert first_page.items[0].entry.id != second_page.items[0].entry.id


def test_search_exercises_includes_match_metadata_for_alias_queries() -> None:
    service = ExerciseCatalogService()

    result = service.search_exercises(search="cable pallof press", page=1, page_size=5)

    assert result.items
    top_match = result.items[0]
    assert top_match.entry.canonical_name == "Pallof Press"
    assert top_match.match_metadata is not None
    assert top_match.match_metadata.strategy == "alias_exact"
    assert top_match.match_metadata.highlight is not None
    assert top_match.match_metadata.highlight.field == "alias"
    assert top_match.match_metadata.highlight.value == "Cable Pallof Press"


def test_catalog_seed_contains_at_least_1000_active_standard_exercises() -> None:
    service = ExerciseCatalogService()

    catalog = service.list_exercises(scope="global")

    assert len(catalog) >= 1000
    assert len({entry.id for entry in catalog}) == len(catalog)
    assert len({entry.canonical_name for entry in catalog}) == len(catalog)


def test_catalog_seed_excludes_non_canonical_generated_artifacts() -> None:
    service = ExerciseCatalogService()

    canonical_names = {entry.canonical_name for entry in service.list_exercises(scope="global")}

    forbidden_examples = {
        "Machine Machine-Supported Row",
        "Band Banded Pull-Up",
        "Barbell Half-Range Deadlift",
        "Barbell Step-Through Step-Up",
        "Landmine Landmine Deadlift",
        "Trap Bar Trap Deadlift",
    }
    assert forbidden_examples.isdisjoint(canonical_names)

    forbidden_fragments = (
        "half-range",
        "long-range",
        "short-stride",
        "step-through",
        "weighted",
        "cross-body",
        "machine-supported",
        "banded",
        "double-overhand",
        "band-resisted",
    )
    offenders = [
        name
        for name in canonical_names
        if any(fragment in name.lower() for fragment in forbidden_fragments)
    ]
    assert offenders == []


def test_catalog_entries_include_required_seed_metadata_fields() -> None:
    service = ExerciseCatalogService()

    catalog = service.list_exercises(scope="global")

    assert catalog
    for entry in catalog:
        assert entry.equipment_options
        assert entry.region_tags
        assert entry.movement_pattern
        assert entry.primary_muscles
        assert entry.secondary_muscles


def test_catalog_seed_validation_rejects_malformed_entries() -> None:
    service = ExerciseCatalogService()

    malformed_blueprints = (
        ExerciseBlueprint(
            canonical_name="",
            region_tags=("quads",),
            equipment_options=("barbell",),
        ),
    )

    with pytest.raises(ValueError, match="canonical"):
        service._build_catalog_from_blueprints(malformed_blueprints)


def test_catalog_seed_validation_rejects_entries_without_equipment_or_primary_muscles() -> None:
    service = ExerciseCatalogService()

    no_equipment = (
        ExerciseBlueprint(
            canonical_name="Validation Squat",
            region_tags=("quads",),
            equipment_options=(),
        ),
    )
    no_primary_muscle = (
        ExerciseBlueprint(
            canonical_name="Validation Row",
            region_tags=(),
            equipment_options=("barbell",),
        ),
    )

    with pytest.raises(ValueError, match="equipment"):
        service._build_catalog_from_blueprints(no_equipment)
    with pytest.raises(ValueError, match="primary"):
        service._build_catalog_from_blueprints(no_primary_muscle)


def test_catalog_aliases_deduplicate_to_single_canonical_id() -> None:
    service = ExerciseCatalogService()
    catalog = service.list_exercises(scope="global")

    alias_to_ids: dict[str, set[str]] = {}
    for entry in catalog:
        for alias in entry.aliases:
            key = " ".join(alias.lower().replace("-", " ").split())
            alias_to_ids.setdefault(key, set()).add(entry.id)

    collisions = {alias: ids for alias, ids in alias_to_ids.items() if len(ids) > 1}
    assert collisions == {}


def test_catalog_seed_validation_rejects_duplicate_aliases_across_entries() -> None:
    service = ExerciseCatalogService()

    duplicate_alias_blueprints = (
        ExerciseBlueprint(
            canonical_name="Validation Front Squat",
            region_tags=("quads", "glutes"),
            equipment_options=("barbell",),
            aliases=("Validation Squat",),
        ),
        ExerciseBlueprint(
            canonical_name="Validation Back Squat",
            region_tags=("quads", "glutes"),
            equipment_options=("dumbbell",),
            aliases=("Validation Squat",),
        ),
    )

    with pytest.raises(ValueError, match="duplicate alias"):
        service._build_catalog_from_blueprints(duplicate_alias_blueprints)
