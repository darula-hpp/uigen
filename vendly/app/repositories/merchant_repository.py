"""
Merchant repository for data access operations.

This module provides data access methods for merchant entities including
email uniqueness validation and merchant-specific queries.
"""
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.repositories.base import BaseRepository
from app.models import Merchant


class MerchantRepository(BaseRepository[Merchant]):
    """
    Repository for merchant data access operations.
    
    Extends BaseRepository with merchant-specific methods including
    email uniqueness validation and merchant lookup by email.
    """
    
    def __init__(self, session: AsyncSession):
        """
        Initialize the merchant repository.
        
        Args:
            session: The async database session
        """
        super().__init__(Merchant, session)
    
    async def create_merchant(
        self,
        name: str,
        email: str,
        phone: str,
        business_name: str,
        password_hash: str
    ) -> Merchant:
        """
        Create a new merchant account.
        
        Args:
            name: Merchant's full name
            email: Merchant's email address (must be unique)
            phone: Merchant's phone number
            business_name: Merchant's business name
            password_hash: Hashed password for authentication
        
        Returns:
            The created merchant instance
        
        Raises:
            IntegrityError: If email already exists
        
        Example:
            merchant = await repo.create_merchant(
                name="John Doe",
                email="john@example.com",
                phone="1234567890",
                business_name="John's Business",
                password_hash="hashed_password"
            )
        """
        return await self.create(
            name=name,
            email=email,
            phone=phone,
            business_name=business_name,
            password_hash=password_hash
        )
    
    async def get_merchant_by_id(self, merchant_id: int) -> Optional[Merchant]:
        """
        Retrieve a merchant by their ID.
        
        Args:
            merchant_id: The merchant's primary key ID
        
        Returns:
            The merchant instance if found, None otherwise
        
        Example:
            merchant = await repo.get_merchant_by_id(1)
        """
        return await self.get_by_id(merchant_id)
    
    async def get_merchant_by_email(self, email: str) -> Optional[Merchant]:
        """
        Retrieve a merchant by their email address.
        
        Args:
            email: The merchant's email address
        
        Returns:
            The merchant instance if found, None otherwise
        
        Example:
            merchant = await repo.get_merchant_by_email("john@example.com")
        """
        result = await self.session.execute(
            select(Merchant).where(Merchant.email == email)
        )
        return result.scalar_one_or_none()
    
    async def update_merchant(
        self,
        merchant_id: int,
        **kwargs
    ) -> Optional[Merchant]:
        """
        Update a merchant's information.
        
        Args:
            merchant_id: The merchant's primary key ID
            **kwargs: Field values to update
        
        Returns:
            The updated merchant instance if found, None otherwise
        
        Example:
            merchant = await repo.update_merchant(
                1,
                name="Jane Doe",
                phone="9876543210"
            )
        """
        return await self.update(merchant_id, **kwargs)
    
    async def email_exists(self, email: str) -> bool:
        """
        Check if an email address is already registered.
        
        This method validates email uniqueness before merchant registration.
        
        Args:
            email: The email address to check
        
        Returns:
            True if email exists, False otherwise
        
        Example:
            exists = await repo.email_exists("john@example.com")
            if exists:
                raise ValueError("Email already registered")
        """
        merchant = await self.get_merchant_by_email(email)
        return merchant is not None
