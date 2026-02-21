# Data Model: Sportolo v1 (API + Responsive Web)

## Modeling Objectives

- Preserve deterministic reproducibility for planning, session, sync, DSL/IR compile, and fatigue outputs.
- Keep historical records immutable with explicit lineage.
- Enforce immutable canonical IR and late execution-time baseline binding through immutable resolved prescription snapshots.
- Use immutable, versioned daily fatigue snapshots as the authoritative read model with deterministic invalidation/recompute behavior.
- Preserve deterministic progression-failure outcomes with optional template-defined auto-adjust policy on next uncompleted progression-track workout.
- Preserve deterministic integration import deduplication outcomes with explicit ambiguity-resolution state.
- Keep recruitment axis derivation canonical as `max(neural, mechanical)` with no direct classification override path.
- Make adherence over/undertraining flags deterministic and auditable with explicit rolling-window thresholds.
- Keep two-a-day `time-between` semantics warning-only in v1 with no intra-day fatigue decay adjustments.
- Keep fatigue model decay parameters and base weights system-owned/read-only in v1.
- Enforce pure deterministic computation rules (no randomness) for fatigue scoring and progression outcomes.
- Enforce hard data invariants for completed sessions and planned-workout parentage.

## Entities

### User

- **Fields**: `id`, `email`, `display_name`, `role`, `created_at`, `updated_at`
- **Validation**: unique email; `role in {athlete, coach, team_admin}`
- **Relationships**: one-to-many `athlete_profiles`, `recalculation_events`, `sync_conflict_records`, `dsl_compile_attempts`, `athlete_baseline_versions`

### AthleteProfile

- **Fields**: `id`, `user_id`, `timezone`, `active_baseline_version_id`, `preferences_json`, `created_at`, `updated_at`
- **Validation**: signal priority uses `hr|power|pace` with no duplicates
- **Relationships**: one-to-many `athlete_baseline_versions`, `macrocycles`, `daily_checkins`, `sessions`, `fatigue_snapshots`, `recalculation_events`, `sync_conflict_records`, `dsl_programs`, `dsl_compile_attempts`, `resolved_prescription_snapshots`, `adherence_training_flags`

### AthleteBaselineVersion

- **Fields**: `id`, `athlete_profile_id`, `version_number`, `effective_from`, `strength_baselines_json`, `endurance_baselines_json`, `created_by`, `created_at`
- **Validation**:
  - monotonic `version_number` per athlete
  - immutable after creation
  - referenced zones remain ordered/non-overlapping
- **Relationships**: referenced by `resolved_prescription_snapshot`, `session`

### FatigueModelPolicyVersion

- **Fields**: `id`, `policy_version`, `axis_decay_params_json`, `base_weight_params_json`, `effective_from`, `created_at`, `is_active`
- **Validation**:
  - only one active policy version at a time
  - immutable after activation
  - not user-editable through athlete/coach workflows
  - decay/weight parameters are deterministic constants used by scoring logic
- **Relationships**: referenced by `fatigue_snapshot`, `progression_failure_outcome`, `adherence_training_flag`

### Macrocycle

- **Fields**: `id`, `athlete_profile_id`, `active_version_id`, `primary_goal`, `target_date`, `priority_mode`, `timeline_anchor`, `status`
- **Validation**: `priority_mode in {strength_first, endurance_first, balanced}`
- **Relationships**: one-to-many `macrocycle_versions`, `mesocycles`

### GoalTarget

- **Fields**: `id`, `athlete_profile_id`, `goal_id`, `title`, `modality`, `outcome_metric`, `outcome_target`, `priority_rank`, `competition_event_id`, `competition_event_name`, `competition_event_date`
- **Validation**:
  - `modality in {strength, endurance, hybrid}`
  - `priority_rank` must be unique and contiguous per athlete goal-plan snapshot
  - `goal_id` must be unique per athlete goal-plan snapshot
