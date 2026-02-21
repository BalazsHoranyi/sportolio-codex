from __future__ import annotations

from sportolo.services.exercise_catalog_service import (
    EQUIPMENT_ABBREVIATIONS,
    EQUIPMENT_LABELS,
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
        "Split Squat",
        "Good Morning",
        "Shrug",
        "Pallof Press",
        "Pullover",
        "Side Plank",
        "Hanging Leg Raise",
        "Back Extension",
        "Hip Abduction",
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
