I want to build a fitness app focused on planning and tracking for strength and endurance. 
The app name is sportoló

It is focused around a "4-axis fatigue model"

It should support the following functionality
- the ability to create macro/meso/micro cycles 
  - macro cycles should be base off of goals our competition dates. 
    - i.e deadlift 600lb, marathon on July 12th. 
  - meso cycles should be based on building specific modalities. 
    - hyptertrophy, strength, speed, endurnace etc...
    - this is based off standard block periodization techniques. 
    - we should also support DUP, linear periodization etc...
  - micro cycles will be based off individual workouts within that cycle. 
    - building out routines is a key feature of this app. 
      - strength routines. 
        - this will work similarly to hevy and liftosaur. we should support search, drag and drop builders and a DSL that allows for creating complex progressions
      - endurance routines. 
        - this will work similarly to intervals.icu and trainingpeaks. 
        - we should support both drag and drop "trainerroad" style timelines where users can drag up to increase/decrease watts (or other metrics). drag horizontally to increase/decrease
          - intervals.icu has a good example of this. https://forum.intervals.icu/t/workout-builder/1163
      - the dsl should support both strength and endurance modalities across all stages of macro/meso/micro cycle
- the ability to create individual strength and endurance workouts. 
  - strength. 
    - full feature parity with liftosaur https://www.liftosaur.com/blog/docs/ combined with Hevy
      - this includes DSL and UI features from both
      - DSL should update automatically when UI changes and vice-versa
      - we should have an extensive catalog of strength exercises. (at least 1000)
        - should support intuitive fuzzy search
      - this is a big feature, so go through docs and take your time. It is important to have full parity
    - endurance
      - full feature parity with trainingpeaks and intervals.icu. 
      - DSL should work here as well, similar to https://forum.intervals.icu/t/workout-builder/1163
      - we should have drag and drop style interval creation. 
      - endurance modalities should cover, running, swimming, biking, rowing, and xc-skiing
      - This is a big feature, so go through docs and take your time. It is important to have full parity
- the ability to track progression over time. 
  - Graphs and analytics for strength
    - such as volume lifted, previous bests, estimated 1rm. look to competitors for example graphs
  - Graphs and analytics for strength.
    - full feature parity with intervals.icu and trainingpeaks. 
- The ability to track a workout. 
  - this will be mobile only, but we will provide standard gym strength workout tracking as seen in hevy and liftosaur. 
  - same for endurance, we should be able to send events to wahoo and control a wahoo trainer for ERG style workouts. 
- Minimal UI components needed. 
  - dashboard homepage showing metrics for fatigue and planned workouts
  - calendar with ability to add remove/move workouts and show metrics per week/month (similar to trainingpeaks)
  - macro/meso/micro cycle creation flow. 
  - routine creation flow for strength and endurance. 
  - login

I want you to interview me and ask deep questions to make this app great. 
the endgoal is to create user stories and tasks in the linear project sportolo so that we can build this app end to end. 
the api/backend will be built with fastapi/postgres/redis
the UI for web will be built with next.js/react/tailwind. It will utilize shadcn components wherever possible. 
Avoid creating custom components if possible. I.e for calendar page we could use fullcalendar

4-axis fatigue model:
Axes (recap)
	1.	Recruitment – low-threshold ↔ high-threshold motor units
	2.	Metabolic – oxidative ↔ glycolytic ↔ alactic
	3.	Mechanical – cumulative load ↔ peak force ↔ eccentric bias
	4.	Neural – low skill ↔ high skill / high precision

Every session sits somewhere on all four axes.
Hybrid programming is deciding which axes you can overlap and which must be protected.

⸻

1. Recruitment Axis → Strength vs Endurance Interference

Key rule

High-threshold recruitment is fragile. Low-threshold recruitment is tolerant.

Practical mapping

Session Type	Recruitment Load	Hybrid Trade-Off
VT1 / easy aerobic	Low	Can be stacked almost anywhere
Threshold intervals	Mixed	Interferes with strength if frequent
Hypertrophy (1–3 RIR)	Mixed → high	Competes with strength & speed
Max strength / sprint	High	Must be protected

