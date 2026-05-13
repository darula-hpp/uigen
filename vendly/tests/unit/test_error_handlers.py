"""
Unit tests for error handlers.

Tests the FastAPI exception handlers to ensure they return
proper error responses with correct status codes and formats.
"""
import pytest
from datetime import datetime
from fastapi import FastAPI, status
from fastapi.testclient import TestClient
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel, Field

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
from app.error_handlers import register_exception_handlers


# Create test app with exception handlers
@pytest.fixture
def test_app():
    """Create a test FastAPI application with exception handlers."""
    app = FastAPI()
    register_exception_handlers(app)
    
    # Add test routes that raise different exceptions
    @app.get("/test/vendly-exception")
    async def raise_vendly_exception():
        raise VendlyException("Test vendly error", "TEST_ERROR", {"key": "value"})
    
    @app.get("/test/authentication-error")
    async def raise_authentication_error():
        raise AuthenticationError("Invalid credentials")
    
    @app.get("/test/insufficient-float")
    async def raise_insufficient_float():
        raise InsufficientFloatError(
            required_amount=100.00,
            available_float=50.00
        )
    
    @app.get("/test/vendor-error")
    async def raise_vendor_error():
        raise VendorError(
            vendor_name="TestVendor",
            vendor_response={"status": "failed", "code": "ERR_001"}
        )
    
    @app.get("/test/sla-violation")
    async def raise_sla_violation():
        raise SLAViolationError(
            vendor_name="TestVendor",
            response_time_ms=5000,
            sla_threshold_ms=3000
        )
    
    @app.get("/test/payment-error")
    async def raise_payment_error():
        raise PaymentProcessingError(
            payment_provider="Stripe",
            payment_reference="pi_123456"
        )
    
    @app.get("/test/commission-error")
    async def raise_commission_error():
        raise CommissionCalculationError(
            product_id=123,
            calculation_method="percentage"
        )
    
    @app.get("/test/duplicate-webhook")
    async def raise_duplicate_webhook():
        raise DuplicateWebhookError(
            event_id="evt_123456",
            provider="Stripe"
        )
    
    @app.get("/test/generic-exception")
    async def raise_generic_exception():
        raise ValueError("Unexpected error")
    
    # Test route for validation errors
    class TestModel(BaseModel):
        amount: float = Field(..., gt=0)
        email: str
    
    @app.post("/test/validation-error")
    async def raise_validation_error(data: TestModel):
        return {"status": "ok"}
    
    return app


@pytest.fixture
def client(test_app):
    """Create a test client."""
    return TestClient(test_app, raise_server_exceptions=False)


class TestErrorResponseFormat:
    """Test error response format consistency."""
    
    def test_error_response_has_required_fields(self, client):
        """Test error response contains all required fields."""
        response = client.get("/test/vendly-exception")
        
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        data = response.json()
        
        assert "error" in data
        assert "error_code" in data
        assert "status_code" in data
        assert "timestamp" in data
        
        assert isinstance(data["error"], str)
        assert isinstance(data["error_code"], str)
        assert isinstance(data["status_code"], int)
        assert isinstance(data["timestamp"], str)
    
    def test_error_response_timestamp_format(self, client):
        """Test error response timestamp is in ISO format."""
        response = client.get("/test/vendly-exception")
        data = response.json()
        
        # Verify timestamp can be parsed as ISO format
        timestamp = data["timestamp"]
        assert timestamp.endswith("Z")
        datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
    
    def test_error_response_includes_details_when_present(self, client):
        """Test error response includes details field when available."""
        response = client.get("/test/vendly-exception")
        data = response.json()
        
        assert "details" in data
        assert data["details"]["key"] == "value"


class TestAuthenticationErrorHandler:
    """Test AuthenticationError handler."""
    
    def test_returns_401_status_code(self, client):
        """Test AuthenticationError returns HTTP 401."""
        response = client.get("/test/authentication-error")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_returns_correct_error_code(self, client):
        """Test AuthenticationError returns correct error code."""
        response = client.get("/test/authentication-error")
        data = response.json()
        
        assert data["error_code"] == "AUTHENTICATION_ERROR"
    
    def test_returns_error_message(self, client):
        """Test AuthenticationError returns error message."""
        response = client.get("/test/authentication-error")
        data = response.json()
        
        assert data["error"] == "Invalid credentials"


