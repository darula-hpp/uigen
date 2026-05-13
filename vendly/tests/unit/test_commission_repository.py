"""
Unit tests for CommissionRepository.

Tests commission record creation, daily aggregation, monthly payouts,
and audit trail queries as specified in task 5.4.
"""
import pytest
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.models import (
    Base,
    Merchant,
    Vendor,
    Product,
    CommissionRule,
    Transaction,
    CommissionRecord,
    DailyCommissionAggregate,
    CommissionPayout,
    AuditRecord,
)
from app.repositories.commission_repository import CommissionRepository


@pytest.fixture
async def db_session():
    """Create an in-memory SQLite database session for testing."""
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        echo=False,
    )
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    
    async with async_session() as session:
        yield session
        await session.rollback()
    
    await engine.dispose()


@pytest.fixture
async def sample_merchant(db_session: AsyncSession):
    """Create a sample merchant for testing."""
    merchant = Merchant(
        name="Test Merchant",
        email="test@example.com",
        phone="1234567890",
        business_name="Test Business",
        password_hash="hashed_password",
    )
    db_session.add(merchant)
    await db_session.flush()
    await db_session.refresh(merchant)
    return merchant


@pytest.fixture
async def sample_vendor(db_session: AsyncSession):
    """Create a sample vendor for testing."""
    vendor = Vendor(
        name="Test Vendor",
        sla_timeout_ms=5000,
        active=True,
    )
    db_session.add(vendor)
    await db_session.flush()
    await db_session.refresh(vendor)
    return vendor


@pytest.fixture
async def sample_product(db_session: AsyncSession, sample_vendor: Vendor):
    """Create a sample product for testing."""
    product = Product(
        vendor_id=sample_vendor.id,
        name="Test Product",
        product_code="TEST001",
        active=True,
    )
    db_session.add(product)
    await db_session.flush()
    await db_session.refresh(product)
    return product


@pytest.fixture
async def sample_transaction(
    db_session: AsyncSession,
    sample_merchant: Merchant,
    sample_product: Product,
):
    """Create a sample transaction for testing."""
    transaction = Transaction(
        merchant_id=sample_merchant.id,
        product_id=sample_product.id,
        transaction_type="vending",
        amount=Decimal("100.00"),
        float_before=Decimal("200.00"),
        float_after=Decimal("100.00"),
        status="completed",
    )
    db_session.add(transaction)
    await db_session.flush()
    await db_session.refresh(transaction)
    return transaction


@pytest.fixture
def commission_repo(db_session: AsyncSession):
    """Create a CommissionRepository instance."""
    return CommissionRepository(db_session)