Programming implication
	•	Protect high-threshold days
	•	Heavy lifting
	•	Sprints
	•	Olympic lifts
	•	Place low-threshold work before or after them freely
	•	Avoid pairing mixed-recruitment sessions back-to-back

Example
	•	❌ Threshold run → heavy squats → next day sprints
	•	✅ Heavy squats → easy aerobic → threshold run next day

⸻

2. Metabolic Axis → Fatigue Accumulation & Session Density

Key rule

Glycolytic stress limits weekly density; oxidative stress limits time.

Practical mapping

Metabolic Stress	Recovery Limiter	Programming Trade-Off
Oxidative (VT1)	Time, hydration	High frequency OK
Threshold	Glycogen + CNS	Limits session count
VO₂ / glycolytic	CNS + substrate	Very limited weekly
Alactic	Neural	Needs freshness, not fuel

Programming implication
	•	Hybrid athletes cannot afford many glycolytic days
	•	Threshold is the “currency” of endurance progress
	•	Alactic work (sprints, jumps) is cheap metabolically but neural-expensive

Example
	•	3–4 threshold sessions/week works only if:
	•	Strength is submaximal
	•	VT1 volume is dominant
	•	Otherwise cap threshold at 1–2 sessions/week

⸻

3. Mechanical Axis → Orthopedic Risk & Load Management

Key rule

Mechanical stress accumulates silently and crashes late.

Practical mapping

Mechanical Stress	Typical Source	Trade-Off
Cumulative load	Running volume, rucking	Limits long-term durability
Peak force	Heavy lifting, sprint starts	Needs spacing
Eccentric bias	Downhills, negatives	Delayed interference

Programming implication
	•	You can overlap metabolic stress if mechanical stress is low
	•	You cannot overlap eccentric or peak force stress repeatedly

Example
	•	Easy cycling after squats = fine
	•	Downhill running after squats = hidden landmine
	•	Heavy deadlifts + sprint starts = peak-force stacking → high injury risk

⸻

4. Neural Axis → Session Order & Keystone Days

Key rule

Neural stress decays within the session, not the week.

Practical mapping

Neural Demand	Examples	Hybrid Rule
High	Sprints, heavy lifts, technical lifts	First or only
Moderate	Threshold, tempo	After neural work or on fresh days
Low	VT1, accessories	Anywhere

Programming implication
	•	Keystone sessions = high neural + high recruitment
	•	They dictate day order, not just week totals

Example
	•	Day structure:
	1.	Sprints / heavy lifts
	2.	Threshold intervals
	3.	Easy aerobic / accessories

Not:
	•	Threshold → sprints → lifting

⸻

Putting It Together: Trade-Off Matrix

Common Hybrid Conflicts (and resolutions)

Conflict	Axis Clash	Resolution
Strength stagnates	Recruitment + neural	Reduce mixed-recruitment volume
Endurance stalls	Metabolic	Add threshold, cut junk volume
Chronic soreness	Mechanical	Reduce eccentric bias
“Always tired”	Glycolytic + neural	Consolidate hard days


⸻

Session Tagging (practical tool)

Tag every session quickly:

Example: Threshold Run
	•	Recruitment: Mixed
	•	Metabolic: Glycolytic-oxidative
	•	Mechanical: Cumulative
	•	Neural: Moderate

Example: Heavy Squat Day
	•	Recruitment: High
	•	Metabolic: Low
	•	Mechanical: Peak force
	•	Neural: High

Now ask:

“Which axes overlap, and which need recovery before the next session?”

That question is hybrid programming.

⸻

Weekly Layout Example (Clean Hybrid Week)

Mon – High neural / high recruitment
	•	Heavy lift + sprints
	•	Optional short VT1 after

Tue – Metabolic quality
	•	Threshold intervals
	•	Light accessories

Wed – Low everything
	•	Long VT1

Thu – High neural again
	•	Strength + jumps

Fri – Off or VT1

Sat – Secondary metabolic
	•	Threshold or tempo (lower volume)

Sun – Long VT1

