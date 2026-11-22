"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-11-22
"""

import sqlalchemy as sa
from alembic import op

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "organisation",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("type", sa.String(length=64), nullable=False),
        sa.Column("max_capacity_meals", sa.Integer(), nullable=False),
        sa.Column("service_area_km", sa.Float(), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("address", sa.Text(), nullable=False),
        sa.Column("operating_hours_start", sa.String(length=16), nullable=False),
        sa.Column("operating_hours_end", sa.String(length=16), nullable=False),
        sa.Column("accepted_categories", sa.Text(), nullable=False),
        sa.Column("is_verified", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "user",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("phone", sa.String(length=64), nullable=True),
        sa.Column("role", sa.String(length=32), nullable=False),
        sa.Column("organisation_id", sa.BigInteger(), nullable=True),
        sa.Column("password_hash", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["organisation_id"],
            ["organisation.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_user_email"), "user", ["email"], unique=True)
    op.create_index(op.f("ix_user_role"), "user", ["role"], unique=False)

    op.create_table(
        "food_listing",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("donor_user_id", sa.BigInteger(), nullable=False),
        sa.Column("organisation_id", sa.BigInteger(), nullable=True),
        sa.Column("title", sa.String(length=500), nullable=False),
        sa.Column("raw_description", sa.Text(), nullable=False),
        sa.Column("category", sa.String(length=120), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit", sa.String(length=64), nullable=False),
        sa.Column("available_until", sa.DateTime(timezone=True), nullable=False),
        sa.Column("pickup_venue", sa.Text(), nullable=False),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("handling_notes", sa.Text(), nullable=True),
        sa.Column("missing_fields_flagged", sa.Boolean(), nullable=False),
        sa.Column("status", sa.String(length=64), nullable=False),
        sa.Column("accepted_ngo_id", sa.BigInteger(), nullable=True),
        sa.Column("rescue_session_id", sa.BigInteger(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["donor_user_id"], ["user.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(
            ["organisation_id"],
            ["organisation.id"],
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_food_listing_donor_user_id"),
        "food_listing",
        ["donor_user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_food_listing_available_until"),
        "food_listing",
        ["available_until"],
        unique=False,
    )
    op.create_index(
        op.f("ix_food_listing_status"),
        "food_listing",
        ["status"],
        unique=False,
    )
    op.create_index(
        op.f("ix_food_listing_rescue_session_id"),
        "food_listing",
        ["rescue_session_id"],
        unique=False,
    )

    op.create_table(
        "rescue_session",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("join_code", sa.String(length=16), nullable=False),
        sa.Column("food_listing_id", sa.BigInteger(), nullable=False),
        sa.Column("host_donor_id", sa.BigInteger(), nullable=False),
        sa.Column("accepted_ngo_id", sa.BigInteger(), nullable=True),
        sa.Column("assigned_volunteer_id", sa.BigInteger(), nullable=True),
        sa.Column("status", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["food_listing_id"], ["food_listing.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["host_donor_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("join_code_idx", "rescue_session", ["join_code"], unique=True)

    op.create_table(
        "session_participant",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("rescue_session_id", sa.BigInteger(), nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("user_name", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=32), nullable=False),
        sa.Column("joined_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("is_online", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(
            ["rescue_session_id"],
            ["rescue_session.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "session_user_idx",
        "session_participant",
        ["rescue_session_id", "user_id"],
        unique=True,
    )

    op.create_table(
        "rescue_handover_verification",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("rescue_session_id", sa.BigInteger(), nullable=False),
        sa.Column("food_listing_id", sa.BigInteger(), nullable=False),
        sa.Column("handover_token", sa.String(length=255), nullable=False),
        sa.Column("is_used", sa.Boolean(), nullable=False),
        sa.Column("generated_by_user_id", sa.BigInteger(), nullable=False),
        sa.Column("verified_by_user_id", sa.BigInteger(), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "handover_token_idx",
        "rescue_handover_verification",
        ["handover_token"],
        unique=True,
    )

    op.create_table(
        "pickup_assignment",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("rescue_session_id", sa.BigInteger(), nullable=False),
        sa.Column("food_listing_id", sa.BigInteger(), nullable=False),
        sa.Column("volunteer_user_id", sa.BigInteger(), nullable=False),
        sa.Column("pickup_status", sa.String(length=64), nullable=False),
        sa.Column("pickup_instructions", sa.Text(), nullable=True),
        sa.Column("assigned_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("pickup_assignment")
    op.drop_index("handover_token_idx", table_name="rescue_handover_verification")
    op.drop_table("rescue_handover_verification")
    op.drop_index("session_user_idx", table_name="session_participant")
    op.drop_table("session_participant")
    op.drop_index("join_code_idx", table_name="rescue_session")
    op.drop_table("rescue_session")
    op.drop_index(op.f("ix_food_listing_rescue_session_id"), table_name="food_listing")
    op.drop_index(op.f("ix_food_listing_status"), table_name="food_listing")
    op.drop_index(op.f("ix_food_listing_available_until"), table_name="food_listing")
    op.drop_index(op.f("ix_food_listing_donor_user_id"), table_name="food_listing")
    op.drop_table("food_listing")
    op.drop_index(op.f("ix_user_role"), table_name="user")
    op.drop_index(op.f("ix_user_email"), table_name="user")
    op.drop_table("user")
    op.drop_table("organisation")