class TestCommissionRecordOperations:
    """Test commission record creation and retrieval."""
    
    @pytest.mark.asyncio
    async def test_create_commission_record(
        self,
        commission_repo: CommissionRepository,
        sample_transaction: Transaction,
        sample_merchant: Merchant,
        sample_product: Product,
    ):
        """Test creating a commission record."""
        record = await commission_repo.create_commission_record(
            transaction_id=sample_transaction.id,
            merchant_id=sample_merchant.id,
            product_id=sample_product.id,
            amount=Decimal("5.00"),
            calculation_method="percentage",
            calculation_details={"rate": "5.0", "base_amount": "100.00"},
        )
        
        assert record.id is not None
        assert record.transaction_id == sample_transaction.id
        assert record.merchant_id == sample_merchant.id
        assert record.product_id == sample_product.id
        assert record.amount == Decimal("5.00")
        assert record.calculation_method == "percentage"
        assert record.calculation_details == {"rate": "5.0", "base_amount": "100.00"}
    
    @pytest.mark.asyncio
    async def test_get_commission_records_by_merchant(
        self,
        commission_repo: CommissionRepository,
        sample_transaction: Transaction,
        sample_merchant: Merchant,
        sample_product: Product,
    ):
        """Test retrieving commission records filtered by merchant."""
        # Create multiple commission records
        await commission_repo.create_commission_record(
            transaction_id=sample_transaction.id,
            merchant_id=sample_merchant.id,
            product_id=sample_product.id,
            amount=Decimal("5.00"),
            calculation_method="percentage",
        )
        
        records = await commission_repo.get_commission_records(
            merchant_id=sample_merchant.id
        )
        
        assert len(records) == 1
        assert records[0].merchant_id == sample_merchant.id
    
    @pytest.mark.asyncio
    async def test_get_commission_records_with_date_filter(
        self,
        commission_repo: CommissionRepository,
        sample_transaction: Transaction,
        sample_merchant: Merchant,
        sample_product: Product,
    ):
        """Test retrieving commission records with date range filter."""
        await commission_repo.create_commission_record(
            transaction_id=sample_transaction.id,
            merchant_id=sample_merchant.id,
            product_id=sample_product.id,
            amount=Decimal("5.00"),
            calculation_method="percentage",
        )
        
        # Query with date range that includes today
        start_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = datetime.now().replace(hour=23, minute=59, second=59, microsecond=999999)
        
        records = await commission_repo.get_commission_records(
            merchant_id=sample_merchant.id,
            start_date=start_date,
            end_date=end_date,
        )
        
        assert len(records) == 1
    
    @pytest.mark.asyncio
    async def test_get_commission_records_with_pagination(
        self,
        commission_repo: CommissionRepository,
        db_session: AsyncSession,
        sample_merchant: Merchant,
        sample_product: Product,
    ):
        """Test retrieving commission records with pagination."""
        # Create multiple transactions and commission records
        for i in range(5):
            transaction = Transaction(
                merchant_id=sample_merchant.id,
                product_id=sample_product.id,
                transaction_type="vending",
                amount=Decimal("100.00"),
                float_before=Decimal("200.00"),
                float_after=Decimal("100.00"),
                status="completed",
            )
            db_session.add(transaction)
            await db_session.flush()
            await db_session.refresh(transaction)
            
            await commission_repo.create_commission_record(
                transaction_id=transaction.id,
                merchant_id=sample_merchant.id,
                product_id=sample_product.id,
                amount=Decimal("5.00"),
                calculation_method="percentage",
            )
        
        # Test pagination
        records_page1 = await commission_repo.get_commission_records(
            merchant_id=sample_merchant.id,
            limit=2,
            offset=0,
        )
        records_page2 = await commission_repo.get_commission_records(
            merchant_id=sample_merchant.id,
            limit=2,
            offset=2,
        )
        
        assert len(records_page1) == 2
        assert len(records_page2) == 2
        assert records_page1[0].id != records_page2[0].id


