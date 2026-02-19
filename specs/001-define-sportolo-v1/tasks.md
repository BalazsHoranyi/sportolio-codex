# Tasks: Sportolo v1 Core Platform

**Input**: Design documents from `/Users/bhoranyi/Personal/sportolo2/specs/001-define-sportolo-v1/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/openapi.yaml`, `quickstart.md`

**Tests**: Verification tasks are required for each behavior change and must follow failing-first (Red-Green-Refactor).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize backend/frontend workspaces, shared quality gates, and project scaffolding.

- [ ] T001 Initialize backend project metadata and dependencies in `backend/pyproject.toml`
- [ ] T002 Initialize frontend project metadata and scripts in `frontend/package.json`
- [ ] T003 Create FastAPI app bootstrap and router registration in `backend/src/main.py`
- [ ] T004 Create Next.js app shell and root layout in `frontend/src/app/layout.tsx`
- [ ] T005 [P] Configure backend tooling (ruff, mypy, pytest, coverage) in `backend/pyproject.toml`
- [ ] T006 [P] Configure frontend tooling (eslint, typescript, test runner) in `frontend/tsconfig.json`
- [ ] T007 Configure pre-commit hooks for backend/frontend lint gates in `.pre-commit-config.yaml`
- [ ] T161 [P] Initialize production frontend runtime scripts (`dev`, `build`, `start`) and modern UI dependencies in `frontend/package.json`
- [ ] T162 [P] Add frontend release verification script that enforces browser evidence presence in `frontend/scripts/verify-ui-evidence.mjs`
- [ ] T163 Add root quality-gate targets for frontend production build and UI verification in `Makefile`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build core infrastructure required by all stories.

**⚠️ CRITICAL**: No user story work should start before this phase is complete.

- [ ] T008 Configure environment and settings loading in `backend/src/core/settings.py`
- [ ] T009 Setup SQLAlchemy base, engine, and session management in `backend/src/db/session.py`
- [ ] T010 Initialize Alembic config and migration environment in `backend/migrations/env.py`
- [ ] T011 Create initial schema baseline migration in `backend/migrations/versions/0001_initial_baseline.py`
- [ ] T012 Implement shared API error models and exception handlers in `backend/src/api/errors.py`
- [ ] T013 Implement authentication and role authorization middleware in `backend/src/api/middleware/auth.py`
- [ ] T014 [P] Implement audit logging and request tracing middleware in `backend/src/api/middleware/audit.py`
- [ ] T015 [P] Define deterministic policy constants and no-randomness guardrails in `backend/src/domain/policies/determinism.py`
- [ ] T016 Create shared OpenAPI-driven API client wrappers in `frontend/src/services/api/client.ts`
- [ ] T017 Create reusable UI state components (loading/empty/error/success) in `frontend/src/components/state/index.tsx`

**Checkpoint**: Foundation complete. User story phases can begin.

---

## Phase 3: User Story 1 - Build a Hybrid Plan (Priority: P1) 🎯 MVP

**Goal**: Let athletes build and version hybrid plans, compile DSL, and generate deterministic resolved prescriptions.

**Independent Test**: Create athlete profile, build macro/meso/workout plan, run DSL compile, change baseline, and verify deterministic versioning and resolved prescription behavior.

### Tests for User Story 1 ⚠️

- [ ] T018 [P] [US1] Add failing contract tests for profile and macrocycle endpoints in `backend/tests/contract/test_profiles_macrocycles_contract.py`
- [ ] T019 [P] [US1] Add failing contract tests for snapshots, DSL compile/translate, and resolved prescriptions in `backend/tests/contract/test_dsl_snapshot_prescription_contract.py`
- [ ] T020 [P] [US1] Add failing integration test for effective-date rebase and forward snapshot restore in `backend/tests/integration/test_plan_versioning_restore.py`
- [ ] T021 [US1] Add failing unit tests for DSL guardrail limits and timeout handling in `backend/tests/unit/test_dsl_guardrails.py`
- [ ] T022 [US1] Add failing frontend integration test for planner creation flow in `frontend/tests/integration/planner-create-flow.test.tsx`

