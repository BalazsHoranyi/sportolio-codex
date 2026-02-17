Below is a complete spec.md for sportoló v1, incorporating all constraints and decisions from this conversation.

⸻

sportoló — Product & System Specification (v1)

1. Overview

sportoló is a hybrid training planning and tracking platform for athletes combining strength and endurance.

It is built around a 4-axis fatigue model that provides structured, explainable, and physiology-grounded decision support for programming.

Primary Value Proposition

“This helps me put together a great training plan. I feel confident executing this.”

Target Personas (v1)
	1.	Powerlifter adding endurance
	2.	Runner adding strength
	3.	Tactical athlete who needs to balance strength and endurance. 

(Not targeting Hyrox.)

Product Philosophy
	•	Planner-first (not auto-generator in v1)
	•	Soft warnings only (never hard constraints)
	•	Deterministic fatigue engine
	•	Users can override workouts, not fatigue scores
	•	Sportoló owns the plan (external systems ingest only)

⸻

3. Core Domain Model

3.1 Hierarchy

User
→ Athlete Profile
→ Macrocycle
→ Mesocycle
→ Microcycle (Workouts)
→ Sessions (Completed instances)

Two-a-days:
	•	Represented as separate workouts
	•	Time-of-day + time-between metadata stored

⸻

4. Athlete Profile

4.1 Baselines

Strength:
	•	Training Max
	•	1RM estimation
	•	RPE / RIR inputs

Endurance:
	•	FTP / CP
	•	HR Zones
	•	Pace Zones
	•	Power zones
	•	CSS (future)

4.2 Preferences
	•	Metric / Imperial
	•	Pace vs Power vs HR priority
	•	Equipment access
	•	Injury / constraints

4.3 System Capacity Inputs

Daily check-in:
	•	Sleep
	•	Fuel
	•	Stress

Defaults:
	•	“Normal sleep” assumed if not provided

Users can edit check-ins.
Users cannot edit fatigue outputs.

⸻

5. Planning System

5.1 Macrocycle

Defined by:
	•	Primary goal
	•	Target date
	•	Priority (strength-first, endurance-first, balanced)

Contains:
	•	Mesocycles
	•	Timeline anchor

⸻

5.2 Mesocycle Template

A mesocycle template contains:
	•	Modality focus (hypertrophy / strength / endurance / mixed)
	•	Periodization type:
	•	Block
	•	DUP
	•	Linear
	•	Progression rules (DSL-defined)
	•	Deload rules
	•	Test week rules
	•	Intended weekly structure philosophy
	•	4-axis interference warning hooks

⸻

5.3 Microcycle

Individual workouts.

Supports:
	•	Mixed modality within a workout (e.g., squats + sprints)
	•	Two-a-days (separate workouts)
	•	Time-between tracking

Rules:
	•	Cannot move completed workouts
	•	Planned stays planned when moved
	•	Moving workouts updates weekly audit
	•	Soft warnings only

⸻

6. DSL + Unified Representation

6.1 Human-Friendly DSL

Users define workouts via DSL or UI builder.

Strength supports:
	•	Autoregulated top set + backoffs
	•	Percentage-based waves
	•	Rep PR / AMRAP triggers

Endurance supports:
	•	Interval blocks
	•	Drag-to-adjust power/pace/HR
	•	Timeline editing

6.2 Unified Intermediate Representation (IR)

All UI and DSL definitions compile to canonical IR.

IR requirements:
	•	Deterministic execution
	•	Modality-agnostic
	•	Supports mixed modality sessions
	•	Versioned

LLM assists in:
	•	Translating UI ↔ DSL
	•	Validating structure
	•	Explaining fatigue outcomes

Users may override workout structure.
Users may not override fatigue scoring.

⸻

7. 4-Axis Fatigue Model

7.1 Axes
	1.	Recruitment (derived)
	2.	Metabolic
	3.	Mechanical
	4.	Neural

Scale: 1.0–10.0 (log scale)

Red threshold: ≥7.0

⸻

7.2 Axis Behavior

Neural:
	•	Stepwise decay
	•	Sleep-triggered reduction
	•	Low-neural days accelerate recovery
	•	Global only

Metabolic:
	•	Fast exponential decay (24–48h typical)

Mechanical:
	•	Slow accumulation
	•	Long tail decay
	•	Regional

Recruitment:
	•	Derived metric
	•	max(neural, mechanical)
	•	Expressed as availability score

⸻

7.3 Combined Fatigue Score

Purpose:

Probability next hard session degrades adaptation.

