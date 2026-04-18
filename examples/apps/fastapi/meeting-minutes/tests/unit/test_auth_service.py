"""Unit tests for AuthService."""
import pytest
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException

from app.services.auth_service import AuthService
from app.repositories.user_repository import UserRepository
from app.config import get_settings


@pytest.mark.asyncio
async def test_register_user_success(db_session):
    """Test successful user registration."""
    settings = get_settings()
    service = AuthService(db_session, settings)
    
    user = await service.register_user("testuser", "password123", "test@example.com")
    
    assert user.username == "testuser"
    assert user.email == "test@example.com"
    assert user.password_hash is not None
    assert user.password_hash != "password123"  # Password should be hashed


@pytest.mark.asyncio
async def test_register_user_duplicate_username(db_session):
    """Test registration fails with duplicate username."""
    settings = get_settings()
    service = AuthService(db_session, settings)
    
    # Create first user
    await service.register_user("testuser", "password123")
    
    # Attempt to create duplicate
    with pytest.raises(HTTPException) as exc_info:
        await service.register_user("testuser", "different_password")
    
    assert exc_info.value.status_code == 400
    assert "Username already exists" in exc_info.value.detail


@pytest.mark.asyncio
async def test_login_user_success(db_session):
    """Test successful user login."""
    settings = get_settings()
    service = AuthService(db_session, settings)
    
    # Register user
    user = await service.register_user("testuser", "password123")
    
    # Login
    token = await service.login_user("testuser", "password123")
    
    assert token is not None
    assert isinstance(token, str)
    
    # Verify token contains correct user ID
    user_id = service.validate_token(token)
    assert user_id == user.id


@pytest.mark.asyncio
async def test_login_user_invalid_username(db_session):
    """Test login fails with invalid username."""
    settings = get_settings()
    service = AuthService(db_session, settings)
    
    with pytest.raises(HTTPException) as exc_info:
        await service.login_user("nonexistent", "password123")
    
    assert exc_info.value.status_code == 401
    assert "Invalid username or password" in exc_info.value.detail


@pytest.mark.asyncio
async def test_login_user_invalid_password(db_session):
    """Test login fails with invalid password."""
    settings = get_settings()
    service = AuthService(db_session, settings)
    
    # Register user
    await service.register_user("testuser", "password123")
    
    # Attempt login with wrong password
    with pytest.raises(HTTPException) as exc_info:
        await service.login_user("testuser", "wrongpassword")
    
    assert exc_info.value.status_code == 401
    assert "Invalid username or password" in exc_info.value.detail


@pytest.mark.asyncio
async def test_request_password_reset_existing_user(db_session):
    """Test password reset request for existing user."""
    settings = get_settings()
    service = AuthService(db_session, settings)
    user_repo = UserRepository(db_session)
    
    # Register user
    user = await service.register_user("testuser", "password123", "test@example.com")
    
    # Request password reset by username
    await service.request_password_reset(username="testuser")
    
    # Verify reset token was set
    updated_user = await user_repo.get_by_id(user.id)
    assert updated_user.reset_token_hash is not None
    assert updated_user.reset_token_expires_at is not None
    # SQLite stores timezone-naive datetimes, so we need to handle both cases
    now = datetime.now(timezone.utc)
    if updated_user.reset_token_expires_at.tzinfo is None:
        # Convert to naive for comparison
        now = now.replace(tzinfo=None)
    assert updated_user.reset_token_expires_at > now


@pytest.mark.asyncio
async def test_request_password_reset_by_email(db_session):
    """Test password reset request by email."""
    settings = get_settings()
    service = AuthService(db_session, settings)
    user_repo = UserRepository(db_session)
    
    # Register user
    user = await service.register_user("testuser", "password123", "test@example.com")
    
    # Request password reset by email
    await service.request_password_reset(email="test@example.com")
    
    # Verify reset token was set
    updated_user = await user_repo.get_by_id(user.id)
    assert updated_user.reset_token_hash is not None


@pytest.mark.asyncio
async def test_request_password_reset_nonexistent_user(db_session):
    """Test password reset request for nonexistent user returns silently."""
    settings = get_settings()
    service = AuthService(db_session, settings)
    
    # Should not raise an exception (enumeration prevention)
    await service.request_password_reset(username="nonexistent")
    await service.request_password_reset(email="nonexistent@example.com")


