#!/usr/bin/env bash
# Usage: ./ralph.sh <iterations> [spec_dir]

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ITERATIONS="${1:-}"
SPEC_DIR="${2:-$ROOT_DIR/specs/001-define-sportolo-v1}"
PLAN_FILE="$SPEC_DIR/plan.md"
TASKS_FILE="$SPEC_DIR/tasks.md"
APP_GOALS_FILE="$ROOT_DIR/app_goals.md"
REVIEW_SKILL_PATH="$ROOT_DIR/.codex/skills/reviewing-pr-local/SKILL.md"

usage() {
  echo "Usage: $0 <iterations> [spec_dir]"
}

log() {
  printf "\n[%s] %s\n" "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

require_file() {
  local path="$1"
  if [[ ! -f "$path" ]]; then
    echo "Missing required file: $path" >&2
    exit 1
  fi
}

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Missing required command: $cmd" >&2
    exit 1
  fi
}

run_codex_step() {
  local step_name="$1"
  local prompt="$2"

  log "Step: $step_name"
  codex --yolo exec "$prompt"
}

get_next_open_task() {
  local line_number
  line_number="$(grep -nE '^- \[[[:space:]]\] ' "$TASKS_FILE" | head -n 1 | cut -d: -f1 || true)"

  if [[ -z "$line_number" ]]; then
    return 1
  fi

  local line_text
  line_text="$(sed -n "${line_number}p" "$TASKS_FILE")"

  local task_id
  task_id="$(printf '%s' "$line_text" | grep -oE 'T[0-9]+' | head -n 1 || true)"

  if [[ -z "$task_id" ]]; then
    return 1
  fi

  local task_title
  task_title="$(printf '%s' "$line_text" | sed -E 's/^- \[[[:space:]]\] //' | sed -E "s/^${task_id}[[:space:]]*//")"

  printf '%s|%s|%s|%s\n' "$line_number" "$task_id" "$task_title" "$line_text"
}

extract_first_match() {
  local pattern="$1"
  local content="$2"
  printf '%s\n' "$content" | grep -E "$pattern" | head -n 1 || true
}

if [[ -z "$ITERATIONS" || ! "$ITERATIONS" =~ ^[0-9]+$ ]]; then
  usage
  echo "Error: iterations must be a number" >&2
  exit 1
fi

require_cmd codex
require_file "$PLAN_FILE"
require_file "$TASKS_FILE"
require_file "$APP_GOALS_FILE"
require_file "$REVIEW_SKILL_PATH"

