#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
import re
import subprocess
import sys
import textwrap
from dataclasses import dataclass
from pathlib import Path

IMPLEMENT_PROMPT = """Goal: Implement project sportolo from Linear.

WORKSTYLE (must follow in order, no skipping):
A) Select ONE Linear issue to work on (highest priority). If anything is already In Progress, prefer that.
We are not building a mobile app for v1. We will tackle that next.
B) Before coding, write:
   1) thorough execution plan
   2) acceptance criteria (bullet list)
   3) risks/edge cases to test
Make a new branch with feature/{linear_ticket}
C) Update Linear issue to In Progress and add a comment containing the plan + acceptance criteria.
D) Implement the feature thoroughly:
   - No stubs or TODOs left behind unless explicitly accepted in the issue
   - Include necessary refactors ONLY if required for this issue
   - This is production facing, so be thorough, take all the time you need to implement, never forsake completeness for brevity.
E) Add/update documentation if behavior changes.
F) Make ONE commit on a new branch with a clear git commit message referencing the Linear issue key. Push to remote. and open up an mr if not already open

REVIEW GATE RULE:
- Do NOT move the Linear issue to Done in this phase.
- Do NOT post a final "what changed / how to test / commands / links" completion comment yet.
- Final Linear Done transition happens only after all automated review gates pass.


SCOPE RULES:
- Work on ONE issue only. Do not start a second issue.
- If the work is larger than expected, create a new Linear issue capturing follow-ups, but still finish the current issue cleanly.

COMPLETION:
- If all issues in the Linear project are Done, output exactly: <promise>COMPLETE</promise>
"""

PROMISE_RE = re.compile(r"<promise>\s*([^<]+?)\s*</promise>", re.IGNORECASE)
LINEAR_TICKET_RE = re.compile(r"\b([A-Za-z]+-\d+)\b")


@dataclass
class RunResult:
    returncode: int
    output: str


def run_text_command(cmd: list[str], cwd: Path, allow_fail: bool = False) -> str:
    proc = subprocess.run(cmd, cwd=str(cwd), text=True, capture_output=True)
    if proc.returncode != 0 and not allow_fail:
        raise RuntimeError(
            f"Command failed ({proc.returncode}): {' '.join(cmd)}\n"
            f"stdout:\n{proc.stdout}\n\nstderr:\n{proc.stderr}"
        )
    return proc.stdout.strip()


def run_codex(prompt: str, cwd: Path, codex_bin: str, label: str) -> RunResult:
    print(f"\n===== {label} =====")
    cmd = [codex_bin, "--yolo", "exec", prompt]
    proc = subprocess.Popen(
        cmd,
        cwd=str(cwd),
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        bufsize=1,
    )

    output_chunks: list[str] = []
    assert proc.stdout is not None
    for line in proc.stdout:
        output_chunks.append(line)
        sys.stdout.write(line)

    returncode = proc.wait()
    output = "".join(output_chunks)
    print(f"\n===== {label} exit={returncode} =====")
    return RunResult(returncode=returncode, output=output)


def parse_promise(output: str) -> str | None:
    matches = PROMISE_RE.findall(output)
    if not matches:
        return None
    return re.sub(r"\s+", " ", matches[-1]).strip().upper()


def parse_repo_slug(remote_url: str) -> str | None:
    remote = remote_url.strip()
    m = re.match(r"git@[^:]+:(?P<slug>.+?)(?:\.git)?$", remote)
    if m:
        return m.group("slug")
    m = re.match(r"https?://[^/]+/(?P<slug>.+?)(?:\.git)?$", remote)
    if m:
        return m.group("slug")
    return None


def get_current_branch(cwd: Path) -> str:
    return run_text_command(["git", "rev-parse", "--abbrev-ref", "HEAD"], cwd)


def get_repo_slug(cwd: Path) -> str | None:
    remote_url = run_text_command(["git", "config", "--get", "remote.origin.url"], cwd, allow_fail=True)
    if not remote_url:
        return None
    return parse_repo_slug(remote_url)


def get_pr_number(cwd: Path, branch: str) -> str | None:
    commands = [
        ["gh", "pr", "view", "--json", "number", "--jq", ".number"],
        ["gh", "pr", "list", "--head", branch, "--json", "number", "--jq", ".[0].number"],
    ]
    for cmd in commands:
        out = run_text_command(cmd, cwd, allow_fail=True)
        if out and out != "null":
            return out
    return None