### Implementation for User Story 1

- [ ] T023 [P] [US1] Implement athlete profile and baseline version models in `backend/src/models/athlete_profile.py`
- [ ] T024 [P] [US1] Implement macrocycle/mesocycle/workout and version lineage models in `backend/src/models/planning.py`
- [ ] T025 [P] [US1] Implement snapshot and restore event models in `backend/src/models/snapshot.py`
- [ ] T026 [P] [US1] Implement DSL program, compile attempt, and canonical IR models in `backend/src/models/dsl_ir.py`
- [ ] T027 [P] [US1] Implement resolved prescription snapshot model in `backend/src/models/resolved_prescription.py`
- [ ] T028 [US1] Create planning and DSL schema migration in `backend/migrations/versions/0002_planning_dsl_lineage.py`
- [ ] T029 [US1] Implement plan versioning and effective-date regeneration service in `backend/src/services/planning/versioning_service.py`
- [ ] T030 [US1] Implement snapshot create/restore forward-version service in `backend/src/services/planning/snapshot_service.py`
- [ ] T031 [US1] Implement deterministic DSL compile/translate guardrail service in `backend/src/services/dsl/compile_service.py`
- [ ] T032 [US1] Implement late-binding resolved prescription service in `backend/src/services/prescriptions/resolve_service.py`
- [ ] T033 [US1] Implement planning routers for profiles, macrocycles, mesocycles, workouts, and moves in `backend/src/api/routes/planning.py`
- [ ] T034 [US1] Implement DSL and resolved-prescription routers in `backend/src/api/routes/dsl.py`
- [ ] T035 [US1] Implement planner data hooks and API bindings in `frontend/src/features/planner/api.ts`
- [ ] T036 [US1] Implement planner screens for profile/macro/meso/workout authoring in `frontend/src/app/planner/page.tsx`
- [ ] T037 [US1] Implement DSL editor and validation feedback UI in `frontend/src/features/dsl/EditorPanel.tsx`
- [ ] T038 [US1] Implement snapshot/version history and restore UI in `frontend/src/features/planner/VersionHistoryPanel.tsx`

**Checkpoint**: User Story 1 core behavior is functional; full story sign-off depends on Phase 8 cross-cutting validation tasks.

---

## Phase 4: User Story 2 - Execute and Log Sessions Reliably (Priority: P1)

**Goal**: Support deterministic session lifecycle, offline edits, sync conflict resolution, and progression-failure handling.

**Independent Test**: Run online/offline mixed sessions, finalize with partial/abandoned/completed states, then sync and validate deterministic conflict outcomes.

### Tests for User Story 2 ⚠️

- [ ] T039 [P] [US2] Add failing contract tests for session create/finalize/progression endpoints in `backend/tests/contract/test_sessions_contract.py`
- [ ] T040 [P] [US2] Add failing contract tests for sync batch/conflict resolution endpoints in `backend/tests/contract/test_sync_contract.py`
- [ ] T041 [P] [US2] Add failing integration test for partial vs abandoned deterministic transitions in `backend/tests/integration/test_session_state_transitions.py`
- [ ] T042 [P] [US2] Add failing integration test for offline same-workout conflict precedence and tie-break rules in `backend/tests/integration/test_sync_conflict_resolution.py`
- [ ] T043 [US2] Add failing frontend integration test for offline session logging and replay in `frontend/tests/integration/session-offline-sync.test.tsx`

### Implementation for User Story 2

