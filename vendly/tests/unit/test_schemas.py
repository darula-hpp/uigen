"""
Unit tests for Pydantic schemas.

Tests validation logic for request and response schemas.
"""
import pytest
from datetime import datetime
from decimal import Decimal
from pydantic import ValidationError

from app.schemas import (
    MerchantRegistrationRequest,
    MerchantLoginRequest,
    DepositRequest,
    VendingTransactionRequest,
    CashoutTransactionRequest,
    TransactionFilters,
    NormalizedResponse,
    PaginationParams,
)


class TestMerchantRegistrationRequest:
    """Tests for MerchantRegistrationRequest schema."""
    
    def test_valid_registration(self):
        """Test valid merchant registration request."""
        data = {
            "name": "John Doe",
            "email": "john@example.com",
            "phone": "+1234567890",
            "business_name": "John's Store",
            "password": "securepassword123"
        }
        request = MerchantRegistrationRequest(**data)
        assert request.name == "John Doe"
        assert request.email == "john@example.com"
        assert request.phone == "+1234567890"
        assert request.business_name == "John's Store"
        assert request.password == "securepassword123"
    
    def test_empty_name_rejected(self):
        """Test that empty name is rejected."""
        data = {
            "name": "",
            "email": "john@example.com",
            "phone": "+1234567890",
            "business_name": "John's Store",
            "password": "securepassword123"
        }
        with pytest.raises(ValidationError) as exc_info:
            MerchantRegistrationRequest(**data)
        assert "name" in str(exc_info.value)
    
    def test_whitespace_name_rejected(self):
        """Test that whitespace-only name is rejected."""
        data = {
            "name": "   ",
            "email": "john@example.com",
            "phone": "+1234567890",
            "business_name": "John's Store",
            "password": "securepassword123"
        }
        with pytest.raises(ValidationError) as exc_info:
            MerchantRegistrationRequest(**data)
        assert "whitespace" in str(exc_info.value).lower()
    
    def test_invalid_email_rejected(self):
        """Test that invalid email is rejected."""
        data = {
            "name": "John Doe",
            "email": "invalid-email",
            "phone": "+1234567890",
            "business_name": "John's Store",
            "password": "securepassword123"
        }
        with pytest.raises(ValidationError) as exc_info:
            MerchantRegistrationRequest(**data)
        assert "email" in str(exc_info.value).lower()
    
    def test_short_password_rejected(self):
        """Test that password shorter than 8 characters is rejected."""
        data = {
            "name": "John Doe",
            "email": "john@example.com",
            "phone": "+1234567890",
            "business_name": "John's Store",
            "password": "short"
        }
        with pytest.raises(ValidationError) as exc_info:
            MerchantRegistrationRequest(**data)
        assert "8 characters" in str(exc_info.value)
    
    def test_whitespace_phone_rejected(self):
        """Test that whitespace-only phone is rejected."""
        data = {
            "name": "John Doe",
            "email": "john@example.com",
            "phone": "   ",
            "business_name": "John's Store",
            "password": "securepassword123"
        }
        with pytest.raises(ValidationError) as exc_info:
            MerchantRegistrationRequest(**data)
        assert "whitespace" in str(exc_info.value).lower()
    
    def test_whitespace_business_name_rejected(self):
        """Test that whitespace-only business name is rejected."""
        data = {
            "name": "John Doe",
            "email": "john@example.com",
            "phone": "+1234567890",
            "business_name": "   ",
            "password": "securepassword123"
        }
        with pytest.raises(ValidationError) as exc_info:
            MerchantRegistrationRequest(**data)
        assert "whitespace" in str(exc_info.value).lower()
    
    def test_fields_trimmed(self):
        """Test that string fields are trimmed."""
        data = {
            "name": "  John Doe  ",
            "email": "john@example.com",
            "phone": "  +1234567890  ",
            "business_name": "  John's Store  ",
            "password": "securepassword123"
        }
        request = MerchantRegistrationRequest(**data)
        assert request.name == "John Doe"
        assert request.phone == "+1234567890"
        assert request.business_name == "John's Store"


