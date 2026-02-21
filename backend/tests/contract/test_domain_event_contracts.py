from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from sportolo.domain.events.contracts import EVENT_CONTRACT_REGISTRY

SEMVER_PATTERN = re.compile(r"^\d+\.\d+\.\d+$")
FIXTURE_DIR = Path(__file__).resolve().parent / "fixtures" / "domain_events"
REQUIRED_EVENT_TYPES = {
    "workout.completed": "1.0.0",
    "plan.workout.moved": "1.0.0",
    "fatigue.recomputed": "1.0.0",
}


def _fixture_path(event_type: str, version: str) -> Path:
    normalized_type = event_type.replace(".", "_")
    normalized_version = version.replace(".", "_")
    return FIXTURE_DIR / f"{normalized_type}_v{normalized_version}.json"


def _load_schema_fixture(event_type: str, version: str) -> dict[str, Any]:
    fixture = _fixture_path(event_type, version)
    return json.loads(fixture.read_text(encoding="utf-8"))


def _resolve_ref(root: dict[str, Any], node: dict[str, Any]) -> dict[str, Any]:
    reference = node.get("$ref")
    if reference is None:
        return node

    assert reference.startswith("#/$defs/")
    def_key = reference.split("/")[-1]
    return root["$defs"][def_key]


def _assert_schema_compatible(
    baseline_root: dict[str, Any],
    baseline_node: dict[str, Any],
    current_root: dict[str, Any],
    current_node: dict[str, Any],
) -> None:
    resolved_baseline = _resolve_ref(baseline_root, baseline_node)
    resolved_current = _resolve_ref(current_root, current_node)

    baseline_type = resolved_baseline.get("type")
    current_type = resolved_current.get("type")
    if baseline_type is not None:
        assert baseline_type == current_type

    baseline_enum = resolved_baseline.get("enum")
    if baseline_enum is not None:
        assert set(baseline_enum).issubset(set(resolved_current.get("enum", [])))

    baseline_const = resolved_baseline.get("const")
    if baseline_const is not None:
        assert baseline_const == resolved_current.get("const")

    if baseline_type == "object":
        baseline_required = set(resolved_baseline.get("required", []))
        current_required = set(resolved_current.get("required", []))
        assert baseline_required.issubset(current_required)

        baseline_properties = resolved_baseline.get("properties", {})
        current_properties = resolved_current.get("properties", {})
        for property_name, baseline_property_schema in baseline_properties.items():
            assert property_name in current_properties
            _assert_schema_compatible(
                baseline_root,
                baseline_property_schema,
                current_root,
                current_properties[property_name],
            )

    if baseline_type == "array":
        _assert_schema_compatible(
            baseline_root,
            resolved_baseline["items"],
            current_root,
            resolved_current["items"],
        )


def test_domain_event_registry_contains_required_contracts() -> None:
    registry_event_types = {entry.event_type for entry in EVENT_CONTRACT_REGISTRY}
    assert REQUIRED_EVENT_TYPES.keys() <= registry_event_types

    for entry in EVENT_CONTRACT_REGISTRY:
        assert SEMVER_PATTERN.match(entry.event_version)
        assert entry.event_type in REQUIRED_EVENT_TYPES


def test_domain_event_schemas_are_backward_compatible_with_baseline_fixtures() -> None:
    for entry in EVENT_CONTRACT_REGISTRY:
        baseline_schema = _load_schema_fixture(entry.event_type, entry.event_version)
        current_schema = entry.schema_model.model_json_schema(mode="validation")
        _assert_schema_compatible(
            baseline_schema,
            baseline_schema,
            current_schema,
            current_schema,
        )


def test_domain_event_examples_validate_against_schema_contracts() -> None:
    for entry in EVENT_CONTRACT_REGISTRY:
        validated = entry.schema_model.model_validate(entry.example_payload)
        normalized = validated.model_dump(mode="json")
        assert entry.schema_model.model_validate(normalized) == validated
