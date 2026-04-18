"""User repository for database operations."""
from typing import Optional
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import User


class UserRepository:
    """Repository for user data access operations."""
    
    def __init__(self, session: AsyncSession):
        """
        Initialize user repository.
        
        Args:
            session: Async database session
        """
        self.session = session
    
    async def create(
        self,
        username: str,
        password_hash: str,
        email: Optional[str] = None
    ) -> User:
        """
        Create a new user record.
        
        Args:
            username: User's username
            password_hash: Bcrypt hashed password
            email: Optional email address
            
        Returns:
            User: Created user instance
        """
        user = User(
            username=username,
            password_hash=password_hash,
            email=email
        )
        
        self.session.add(user)
        await self.session.flush()
        await self.session.refresh(user)
        
        return user
    
    async def get_by_id(self, user_id: int) -> Optional[User]:
        """
        Retrieve a user by ID.
        
        Args:
            user_id: User identifier
            
        Returns:
            Optional[User]: User instance or None if not found
        """
        result = await self.session.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()
    
    async def get_by_username(self, username: str) -> Optional[User]:
        """
        Retrieve a user by username.
        
        Args:
            username: Username to search for
            
        Returns:
            Optional[User]: User instance or None if not found
        """
        result = await self.session.execute(
            select(User).where(User.username == username)
        )
        return result.scalar_one_or_none()
    
    async def get_by_email(self, email: str) -> Optional[User]:
        """
        Retrieve a user by email.
        
        Args:
            email: Email address to search for
            
        Returns:
            Optional[User]: User instance or None if not found
        """
        result = await self.session.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()
    
    async def update_password(self, user_id: int, password_hash: str) -> User:
        """
        Update a user's password.
        
        Args:
            user_id: User identifier
            password_hash: New bcrypt hashed password
            
        Returns:
            User: Updated user instance
        """
        user = await self.get_by_id(user_id)
        if not user:
            raise ValueError(f"User with id {user_id} not found")
        
        user.password_hash = password_hash
        await self.session.flush()
        await self.session.refresh(user)
        
        return user
    
    async def set_reset_token(
        self,
        user_id: int,
        token_hash: str,
        expires_at: datetime
    ) -> User:
        """
        Set a password reset token for a user.
        
        Args:
            user_id: User identifier
            token_hash: SHA-256 hash of the reset token
            expires_at: Token expiration timestamp
            
        Returns:
            User: Updated user instance
        """
        user = await self.get_by_id(user_id)
        if not user:
            raise ValueError(f"User with id {user_id} not found")
        
        user.reset_token_hash = token_hash
        user.reset_token_expires_at = expires_at
        await self.session.flush()
        await self.session.refresh(user)
        
        return user
    
    async def clear_reset_token(self, user_id: int) -> User:
        """
        Clear a user's password reset token.
        
        Args:
            user_id: User identifier
            
        Returns:
            User: Updated user instance
        """
        user = await self.get_by_id(user_id)
        if not user:
            raise ValueError(f"User with id {user_id} not found")
        
        user.reset_token_hash = None
        user.reset_token_expires_at = None
        await self.session.flush()
        await self.session.refresh(user)
        
        return user
