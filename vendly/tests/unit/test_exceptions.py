"""
Unit tests for exception hierarchy.

Tests the custom exception classes to ensure they properly
store error information and maintain the exception hierarchy.
"""
import pytest
from app.exceptions import (
    VendlyException,
    AuthenticationError,
    InsufficientFloatError,
    VendorError,
    SLAViolationError,
    PaymentProcessingError,
    CommissionCalculationError,
    DuplicateWebhookError,
)


class TestVendlyException:
    """Test base VendlyException class."""
    
    def test_base_exception_with_message(self):
        """Test VendlyException with message only."""
        exc = VendlyException("Test error")
        assert exc.message == "Test error"
        assert exc.error_code == "VENDLY_ERROR"
        assert exc.details == {}
        assert str(exc) == "Test error"
    
    def test_base_exception_with_all_params(self):
        """Test VendlyException with all parameters."""
        details = {"key": "value"}
        exc = VendlyException(
            message="Test error",
            error_code="CUSTOM_ERROR",
            details=details
        )
        assert exc.message == "Test error"
        assert exc.error_code == "CUSTOM_ERROR"
        assert exc.details == details
    
    def test_base_exception_inheritance(self):
        """Test VendlyException inherits from Exception."""
        exc = VendlyException("Test error")
        assert isinstance(exc, Exception)


class TestAuthenticationError:
    """Test AuthenticationError class."""
    
    def test_default_message(self):
        """Test AuthenticationError with default message."""
        exc = AuthenticationError()
        assert exc.message == "Authentication failed"
        assert exc.error_code == "AUTHENTICATION_ERROR"
        assert exc.details == {}
    
    def test_custom_message(self):
        """Test AuthenticationError with custom message."""
        exc = AuthenticationError("Invalid token")
        assert exc.message == "Invalid token"
        assert exc.error_code == "AUTHENTICATION_ERROR"
    
    def test_with_details(self):
        """Test AuthenticationError with details."""
        details = {"token_type": "JWT", "reason": "expired"}
        exc = AuthenticationError("Token expired", details=details)
        assert exc.details == details
    
    def test_inheritance(self):
        """Test AuthenticationError inherits from VendlyException."""
        exc = AuthenticationError()
        assert isinstance(exc, VendlyException)
        assert isinstance(exc, Exception)


class TestInsufficientFloatError:
    """Test InsufficientFloatError class."""
    
    def test_default_message(self):
        """Test InsufficientFloatError with default message."""
        exc = InsufficientFloatError()
        assert exc.message == "Insufficient float balance"
        assert exc.error_code == "INSUFFICIENT_FLOAT"
        assert exc.details == {}
    
    def test_with_amounts(self):
        """Test InsufficientFloatError with required and available amounts."""
        exc = InsufficientFloatError(
            required_amount=100.00,
            available_float=50.00
        )
        assert exc.details["required_amount"] == "100.0"
        assert exc.details["available_float"] == "50.0"
    
    def test_with_custom_message_and_amounts(self):
        """Test InsufficientFloatError with custom message and amounts."""
        exc = InsufficientFloatError(
            message="Not enough funds",
            required_amount=200.00,
            available_float=150.00
        )
        assert exc.message == "Not enough funds"
        assert exc.details["required_amount"] == "200.0"
        assert exc.details["available_float"] == "150.0"
    
    def test_with_additional_details(self):
        """Test InsufficientFloatError with additional details."""
        details = {"merchant_id": 123, "transaction_type": "vending"}
        exc = InsufficientFloatError(
            required_amount=100.00,
            available_float=50.00,
            details=details
        )
        assert exc.details["merchant_id"] == 123
        assert exc.details["transaction_type"] == "vending"
        assert exc.details["required_amount"] == "100.0"
        assert exc.details["available_float"] == "50.0"
    
    def test_inheritance(self):
        """Test InsufficientFloatError inherits from VendlyException."""
        exc = InsufficientFloatError()
        assert isinstance(exc, VendlyException)
        assert isinstance(exc, Exception)


class TestVendorError:
    """Test VendorError class."""
    
    def test_default_message(self):
        """Test VendorError with default message."""
        exc = VendorError()
        assert exc.message == "Vendor transaction failed"
        assert exc.error_code == "VENDOR_ERROR"
        assert exc.details == {}
    
    def test_with_vendor_name(self):
        """Test VendorError with vendor name."""
        exc = VendorError(vendor_name="TestVendor")
        assert exc.details["vendor_name"] == "TestVendor"
    
    def test_with_vendor_response(self):
        """Test VendorError with vendor response."""
        vendor_response = {"status": "failed", "code": "ERR_001"}
        exc = VendorError(vendor_response=vendor_response)
        assert exc.details["vendor_response"] == vendor_response
    
    def test_with_all_params(self):
        """Test VendorError with all parameters."""
        vendor_response = {"status": "failed", "code": "ERR_001"}
        exc = VendorError(
            message="Vendor API timeout",
            vendor_name="TestVendor",
            vendor_response=vendor_response
        )
        assert exc.message == "Vendor API timeout"
        assert exc.details["vendor_name"] == "TestVendor"
        assert exc.details["vendor_response"] == vendor_response
    
    def test_inheritance(self):
        """Test VendorError inherits from VendlyException."""
        exc = VendorError()
        assert isinstance(exc, VendlyException)
        assert isinstance(exc, Exception)


