"""
FastAPI exception handlers for Vendly platform.

This module provides centralized error handling with standardized
error response formats and appropriate HTTP status codes.
"""
from datetime import datetime, timezone
from typing import Any, Dict
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import IntegrityError
import logging

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

logger = logging.getLogger(__name__)


def create_error_response(
    error_message: str,
    error_code: str,
    status_code: int,
    details: Dict[str, Any] = None,
) -> JSONResponse:
    """
    Create a standardized error response.
    
    Args:
        error_message: Human-readable error message
        error_code: Machine-readable error code
        status_code: HTTP status code
        details: Additional error context
        
    Returns:
        JSONResponse with standardized error format
    """
    error_response = {
        "error": error_message,
        "error_code": error_code,
        "status_code": status_code,
        "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    }
    
    if details:
        error_response["details"] = details
    
    return JSONResponse(
        status_code=status_code,
        content=error_response,
    )


async def vendly_exception_handler(request: Request, exc: VendlyException) -> JSONResponse:
    """
    Handle base VendlyException.
    
    This is a catch-all handler for any VendlyException that doesn't
    have a more specific handler.
    
    Args:
        request: FastAPI request object
        exc: VendlyException instance
        
    Returns:
        JSONResponse with error details
    """
    logger.error(
        f"VendlyException occurred: {exc.message}",
        extra={
            "error_code": exc.error_code,
            "details": exc.details,
            "path": request.url.path,
            "method": request.method,
        },
    )
    
    return create_error_response(
        error_message=exc.message,
        error_code=exc.error_code,
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        details=exc.details,
    )


async def authentication_error_handler(
    request: Request, exc: AuthenticationError
) -> JSONResponse:
    """
    Handle AuthenticationError.
    
    Returns HTTP 401 Unauthorized for authentication failures.
    
    Args:
        request: FastAPI request object
        exc: AuthenticationError instance
        
    Returns:
        JSONResponse with error details
    """
    logger.warning(
        f"Authentication failed: {exc.message}",
        extra={
            "path": request.url.path,
            "method": request.method,
            "details": exc.details,
        },
    )
    
    return create_error_response(
        error_message=exc.message,
        error_code=exc.error_code,
        status_code=status.HTTP_401_UNAUTHORIZED,
        details=exc.details,
    )


async def insufficient_float_error_handler(
    request: Request, exc: InsufficientFloatError
) -> JSONResponse:
    """
    Handle InsufficientFloatError.
    
    Returns HTTP 400 Bad Request for insufficient float balance.
    
    Args:
        request: FastAPI request object
        exc: InsufficientFloatError instance
        
    Returns:
        JSONResponse with error details
    """
    logger.info(
        f"Insufficient float: {exc.message}",
        extra={
            "path": request.url.path,
            "method": request.method,
            "details": exc.details,
        },
    )
    
    return create_error_response(
        error_message=exc.message,
        error_code=exc.error_code,
        status_code=status.HTTP_400_BAD_REQUEST,
        details=exc.details,
    )


async def vendor_error_handler(request: Request, exc: VendorError) -> JSONResponse:
    """
    Handle VendorError.
    
    Returns HTTP 502 Bad Gateway for vendor transaction failures.
    
    Args:
        request: FastAPI request object
        exc: VendorError instance
        
    Returns:
        JSONResponse with error details
    """
    logger.error(
        f"Vendor error: {exc.message}",
        extra={
            "path": request.url.path,
            "method": request.method,
            "details": exc.details,
        },
    )
    
    # Sanitize vendor response to avoid exposing sensitive information
    sanitized_details = exc.details.copy()
    if "vendor_response" in sanitized_details:
        # Only include safe fields from vendor response
        vendor_response = sanitized_details["vendor_response"]
        if isinstance(vendor_response, dict):
            sanitized_details["vendor_response"] = {
                "status": vendor_response.get("status"),
                "message": vendor_response.get("message"),
            }
    
    return create_error_response(
        error_message=exc.message,
        error_code=exc.error_code,
        status_code=status.HTTP_502_BAD_GATEWAY,
        details=sanitized_details,
    )


async def sla_violation_error_handler(
    request: Request, exc: SLAViolationError
) -> JSONResponse:
    """
    Handle SLAViolationError.
    
    Returns HTTP 504 Gateway Timeout for SLA violations.
    Note: This error is typically logged but not raised to clients,
    as transactions continue processing despite SLA violations.
    
    Args:
        request: FastAPI request object
        exc: SLAViolationError instance
        
    Returns:
        JSONResponse with error details
    """
    logger.warning(
        f"SLA violation: {exc.message}",
        extra={
            "path": request.url.path,
            "method": request.method,
            "details": exc.details,
        },
    )
    
    return create_error_response(
        error_message=exc.message,
        error_code=exc.error_code,
        status_code=status.HTTP_504_GATEWAY_TIMEOUT,
        details=exc.details,
    )


async def payment_processing_error_handler(
    request: Request, exc: PaymentProcessingError
) -> JSONResponse:
    """
    Handle PaymentProcessingError.
    
    Returns HTTP 502 Bad Gateway for payment processing failures.
    
    Args:
        request: FastAPI request object
        exc: PaymentProcessingError instance
        
    Returns:
        JSONResponse with error details
    """
    logger.error(
        f"Payment processing error: {exc.message}",
        extra={
            "path": request.url.path,
            "method": request.method,
            "details": exc.details,
        },
    )
    
    return create_error_response(
        error_message=exc.message,
        error_code=exc.error_code,
        status_code=status.HTTP_502_BAD_GATEWAY,
        details=exc.details,
    )


async def commission_calculation_error_handler(
    request: Request, exc: CommissionCalculationError
) -> JSONResponse:
    """
    Handle CommissionCalculationError.
    
    Returns HTTP 422 Unprocessable Entity for commission calculation failures.
    
    Args:
        request: FastAPI request object
        exc: CommissionCalculationError instance
        
    Returns:
        JSONResponse with error details
    """
    logger.error(
        f"Commission calculation error: {exc.message}",
        extra={
            "path": request.url.path,
            "method": request.method,
            "details": exc.details,
        },
    )
    
    return create_error_response(
        error_message=exc.message,
        error_code=exc.error_code,
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        details=exc.details,
    )


async def duplicate_webhook_error_handler(
    request: Request, exc: DuplicateWebhookError
) -> JSONResponse:
    """
    Handle DuplicateWebhookError.
    
    Returns HTTP 409 Conflict for duplicate webhook events.
    
    Args:
        request: FastAPI request object
        exc: DuplicateWebhookError instance
        
    Returns:
        JSONResponse with error details
    """
    logger.info(
        f"Duplicate webhook: {exc.message}",
        extra={
            "path": request.url.path,
            "method": request.method,
            "details": exc.details,
        },
    )
    
    return create_error_response(
        error_message=exc.message,
        error_code=exc.error_code,
        status_code=status.HTTP_409_CONFLICT,
        details=exc.details,
    )


async def validation_error_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """
    Handle FastAPI RequestValidationError.
    
    Returns HTTP 400 Bad Request for validation errors.
    
    Args:
        request: FastAPI request object
        exc: RequestValidationError instance
        
    Returns:
        JSONResponse with validation error details
    """
    logger.info(
        f"Validation error: {exc.errors()}",
        extra={
            "path": request.url.path,
            "method": request.method,
        },
    )
    
    # Format validation errors for better readability
    validation_errors = []
    for error in exc.errors():
        validation_errors.append({
            "field": ".".join(str(loc) for loc in error["loc"]),
            "message": error["msg"],
            "type": error["type"],
        })
    
    return create_error_response(
        error_message="Request validation failed",
        error_code="VALIDATION_ERROR",
        status_code=status.HTTP_400_BAD_REQUEST,
        details={"validation_errors": validation_errors},
    )


async def integrity_error_handler(
    request: Request, exc: IntegrityError
) -> JSONResponse:
    """
    Handle SQLAlchemy IntegrityError.
    
    Returns HTTP 409 Conflict for database integrity violations
    (e.g., unique constraint violations).
    
    Args:
        request: FastAPI request object
        exc: IntegrityError instance
        
    Returns:
        JSONResponse with error details
    """
    logger.error(
        f"Database integrity error: {str(exc)}",
        extra={
            "path": request.url.path,
            "method": request.method,
        },
    )
    
    # Extract constraint name if available
    error_message = "Database integrity constraint violated"
    details = {}
    
    if "unique constraint" in str(exc).lower():
        error_message = "Resource already exists"
        details["constraint_type"] = "unique"
    elif "foreign key constraint" in str(exc).lower():
        error_message = "Referenced resource does not exist"
        details["constraint_type"] = "foreign_key"
    
    return create_error_response(
        error_message=error_message,
        error_code="INTEGRITY_ERROR",
        status_code=status.HTTP_409_CONFLICT,
        details=details,
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Handle unexpected exceptions.
    
    Returns HTTP 500 Internal Server Error for unexpected errors.
    This is a catch-all handler for any exception not handled by
    more specific handlers.
    
    Args:
        request: FastAPI request object
        exc: Exception instance
        
    Returns:
        JSONResponse with generic error message
    """
    logger.exception(
        f"Unexpected error: {str(exc)}",
        extra={
            "path": request.url.path,
            "method": request.method,
        },
    )
    
    # Don't expose internal error details to clients
    return create_error_response(
        error_message="An unexpected error occurred",
        error_code="INTERNAL_SERVER_ERROR",
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )


def register_exception_handlers(app) -> None:
    """
    Register all exception handlers with the FastAPI application.
    
    Args:
        app: FastAPI application instance
    """
    # Register specific exception handlers
    app.add_exception_handler(AuthenticationError, authentication_error_handler)
    app.add_exception_handler(InsufficientFloatError, insufficient_float_error_handler)
    app.add_exception_handler(VendorError, vendor_error_handler)
    app.add_exception_handler(SLAViolationError, sla_violation_error_handler)
    app.add_exception_handler(PaymentProcessingError, payment_processing_error_handler)
    app.add_exception_handler(CommissionCalculationError, commission_calculation_error_handler)
    app.add_exception_handler(DuplicateWebhookError, duplicate_webhook_error_handler)
    
    # Register base exception handler (catch-all for VendlyException)
    app.add_exception_handler(VendlyException, vendly_exception_handler)
    
    # Register FastAPI validation error handler
    app.add_exception_handler(RequestValidationError, validation_error_handler)
    
    # Register SQLAlchemy integrity error handler
    app.add_exception_handler(IntegrityError, integrity_error_handler)
    
    # Register generic exception handler (catch-all)
    app.add_exception_handler(Exception, generic_exception_handler)
    
    logger.info("Exception handlers registered successfully")