- [ ] T044 [P] [US2] Implement session and execution payload models with required completion invariants in `backend/src/models/session.py`
- [ ] T045 [P] [US2] Implement progression failure outcome model in `backend/src/models/progression_failure.py`
- [ ] T046 [P] [US2] Implement sync conflict record model in `backend/src/models/sync_conflict.py`
- [ ] T047 [US2] Create session/sync/progression schema migration in `backend/migrations/versions/0003_sessions_sync_progression.py`
- [ ] T048 [US2] Implement session lifecycle state machine service in `backend/src/services/sessions/state_machine.py`
- [ ] T049 [US2] Implement progression-failure detection and policy application service in `backend/src/services/sessions/progression_service.py`
- [ ] T050 [US2] Implement sync conflict resolver with deterministic precedence rules in `backend/src/services/sync/conflict_resolver.py`
- [ ] T051 [US2] Implement session create/finalize and progression routes in `backend/src/api/routes/sessions.py`
- [ ] T052 [US2] Implement sync batch, conflict list, and conflict resolve routes in `backend/src/api/routes/sync.py`
- [ ] T053 [US2] Implement frontend workout execution and set/interval logger screen in `frontend/src/app/workouts/[workoutId]/execute/page.tsx`
- [ ] T054 [US2] Implement frontend offline queue and retry sync store in `frontend/src/features/sessions/offlineQueue.ts`
- [ ] T055 [US2] Implement frontend sync conflict resolution modal in `frontend/src/features/sync/ConflictResolutionModal.tsx`
- [ ] T056 [US2] Implement frontend progression failure outcome panel in `frontend/src/features/sessions/ProgressionFailurePanel.tsx`

**Checkpoint**: User Stories 1 and 2 core behavior are functional; full sign-off depends on Phase 8 cross-cutting validation tasks.

---

## Phase 5: User Story 3 - Understand Fatigue and Readiness (Priority: P2)

**Goal**: Provide deterministic fatigue views, retroactive recomputation lineage, and measurable adherence over/undertraining flags.

**Independent Test**: Submit sessions and check-ins, edit a historical check-in, then verify today/calendar/adherence outputs and recomputation audit lineage.

### Tests for User Story 3 ⚠️

- [ ] T057 [P] [US3] Add failing contract tests for check-ins, fatigue, calendar, and recalculation endpoints in `backend/tests/contract/test_fatigue_calendar_contract.py`
- [ ] T058 [P] [US3] Add failing contract tests for adherence analytics endpoint in `backend/tests/contract/test_adherence_contract.py`
- [ ] T059 [P] [US3] Add failing integration test for retroactive recomputation with immutable snapshot lineage in `backend/tests/integration/test_recompute_lineage.py`
- [ ] T060 [P] [US3] Add failing unit tests for fatigue math determinism and recruitment derivation in `backend/tests/unit/test_fatigue_engine.py`
- [ ] T061 [US3] Add failing frontend integration test for today/calendar/adherence dashboards in `frontend/tests/integration/fatigue-dashboard.test.tsx`

### Implementation for User Story 3

- [ ] T062 [P] [US3] Implement daily check-in, fatigue snapshot, and recalculation event models in `backend/src/models/fatigue.py`
- [ ] T063 [P] [US3] Implement calendar audit point and two-a-day warning signal models in `backend/src/models/calendar.py`
- [ ] T064 [P] [US3] Implement adherence training flag model with deterministic thresholds in `backend/src/models/adherence.py`
- [ ] T065 [US3] Create fatigue/adherence schema migration in `backend/migrations/versions/0004_fatigue_recompute_adherence.py`
- [ ] T066 [US3] Implement deterministic fatigue engine and model-policy read service in `backend/src/services/fatigue/engine.py`
- [ ] T067 [US3] Implement retroactive recomputation orchestrator and recalc audit service in `backend/src/services/fatigue/recompute_service.py`
- [ ] T068 [US3] Implement adherence analytics computation service in `backend/src/services/analytics/adherence_service.py`
- [ ] T069 [US3] Implement check-ins, fatigue, recalculation, and calendar routes in `backend/src/api/routes/fatigue.py`
- [ ] T070 [US3] Implement adherence analytics route in `backend/src/api/routes/analytics.py`
- [ ] T071 [US3] Implement frontend today fatigue gauges and explanation chips in `frontend/src/app/today/page.tsx`
- [ ] T072 [US3] Implement frontend weekly/monthly calendar audit charts in `frontend/src/app/calendar/page.tsx`
- [ ] T073 [US3] Implement frontend check-in editor with retroactive update flow in `frontend/src/features/checkins/CheckinEditor.tsx`
- [ ] T074 [US3] Implement frontend adherence metrics and over/undertraining flag UI in `frontend/src/features/analytics/AdherencePanel.tsx`