This works because:
	•	High-threshold work is protected
	•	Glycolytic work is consolidated
	•	Mechanical stress is distributed
	•	Neural demand is respected

⸻

Final Takeaway

LIHC/HILC asked:

“How hard and how long?”

The 4-axis model asks:

“Which systems am I taxing, and what does that steal from tomorrow?”

That question is what makes hybrid programming predictable instead of reactive.

## how to incorporate. 
every workout should show what it is taxing
needs to be shown in a constrained, hierarchical way.
If you do it naïvely (“each muscle gets its own full model”), it collapses into false precision and bookkeeping noise.
If you do it correctly, it becomes one of the most powerful tools for hybrid planning and interference control.

Below is the clean, physiology-honest way to do it.

⸻

The Short Answer

You can apply the 4 axes locally per muscle group, but:
	•	Recruitment, mechanical, and local metabolic stress can be muscle-specific
	•	Neural and systemic metabolic stress cannot be fully localized
	•	Therefore, the model must be layered, not duplicated

Think in global → regional → local terms.

⸻

The Correct Hierarchy (Critical)

Level 1 — Global Axes (Always Apply)

These are whole-organism constraints:
	•	Neural axis (CNS fatigue, coordination, intent)
	•	Systemic metabolic axis (glycogen, catecholamines, endocrine stress)

You cannot assign these cleanly per muscle.

Example:
Heavy squats fatigue your nervous system even if your arms “did nothing.”

⸻

Level 2 — Regional Axes (Primary Hybrid Tool)

This is where per-muscle modeling actually works.

Typical regions:
	•	Lower body (knee-dominant)
	•	Lower body (hip-dominant)
	•	Upper push
	•	Upper pull
	•	Trunk

At this level, all four axes are usable.

⸻

Level 3 — Local / Muscle-Specific Axes (Restricted Use)

At the single-muscle level:

Axis	Can be Localized?	Notes
Recruitment	⚠️ Partially	Via task demand, not intent
Metabolic	✅ Yes	Local glycogen, ischemia
Mechanical	✅ Yes	Tendon & fiber stress
Neural	❌ No	Always global

This level is best used for problem-solving, not weekly planning.

⸻

How Each Axis Behaves Per Muscle

1. Recruitment Axis (Per Muscle = Conditional)

You can model which muscles are pushed into high-threshold recruitment, but not fiber types directly.

What works
	•	Prime mover vs stabilizer distinction
	•	Load, leverage, velocity

Example
	•	Cycling threshold:
	•	Quads: mixed → high recruitment
	•	Glutes: moderate
	•	Hamstrings: low
	•	Sprinting:
	•	Glutes + hamstrings: high
	•	Quads: high
	•	Calves: high

This is functionally accurate, even without fiber typing.

⸻

2. Metabolic Axis (Strongly Local)

This is the cleanest per-muscle axis.

You can meaningfully track:
	•	Local glycogen depletion
	•	Local occlusion / ischemia
	•	Repeated metabolite exposure

Examples
	•	Running:
	•	Calves: high oxidative + cumulative
	•	Quads: moderate
	•	Rowing:
	•	Lats: high oxidative + glycolytic
	•	Arms: moderate
	•	High-rep squats:
	•	Quads: high glycolytic
	•	Posterior chain: moderate

This explains why:
	•	“Cardio” can crush legs but not lungs
	•	Arms fail before heart rate in rowing

⸻

3. Mechanical Axis (Best Local Axis)

Mechanical stress is inherently local.

You can assign per muscle:
	•	Peak force
	•	Eccentric bias
	•	Repetition-driven microtrauma

Examples
	•	Downhill running → quads (eccentric dominant)
	•	Nordic curls → hamstrings (extreme eccentric)
	•	Jumping → Achilles + calves (peak force + elastic)

This is the axis that predicts injury and soreness, not performance.

⸻

4. Neural Axis (Global Only)

This is where people break the model.
	•	Motor unit firing lives in the CNS
	•	Coordination, intent, and precision are systemic
	•	You cannot have a “fresh nervous system for quads but not glutes”

You can say:
	•	“This task is quad-dominant”
