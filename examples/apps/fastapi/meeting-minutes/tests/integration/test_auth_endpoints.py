"""Integration tests for authentication endpoints."""
import pytest
import pytest_asyncio
import jwt
from datetime import datetime, timedelta, timezone
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.database import get_db
from app.config import get_settings


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


# Task 11.1: Sign-up endpoint tests


@pytest.mark.asyncio
async def test_signup_success_returns_201_with_user_response(client: AsyncClient):
    """Test successful registration returns 201 with UserResponse (no password_hash)."""
    response = await client.post(
        "/api/v1/auth/sign-up",
        json={
            "username": "testuser",
            "password": "password123",
            "email": "test@example.com"
        }
    )
    
    assert response.status_code == 201
    data = response.json()
    assert "id" in data
    assert data["username"] == "testuser"
    assert data["email"] == "test@example.com"
    assert "created_at" in data
    assert "password_hash" not in data
    assert "password" not in data


@pytest.mark.asyncio
async def test_signup_duplicate_username_returns_400(client: AsyncClient):
    """Test duplicate username returns 400."""
    # Create first user
    await client.post(
        "/api/v1/auth/sign-up",
        json={
            "username": "duplicate",
            "password": "password123"
        }
    )
    
    # Attempt to create second user with same username
    response = await client.post(
        "/api/v1/auth/sign-up",
        json={
            "username": "duplicate",
            "password": "different456"
        }
    )
    
    assert response.status_code == 400
    data = response.json()
    assert "error" in data
    assert "Username already exists" in data["error"]


@pytest.mark.asyncio
async def test_signup_short_password_returns_400(client: AsyncClient):
    """Test short password returns 400."""
    response = await client.post(
        "/api/v1/auth/sign-up",
        json={
            "username": "testuser",
            "password": "short"  # Less than 8 characters
        }
    )
    
    assert response.status_code == 400
    data = response.json()
    assert "error" in data


@pytest.mark.asyncio
async def test_signup_short_username_returns_400(client: AsyncClient):
    """Test short username returns 400."""
    response = await client.post(
        "/api/v1/auth/sign-up",
        json={
            "username": "ab",  # Less than 3 characters
            "password": "password123"
        }
    )
    
    assert response.status_code == 400
    data = response.json()
    assert "error" in data


# Task 11.2: Login endpoint tests


@pytest.mark.asyncio
async def test_login_success_returns_200_with_token(client: AsyncClient):
    """Test successful login returns 200 with access_token and token_type: bearer."""
    # Create user first
    await client.post(
        "/api/v1/auth/sign-up",
        json={
            "username": "loginuser",
            "password": "password123"
        }
    )
    
    # Login
    response = await client.post(
        "/api/v1/auth/login",
        json={
            "username": "loginuser",
            "password": "password123"
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert isinstance(data["access_token"], str)
    assert len(data["access_token"]) > 0


@pytest.mark.asyncio
async def test_login_unknown_username_returns_401(client: AsyncClient):
    """Test unknown username returns 401 with message 'Invalid username or password'."""
    response = await client.post(
        "/api/v1/auth/login",
        json={
            "username": "nonexistent",
            "password": "password123"
        }
    )
    
    assert response.status_code == 401
    data = response.json()
    assert "error" in data
    assert data["error"] == "Invalid username or password"


@pytest.mark.asyncio
async def test_login_wrong_password_returns_401(client: AsyncClient):
    """Test wrong password returns 401 with message 'Invalid username or password'."""
    # Create user first
    await client.post(
        "/api/v1/auth/sign-up",
        json={
            "username": "wrongpassuser",
            "password": "correctpass123"
        }
    )
    
    # Login with wrong password
    response = await client.post(
        "/api/v1/auth/login",
        json={
            "username": "wrongpassuser",
            "password": "wrongpass456"
        }
    )
    
    assert response.status_code == 401
    data = response.json()
    assert "error" in data
    assert data["error"] == "Invalid username or password"


# Task 11.3: /me endpoint tests


@pytest.mark.asyncio
async def test_me_authenticated_returns_current_user(client: AsyncClient):
    """Test authenticated request returns current user."""
    # Create user and login
    await client.post(
        "/api/v1/auth/sign-up",
        json={
            "username": "meuser",
            "password": "password123",
            "email": "me@example.com"
        }
    )
    
    login_response = await client.post(
        "/api/v1/auth/login",
        json={
            "username": "meuser",
            "password": "password123"
        }
    )
    token = login_response.json()["access_token"]
    
    # Call /me endpoint
    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "meuser"
    assert data["email"] == "me@example.com"
    assert "password_hash" not in data


@pytest.mark.asyncio
async def test_me_missing_authorization_returns_401(client: AsyncClient):
    """Test missing Authorization header returns 401 with 'Not authenticated'."""
    response = await client.get("/api/v1/auth/me")
    
    assert response.status_code == 401
    data = response.json()
    assert "error" in data
    assert data["error"] == "Not authenticated"


@pytest.mark.asyncio
async def test_me_invalid_token_returns_401(client: AsyncClient):
    """Test invalid token returns 401 with 'Invalid authentication token'."""
    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer invalid.token.here"}
    )
    
    assert response.status_code == 401
    data = response.json()
    assert "error" in data
    assert data["error"] == "Invalid authentication token"


@pytest.mark.asyncio
async def test_me_expired_token_returns_401(client: AsyncClient):
    """Test expired token returns 401 with 'Authentication token has expired'."""
    settings = get_settings()
    
    # Create an expired token manually
    utcnow = datetime.now(timezone.utc)
    payload = {
        "sub": "999",
        "exp": utcnow - timedelta(seconds=1),  # Expired 1 second ago
        "iat": utcnow - timedelta(hours=25),
        "type": "access"
    }
    expired_token = jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")
    
    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {expired_token}"}
    )
    
    assert response.status_code == 401
    data = response.json()
    assert "error" in data
    assert data["error"] == "Authentication token has expired"