class TestDailyAggregateOperations:
    """Test daily commission aggregate operations."""
    
    @pytest.mark.asyncio
    async def test_create_daily_aggregate(
        self,
        commission_repo: CommissionRepository,
        sample_merchant: Merchant,
    ):
        """Test creating a daily commission aggregate."""
        test_date = date(2024, 1, 15)
        
        aggregate = await commission_repo.create_daily_aggregate(
            merchant_id=sample_merchant.id,
            date=test_date,
            total_commission=Decimal("50.00"),
            transaction_count=10,
        )
        
        assert aggregate.id is not None
        assert aggregate.merchant_id == sample_merchant.id
        assert aggregate.total_commission == Decimal("50.00")
        assert aggregate.transaction_count == 10
        assert aggregate.paid is False
    
    @pytest.mark.asyncio
    async def test_get_daily_aggregate(
        self,
        commission_repo: CommissionRepository,
        sample_merchant: Merchant,
    ):
        """Test retrieving a specific daily aggregate."""
        test_date = date(2024, 1, 15)
        
        await commission_repo.create_daily_aggregate(
            merchant_id=sample_merchant.id,
            date=test_date,
            total_commission=Decimal("50.00"),
            transaction_count=10,
        )
        
        aggregate = await commission_repo.get_daily_aggregate(
            merchant_id=sample_merchant.id,
            date=test_date,
        )
        
        assert aggregate is not None
        assert aggregate.merchant_id == sample_merchant.id
        assert aggregate.total_commission == Decimal("50.00")
    
    @pytest.mark.asyncio
    async def test_update_daily_aggregate(
        self,
        commission_repo: CommissionRepository,
        sample_merchant: Merchant,
    ):
        """Test updating an existing daily aggregate."""
        test_date = date(2024, 1, 15)
        
        # Create initial aggregate
        await commission_repo.create_daily_aggregate(
            merchant_id=sample_merchant.id,
            date=test_date,
            total_commission=Decimal("50.00"),
            transaction_count=10,
        )
        
        # Update with additional commission
        updated = await commission_repo.update_daily_aggregate(
            merchant_id=sample_merchant.id,
            date=test_date,
            additional_commission=Decimal("10.00"),
            additional_count=2,
        )
        
        assert updated.total_commission == Decimal("60.00")
        assert updated.transaction_count == 12
    
    @pytest.mark.asyncio
    async def test_update_daily_aggregate_creates_if_not_exists(
        self,
        commission_repo: CommissionRepository,
        sample_merchant: Merchant,
    ):
        """Test that update_daily_aggregate creates a new aggregate if it doesn't exist."""
        test_date = date(2024, 1, 15)
        
        # Update non-existent aggregate
        aggregate = await commission_repo.update_daily_aggregate(
            merchant_id=sample_merchant.id,
            date=test_date,
            additional_commission=Decimal("10.00"),
            additional_count=1,
        )
        
        assert aggregate.id is not None
        assert aggregate.total_commission == Decimal("10.00")
        assert aggregate.transaction_count == 1
    
    @pytest.mark.asyncio
    async def test_get_daily_aggregates_with_filters(
        self,
        commission_repo: CommissionRepository,
        sample_merchant: Merchant,
    ):
        """Test retrieving daily aggregates with date range filter."""
        # Create aggregates for multiple days
        await commission_repo.create_daily_aggregate(
            merchant_id=sample_merchant.id,
            date=date(2024, 1, 10),
            total_commission=Decimal("50.00"),
            transaction_count=10,
        )
        await commission_repo.create_daily_aggregate(
            merchant_id=sample_merchant.id,
            date=date(2024, 1, 15),
            total_commission=Decimal("60.00"),
            transaction_count=12,
        )
        await commission_repo.create_daily_aggregate(
            merchant_id=sample_merchant.id,
            date=date(2024, 1, 20),
            total_commission=Decimal("70.00"),
            transaction_count=14,
        )
        
        # Query with date range
        aggregates = await commission_repo.get_daily_aggregates(
            merchant_id=sample_merchant.id,
            start_date=date(2024, 1, 12),
            end_date=date(2024, 1, 18),
        )
        
        assert len(aggregates) == 1
        assert aggregates[0].total_commission == Decimal("60.00")
    
    @pytest.mark.asyncio
    async def test_mark_aggregates_as_paid(
        self,
        commission_repo: CommissionRepository,
        sample_merchant: Merchant,
    ):
        """Test marking daily aggregates as paid."""
        # Create unpaid aggregates
        await commission_repo.create_daily_aggregate(
            merchant_id=sample_merchant.id,
            date=date(2024, 1, 10),
            total_commission=Decimal("50.00"),
            transaction_count=10,
        )
        await commission_repo.create_daily_aggregate(
            merchant_id=sample_merchant.id,
            date=date(2024, 1, 15),
            total_commission=Decimal("60.00"),
            transaction_count=12,
        )
        
        # Mark as paid
        count = await commission_repo.mark_aggregates_as_paid(
            merchant_id=sample_merchant.id,
            start_date=date(2024, 1, 1),
            end_date=date(2024, 1, 31),
        )
        
        assert count == 2
        
        # Verify they are marked as paid
        aggregates = await commission_repo.get_daily_aggregates(
            merchant_id=sample_merchant.id,
            paid=True,
        )
        
        assert len(aggregates) == 2