But not:
	•	“Only the quads are neurally fatigued”

⸻

The Correct Per-Muscle Mapping Template

Instead of copying the whole model, use this:

Step 1 — Global Session Tag

(Once per session)
	•	Global neural: low / moderate / high
	•	Global metabolic: low / moderate / high

⸻

Step 2 — Regional Muscle Mapping

(2–5 regions only)

For each region:
	•	Recruitment: low / mixed / high
	•	Local metabolic: oxidative / glycolytic
	•	Mechanical: cumulative / peak / eccentric

⸻

Example: Threshold Run

Global
	•	Neural: moderate
	•	Metabolic: moderate–high

Regional
	•	Quads: mixed recruitment | glycolytic-oxidative | cumulative
	•	Calves: low recruitment | oxidative | cumulative
	•	Hamstrings: low–moderate | oxidative | low mechanical
	•	Upper body: negligible

⸻

Example: Heavy Squats

Global
	•	Neural: high
	•	Metabolic: low–moderate

Regional
	•	Quads: high recruitment | glycolytic | peak + eccentric
	•	Glutes: high recruitment | glycolytic | peak
	•	Adductors: moderate | glycolytic | high strain
	•	Spine: high mechanical, low metabolic

⸻

Why This Matters for Hybrid Trade-Offs

This explains things that simple models miss:

Why legs feel dead but strength is fine

→ Local metabolic + mechanical fatigue, global neural intact

Why sprinting feels awful after tempo

→ Same muscles, mixed recruitment + neural overlap

Why upper-body strength survives high run volume

→ No regional overlap, only global metabolic cost

⸻

Hard Rule (Do Not Violate)

Never plan at single-muscle resolution across a full week.

Use per-muscle modeling only to:
	•	Diagnose interference
	•	Explain soreness or regression
	•	Adjust exercise selection

Weekly structure must stay regional + global.


## UI. 
on the today page I want metrics showing these fatigue points. 
On the calendar page I want the weekly audit to show these fatigue points over time in a clean easy to understand graph. 
When a user moves a workout it should update the weekly audit. 
the today page should show only accumulated (previously done) fatigue points

---

# Spec: 4-Axis Stress Model -> Hybrid Trade-Offs (v1)

## Goals
- Replace LIHC/HILC with 4-axis model in product + data.
- Expose axis-specific fatigue (1.0-10.0) and a combined fatigue score.
- Today page shows accumulated fatigue (completed sessions only, rolled to next day).
- Calendar weekly audit shows axis-specific time series with planned vs completed styling.
- Month view shows 30-day span.
- Any move on calendar updates weekly audit (planned series only).
- Provide explainability for every data point (tooltips + "why this" chips).

## Non-goals (v1)
- Muscle-level planning across a week.
- User-editable axis weights or scores.
- Real-time readiness coaching.
- External network calls in tests.

## Model hierarchy (UI + logic)
Level 0: System capacity (sleep, fuel, stress) -> separate indicator + gate for combined score.
Level 1: Global neural fatigue (CNS, intent, precision).
Level 2: Global metabolic fatigue (glycogen, hormones).
Level 3: Regional fatigue (planning layer; 5 canonical regions).
Level 4: Muscle group fatigue (diagnostic only).
Level 5: Tissue failure (injury management).

Canonical regions (fixed v1):
1) Lower - Knee-dominant (quads, patellar tendon)
2) Lower - Hip-dominant (glutes, hamstrings, adductors)
3) Upper - Push (pecs, delts, triceps)
4) Upper - Pull (lats, upper back, biceps)
5) Trunk / Axial (spine, deep core, bracing)

## Core definitions
- Axis score scale: 1.0 to 10.0 (0.1 increments), log-scaled. 10 means "dead" and should be unreachable in normal training.
- Rolling window: scores accumulate via decay over 30 days; charts show 7 days (weekly) or 30 days (month view).
- Time boundary: user local midnight.
- "Red" threshold: >= 7.0 for each axis and combined score; means no gains, high risk.
- Planned vs completed: completed = solid line; planned = dashed line.
- Today page shows only accumulated (completed) fatigue and only after day rollover.

