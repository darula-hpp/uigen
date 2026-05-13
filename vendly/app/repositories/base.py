"""
Base repository with common CRUD operations.

This module provides a generic repository pattern implementation for async SQLAlchemy operations.
"""
from typing import TypeVar, Generic, Type, Optional, List, Dict, Any
from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Base


ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    """
    Generic repository providing common CRUD operations for SQLAlchemy models.
    
    This repository implements the Repository pattern to abstract data access logic
    and provide a consistent interface for database operations across all entities.
    
    Type Parameters:
        ModelType: The SQLAlchemy model class this repository operates on
    
    Attributes:
        model: The SQLAlchemy model class
        session: The async database session
    """
    
    def __init__(self, model: Type[ModelType], session: AsyncSession):
        """
        Initialize the repository.
        
        Args:
            model: The SQLAlchemy model class
            session: The async database session
        """
        self.model = model
        self.session = session
    
    async def create(self, **kwargs) -> ModelType:
        """
        Create a new record in the database.
        
        Args:
            **kwargs: Field values for the new record
        
        Returns:
            The created model instance
        
        Example:
            merchant = await repo.create(
                name="John Doe",
                email="john@example.com",
                phone="1234567890"
            )
        """
        instance = self.model(**kwargs)
        self.session.add(instance)
        await self.session.flush()
        await self.session.refresh(instance)
        return instance
    
    async def get_by_id(self, id: int) -> Optional[ModelType]:
        """
        Retrieve a record by its primary key ID.
        
        Args:
            id: The primary key ID
        
        Returns:
            The model instance if found, None otherwise
        
        Example:
            merchant = await repo.get_by_id(1)
        """
        result = await self.session.execute(
            select(self.model).where(self.model.id == id)
        )
        return result.scalar_one_or_none()
    
    async def get_all(
        self,
        limit: Optional[int] = None,
        offset: Optional[int] = None
    ) -> List[ModelType]:
        """
        Retrieve all records with optional pagination.
        
        Args:
            limit: Maximum number of records to return
            offset: Number of records to skip
        
        Returns:
            List of model instances
        
        Example:
            merchants = await repo.get_all(limit=10, offset=0)
        """
        query = select(self.model)
        
        if offset is not None:
            query = query.offset(offset)
        if limit is not None:
            query = query.limit(limit)
        
        result = await self.session.execute(query)
        return list(result.scalars().all())
    
    async def get_by_filters(
        self,
        filters: Dict[str, Any],
        limit: Optional[int] = None,
        offset: Optional[int] = None
    ) -> List[ModelType]:
        """
        Retrieve records matching the specified filters.
        
        Args:
            filters: Dictionary of field names and values to filter by
            limit: Maximum number of records to return
            offset: Number of records to skip
        
        Returns:
            List of model instances matching the filters
        
        Example:
            merchants = await repo.get_by_filters(
                {"email": "john@example.com"},
                limit=10
            )
        """
        query = select(self.model)
        
        # Apply filters
        for field, value in filters.items():
            if hasattr(self.model, field):
                query = query.where(getattr(self.model, field) == value)
        
        if offset is not None:
            query = query.offset(offset)
        if limit is not None:
            query = query.limit(limit)
        
        result = await self.session.execute(query)
        return list(result.scalars().all())
    
    async def update(self, id: int, **kwargs) -> Optional[ModelType]:
        """
        Update a record by its primary key ID.
        
        Args:
            id: The primary key ID
            **kwargs: Field values to update
        
        Returns:
            The updated model instance if found, None otherwise
        
        Example:
            merchant = await repo.update(
                1,
                name="Jane Doe",
                phone="9876543210"
            )
        """
        # First check if the record exists
        instance = await self.get_by_id(id)
        if instance is None:
            return None
        
        # Update the fields
        for field, value in kwargs.items():
            if hasattr(instance, field):
                setattr(instance, field, value)
        
        await self.session.flush()
        await self.session.refresh(instance)
        return instance
    
    async def delete(self, id: int) -> bool:
        """
        Delete a record by its primary key ID.
        
        Args:
            id: The primary key ID
        
        Returns:
            True if the record was deleted, False if not found
        
        Example:
            deleted = await repo.delete(1)
        """
        result = await self.session.execute(
            delete(self.model).where(self.model.id == id)
        )
        return result.rowcount > 0
    
    async def exists(self, id: int) -> bool:
        """
        Check if a record exists by its primary key ID.
        
        Args:
            id: The primary key ID
        
        Returns:
            True if the record exists, False otherwise
        
        Example:
            exists = await repo.exists(1)
        """
        result = await self.session.execute(
            select(self.model.id).where(self.model.id == id)
        )
        return result.scalar_one_or_none() is not None
    
    async def count(self, filters: Optional[Dict[str, Any]] = None) -> int:
        """
        Count records matching optional filters.
        
        Args:
            filters: Optional dictionary of field names and values to filter by
        
        Returns:
            The count of matching records
        
        Example:
            count = await repo.count({"active": True})
        """
        query = select(self.model)
        
        if filters:
            for field, value in filters.items():
                if hasattr(self.model, field):
                    query = query.where(getattr(self.model, field) == value)
        
        result = await self.session.execute(query)
        return len(list(result.scalars().all()))
