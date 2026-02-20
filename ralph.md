# Ralph Scripted Workflow

`ralph.sh` now runs as an orchestrated workflow (not one giant prompt).

## Usage

```bash
./ralph.sh <iterations> [spec_dir]
```

- `iterations`: number of loop attempts
- `spec_dir` (optional): defaults to `/Users/bhoranyi/Personal/sportolo2/specs/001-define-sportolo-v1`

## Workflow Steps Per Iteration

1. Parse the next open checklist item from `tasks.md` (first `- [ ]` line).
2. Run a focused `readiness-check` Codex step.
   - Reads `plan.md`, `app_goals.md`, and `tasks.md`
   - Confirms task is unblocked (`<promise>READY</promise>`)
3. Run a focused `implement-task` Codex step.
   - Enforces TDD and single-task scope
   - Must return `<promise>IMPLEMENTED</promise>`
4. Run shell validation gate: `make all`.
   - If this fails, task stays open and loop continues.
5. Run focused `mr-review-loop` Codex step.
   - Open/update MR/PR with precise overarching-goal + scope description
   - Run skill `[$reviewing-pr-local](/Users/bhoranyi/Personal/sportolo2/.codex/skills/reviewing-pr-local/SKILL.md)`
   - Repeat fix -> push -> review until clean
   - Must return `<promise>REVIEW_CLEAN</promise>` plus `MR_URL` and `REVIEW_ITERATIONS`
6. Run focused `mark-task-complete` Codex step.
   - Marks only the selected task as `[X]`
   - Must return `<promise>TASK_COMPLETE</promise>`

## Guardrails

- Stops immediately on `<promise>BLOCKED</promise>` or missing required promise tokens.
- Never marks a task complete before validation + MR/review loop closure.
- If no open tasks remain, emits `<promise>COMPLETE</promise>` and exits.