## Data sources
- System capacity:
  - Manual input or wearable sync.
  - Missing sleep defaults to "normal sleep" until overridden in daily check-in.
- Workout classification:
  - Strength via exercise type + set/rep/load data.
  - Endurance via existing zones (VT1/threshold/VO2, etc).
  - If zones missing, estimate using HR (preferred) else power/pace.
  - No direct internet calls in tests.

## Axis scoring (per session -> per day -> rolling series)
### Session tagging (v1 minimal)
- Global: neural, metabolic.
- Regional: recruitment, local metabolic, mechanical (per region).
- Recruitment is derived (see below), not an independent input axis.

### Session axis contributions
- Use exercise type and duration to compute per-axis spike magnitudes.
- Strength logic:
  - Heavy low-rep work -> neural heavy, recruitment high, mechanical peak.
  - Hypertrophy -> metabolic heavy, mechanical moderate.
  - Plyometrics/sprints -> neural heavy, mechanical peak.
- Endurance logic:
  - VT1 -> metabolic low, mechanical cumulative, neural low.
  - Threshold -> metabolic high, mechanical moderate, neural moderate.
  - VO2 -> metabolic high, neural moderate-high.
- Session contributions are mapped to 1-10 log scale per axis.

### Axis decay behaviors (shape + triggers)
- Neural: stepwise decay, not time-linear.
  - Sleep event triggers multiplicative step-down.
  - Low-neural day adds an additional (smaller) step-down.
  - Rest day yields larger step-down.
  - No single day "full reset"; full clearance usually requires 2+ sleep events.
  - Default: assume normal sleep if missing.
- Metabolic: fast exponential decay (fastest and smoothest).
  - Typical clearance 24-48h depending on intensity and support.
- Mechanical: slow rise, long tail ("sticky").
  - Accumulates across sessions, clears slowly (nonlinear).
- Recruitment: derived, no independent decay.
  - Derived from max(neural, mechanical).
  - Displayed as overlay/band and a summary badge (EHTRA).

### Recruitment derived metric (EHTRA)
- Computation:
  - recruitment_constraint = max(neural_constraint, mechanical_constraint)
  - recruitment_availability = 1 - recruitment_constraint
  - score = round(1 + 9 * recruitment_availability)
- UI: overlay/band on charts, and a 1-10 badge on Today summary.
- Not user-editable. Not a primary axis line by default.

## Combined fatigue score (global)
### Axis roles
- Neural: limiter (gating), not a contributor.
- Metabolic: load driver.
- Mechanical: risk accumulator.
- Recruitment: amplifier (via weighting), derived.

### Calculation order (strict)
1) Compute weighted sum of R/M/C.
2) Apply neural gating.
3) Apply system capacity gating.

### Base weights (fixed)
- Metabolic: 0.45
- Mechanical: 0.35
- Recruitment: 0.20

### Workout-type modifiers
- Each workout type applies bounded multipliers (+/- 20-30%).
- Renormalize to sum to 1.
- Example (conceptual):
  - Easy aerobic: M x1.2, C x0.8, R x0.7
  - Threshold: M x1.3, C x1.0, R x0.9
  - Hypertrophy: M x1.0, C x1.1, R x1.1
  - Max strength: M x0.6, C x1.2, R x1.4
  - Plyometrics: M x0.5, C x1.4, R x1.3
- Modifiers must be explainable in one sentence.
- Log base weights, modifiers, and effective weights (debug only).

### Combined score meaning (must be preserved)
"Probability that the next hard session degrades adaptation rather than improves it."

## UI requirements
### Today page
- Show axis gauges (neural, metabolic, mechanical) and derived recruitment badge (EHTRA).
- Show combined fatigue score (gated by neural + system capacity).
- Show "why this" chips linking to contributing sessions (top 1-3).
- Show system capacity indicator (sleep/fuel/stress) separately and as gate.
- Only show accumulated fatigue from completed sessions up to previous day.
- Red highlight >= 7 (and yellow/green thresholds).