**Checkpoint**: User Stories 1-3 core behavior are functional; full sign-off depends on Phase 8 cross-cutting validation tasks.

---

## Phase 6: User Story 4 - Coach and Team Oversight (Priority: P3)

**Goal**: Enable coach/team collaboration controls and deterministic integration ingest/dedup workflows.

**Independent Test**: Coach edits athlete plan with comments under role constraints, team privacy is enforced, and duplicate import resolution is deterministic.

### Tests for User Story 4 ⚠️

- [ ] T075 [P] [US4] Add failing contract tests for integration import and dedup resolution endpoints in `backend/tests/contract/test_integrations_contract.py`
- [ ] T076 [P] [US4] Add failing integration test for role-based coach edit and privacy filtering in `backend/tests/integration/test_coach_team_permissions.py`
- [ ] T077 [P] [US4] Add failing integration test for deterministic import dedup hierarchy and ambiguous resolution in `backend/tests/integration/test_import_dedup_workflow.py`
- [ ] T078 [US4] Add failing frontend integration test for coach/team calendar privacy behavior in `frontend/tests/integration/team-privacy-calendar.test.tsx`

### Implementation for User Story 4

- [ ] T079 [P] [US4] Implement team membership, privacy policy, and coach comment models in `backend/src/models/team.py`
- [ ] T080 [P] [US4] Implement integration activity and dedup resolution models in `backend/src/models/integration_activity.py`
- [ ] T081 [US4] Create team/integration schema migration in `backend/migrations/versions/0005_team_integrations.py`
- [ ] T082 [US4] Implement role-based access and privacy filter service in `backend/src/services/team/privacy_service.py`
- [ ] T083 [US4] Implement integration ingest and dedup workflow service in `backend/src/services/integrations/import_service.py`
- [ ] T084 [US4] Implement integration import and dedup-resolution routes in `backend/src/api/routes/integrations.py`
- [ ] T085 [US4] Implement coach comments and athlete privacy-policy routes in `backend/src/api/routes/team.py`
- [ ] T086 [US4] Implement frontend coach athlete workspace and comments panel in `frontend/src/app/coach/athletes/[athleteId]/page.tsx`
- [ ] T087 [US4] Implement frontend team calendar privacy-aware view in `frontend/src/app/team/calendar/page.tsx`
- [ ] T088 [US4] Implement frontend import review and dedup resolution UI in `frontend/src/features/integrations/ImportResolutionPanel.tsx`

**Checkpoint**: All user stories are core-functional excluding coverage-remediation items explicitly tracked in Phase 7; final sign-off depends on Phase 8 cross-cutting validation gates.

---

## Phase 7: Coverage Remediation (Post-Analysis)

**Purpose**: Address identified consistency and coverage gaps while preserving story traceability.

