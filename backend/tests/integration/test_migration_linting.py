from __future__ import annotations

import subprocess
import sys
from pathlib import Path
from tempfile import TemporaryDirectory

BACKEND_DIR = Path(__file__).resolve().parents[2]
MIGRATION_LINT_SCRIPT = BACKEND_DIR / "scripts" / "migration_lint.py"
MIGRATIONS_DIR = BACKEND_DIR / "migrations" / "versions"


def _run_migration_lint(migrations_dir: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [
            sys.executable,
            str(MIGRATION_LINT_SCRIPT),
            "--migrations-dir",
            str(migrations_dir),
        ],
        cwd=str(BACKEND_DIR),
        capture_output=True,
        text=True,
        check=False,
    )


def test_migration_lint_passes_for_repository_migrations() -> None:
    result = _run_migration_lint(MIGRATIONS_DIR)

    assert result.returncode == 0, result.stdout + result.stderr
    assert "migration lint passed" in result.stdout.lower()


def test_migration_lint_rejects_noop_downgrade() -> None:
    with TemporaryDirectory() as temp_dir:
        migration_dir = Path(temp_dir)
        (migration_dir / "0002_sprt13_noop_downgrade.py").write_text(
            """\
\"\"\"Bad migration.\"\"\"

from __future__ import annotations

from alembic import op

revision = \"0002_sprt13\"
down_revision = \"0001_sprt26\"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(\"temporary_table\")


def downgrade() -> None:
    pass
""",
            encoding="utf-8",
        )

        result = _run_migration_lint(migration_dir)

    assert result.returncode == 1
    assert "downgrade" in result.stdout.lower()
    assert "no-op" in result.stdout.lower()


def test_migration_lint_rejects_destructive_upgrade_without_waiver() -> None:
    with TemporaryDirectory() as temp_dir:
        migration_dir = Path(temp_dir)
        (migration_dir / "0002_sprt13_destructive_upgrade.py").write_text(
            """\
\"\"\"Bad migration.\"\"\"

from __future__ import annotations

from alembic import op

revision = \"0002_sprt13\"
down_revision = \"0001_sprt26\"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_table(\"fatigue_snapshots\")


def downgrade() -> None:
    op.create_table(\"fatigue_snapshots\")
""",
            encoding="utf-8",
        )

        result = _run_migration_lint(migration_dir)

    assert result.returncode == 1
    assert "destructive" in result.stdout.lower()
