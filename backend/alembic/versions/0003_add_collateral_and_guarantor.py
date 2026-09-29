"""add collateral and guarantor info to loans

Revision ID: 0003
Revises: 0002
Create Date: 2026-09-29

"""
from alembic import op
import sqlalchemy as sa

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "loans",
        sa.Column("collateral_info", sa.JSON(), nullable=True, server_default="{}"),
    )
    op.add_column(
        "loans",
        sa.Column("guarantor_info", sa.JSON(), nullable=True, server_default="{}"),
    )


def downgrade() -> None:
    op.drop_column("loans", "guarantor_info")
    op.drop_column("loans", "collateral_info")
