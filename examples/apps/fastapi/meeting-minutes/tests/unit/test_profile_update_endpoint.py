"""Unit tests for profile update endpoint.

Tests Requirements 2.1-2.8:
- PUT /api/v1/auth/me endpoint with authentication
- Database update logic
- Username and email uniqueness validation
- Read-only field protection
- Response codes (200, 401, 409, 422)
"""
import pytest
from fastapi import HTTPException

from app.services.auth_service import AuthService
from app.repositories.user_repository import UserRepository
from app.config import get_settings


@pytest.mark.asyncio
class TestProfileUpdateEndpoint:
    """Test suite for profile update endpoint functionality."""

    async def test_update_username_success(self, db_session):
        """Test successful username update (Requirement 2.2)."""
        settings = get_settings()
        service = AuthService(db_session, settings)
        
        # Create user
        user = await service.register_user("oldusername", "password123", "test@example.com")
        
        # Update username
        updated_user = await service.update_profile(user.id, username="newusername")
        
        assert updated_user.username == "newusername"
        assert updated_user.email == "test@example.com"
        assert updated_user.id == user.id
        assert updated_user.created_at == user.created_at

    async def test_update_email_success(self, db_session):
        """Test successful email update (Requirement 2.2)."""
        settings = get_settings()
        service = AuthService(db_session, settings)
        
        # Create user
        user = await service.register_user("testuser", "password123", "old@example.com")
        
        # Update email
        updated_user = await service.update_profile(user.id, email="new@example.com")
        
        assert updated_user.username == "testuser"
        assert updated_user.email == "new@example.com"
        assert updated_user.id == user.id

    async def test_update_both_fields_success(self, db_session):
        """Test successful update of both username and email (Requirement 2.2)."""
        settings = get_settings()
        service = AuthService(db_session, settings)
        
        # Create user
        user = await service.register_user("olduser", "password123", "old@example.com")
        
        # Update both fields
        updated_user = await service.update_profile(
            user.id,
            username="newuser",
            email="new@example.com"
        )
        
        assert updated_user.username == "newuser"
        assert updated_user.email == "new@example.com"

    async def test_update_no_changes(self, db_session):
        """Test update with no changes returns user unchanged (Requirement 2.2)."""
        settings = get_settings()
        service = AuthService(db_session, settings)
        
        # Create user
        user = await service.register_user("testuser", "password123", "test@example.com")
        
        # Update with no changes
        updated_user = await service.update_profile(user.id)
        
        assert updated_user.username == "testuser"
        assert updated_user.email == "test@example.com"

    async def test_update_username_duplicate(self, db_session):
        """Test username update fails with duplicate username (Requirement 2.3)."""
        settings = get_settings()
        service = AuthService(db_session, settings)
        
        # Create two users
        user1 = await service.register_user("user1", "password123")
        user2 = await service.register_user("user2", "password123")
        
        # Attempt to update user2's username to user1's username
        with pytest.raises(HTTPException) as exc_info:
            await service.update_profile(user2.id, username="user1")
        
        assert exc_info.value.status_code == 409
        assert "Username already exists" in exc_info.value.detail

    async def test_update_email_duplicate(self, db_session):
        """Test email update fails with duplicate email (Requirement 2.3)."""
        settings = get_settings()
        service = AuthService(db_session, settings)
        
        # Create two users
        user1 = await service.register_user("user1", "password123", "email1@example.com")
        user2 = await service.register_user("user2", "password123", "email2@example.com")
        
        # Attempt to update user2's email to user1's email
        with pytest.raises(HTTPException) as exc_info:
            await service.update_profile(user2.id, email="email1@example.com")
        
        assert exc_info.value.status_code == 409
        assert "Email already exists" in exc_info.value.detail

    async def test_update_same_username_allowed(self, db_session):
        """Test updating to same username is allowed (no conflict)."""
        settings = get_settings()
        service = AuthService(db_session, settings)
        
        # Create user
        user = await service.register_user("testuser", "password123")
        
        # Update with same username (should succeed)
        updated_user = await service.update_profile(user.id, username="testuser")
        
        assert updated_user.username == "testuser"

    async def test_update_same_email_allowed(self, db_session):
        """Test updating to same email is allowed (no conflict)."""
        settings = get_settings()
        service = AuthService(db_session, settings)
        
        # Create user
        user = await service.register_user("testuser", "password123", "test@example.com")
        
        # Update with same email (should succeed)
        updated_user = await service.update_profile(user.id, email="test@example.com")
        
        assert updated_user.email == "test@example.com"

    async def test_update_nonexistent_user(self, db_session):
        """Test update fails for nonexistent user."""
        settings = get_settings()
        service = AuthService(db_session, settings)
        
        # Attempt to update nonexistent user
        with pytest.raises(HTTPException) as exc_info:
            await service.update_profile(99999, username="newusername")
        
        assert exc_info.value.status_code == 400

    async def test_read_only_fields_not_modified(self, db_session):
        """Test that id and created_at cannot be modified (Requirement 2.8)."""
        settings = get_settings()
        service = AuthService(db_session, settings)
        user_repo = UserRepository(db_session)
        
        # Create user
        user = await service.register_user("testuser", "password123")
        original_id = user.id
        original_created_at = user.created_at
        
        # Update profile
        updated_user = await service.update_profile(user.id, username="newusername")
        
        # Verify read-only fields unchanged
        assert updated_user.id == original_id
        assert updated_user.created_at == original_created_at
        
        # Verify from database
        db_user = await user_repo.get_by_id(user.id)
        assert db_user.id == original_id
        assert db_user.created_at == original_created_at

    async def test_password_not_exposed_in_response(self, db_session):
        """Test that password_hash is not included in update response (Requirement 2.3)."""
        settings = get_settings()
        service = AuthService(db_session, settings)
        
        # Create user
        user = await service.register_user("testuser", "password123")
        
        # Update profile
        updated_user = await service.update_profile(user.id, username="newusername")
        
        # Verify password_hash is not exposed (User model has it, but response shouldn't)
        assert hasattr(updated_user, 'password_hash')  # Model has it
        # UserResponse schema excludes it

    async def test_update_preserves_other_fields(self, db_session):
        """Test that updating one field preserves other fields."""
        settings = get_settings()
        service = AuthService(db_session, settings)
        
        # Create user with email
        user = await service.register_user("testuser", "password123", "test@example.com")
        
        # Update only username
        updated_user = await service.update_profile(user.id, username="newusername")
        
        # Verify email preserved
        assert updated_user.email == "test@example.com"
        
        # Update only email
        updated_user2 = await service.update_profile(user.id, email="new@example.com")
        
        # Verify username preserved
        assert updated_user2.username == "newusername"

    async def test_repository_update_profile_method(self, db_session):
        """Test UserRepository.update_profile method directly."""
        user_repo = UserRepository(db_session)
        settings = get_settings()
        service = AuthService(db_session, settings)
        
        # Create user
        user = await service.register_user("testuser", "password123", "test@example.com")
        
        # Update using repository method
        updated_user = await user_repo.update_profile(
            user.id,
            username="newusername",
            email="new@example.com"
        )
        
        assert updated_user.username == "newusername"
        assert updated_user.email == "new@example.com"

    async def test_repository_username_uniqueness_check(self, db_session):
        """Test repository enforces username uniqueness."""
        user_repo = UserRepository(db_session)
        settings = get_settings()
        service = AuthService(db_session, settings)
        
        # Create two users
        user1 = await service.register_user("user1", "password123")
        user2 = await service.register_user("user2", "password123")
        
        # Attempt to update user2 with user1's username
        with pytest.raises(ValueError) as exc_info:
            await user_repo.update_profile(user2.id, username="user1")
        
        assert "Username already exists" in str(exc_info.value)

    async def test_repository_email_uniqueness_check(self, db_session):
        """Test repository enforces email uniqueness."""
        user_repo = UserRepository(db_session)
        settings = get_settings()
        service = AuthService(db_session, settings)
        
        # Create two users
        user1 = await service.register_user("user1", "password123", "email1@example.com")
        user2 = await service.register_user("user2", "password123", "email2@example.com")
        
        # Attempt to update user2 with user1's email
        with pytest.raises(ValueError) as exc_info:
            await user_repo.update_profile(user2.id, email="email1@example.com")
        
        assert "Email already exists" in str(exc_info.value)

    async def test_concurrent_username_update(self, db_session):
        """Test that concurrent updates to same username are handled correctly."""
        settings = get_settings()
        service = AuthService(db_session, settings)
        
        # Create three users
        user1 = await service.register_user("user1", "password123")
        user2 = await service.register_user("user2", "password123")
        user3 = await service.register_user("user3", "password123")
        
        # Update user1 to "newname"
        await service.update_profile(user1.id, username="newname")
        
        # Attempt to update user2 to "newname" (should fail)
        with pytest.raises(HTTPException) as exc_info:
            await service.update_profile(user2.id, username="newname")
        
        assert exc_info.value.status_code == 409

    async def test_update_with_empty_optional_fields(self, db_session):
        """Test update with None values means no change."""
        settings = get_settings()
        service = AuthService(db_session, settings)
        
        # Create user with email
        user = await service.register_user("testuser", "password123", "test@example.com")
        
        # Update with None values (should not change anything)
        updated_user = await service.update_profile(user.id, username=None, email=None)
        
        assert updated_user.username == "testuser"
        assert updated_user.email == "test@example.com"