- [ ] T089 [P] [US1] Add failing contract tests for exercise catalog list/create endpoints in `backend/tests/contract/test_exercise_catalog_contract.py`
- [ ] T090 [US1] Add failing frontend integration tests for planner success/loading/empty/error states in `frontend/tests/integration/planner-states.test.tsx`
- [ ] T091 [US1] Implement exercise catalog model with canonical/alias/user-scope fields in `backend/src/models/exercise_catalog.py`
- [ ] T092 [US1] Create exercise catalog schema migration in `backend/migrations/versions/0006_exercise_catalog.py`
- [ ] T093 [US1] Implement exercise catalog seed/dedupe/alias service in `backend/src/services/catalog/exercise_catalog_service.py`
- [ ] T094 [US1] Implement exercise catalog routes in `backend/src/api/routes/exercises.py`
- [ ] T095 [US1] Implement planner exercise selector UI in `frontend/src/features/planner/ExerciseSelector.tsx`
- [ ] T096 [US2] Add failing frontend integration tests for workout execution success/loading/empty/error states in `frontend/tests/integration/session-execution-states.test.tsx`
- [ ] T097 [US3] Add failing frontend integration tests for fatigue/calendar/adherence success/loading/empty/error states in `frontend/tests/integration/fatigue-states.test.tsx`
- [ ] T098 [P] [US4] Add failing contract tests for team calendar and coach comments endpoints in `backend/tests/contract/test_team_contract.py`
- [ ] T099 [P] [US4] Add failing contract tests for billing entitlements and compliance endpoints in `backend/tests/contract/test_billing_compliance_contract.py`
- [ ] T100 [P] [US4] Add failing contract tests for integration export endpoint in `backend/tests/contract/test_integration_exports_contract.py`
- [ ] T101 [US4] Add failing frontend integration tests for coach/team/compliance success/loading/empty/error states in `frontend/tests/integration/team-coach-states.test.tsx`
- [ ] T102 [US4] Add failing backend integration test for compliance export/delete workflows in `backend/tests/integration/test_compliance_workflows.py`
- [ ] T103 [US4] Add failing backend integration test for entitlement enforcement rules in `backend/tests/integration/test_entitlement_enforcement.py`
- [ ] T104 [US4] Implement subscription and coach entitlement models in `backend/src/models/subscription.py`
- [ ] T105 [US4] Implement compliance request and privacy-operation models in `backend/src/models/compliance.py`
- [ ] T106 [US4] Create billing and compliance schema migration in `backend/migrations/versions/0007_billing_compliance.py`
- [ ] T107 [US4] Implement entitlement service in `backend/src/services/billing/entitlement_service.py`
- [ ] T108 [US4] Implement compliance privacy/export/delete service in `backend/src/services/compliance/privacy_service.py`
- [ ] T109 [US4] Implement integration export service in `backend/src/services/integrations/export_service.py`
- [ ] T110 [US4] Implement team calendar route (`GET /v1/teams/{teamId}/calendar`) in `backend/src/api/routes/team_calendar.py`
- [ ] T111 [US4] Implement billing entitlement and compliance routes in `backend/src/api/routes/billing_compliance.py`
- [ ] T112 [US4] Implement frontend privacy/compliance settings page in `frontend/src/app/settings/privacy/page.tsx`
- [ ] T113 [US4] Implement frontend integration export panel in `frontend/src/features/integrations/ExportPanel.tsx`
- [ ] T114 [US4] Implement frontend coach/team loading-empty-error state handling in `frontend/src/app/team/calendar/page.tsx`
- [ ] T115 [US4] Implement frontend compliance action state handling in `frontend/src/app/settings/privacy/page.tsx`
- [ ] T116 [US1] Implement planner success/loading/empty/error state handling to satisfy `planner-states.test.tsx` in `frontend/src/app/planner/page.tsx`
- [ ] T117 [US2] Implement workout execution success/loading/empty/error state handling to satisfy `session-execution-states.test.tsx` in `frontend/src/app/workouts/[workoutId]/execute/page.tsx`
- [ ] T118 [US3] Implement fatigue/dashboard success/loading/empty/error state handling to satisfy `fatigue-states.test.tsx` in `frontend/src/app/today/page.tsx`
- [ ] T119 [P] [US3] Add failing contract tests proving direct fatigue-output writes are rejected by fatigue endpoints in `backend/tests/contract/test_fatigue_read_only_contract.py`
- [ ] T120 [US3] Add failing integration test verifying fatigue outputs are read-only for athlete/coach API clients in `backend/tests/integration/test_fatigue_read_only_permissions.py`
- [ ] T121 [P] [US3] Add failing unit tests for deterministic classification signal priority (HR > power > pace) in `backend/tests/unit/test_classification_priority.py`
- [ ] T122 [US3] Add failing contract test for deterministic classification output with multi-signal endurance inputs in `backend/tests/contract/test_classification_priority_contract.py`
- [ ] T123 [P] [US3] Add failing contract tests for strength/endurance analytics metric payloads and 7-day/30-day windows in `backend/tests/contract/test_strength_endurance_analytics_contract.py`
- [ ] T124 [US3] Add failing frontend integration test for strength/endurance decision-support analytics views in `frontend/tests/integration/performance-metrics-dashboard.test.tsx`
- [ ] T125 [US3] Implement backend strength/endurance analytics aggregation service in `backend/src/services/analytics/performance_metrics_service.py`
- [ ] T126 [US3] Implement frontend strength/endurance analytics panel in `frontend/src/features/analytics/PerformanceMetricsPanel.tsx`
- [ ] T133 Add explicit constitution compliance check (quality gates, failing-first TDD evidence, testing matrix, UX states, and performance budgets) in `specs/001-define-sportolo-v1/checklists/constitution-compliance.md`
- [ ] T134 [P] [US4] Add failing contract tests for medical disclaimer read/acknowledgment endpoints in `backend/tests/contract/test_medical_disclaimer_contract.py`
- [ ] T135 [US4] Add failing frontend integration test for required medical disclaimer acknowledgment flow in `frontend/tests/integration/medical-disclaimer-flow.test.tsx`
- [ ] T136 [US4] Implement medical disclaimer acknowledgment service and API endpoints in `backend/src/api/routes/billing_compliance.py`
- [ ] T137 [US4] Implement frontend medical disclaimer acknowledgment flow in `frontend/src/app/settings/privacy/page.tsx`
- [ ] T138 [P] [US4] Add failing contract tests for template sharing and edit-history visibility endpoints in `backend/tests/contract/test_template_sharing_history_contract.py`
- [ ] T139 [US4] Implement template-sharing ACL and edit-history service in `backend/src/services/team/template_sharing_history_service.py`
- [ ] T140 [US4] Implement template sharing and edit-history routes in `backend/src/api/routes/team.py`
- [ ] T141 [US4] Implement frontend template sharing and edit-history panels in `frontend/src/features/team/TemplateSharingPanel.tsx`
- [ ] T142 [P] Add release performance sign-off checklist artifact (approver, failed threshold, mitigation, decision date) in `specs/001-define-sportolo-v1/checklists/performance-signoff.md`
- [ ] T143 Add release-gate verification test that blocks PRF threshold failures without documented product sign-off in `backend/tests/integration/test_performance_release_gate.py`
- [ ] T144 [P] Add manual WCAG 2.2 AA validation checklist (keyboard navigation, focus visibility, labels/status, screen-reader smoke) in `specs/001-define-sportolo-v1/checklists/accessibility-manual.md`
- [ ] T145 [P] [US4] Add failing contract tests that reject integration-origin plan mutation attempts in `backend/tests/contract/test_integration_plan_write_protection_contract.py`
- [ ] T146 [US4] Add failing integration test verifying import/export cannot overwrite Sportolo-owned planned workouts in `backend/tests/integration/test_plan_ownership_protection.py`

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final hardening and explicit closure of parity, provider-coverage, UX-consistency, and performance-budget validation.
Validation-only phase: no new product behavior is introduced; any defects found here require follow-up failing-first fix tasks.