class TestDepositRequest:
    """Tests for DepositRequest schema."""
    
    def test_valid_deposit(self):
        """Test valid deposit request."""
        data = {
            "amount": Decimal("100.50"),
            "payment_provider": "stripe"
        }
        request = DepositRequest(**data)
        assert request.amount == Decimal("100.50")
        assert request.payment_provider == "stripe"
    
    def test_default_payment_provider(self):
        """Test default payment provider is stripe."""
        data = {"amount": Decimal("100.00")}
        request = DepositRequest(**data)
        assert request.payment_provider == "stripe"
    
    def test_zero_amount_rejected(self):
        """Test that zero amount is rejected."""
        data = {"amount": Decimal("0.00")}
        with pytest.raises(ValidationError) as exc_info:
            DepositRequest(**data)
        assert "greater than 0" in str(exc_info.value).lower()
    
    def test_negative_amount_rejected(self):
        """Test that negative amount is rejected."""
        data = {"amount": Decimal("-50.00")}
        with pytest.raises(ValidationError) as exc_info:
            DepositRequest(**data)
        assert "greater than 0" in str(exc_info.value).lower()
    
    def test_too_many_decimal_places_rejected(self):
        """Test that amount with more than 2 decimal places is rejected."""
        data = {"amount": Decimal("100.123")}
        with pytest.raises(ValidationError) as exc_info:
            DepositRequest(**data)
        assert "decimal places" in str(exc_info.value).lower()


class TestVendingTransactionRequest:
    """Tests for VendingTransactionRequest schema."""
    
    def test_valid_vending_transaction(self):
        """Test valid vending transaction request."""
        data = {
            "product_id": 1,
            "amount": Decimal("50.00"),
            "customer_identifier": "customer123",
            "metadata": {"key": "value"}
        }
        request = VendingTransactionRequest(**data)
        assert request.product_id == 1
        assert request.amount == Decimal("50.00")
        assert request.customer_identifier == "customer123"
        assert request.metadata == {"key": "value"}
    
    def test_zero_product_id_rejected(self):
        """Test that zero product_id is rejected."""
        data = {
            "product_id": 0,
            "amount": Decimal("50.00"),
            "customer_identifier": "customer123"
        }
        with pytest.raises(ValidationError) as exc_info:
            VendingTransactionRequest(**data)
        assert "product_id" in str(exc_info.value).lower()
    
    def test_negative_product_id_rejected(self):
        """Test that negative product_id is rejected."""
        data = {
            "product_id": -1,
            "amount": Decimal("50.00"),
            "customer_identifier": "customer123"
        }
        with pytest.raises(ValidationError) as exc_info:
            VendingTransactionRequest(**data)
        assert "product_id" in str(exc_info.value).lower()
    
    def test_zero_amount_rejected(self):
        """Test that zero amount is rejected."""
        data = {
            "product_id": 1,
            "amount": Decimal("0.00"),
            "customer_identifier": "customer123"
        }
        with pytest.raises(ValidationError) as exc_info:
            VendingTransactionRequest(**data)
        assert "greater than 0" in str(exc_info.value).lower()
    
    def test_whitespace_customer_identifier_rejected(self):
        """Test that whitespace-only customer identifier is rejected."""
        data = {
            "product_id": 1,
            "amount": Decimal("50.00"),
            "customer_identifier": "   "
        }
        with pytest.raises(ValidationError) as exc_info:
            VendingTransactionRequest(**data)
        assert "whitespace" in str(exc_info.value).lower()
    
    def test_customer_identifier_trimmed(self):
        """Test that customer identifier is trimmed."""
        data = {
            "product_id": 1,
            "amount": Decimal("50.00"),
            "customer_identifier": "  customer123  "
        }
        request = VendingTransactionRequest(**data)
        assert request.customer_identifier == "customer123"


class TestCashoutTransactionRequest:
    """Tests for CashoutTransactionRequest schema."""
    
    def test_valid_cashout(self):
        """Test valid cashout request."""
        data = {"amount": Decimal("75.25")}
        request = CashoutTransactionRequest(**data)
        assert request.amount == Decimal("75.25")
    
    def test_zero_amount_rejected(self):
        """Test that zero amount is rejected."""
        data = {"amount": Decimal("0.00")}
        with pytest.raises(ValidationError) as exc_info:
            CashoutTransactionRequest(**data)
        assert "greater than 0" in str(exc_info.value).lower()
    
    def test_negative_amount_rejected(self):
        """Test that negative amount is rejected."""
        data = {"amount": Decimal("-25.00")}
        with pytest.raises(ValidationError) as exc_info:
            CashoutTransactionRequest(**data)
        assert "greater than 0" in str(exc_info.value).lower()
    
    def test_too_many_decimal_places_rejected(self):
        """Test that amount with more than 2 decimal places is rejected."""
        data = {"amount": Decimal("75.999")}
        with pytest.raises(ValidationError) as exc_info:
            CashoutTransactionRequest(**data)
        assert "decimal places" in str(exc_info.value).lower()