def infer_linear_ticket(cwd: Path, branch: str, pr_number: str | None) -> str | None:
    candidates: list[str] = [branch]
    if pr_number:
        pr_title = run_text_command(
            ["gh", "pr", "view", pr_number, "--json", "title", "--jq", ".title"],
            cwd,
            allow_fail=True,
        )
        if pr_title:
            candidates.append(pr_title)

    for text in candidates:
        match = LINEAR_TICKET_RE.search(text or "")
        if match:
            return match.group(1).upper()
    return None


def get_pr_base_branch(cwd: Path, pr_number: str | None) -> str:
    if pr_number:
        out = run_text_command(
            ["gh", "pr", "view", pr_number, "--json", "baseRefName", "--jq", ".baseRefName"],
            cwd,
            allow_fail=True,
        )
        if out and out != "null":
            return out
    return "main"


def get_pr_state(cwd: Path, pr_number: str) -> str | None:
    state = run_text_command(
        ["gh", "pr", "view", pr_number, "--json", "state", "--jq", ".state"],
        cwd,
        allow_fail=True,
    )
    if not state:
        return None
    return state.strip().upper()


def ensure_pr_merged(cwd: Path, pr_number: str) -> None:
    state = get_pr_state(cwd, pr_number)
    if state == "MERGED":
        return
    run_text_command(["gh", "pr", "merge", pr_number, "--merge", "--delete-branch"], cwd)
    state = get_pr_state(cwd, pr_number)
    if state != "MERGED":
        raise RuntimeError(f"PR #{pr_number} is not merged (current state: {state or 'UNKNOWN'}).")


def resolve_base_ref(cwd: Path, base_branch: str) -> str:
    candidates = [f"origin/{base_branch}", base_branch]
    for ref in candidates:
        ok = run_text_command(["git", "rev-parse", "--verify", ref], cwd, allow_fail=True)
        if ok:
            return ref
    return "HEAD~1"


def changed_files_against_base(cwd: Path, base_ref: str) -> list[str]:
    out = run_text_command(["git", "diff", "--name-only", f"{base_ref}...HEAD"], cwd, allow_fail=True)
    if not out:
        out = run_text_command(["git", "diff", "--name-only", "HEAD~1..HEAD"], cwd, allow_fail=True)
    return [line.strip() for line in out.splitlines() if line.strip()]


def has_frontend_changes(files: list[str]) -> bool:
    for p in files:
        if p.startswith("frontend/"):
            return True
        if p.endswith((".tsx", ".ts", ".jsx", ".js", ".css", ".scss")) and "/frontend/" in f"/{p}":
            return True
    return False


def build_ui_review_prompt(
    agent_browser_skill_path: str,
    branch: str,
    repo_slug: str | None,
    pr_number: str | None,
    linear_ticket: str | None,
    changed_files: list[str],
) -> str:
    ticket_value = linear_ticket or "UNKNOWN"
    changed = "\n".join(f"- {f}" for f in changed_files[:200]) or "- (not available)"
    return textwrap.dedent(
        f"""
        Use [$agent-browser]({agent_browser_skill_path}) and chrome-devtools-mcp to validate frontend changes on branch `{branch}`.

        Context:
        - Repository: {repo_slug or "UNKNOWN"}
        - PR number: {pr_number or "UNKNOWN"}
        - Linear ticket: {ticket_value}
        - Changed files:
        {changed}

        Review requirements:
        - Act as a first-time end user with no product knowledge.
        - Explore flows by clicking, typing, dragging (where relevant), navigating, and trying edge interactions.
        - Check intuitive UX, full functionality of changed areas, and obvious broken states.
        - Assess visual polish from a designer UI/UX perspective.
        - Validate the changed flows against Linear issue `{ticket_value}` acceptance criteria.
        - If any required acceptance criterion for `{ticket_value}` is not fully satisfied, output exactly: <promise>UI-Changes Requested</promise>
        - Provide concrete feedback with severity and actionable fixes.
        - If no updates are required, output exactly: <promise>UI-LGTM</promise>
        - If updates are required, output exactly: <promise>UI-Changes Requested</promise>
        """
    ).strip()