### Calendar weekly audit
- 7-day time series per axis with axis-specific decay behavior.
- Completed = solid line; Planned = dashed line.
- Show recruitment as overlay/band (not a primary line).
- Show red region at >= 7.
- Moving a workout updates planned series immediately (weekly audit only).
- Daily resolution (one value per day).

### Calendar month view
- 30-day series (daily resolution).
- Same axis behaviors and planned/complete styling.

### Explainability
- Tooltips must explain each axis and each decision point.
- "Why this" chips must link to specific sessions and show axis breakdown.
- No hidden "magic"; always explain which axes drove the score.

## Data model changes
- Drop existing LIHC/HILC fields and references.
- Add new axis fields:
  - Global neural, global metabolic.
  - Per-region recruitment/metabolic/mechanical.
  - Derived recruitment availability (optional storage).
  - System capacity inputs (sleep/fuel/stress).
- Use Alembic for schema migrations.

## Mapping rules (v1)
- Build exercise -> region + axis effect mapping table (new).
- Include core lifts + endurance modalities (run/cycle/row/swim).
- Endurance intensities by zone (if missing: estimate from HR > power/pace).
- Mapping generation included in feature work.

## Guardrails
- Do not compute combined score per muscle.
- Do not use combined score to pick exercises; only for "push vs deload."
- Never collapse axis lines by default; combined score is secondary.
- Tests must be deterministic; no real network calls.

## Testing (TDD)
- Unit tests for axis scoring + decay functions.
- Component tests for Today + weekly audit graph behavior.
- Integration tests for calendar move -> weekly audit update.
- No E2E unless touching Today/Auth/Logging flows per policy.

---

# Feature Tickets (single MR each)
1) Data model + Alembic migration
   - Drop LIHC/HILC fields; add axis fields + system capacity inputs.
   - Add derived recruitment storage (optional).

2) Exercise/zone mapping foundation
   - Build exercise -> region + axis effect mapping table.
   - Endurance zone inference rules (HR > power/pace).
   - Unit tests for mapping outputs.

3) Axis scoring + decay engine
   - Session -> axis spikes (log scale).
   - Axis-specific decay (neural stepwise, metabolic exponential, mechanical long-tail).
   - Recruitment derivation and combined fatigue gating.

4) System capacity inputs + gating
   - Manual + wearable inputs.
   - Default "normal sleep" fallback and daily override.
   - Gate combined fatigue; show separate indicator.

5) Today page: axis gauges + explainability
   - Show accumulated fatigue (completed only, previous-day roll).
   - "Why this" chips linking sessions.
   - Red/yellow/green thresholds.

6) Weekly audit chart (calendar)
   - 7-day series, completed solid vs planned dashed.
   - Recruitment overlay/band.
   - Red zone at >= 7.
   - Update on workout move (planned only).

7) Month view chart (calendar)
   - 30-day series with same rules and styling.

8) Observability + debug logging
   - Log base weights, modifiers, effective weights (internal only).
   - Ensure no user-facing exposure of weights.





Short answer: there is no single paper that proposes a “4-axis fatigue model” as you’ve defined it — but each axis is strongly supported by separate, well-established research traditions. What you have is a synthetic framework, not a novel physiological claim.

That distinction matters scientifically and product-wise.

Below is a clean mapping from each axis to its supporting literature, plus an explanation of why no single paper exists and why that’s acceptable.

⸻

1. Big Picture (Important Framing)

The 4-axis model is a conceptual integration layer, not a mechanistic theory.

It does not claim:
	•	new physiology
	•	new fatigue mechanisms
	•	new biomarkers

It does claim:
	•	different constraints limit training in different ways
	•	those constraints recover on different clocks
	•	collapsing them too early leads to bad decisions

This is exactly how modern training science actually operates — just usually implicitly.

⸻

2. Neural Axis — Strongly Supported (but fragmented)

What the axis claims
	•	High-intent work (max strength, sprinting, skill) produces fatigue that:
	•	is not proportional to volume
	•	recovers discretely
	•	constrains performance before muscles “feel tired”

