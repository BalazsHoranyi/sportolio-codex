from __future__ import annotations

from dataclasses import dataclass

from sportolo.api.schemas.exercise_zone_mapping import (
    ActivityAxisEffect,
    AxisEffectActivityInput,
    AxisEffectMappingRequest,
    AxisEffectMappingResponse,
    ConfidenceLevel,
    GlobalAxisEffects,
    InferenceSource,
    RegionalAxisEffects,
)


@dataclass(frozen=True)
class StrengthMapping:
    neural_factor: float
    metabolic_factor: float
    mechanical_factor: float
    recruitment_factor: float
    regional_distribution: dict[str, float]


class ExerciseZoneMappingService:
    _FALLBACK_STRENGTH_MAPPING = StrengthMapping(
        neural_factor=0.25,
        metabolic_factor=0.30,
        mechanical_factor=0.25,
        recruitment_factor=0.30,
        regional_distribution={"global_other": 1.0},
    )

    _STRENGTH_MAPPINGS: dict[str, StrengthMapping] = {
        "back squat": StrengthMapping(
            neural_factor=0.40,
            metabolic_factor=0.20,
            mechanical_factor=0.50,
            recruitment_factor=0.60,
            regional_distribution={"core": 0.20, "lower_body": 0.80},
        ),
        "bench press": StrengthMapping(
            neural_factor=0.35,
            metabolic_factor=0.25,
            mechanical_factor=0.35,
            recruitment_factor=0.45,
            regional_distribution={"core": 0.25, "upper_body": 0.75},
        ),
        "deadlift": StrengthMapping(
            neural_factor=0.45,
            metabolic_factor=0.20,
            mechanical_factor=0.55,
            recruitment_factor=0.60,
            regional_distribution={"core": 0.25, "lower_body": 0.60, "upper_back": 0.15},
        ),
        "barbell row": StrengthMapping(
            neural_factor=0.30,
            metabolic_factor=0.25,
            mechanical_factor=0.35,
            recruitment_factor=0.40,
            regional_distribution={"core": 0.25, "upper_body": 0.75},
        ),
        "overhead press": StrengthMapping(
            neural_factor=0.38,
            metabolic_factor=0.28,
            mechanical_factor=0.36,
            recruitment_factor=0.42,
            regional_distribution={"core": 0.30, "upper_body": 0.70},
        ),
    }

    _ZONE_FACTORS: dict[int, dict[str, float]] = {
        1: {
            "neural": 0.10,
            "metabolic": 0.25,
            "mechanical": 0.15,
            "recruitment": 0.10,
        },
        2: {
            "neural": 0.15,
            "metabolic": 0.35,
            "mechanical": 0.25,
            "recruitment": 0.15,
        },
        3: {
            "neural": 0.22,
            "metabolic": 0.50,
            "mechanical": 0.35,
            "recruitment": 0.22,
        },
        4: {
            "neural": 0.30,
            "metabolic": 0.80,
            "mechanical": 0.50,
            "recruitment": 0.40,
        },
        5: {
            "neural": 0.45,
            "metabolic": 1.00,
            "mechanical": 0.70,
            "recruitment": 0.55,
        },
    }

    _MODALITY_MULTIPLIERS: dict[str, dict[str, float]] = {
        "run": {"neural": 1.00, "metabolic": 1.00, "mechanical": 1.20, "recruitment": 1.00},
        "cycle": {"neural": 0.95, "metabolic": 1.00, "mechanical": 0.80, "recruitment": 0.95},
        "row": {"neural": 1.05, "metabolic": 1.00, "mechanical": 1.00, "recruitment": 1.05},
        "swim": {"neural": 0.90, "metabolic": 1.00, "mechanical": 0.60, "recruitment": 0.90},
    }

    _MODALITY_REGIONAL_DISTRIBUTION: dict[str, dict[str, float]] = {
        "run": {"core": 0.20, "lower_body": 0.70, "upper_body": 0.10},
        "cycle": {"core": 0.20, "lower_body": 0.75, "upper_body": 0.05},
        "row": {"core": 0.25, "lower_body": 0.40, "upper_body": 0.35},
        "swim": {"core": 0.30, "lower_body": 0.20, "upper_body": 0.50},
    }

    def map_axis_effects(
        self, athlete_id: str, request: AxisEffectMappingRequest
    ) -> AxisEffectMappingResponse:
        activities = [self._map_activity(activity_input) for activity_input in request.activities]

        aggregate_global_totals = {
            "neural": 0.0,
            "metabolic": 0.0,
            "mechanical": 0.0,
            "recruitment": 0.0,
        }
        aggregate_regional_totals: dict[str, dict[str, float]] = {}

        for activity in activities:
            aggregate_global_totals["neural"] = self._round(
                aggregate_global_totals["neural"] + activity.global_effects.neural
            )
            aggregate_global_totals["metabolic"] = self._round(
                aggregate_global_totals["metabolic"] + activity.global_effects.metabolic
            )
            aggregate_global_totals["mechanical"] = self._round(
                aggregate_global_totals["mechanical"] + activity.global_effects.mechanical
            )
            aggregate_global_totals["recruitment"] = self._round(
                aggregate_global_totals["recruitment"] + activity.global_effects.recruitment
            )

            for region, effect in activity.regional_effects.items():
                if region not in aggregate_regional_totals:
                    aggregate_regional_totals[region] = {
                        "recruitment": 0.0,
                        "metabolic": 0.0,
                        "mechanical": 0.0,
                    }
                aggregate_regional_totals[region]["recruitment"] = self._round(
                    aggregate_regional_totals[region]["recruitment"] + effect.recruitment
                )
                aggregate_regional_totals[region]["metabolic"] = self._round(
                    aggregate_regional_totals[region]["metabolic"] + effect.metabolic
                )
                aggregate_regional_totals[region]["mechanical"] = self._round(
                    aggregate_regional_totals[region]["mechanical"] + effect.mechanical
                )

        sorted_regions = {
            region: RegionalAxisEffects(**aggregate_regional_totals[region])
            for region in sorted(aggregate_regional_totals)
        }

        return AxisEffectMappingResponse(
            athlete_id=athlete_id,
            activities=activities,
            aggregate_global_effects=GlobalAxisEffects(**aggregate_global_totals),
            aggregate_regional_effects=sorted_regions,
        )

    def _map_activity(self, activity: AxisEffectActivityInput) -> ActivityAxisEffect:
        if activity.activity_type == "strength":
            return self._map_strength_activity(activity)

        return self._map_endurance_activity(activity)

    def _map_strength_activity(self, activity: AxisEffectActivityInput) -> ActivityAxisEffect:
        if activity.exercise_name is None:
            raise ValueError("exerciseName is required for strength activity mapping")
        if activity.workload is None:
            raise ValueError("workload is required for strength activity mapping")

        normalized_exercise_name = self._normalize_name(activity.exercise_name)
        mapping = self._STRENGTH_MAPPINGS.get(normalized_exercise_name)

        inference_source: InferenceSource = "strength_lookup"
        confidence: ConfidenceLevel = "high"
        fallback_reason: str | None = None

        if mapping is None:
            mapping = self._FALLBACK_STRENGTH_MAPPING
            inference_source = "fallback_unknown_exercise"
            confidence = "low"
            fallback_reason = "unknown_strength_exercise"

        global_effects = GlobalAxisEffects(
            neural=self._round(activity.workload * mapping.neural_factor),
            metabolic=self._round(activity.workload * mapping.metabolic_factor),
            mechanical=self._round(activity.workload * mapping.mechanical_factor),
            recruitment=self._round(activity.workload * mapping.recruitment_factor),
        )

        regional_effects = self._distribute_regional_effects(
            global_effects=global_effects,
            distribution=mapping.regional_distribution,
        )

        return ActivityAxisEffect(
            activity_id=activity.activity_id,
            activity_type=activity.activity_type,
            exercise_name=activity.exercise_name,
            inference_source=inference_source,
            confidence=confidence,
            fallback_reason=fallback_reason,
            global_effects=global_effects,
            regional_effects=regional_effects,
        )

    def _map_endurance_activity(self, activity: AxisEffectActivityInput) -> ActivityAxisEffect:
        if activity.duration_minutes is None:
            raise ValueError("durationMinutes is required for endurance activity mapping")

        zone, inference_source, confidence, fallback_reason = self._infer_endurance_zone(activity)
        factors = self._ZONE_FACTORS[zone]
        multipliers = self._MODALITY_MULTIPLIERS[activity.activity_type]

        global_effects = GlobalAxisEffects(
            neural=self._round(
                activity.duration_minutes * factors["neural"] * multipliers["neural"]
            ),
            metabolic=self._round(
                activity.duration_minutes * factors["metabolic"] * multipliers["metabolic"]
            ),
            mechanical=self._round(
                activity.duration_minutes * factors["mechanical"] * multipliers["mechanical"]
            ),
            recruitment=self._round(
                activity.duration_minutes * factors["recruitment"] * multipliers["recruitment"]
            ),
        )

        distribution = self._MODALITY_REGIONAL_DISTRIBUTION[activity.activity_type]
        regional_effects = self._distribute_regional_effects(
            global_effects=global_effects,
            distribution=distribution,
        )

        return ActivityAxisEffect(
            activity_id=activity.activity_id,
            activity_type=activity.activity_type,
            exercise_name=activity.exercise_name,
            inferred_zone=zone,
            inference_source=inference_source,
            confidence=confidence,
            fallback_reason=fallback_reason,
            global_effects=global_effects,
            regional_effects=regional_effects,
        )

    @staticmethod
    def _infer_endurance_zone(
        activity: AxisEffectActivityInput,
    ) -> tuple[int, InferenceSource, ConfidenceLevel, str | None]:
        if activity.hr_zone is not None:
            return activity.hr_zone, "hr", "high", None

        if activity.power_zone is not None:
            return activity.power_zone, "power", "medium", None

        if activity.pace_zone is not None:
            return activity.pace_zone, "pace", "medium", None

        return 2, "fallback_default_zone", "low", "missing_zone_metrics"

    @staticmethod
    def _normalize_name(raw_name: str) -> str:
        collapsed = " ".join(raw_name.lower().split())
        return "".join(
            character for character in collapsed if character.isalnum() or character == " "
        )

    def _distribute_regional_effects(
        self, global_effects: GlobalAxisEffects, distribution: dict[str, float]
    ) -> dict[str, RegionalAxisEffects]:
        regional_payload = {
            region: RegionalAxisEffects(
                recruitment=self._round(global_effects.recruitment * ratio),
                metabolic=self._round(global_effects.metabolic * ratio),
                mechanical=self._round(global_effects.mechanical * ratio),
            )
            for region, ratio in distribution.items()
        }

        return {region: regional_payload[region] for region in sorted(regional_payload)}

    @staticmethod
    def _round(value: float) -> float:
        return round(value, 4)