class TestPayoutOperations:
    """Test commission payout operations."""
    
    @pytest.mark.asyncio
    async def test_create_payout(
        self,
        commission_repo: CommissionRepository,
        sample_merchant: Merchant,
        sample_transaction: Transaction,
    ):
        """Test creating a commission payout."""
        payout = await commission_repo.create_payout(
            merchant_id=sample_merchant.id,
            year=2024,
            month=1,
            total_amount=Decimal("500.00"),
            transaction_id=sample_transaction.id,
        )
        
        assert payout.id is not None
        assert payout.merchant_id == sample_merchant.id
        assert payout.year == 2024
        assert payout.month == 1
        assert payout.total_amount == Decimal("500.00")
        assert payout.transaction_id == sample_transaction.id
    
    @pytest.mark.asyncio
    async def test_get_payout(
        self,
        commission_repo: CommissionRepository,
        sample_merchant: Merchant,
        sample_transaction: Transaction,
    ):
        """Test retrieving a specific payout."""
        await commission_repo.create_payout(
            merchant_id=sample_merchant.id,
            year=2024,
            month=1,
            total_amount=Decimal("500.00"),
            transaction_id=sample_transaction.id,
        )
        
        payout = await commission_repo.get_payout(
            merchant_id=sample_merchant.id,
            year=2024,
            month=1,
        )
        
        assert payout is not None
        assert payout.total_amount == Decimal("500.00")
    
    @pytest.mark.asyncio
    async def test_get_payouts_with_filters(
        self,
        commission_repo: CommissionRepository,
        db_session: AsyncSession,
        sample_merchant: Merchant,
    ):
        """Test retrieving payouts with filters."""
        # Create multiple transactions for payouts
        transactions = []
        for i in range(3):
            transaction = Transaction(
                merchant_id=sample_merchant.id,
                transaction_type="commission_payout",
                amount=Decimal("100.00"),
                float_before=Decimal("0.00"),
                float_after=Decimal("100.00"),
                status="completed",
            )
            db_session.add(transaction)
            await db_session.flush()
            await db_session.refresh(transaction)
            transactions.append(transaction)
        
        # Create payouts for different months
        await commission_repo.create_payout(
            merchant_id=sample_merchant.id,
            year=2024,
            month=1,
            total_amount=Decimal("500.00"),
            transaction_id=transactions[0].id,
        )
        await commission_repo.create_payout(
            merchant_id=sample_merchant.id,
            year=2024,
            month=2,
            total_amount=Decimal("600.00"),
            transaction_id=transactions[1].id,
        )
        await commission_repo.create_payout(
            merchant_id=sample_merchant.id,
            year=2024,
            month=3,
            total_amount=Decimal("700.00"),
            transaction_id=transactions[2].id,
        )
        
        # Query by year
        payouts = await commission_repo.get_payouts(
            merchant_id=sample_merchant.id,
            year=2024,
        )
        
        assert len(payouts) == 3
        
        # Query by specific month
        payouts = await commission_repo.get_payouts(
            merchant_id=sample_merchant.id,
            year=2024,
            month=2,
        )
        
        assert len(payouts) == 1
        assert payouts[0].total_amount == Decimal("600.00")
    
    @pytest.mark.asyncio
    async def test_get_monthly_commission_total(
        self,
        commission_repo: CommissionRepository,
        sample_merchant: Merchant,
    ):
        """Test calculating monthly commission total from daily aggregates."""
        # Create daily aggregates for January 2024
        await commission_repo.create_daily_aggregate(
            merchant_id=sample_merchant.id,
            date=date(2024, 1, 10),
            total_commission=Decimal("50.00"),
            transaction_count=10,
        )
        await commission_repo.create_daily_aggregate(
            merchant_id=sample_merchant.id,
            date=date(2024, 1, 15),
            total_commission=Decimal("60.00"),
            transaction_count=12,
        )
        await commission_repo.create_daily_aggregate(
            merchant_id=sample_merchant.id,
            date=date(2024, 1, 20),
            total_commission=Decimal("70.00"),
            transaction_count=14,
        )
        
        # Calculate monthly total
        total = await commission_repo.get_monthly_commission_total(
            merchant_id=sample_merchant.id,
            year=2024,
            month=1,
        )
        
        assert total == Decimal("180.00")


