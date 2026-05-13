"""
Unit tests for TransactionService.

Tests the transaction service business logic with mocked dependencies.
"""
import pytest
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch
from sqlalchemy.exc import OperationalError

from app.services.transaction_service import TransactionService
from app.models import Merchant, Product, Vendor, Transaction
from app.exceptions import InsufficientFloatError, VendorError, VendlyException
from app.strategies.vendor_strategy import VendorResponse, VendorStrategy
from app.schemas import NormalizedResponse


@pytest.fixture
def mock_session():
    """Create a mock database session."""
    session = AsyncMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    session.refresh = AsyncMock()
    session.execute = AsyncMock()
    return session


@pytest.fixture
def mock_vendor_strategy():
    """Create a mock vendor strategy."""
    strategy = AsyncMock(spec=VendorStrategy)
    
    # Mock successful vendor response
    vendor_response = VendorResponse(
        success=True,
        raw_data={"status": "success", "token": "ABC123"},
        vendor_transaction_id="vendor_tx_123",
        vendor_token="ABC123"
    )
    strategy.process_transaction = AsyncMock(return_value=vendor_response)
    
    # Mock normalized response
    normalized_response = NormalizedResponse(
        status="success",
        transaction_id="vendor_tx_123",
        vendor_token="ABC123",
        message="Transaction successful"
    )
    strategy.normalize_response = MagicMock(return_value=normalized_response)
    strategy.get_sla_timeout = MagicMock(return_value=5000)
    
    return strategy


@pytest.fixture
def transaction_service(mock_session, mock_vendor_strategy):
    """Create a transaction service with mocked dependencies."""
    service = TransactionService(
        session=mock_session,
        vendor_strategies={1: mock_vendor_strategy}
    )
    return service


class TestValidateSufficientFloat:
    """Tests for validate_sufficient_float method."""
    
    @pytest.mark.asyncio
    async def test_sufficient_float_returns_true(self, transaction_service):
        """Test that validation passes when float is sufficient."""
        # Mock current float calculation
        transaction_service.transaction_repo.calculate_current_float_balance = AsyncMock(
            return_value=Decimal("100.00")
        )
        
        # Should not raise exception
        result = await transaction_service.validate_sufficient_float(
            merchant_id=1,
            required_amount=Decimal("50.00")
        )
        
        assert result is True
    
    @pytest.mark.asyncio
    async def test_insufficient_float_raises_error(self, transaction_service):
        """Test that validation fails when float is insufficient."""
        # Mock current float calculation
        transaction_service.transaction_repo.calculate_current_float_balance = AsyncMock(
            return_value=Decimal("30.00")
        )
        
        # Should raise InsufficientFloatError
        with pytest.raises(InsufficientFloatError) as exc_info:
            await transaction_service.validate_sufficient_float(
                merchant_id=1,
                required_amount=Decimal("50.00")
            )
        
        assert exc_info.value.error_code == "INSUFFICIENT_FLOAT"
        assert exc_info.value.details["required_amount"] == "50.00"
        assert exc_info.value.details["available_float"] == "30.00"
    
    @pytest.mark.asyncio
    async def test_exact_float_amount_returns_true(self, transaction_service):
        """Test that validation passes when float exactly matches required amount."""
        # Mock current float calculation
        transaction_service.transaction_repo.calculate_current_float_balance = AsyncMock(
            return_value=Decimal("50.00")
        )
        
        # Should not raise exception
        result = await transaction_service.validate_sufficient_float(
            merchant_id=1,
            required_amount=Decimal("50.00")
        )
        
        assert result is True


