"""Service for authentication business logic."""
import bcrypt
import jwt
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from app.config import Settings
from app.exceptions import TokenExpiredError, InvalidTokenError, AuthenticationError
from app.repositories.user_repository import UserRepository
from app.models import User


class AuthService:
    """Service for managing authentication operations."""
    
    def __init__(
        self,
        session: AsyncSession,
        settings: Settings
    ):
        """
        Initialize the authentication service.
        
        Args:
            session: Async SQLAlchemy session
            settings: Application settings
        """
        self.session = session
        self.settings = settings
    
    def hash_password(self, password: str) -> str:
        """
        Hash a password using bcrypt.
        
        Args:
            password: Plain text password to hash
            
        Returns:
            Bcrypt hashed password as a string
        """
        password_bytes = password.encode("utf-8")
        salt = bcrypt.gensalt(rounds=self.settings.BCRYPT_ROUNDS)
        hashed = bcrypt.hashpw(password_bytes, salt)
        return hashed.decode("utf-8")
    
    def verify_password(self, plain: str, hashed: str) -> bool:
        """
        Verify a password against a bcrypt hash using constant-time comparison.
        
        Args:
            plain: Plain text password to verify
            hashed: Bcrypt hash to verify against
            
        Returns:
            True if password matches hash, False otherwise
        """
        plain_bytes = plain.encode("utf-8")
        hashed_bytes = hashed.encode("utf-8")
        return bcrypt.checkpw(plain_bytes, hashed_bytes)
    
    def create_access_token(self, user_id: int) -> str:
        """
        Create a JWT access token for a user.
        
        Args:
            user_id: The user's ID
            
        Returns:
            Encoded JWT token string
        """
        utcnow = datetime.now(timezone.utc)
        payload = {
            "sub": str(user_id),
            "exp": utcnow + timedelta(hours=self.settings.JWT_EXPIRATION_HOURS),
            "iat": utcnow,
            "type": "access"
        }
        return jwt.encode(payload, self.settings.JWT_SECRET, algorithm="HS256")
    
    def create_reset_token(self, user_id: int) -> str:
        """
        Create a JWT password reset token for a user.
        
        Args:
            user_id: The user's ID
            
        Returns:
            Encoded JWT token string
        """
        utcnow = datetime.now(timezone.utc)
        payload = {
            "sub": str(user_id),
            "exp": utcnow + timedelta(hours=1),
            "iat": utcnow,
            "type": "reset"
        }
        return jwt.encode(payload, self.settings.JWT_SECRET, algorithm="HS256")
    
    def validate_token(self, token: str) -> int:
        """
        Validate a JWT token and extract the user ID.
        
        Args:
            token: JWT token string to validate
            
        Returns:
            User ID extracted from the token
            
        Raises:
            TokenExpiredError: If the token has expired
            InvalidTokenError: If the token is invalid or malformed
        """
        try:
            payload = jwt.decode(token, self.settings.JWT_SECRET, algorithms=["HS256"])
            return int(payload["sub"])
        except jwt.ExpiredSignatureError:
            raise TokenExpiredError("Token has expired")
        except jwt.PyJWTError:
            raise InvalidTokenError("Invalid token")
    
    async def register_user(
        self,
        username: str,
        password: str,
        email: Optional[str] = None
    ) -> User:
        """
        Register a new user.
        
        Args:
            username: User's username
            password: Plain text password
            email: Optional email address
            
        Returns:
            User: Created user instance
            
        Raises:
            HTTPException: If username already exists (400)
        """
        user_repo = UserRepository(self.session)
        
        # Check if username already exists
        existing_user = await user_repo.get_by_username(username)
        if existing_user:
            raise HTTPException(status_code=400, detail="Username already exists")
        
        # Hash password and create user
        password_hash = self.hash_password(password)
        user = await user_repo.create(username, password_hash, email)
        
        return user
    
    async def login_user(self, username: str, password: str) -> str:
        """
        Authenticate a user and return an access token.
        
        Args:
            username: User's username
            password: Plain text password
            
        Returns:
            str: JWT access token
            
        Raises:
            HTTPException: If credentials are invalid (401)
        """
        user_repo = UserRepository(self.session)
        
        # Retrieve user by username
        user = await user_repo.get_by_username(username)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid username or password")
        
        # Verify password
        if not self.verify_password(password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid username or password")
        
        # Generate and return access token
        return self.create_access_token(user.id)
    
    async def request_password_reset(
        self,
        username: Optional[str] = None,
        email: Optional[str] = None
    ) -> None:
        """
        Request a password reset for a user.
        
        Args:
            username: Optional username to look up
            email: Optional email to look up
            
        Note:
            Returns silently if user not found to prevent enumeration
        """
        user_repo = UserRepository(self.session)
        
        # Look up user by username or email
        user = None
        if username:
            user = await user_repo.get_by_username(username)
        elif email:
            user = await user_repo.get_by_email(email)
        
        # Return silently if user not found (prevent enumeration)
        if not user:
            return
        
        # Generate reset token and hash it
        reset_token = self.create_reset_token(user.id)
        token_hash = hashlib.sha256(reset_token.encode("utf-8")).hexdigest()
        
        # Set expiration to 1 hour from now
        expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        
        # Store token hash (overwrites any existing token)
        await user_repo.set_reset_token(user.id, token_hash, expires_at)
    
    async def complete_password_reset(self, token: str, new_password: str) -> None:
        """
        Complete a password reset using a reset token.
        
        Args:
            token: Password reset token
            new_password: New plain text password
            
        Raises:
            HTTPException: If token is invalid or expired (400)
        """
        user_repo = UserRepository(self.session)
        
        # Validate the token and extract user ID
        try:
            user_id = self.validate_token(token)
        except AuthenticationError:
            raise HTTPException(status_code=400, detail="Invalid or expired reset token")
        
        # Retrieve user
        user = await user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=400, detail="Invalid or expired reset token")
        
        # Verify token hash matches and hasn't expired
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        if user.reset_token_hash != token_hash:
            raise HTTPException(status_code=400, detail="Invalid or expired reset token")
        
        if not user.reset_token_expires_at or user.reset_token_expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Invalid or expired reset token")
        
        # Hash new password and update
        new_password_hash = self.hash_password(new_password)
        await user_repo.update_password(user_id, new_password_hash)
        
        # Clear reset token
        await user_repo.clear_reset_token(user_id)

