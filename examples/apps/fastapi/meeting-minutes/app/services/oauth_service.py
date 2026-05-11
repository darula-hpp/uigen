"""Service for OAuth authentication business logic."""
import secrets
import logging
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
import httpx

from app.config import Settings
from app.repositories.user_repository import UserRepository
from app.services.auth_service import AuthService
from app.models import User

logger = logging.getLogger(__name__)


class OAuthService:
    """Service for managing OAuth authentication operations."""
    
    def __init__(
        self,
        session: AsyncSession,
        settings: Settings,
        http_client: httpx.AsyncClient
    ):
        """
        Initialize the OAuth service.
        
        Args:
            session: Async SQLAlchemy session
            settings: Application settings
            http_client: Async HTTP client for external API calls
        """
        self.session = session
        self.settings = settings
        self.http_client = http_client
    
    async def exchange_code_for_token(
        self,
        code: str,
        redirect_uri: str
    ) -> Dict[str, Any]:
        """
        Exchange authorization code for access token.
        
        Makes POST request to https://oauth2.googleapis.com/token
        with code, client_id, client_secret, redirect_uri, grant_type.
        
        Args:
            code: Authorization code from Google
            redirect_uri: Redirect URI used in the authorization request
            
        Returns:
            Dict with access_token, id_token, expires_in
            
        Raises:
            HTTPException(401): On failure or timeout
            HTTPException(504): On timeout
        """
        token_url = "https://oauth2.googleapis.com/token"
        
        payload = {
            "code": code,
            "client_id": self.settings.GOOGLE_CLIENT_ID,
            "client_secret": self.settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code"
        }
        
        try:
            response = await self.http_client.post(
                token_url,
                data=payload,
                timeout=30.0
            )
            
            if response.status_code != 200:
                logger.error(
                    "Token exchange failed",
                    extra={
                        "status_code": response.status_code,
                        "error": response.text
                    }
                )
                raise HTTPException(
                    status_code=401,
                    detail="Failed to exchange authorization code"
                )
            
            token_data = response.json()
            
            if "access_token" not in token_data:
                logger.error("Token response missing access_token field")
                raise HTTPException(
                    status_code=401,
                    detail="Failed to exchange authorization code"
                )
            
            return token_data
            
        except httpx.TimeoutException:
            logger.error("Token exchange timeout")
            raise HTTPException(
                status_code=504,
                detail="Token exchange timeout"
            )
        except httpx.RequestError as e:
            logger.error(f"Token exchange request error: {str(e)}")
            raise HTTPException(
                status_code=504,
                detail="Unable to connect to Google"
            )
    
    async def get_user_info(self, access_token: str) -> Dict[str, Any]:
        """
        Retrieve user profile from Google.
        
        Makes GET request to https://www.googleapis.com/oauth2/v2/userinfo
        with Bearer token authorization.
        
        Args:
            access_token: Google access token
            
        Returns:
            Dict with email, name, picture
            
        Raises:
            HTTPException(401): On failure or timeout
            HTTPException(400): If email not provided
            HTTPException(504): On timeout
        """
        user_info_url = "https://www.googleapis.com/oauth2/v2/userinfo"
        
        headers = {
            "Authorization": f"Bearer {access_token}"
        }
        
        try:
            response = await self.http_client.get(
                user_info_url,
                headers=headers,
                timeout=10.0
            )
            
            if response.status_code != 200:
                logger.error(
                    "User info retrieval failed",
                    extra={
                        "status_code": response.status_code,
                        "error": response.text
                    }
                )
                raise HTTPException(
                    status_code=401,
                    detail="Failed to retrieve user information"
                )
            
            user_info = response.json()
            
            if "email" not in user_info:
                logger.error("User info response missing email field")
                raise HTTPException(
                    status_code=400,
                    detail="Email not provided by Google"
                )
            
            return user_info
            
        except httpx.TimeoutException:
            logger.error("User info retrieval timeout")
            raise HTTPException(
                status_code=504,
                detail="User info retrieval timeout"
            )
        except httpx.RequestError as e:
            logger.error(f"User info request error: {str(e)}")
            raise HTTPException(
                status_code=401,
                detail="Failed to retrieve user information from Google"
            )
    
    def _sanitize_username(self, email: str) -> str:
        """
        Extract and sanitize username from email.
        
        Examples:
        - john.doe@gmail.com -> john_doe
        - jane+work@example.com -> jane
        - user123@domain.co.uk -> user123
        
        Args:
            email: Email address
            
        Returns:
            Sanitized username
        """
        local_part = email.split("@")[0]
        # Remove + and everything after it
        username = local_part.split("+")[0]
        # Replace dots with underscores
        username = username.replace(".", "_")
        # Remove non-alphanumeric characters except underscore
        username = "".join(c for c in username if c.isalnum() or c == "_")
        # Truncate to 50 characters (database constraint)
        return username[:50]
    
    async def _ensure_unique_username(
        self,
        base_username: str,
        user_repo: UserRepository
    ) -> str:
        """
        Ensure username is unique by appending numeric suffix if needed.
        
        Examples:
        - john_doe -> john_doe (if available)
        - john_doe -> john_doe_1 (if john_doe exists)
        - john_doe -> john_doe_2 (if john_doe and john_doe_1 exist)
        
        Args:
            base_username: Base username to make unique
            user_repo: User repository instance
            
        Returns:
            Unique username
            
        Raises:
            ValueError: If unable to generate unique username after 1000 attempts
        """
        username = base_username
        suffix = 1
        
        while await user_repo.get_by_username(username):
            username = f"{base_username}_{suffix}"
            suffix += 1
            
            # Prevent infinite loop
            if suffix > 1000:
                raise ValueError("Unable to generate unique username")
        
        return username
    
    async def get_or_create_user(
        self,
        email: str,
        name: str
    ) -> User:
        """
        Find existing user by email or create new OAuth user.
        
        For new users:
        - Username: sanitized email prefix (add suffix if exists)
        - Email: Google email
        - Password hash: random 32-char string (prevents credential login)
        
        Args:
            email: Google email address
            name: User's full name from Google
            
        Returns:
            User instance
            
        Raises:
            HTTPException(409): If email exists with different username
            HTTPException(500): On database errors
        """
        user_repo = UserRepository(self.session)
        
        # Check if user already exists by email
        existing_user = await user_repo.get_by_email(email)
        if existing_user:
            logger.info(
                "Existing OAuth user login",
                extra={
                    "user_id": existing_user.id,
                    "email": email
                }
            )
            return existing_user
        
        # Create new OAuth user
        try:
            # Generate username from email
            base_username = self._sanitize_username(email)
            username = await self._ensure_unique_username(base_username, user_repo)
            
            # Generate random password hash to prevent credential login
            oauth_password_hash = secrets.token_urlsafe(32)
            
            # Create user
            user = await user_repo.create(
                username=username,
                password_hash=oauth_password_hash,
                email=email
            )
            
            logger.info(
                "New OAuth user created",
                extra={
                    "user_id": user.id,
                    "username": username,
                    "email": email
                }
            )
            
            return user
            
        except Exception as e:
            logger.error(
                "Failed to create OAuth user",
                extra={
                    "email": email,
                    "error": str(e)
                }
            )
            raise HTTPException(
                status_code=500,
                detail="Failed to create user account"
            )
    
    async def complete_oauth_flow(
        self,
        code: str,
        redirect_uri: str
    ) -> str:
        """
        Complete full OAuth flow and return JWT token.
        
        Orchestrates: token exchange -> user info -> user creation -> JWT generation
        
        Args:
            code: Authorization code from Google
            redirect_uri: Redirect URI used in the authorization request
            
        Returns:
            JWT access token string
            
        Raises:
            Various HTTPException based on failure point
        """
        # Exchange code for access token
        token_data = await self.exchange_code_for_token(code, redirect_uri)
        access_token = token_data["access_token"]
        
        # Get user info from Google
        user_info = await self.get_user_info(access_token)
        email = user_info["email"]
        name = user_info.get("name", email)
        
        # Get or create user
        user = await self.get_or_create_user(email, name)
        
        # Generate JWT token using AuthService
        auth_service = AuthService(self.session, self.settings)
        jwt_token = auth_service.create_access_token(user.id)
        
        logger.info(
            "OAuth authentication successful",
            extra={
                "user_id": user.id,
                "username": user.username
            }
        )
        
        return jwt_token