class TestProcessDeposit:
    """Tests for process_deposit method."""
    
    @pytest.mark.asyncio
    async def test_deposit_increases_float(self, transaction_service, mock_session):
        """Test that deposit increases merchant float balance."""
        # Mock merchant with lock
        merchant = Merchant(
            id=1,
            name="Test Merchant",
            email="test@example.com",
            phone="1234567890",
            business_name="Test Business",
            password_hash="hashed"
        )
        
        mock_result = MagicMock()
        mock_result.scalar_one_or_none = MagicMock(return_value=merchant)
        mock_session.execute = AsyncMock(return_value=mock_result)
        
        # Mock current float calculation
        transaction_service.transaction_repo.calculate_current_float_balance = AsyncMock(
            return_value=Decimal("100.00")
        )
        
        # Mock transaction creation
        created_transaction = Transaction(
            id=1,
            merchant_id=1,
            transaction_type="deposit",
            amount=Decimal("50.00"),
            float_before=Decimal("100.00"),
            float_after=Decimal("150.00"),
            status="completed",
            payment_provider="stripe",
            payment_reference="pi_123"
        )
        transaction_service.transaction_repo.create_transaction = AsyncMock(
            return_value=created_transaction
        )
        
        # Process deposit
        result = await transaction_service.process_deposit(
            merchant_id=1,
            amount=Decimal("50.00"),
            payment_provider="stripe",
            payment_reference="pi_123"
        )
        
        # Verify transaction was created with correct values
        assert result.amount == Decimal("50.00")
        assert result.float_before == Decimal("100.00")
        assert result.float_after == Decimal("150.00")
        assert result.transaction_type == "deposit"
        assert result.status == "completed"
        assert result.payment_provider == "stripe"
        assert result.payment_reference == "pi_123"
        
        # Verify commit was called
        mock_session.commit.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_deposit_with_zero_initial_float(self, transaction_service, mock_session):
        """Test deposit when merchant has zero float."""
        # Mock merchant with lock
        merchant = Merchant(
            id=1,
            name="Test Merchant",
            email="test@example.com",
            phone="1234567890",
            business_name="Test Business",
            password_hash="hashed"
        )
        
        mock_result = MagicMock()
        mock_result.scalar_one_or_none = MagicMock(return_value=merchant)
        mock_session.execute = AsyncMock(return_value=mock_result)
        
        # Mock current float calculation (zero)
        transaction_service.transaction_repo.calculate_current_float_balance = AsyncMock(
            return_value=Decimal("0.00")
        )
        
        # Mock transaction creation
        created_transaction = Transaction(
            id=1,
            merchant_id=1,
            transaction_type="deposit",
            amount=Decimal("100.00"),
            float_before=Decimal("0.00"),
            float_after=Decimal("100.00"),
            status="completed",
            payment_provider="stripe",
            payment_reference="pi_456"
        )
        transaction_service.transaction_repo.create_transaction = AsyncMock(
            return_value=created_transaction
        )
        
        # Process deposit
        result = await transaction_service.process_deposit(
            merchant_id=1,
            amount=Decimal("100.00"),
            payment_provider="stripe",
            payment_reference="pi_456"
        )
        
        # Verify float went from 0 to 100
        assert result.float_before == Decimal("0.00")
        assert result.float_after == Decimal("100.00")
    
    @pytest.mark.asyncio
    async def test_deposit_merchant_not_found(self, transaction_service, mock_session):
        """Test deposit fails when merchant doesn't exist."""
        # Mock merchant not found
        mock_result = MagicMock()
        mock_result.scalar_one_or_none = MagicMock(return_value=None)
        mock_session.execute = AsyncMock(return_value=mock_result)
        
        # Should raise VendlyException
        with pytest.raises(VendlyException) as exc_info:
            await transaction_service.process_deposit(
                merchant_id=999,
                amount=Decimal("50.00"),
                payment_provider="stripe",
                payment_reference="pi_123"
            )
        
        assert exc_info.value.error_code == "MERCHANT_NOT_FOUND"


