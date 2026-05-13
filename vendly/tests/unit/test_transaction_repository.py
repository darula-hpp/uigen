"""
Unit tests for TransactionRepository.

Tests the transaction repository methods including:
- Transaction creation with validation
- Transaction retrieval by ID and merchant
- Transaction filtering by type, status, date range, and product
- Pagination support
- Float balance calculation from transaction history
"""
import pytest
from decimal import Decimal
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.transaction import TransactionRepository
from app.models import Transaction, Merchant


@pytest.fixture
async def transaction_repo(db_session: AsyncSession):
    """Create a TransactionRepository instance for testing."""
    return TransactionRepository(db_session)


@pytest.fixture
async def test_merchant(db_session: AsyncSession):
    """Create a test merchant for transaction tests."""
    merchant = Merchant(
        name="Test Merchant",
        email="test@example.com",
        phone="1234567890",
        business_name="Test Business",
        password_hash="hashed_password"
    )
    db_session.add(merchant)
    await db_session.flush()
    await db_session.refresh(merchant)
    return merchant


@pytest.mark.unit
class TestTransactionRepository:
    """Test suite for TransactionRepository."""
    
    async def test_create_transaction_deposit(
        self,
        transaction_repo: TransactionRepository,
        test_merchant: Merchant,
        db_session: AsyncSession
    ):
        """Test creating a deposit transaction."""
        transaction = await transaction_repo.create_transaction(
            merchant_id=test_merchant.id,
            transaction_type="deposit",
            amount=Decimal("100.00"),
            float_before=Decimal("0.00"),
            float_after=Decimal("100.00"),
            payment_provider="stripe",
            payment_reference="pi_123456"
        )
        
        assert transaction.id is not None
        assert transaction.merchant_id == test_merchant.id
        assert transaction.transaction_type == "deposit"
        assert transaction.amount == Decimal("100.00")
        assert transaction.float_before == Decimal("0.00")
        assert transaction.float_after == Decimal("100.00")
        assert transaction.status == "completed"
        assert transaction.payment_provider == "stripe"
        assert transaction.payment_reference == "pi_123456"
        assert transaction.created_at is not None
    
    async def test_create_transaction_vending(
        self,
        transaction_repo: TransactionRepository,
        test_merchant: Merchant,
        db_session: AsyncSession
    ):
        """Test creating a vending transaction."""
        transaction = await transaction_repo.create_transaction(
            merchant_id=test_merchant.id,
            transaction_type="vending",
            amount=Decimal("50.00"),
            float_before=Decimal("100.00"),
            float_after=Decimal("50.00"),
            product_id=1,
            vendor_token="vendor_token_123"
        )
        
        assert transaction.transaction_type == "vending"
        assert transaction.amount == Decimal("50.00")
        assert transaction.product_id == 1
        assert transaction.vendor_token == "vendor_token_123"
    
    async def test_create_transaction_cashout(
        self,
        transaction_repo: TransactionRepository,
        test_merchant: Merchant,
        db_session: AsyncSession
    ):
        """Test creating a cashout transaction."""
        transaction = await transaction_repo.create_transaction(
            merchant_id=test_merchant.id,
            transaction_type="cashout",
            amount=Decimal("75.00"),
            float_before=Decimal("50.00"),
            float_after=Decimal("125.00")
        )
        
        assert transaction.transaction_type == "cashout"
        assert transaction.amount == Decimal("75.00")
        assert transaction.float_after == Decimal("125.00")
    
    async def test_create_transaction_commission_payout(
        self,
        transaction_repo: TransactionRepository,
        test_merchant: Merchant,
        db_session: AsyncSession
    ):
        """Test creating a commission payout transaction."""
        transaction = await transaction_repo.create_transaction(
            merchant_id=test_merchant.id,
            transaction_type="commission_payout",
            amount=Decimal("25.00"),
            float_before=Decimal("125.00"),
            float_after=Decimal("150.00")
        )
        
        assert transaction.transaction_type == "commission_payout"
        assert transaction.amount == Decimal("25.00")
    
    async def test_create_transaction_invalid_type(
        self,
        transaction_repo: TransactionRepository,
        test_merchant: Merchant
    ):
        """Test that creating a transaction with invalid type raises ValueError."""
        with pytest.raises(ValueError, match="Invalid transaction_type"):
            await transaction_repo.create_transaction(
                merchant_id=test_merchant.id,
                transaction_type="invalid_type",
                amount=Decimal("100.00"),
                float_before=Decimal("0.00"),
                float_after=Decimal("100.00")
            )
    
    async def test_create_transaction_invalid_status(
        self,
        transaction_repo: TransactionRepository,
        test_merchant: Merchant
    ):
        """Test that creating a transaction with invalid status raises ValueError."""
        with pytest.raises(ValueError, match="Invalid status"):
            await transaction_repo.create_transaction(
                merchant_id=test_merchant.id,
                transaction_type="deposit",
                amount=Decimal("100.00"),
                float_before=Decimal("0.00"),
                float_after=Decimal("100.00"),
                status="invalid_status"
            )
    
    async def test_create_transaction_negative_amount(
        self,
        transaction_repo: TransactionRepository,
        test_merchant: Merchant
    ):
        """Test that creating a transaction with negative amount raises ValueError."""
        with pytest.raises(ValueError, match="Amount must be positive"):
            await transaction_repo.create_transaction(
                merchant_id=test_merchant.id,
                transaction_type="deposit",
                amount=Decimal("-100.00"),
                float_before=Decimal("0.00"),
                float_after=Decimal("100.00")
            )
    
    async def test_create_transaction_zero_amount(
        self,
        transaction_repo: TransactionRepository,
        test_merchant: Merchant
    ):
        """Test that creating a transaction with zero amount raises ValueError."""
        with pytest.raises(ValueError, match="Amount must be positive"):
            await transaction_repo.create_transaction(
                merchant_id=test_merchant.id,
                transaction_type="deposit",
                amount=Decimal("0.00"),
                float_before=Decimal("0.00"),
                float_after=Decimal("0.00")
            )
    
    async def test_get_transaction_by_id(
        self,
        transaction_repo: TransactionRepository,
        test_merchant: Merchant,
        db_session: AsyncSession
    ):
        """Test retrieving a transaction by ID."""
        # Create a transaction
        created = await transaction_repo.create_transaction(
            merchant_id=test_merchant.id,
            transaction_type="deposit",
            amount=Decimal("100.00"),
            float_before=Decimal("0.00"),
            float_after=Decimal("100.00")
        )
        await db_session.commit()
        
        # Retrieve it
        retrieved = await transaction_repo.get_transaction_by_id(created.id)
        
        assert retrieved is not None
        assert retrieved.id == created.id
        assert retrieved.merchant_id == test_merchant.id
        assert retrieved.amount == Decimal("100.00")
    
    async def test_get_transaction_by_id_not_found(
        self,
        transaction_repo: TransactionRepository
    ):
        """Test retrieving a non-existent transaction returns None."""
        retrieved = await transaction_repo.get_transaction_by_id(99999)
        assert retrieved is None
    
    async def test_get_transactions_by_merchant(
        self,
        transaction_repo: TransactionRepository,
        test_merchant: Merchant,
        db_session: AsyncSession
    ):
        """Test retrieving all transactions for a merchant."""
        # Create multiple transactions
        for i in range(5):
            await transaction_repo.create_transaction(
                merchant_id=test_merchant.id,
                transaction_type="deposit",
                amount=Decimal(f"{(i + 1) * 10}.00"),
                float_before=Decimal(f"{i * 10}.00"),
                float_after=Decimal(f"{(i + 1) * 10}.00")
            )
        await db_session.commit()
        
        # Retrieve all transactions
        transactions = await transaction_repo.get_transactions_by_merchant(
            merchant_id=test_merchant.id
        )
        
        assert len(transactions) == 5
        # Should be in reverse chronological order (newest first)
        assert transactions[0].amount == Decimal("50.00")
        assert transactions[4].amount == Decimal("10.00")
    
    async def test_get_transactions_by_merchant_with_pagination(
        self,
        transaction_repo: TransactionRepository,
        test_merchant: Merchant,
        db_session: AsyncSession
    ):
        """Test pagination when retrieving transactions."""
        # Create 10 transactions
        for i in range(10):
            await transaction_repo.create_transaction(
                merchant_id=test_merchant.id,
                transaction_type="deposit",
                amount=Decimal(f"{(i + 1) * 10}.00"),
                float_before=Decimal(f"{i * 10}.00"),
                float_after=Decimal(f"{(i + 1) * 10}.00")
            )
        await db_session.commit()
        
        # Get first page (5 items)
        page1 = await transaction_repo.get_transactions_by_merchant(
            merchant_id=test_merchant.id,
            limit=5,
            offset=0
        )
        
        assert len(page1) == 5
        assert page1[0].amount == Decimal("100.00")  # Newest
        
        # Get second page (5 items)
        page2 = await transaction_repo.get_transactions_by_merchant(
            merchant_id=test_merchant.id,
            limit=5,
            offset=5
        )
        
        assert len(page2) == 5
        assert page2[0].amount == Decimal("50.00")
    
    async def test_get_transactions_by_filters_type(
        self,
        transaction_repo: TransactionRepository,
        test_merchant: Merchant,
        db_session: AsyncSession
    ):
        """Test filtering transactions by type."""
        # Create different transaction types
        await transaction_repo.create_transaction(
            merchant_id=test_merchant.id,
            transaction_type="deposit",
            amount=Decimal("100.00"),
            float_before=Decimal("0.00"),
            float_after=Decimal("100.00")
        )
        await transaction_repo.create_transaction(
            merchant_id=test_merchant.id,
            transaction_type="vending",
            amount=Decimal("50.00"),
            float_before=Decimal("100.00"),
            float_after=Decimal("50.00")
        )
        await transaction_repo.create_transaction(
            merchant_id=test_merchant.id,
            transaction_type="cashout",
            amount=Decimal("25.00"),
            float_before=Decimal("50.00"),
            float_after=Decimal("75.00")
        )
        await db_session.commit()
        
        # Filter by deposit
        deposits = await transaction_repo.get_transactions_by_filters(
            merchant_id=test_merchant.id,
            transaction_type="deposit"
        )
        assert len(deposits) == 1
        assert deposits[0].transaction_type == "deposit"
        
        # Filter by vending
        vendings = await transaction_repo.get_transactions_by_filters(
            merchant_id=test_merchant.id,
            transaction_type="vending"
        )
        assert len(vendings) == 1
        assert vendings[0].transaction_type == "vending"
    
    async def test_get_transactions_by_filters_status(
        self,
        transaction_repo: TransactionRepository,
        test_merchant: Merchant,
        db_session: AsyncSession
    ):
        """Test filtering transactions by status."""
        # Create transactions with different statuses
        await transaction_repo.create_transaction(
            merchant_id=test_merchant.id,
            transaction_type="deposit",
            amount=Decimal("100.00"),
            float_before=Decimal("0.00"),
            float_after=Decimal("100.00"),
            status="completed"
        )
        await transaction_repo.create_transaction(
            merchant_id=test_merchant.id,
            transaction_type="deposit",
            amount=Decimal("50.00"),
            float_before=Decimal("100.00"),
            float_after=Decimal("150.00"),
            status="pending"
        )
        await transaction_repo.create_transaction(
            merchant_id=test_merchant.id,
            transaction_type="deposit",
            amount=Decimal("25.00"),
            float_before=Decimal("150.00"),
            float_after=Decimal("150.00"),
            status="failed"
        )
        await db_session.commit()
        
        # Filter by completed
        completed = await transaction_repo.get_transactions_by_filters(
            merchant_id=test_merchant.id,
            status="completed"
        )
        assert len(completed) == 1
        assert completed[0].status == "completed"
        
        # Filter by pending
        pending = await transaction_repo.get_transactions_by_filters(
            merchant_id=test_merchant.id,
            status="pending"
        )
        assert len(pending) == 1
        assert pending[0].status == "pending"
    
    async def test_get_transactions_by_filters_date_range(
        self,
        transaction_repo: TransactionRepository,
        test_merchant: Merchant,
        db_session: AsyncSession
    ):
        """Test filtering transactions by date range."""
        now = datetime.utcnow()
        
        # Create transactions at different times
        # We'll create them and then manually update their created_at
        t1 = await transaction_repo.create_transaction(
            merchant_id=test_merchant.id,
            transaction_type="deposit",
            amount=Decimal("100.00"),
            float_before=Decimal("0.00"),
            float_after=Decimal("100.00")
        )
        t1.created_at = now - timedelta(days=10)
        
        t2 = await transaction_repo.create_transaction(
            merchant_id=test_merchant.id,
            transaction_type="deposit",
            amount=Decimal("50.00"),
            float_before=Decimal("100.00"),
            float_after=Decimal("150.00")
        )
        t2.created_at = now - timedelta(days=5)
        
        t3 = await transaction_repo.create_transaction(
            merchant_id=test_merchant.id,
            transaction_type="deposit",
            amount=Decimal("25.00"),
            float_before=Decimal("150.00"),
            float_after=Decimal("175.00")
        )
        t3.created_at = now
        
        await db_session.commit()
        
        # Filter by date range (last 7 days)
        recent = await transaction_repo.get_transactions_by_filters(
            merchant_id=test_merchant.id,
            start_date=now - timedelta(days=7)
        )
        assert len(recent) == 2  # t2 and t3
        
        # Filter by date range (older than 7 days)
        old = await transaction_repo.get_transactions_by_filters(
            merchant_id=test_merchant.id,
            end_date=now - timedelta(days=7)
        )
        assert len(old) == 1  # t1
    
    async def test_get_transactions_by_filters_combined(
        self,
        transaction_repo: TransactionRepository,
        test_merchant: Merchant,
        db_session: AsyncSession
    ):
        """Test filtering transactions with multiple filters."""
        # Create various transactions
        await transaction_repo.create_transaction(
            merchant_id=test_merchant.id,
            transaction_type="deposit",
            amount=Decimal("100.00"),
            float_before=Decimal("0.00"),
            float_after=Decimal("100.00"),
            status="completed"
        )
        await transaction_repo.create_transaction(
            merchant_id=test_merchant.id,
            transaction_type="vending",
            amount=Decimal("50.00"),
            float_before=Decimal("100.00"),
            float_after=Decimal("50.00"),
            status="completed"
        )
        await transaction_repo.create_transaction(
            merchant_id=test_merchant.id,
            transaction_type="vending",
            amount=Decimal("25.00"),
            float_before=Decimal("50.00"),
            float_after=Decimal("25.00"),
            status="pending"
        )
        await db_session.commit()
        
        # Filter by type and status
        completed_vendings = await transaction_repo.get_transactions_by_filters(
            merchant_id=test_merchant.id,
            transaction_type="vending",
            status="completed"
        )
        assert len(completed_vendings) == 1
        assert completed_vendings[0].transaction_type == "vending"
        assert completed_vendings[0].status == "completed"
    
    async def test_calculate_current_float_balance_no_transactions(
        self,
        transaction_repo: TransactionRepository,
        test_merchant: Merchant
    ):
        """Test calculating float balance when no transactions exist."""
        balance = await transaction_repo.calculate_current_float_balance(
            merchant_id=test_merchant.id
        )
        assert balance == Decimal("0.00")
    
    async def test_calculate_current_float_balance_single_transaction(
        self,
        transaction_repo: TransactionRepository,
        test_merchant: Merchant,
        db_session: AsyncSession
    ):
        """Test calculating float balance with a single transaction."""
        await transaction_repo.create_transaction(
            merchant_id=test_merchant.id,
            transaction_type="deposit",
            amount=Decimal("100.00"),
            float_before=Decimal("0.00"),
            float_after=Decimal("100.00")
        )
        await db_session.commit()
        
        balance = await transaction_repo.calculate_current_float_balance(
            merchant_id=test_merchant.id
        )
        assert balance == Decimal("100.00")
    
    async def test_calculate_current_float_balance_multiple_transactions(
        self,
        transaction_repo: TransactionRepository,
        test_merchant: Merchant,
        db_session: AsyncSession
    ):
        """Test calculating float balance with multiple transactions."""
        # Deposit
        await transaction_repo.create_transaction(
            merchant_id=test_merchant.id,
            transaction_type="deposit",
            amount=Decimal("100.00"),
            float_before=Decimal("0.00"),
            float_after=Decimal("100.00")
        )
        # Vending
        await transaction_repo.create_transaction(
            merchant_id=test_merchant.id,
            transaction_type="vending",
            amount=Decimal("30.00"),
            float_before=Decimal("100.00"),
            float_after=Decimal("70.00")
        )
        # Cashout
        await transaction_repo.create_transaction(
            merchant_id=test_merchant.id,
            transaction_type="cashout",
            amount=Decimal("50.00"),
            float_before=Decimal("70.00"),
            float_after=Decimal("120.00")
        )
        await db_session.commit()
        
        balance = await transaction_repo.calculate_current_float_balance(
            merchant_id=test_merchant.id
        )
        assert balance == Decimal("120.00")
    
    async def test_calculate_current_float_balance_ignores_pending(
        self,
        transaction_repo: TransactionRepository,
        test_merchant: Merchant,
        db_session: AsyncSession
    ):
        """Test that float balance calculation ignores pending transactions."""
        # Completed transaction
        await transaction_repo.create_transaction(
            merchant_id=test_merchant.id,
            transaction_type="deposit",
            amount=Decimal("100.00"),
            float_before=Decimal("0.00"),
            float_after=Decimal("100.00"),
            status="completed"
        )
        # Pending transaction (should be ignored)
        await transaction_repo.create_transaction(
            merchant_id=test_merchant.id,
            transaction_type="deposit",
            amount=Decimal("50.00"),
            float_before=Decimal("100.00"),
            float_after=Decimal("150.00"),
            status="pending"
        )
        await db_session.commit()
        
        balance = await transaction_repo.calculate_current_float_balance(
            merchant_id=test_merchant.id
        )
        # Should only reflect the completed transaction
        assert balance == Decimal("100.00")
    
    async def test_get_transaction_count_by_merchant(
        self,
        transaction_repo: TransactionRepository,
        test_merchant: Merchant,
        db_session: AsyncSession
    ):
        """Test counting transactions for a merchant."""
        # Create 5 transactions
        for i in range(5):
            await transaction_repo.create_transaction(
                merchant_id=test_merchant.id,
                transaction_type="deposit",
                amount=Decimal(f"{(i + 1) * 10}.00"),
                float_before=Decimal(f"{i * 10}.00"),
                float_after=Decimal(f"{(i + 1) * 10}.00")
            )
        await db_session.commit()
        
        count = await transaction_repo.get_transaction_count_by_merchant(
            merchant_id=test_merchant.id
        )
        assert count == 5
    
    async def test_get_transaction_count_by_merchant_with_filters(
        self,
        transaction_repo: TransactionRepository,
        test_merchant: Merchant,
        db_session: AsyncSession
    ):
        """Test counting transactions with filters."""
        # Create different types
        await transaction_repo.create_transaction(
            merchant_id=test_merchant.id,
            transaction_type="deposit",
            amount=Decimal("100.00"),
            float_before=Decimal("0.00"),
            float_after=Decimal("100.00")
        )
        await transaction_repo.create_transaction(
            merchant_id=test_merchant.id,
            transaction_type="vending",
            amount=Decimal("50.00"),
            float_before=Decimal("100.00"),
            float_after=Decimal("50.00")
        )
        await transaction_repo.create_transaction(
            merchant_id=test_merchant.id,
            transaction_type="vending",
            amount=Decimal("25.00"),
            float_before=Decimal("50.00"),
            float_after=Decimal("25.00")
        )
        await db_session.commit()
        
        # Count vending transactions
        count = await transaction_repo.get_transaction_count_by_merchant(
            merchant_id=test_merchant.id,
            transaction_type="vending"
        )
        assert count == 2
    
    async def test_get_transaction_by_payment_reference(
        self,
        transaction_repo: TransactionRepository,
        test_merchant: Merchant,
        db_session: AsyncSession
    ):
        """Test retrieving a transaction by payment reference."""
        await transaction_repo.create_transaction(
            merchant_id=test_merchant.id,
            transaction_type="deposit",
            amount=Decimal("100.00"),
            float_before=Decimal("0.00"),
            float_after=Decimal("100.00"),
            payment_provider="stripe",
            payment_reference="pi_unique_123"
        )
        await db_session.commit()
        
        transaction = await transaction_repo.get_transaction_by_payment_reference(
            payment_reference="pi_unique_123"
        )
        
        assert transaction is not None
        assert transaction.payment_reference == "pi_unique_123"
        assert transaction.payment_provider == "stripe"
    
    async def test_get_transaction_by_payment_reference_not_found(
        self,
        transaction_repo: TransactionRepository
    ):
        """Test retrieving a non-existent payment reference returns None."""
        transaction = await transaction_repo.get_transaction_by_payment_reference(
            payment_reference="pi_nonexistent"
        )
        assert transaction is None