- **Relationships**: grouped into deterministic goal-priority planning snapshots and consumed by macrocycle initialization/reflow services

### GoalPriorityConflictTrace

- **Fields**: `id`, `athlete_profile_id`, `left_goal_id`, `right_goal_id`, `left_event_id`, `right_event_id`, `conflict_type`, `severity`, `rationale`, `days_apart`, `window_days`, `active_goal_involved`, `compared_event_dates_json`
- **Validation**:
  - `conflict_type in {event_date_collision, cross_modality_overlap}`
  - deterministic hash-based `id` from compared goal/event inputs
  - emitted only from deterministic conflict-resolution rules
- **Relationships**: referenced in goal-priority API responses as traceable conflict metadata

### MacrocycleVersion

- **Fields**: `id`, `macrocycle_id`, `version_number`, `source_version_id`, `effective_date`, `change_reason`, `created_by`, `created_at`
- **Validation**: monotonic `version_number` per macrocycle; immutable after creation
- **Relationships**: one-to-many `mesocycle_versions`; referenced by `snapshot`

### Mesocycle

- **Fields**: `id`, `macrocycle_id`, `template_id`, `active_version_id`, `modality_focus`, `start_date`, `end_date`
- **Validation**: date windows non-overlapping within macrocycle
- **Relationships**: one-to-many `mesocycle_versions`, `workouts`

### MesocycleVersion

- **Fields**: `id`, `mesocycle_id`, `macrocycle_version_id`, `version_number`, `source_version_id`, `effective_date`, `change_reason`, `created_at`
- **Validation**: monotonic `version_number` per mesocycle; immutable after creation
- **Relationships**: one-to-many `workout_versions`

### MesocycleTemplate

- **Fields**: `id`, `name`, `modality_focus`, `periodization_type`, `progression_rules_json`, `deload_rules_json`, `test_week_rules_json`, `weekly_structure_philosophy`, `progression_failure_policy`
- **Validation**:
  - deterministic parse for all rule payloads
  - `progression_failure_policy in {advisory_only, repeat, regress, deload}`

### Workout

- **Fields**: `id`, `mesocycle_id`, `athlete_profile_id`, `active_version_id`, `scheduled_at`, `time_of_day`, `time_between_previous`, `status`
- **Validation**:
  - `mesocycle_id` is required and must reference an existing mesocycle for any planned workout
  - completed workouts are immutable for movement
  - `time_between_previous` is used for warning/explanation heuristics and audit context only
  - v1 applies no intra-day decay adjustments from `time_between_previous`
- **Relationships**: one-to-many `workout_versions`, `sessions`, `sync_conflict_records`, `resolved_prescription_snapshots`

### TwoADayGapSignal

- **Fields**: `workout_id`, `prior_workout_id`, `gap_minutes`, `risk_level`, `rule_version`, `evaluated_at`
- **Validation**:
  - derived deterministically from workout scheduling and `time_between_previous`
  - `risk_level in {none, low, medium, high}`
  - warning-only signal; must never directly alter fatigue axis values in v1
- **Relationships**: derived projection for `workout` and surfaced in fatigue/warning read models

### WorkoutVersion

- **Fields**: `id`, `workout_id`, `mesocycle_version_id`, `version_number`, `effective_date`, `authoring_source`, `dsl_program_id`, `ir_workout_id`, `created_at`
- **Validation**: structural regeneration applies only to uncompleted future workouts
- **Relationships**: one-to-one `ir_workout`; one-to-many `sessions`, `resolved_prescription_snapshots`

### Snapshot

- **Fields**: `id`, `athlete_profile_id`, `snapshot_type`, `target_macrocycle_id`, `target_mesocycle_id`, `source_version_id`, `is_system_generated`, `note`, `created_by`, `created_at`
- **Validation**: `snapshot_type in {macrocycle, mesocycle}` and exactly one target id present
- **Relationships**: one-to-many `snapshot_restore_events`