class TestProcessCashout:
    """Tests for process_cashout method."""
    
    @pytest.mark.asyncio
    async def test_cashout_increases_float(self, transaction_service, mock_session):
        """Test that cashout increases merchant float balance."""
        # Mock merchant with lock
        merchant = Merchant(
            id=1,
            name="Test Merchant",
            email="test@example.com",
            phone="1234567890",
            business_name="Test Business",
            password_hash="hashed"
        )
        
        mock_result = MagicMock()
        mock_result.scalar_one_or_none = MagicMock(return_value=merchant)
        mock_session.execute = AsyncMock(return_value=mock_result)
        
        # Mock current float calculation
        transaction_service.transaction_repo.calculate_current_float_balance = AsyncMock(
            return_value=Decimal("100.00")
        )
        
        # Mock transaction creation
        created_transaction = Transaction(
            id=1,
            merchant_id=1,
            transaction_type="cashout",
            amount=Decimal("50.00"),
            float_before=Decimal("100.00"),
            float_after=Decimal("150.00"),
            status="completed"
        )
        transaction_service.transaction_repo.create_transaction = AsyncMock(
            return_value=created_transaction
        )
        
        # Process cashout
        result = await transaction_service.process_cashout(
            merchant_id=1,
            amount=Decimal("50.00")
        )
        
        # Verify transaction was created with correct values
        assert result.amount == Decimal("50.00")
        assert result.float_before == Decimal("100.00")
        assert result.float_after == Decimal("150.00")
        assert result.transaction_type == "cashout"
        assert result.status == "completed"
        
        # Verify commit was called
        mock_session.commit.assert_called_once()