class TestAuditRecordOperations:
    """Test audit record operations."""
    
    @pytest.mark.asyncio
    async def test_create_audit_record(
        self,
        commission_repo: CommissionRepository,
        sample_transaction: Transaction,
    ):
        """Test creating an audit record."""
        audit = await commission_repo.create_audit_record(
            transaction_id=sample_transaction.id,
            record_type="commission_calculation",
            data={
                "commission_amount": "5.00",
                "calculation_method": "percentage",
                "rate": "5.0",
            },
        )
        
        assert audit.id is not None
        assert audit.transaction_id == sample_transaction.id
        assert audit.record_type == "commission_calculation"
        assert audit.data["commission_amount"] == "5.00"
    
    @pytest.mark.asyncio
    async def test_get_audit_records_by_transaction(
        self,
        commission_repo: CommissionRepository,
        sample_transaction: Transaction,
    ):
        """Test retrieving audit records by transaction ID."""
        await commission_repo.create_audit_record(
            transaction_id=sample_transaction.id,
            record_type="commission_calculation",
            data={"amount": "5.00"},
        )
        
        records = await commission_repo.get_audit_records(
            transaction_id=sample_transaction.id
        )
        
        assert len(records) == 1
        assert records[0].transaction_id == sample_transaction.id
    
    @pytest.mark.asyncio
    async def test_get_audit_records_by_type(
        self,
        commission_repo: CommissionRepository,
        db_session: AsyncSession,
        sample_merchant: Merchant,
    ):
        """Test retrieving audit records by record type."""
        # Create multiple transactions and audit records
        for i in range(3):
            transaction = Transaction(
                merchant_id=sample_merchant.id,
                transaction_type="vending",
                amount=Decimal("100.00"),
                float_before=Decimal("200.00"),
                float_after=Decimal("100.00"),
                status="completed",
            )
            db_session.add(transaction)
            await db_session.flush()
            await db_session.refresh(transaction)
            
            await commission_repo.create_audit_record(
                transaction_id=transaction.id,
                record_type="commission_calculation",
                data={"amount": f"{i * 5}.00"},
            )
        
        records = await commission_repo.get_audit_records(
            record_type="commission_calculation"
        )
        
        assert len(records) == 3
    
    @pytest.mark.asyncio
    async def test_get_audit_records_with_date_filter(
        self,
        commission_repo: CommissionRepository,
        sample_transaction: Transaction,
    ):
        """Test retrieving audit records with date range filter."""
        await commission_repo.create_audit_record(
            transaction_id=sample_transaction.id,
            record_type="commission_calculation",
            data={"amount": "5.00"},
        )
        
        # Query with date range that includes today
        start_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = datetime.now().replace(hour=23, minute=59, second=59, microsecond=999999)
        
        records = await commission_repo.get_audit_records(
            start_date=start_date,
            end_date=end_date,
        )
        
        assert len(records) == 1
    
    @pytest.mark.asyncio
    async def test_get_audit_records_with_pagination(
        self,
        commission_repo: CommissionRepository,
        db_session: AsyncSession,
        sample_merchant: Merchant,
    ):
        """Test retrieving audit records with pagination."""
        # Create multiple transactions and audit records
        for i in range(5):
            transaction = Transaction(
                merchant_id=sample_merchant.id,
                transaction_type="vending",
                amount=Decimal("100.00"),
                float_before=Decimal("200.00"),
                float_after=Decimal("100.00"),
                status="completed",
            )
            db_session.add(transaction)
            await db_session.flush()
            await db_session.refresh(transaction)
            
            await commission_repo.create_audit_record(
                transaction_id=transaction.id,
                record_type="commission_calculation",
                data={"amount": f"{i * 5}.00"},
            )
        
        # Test pagination
        records_page1 = await commission_repo.get_audit_records(
            limit=2,
            offset=0,
        )
        records_page2 = await commission_repo.get_audit_records(
            limit=2,
            offset=2,
        )
        
        assert len(records_page1) == 2
        assert len(records_page2) == 2
        assert records_page1[0].id != records_page2[0].id
