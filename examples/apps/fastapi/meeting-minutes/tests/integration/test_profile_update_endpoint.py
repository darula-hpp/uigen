"""Integration tests for profile update endpoint.

Tests Requirements 2.1-2.8:
- PUT /api/v1/auth/me endpoint with authentication
- HTTP response codes (200, 401, 409, 422)
- Full request/response cycle
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.database import get_db


@pytest_asyncio.fixture
async def client(db_session: AsyncSession):
    """Create test client with database override."""
    async def override_get_db():
        yield db_session
    
    app.dependency_overrides[get_db] = override_get_db
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def authenticated_user(client: AsyncClient):
    """Create a user and return authentication token."""
    # Register user
    signup_response = await client.post(
        "/api/v1/auth/sign-up",
        json={
            "username": "testuser",
            "password": "password123",
            "email": "test@example.com"
        }
    )
    assert signup_response.status_code == 201
    
    # Login to get token
    login_response = await client.post(
        "/api/v1/auth/login",
        json={
            "username": "testuser",
            "password": "password123"
        }
    )
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    
    return {"token": token, "user": signup_response.json()}


@pytest.mark.asyncio
class TestProfileUpdateEndpointIntegration:
    """Integration tests for PUT /api/v1/auth/me endpoint."""

    async def test_update_username_success_returns_200(self, client: AsyncClient, authenticated_user):
        """Test successful username update returns 200 with updated user (Requirement 2.1, 2.2, 2.3)."""
        token = authenticated_user["token"]
        
        response = await client.put(
            "/api/v1/auth/me",
            json={"username": "newusername"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "newusername"
        assert data["email"] == "test@example.com"
        assert "id" in data
        assert "created_at" in data
        assert "password_hash" not in data

    async def test_update_email_success_returns_200(self, client: AsyncClient, authenticated_user):
        """Test successful email update returns 200 (Requirement 2.2, 2.3)."""
        token = authenticated_user["token"]
        
        response = await client.put(
            "/api/v1/auth/me",
            json={"email": "newemail@example.com"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "testuser"
        assert data["email"] == "newemail@example.com"

    async def test_update_both_fields_success(self, client: AsyncClient, authenticated_user):
        """Test updating both username and email (Requirement 2.2)."""
        token = authenticated_user["token"]
        
        response = await client.put(
            "/api/v1/auth/me",
            json={
                "username": "newusername",
                "email": "newemail@example.com"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "newusername"
        assert data["email"] == "newemail@example.com"

    async def test_update_without_auth_returns_401(self, client: AsyncClient):
        """Test update without authentication returns 401 (Requirement 2.5)."""
        response = await client.put(
            "/api/v1/auth/me",
            json={"username": "newusername"}
        )
        
        assert response.status_code == 401

    async def test_update_with_invalid_token_returns_401(self, client: AsyncClient):
        """Test update with invalid token returns 401 (Requirement 2.5)."""
        response = await client.put(
            "/api/v1/auth/me",
            json={"username": "newusername"},
            headers={"Authorization": "Bearer invalid_token"}
        )
        
        assert response.status_code == 401

    async def test_update_duplicate_username_returns_409(self, client: AsyncClient, authenticated_user):
        """Test duplicate username returns 409 (Requirement 2.3)."""
        token = authenticated_user["token"]
        
        # Create another user
        await client.post(
            "/api/v1/auth/sign-up",
            json={
                "username": "otheruser",
                "password": "password123"
            }
        )
        
        # Attempt to update to existing username
        response = await client.put(
            "/api/v1/auth/me",
            json={"username": "otheruser"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 409
        data = response.json()
        assert "error" in data
        assert "Username already exists" in data["error"]

    async def test_update_duplicate_email_returns_409(self, client: AsyncClient, authenticated_user):
        """Test duplicate email returns 409 (Requirement 2.3)."""
        token = authenticated_user["token"]
        
        # Create another user with email
        await client.post(
            "/api/v1/auth/sign-up",
            json={
                "username": "otheruser",
                "password": "password123",
                "email": "other@example.com"
            }
        )
        
        # Attempt to update to existing email
        response = await client.put(
            "/api/v1/auth/me",
            json={"email": "other@example.com"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 409
        data = response.json()
        assert "error" in data
        assert "Email already exists" in data["error"]

    async def test_update_invalid_username_returns_422(self, client: AsyncClient, authenticated_user):
        """Test invalid username returns 400 for validation errors (Requirement 2.4, 2.7)."""
        token = authenticated_user["token"]
        
        # Username too short
        response = await client.put(
            "/api/v1/auth/me",
            json={"username": "ab"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 400

    async def test_update_invalid_username_pattern_returns_422(self, client: AsyncClient, authenticated_user):
        """Test invalid username pattern returns 400 for validation errors (Requirement 2.4, 2.6)."""
        token = authenticated_user["token"]
        
        # Username with invalid characters
        response = await client.put(
            "/api/v1/auth/me",
            json={"username": "user-name"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 400

    async def test_update_invalid_email_returns_422(self, client: AsyncClient, authenticated_user):
        """Test invalid email format returns 400 for validation errors (Requirement 2.4, 2.6)."""
        token = authenticated_user["token"]
        
        response = await client.put(
            "/api/v1/auth/me",
            json={"email": "not-an-email"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 400

    async def test_update_preserves_read_only_fields(self, client: AsyncClient, authenticated_user):
        """Test that id and created_at cannot be modified (Requirement 2.8)."""
        token = authenticated_user["token"]
        original_user = authenticated_user["user"]
        
        # Update username
        response = await client.put(
            "/api/v1/auth/me",
            json={"username": "newusername"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify read-only fields unchanged
        assert data["id"] == original_user["id"]
        assert data["created_at"] == original_user["created_at"]

    async def test_update_no_changes_returns_200(self, client: AsyncClient, authenticated_user):
        """Test update with no changes returns 200 (Requirement 2.2)."""
        token = authenticated_user["token"]
        
        response = await client.put(
            "/api/v1/auth/me",
            json={},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "testuser"
        assert data["email"] == "test@example.com"

    async def test_get_me_returns_updated_profile(self, client: AsyncClient, authenticated_user):
        """Test GET /api/v1/auth/me returns updated profile after update."""
        token = authenticated_user["token"]
        
        # Update profile
        await client.put(
            "/api/v1/auth/me",
            json={"username": "updateduser"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Get profile
        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "updateduser"

    async def test_update_same_username_allowed(self, client: AsyncClient, authenticated_user):
        """Test updating to same username is allowed (no conflict)."""
        token = authenticated_user["token"]
        
        response = await client.put(
            "/api/v1/auth/me",
            json={"username": "testuser"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200

    async def test_update_same_email_allowed(self, client: AsyncClient, authenticated_user):
        """Test updating to same email is allowed (no conflict)."""
        token = authenticated_user["token"]
        
        response = await client.put(
            "/api/v1/auth/me",
            json={"email": "test@example.com"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200

    async def test_multiple_updates_in_sequence(self, client: AsyncClient, authenticated_user):
        """Test multiple sequential updates work correctly."""
        token = authenticated_user["token"]
        
        # First update
        response1 = await client.put(
            "/api/v1/auth/me",
            json={"username": "username1"},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response1.status_code == 200
        assert response1.json()["username"] == "username1"
        
        # Second update
        response2 = await client.put(
            "/api/v1/auth/me",
            json={"username": "username2"},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response2.status_code == 200
        assert response2.json()["username"] == "username2"
        
        # Third update
        response3 = await client.put(
            "/api/v1/auth/me",
            json={"email": "updated@example.com"},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response3.status_code == 200
        assert response3.json()["username"] == "username2"
        assert response3.json()["email"] == "updated@example.com"

    async def test_update_after_another_user_takes_username(self, client: AsyncClient, authenticated_user):
        """Test that updating to a username taken by another user fails."""
        token = authenticated_user["token"]
        
        # Create second user
        await client.post(
            "/api/v1/auth/sign-up",
            json={
                "username": "seconduser",
                "password": "password123"
            }
        )
        
        # First user tries to take second user's username
        response = await client.put(
            "/api/v1/auth/me",
            json={"username": "seconduser"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 409