- [ ] T147 [P] Add end-to-end requirement traceability matrix in `specs/001-define-sportolo-v1/checklists/traceability.md`
- [ ] T148 [P] Add backend performance benchmark suite for p95 targets in `backend/tests/integration/test_performance_thresholds.py`
- [ ] T149 [P] Add frontend responsiveness and accessibility checks in `frontend/tests/integration/test_accessibility_responsive.test.tsx`
- [ ] T150 Enforce deterministic no-randomness assertions across fatigue/progression paths in `backend/tests/unit/test_no_randomness.py`
- [ ] T151 Update OpenAPI contract for any route/schema deltas from implementation in `specs/001-define-sportolo-v1/contracts/openapi.yaml`
- [ ] T152 Update quickstart verification steps and command matrix in `specs/001-define-sportolo-v1/quickstart.md`
- [ ] T153 Run and document full quality gate execution (`make all`) in `specs/001-define-sportolo-v1/checklists/requirements.md`
- [ ] T154 [P] Add canonical DSL parity fixture corpus (20 strength + 20 endurance templates) in `backend/tests/fixtures/dsl_parity/`
- [ ] T155 Add and execute FR-033 parity conformance regression suite (>=95% compile success, normalized `determinism_hash` equivalence, semantic parity assertions) in `backend/tests/integration/test_dsl_parity_matrix.py`
- [ ] T156 [P] Add and execute provider-matrix contract conformance suite for Strava/Garmin/Wahoo and FIT/TCX import-export coverage in `backend/tests/contract/test_integrations_provider_matrix_contract.py`
- [ ] T157 Add and execute provider-adapter integration conformance suite for deterministic dedup/export flows in `backend/tests/integration/test_provider_adapter_matrix.py`
- [ ] T158 Add and execute FR-010 high-risk warning trigger regression suite (24h fatigue+hard, <8h hard-hard, 3-day hard streak) in `backend/tests/unit/test_high_risk_warning_rules.py`
- [ ] T159 Add sync performance benchmark test enforcing PRF-004 network profile (<=150ms RTT, >=5 Mbps down, >=1 Mbps up, <=2% loss) in `backend/tests/integration/test_sync_performance_profile.py`
- [ ] T160 Add and execute frontend UX consistency regression suite for advisory-only warnings, completed-vs-planned visual semantics, and plain-language fatigue explanations in `frontend/tests/integration/ux-consistency.test.tsx`
- [ ] T164 [P] Add mandatory browser verification checklist for changed UI surfaces in `specs/001-define-sportolo-v1/checklists/ui-browser-verification.md`
- [ ] T165 Enforce release gate requiring `npm run build` and browser verification evidence in `specs/001-define-sportolo-v1/quickstart.md`
- [ ] T166 [P] Add Aceternity route-to-component mapping artifact and wrapper usage notes in `frontend/src/components/ui/aceternity/README.md`
- [ ] T167 [US1] Integrate required mapped Aceternity components for planner route in `frontend/src/app/planner/page.tsx`
- [ ] T168 [US2] Integrate required mapped Aceternity components for workout execution route in `frontend/src/app/workouts/[workoutId]/execute/page.tsx`
- [ ] T169 [US3] Integrate required mapped Aceternity components for today/calendar routes in `frontend/src/app/today/page.tsx`
- [ ] T170 Enforce checklist/release gate requiring Aceternity component evidence (or documented fallback exception) in `specs/001-define-sportolo-v1/checklists/ui-browser-verification.md`
- [ ] T171 [P] Configure shadcn registry alias and reproducible token-based install prerequisites for `@ss-themes/midnight-bloom` in `frontend/components.json`
- [ ] T172 Apply `@ss-themes/midnight-bloom` tokens/theme variables across frontend global styling in `frontend/src/app/globals.css`
- [ ] T173 Add release verification step for authenticated `midnight-bloom` theme install and browser evidence in `specs/001-define-sportolo-v1/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies.
- **Phase 2 (Foundational)**: Depends on Phase 1; blocks all user stories.
- **Phase 3 (US1)**: Depends on Phase 2.
- **Phase 4 (US2)**: Depends on Phase 2; can run in parallel with US1 after foundational completion, but reuses planning/workout primitives from US1.
- **Phase 5 (US3)**: Depends on Phase 2 and session/fatigue input availability from US2.
- **Phase 6 (US4)**: Depends on Phase 2; can proceed after US1 for plan-edit surfaces and after US2 for ingest/session linking.
- **Phase 7 (Coverage Remediation)**: Depends on completion of Phases 3-6.
- **Phase 8 (Polish)**: Depends on completion of target user stories and Phase 7.

### User Story Dependency Graph

- **US1 (P1)**: Core planning/versioning + DSL/IR baseline.
- **US2 (P1)**: Session execution/sync; depends on workout/version entities from US1.
- **US3 (P2)**: Fatigue/readiness; depends on session/check-in flows from US2.
- **US4 (P3)**: Coach/team/integrations; depends on planning/session foundations from US1/US2.

---

## Parallel Execution Examples

### User Story 1

```bash
# Parallel test creation
Task: T018 backend/tests/contract/test_profiles_macrocycles_contract.py
Task: T019 backend/tests/contract/test_dsl_snapshot_prescription_contract.py