def build_ui_fix_prompt(branch: str, ui_review_output: str) -> str:
    return textwrap.dedent(
        f"""
        You requested frontend changes from UX/browser validation. Apply all required updates on branch `{branch}`.

        Validation feedback to address:
        {ui_review_output}

        Requirements:
        - Implement all required frontend fixes.
        - Keep scope to the same Linear issue.
        - Do NOT move the Linear issue to Done yet.
        - Run relevant checks/tests.
        - Commit and push updates to the same branch/PR.
        - Output exactly: <promise>UI-Fixes Applied</promise>
        """
    ).strip()


def build_review_prompt(
    skill_path: str,
    branch: str,
    repo_slug: str | None,
    pr_number: str | None,
    linear_ticket: str | None,
) -> str:
    repo_value = repo_slug or "UNKNOWN"
    pr_value = pr_number or "UNKNOWN"
    ticket_value = linear_ticket or "UNKNOWN"
    return textwrap.dedent(
        f"""
        Use [$reviewing-pr-local]({skill_path}) to run a FULL review for the pushed branch.

        Context:
        - Branch: {branch}
        - Repository: {repo_value}
        - PR number: {pr_value}
        - Linear ticket: {ticket_value}

        Requirements:
        - Follow the skill workflow exactly.
        - Use a full review (not incremental).
        - Validate completion against Linear issue `{ticket_value}` scope + acceptance criteria.
        - If any acceptance criterion for `{ticket_value}` is incomplete, output exactly: <promise>Changes Requested</promise>
        - If no updates are required, output exactly: <promise>LGTM</promise>
        - If updates are required, output exactly: <promise>Changes Requested</promise>
        """
    ).strip()


def build_fix_prompt(branch: str, review_output: str) -> str:
    return textwrap.dedent(
        f"""
        You requested changes in review. Apply all required updates for the current issue on branch `{branch}`.

        Review output to address:
        {review_output}

        Requirements:
        - Fix every Critical/Major/Minor issue required to pass review.
        - Keep scope to the same Linear issue.
        - Do NOT move the Linear issue to Done yet.
        - Run relevant tests/checks.
        - Commit and push updates to the same branch/PR.
        - Output exactly: <promise>Ready for Re-Review</promise>
        """
    ).strip()


def build_close_linear_prompt(branch: str, pr_number: str) -> str:
    return textwrap.dedent(
        f"""
        Review is approved and PR is merged for branch `{branch}`.
        PR number: {pr_number}

        Close out the related Linear issue and comment with:
        - what changed
        - how to test manually
        - commands run + results
        - links to commit/PR

        Output exactly: <promise>Closed</promise>
        """
    ).strip()


