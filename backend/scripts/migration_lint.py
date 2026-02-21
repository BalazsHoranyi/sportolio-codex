#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
from dataclasses import dataclass
from pathlib import Path

FILENAME_PATTERN = re.compile(r"^(?P<sequence>\d{4})_(?P<ticket>sprt\d+)_(?P<slug>[a-z0-9_]+)\.py$")
REVISION_PATTERN = re.compile(r'^revision\s*=\s*["\'](?P<value>[a-z0-9_]+)["\']\s*$', re.MULTILINE)
DOWN_REVISION_PATTERN = re.compile(
    r'^down_revision\s*=\s*(?P<value>None|["\'][a-z0-9_]+["\'])\s*$',
    re.MULTILINE,
)
DESTRUCTIVE_UPGRADE_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("drop_table", re.compile(r"\bop\.drop_table\(")),
    ("drop_column", re.compile(r"\bop\.drop_column\(")),
    (
        "destructive_sql",
        re.compile(
            (
                r"\bop\.execute\(\s*(?:sa\.text\(\s*)?[\"']{1,3}[\s\S]*?"
                r"(?:DELETE\s+FROM|TRUNCATE\s+TABLE|DROP\s+TABLE|ALTER\s+TABLE\s+\S+\s+DROP\s+COLUMN)"
            ),
            re.IGNORECASE,
        ),
    ),
)
ALLOW_DESTRUCTIVE_MARKER = "migration-lint: allow-destructive-upgrade"


@dataclass(frozen=True)
class MigrationLintViolation:
    file_path: Path
    message: str

    def render(self) -> str:
        return f"{self.file_path.name}: {self.message}"


def _extract_function_body(source: str, function_name: str) -> str | None:
    start_pattern = re.compile(
        rf"^def\s+{function_name}\s*\(\s*\)\s*(?:->\s*None\s*)?:\s*$", re.MULTILINE
    )
    match = start_pattern.search(source)
    if match is None:
        return None

    after_definition = source[match.end() :]
    body_lines: list[str] = []

    for line in after_definition.splitlines(keepends=False):
        if line.startswith("    "):
            body_lines.append(line[4:])
            continue
        if line.strip() == "":
            body_lines.append("")
            continue
        break

    return "\n".join(body_lines)


def _is_noop_downgrade(body: str) -> bool:
    content_lines = [
        line.strip()
        for line in body.splitlines()
        if line.strip() and not line.strip().startswith("#")
    ]
    if not content_lines:
        return True

    for line in content_lines:
        if line in {"pass", "..."}:
            continue
        if line.startswith("raise NotImplementedError"):
            continue
        return False

    return True


def _lint_migration_file(file_path: Path) -> list[MigrationLintViolation]:
    source = file_path.read_text(encoding="utf-8")
    violations: list[MigrationLintViolation] = []

    filename_match = FILENAME_PATTERN.match(file_path.name)
    if filename_match is None:
        violations.append(
            MigrationLintViolation(
                file_path=file_path,
                message="filename must match NNNN_sprtXX_description.py",
            )
        )
        return violations

    expected_revision = f"{filename_match.group('sequence')}_{filename_match.group('ticket')}"

    revision_match = REVISION_PATTERN.search(source)
    if revision_match is None:
        violations.append(
            MigrationLintViolation(file_path=file_path, message="missing revision identifier")
        )
    elif revision_match.group("value") != expected_revision:
        violations.append(
            MigrationLintViolation(
                file_path=file_path,
                message=(f"revision identifier must match filename prefix ({expected_revision})"),
            )
        )

    if DOWN_REVISION_PATTERN.search(source) is None:
        violations.append(
            MigrationLintViolation(file_path=file_path, message="missing down_revision")
        )

    upgrade_body = _extract_function_body(source, "upgrade")
    if upgrade_body is None:
        violations.append(MigrationLintViolation(file_path=file_path, message="missing upgrade()"))
    else:
        has_waiver = ALLOW_DESTRUCTIVE_MARKER in source
        if not has_waiver:
            for label, pattern in DESTRUCTIVE_UPGRADE_PATTERNS:
                if pattern.search(upgrade_body):
                    violations.append(
                        MigrationLintViolation(
                            file_path=file_path,
                            message=(
                                f"destructive upgrade operation detected ({label}); "
                                "add explicit waiver comment if intentional"
                            ),
                        )
                    )
                    break

    downgrade_body = _extract_function_body(source, "downgrade")
    if downgrade_body is None:
        violations.append(
            MigrationLintViolation(file_path=file_path, message="missing downgrade()")
        )
    elif _is_noop_downgrade(downgrade_body):
        violations.append(
            MigrationLintViolation(
                file_path=file_path,
                message="downgrade() must not be a no-op",
            )
        )

    return violations


def lint_migrations(migrations_dir: Path) -> list[MigrationLintViolation]:
    migration_files = sorted(
        path for path in migrations_dir.glob("*.py") if path.name != "__init__.py"
    )

    if not migration_files:
        return [
            MigrationLintViolation(
                file_path=migrations_dir,
                message="no migration files found",
            )
        ]

    violations: list[MigrationLintViolation] = []
    for migration_file in migration_files:
        violations.extend(_lint_migration_file(migration_file))

    return violations


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Lint Alembic migration files for safety and consistency."
    )
    parser.add_argument(
        "--migrations-dir",
        default="backend/migrations/versions",
        help="Directory containing Alembic migration files.",
    )
    return parser.parse_args()


def main() -> int:
    args = _parse_args()
    migrations_dir = Path(args.migrations_dir).resolve()

    violations = lint_migrations(migrations_dir)
    if violations:
        print("Migration lint failed:")
        for violation in violations:
            print(f"- {violation.render()}")
        return 1

    migration_count = len(
        [path for path in migrations_dir.glob("*.py") if path.name != "__init__.py"]
    )
    print(f"Migration lint passed for {migration_count} migration file(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