class TestTransactionFilters:
    """Tests for TransactionFilters schema."""
    
    def test_valid_filters(self):
        """Test valid transaction filters."""
        data = {
            "transaction_type": "deposit",
            "status": "completed",
            "start_date": datetime(2024, 1, 1),
            "end_date": datetime(2024, 1, 31)
        }
        filters = TransactionFilters(**data)
        assert filters.transaction_type == "deposit"
        assert filters.status == "completed"
        assert filters.start_date == datetime(2024, 1, 1)
        assert filters.end_date == datetime(2024, 1, 31)
    
    def test_invalid_transaction_type_rejected(self):
        """Test that invalid transaction type is rejected."""
        data = {"transaction_type": "invalid_type"}
        with pytest.raises(ValidationError) as exc_info:
            TransactionFilters(**data)
        assert "transaction type" in str(exc_info.value).lower()
    
    def test_invalid_status_rejected(self):
        """Test that invalid status is rejected."""
        data = {"status": "invalid_status"}
        with pytest.raises(ValidationError) as exc_info:
            TransactionFilters(**data)
        assert "status" in str(exc_info.value).lower()
    
    def test_end_date_before_start_date_rejected(self):
        """Test that end_date before start_date is rejected."""
        data = {
            "start_date": datetime(2024, 1, 31),
            "end_date": datetime(2024, 1, 1)
        }
        with pytest.raises(ValidationError) as exc_info:
            TransactionFilters(**data)
        assert "after start_date" in str(exc_info.value).lower()
    
    def test_all_filters_optional(self):
        """Test that all filters are optional."""
        filters = TransactionFilters()
        assert filters.transaction_type is None
        assert filters.status is None
        assert filters.start_date is None
        assert filters.end_date is None


class TestNormalizedResponse:
    """Tests for NormalizedResponse schema."""
    
    def test_valid_success_response(self):
        """Test valid success response."""
        data = {
            "status": "success",
            "transaction_id": "txn123",
            "vendor_token": "token456",
            "message": "Transaction successful",
            "metadata": {"key": "value"}
        }
        response = NormalizedResponse(**data)
        assert response.status == "success"
        assert response.transaction_id == "txn123"
        assert response.vendor_token == "token456"
        assert response.message == "Transaction successful"
        assert response.metadata == {"key": "value"}
    
    def test_valid_failure_response(self):
        """Test valid failure response."""
        data = {
            "status": "failure",
            "message": "Transaction failed"
        }
        response = NormalizedResponse(**data)
        assert response.status == "failure"
        assert response.message == "Transaction failed"
    
    def test_valid_pending_response(self):
        """Test valid pending response."""
        data = {
            "status": "pending",
            "message": "Transaction pending"
        }
        response = NormalizedResponse(**data)
        assert response.status == "pending"
        assert response.message == "Transaction pending"
    
    def test_invalid_status_rejected(self):
        """Test that invalid status is rejected."""
        data = {
            "status": "invalid_status",
            "message": "Some message"
        }
        with pytest.raises(ValidationError) as exc_info:
            NormalizedResponse(**data)
        assert "status" in str(exc_info.value).lower()


class TestPaginationParams:
    """Tests for PaginationParams schema."""
    
    def test_default_pagination(self):
        """Test default pagination parameters."""
        params = PaginationParams()
        assert params.page == 1
        assert params.page_size == 20
    
    def test_custom_pagination(self):
        """Test custom pagination parameters."""
        params = PaginationParams(page=5, page_size=50)
        assert params.page == 5
        assert params.page_size == 50
    
    def test_zero_page_rejected(self):
        """Test that page 0 is rejected."""
        with pytest.raises(ValidationError) as exc_info:
            PaginationParams(page=0)
        assert "page" in str(exc_info.value).lower()
    
    def test_negative_page_rejected(self):
        """Test that negative page is rejected."""
        with pytest.raises(ValidationError) as exc_info:
            PaginationParams(page=-1)
        assert "page" in str(exc_info.value).lower()
    
    def test_zero_page_size_rejected(self):
        """Test that page_size 0 is rejected."""
        with pytest.raises(ValidationError) as exc_info:
            PaginationParams(page_size=0)
        assert "page_size" in str(exc_info.value).lower()
    
    def test_page_size_over_100_rejected(self):
        """Test that page_size over 100 is rejected."""
        with pytest.raises(ValidationError) as exc_info:
            PaginationParams(page_size=101)
        assert "page_size" in str(exc_info.value).lower()