class TestSLAViolationError:
    """Test SLAViolationError class."""
    
    def test_default_message(self):
        """Test SLAViolationError with default message."""
        exc = SLAViolationError()
        assert exc.message == "Vendor SLA violation"
        assert exc.error_code == "SLA_VIOLATION"
        assert exc.details == {}
    
    def test_with_timing_info(self):
        """Test SLAViolationError with timing information."""
        exc = SLAViolationError(
            vendor_name="TestVendor",
            response_time_ms=5000,
            sla_threshold_ms=3000
        )
        assert exc.details["vendor_name"] == "TestVendor"
        assert exc.details["response_time_ms"] == 5000
        assert exc.details["sla_threshold_ms"] == 3000
    
    def test_with_custom_message(self):
        """Test SLAViolationError with custom message."""
        exc = SLAViolationError(
            message="Response too slow",
            response_time_ms=5000,
            sla_threshold_ms=3000
        )
        assert exc.message == "Response too slow"
        assert exc.details["response_time_ms"] == 5000
    
    def test_inheritance(self):
        """Test SLAViolationError inherits from VendlyException."""
        exc = SLAViolationError()
        assert isinstance(exc, VendlyException)
        assert isinstance(exc, Exception)


class TestPaymentProcessingError:
    """Test PaymentProcessingError class."""
    
    def test_default_message(self):
        """Test PaymentProcessingError with default message."""
        exc = PaymentProcessingError()
        assert exc.message == "Payment processing failed"
        assert exc.error_code == "PAYMENT_PROCESSING_ERROR"
        assert exc.details == {}
    
    def test_with_payment_info(self):
        """Test PaymentProcessingError with payment information."""
        exc = PaymentProcessingError(
            payment_provider="Stripe",
            payment_reference="pi_123456"
        )
        assert exc.details["payment_provider"] == "Stripe"
        assert exc.details["payment_reference"] == "pi_123456"
    
    def test_with_custom_message(self):
        """Test PaymentProcessingError with custom message."""
        exc = PaymentProcessingError(
            message="Card declined",
            payment_provider="Stripe"
        )
        assert exc.message == "Card declined"
        assert exc.details["payment_provider"] == "Stripe"
    
    def test_inheritance(self):
        """Test PaymentProcessingError inherits from VendlyException."""
        exc = PaymentProcessingError()
        assert isinstance(exc, VendlyException)
        assert isinstance(exc, Exception)


class TestCommissionCalculationError:
    """Test CommissionCalculationError class."""
    
    def test_default_message(self):
        """Test CommissionCalculationError with default message."""
        exc = CommissionCalculationError()
        assert exc.message == "Commission calculation failed"
        assert exc.error_code == "COMMISSION_CALCULATION_ERROR"
        assert exc.details == {}
    
    def test_with_product_info(self):
        """Test CommissionCalculationError with product information."""
        exc = CommissionCalculationError(
            product_id=123,
            calculation_method="percentage"
        )
        assert exc.details["product_id"] == 123
        assert exc.details["calculation_method"] == "percentage"
    
    def test_with_custom_message(self):
        """Test CommissionCalculationError with custom message."""
        exc = CommissionCalculationError(
            message="Missing commission rules",
            product_id=123
        )
        assert exc.message == "Missing commission rules"
        assert exc.details["product_id"] == 123
    
    def test_inheritance(self):
        """Test CommissionCalculationError inherits from VendlyException."""
        exc = CommissionCalculationError()
        assert isinstance(exc, VendlyException)
        assert isinstance(exc, Exception)


class TestDuplicateWebhookError:
    """Test DuplicateWebhookError class."""
    
    def test_default_message(self):
        """Test DuplicateWebhookError with default message."""
        exc = DuplicateWebhookError()
        assert exc.message == "Duplicate webhook event"
        assert exc.error_code == "DUPLICATE_WEBHOOK"
        assert exc.details == {}
    
    def test_with_webhook_info(self):
        """Test DuplicateWebhookError with webhook information."""
        exc = DuplicateWebhookError(
            event_id="evt_123456",
            provider="Stripe"
        )
        assert exc.details["event_id"] == "evt_123456"
        assert exc.details["provider"] == "Stripe"
    
    def test_with_custom_message(self):
        """Test DuplicateWebhookError with custom message."""
        exc = DuplicateWebhookError(
            message="Event already processed",
            event_id="evt_123456"
        )
        assert exc.message == "Event already processed"
        assert exc.details["event_id"] == "evt_123456"
    
    def test_inheritance(self):
        """Test DuplicateWebhookError inherits from VendlyException."""
        exc = DuplicateWebhookError()
        assert isinstance(exc, VendlyException)
        assert isinstance(exc, Exception)


class TestExceptionHierarchy:
    """Test exception hierarchy relationships."""
    
    def test_all_custom_exceptions_inherit_from_vendly_exception(self):
        """Test all custom exceptions inherit from VendlyException."""
        exception_classes = [
            AuthenticationError,
            InsufficientFloatError,
            VendorError,
            SLAViolationError,
            PaymentProcessingError,
            CommissionCalculationError,
            DuplicateWebhookError,
        ]
        
        for exc_class in exception_classes:
            exc = exc_class()
            assert isinstance(exc, VendlyException)
            assert isinstance(exc, Exception)
    
    def test_exception_can_be_caught_as_vendly_exception(self):
        """Test specific exceptions can be caught as VendlyException."""
        try:
            raise AuthenticationError("Test error")
        except VendlyException as e:
            assert e.message == "Test error"
            assert e.error_code == "AUTHENTICATION_ERROR"
    
    def test_exception_can_be_caught_as_base_exception(self):
        """Test specific exceptions can be caught as Exception."""
        try:
            raise InsufficientFloatError("Test error")
        except Exception as e:
            assert isinstance(e, VendlyException)
            assert str(e) == "Test error"