### SnapshotRestoreEvent

- **Fields**: `id`, `snapshot_id`, `effective_date`, `restore_reason`, `restored_by`, `new_macrocycle_version_id`, `created_at`
- **Validation**: restore must create forward version; destructive rollback invalid

### DslProgram

- **Fields**:
  - identity: `id`, `athlete_profile_id`, `dsl_version`, `source_text`, `parity_profile`, `compatibility_mode`
  - compile metadata: `compile_status`, `compile_errors_json`, `source_length`, `max_nesting_depth_observed`, `ir_node_count`, `bounded_loop_iterations_total`, `compile_duration_ms`, `guardrail_profile`
  - binding metadata: `binding_mode`
  - audit: `created_at`, `updated_at`
- **Validation**:
  - deterministic parse/compile from identical inputs
  - `source_length <= 50000`
  - `max_nesting_depth_observed <= 16`
  - `ir_node_count <= 20000`
  - `bounded_loop_iterations_total <= 10000`
  - `binding_mode = late_execution`
- **Relationships**: one-to-many `workout_versions`, `dsl_compile_attempts`

### DslCompileAttempt

- **Fields**: `id`, `athlete_profile_id`, `dsl_program_id`, `request_source`, `started_at`, `completed_at`, `duration_ms`, `result_status`, `guardrail_violation_code`, `validation_errors_json`, `ir_persisted`
- **Validation**:
  - `request_source in {user, llm_translate, llm_parse}`
  - `result_status in {success, rejected_guardrail, rejected_validation, timed_out}`
  - hard timeout at `5000` ms yields `timed_out`
  - `ir_persisted=false` for `rejected_guardrail|rejected_validation|timed_out`
  - LLM-sourced attempts use identical validations/guardrails and same binding mode

### IrWorkout

- **Fields**: `id`, `dsl_program_id`, `ir_version`, `binding_mode`, `determinism_hash`, `segments_json`, `symbolic_intensity_refs_json`, `symbolic_progression_refs_json`, `created_at`
- **Validation**:
  - immutable after creation
  - `binding_mode = late_execution`
  - identical canonical input produces identical `determinism_hash`
  - no athlete-resolved absolute targets in symbolic refs

### ResolvedPrescriptionSnapshot

- **Fields**:
  - identity: `id`, `athlete_profile_id`, `workout_id`, `workout_version_id`
  - source lineage: `ir_workout_id`, `ir_version`, `baseline_version_id`, `baseline_version_number`
  - resolved data: `resolved_intensity_targets_json`, `resolved_progression_values_json`, `resolution_context_json`
  - audit: `resolved_at`, `resolved_by`, `is_locked`
- **Validation**:
  - immutable once persisted (`is_locked=true`)
  - must reference valid `ir_workout` and `athlete_baseline_version`
  - one active resolved snapshot per session start, but historical snapshots are retained
  - baseline changes do not mutate existing snapshots

### Session

- **Fields**:
  - Identity: `id`, `athlete_profile_id`, `workout_id`, `workout_version_id`
  - Lifecycle: `state`, `termination_signal`
  - Timing: `started_at`, `ended_at`, `server_received_at`
  - Execution: `execution_events_json`, `completed_work_ratio`
  - Actual load: `actual_load_data_json`
  - Prescription linkage: `resolved_prescription_snapshot_id`, `baseline_version_id_used`
  - Classification linkage: `classification_inputs_json`, `classification_outcome_json`
  - Progression linkage: `progression_track_id`, `progression_failure_outcome_id`
  - Fatigue qualification: `fatigue_eligible`, `fatigue_eligibility_reason`
  - Sync metadata: `source_client`, `origin_device_id`, `sync_state`, `last_sync_operation_id`