@pytest.mark.asyncio
async def test_complete_password_reset_success(db_session):
    """Test successful password reset completion."""
    settings = get_settings()
    service = AuthService(db_session, settings)
    user_repo = UserRepository(db_session)
    
    # Register user
    user = await service.register_user("testuser", "oldpassword")
    
    # Generate reset token manually
    reset_token = service.create_reset_token(user.id)
    import hashlib
    token_hash = hashlib.sha256(reset_token.encode("utf-8")).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    await user_repo.set_reset_token(user.id, token_hash, expires_at)
    
    # Complete password reset
    await service.complete_password_reset(reset_token, "newpassword")
    
    # Verify password was updated
    token = await service.login_user("testuser", "newpassword")
    assert token is not None
    
    # Verify old password no longer works
    with pytest.raises(HTTPException):
        await service.login_user("testuser", "oldpassword")
    
    # Verify reset token was cleared
    updated_user = await user_repo.get_by_id(user.id)
    assert updated_user.reset_token_hash is None
    assert updated_user.reset_token_expires_at is None


@pytest.mark.asyncio
async def test_complete_password_reset_invalid_token(db_session):
    """Test password reset fails with invalid token."""
    settings = get_settings()
    service = AuthService(db_session, settings)
    
    with pytest.raises(HTTPException) as exc_info:
        await service.complete_password_reset("invalid_token", "newpassword")
    
    assert exc_info.value.status_code == 400
    assert "Invalid or expired reset token" in exc_info.value.detail


@pytest.mark.asyncio
async def test_complete_password_reset_expired_token(db_session):
    """Test password reset fails with expired token."""
    settings = get_settings()
    service = AuthService(db_session, settings)
    user_repo = UserRepository(db_session)
    
    # Register user
    user = await service.register_user("testuser", "oldpassword")
    
    # Generate reset token manually with past expiration
    reset_token = service.create_reset_token(user.id)
    import hashlib
    token_hash = hashlib.sha256(reset_token.encode("utf-8")).hexdigest()
    expires_at = datetime.now(timezone.utc) - timedelta(hours=1)  # Expired
    await user_repo.set_reset_token(user.id, token_hash, expires_at)
    
    # Attempt to complete password reset
    with pytest.raises(HTTPException) as exc_info:
        await service.complete_password_reset(reset_token, "newpassword")
    
    assert exc_info.value.status_code == 400
    assert "Invalid or expired reset token" in exc_info.value.detail


@pytest.mark.asyncio
async def test_complete_password_reset_mismatched_token(db_session):
    """Test password reset fails when token hash doesn't match."""
    import time
    settings = get_settings()
    service = AuthService(db_session, settings)
    user_repo = UserRepository(db_session)
    
    # Register user
    user = await service.register_user("testuser", "oldpassword")
    
    # Generate one reset token
    reset_token1 = service.create_reset_token(user.id)
    
    # Small delay to ensure different timestamp in JWT
    time.sleep(1)
    
    # Store a different token hash
    reset_token2 = service.create_reset_token(user.id)
    import hashlib
    token_hash2 = hashlib.sha256(reset_token2.encode("utf-8")).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    await user_repo.set_reset_token(user.id, token_hash2, expires_at)
    
    # Attempt to use the first token
    with pytest.raises(HTTPException) as exc_info:
        await service.complete_password_reset(reset_token1, "newpassword")
    
    assert exc_info.value.status_code == 400
    assert "Invalid or expired reset token" in exc_info.value.detail


@pytest.mark.asyncio
async def test_password_reset_invalidates_previous_token(db_session):
    """Test that requesting a new reset token invalidates the previous one."""
    import time
    settings = get_settings()
    service = AuthService(db_session, settings)
    user_repo = UserRepository(db_session)
    
    # Register user
    user = await service.register_user("testuser", "password123")
    
    # Request first reset token
    await service.request_password_reset(username="testuser")
    first_user_state = await user_repo.get_by_id(user.id)
    first_token_hash = first_user_state.reset_token_hash
    
    # Wait 1 second to ensure different timestamp in JWT (iat claim has second precision)
    time.sleep(1)
    
    # Request second reset token
    await service.request_password_reset(username="testuser")
    second_user_state = await user_repo.get_by_id(user.id)
    second_token_hash = second_user_state.reset_token_hash
    
    # Verify tokens are different (overwrites previous token)
    assert first_token_hash != second_token_hash
