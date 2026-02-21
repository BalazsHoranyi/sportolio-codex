"""Create fatigue snapshots table for 4-axis + system capacity persistence.

Revision ID: 0001_sprt26
Revises:
Create Date: 2026-02-21 05:45:00.000000
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "0001_sprt26"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "fatigue_snapshots",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("athlete_id", sa.String(length=64), nullable=False),
        sa.Column("snapshot_date", sa.Date(), nullable=False),
        sa.Column("global_neural", sa.Float(), nullable=False),
        sa.Column("global_metabolic", sa.Float(), nullable=False),
        sa.Column("regional_recruitment", sa.JSON(), nullable=False),
        sa.Column("regional_metabolic", sa.JSON(), nullable=False),
        sa.Column("regional_mechanical", sa.JSON(), nullable=False),
        sa.Column("derived_recruitment", sa.Float(), nullable=True),
        sa.Column("system_capacity_sleep", sa.Integer(), nullable=True),
        sa.Column("system_capacity_fuel", sa.Integer(), nullable=False),
        sa.Column("system_capacity_stress", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_fatigue_snapshots_athlete_id",
        "fatigue_snapshots",
        ["athlete_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_fatigue_snapshots_athlete_id", table_name="fatigue_snapshots")
    op.drop_table("fatigue_snapshots")