class TestInsufficientFloatErrorHandler:
    """Test InsufficientFloatError handler."""
    
    def test_returns_400_status_code(self, client):
        """Test InsufficientFloatError returns HTTP 400."""
        response = client.get("/test/insufficient-float")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_returns_correct_error_code(self, client):
        """Test InsufficientFloatError returns correct error code."""
        response = client.get("/test/insufficient-float")
        data = response.json()
        
        assert data["error_code"] == "INSUFFICIENT_FLOAT"
    
    def test_includes_amount_details(self, client):
        """Test InsufficientFloatError includes amount details."""
        response = client.get("/test/insufficient-float")
        data = response.json()
        
        assert "details" in data
        assert data["details"]["required_amount"] == "100.0"
        assert data["details"]["available_float"] == "50.0"


class TestVendorErrorHandler:
    """Test VendorError handler."""
    
    def test_returns_502_status_code(self, client):
        """Test VendorError returns HTTP 502."""
        response = client.get("/test/vendor-error")
        assert response.status_code == status.HTTP_502_BAD_GATEWAY
    
    def test_returns_correct_error_code(self, client):
        """Test VendorError returns correct error code."""
        response = client.get("/test/vendor-error")
        data = response.json()
        
        assert data["error_code"] == "VENDOR_ERROR"
    
    def test_sanitizes_vendor_response(self, client):
        """Test VendorError sanitizes vendor response."""
        response = client.get("/test/vendor-error")
        data = response.json()
        
        assert "details" in data
        assert "vendor_name" in data["details"]
        assert "vendor_response" in data["details"]
        
        # Only safe fields should be included
        vendor_response = data["details"]["vendor_response"]
        assert "status" in vendor_response
        assert "message" in vendor_response


class TestSLAViolationErrorHandler:
    """Test SLAViolationError handler."""
    
    def test_returns_504_status_code(self, client):
        """Test SLAViolationError returns HTTP 504."""
        response = client.get("/test/sla-violation")
        assert response.status_code == status.HTTP_504_GATEWAY_TIMEOUT
    
    def test_returns_correct_error_code(self, client):
        """Test SLAViolationError returns correct error code."""
        response = client.get("/test/sla-violation")
        data = response.json()
        
        assert data["error_code"] == "SLA_VIOLATION"
    
    def test_includes_timing_details(self, client):
        """Test SLAViolationError includes timing details."""
        response = client.get("/test/sla-violation")
        data = response.json()
        
        assert "details" in data
        assert data["details"]["response_time_ms"] == 5000
        assert data["details"]["sla_threshold_ms"] == 3000


class TestPaymentProcessingErrorHandler:
    """Test PaymentProcessingError handler."""
    
    def test_returns_502_status_code(self, client):
        """Test PaymentProcessingError returns HTTP 502."""
        response = client.get("/test/payment-error")
        assert response.status_code == status.HTTP_502_BAD_GATEWAY
    
    def test_returns_correct_error_code(self, client):
        """Test PaymentProcessingError returns correct error code."""
        response = client.get("/test/payment-error")
        data = response.json()
        
        assert data["error_code"] == "PAYMENT_PROCESSING_ERROR"
    
    def test_includes_payment_details(self, client):
        """Test PaymentProcessingError includes payment details."""
        response = client.get("/test/payment-error")
        data = response.json()
        
        assert "details" in data
        assert data["details"]["payment_provider"] == "Stripe"
        assert data["details"]["payment_reference"] == "pi_123456"


class TestCommissionCalculationErrorHandler:
    """Test CommissionCalculationError handler."""
    
    def test_returns_422_status_code(self, client):
        """Test CommissionCalculationError returns HTTP 422."""
        response = client.get("/test/commission-error")
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    def test_returns_correct_error_code(self, client):
        """Test CommissionCalculationError returns correct error code."""
        response = client.get("/test/commission-error")
        data = response.json()
        
        assert data["error_code"] == "COMMISSION_CALCULATION_ERROR"
    
    def test_includes_calculation_details(self, client):
        """Test CommissionCalculationError includes calculation details."""
        response = client.get("/test/commission-error")
        data = response.json()
        
        assert "details" in data
        assert data["details"]["product_id"] == 123
        assert data["details"]["calculation_method"] == "percentage"