- **Validation**:
  - `state in {planned, in_progress, completed, partial, abandoned}`
  - `termination_signal in {planned_complete, user_end_save, discard, timeout, app_exit}`
  - `partial` requires `termination_signal=user_end_save`
  - `abandoned` requires `termination_signal in {discard, timeout, app_exit}`
  - `abandoned` fatigue eligibility requires `completed_work_ratio >= 0.20` (or deterministic modality-equivalent threshold)
  - `completed` requires non-null `ended_at` (completion timestamp), `resolved_prescription_snapshot_id`, and non-empty `actual_load_data_json`
  - terminal sessions must reference immutable `resolved_prescription_snapshot_id`
  - immutable `workout_version_id` once session is terminal
  - conflict winner precedence: `completed > partial > abandoned > in_progress > planned`
  - equal-precedence execution tie-break: higher `completed_work_ratio`, then latest `server_received_at`
  - progression failure is deterministic when prescribed minimum target is missed or top-set RPE overshoots expected by `>=1`
  - progression auto-adjust applies only when template policy is not `advisory_only` and only to next uncompleted workout in same `progression_track_id`
  - classification outcomes may contribute to neural/mechanical scoring inputs but cannot directly set recruitment
  - randomness is not permitted in state, fatigue, or progression resolution derived from this record

### ProgressionFailureOutcome

- **Fields**: `id`, `athlete_profile_id`, `session_id`, `workout_id`, `progression_track_id`, `failure_detected`, `failure_reasons_json`, `expected_top_set_rpe`, `actual_top_set_rpe`, `policy_applied`, `adjustment_applied`, `next_workout_version_id`, `created_at`
- **Validation**:
  - `policy_applied in {advisory_only, repeat, regress, deload}`
  - `failure_detected=true` requires at least one reason (`target_miss`, `rpe_overshoot`)
  - `adjustment_applied=false` when `policy_applied=advisory_only`
  - if `adjustment_applied=true`, `next_workout_version_id` must exist and be the next uncompleted workout in same `progression_track_id`
  - outcome generation is deterministic and must reference a fixed model policy version (no randomness)

### DailyCheckIn

- **Fields**: `id`, `athlete_profile_id`, `date`, `sleep`, `fuel`, `stress`, `edited_at`, `edited_by`
- **Validation**: null sleep allowed; normal-sleep default applied only in computation

### FatigueSnapshot

- **Fields**: `id`, `athlete_profile_id`, `as_of`, `neural`, `metabolic`, `mechanical`, `recruitment`, `combined_score`, `system_capacity_state`, `top_contributors_json`, `computed_version`, `prior_computed_version_id`, `source_plan_version_id`, `model_policy_version_id`, `created_at`
- **Validation**:
  - axis values in `[1.0, 10.0]`
  - `recruitment = max(neural, mechanical)`
  - recruitment remains derived-only and cannot be persisted from a direct classification override
  - two-a-day `time-between` warning signals can be attached as contributor context but cannot apply intra-day decay adjustments in v1
  - computation uses fixed `model_policy_version_id` decay/weight params with no randomness
  - recomputation creates new `computed_version`, never in-place overwrite
  - authoritative read for each `as_of` date uses highest `computed_version`
  - Today/Calendar reads use persisted `FatigueSnapshot` records, not full recompute-on-read

### RecalculationEvent

- **Fields**: `id`, `athlete_profile_id`, `actor_user_id`, `trigger_reason`, `recompute_from_date`, `recompute_to_date`, `input_change_ref`, `affected_prior_snapshot_versions_json`, `created_snapshot_versions_json`, `created_at`
- **Validation**:
  - mandatory for each retroactive recomputation
  - referenced snapshot versions must exist
  - recompute range starts at earliest invalidated date and includes edited check-in date

### SyncConflictRecord

- **Fields**:
  - Identity: `id`, `athlete_profile_id`, `workout_id`
  - Conflict details: `field_category`, `conflict_type`, `left_source`, `right_source`, `left_session_id`, `right_session_id`
  - Resolution policy: `resolution_mode`, `winner_rule`, `winner_session_id`, `winner_server_received_at`
  - Manual resolution: `resolution_status`, `resolved_by`, `resolved_at`, `resolution_note`
  - Audit: `created_at`
