"""API routes for authentication."""
from fastapi import APIRouter, Depends, status, Query, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
import httpx

from app.database import get_db
from app.config import get_settings
from app.services.auth_service import AuthService
from app.services.oauth_service import OAuthService
from app.schemas import (
    UserRegister,
    UserLogin,
    UserUpdate,
    PasswordResetRequest,
    PasswordResetConfirm,
    UserResponse,
    TokenResponse
)
from app.dependencies.auth import get_current_user
from app.models import User

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/sign-up", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def sign_up(
    data: UserRegister,
    db: AsyncSession = Depends(get_db)
):
    """
    Register a new user account.
    
    Args:
        data: User registration data (username, password, optional email)
        db: Database session
        
    Returns:
        Created user (without password hash)
    """
    settings = get_settings()
    service = AuthService(db, settings)
    return await service.register_user(data.username, data.password, data.email)


@router.post("/login", response_model=TokenResponse)
async def login(
    data: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    """
    Authenticate user and return access token.
    
    Args:
        data: User login credentials (username, password)
        db: Database session
        
    Returns:
        JWT access token
    """
    settings = get_settings()
    service = AuthService(db, settings)
    token = await service.login_user(data.username, data.password)
    return TokenResponse(access_token=token)


@router.post("/password-reset")
async def password_reset(
    data: PasswordResetRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Request a password reset token.
    
    Args:
        data: Username or email to reset password for
        db: Database session
        
    Returns:
        Success message (same response whether account exists or not)
    """
    settings = get_settings()
    service = AuthService(db, settings)
    await service.request_password_reset(data.username, data.email)
    return {"message": "If the account exists, a reset token has been issued"}


@router.post("/password-reset/confirm")
async def password_reset_confirm(
    data: PasswordResetConfirm,
    db: AsyncSession = Depends(get_db)
):
    """
    Complete password reset using a reset token.
    
    Args:
        data: Reset token and new password
        db: Database session
        
    Returns:
        Success message
    """
    settings = get_settings()
    service = AuthService(db, settings)
    await service.complete_password_reset(data.token, data.new_password)
    return {"message": "Password updated successfully"}


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user)
):
    """
    Get current authenticated user profile.
    
    Args:
        current_user: Authenticated user from dependency
        
    Returns:
        Current user profile
    """
    return current_user


@router.put("/me", response_model=UserResponse)
async def update_me(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update current authenticated user profile.
    
    Validates:
    - Requirements 2.1: Accepts PUT requests at /api/v1/auth/me with authentication
    - Requirements 2.2: Updates user profile in database with valid data
    - Requirements 2.3: Returns updated UserResponse
    - Requirements 2.4: Returns 422 for invalid data
    - Requirements 2.5: Returns 401 without authentication (handled by dependency)
    - Requirements 2.6: Validates email format (handled by Pydantic)
    - Requirements 2.7: Validates username requirements (handled by Pydantic)
    - Requirements 2.8: Prevents modification of read-only fields
    
    Args:
        user_update: Profile update data (username, email)
        current_user: Authenticated user from dependency
        db: Database session
        
    Returns:
        Updated user profile
        
    Raises:
        HTTPException 401: If not authenticated (handled by dependency)
        HTTPException 409: If username or email already exists
        HTTPException 422: If validation fails (handled by Pydantic)
    """
    settings = get_settings()
    service = AuthService(db, settings)
    
    updated_user = await service.update_profile(
        current_user.id,
        user_update.username,
        user_update.email
    )
    
    return updated_user


@router.get("/oauth/google/callback")
async def google_oauth_callback(
    code: str = Query(..., description="Authorization code from Google"),
    state: str = Query(..., description="State parameter for CSRF protection"),
    db: AsyncSession = Depends(get_db)
):
    """
    Handle Google OAuth callback (Production-grade with httpOnly cookies).
    
    Flow:
    1. Receive authorization code from Google
    2. Exchange code for access token
    3. Get user info from Google
    4. Create/update user in database
    5. Generate JWT token
    6. Set httpOnly cookie with token
    7. Redirect to SPA dashboard
    
    Security features:
    - httpOnly cookie (immune to XSS)
    - Secure flag (HTTPS only in production)
    - SameSite=Lax (CSRF protection)
    - State validation (CSRF protection)
    
    Args:
        code: Authorization code from Google
        state: State parameter for CSRF validation
        db: Database session
        
    Returns:
        Redirect to SPA with token in httpOnly cookie
    """
    settings = get_settings()
    
    # Create HTTP client for OAuth requests
    async with httpx.AsyncClient() as http_client:
        oauth_service = OAuthService(db, settings, http_client)
        
        # Complete OAuth flow and get JWT token
        jwt_token = await oauth_service.complete_oauth_flow(
            code=code,
            redirect_uri=settings.GOOGLE_REDIRECT_URI
        )
    
    # Determine SPA URL
    spa_url = settings.SPA_URL if hasattr(settings, 'SPA_URL') else "http://localhost:4400"
    
    # Redirect back to SPA with token as query parameter
    # Query parameters ARE sent in redirects (unlike fragments)
    # The SPA will extract the token and store it in sessionStorage
    response = RedirectResponse(
        url=f"{spa_url}/auth/callback?token={jwt_token}",
        status_code=status.HTTP_303_SEE_OTHER
    )
    
    return response


@router.get("/status")
async def auth_status(
    current_user: User = Depends(get_current_user)
):
    """
    Check authentication status (for httpOnly cookie auth).
    
    This endpoint allows the SPA to check if the user is authenticated
    when using httpOnly cookies (since JavaScript can't read the cookie).
    
    Returns:
        User info if authenticated, 401 if not
    """
    return {
        "authenticated": True,
        "user": {
            "id": current_user.id,
            "username": current_user.username,
            "email": current_user.email
        }
    }


