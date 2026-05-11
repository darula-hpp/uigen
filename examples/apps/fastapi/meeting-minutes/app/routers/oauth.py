"""API routes for OAuth authentication."""
import logging
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
import httpx

from app.database import get_db
from app.config import get_settings, Settings
from app.services.oauth_service import OAuthService
from app.schemas import TokenResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/auth/oauth", tags=["oauth"])


@router.get("/google/callback", response_model=TokenResponse)
async def google_oauth_callback(
    code: Optional[str] = Query(None, description="Authorization code from Google"),
    state: Optional[str] = Query(None, description="CSRF protection token"),
    error: Optional[str] = Query(None, description="Error code if authorization failed"),
    error_description: Optional[str] = Query(None, description="Human-readable error description"),
    db: AsyncSession = Depends(get_db)
):
    """
    Handle OAuth callback from Google.
    
    This endpoint receives the authorization code from Google after user consent
    and completes the OAuth flow by exchanging the code for an access token,
    retrieving user information, creating or finding the user account, and
    generating a JWT token for authentication.
    
    Query Parameters:
        code: Authorization code from Google (required unless error is present)
        state: CSRF protection token (required)
        error: Error code if authorization failed (optional)
        error_description: Human-readable error description (optional)
        
    Returns:
        TokenResponse with access_token and token_type
        
    Raises:
        HTTPException 400: Missing/invalid parameters, user denied access
        HTTPException 401: Token exchange or user info retrieval failed
        HTTPException 504: Timeout during external API calls
        HTTPException 500: Server error
    """
    from fastapi import HTTPException
    
    # Handle authorization errors from Google
    if error:
        error_msg = error_description or "Authorization failed"
        if error == "access_denied":
            error_msg = "Authorization was denied by the user"
        
        logger.warning(
            "OAuth authorization error",
            extra={
                "error": error,
                "error_description": error_description
            }
        )
        
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )
    
    # Validate required parameters
    if not state:
        logger.error("OAuth callback missing state parameter")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing state parameter"
        )
    
    if not code:
        logger.error("OAuth callback missing authorization code")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing authorization code"
        )
    
    # TODO: Validate state parameter against stored value
    # For now, we accept any state parameter
    # In production, implement state validation using Redis or database
    
    # Get settings and create HTTP client
    settings = get_settings()
    
    async with httpx.AsyncClient() as http_client:
        # Create OAuth service
        oauth_service = OAuthService(
            session=db,
            settings=settings,
            http_client=http_client
        )
        
        # Complete OAuth flow
        redirect_uri = settings.GOOGLE_REDIRECT_URI
        jwt_token = await oauth_service.complete_oauth_flow(code, redirect_uri)
        
        return TokenResponse(access_token=jwt_token, token_type="bearer")
