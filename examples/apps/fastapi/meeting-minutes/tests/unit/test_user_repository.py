"""Unit tests for UserRepository."""
import pytest
from datetime import datetime, timezone, timedelta

from app.repositories.user_repository import UserRepository


@pytest.mark.asyncio
async def test_create_user_with_email(db_session):
    """Test creating a user with username, password hash, and email."""
    repo = UserRepository(db_session)
    
    user = await repo.create(
        username="testuser",
        password_hash="$2b$12$hashedpassword",
        email="test@example.com"
    )
    
    assert user.id is not None
    assert user.username == "testuser"
    assert user.password_hash == "$2b$12$hashedpassword"
    assert user.email == "test@example.com"
    assert user.created_at is not None


@pytest.mark.asyncio
async def test_create_user_without_email(db_session):
    """Test creating a user without an email."""
    repo = UserRepository(db_session)
    
    user = await repo.create(
        username="testuser2",
        password_hash="$2b$12$hashedpassword2"
    )
    
    assert user.id is not None
    assert user.username == "testuser2"
    assert user.password_hash == "$2b$12$hashedpassword2"
    assert user.email is None


@pytest.mark.asyncio
async def test_get_by_username_not_found(db_session):
    """Test get_by_username returns None for unknown username."""
    repo = UserRepository(db_session)
    
    user = await repo.get_by_username("nonexistent")
    
    assert user is None


@pytest.mark.asyncio
async def test_get_by_username_found(db_session):
    """Test get_by_username returns user when found."""
    repo = UserRepository(db_session)
    
    created_user = await repo.create(
        username="findme",
        password_hash="$2b$12$hash"
    )
    
    found_user = await repo.get_by_username("findme")
    
    assert found_user is not None
    assert found_user.id == created_user.id
    assert found_user.username == "findme"


@pytest.mark.asyncio
async def test_get_by_email_not_found(db_session):
    """Test get_by_email returns None for unknown email."""
    repo = UserRepository(db_session)
    
    user = await repo.get_by_email("nonexistent@example.com")
    
    assert user is None


@pytest.mark.asyncio
async def test_get_by_email_found(db_session):
    """Test get_by_email returns user when found."""
    repo = UserRepository(db_session)
    
    created_user = await repo.create(
        username="emailuser",
        password_hash="$2b$12$hash",
        email="find@example.com"
    )
    
    found_user = await repo.get_by_email("find@example.com")
    
    assert found_user is not None
    assert found_user.id == created_user.id
    assert found_user.email == "find@example.com"


@pytest.mark.asyncio
async def test_get_by_id(db_session):
    """Test get_by_id returns user when found."""
    repo = UserRepository(db_session)
    
    created_user = await repo.create(
        username="iduser",
        password_hash="$2b$12$hash"
    )
    
    found_user = await repo.get_by_id(created_user.id)
    
    assert found_user is not None
    assert found_user.id == created_user.id
    assert found_user.username == "iduser"


@pytest.mark.asyncio
async def test_set_reset_token_and_clear_reset_token(db_session):
    """Test setting and clearing reset token round-trip."""
    repo = UserRepository(db_session)
    
    user = await repo.create(
        username="resetuser",
        password_hash="$2b$12$hash"
    )
    
    # Set reset token
    token_hash = "abc123hash"
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    
    updated_user = await repo.set_reset_token(user.id, token_hash, expires_at)
    
    assert updated_user.reset_token_hash == token_hash
    # SQLite doesn't preserve timezone info, so compare timestamps without timezone
    assert updated_user.reset_token_expires_at.replace(tzinfo=timezone.utc) == expires_at
    
    # Clear reset token
    cleared_user = await repo.clear_reset_token(user.id)
    
    assert cleared_user.reset_token_hash is None
    assert cleared_user.reset_token_expires_at is None


@pytest.mark.asyncio
async def test_update_password(db_session):
    """Test updating a user's password."""
    repo = UserRepository(db_session)
    
    user = await repo.create(
        username="pwduser",
        password_hash="$2b$12$oldhash"
    )
    
    updated_user = await repo.update_password(user.id, "$2b$12$newhash")
    
    assert updated_user.password_hash == "$2b$12$newhash"
    assert updated_user.id == user.id