- **Validation**:
  - `field_category in {session_state, execution_data, notes, structure}`
  - `resolution_mode in {auto, manual_required, manual_applied}`
  - notes conflicts auto-resolve by latest `server_received_at`
  - structure conflicts always `manual_required` until user resolves
  - completed execution data cannot be replaced by planned-only edits

### CalendarAuditPoint

- **Fields**: `id`, `athlete_profile_id`, `date`, `completed_axes_json`, `planned_axes_json`, `recruitment_overlay`, `threshold_zone_state`, `plan_version_id`, `fatigue_computed_version`
- **Validation**: reflects deterministic completed + qualifying incomplete outcomes with lineage references

### AdherenceTrainingFlag

- **Fields**:
  - identity: `id`, `athlete_profile_id`, `window_start`, `window_end`, `as_of`
  - outcomes: `overtraining_flag`, `undertraining_flag`, `overall_flag_state`
  - overtraining inputs: `rolling_7d_completed_load_ratio_pct`, `fatigue_axis_ge_7_days_in_7d`, `fatigue_axis_ge_7_consecutive_days`
  - undertraining inputs: `rolling_14d_completed_load_ratio_pct`, `planned_session_completion_rate_14d`
  - thresholds used: `overtraining_load_threshold_pct`, `overtraining_fatigue_days_threshold`, `overtraining_consecutive_days_threshold`, `undertraining_load_threshold_pct`, `undertraining_completion_threshold_pct`
  - audit: `computed_at`, `computed_by_policy_version`, `source_fatigue_snapshot_versions_json`
- **Validation**:
  - `overall_flag_state in {none, overtraining, undertraining, both}`
  - overtraining sets true when `(rolling_7d_completed_load_ratio_pct >= 115 and fatigue_axis_ge_7_days_in_7d >= 2)` OR `(fatigue_axis_ge_7_consecutive_days >= 3)`
  - undertraining sets true when `(rolling_14d_completed_load_ratio_pct <= 75)` OR `(planned_session_completion_rate_14d < 70)`
  - thresholds must match FR-063 policy constants for v1
  - computed record is immutable once persisted

### ExerciseCatalogItem

- **Fields**: `id`, `scope`, `canonical_name`, `aliases_json`, `region_tags_json`, `source`, `owner_user_id`
- **Validation**: `scope in {global, user}` with strict scope isolation

### IntegrationActivity

- **Fields**: `id`, `athlete_profile_id`, `provider`, `direction`, `artifact_type`, `status`, `source_reference`, `external_activity_id`, `activity_start_at`, `duration_seconds`, `modality`, `dedup_match_strategy`, `dedup_status`, `dedup_matched_activity_id`, `dedup_candidate_ids_json`, `dedup_resolved_by`, `dedup_resolved_at`, `error_code`, `created_at`, `updated_at`
- **Validation**:
  - provider in `{strava, garmin, wahoo, fit, tcx}`
  - no external plan mutation authority
  - deterministic dedup sequence:
    - strategy `external_id_exact` when external id exists
    - strategy `time_duration_modality_fallback` only when external id is unavailable
  - fallback match tolerances: `activity_start_at +/- 60s`, `duration_seconds +/- 5%`, same `modality`
  - `dedup_status in {new_linked, duplicate_linked, pending_resolution}`
  - if `dedup_status=pending_resolution`, `dedup_candidate_ids_json` must contain >=2 candidates and `dedup_matched_activity_id` is null

### IntegrationDedupResolutionEvent

- **Fields**: `id`, `integration_activity_id`, `athlete_profile_id`, `resolution_action`, `selected_candidate_id`, `resolved_by`, `resolved_at`, `note`
- **Validation**:
  - `resolution_action in {link_candidate, create_new}`
  - `selected_candidate_id` required when action is `link_candidate`
  - action must resolve a `pending_resolution` integration record

