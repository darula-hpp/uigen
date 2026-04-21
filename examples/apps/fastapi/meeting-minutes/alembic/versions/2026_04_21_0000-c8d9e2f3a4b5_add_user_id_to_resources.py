"""Add user_id to templates and meetings

Revision ID: c8d9e2f3a4b5
Revises: b51c908df0a7
Create Date: 2026-04-21 00:00:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c8d9e2f3a4b5'
down_revision: Union[str, Sequence[str], None] = 'b51c908df0a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add user_id column to templates table
    op.add_column('templates', sa.Column('user_id', sa.Integer(), nullable=True))
    op.create_index(op.f('ix_templates_user_id'), 'templates', ['user_id'], unique=False)
    op.create_foreign_key('fk_templates_user_id', 'templates', 'users', ['user_id'], ['id'], ondelete='CASCADE')
    
    # Add user_id column to meetings table
    op.add_column('meetings', sa.Column('user_id', sa.Integer(), nullable=True))
    op.create_index(op.f('ix_meetings_user_id'), 'meetings', ['user_id'], unique=False)
    op.create_foreign_key('fk_meetings_user_id', 'meetings', 'users', ['user_id'], ['id'], ondelete='CASCADE')
    
    # For existing data, set user_id to the first user (if any exists)
    # In production, you would need a more sophisticated migration strategy
    op.execute("""
        UPDATE templates 
        SET user_id = (SELECT id FROM users ORDER BY id LIMIT 1)
        WHERE user_id IS NULL AND EXISTS (SELECT 1 FROM users)
    """)
    
    op.execute("""
        UPDATE meetings 
        SET user_id = (SELECT id FROM users ORDER BY id LIMIT 1)
        WHERE user_id IS NULL AND EXISTS (SELECT 1 FROM users)
    """)
    
    # Make user_id NOT NULL after setting values
    op.alter_column('templates', 'user_id', nullable=False)
    op.alter_column('meetings', 'user_id', nullable=False)


def downgrade() -> None:
    """Downgrade schema."""
    # Drop foreign keys and columns
    op.drop_constraint('fk_templates_user_id', 'templates', type_='foreignkey')
    op.drop_index(op.f('ix_templates_user_id'), table_name='templates')
    op.drop_column('templates', 'user_id')
    
    op.drop_constraint('fk_meetings_user_id', 'meetings', type_='foreignkey')
    op.drop_index(op.f('ix_meetings_user_id'), table_name='meetings')
    op.drop_column('meetings', 'user_id')
