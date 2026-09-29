"""add website branding settings

Revision ID: 0002
Revises: 0001
Create Date: 2026-09-29

"""
from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "tenant_settings",
        sa.Column("website_name", sa.String(255), server_default="Smart Loan Platform", nullable=False),
    )
    op.add_column(
        "tenant_settings",
        sa.Column("company_name", sa.String(255), server_default="Smart Loan Enterprise", nullable=False),
    )
    op.add_column(
        "tenant_settings",
        sa.Column("tagline", sa.String(255), server_default="Credit Suite", nullable=False),
    )


def downgrade() -> None:
    op.drop_column("tenant_settings", "tagline")
    op.drop_column("tenant_settings", "company_name")
    op.drop_column("tenant_settings", "website_name")