class TestDuplicateWebhookErrorHandler:
    """Test DuplicateWebhookError handler."""
    
    def test_returns_409_status_code(self, client):
        """Test DuplicateWebhookError returns HTTP 409."""
        response = client.get("/test/duplicate-webhook")
        assert response.status_code == status.HTTP_409_CONFLICT
    
    def test_returns_correct_error_code(self, client):
        """Test DuplicateWebhookError returns correct error code."""
        response = client.get("/test/duplicate-webhook")
        data = response.json()
        
        assert data["error_code"] == "DUPLICATE_WEBHOOK"
    
    def test_includes_webhook_details(self, client):
        """Test DuplicateWebhookError includes webhook details."""
        response = client.get("/test/duplicate-webhook")
        data = response.json()
        
        assert "details" in data
        assert data["details"]["event_id"] == "evt_123456"
        assert data["details"]["provider"] == "Stripe"


class TestValidationErrorHandler:
    """Test FastAPI validation error handler."""
    
    def test_returns_400_status_code(self, client):
        """Test validation error returns HTTP 400."""
        response = client.post("/test/validation-error", json={})
        assert response.status_code == status.HTTP_400_BAD_REQUEST
    
    def test_returns_correct_error_code(self, client):
        """Test validation error returns correct error code."""
        response = client.post("/test/validation-error", json={})
        data = response.json()
        
        assert data["error_code"] == "VALIDATION_ERROR"
    
    def test_includes_validation_errors(self, client):
        """Test validation error includes validation details."""
        response = client.post("/test/validation-error", json={})
        data = response.json()
        
        assert "details" in data
        assert "validation_errors" in data["details"]
        assert isinstance(data["details"]["validation_errors"], list)
        assert len(data["details"]["validation_errors"]) > 0
    
    def test_validation_error_format(self, client):
        """Test validation error has correct format."""
        response = client.post("/test/validation-error", json={})
        data = response.json()
        
        validation_errors = data["details"]["validation_errors"]
        for error in validation_errors:
            assert "field" in error
            assert "message" in error
            assert "type" in error


class TestGenericExceptionHandler:
    """Test generic exception handler."""
    
    def test_returns_500_status_code(self, client):
        """Test generic exception returns HTTP 500."""
        response = client.get("/test/generic-exception")
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
    
    def test_returns_generic_error_code(self, client):
        """Test generic exception returns generic error code."""
        response = client.get("/test/generic-exception")
        data = response.json()
        
        assert data["error_code"] == "INTERNAL_SERVER_ERROR"
    
    def test_does_not_expose_internal_details(self, client):
        """Test generic exception does not expose internal error details."""
        response = client.get("/test/generic-exception")
        data = response.json()
        
        # Should return generic message, not "Unexpected error"
        assert data["error"] == "An unexpected error occurred"
        # Should not include details
        assert "details" not in data or data.get("details") is None


class TestHTTPStatusCodeMapping:
    """Test HTTP status code mapping for different error types."""
    
    def test_status_code_mapping(self, client):
        """Test correct HTTP status codes are returned for each error type."""
        test_cases = [
            ("/test/authentication-error", status.HTTP_401_UNAUTHORIZED),
            ("/test/insufficient-float", status.HTTP_400_BAD_REQUEST),
            ("/test/vendor-error", status.HTTP_502_BAD_GATEWAY),
            ("/test/sla-violation", status.HTTP_504_GATEWAY_TIMEOUT),
            ("/test/payment-error", status.HTTP_502_BAD_GATEWAY),
            ("/test/commission-error", status.HTTP_422_UNPROCESSABLE_ENTITY),
            ("/test/duplicate-webhook", status.HTTP_409_CONFLICT),
            ("/test/generic-exception", status.HTTP_500_INTERNAL_SERVER_ERROR),
        ]
        
        for endpoint, expected_status in test_cases:
            response = client.get(endpoint)
            assert response.status_code == expected_status
            
            # Verify status_code in response body matches HTTP status
            data = response.json()
            assert data["status_code"] == expected_status