for ((i=1; i<=ITERATIONS; i++)); do
  log "Iteration $i/$ITERATIONS"

  next_task_payload="$(get_next_open_task || true)"
  if [[ -z "$next_task_payload" ]]; then
    echo "All checklist items are complete."
    echo "Run final production-readiness validation if not already done."
    echo "<promise>COMPLETE</promise>"
    exit 0
  fi

  IFS='|' read -r task_line task_id task_title task_line_text <<<"$next_task_payload"
  log "Selected task: $task_id (line $task_line)"
  printf '%s\n' "$task_line_text"

  readiness_prompt=$(cat <<PROMPT
You are executing scripted workflow step "readiness-check".

Repository root: $ROOT_DIR
Spec directory: $SPEC_DIR
Task file: $TASKS_FILE
Selected task: $task_id
Task line: $task_line_text

Required actions:
1. Read $PLAN_FILE, $APP_GOALS_FILE, and $TASKS_FILE.
2. Confirm whether this task is unblocked and ready.
3. If blocked, explain exact blocker task IDs and output <promise>BLOCKED</promise>.
4. If ready, output <promise>READY</promise>.

Rules:
- Do not edit any files.
- Do not implement the task in this step.
PROMPT
)

  readiness_output="$(run_codex_step "readiness-check ($task_id)" "$readiness_prompt")"
  printf '%s\n' "$readiness_output"

  if [[ "$readiness_output" == *"<promise>BLOCKED</promise>"* ]]; then
    log "Task $task_id is blocked. Stopping loop."
    exit 1
  fi

  if [[ "$readiness_output" != *"<promise>READY</promise>"* ]]; then
    log "Readiness step did not confirm READY. Stopping loop."
    exit 1
  fi

  implement_prompt=$(cat <<PROMPT
You are executing scripted workflow step "implement-task".

Repository root: $ROOT_DIR
Spec directory: $SPEC_DIR
Task file: $TASKS_FILE
Selected task: $task_id
Task title: $task_title
Task line: $task_line_text

Required actions:
1. Implement ONLY this selected task end-to-end with TDD (Red -> Green -> Refactor).
2. Follow repository instructions in AGENTS.md and keep original intent toward production readiness.
3. Run relevant targeted tests for this task.
4. Do not mark task complete in $TASKS_FILE yet.
5. Output <promise>IMPLEMENTED</promise> only when implementation + targeted tests are done.

Rules:
- Do not start another open task unless strictly required to unblock this task.
- If blocked, explain concrete next steps and output <promise>BLOCKED</promise>.
PROMPT
)

  implement_output="$(run_codex_step "implement-task ($task_id)" "$implement_prompt")"
  printf '%s\n' "$implement_output"

  if [[ "$implement_output" == *"<promise>BLOCKED</promise>"* ]]; then
    log "Implementation step reported BLOCKED. Stopping loop."
    exit 1
  fi

  if [[ "$implement_output" != *"<promise>IMPLEMENTED</promise>"* ]]; then
    log "Implementation step did not confirm IMPLEMENTED. Stopping loop."
    exit 1
  fi

  log "Running full validation gate: make all"
  if ! (cd "$ROOT_DIR" && make all); then
    log "make all failed. Task remains open; skipping MR/review and completion."
    continue
  fi

  review_prompt=$(cat <<PROMPT
You are executing scripted workflow step "mr-review-loop".

Repository root: $ROOT_DIR
Selected task: $task_id
Task line: $task_line_text
Review skill: [$reviewing-pr-local]($REVIEW_SKILL_PATH)

Required actions:
1. Open or update MR/PR with code changes for this task.
2. Write a precise MR/PR description covering overarching goal and exact scope.
3. Run the review skill against this MR/PR.
4. If any feedback is presented, the original implementing agent must fix code, push updates, and run review again.
5. Repeat fix -> push -> review until no unresolved feedback remains.
6. Do not mark task complete in $TASKS_FILE in this step.

Output format (required):
- MR_URL: <url>
- REVIEW_ITERATIONS: <number>
- <promise>REVIEW_CLEAN</promise> when loop is complete.

If blocked, explain blocker and output <promise>BLOCKED</promise>.
PROMPT
)

  review_output="$(run_codex_step "mr-review-loop ($task_id)" "$review_prompt")"
  printf '%s\n' "$review_output"

  if [[ "$review_output" == *"<promise>BLOCKED</promise>"* ]]; then
    log "MR/review loop blocked. Stopping loop."
    exit 1
  fi

  if [[ "$review_output" != *"<promise>REVIEW_CLEAN</promise>"* ]]; then
    log "MR/review loop did not confirm REVIEW_CLEAN. Stopping loop."
    exit 1
  fi

  mr_url_line="$(extract_first_match '^MR_URL:' "$review_output")"
  mr_url="${mr_url_line#MR_URL: }"
  review_iterations_line="$(extract_first_match '^REVIEW_ITERATIONS:' "$review_output")"
  review_iterations="${review_iterations_line#REVIEW_ITERATIONS: }"

  mark_prompt=$(cat <<PROMPT
You are executing scripted workflow step "mark-task-complete".

Repository root: $ROOT_DIR
Task file: $TASKS_FILE
Selected task: $task_id
Task line number: $task_line
Task line text: $task_line_text
MR URL: ${mr_url:-unknown}
Review iterations: ${review_iterations:-unknown}

Required actions:
1. Mark only this selected task as [X] in $TASKS_FILE.
2. Do not change any other task checkbox.
3. Report:
   - Task ID and title completed
   - Files changed
   - Targeted tests run and results
   - Full validation result (make all)
   - MR URL
   - Number of review/fix iterations
   - Current progress (completed/total)
   - Next open task ID/title
4. Output <promise>TASK_COMPLETE</promise> when done.

If blocked, explain blocker and output <promise>BLOCKED</promise>.
PROMPT
)

  mark_output="$(run_codex_step "mark-task-complete ($task_id)" "$mark_prompt")"
  printf '%s\n' "$mark_output"

  if [[ "$mark_output" == *"<promise>BLOCKED</promise>"* ]]; then
    log "Mark-complete step blocked. Stopping loop."
    exit 1
  fi

  if [[ "$mark_output" != *"<promise>TASK_COMPLETE</promise>"* ]]; then
    log "Mark-complete step did not confirm TASK_COMPLETE. Stopping loop."
    exit 1
  fi

done
