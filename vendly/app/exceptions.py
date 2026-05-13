"""
Exception hierarchy for Vendly platform.

This module defines all custom exceptions used throughout the platform,
providing a consistent error handling approach.
"""


class VendlyException(Exception):
    """
    Base exception for Vendly platform.
    
    All custom exceptions in the platform should inherit from this class.
    """
    
    def __init__(self, message: str, error_code: str = "VENDLY_ERROR", details: dict = None):
        """
        Initialize VendlyException.
        
        Args:
            message: Human-readable error message
            error_code: Machine-readable error code
            details: Additional error context
        """
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        super().__init__(self.message)


class AuthenticationError(VendlyException):
    """
    Raised when authentication fails.
    
    Examples:
        - Invalid credentials
        - Expired JWT token
        - Missing authentication token
    """
    
    def __init__(self, message: str = "Authentication failed", details: dict = None):
        super().__init__(
            message=message,
            error_code="AUTHENTICATION_ERROR",
            details=details
        )


class InsufficientFloatError(VendlyException):
    """
    Raised when merchant has insufficient float for transaction.
    
    This exception is raised when a merchant attempts a vending transaction
    but does not have enough float balance to cover the transaction amount.
    """
    
    def __init__(
        self,
        message: str = "Insufficient float balance",
        required_amount: float = None,
        available_float: float = None,
        details: dict = None
    ):
        error_details = details or {}
        if required_amount is not None:
            error_details["required_amount"] = f"{required_amount:.2f}"
        if available_float is not None:
            error_details["available_float"] = f"{available_float:.2f}"
        
        super().__init__(
            message=message,
            error_code="INSUFFICIENT_FLOAT",
            details=error_details
        )


class VendorError(VendlyException):
    """
    Raised when vendor transaction fails.
    
    This exception is raised when a vendor API call fails or returns
    an error response.
    """
    
    def __init__(
        self,
        message: str = "Vendor transaction failed",
        vendor_name: str = None,
        vendor_response: dict = None,
        details: dict = None
    ):
        error_details = details or {}
        if vendor_name:
            error_details["vendor_name"] = vendor_name
        if vendor_response:
            error_details["vendor_response"] = vendor_response
        
        super().__init__(
            message=message,
            error_code="VENDOR_ERROR",
            details=error_details
        )


class SLAViolationError(VendlyException):
    """
    Raised when vendor exceeds SLA timeout.
    
    This exception is raised when a vendor response time exceeds
    the configured SLA threshold.
    """
    
    def __init__(
        self,
        message: str = "Vendor SLA violation",
        vendor_name: str = None,
        response_time_ms: int = None,
        sla_threshold_ms: int = None,
        details: dict = None
    ):
        error_details = details or {}
        if vendor_name:
            error_details["vendor_name"] = vendor_name
        if response_time_ms is not None:
            error_details["response_time_ms"] = response_time_ms
        if sla_threshold_ms is not None:
            error_details["sla_threshold_ms"] = sla_threshold_ms
        
        super().__init__(
            message=message,
            error_code="SLA_VIOLATION",
            details=error_details
        )


class PaymentProcessingError(VendlyException):
    """
    Raised when payment processing fails.
    
    This exception is raised when a payment provider API call fails
    or returns an error response.
    """
    
    def __init__(
        self,
        message: str = "Payment processing failed",
        payment_provider: str = None,
        payment_reference: str = None,
        details: dict = None
    ):
        error_details = details or {}
        if payment_provider:
            error_details["payment_provider"] = payment_provider
        if payment_reference:
            error_details["payment_reference"] = payment_reference
        
        super().__init__(
            message=message,
            error_code="PAYMENT_PROCESSING_ERROR",
            details=error_details
        )


class CommissionCalculationError(VendlyException):
    """
    Raised when commission calculation fails.
    
    This exception is raised when there's an error calculating
    commission for a transaction (e.g., missing commission rules,
    invalid calculation method).
    """
    
    def __init__(
        self,
        message: str = "Commission calculation failed",
        product_id: int = None,
        calculation_method: str = None,
        details: dict = None
    ):
        error_details = details or {}
        if product_id is not None:
            error_details["product_id"] = product_id
        if calculation_method:
            error_details["calculation_method"] = calculation_method
        
        super().__init__(
            message=message,
            error_code="COMMISSION_CALCULATION_ERROR",
            details=error_details
        )


class DuplicateWebhookError(VendlyException):
    """
    Raised when attempting to process duplicate webhook.
    
    This exception is raised when a webhook event with the same
    event ID has already been processed, ensuring idempotency.
    """
    
    def __init__(
        self,
        message: str = "Duplicate webhook event",
        event_id: str = None,
        provider: str = None,
        details: dict = None
    ):
        error_details = details or {}
        if event_id:
            error_details["event_id"] = event_id
        if provider:
            error_details["provider"] = provider
        
        super().__init__(
            message=message,
            error_code="DUPLICATE_WEBHOOK",
            details=error_details
        )