## Relationship Highlights

- `AthleteProfile 1..* AthleteBaselineVersion`
- `Macrocycle 1..* MacrocycleVersion`
- `Mesocycle 1..* MesocycleVersion`
- `Workout 1..* WorkoutVersion`
- `DslProgram 1..* DslCompileAttempt`
- `IrWorkout 1..1 DslProgram` for successful compile artifacts
- `ResolvedPrescriptionSnapshot -> IrWorkout + AthleteBaselineVersion + WorkoutVersion`
- `Session -> WorkoutVersion + ResolvedPrescriptionSnapshot` (historical anchor)
- `Session 0..1 -> ProgressionFailureOutcome`
- `FatigueModelPolicyVersion 1..* -> FatigueSnapshot`
- `FatigueModelPolicyVersion 1..* -> ProgressionFailureOutcome`
- `Workout 0..1 -> TwoADayGapSignal` (derived warning context)
- `FatigueSnapshot` lineage via `computed_version` and `prior_computed_version_id`
- Today/Calendar read model resolves each day from `FatigueSnapshot` max `computed_version`
- `AthleteProfile 1..* AdherenceTrainingFlag`
- `RecalculationEvent` references prior and new fatigue snapshot versions
- `SnapshotRestoreEvent` references newly created forward plan versions
- `SyncConflictRecord` references affected `Workout` and conflicting `Session` records
- `IntegrationActivity 0..* -> IntegrationDedupResolutionEvent`

## State Transitions

### Plan versioning

- structural edit: `current_version -> new_version`
- rebase scope: uncompleted future workouts from effective date
- completed history: immutable

### Baseline versioning

- baseline edit: `baseline_version_n -> baseline_version_n+1`
- effect scope: unresolved future workout resolutions only
- historical resolved prescriptions: immutable

### Snapshot restore

- `snapshot_created -> restore_requested -> forward_version_created`
- destructive rollback: invalid

### Session

- `planned -> in_progress`
- `in_progress -> completed` (`planned_complete`) only when completion invariants are satisfied
- `in_progress -> partial` (`user_end_save`)
- `in_progress -> abandoned` (`discard|timeout|app_exit`)

### Progression-failure resolution

- `session_terminal -> evaluate_progression_triggers -> progression_failure_outcome_recorded`
- default: `policy_applied=advisory_only`, no structural plan mutation
- template policy (`repeat|regress|deload`): apply deterministic adjustment to next uncompleted workout in same `progression_track_id`

### DSL compile attempt

- `received -> validating -> compiling -> success|rejected_guardrail|rejected_validation|timed_out`
- guardrail violations and timeout are terminal non-persist paths
- successful compile path persists immutable `IrWorkout`

### Prescription resolution

- `session_start|preview_request -> resolve_from_ir_and_baseline -> resolved_snapshot_persisted`
- baseline changes after resolution do not mutate persisted snapshots

### Offline sync conflict resolution

- `sync_batch_received -> compare_candidates -> auto_resolve_or_flag`
- auto resolve:
  - state precedence winner
  - completed-vs-planned winner = completed
  - notes winner = latest `server_received_at`
  - equal-precedence execution winner = higher `completed_work_ratio`, then latest `server_received_at`
- manual resolve:
  - structural conflict -> `manual_required`
  - user selects outcome -> `manual_applied`

### Retroactive recomputation

- `daily_checkin_edited(past date) -> recompute_requested -> recompute_executed`
- output: new `FatigueSnapshot` versions from edited date forward
- read impact: newest `computed_version` becomes authoritative per affected date
- side effect: mandatory `RecalculationEvent`

### Adherence flag evaluation

- `analytics_window_requested -> compute_window_metrics -> adherence_training_flag_persisted`
- output: immutable window-scoped flag record with deterministic thresholds and source snapshot lineage