Calculation:
	1.	Weighted sum:
	•	Metabolic: 0.45
	•	Mechanical: 0.35
	•	Recruitment: 0.20
	2.	Neural gating
	3.	System capacity gating

Workout-type multipliers applied before normalization.

Combined score is secondary.
Axes remain primary.

⸻

8. Session Classification

Strength:
	•	Based on load, RPE/RIR, intent
	•	Heavy = high neural + peak mechanical
	•	Hypertrophy = glycolytic + moderate mechanical

Endurance:
	•	VT1 = low neural, cumulative mechanical
	•	Threshold = high metabolic
	•	VO2 = metabolic + neural
	•	Estimated via HR > power > pace (priority order)

Mixed workouts:
	•	Classified per segment
	•	Aggregated deterministically

Users may override classification inputs.

⸻

9. Today Page

Displays:
	•	Neural gauge
	•	Metabolic gauge
	•	Mechanical gauge
	•	Recruitment badge
	•	Combined fatigue score
	•	System capacity indicator

Rules:
	•	Shows accumulated fatigue (completed only)
	•	Only after midnight rollover
	•	Red/yellow/green thresholds
	•	“Why this?” chips showing top contributing sessions

⸻

10. Calendar

10.1 Weekly Audit
	•	7-day axis series
	•	Completed = solid line
	•	Planned = dashed line
	•	Recruitment overlay band
	•	Red threshold zone
	•	Updates when workouts moved (planned only)

10.2 Month View
	•	30-day series
	•	Same styling rules

⸻

11. Workout Execution (Mobile)

Strength:
	•	≤ 2 taps per set
	•	Autoregulated support
	•	Mid-session edits allowed

Endurance:
	•	Interval execution
	•	Skip/extend intervals
	•	Autopause handling
	•	Sensor dropout handling
	•	Wahoo ERG control

Offline-first:
	•	Full logging offline
	•	Deterministic sync resolution

Nothing “breaks” if user modifies session mid-workout.

⸻

12. Integrations

Required v1:
	•	Strava
	•	Garmin
	•	Wahoo
	•	FIT/TCX import/export

Sportoló owns the plan.
External systems do not edit plan.

⸻

13. Analytics

13.1 Strength
	•	Volume trends
	•	PR tracking
	•	e1RM
	•	Block comparisons

13.2 Endurance
	•	Intensity distribution audit
	•	Zone distribution
	•	Performance trendlines
	•	Adaptation vs fatigue correlation

13.3 Adherence
	•	Planned vs completed
	•	Over/undertraining signals
	•	30-day success metric:
Adherence without over or undertraining

Metrics must support decisions.
No vanity charts.

⸻

14. Coaching & Teams

Roles:
	•	Athlete
	•	Coach
	•	Team Admin

Coach:
	•	View/edit plans
	•	Comment
	•	Shared templates
	•	Unlimited athletes (subscription model)

Team:
	•	Shared calendars
	•	Privacy controls per athlete
	•	Edit history audit log

⸻

15. Exercise Catalog

Seed:
	•	Pull from exercemus repo

Requirements:
	•	Deduping
	•	Canonical IDs
	•	Alias support
	•	Region tagging
	•	Placeholder media (v1)
	•	User-created exercises allowed
	•	User exercises do not pollute global catalog

⸻

16. Monetization
	•	Subscription-based
	•	Coaches unlimited athletes
	•	Feature gates possible (future):
	•	Integrations
	•	Analytics depth
	•	Team tools

⸻

17. Compliance & Safety
	•	Medical disclaimer
	•	Data export/delete
	•	Privacy compliance
	•	Soft warnings for high-risk stacking
	•	No hard constraints

⸻

18. Determinism & Guardrails
	•	No fatigue score editing
	•	No muscle-level weekly planning
	•	Combined score never primary
	•	All fatigue outputs explainable
	•	Tests deterministic (no external network calls)

⸻

19. Definition of Success (30 Days)

User:
	•	Adheres to plan
	•	Avoids chronic overload
	•	Experiences confidence in execution
	•	Finds logging frictionless

Primary churn risk:
	•	Logging too hard
	•	Metrics not useful

Therefore:
Workout tracking UX is critical.

⸻

20. Non-Goals (v1)
	•	Auto plan generation
	•	AI coaching recommendations
	•	Injury prediction
	•	Hyrox-specific optimization
	•	Real-time readiness coaching

⸻

End of Specification (v1)

⸻

If you want next:

I can now generate:
	•	Epics breakdown
	•	Fully written user stories with acceptance criteria
	•	Database schema outline
	•	DSL grammar draft
	•	API route specification
	•	First milestone roadmap