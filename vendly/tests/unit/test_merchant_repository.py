"""
Unit tests for MerchantRepository.

Tests merchant-specific data access operations including email uniqueness validation.
"""
import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.repositories.merchant_repository import MerchantRepository
from app.models import Merchant


@pytest.mark.unit
class TestMerchantRepository:
    """Test suite for MerchantRepository operations."""
    
    @pytest.fixture
    async def merchant_repo(self, db_session: AsyncSession):
        """Create a merchant repository for testing."""
        return MerchantRepository(db_session)
    
    async def test_create_merchant(
        self,
        merchant_repo: MerchantRepository,
        db_session: AsyncSession
    ):
        """Test creating a new merchant account."""
        merchant = await merchant_repo.create_merchant(
            name="John Doe",
            email="john@example.com",
            phone="1234567890",
            business_name="John's Business",
            password_hash="hashed_password_123"
        )
        await db_session.commit()
        
        assert merchant.id is not None
        assert merchant.name == "John Doe"
        assert merchant.email == "john@example.com"
        assert merchant.phone == "1234567890"
        assert merchant.business_name == "John's Business"
        assert merchant.password_hash == "hashed_password_123"
        assert merchant.created_at is not None
    
    async def test_create_merchant_duplicate_email(
        self,
        merchant_repo: MerchantRepository,
        db_session: AsyncSession
    ):
        """Test that creating a merchant with duplicate email raises IntegrityError."""
        # Create first merchant
        await merchant_repo.create_merchant(
            name="First Merchant",
            email="duplicate@example.com",
            phone="1111111111",
            business_name="First Business",
            password_hash="hash1"
        )
        await db_session.commit()
        
        # Attempt to create second merchant with same email
        with pytest.raises(IntegrityError):
            await merchant_repo.create_merchant(
                name="Second Merchant",
                email="duplicate@example.com",
                phone="2222222222",
                business_name="Second Business",
                password_hash="hash2"
            )
            await db_session.commit()
    
    async def test_get_merchant_by_id(
        self,
        merchant_repo: MerchantRepository,
        db_session: AsyncSession
    ):
        """Test retrieving a merchant by ID."""
        # Create a merchant
        created = await merchant_repo.create_merchant(
            name="Jane Doe",
            email="jane@example.com",
            phone="9876543210",
            business_name="Jane's Business",
            password_hash="hashed_password"
        )
        await db_session.commit()
        
        # Retrieve by ID
        retrieved = await merchant_repo.get_merchant_by_id(created.id)
        
        assert retrieved is not None
        assert retrieved.id == created.id
        assert retrieved.email == "jane@example.com"
        assert retrieved.name == "Jane Doe"
    
    async def test_get_merchant_by_id_not_found(
        self,
        merchant_repo: MerchantRepository
    ):
        """Test retrieving a non-existent merchant returns None."""
        retrieved = await merchant_repo.get_merchant_by_id(99999)
        assert retrieved is None
    
    async def test_get_merchant_by_email(
        self,
        merchant_repo: MerchantRepository,
        db_session: AsyncSession
    ):
        """Test retrieving a merchant by email address."""
        # Create a merchant
        await merchant_repo.create_merchant(
            name="Alice Smith",
            email="alice@example.com",
            phone="5555555555",
            business_name="Alice Corp",
            password_hash="alice_hash"
        )
        await db_session.commit()
        
        # Retrieve by email
        retrieved = await merchant_repo.get_merchant_by_email("alice@example.com")
        
        assert retrieved is not None
        assert retrieved.email == "alice@example.com"
        assert retrieved.name == "Alice Smith"
        assert retrieved.business_name == "Alice Corp"
    
    async def test_get_merchant_by_email_not_found(
        self,
        merchant_repo: MerchantRepository
    ):
        """Test retrieving a merchant with non-existent email returns None."""
        retrieved = await merchant_repo.get_merchant_by_email("nonexistent@example.com")
        assert retrieved is None
    
    async def test_get_merchant_by_email_case_sensitive(
        self,
        merchant_repo: MerchantRepository,
        db_session: AsyncSession
    ):
        """Test that email lookup is case-sensitive."""
        # Create a merchant with lowercase email
        await merchant_repo.create_merchant(
            name="Bob Jones",
            email="bob@example.com",
            phone="6666666666",
            business_name="Bob Inc",
            password_hash="bob_hash"
        )
        await db_session.commit()
        
        # Try to retrieve with different case
        retrieved_lower = await merchant_repo.get_merchant_by_email("bob@example.com")
        retrieved_upper = await merchant_repo.get_merchant_by_email("BOB@EXAMPLE.COM")
        
        assert retrieved_lower is not None
        # Email lookup should be case-sensitive by default
        assert retrieved_upper is None
    
    async def test_update_merchant(
        self,
        merchant_repo: MerchantRepository,
        db_session: AsyncSession
    ):
        """Test updating merchant information."""
        # Create a merchant
        merchant = await merchant_repo.create_merchant(
            name="Original Name",
            email="original@example.com",
            phone="1234567890",
            business_name="Original Business",
            password_hash="original_hash"
        )
        await db_session.commit()
        
        # Update the merchant
        updated = await merchant_repo.update_merchant(
            merchant.id,
            name="Updated Name",
            phone="9999999999",
            business_name="Updated Business"
        )
        await db_session.commit()
        
        assert updated is not None
        assert updated.id == merchant.id
        assert updated.name == "Updated Name"
        assert updated.phone == "9999999999"
        assert updated.business_name == "Updated Business"
        assert updated.email == "original@example.com"  # Email unchanged
        assert updated.password_hash == "original_hash"  # Password unchanged
    
    async def test_update_merchant_not_found(
        self,
        merchant_repo: MerchantRepository
    ):
        """Test updating a non-existent merchant returns None."""
        updated = await merchant_repo.update_merchant(
            99999,
            name="New Name"
        )
        assert updated is None
    
    async def test_update_merchant_partial(
        self,
        merchant_repo: MerchantRepository,
        db_session: AsyncSession
    ):
        """Test partial update of merchant fields."""
        # Create a merchant
        merchant = await merchant_repo.create_merchant(
            name="Test Merchant",
            email="test@example.com",
            phone="1111111111",
            business_name="Test Business",
            password_hash="test_hash"
        )
        await db_session.commit()
        
        # Update only phone
        updated = await merchant_repo.update_merchant(
            merchant.id,
            phone="2222222222"
        )
        await db_session.commit()
        
        assert updated is not None
        assert updated.phone == "2222222222"
        assert updated.name == "Test Merchant"  # Unchanged
        assert updated.email == "test@example.com"  # Unchanged
        assert updated.business_name == "Test Business"  # Unchanged
    
    async def test_email_exists_true(
        self,
        merchant_repo: MerchantRepository,
        db_session: AsyncSession
    ):
        """Test email_exists returns True for existing email."""
        # Create a merchant
        await merchant_repo.create_merchant(
            name="Existing Merchant",
            email="exists@example.com",
            phone="7777777777",
            business_name="Existing Business",
            password_hash="exists_hash"
        )
        await db_session.commit()
        
        # Check if email exists
        exists = await merchant_repo.email_exists("exists@example.com")
        assert exists is True
    
    async def test_email_exists_false(
        self,
        merchant_repo: MerchantRepository
    ):
        """Test email_exists returns False for non-existent email."""
        exists = await merchant_repo.email_exists("nonexistent@example.com")
        assert exists is False
    
    async def test_email_exists_validation_workflow(
        self,
        merchant_repo: MerchantRepository,
        db_session: AsyncSession
    ):
        """Test typical email validation workflow before registration."""
        email = "newuser@example.com"
        
        # Check email doesn't exist
        exists_before = await merchant_repo.email_exists(email)
        assert exists_before is False
        
        # Create merchant
        await merchant_repo.create_merchant(
            name="New User",
            email=email,
            phone="8888888888",
            business_name="New Business",
            password_hash="new_hash"
        )
        await db_session.commit()
        
        # Check email now exists
        exists_after = await merchant_repo.email_exists(email)
        assert exists_after is True
    
    async def test_merchant_initialization_zero_float(
        self,
        merchant_repo: MerchantRepository,
        db_session: AsyncSession
    ):
        """Test that new merchants are created without float balance field.
        
        Float balance is calculated from transactions, not stored on merchant.
        This test verifies the merchant model structure.
        """
        merchant = await merchant_repo.create_merchant(
            name="Zero Float Merchant",
            email="zerofloat@example.com",
            phone="3333333333",
            business_name="Zero Float Business",
            password_hash="zero_hash"
        )
        await db_session.commit()
        
        # Verify merchant has no float_balance field (it's calculated from transactions)
        assert not hasattr(merchant, 'float_balance')
        assert merchant.id is not None
        assert merchant.created_at is not None
    
    async def test_merchant_unique_identifiers(
        self,
        merchant_repo: MerchantRepository,
        db_session: AsyncSession
    ):
        """Test that each merchant gets a unique identifier."""
        # Create multiple merchants
        merchant1 = await merchant_repo.create_merchant(
            name="Merchant 1",
            email="merchant1@example.com",
            phone="1111111111",
            business_name="Business 1",
            password_hash="hash1"
        )
        merchant2 = await merchant_repo.create_merchant(
            name="Merchant 2",
            email="merchant2@example.com",
            phone="2222222222",
            business_name="Business 2",
            password_hash="hash2"
        )
        merchant3 = await merchant_repo.create_merchant(
            name="Merchant 3",
            email="merchant3@example.com",
            phone="3333333333",
            business_name="Business 3",
            password_hash="hash3"
        )
        await db_session.commit()
        
        # Verify all IDs are unique
        ids = {merchant1.id, merchant2.id, merchant3.id}
        assert len(ids) == 3
        assert None not in ids
    
    async def test_merchant_timestamps(
        self,
        merchant_repo: MerchantRepository,
        db_session: AsyncSession
    ):
        """Test that merchant timestamps are set correctly."""
        merchant = await merchant_repo.create_merchant(
            name="Timestamp Test",
            email="timestamp@example.com",
            phone="4444444444",
            business_name="Timestamp Business",
            password_hash="timestamp_hash"
        )
        await db_session.commit()
        
        assert merchant.created_at is not None
        # updated_at is None on creation (only set on updates)
        assert merchant.updated_at is None
        
        # Update merchant
        await merchant_repo.update_merchant(
            merchant.id,
            name="Updated Timestamp Test"
        )
        await db_session.commit()
        
        # Refresh to get updated_at
        await db_session.refresh(merchant)
        assert merchant.updated_at is not None