### Two-a-day gap warning evaluation

- `workout_schedule_or_move -> evaluate_two_a_day_gap_signal -> warning_context_updated`
- output: deterministic warning context using `time_between_previous` without changing intra-day fatigue decay math

### Integration import dedup resolution

- `import_received -> dedup_external_id_attempt -> duplicate_linked|fallback_match_needed`
- `fallback_match_needed -> dedup_fallback_eval -> duplicate_linked|new_linked|pending_resolution`
- `pending_resolution -> user_resolution(link_candidate|create_new) -> duplicate_linked|new_linked`

## Migration Notes (Alembic)

- Create baseline version-lineage and session-state tables/constraints.
- Add athlete baseline version table:
  - `athlete_baseline_version` with unique (`athlete_profile_id`, `version_number`)
- Add DSL compile guardrail fields:
  - `dsl_program.source_length`
  - `dsl_program.max_nesting_depth_observed`
  - `dsl_program.ir_node_count`
  - `dsl_program.bounded_loop_iterations_total`
  - `dsl_program.compile_duration_ms`
  - `dsl_program.binding_mode`
  - `dsl_compile_attempt` table
- Add resolved prescription table:
  - `resolved_prescription_snapshot` with lineage to IR and baseline versions
- Add recomputation lineage fields:
  - `fatigue_snapshot.computed_version`
  - `fatigue_snapshot.prior_computed_version_id`
  - `recalculation_event` table
- Add progression failure outcome table:
  - `progression_failure_outcome` with session linkage and policy/applied-adjustment fields
- Add fatigue model policy table:
  - `fatigue_model_policy_version` with immutable decay/weight constants and activation metadata
- Add adherence flag analytics table:
  - `adherence_training_flag` with window metrics, deterministic threshold values, and immutable computed outcomes
- Add integration dedup resolution table:
  - `integration_dedup_resolution_event` with selected action and actor audit
- Add sync conflict table:
  - `sync_conflict_record` with conflict metadata and resolution fields
- Add constraints:
  - unique (`macrocycle_id`, `version_number`)
  - unique (`mesocycle_id`, `version_number`)
  - unique (`workout_id`, `version_number`)
  - valid state/signal combinations for `session`
  - completed-session invariants for `session` (`ended_at`, `resolved_prescription_snapshot_id`, `actual_load_data_json`)
  - non-null foreign key for planned workout parent (`workout.mesocycle_id`)
  - valid compile-attempt status/ir-persist combinations
  - valid resolution-mode/status combinations for `sync_conflict_record`
  - immutable-row enforcement for `ir_workout` and `resolved_prescription_snapshot`
  - immutable-row enforcement for `fatigue_model_policy_version`
- Add indexes:
  - (`athlete_profile_id`, `version_number`) on `athlete_baseline_version`
  - (`athlete_profile_id`, `workout_id`, `resolved_at`) on `resolved_prescription_snapshot`
  - (`athlete_profile_id`, `as_of`, `computed_version`) on `fatigue_snapshot`
  - (`is_active`, `effective_from`) on `fatigue_model_policy_version`
  - (`athlete_profile_id`, `recompute_from_date`) on `recalculation_event`
  - (`athlete_profile_id`, `date`) on `calendar_audit_point`
  - (`athlete_profile_id`, `workout_id`, `resolution_status`) on `sync_conflict_record`
  - (`athlete_profile_id`, `completed_at`, `result_status`) on `dsl_compile_attempt`
  - (`athlete_profile_id`, `progression_track_id`, `created_at`) on `progression_failure_outcome`
  - (`athlete_profile_id`, `window_end`, `computed_at`) on `adherence_training_flag`
  - (`athlete_profile_id`, `provider`, `external_activity_id`) on `integration_activity`
  - (`athlete_profile_id`, `activity_start_at`, `duration_seconds`, `modality`) on `integration_activity`