def main() -> int:
    parser = argparse.ArgumentParser(description="Run codex implementation + UI validation + PR review loops.")
    parser.add_argument("--cwd", default=os.getcwd(), help="Working directory.")
    parser.add_argument("--codex-bin", default="codex", help="Codex CLI binary.")
    parser.add_argument("--max-ui-loops", type=int, default=5, help="Maximum UI validation/fix loops.")
    parser.add_argument("--max-review-loops", type=int, default=10, help="Maximum code review/fix loops.")
    parser.add_argument(
        "--review-skill-path",
        default="/Users/bhoranyi/Personal/sportolo2/.codex/skills/reviewing-pr-local/SKILL.md",
        help="Path to reviewing-pr-local SKILL.md.",
    )
    parser.add_argument(
        "--agent-browser-skill-path",
        default="/Users/bhoranyi/Personal/sportolo2/.codex/skills/agent-browser/SKILL.md",
        help="Path to agent-browser SKILL.md.",
    )
    args = parser.parse_args()

    cwd = Path(args.cwd).resolve()

    impl_result = run_codex(IMPLEMENT_PROMPT, cwd=cwd, codex_bin=args.codex_bin, label="Initial implementation")
    if impl_result.returncode != 0:
        print("Initial implementation failed.", file=sys.stderr)
        return impl_result.returncode

    impl_promise = parse_promise(impl_result.output)

    branch = get_current_branch(cwd)
    repo_slug = get_repo_slug(cwd)
    pr_number = get_pr_number(cwd, branch)
    linear_ticket = infer_linear_ticket(cwd, branch, pr_number)

    if impl_promise == "COMPLETE":
        # Only truly complete when no feature branch / no PR exists.
        if branch in {"main", "master"} and pr_number is None:
            print("<promise>COMPLETE</promise>")
            return 0

        print(
            "Initial run returned COMPLETE, but active branch/PR detected; "
            "continuing review gates."
        )
    base_branch = get_pr_base_branch(cwd, pr_number)
    base_ref = resolve_base_ref(cwd, base_branch)
    changed_files = changed_files_against_base(cwd, base_ref)

    if has_frontend_changes(changed_files):
        for ui_loop in range(1, args.max_ui_loops + 1):
            ui_review = run_codex(
                build_ui_review_prompt(
                    agent_browser_skill_path=args.agent_browser_skill_path,
                    branch=branch,
                    repo_slug=repo_slug,
                    pr_number=pr_number,
                    linear_ticket=linear_ticket,
                    changed_files=changed_files,
                ),
                cwd=cwd,
                codex_bin=args.codex_bin,
                label=f"Frontend UX validation #{ui_loop}",
            )
            if ui_review.returncode != 0:
                print("Frontend UX validation failed.", file=sys.stderr)
                return ui_review.returncode

            ui_promise = parse_promise(ui_review.output)
            if ui_promise in {"UI-LGTM", "LGTM"}:
                break

            if ui_promise in {"UI-CHANGES REQUESTED", "CHANGES REQUESTED"}:
                ui_fix = run_codex(
                    build_ui_fix_prompt(branch, ui_review.output),
                    cwd=cwd,
                    codex_bin=args.codex_bin,
                    label=f"Apply frontend fixes #{ui_loop}",
                )
                if ui_fix.returncode != 0:
                    print("Applying frontend fixes failed.", file=sys.stderr)
                    return ui_fix.returncode
                continue

            print(
                "Unrecognized UI promise. Expected <promise>UI-LGTM</promise> or "
                "<promise>UI-Changes Requested</promise>.",
                file=sys.stderr,
            )
            return 2
        else:
            print("Reached max UI loops without UI-LGTM.", file=sys.stderr)
            return 4
    else:
        print("No frontend changes detected. Skipping UI validation loop.")

    for review_loop in range(1, args.max_review_loops + 1):
        branch = get_current_branch(cwd)
        repo_slug = get_repo_slug(cwd)
        pr_number = get_pr_number(cwd, branch)
        linear_ticket = infer_linear_ticket(cwd, branch, pr_number)

        review_result = run_codex(
            build_review_prompt(
                args.review_skill_path,
                branch,
                repo_slug,
                pr_number,
                linear_ticket,
            ),
            cwd=cwd,
            codex_bin=args.codex_bin,
            label=f"Full review #{review_loop}",
        )
        if review_result.returncode != 0:
            print("Review run failed.", file=sys.stderr)
            return review_result.returncode

        review_promise = parse_promise(review_result.output)

        if review_promise == "LGTM":
            if not pr_number:
                print("Cannot close Linear issue: no PR found for current branch.", file=sys.stderr)
                return 6
            try:
                ensure_pr_merged(cwd, pr_number)
            except RuntimeError as exc:
                print(f"Cannot close Linear issue before merge: {exc}", file=sys.stderr)
                return 7

            close_result = run_codex(
                build_close_linear_prompt(branch, pr_number),
                cwd=cwd,
                codex_bin=args.codex_bin,
                label="Close Linear issue",
            )
            if close_result.returncode != 0:
                print("Closing Linear issue failed.", file=sys.stderr)
                return close_result.returncode
            return 0

        if review_promise == "CHANGES REQUESTED":
            fix_result = run_codex(
                build_fix_prompt(branch, review_result.output),
                cwd=cwd,
                codex_bin=args.codex_bin,
                label=f"Apply code fixes #{review_loop}",
            )
            if fix_result.returncode != 0:
                print("Applying code fixes failed.", file=sys.stderr)
                return fix_result.returncode
            continue

        print(
            "Unrecognized review promise. Expected <promise>LGTM</promise> or "
            "<promise>Changes Requested</promise>.",
            file=sys.stderr,
        )
        return 3

    print("Reached max review loops without LGTM.", file=sys.stderr)
    return 5


if __name__ == "__main__":
    raise SystemExit(main())
