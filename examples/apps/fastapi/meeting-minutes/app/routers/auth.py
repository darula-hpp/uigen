"""API routes for authentication."""
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.config import get_settings
from app.services.auth_service import AuthService
from app.schemas import (
    UserRegister,
    UserLogin,
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
