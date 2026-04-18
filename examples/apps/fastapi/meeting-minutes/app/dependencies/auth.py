"""Authentication dependencies for FastAPI routes."""
from typing import Optional
from fastapi import Header, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.config import get_settings
from app.services.auth_service import AuthService
from app.repositories.user_repository import UserRepository
from app.models import User
from app.exceptions import AuthenticationError


async def get_current_user(
    authorization: str = Header(...),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    FastAPI dependency to get the current authenticated user.
    
    Extracts and validates the JWT token from the Authorization header,
    then retrieves the user from the database.
    
    Args:
        authorization: Authorization header value (format: "Bearer {token}")
        db: Database session
        
    Returns:
        User: The authenticated user
        
    Raises:
        HTTPException: 401 if authentication fails
    """
    # Check if Authorization header is present
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Parse Bearer token
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid authentication token")
    
    token = parts[1]
    
    # Validate token and get user
    settings = get_settings()
    auth_service = AuthService(db, settings)
    
    try:
        user_id = auth_service.validate_token(token)
    except AuthenticationError:
        raise HTTPException(status_code=401, detail="Invalid authentication token")
    
    # Fetch user from database
    user_repo = UserRepository(db)
    user = await user_repo.get_by_id(user_id)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid authentication token")
    
    return user


async def optional_user(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    """
    FastAPI dependency to optionally get the current authenticated user.
    
    Similar to get_current_user but returns None instead of raising
    an exception when authentication fails.
    
    Args:
        authorization: Optional Authorization header value (format: "Bearer {token}")
        db: Database session
        
    Returns:
        Optional[User]: The authenticated user or None if authentication fails
    """
    # Return None if no Authorization header
    if not authorization:
        return None
    
    # Parse Bearer token
    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    
    token = parts[1]
    
    # Validate token and get user
    settings = get_settings()
    auth_service = AuthService(db, settings)
    
    try:
        user_id = auth_service.validate_token(token)
    except AuthenticationError:
        return None
    
    # Fetch user from database
    user_repo = UserRepository(db)
    try:
        user = await user_repo.get_by_id(user_id)
        return user
    except Exception:
        return None