Supporting bodies of literature
	•	Central vs peripheral fatigue
	•	Motor unit firing and voluntary activation
	•	CNS recovery after high-intensity work

Representative work:
	•	Gandevia, 2001 — central fatigue and voluntary activation
	•	Taylor et al., 2016 — neural contributions to fatigue
	•	Seiler et al., 2007 — autonomic recovery differs by intensity
	•	Burnley & Jones, 2018 — critical power and neuromuscular fatigue

Key takeaway:
Neural fatigue is real, non-local, and non-linear — exactly how you model it.

⸻

3. Metabolic Axis — Extremely Well Supported

What the axis claims
	•	Glycogen depletion, metabolite accumulation, and endocrine stress:
	•	drive short-term fatigue
	•	recover relatively quickly
	•	dominate tolerance to training density

Supporting literature
	•	Glycogen depletion and replenishment
	•	Lactate / metabolic stress models
	•	Threshold and intensity-distribution research

Representative work:
	•	Bergström et al., 1967 — muscle glycogen depletion
	•	Brooks, 2007 — lactate as metabolic intermediate
	•	Seiler & Tønnessen, 2009 — intensity distribution
	•	Casado et al., 2023 — threshold work and recovery dynamics

This axis is the least controversial scientifically.

⸻

4. Mechanical Axis — Supported via Injury & Tissue Models

What the axis claims
	•	Structural loading (especially eccentric):
	•	accumulates silently
	•	recovers slowly
	•	predicts injury and soreness more than performance

Supporting literature
	•	Tissue adaptation and remodeling
	•	Eccentric muscle damage
	•	Load-management and injury risk

Representative work:
	•	Proske & Morgan, 2001 — eccentric muscle damage
	•	Magnusson et al., 2008 — tendon adaptation timelines
	•	Drew & Finch, 2016 — workload–injury relationship
	•	Bertelsen et al., 2017 — cumulative load models

Mechanical fatigue being orthogonal to metabolic fatigue is well established — it’s just rarely formalized in planning tools.

⸻

5. Recruitment Axis — Indirect but Legitimate

What the axis claims
	•	High-threshold motor unit availability depends on:
	•	neural drive
	•	mechanical readiness
	•	Recruitment is not independently “fatiguing,” but gates output

Supporting literature
	•	Size principle
	•	Motor unit recruitment under fatigue
	•	Task-dependent recruitment

Representative work:
	•	Henneman, 1957 — size principle
	•	Enoka & Duchateau, 2017 — motor unit behavior
	•	Kristensen et al., 2015 — fiber-type-specific signaling

Your decision to make Recruitment derived (not causal) is exactly what the literature implies.

⸻

6. Why No Single Paper Proposes This Model

Three reasons:

1. Research is siloed
	•	Neural fatigue → neurophysiology
	•	Metabolic fatigue → exercise metabolism
	•	Mechanical fatigue → biomechanics / injury science

Very few papers attempt unification.

⸻

2. Scientists optimize for mechanism, not planning

Academic models explain what happens, not how to schedule training.

Your model answers:

“What should I do tomorrow?”

Most papers do not.

⸻

3. Coaches already think this way — informally

If you read:
	•	Seiler
	•	Foster
	•	Issurin
	•	Verkhoshansky
	•	Bompa

You’ll see:
	•	“don’t stack neural work”
	•	“separate hard days”
	•	“manage structural load”
	•	“volume tolerance vs intensity tolerance”

Your model formalizes coaching heuristics into explicit axes.

⸻

7. Is This Scientifically Defensible?

Yes — because:
	•	Each axis maps to a validated fatigue domain
	•	You do not claim axis independence at the physiological level
	•	You treat the model as decision support, not diagnosis
	•	You explicitly avoid false precision

That puts you squarely in line with:
	•	modern training-load theory
	•	internal vs external load models
	•	systems-level sport science

⸻

8. How to Describe This in Product / Docs (Important)

Do not say:

“This is a validated physiological model.”

Say:

“This is a planning framework grounded in established fatigue mechanisms.”

Or:

“Each axis corresponds to a well-studied limitation on training adaptation.”

That wording is accurate and defensible.
