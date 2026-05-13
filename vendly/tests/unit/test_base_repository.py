"""
Unit tests for BaseRepository.
"""
import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.base import BaseRepository
from app.models import Merchant


@pytest.mark.unit
class TestBaseRepository:
    """Test suite for BaseRepository CRUD operations."""
    
    @pytest.fixture
    async def merchant_repo(self, db_session: AsyncSession):
        """Create a merchant repository for testing."""
        return BaseRepository(Merchant, db_session)
    
    async def test_create(self, merchant_repo: BaseRepository[Merchant], db_session: AsyncSession):
        """Test creating a new record."""
        merchant = await merchant_repo.create(
            name="John Doe",
            email="john@example.com",
            phone="1234567890",
            business_name="John's Business",
            password_hash="hashed_password"
        )
        
        assert merchant.id is not None
        assert merchant.name == "John Doe"
        assert merchant.email == "john@example.com"
        assert merchant.phone == "1234567890"
        assert merchant.business_name == "John's Business"
        assert merchant.created_at is not None
    
    async def test_get_by_id(self, merchant_repo: BaseRepository[Merchant], db_session: AsyncSession):
        """Test retrieving a record by ID."""
        # Create a merchant
        merchant = await merchant_repo.create(
            name="Jane Doe",
            email="jane@example.com",
            phone="9876543210",
            business_name="Jane's Business",
            password_hash="hashed_password"
        )
        await db_session.commit()
        
        # Retrieve by ID
        retrieved = await merchant_repo.get_by_id(merchant.id)
        
        assert retrieved is not None
        assert retrieved.id == merchant.id
        assert retrieved.email == "jane@example.com"
    
    async def test_get_by_id_not_found(self, merchant_repo: BaseRepository[Merchant]):
        """Test retrieving a non-existent record returns None."""
        retrieved = await merchant_repo.get_by_id(99999)
        assert retrieved is None
    
    async def test_get_all(self, merchant_repo: BaseRepository[Merchant], db_session: AsyncSession):
        """Test retrieving all records."""
        # Create multiple merchants
        await merchant_repo.create(
            name="Merchant 1",
            email="merchant1@example.com",
            phone="1111111111",
            business_name="Business 1",
            password_hash="hash1"
        )
        await merchant_repo.create(
            name="Merchant 2",
            email="merchant2@example.com",
            phone="2222222222",
            business_name="Business 2",
            password_hash="hash2"
        )
        await merchant_repo.create(
            name="Merchant 3",
            email="merchant3@example.com",
            phone="3333333333",
            business_name="Business 3",
            password_hash="hash3"
        )
        await db_session.commit()
        
        # Retrieve all
        merchants = await merchant_repo.get_all()
        
        assert len(merchants) >= 3
    
    async def test_get_all_with_pagination(self, merchant_repo: BaseRepository[Merchant], db_session: AsyncSession):
        """Test retrieving records with pagination."""
        # Create multiple merchants
        for i in range(5):
            await merchant_repo.create(
                name=f"Merchant {i}",
                email=f"merchant{i}@example.com",
                phone=f"{i}{i}{i}{i}{i}{i}{i}{i}{i}{i}",
                business_name=f"Business {i}",
                password_hash=f"hash{i}"
            )
        await db_session.commit()
        
        # Test pagination
        page1 = await merchant_repo.get_all(limit=2, offset=0)
        page2 = await merchant_repo.get_all(limit=2, offset=2)
        
        assert len(page1) == 2
        assert len(page2) == 2
        assert page1[0].id != page2[0].id
    
    async def test_get_by_filters(self, merchant_repo: BaseRepository[Merchant], db_session: AsyncSession):
        """Test retrieving records by filters."""
        # Create merchants
        await merchant_repo.create(
            name="Alice",
            email="alice@example.com",
            phone="1111111111",
            business_name="Alice Corp",
            password_hash="hash1"
        )
        await merchant_repo.create(
            name="Bob",
            email="bob@example.com",
            phone="2222222222",
            business_name="Bob Inc",
            password_hash="hash2"
        )
        await db_session.commit()
        
        # Filter by email
        results = await merchant_repo.get_by_filters({"email": "alice@example.com"})
        
        assert len(results) == 1
        assert results[0].name == "Alice"
    
    async def test_update(self, merchant_repo: BaseRepository[Merchant], db_session: AsyncSession):
        """Test updating a record."""
        # Create a merchant
        merchant = await merchant_repo.create(
            name="Original Name",
            email="original@example.com",
            phone="1234567890",
            business_name="Original Business",
            password_hash="hash"
        )
        await db_session.commit()
        
        # Update the merchant
        updated = await merchant_repo.update(
            merchant.id,
            name="Updated Name",
            phone="9999999999"
        )
        await db_session.commit()
        
        assert updated is not None
        assert updated.id == merchant.id
        assert updated.name == "Updated Name"
        assert updated.phone == "9999999999"
        assert updated.email == "original@example.com"  # Unchanged
    
    async def test_update_not_found(self, merchant_repo: BaseRepository[Merchant]):
        """Test updating a non-existent record returns None."""
        updated = await merchant_repo.update(99999, name="New Name")
        assert updated is None
    
    async def test_delete(self, merchant_repo: BaseRepository[Merchant], db_session: AsyncSession):
        """Test deleting a record."""
        # Create a merchant
        merchant = await merchant_repo.create(
            name="To Delete",
            email="delete@example.com",
            phone="1234567890",
            business_name="Delete Business",
            password_hash="hash"
        )
        await db_session.commit()
        
        # Delete the merchant
        deleted = await merchant_repo.delete(merchant.id)
        await db_session.commit()
        
        assert deleted is True
        
        # Verify it's gone
        retrieved = await merchant_repo.get_by_id(merchant.id)
        assert retrieved is None
    
    async def test_delete_not_found(self, merchant_repo: BaseRepository[Merchant]):
        """Test deleting a non-existent record returns False."""
        deleted = await merchant_repo.delete(99999)
        assert deleted is False
    
    async def test_exists(self, merchant_repo: BaseRepository[Merchant], db_session: AsyncSession):
        """Test checking if a record exists."""
        # Create a merchant
        merchant = await merchant_repo.create(
            name="Exists Test",
            email="exists@example.com",
            phone="1234567890",
            business_name="Exists Business",
            password_hash="hash"
        )
        await db_session.commit()
        
        # Check existence
        exists = await merchant_repo.exists(merchant.id)
        assert exists is True
        
        # Check non-existence
        not_exists = await merchant_repo.exists(99999)
        assert not_exists is False
    
    async def test_count(self, merchant_repo: BaseRepository[Merchant], db_session: AsyncSession):
        """Test counting records."""
        # Create merchants
        await merchant_repo.create(
            name="Count 1",
            email="count1@example.com",
            phone="1111111111",
            business_name="Count Business 1",
            password_hash="hash1"
        )
        await merchant_repo.create(
            name="Count 2",
            email="count2@example.com",
            phone="2222222222",
            business_name="Count Business 2",
            password_hash="hash2"
        )
        await db_session.commit()
        
        # Count all
        count = await merchant_repo.count()
        assert count >= 2
    
    async def test_count_with_filters(self, merchant_repo: BaseRepository[Merchant], db_session: AsyncSession):
        """Test counting records with filters."""
        # Create merchants
        await merchant_repo.create(
            name="Filter Count 1",
            email="filtercount1@example.com",
            phone="1111111111",
            business_name="Filter Business",
            password_hash="hash1"
        )
        await merchant_repo.create(
            name="Filter Count 2",
            email="filtercount2@example.com",
            phone="2222222222",
            business_name="Other Business",
            password_hash="hash2"
        )
        await db_session.commit()
        
        # Count with filter
        count = await merchant_repo.count({"business_name": "Filter Business"})
        assert count == 1