class TestProcessVending:
    """Tests for process_vending method."""
    
    @pytest.mark.asyncio
    async def test_vending_decreases_float_on_success(
        self,
        transaction_service,
        mock_session,
        mock_vendor_strategy
    ):
        """Test that successful vending decreases merchant float."""
        # Mock merchant with lock
        merchant = Merchant(
            id=1,
            name="Test Merchant",
            email="test@example.com",
            phone="1234567890",
            business_name="Test Business",
            password_hash="hashed"
        )
        
        # Mock product
        vendor = Vendor(id=1, name="Test Vendor", sla_timeout_ms=5000, active=True)
        product = Product(
            id=1,
            vendor_id=1,
            name="Test Product",
            product_code="TEST_001",
            active=True
        )
        product.vendor = vendor
        
        mock_result = MagicMock()
        mock_result.scalar_one_or_none = MagicMock(return_value=merchant)
        mock_session.execute = AsyncMock(return_value=mock_result)
        
        # Mock product repository
        transaction_service.product_repo.get_by_id = AsyncMock(return_value=product)
        
        # Mock current float calculation
        transaction_service.transaction_repo.calculate_current_float_balance = AsyncMock(
            return_value=Decimal("100.00")
        )
        
        # Mock transaction creation
        from datetime import datetime
        created_transaction = Transaction(
            id=1,
            merchant_id=1,
            product_id=1,
            transaction_type="vending",
            amount=Decimal("50.00"),
            float_before=Decimal("100.00"),
            float_after=Decimal("50.00"),
            status="completed",
            vendor_token="ABC123"
        )
        # Set the metadata_ and created_at attributes that would be set by the database
        created_transaction.metadata_ = {"reference": "test"}
        created_transaction.created_at = datetime.now()
        transaction_service.transaction_repo.create_transaction = AsyncMock(
            return_value=created_transaction
        )
        
        # Process vending
        result = await transaction_service.process_vending(
            merchant_id=1,
            product_id=1,
            amount=Decimal("50.00"),
            customer_identifier="12345",
            metadata={"reference": "test"}
        )
        
        # Verify transaction was created with correct values
        assert result.transaction.amount == Decimal("50.00")
        assert result.transaction.float_before == Decimal("100.00")
        assert result.transaction.float_after == Decimal("50.00")
        assert result.transaction.transaction_type == "vending"
        assert result.transaction.status == "completed"
        assert result.transaction.vendor_token == "ABC123"
        
        # Verify vendor strategy was called
        mock_vendor_strategy.process_transaction.assert_called_once()
        mock_vendor_strategy.normalize_response.assert_called_once()
        
        # Verify commit was called
        mock_session.commit.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_vending_insufficient_float(
        self,
        transaction_service,
        mock_session
    ):
        """Test that vending fails when float is insufficient."""
        # Mock merchant with lock
        merchant = Merchant(
            id=1,
            name="Test Merchant",
            email="test@example.com",
            phone="1234567890",
            business_name="Test Business",
            password_hash="hashed"
        )
        
        # Mock product
        product = Product(
            id=1,
            vendor_id=1,
            name="Test Product",
            product_code="TEST_001",
            active=True
        )
        
        mock_result = MagicMock()
        mock_result.scalar_one_or_none = MagicMock(return_value=merchant)
        mock_session.execute = AsyncMock(return_value=mock_result)
        
        # Mock product repository
        transaction_service.product_repo.get_by_id = AsyncMock(return_value=product)
        
        # Mock current float calculation (insufficient)
        transaction_service.transaction_repo.calculate_current_float_balance = AsyncMock(
            return_value=Decimal("30.00")
        )
        
        # Should raise InsufficientFloatError
        with pytest.raises(InsufficientFloatError):
            await transaction_service.process_vending(
                merchant_id=1,
                product_id=1,
                amount=Decimal("50.00"),
                customer_identifier="12345"
            )
        
        # Verify rollback was called
        mock_session.rollback.assert_called()
    
    @pytest.mark.asyncio
    async def test_vending_product_not_found(
        self,
        transaction_service,
        mock_session
    ):
        """Test that vending fails when product doesn't exist."""
        # Mock merchant with lock
        merchant = Merchant(
            id=1,
            name="Test Merchant",
            email="test@example.com",
            phone="1234567890",
            business_name="Test Business",
            password_hash="hashed"
        )
        
        mock_result = MagicMock()
        mock_result.scalar_one_or_none = MagicMock(return_value=merchant)
        mock_session.execute = AsyncMock(return_value=mock_result)
        
        # Mock product not found
        transaction_service.product_repo.get_by_id = AsyncMock(return_value=None)
        
        # Mock current float calculation
        transaction_service.transaction_repo.calculate_current_float_balance = AsyncMock(
            return_value=Decimal("100.00")
        )
        
        # Should raise VendlyException
        with pytest.raises(VendlyException) as exc_info:
            await transaction_service.process_vending(
                merchant_id=1,
                product_id=999,
                amount=Decimal("50.00"),
                customer_identifier="12345"
            )
        
        assert exc_info.value.error_code == "PRODUCT_NOT_FOUND"
    
    @pytest.mark.asyncio
    async def test_vending_inactive_product(
        self,
        transaction_service,
        mock_session
    ):
        """Test that vending fails when product is inactive."""
        # Mock merchant with lock
        merchant = Merchant(
            id=1,
            name="Test Merchant",
            email="test@example.com",
            phone="1234567890",
            business_name="Test Business",
            password_hash="hashed"
        )
        
        # Mock inactive product
        product = Product(
            id=1,
            vendor_id=1,
            name="Test Product",
            product_code="TEST_001",
            active=False  # Inactive
        )
        
        mock_result = MagicMock()
        mock_result.scalar_one_or_none = MagicMock(return_value=merchant)
        mock_session.execute = AsyncMock(return_value=mock_result)
        
        # Mock product repository
        transaction_service.product_repo.get_by_id = AsyncMock(return_value=product)
        
        # Mock current float calculation
        transaction_service.transaction_repo.calculate_current_float_balance = AsyncMock(
            return_value=Decimal("100.00")
        )
        
        # Should raise VendlyException
        with pytest.raises(VendlyException) as exc_info:
            await transaction_service.process_vending(
                merchant_id=1,
                product_id=1,
                amount=Decimal("50.00"),
                customer_identifier="12345"
            )
        
        assert exc_info.value.error_code == "PRODUCT_INACTIVE"
    
    @pytest.mark.asyncio
    async def test_vending_no_vendor_strategy(
        self,
        transaction_service,
        mock_session
    ):
        """Test that vending fails when no vendor strategy is configured."""
        # Mock merchant with lock
        merchant = Merchant(
            id=1,
            name="Test Merchant",
            email="test@example.com",
            phone="1234567890",
            business_name="Test Business",
            password_hash="hashed"
        )
        
        # Mock product with vendor_id that has no strategy
        product = Product(
            id=1,
            vendor_id=999,  # No strategy for this vendor
            name="Test Product",
            product_code="TEST_001",
            active=True
        )
        
        mock_result = MagicMock()
        mock_result.scalar_one_or_none = MagicMock(return_value=merchant)
        mock_session.execute = AsyncMock(return_value=mock_result)
        
        # Mock product repository
        transaction_service.product_repo.get_by_id = AsyncMock(return_value=product)
        
        # Mock current float calculation
        transaction_service.transaction_repo.calculate_current_float_balance = AsyncMock(
            return_value=Decimal("100.00")
        )
        
        # Should raise VendorError
        with pytest.raises(VendorError):
            await transaction_service.process_vending(
                merchant_id=1,
                product_id=1,
                amount=Decimal("50.00"),
                customer_identifier="12345"
            )


