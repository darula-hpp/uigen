"""
Pydantic schemas for request/response validation.
"""
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, EmailStr, ConfigDict, field_validator


# Request Schemas

class MerchantRegistrationRequest(BaseModel):
    """Request schema for merchant registration."""
    name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    phone: str = Field(..., min_length=1, max_length=50)
    business_name: str = Field(..., min_length=1, max_length=255)
    password: str = Field(..., min_length=8)
    
    @field_validator('name', 'phone', 'business_name')
    @classmethod
    def validate_not_empty(cls, v: str) -> str:
        """Validate that string fields are not empty or whitespace only."""
        if not v or not v.strip():
            raise ValueError('Field cannot be empty or whitespace only')
        return v.strip()
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        """Validate password strength."""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v


class MerchantLoginRequest(BaseModel):
    """Request schema for merchant login."""
    email: EmailStr
    password: str


class DepositRequest(BaseModel):
    """Request schema for initiating a deposit."""
    amount: Decimal = Field(..., gt=0, decimal_places=2)
    payment_provider: str = Field(default="stripe")
    
    @field_validator('amount')
    @classmethod
    def validate_amount(cls, v: Decimal) -> Decimal:
        """Validate that amount is positive and has at most 2 decimal places."""
        if v <= 0:
            raise ValueError('Amount must be positive')
        # Check decimal places
        if v.as_tuple().exponent < -2:
            raise ValueError('Amount must have at most 2 decimal places')
        return v


class VendingTransactionRequest(BaseModel):
    """Request schema for vending transaction."""
    product_id: int = Field(..., gt=0)
    amount: Decimal = Field(..., gt=0, decimal_places=2)
    customer_identifier: str = Field(..., min_length=1)
    metadata: Optional[Dict[str, Any]] = None
    
    @field_validator('amount')
    @classmethod
    def validate_amount(cls, v: Decimal) -> Decimal:
        """Validate that amount is positive and has at most 2 decimal places."""
        if v <= 0:
            raise ValueError('Amount must be positive')
        # Check decimal places
        if v.as_tuple().exponent < -2:
            raise ValueError('Amount must have at most 2 decimal places')
        return v
    
    @field_validator('customer_identifier')
    @classmethod
    def validate_customer_identifier(cls, v: str) -> str:
        """Validate that customer identifier is not empty or whitespace only."""
        if not v or not v.strip():
            raise ValueError('Customer identifier cannot be empty or whitespace only')
        return v.strip()


class CashoutTransactionRequest(BaseModel):
    """Request schema for cashout transaction."""
    amount: Decimal = Field(..., gt=0, decimal_places=2)
    
    @field_validator('amount')
    @classmethod
    def validate_amount(cls, v: Decimal) -> Decimal:
        """Validate that amount is positive and has at most 2 decimal places."""
        if v <= 0:
            raise ValueError('Amount must be positive')
        # Check decimal places
        if v.as_tuple().exponent < -2:
            raise ValueError('Amount must have at most 2 decimal places')
        return v


class TransactionFilters(BaseModel):
    """Filters for transaction history queries."""
    transaction_type: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    
    @field_validator('transaction_type')
    @classmethod
    def validate_transaction_type(cls, v: Optional[str]) -> Optional[str]:
        """Validate transaction type is one of the allowed values."""
        if v is not None:
            allowed_types = ['deposit', 'vending', 'cashout', 'commission_payout']
            if v not in allowed_types:
                raise ValueError(f'Transaction type must be one of: {", ".join(allowed_types)}')
        return v
    
    @field_validator('status')
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        """Validate status is one of the allowed values."""
        if v is not None:
            allowed_statuses = ['pending', 'completed', 'failed']
            if v not in allowed_statuses:
                raise ValueError(f'Status must be one of: {", ".join(allowed_statuses)}')
        return v
    
    @field_validator('end_date')
    @classmethod
    def validate_date_range(cls, v: Optional[datetime], info) -> Optional[datetime]:
        """Validate that end_date is after start_date if both are provided."""
        if v is not None and info.data.get('start_date') is not None:
            if v < info.data['start_date']:
                raise ValueError('end_date must be after start_date')
        return v


class PaginationParams(BaseModel):
    """Pagination parameters."""
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


# Response Schemas

class MerchantResponse(BaseModel):
    """Response schema for merchant data."""
    id: int
    name: str
    email: str
    phone: str
    business_name: str
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    """Response schema for authentication token."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class FloatBalanceResponse(BaseModel):
    """Response schema for float balance."""
    merchant_id: int
    balance: Decimal
    last_updated: datetime


class TransactionResponse(BaseModel):
    """Response schema for transaction data."""
    id: int
    merchant_id: int
    product_id: Optional[int]
    transaction_type: str
    amount: Decimal
    float_before: Decimal
    float_after: Decimal
    status: str
    payment_provider: Optional[str]
    payment_reference: Optional[str]
    vendor_token: Optional[str]
    metadata: Optional[Dict[str, Any]]
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class NormalizedResponse(BaseModel):
    """Normalized vendor response format."""
    status: str  # "success", "failure", "pending"
    transaction_id: Optional[str] = None
    vendor_token: Optional[str] = None
    message: str
    metadata: Optional[Dict[str, Any]] = None
    
    @field_validator('status')
    @classmethod
    def validate_status(cls, v: str) -> str:
        """Validate status is one of the allowed values."""
        allowed_statuses = ['success', 'failure', 'pending']
        if v not in allowed_statuses:
            raise ValueError(f'Status must be one of: {", ".join(allowed_statuses)}')
        return v


class VendingResult(BaseModel):
    """Result of a vending transaction."""
    transaction: TransactionResponse
    vendor_response: NormalizedResponse


class PaymentIntentResponse(BaseModel):
    """Response schema for payment intent creation."""
    client_secret: str
    amount: Decimal
    currency: str = "usd"


class ProductResponse(BaseModel):
    """Response schema for product data."""
    id: int
    vendor_id: int
    name: str
    product_code: str
    active: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class CommissionRecordResponse(BaseModel):
    """Response schema for commission record."""
    id: int
    transaction_id: int
    merchant_id: int
    product_id: int
    amount: Decimal
    calculation_method: str
    calculation_details: Optional[Dict[str, Any]]
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class DailyCommissionResponse(BaseModel):
    """Response schema for daily commission aggregate."""
    id: int
    merchant_id: int
    date: datetime
    total_commission: Decimal
    transaction_count: int
    paid: bool
    
    model_config = ConfigDict(from_attributes=True)


class CommissionResponse(BaseModel):
    """Generic response schema for commission data."""
    amount: Decimal
    calculation_method: str
    period: Optional[str] = None  # e.g., "2024-01", "2024-01-15"
    details: Optional[Dict[str, Any]] = None


class ErrorResponse(BaseModel):
    """Standard error response format."""
    error: str
    error_code: str
    status_code: int
    timestamp: datetime
    details: Optional[Dict[str, Any]] = None