# Parallel model implementation
Task: T023 backend/src/models/athlete_profile.py
Task: T024 backend/src/models/planning.py
Task: T026 backend/src/models/dsl_ir.py
```

### User Story 2

```bash
# Parallel model work
Task: T044 backend/src/models/session.py
Task: T045 backend/src/models/progression_failure.py
Task: T046 backend/src/models/sync_conflict.py

# Parallel frontend work after API routes exist
Task: T053 frontend/src/app/workouts/[workoutId]/execute/page.tsx
Task: T055 frontend/src/features/sync/ConflictResolutionModal.tsx
```

### User Story 3

```bash
# Parallel backend models
Task: T062 backend/src/models/fatigue.py
Task: T063 backend/src/models/calendar.py
Task: T064 backend/src/models/adherence.py

# Parallel UI surfaces
Task: T071 frontend/src/app/today/page.tsx
Task: T072 frontend/src/app/calendar/page.tsx
Task: T074 frontend/src/features/analytics/AdherencePanel.tsx
```

### User Story 4

```bash
# Parallel backend model work
Task: T079 backend/src/models/team.py
Task: T080 backend/src/models/integration_activity.py

# Parallel frontend role/integration surfaces
Task: T086 frontend/src/app/coach/athletes/[athleteId]/page.tsx
Task: T088 frontend/src/features/integrations/ImportResolutionPanel.tsx
```

---

## Implementation Strategy

### MVP First (Recommended)

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3 (US1) only.
3. Validate US1 independently using T018-T022.
4. Demo/deploy MVP planning slice before expanding scope.

### Incremental Delivery

1. Deliver US1 (planning/versioning + DSL/IR).
2. Deliver US2 (session execution + deterministic sync).
3. Deliver US3 (fatigue/readiness + recomputation/adherence).
4. Deliver US4 (coach/team + integration dedup workflows).
5. Run Phase 8 polish gates before release.

### Parallel Team Strategy

1. Team completes Setup + Foundational together.
2. After Phase 2:
   - Engineer A: US1 backend + contract tests.
   - Engineer B: US2 session/sync implementation.
   - Engineer C: frontend US1/US3 screens.
   - Engineer D: US4 team/integration workflows.
3. Integrate by story checkpoints, not by layer.

---

## Notes

- `[P]` tasks are parallelizable when dependencies are satisfied.
- All user-story tasks include `[US#]` labels for traceability.
- Every task includes explicit file paths.
- Verification tasks are defined per story and should fail before implementation begins.
- Aceternity route mapping is a release requirement; T166-T170 must be completed or explicitly exception-documented before sign-off.
- Midnight Bloom theme reproducibility is a release requirement; T171-T173 must be completed before sign-off.
