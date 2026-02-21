"""Domain event contract registry and models."""

from .contracts import (
    EVENT_CONTRACT_REGISTRY,
    AxisLoadSnapshot,
    EventContract,
    EventMetadataCommon,
    FatigueRecomputedEvent,
    FatigueRecomputedMetadata,
    FatigueRecomputedPayload,
    PlanWorkoutMovedEvent,
    PlanWorkoutMovedMetadata,
    PlanWorkoutMovedPayload,
    WorkoutCompletedEvent,
    WorkoutCompletedMetadata,
    WorkoutCompletedPayload,
    get_event_contract,
)

__all__ = [
    "AxisLoadSnapshot",
    "EventMetadataCommon",
    "EventContract",
    "WorkoutCompletedMetadata",
    "WorkoutCompletedPayload",
    "WorkoutCompletedEvent",
    "PlanWorkoutMovedMetadata",
    "PlanWorkoutMovedPayload",
    "PlanWorkoutMovedEvent",
    "FatigueRecomputedMetadata",
    "FatigueRecomputedPayload",
    "FatigueRecomputedEvent",
    "EVENT_CONTRACT_REGISTRY",
    "get_event_contract",
]