# Task 11.4: Password reset endpoint tests


@pytest.mark.asyncio
async def test_password_reset_returns_success_for_existing_user(client: AsyncClient):
    """Test POST /api/v1/auth/password-reset returns success for existing user."""
    # Create user
    await client.post(
        "/api/v1/auth/sign-up",
        json={
            "username": "resetuser",
            "password": "oldpassword123"
        }
    )
    
    # Request password reset
    response = await client.post(
        "/api/v1/auth/password-reset",
        json={"username": "resetuser"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "reset token has been issued" in data["message"].lower()


@pytest.mark.asyncio
async def test_password_reset_returns_success_for_nonexisting_user(client: AsyncClient):
    """Test POST /api/v1/auth/password-reset returns success for non-existing user."""
    # Request password reset for non-existent user
    response = await client.post(
        "/api/v1/auth/password-reset",
        json={"username": "nonexistent"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    # Same response as existing user to prevent enumeration
    assert "reset token has been issued" in data["message"].lower()


@pytest.mark.asyncio
async def test_password_reset_confirm_with_valid_token_updates_password(
    client: AsyncClient,
    db_session: AsyncSession
):
    """Test POST /api/v1/auth/password-reset/confirm with valid token updates password."""
    # Create user
    await client.post(
        "/api/v1/auth/sign-up",
        json={
            "username": "confirmuser",
            "password": "oldpassword123"
        }
    )
    
    # Request password reset (this generates a token in the database)
    await client.post(
        "/api/v1/auth/password-reset",
        json={"username": "confirmuser"}
    )
    
    # Get the reset token from the database
    from app.repositories.user_repository import UserRepository
    user_repo = UserRepository(db_session)
    user = await user_repo.get_by_username("confirmuser")
    
    # Generate a valid reset token for this user
    from app.services.auth_service import AuthService
    settings = get_settings()
    auth_service = AuthService(db_session, settings)
    reset_token = auth_service.create_reset_token(user.id)
    
    # Store the token hash in the database (simulating the reset request)
    import hashlib
    token_hash = hashlib.sha256(reset_token.encode("utf-8")).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    await user_repo.set_reset_token(user.id, token_hash, expires_at)
    await db_session.commit()
    
    # Confirm password reset
    response = await client.post(
        "/api/v1/auth/password-reset/confirm",
        json={
            "token": reset_token,
            "new_password": "newpassword456"
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "password updated" in data["message"].lower()
    
    # Verify can login with new password
    login_response = await client.post(
        "/api/v1/auth/login",
        json={
            "username": "confirmuser",
            "password": "newpassword456"
        }
    )
    assert login_response.status_code == 200


@pytest.mark.asyncio
async def test_password_reset_confirm_with_invalid_token_returns_400(client: AsyncClient):
    """Test confirm with invalid token returns 400."""
    response = await client.post(
        "/api/v1/auth/password-reset/confirm",
        json={
            "token": "invalid.token.here",
            "new_password": "newpassword456"
        }
    )
    
    assert response.status_code == 400
    data = response.json()
    assert "error" in data
    assert "invalid or expired" in data["error"].lower()