class TestRetryLogic:
    """Tests for retry logic with exponential backoff."""
    
    @pytest.mark.asyncio
    async def test_retry_on_operational_error(self, transaction_service, mock_session):
        """Test that operations are retried on OperationalError."""
        # Mock merchant with lock
        merchant = Merchant(
            id=1,
            name="Test Merchant",
            email="test@example.com",
            phone="1234567890",
            business_name="Test Business",
            password_hash="hashed"
        )
        
        # First call raises OperationalError, second succeeds
        mock_result = MagicMock()
        mock_result.scalar_one_or_none = MagicMock(return_value=merchant)
        mock_session.execute = AsyncMock(
            side_effect=[
                OperationalError("Deadlock", None, None),
                mock_result
            ]
        )
        
        # Mock current float calculation
        transaction_service.transaction_repo.calculate_current_float_balance = AsyncMock(
            return_value=Decimal("100.00")
        )
        
        # Mock transaction creation
        created_transaction = Transaction(
            id=1,
            merchant_id=1,
            transaction_type="deposit",
            amount=Decimal("50.00"),
            float_before=Decimal("100.00"),
            float_after=Decimal("150.00"),
            status="completed",
            payment_provider="stripe",
            payment_reference="pi_123"
        )
        transaction_service.transaction_repo.create_transaction = AsyncMock(
            return_value=created_transaction
        )
        
        # Process deposit - should succeed after retry
        result = await transaction_service.process_deposit(
            merchant_id=1,
            amount=Decimal("50.00"),
            payment_provider="stripe",
            payment_reference="pi_123"
        )
        
        # Verify transaction was created
        assert result.amount == Decimal("50.00")
        
        # Verify rollback was called on first failure
        assert mock_session.rollback.call_count >= 1
    
    @pytest.mark.asyncio
    async def test_retry_exhausted_raises_exception(self, transaction_service, mock_session):
        """Test that exception is raised after max retries."""
        # Mock merchant with lock - always raise OperationalError
        mock_session.execute = AsyncMock(
            side_effect=OperationalError("Deadlock", None, None)
        )
        
        # Should raise OperationalError after max retries
        with pytest.raises(OperationalError):
            await transaction_service.process_deposit(
                merchant_id=1,
                amount=Decimal("50.00"),
                payment_provider="stripe",
                payment_reference="pi_123"
            )
        
        # Verify rollback was called multiple times
        assert mock_session.rollback.call_count >= TransactionService.MAX_RETRIES - 1
