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
G) Update Linear to Done and comment with:
   - what changed
   - how to test manually
   - commands run + results
   - links to commit/PR

SCOPE RULES:
- Work on ONE issue only. Do not start a second issue.
- If the work is larger than expected, create a new Linear issue capturing follow-ups, but still finish the current issue cleanly.

COMPLETION:
- If all issues in the Linear project are Done, output exactly: <promise>COMPLETE</promise>
"""

PROMISE_RE = re.compile(r"<promise>\s*([^<]+?)\s*</promise>", re.IGNORECASE)


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
    remote_url = run_text_command(
        ["git", "config", "--get", "remote.origin.url"], cwd, allow_fail=True
    )
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


def build_review_prompt(skill_path: str, branch: str, repo_slug: str | None, pr_number: str | None) -> str:
    repo_value = repo_slug or "UNKNOWN"
    pr_value = pr_number or "UNKNOWN"
    return textwrap.dedent(
        f"""
        Use [$reviewing-pr-local]({skill_path}) to run a FULL review for the pushed branch.

        Context:
        - Branch: {branch}
        - Repository: {repo_value}
        - PR number: {pr_value}

        Requirements:
        - Follow the skill workflow exactly.
        - Use a full review (not incremental).
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
        - Run relevant tests/checks.
        - Commit and push updates to the same branch/PR.
        - Output exactly: <promise>Ready for Re-Review</promise>
        """
    ).strip()


def build_close_linear_prompt(branch: str) -> str:
    return textwrap.dedent(
        f"""
        Review is now approved for branch `{branch}`.

        Close out the related Linear issue and comment with:
        - what changed
        - how to test manually
        - commands run + results
        - links to commit/PR

        Output exactly: <promise>Closed</promise>
        """
    ).strip()


def main() -> int:
    parser = argparse.ArgumentParser(description="Run codex implementation/review loop for sportolo Linear work.")
    parser.add_argument("--cwd", default=os.getcwd(), help="Working directory.")
    parser.add_argument("--codex-bin", default="codex", help="Codex CLI binary.")
    parser.add_argument("--max-review-loops", type=int, default=10, help="Maximum review/fix loops.")
    parser.add_argument(
        "--review-skill-path",
        default="/Users/bhoranyi/Personal/sportolo2/.codex/skills/reviewing-pr-local/SKILL.md",
        help="Path to reviewing-pr-local SKILL.md.",
    )
    args = parser.parse_args()

    cwd = Path(args.cwd).resolve()

    impl_result = run_codex(
        prompt=IMPLEMENT_PROMPT,
        cwd=cwd,
        codex_bin=args.codex_bin,
        label="Initial implementation",
    )
    if impl_result.returncode != 0:
        print("Initial implementation failed.", file=sys.stderr)
        return impl_result.returncode

    impl_promise = parse_promise(impl_result.output)
    if impl_promise == "COMPLETE":
        print("<promise>COMPLETE</promise>")
        return 0

    for loop_index in range(1, args.max_review_loops + 1):
        branch = get_current_branch(cwd)
        repo_slug = get_repo_slug(cwd)
        pr_number = get_pr_number(cwd, branch)

        review_result = run_codex(
            prompt=build_review_prompt(args.review_skill_path, branch, repo_slug, pr_number),
            cwd=cwd,
            codex_bin=args.codex_bin,
            label=f"Full review #{loop_index}",
        )
        if review_result.returncode != 0:
            print("Review run failed.", file=sys.stderr)
            return review_result.returncode

        review_promise = parse_promise(review_result.output)

        if review_promise == "LGTM":
            close_result = run_codex(
                prompt=build_close_linear_prompt(branch),
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
                prompt=build_fix_prompt(branch, review_result.output),
                cwd=cwd,
                codex_bin=args.codex_bin,
                label=f"Apply fixes #{loop_index}",
            )
            if fix_result.returncode != 0:
                print("Applying fixes failed.", file=sys.stderr)
                return fix_result.returncode
            continue

        print(
            "Unrecognized review promise. Expected <promise>LGTM</promise> or "
            "<promise>Changes Requested</promise>.",
            file=sys.stderr,
        )
        return 2

    print("Reached max review loops without LGTM.", file=sys.stderr)
    return 3


if __name__ == "__main__":
    raise SystemExit(main())
