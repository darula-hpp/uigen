"""
Transaction service for atomic transaction processing.

This service orchestrates all float-affecting operations with proper database
locking to prevent race conditions. It handles deposits, vending transactions,
and cashouts while maintaining float balance integrity.

Requirements: 3.3, 3.4, 3.7, 5.1, 5.2, 5.3, 5.4, 5.7, 5.8, 6.1, 6.2, 6.4, 6.5,
             19.1, 19.2, 19.3, 19.4
"""
import asyncio
from decimal import Decimal
from typing import Dict, Any, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import OperationalError, IntegrityError

from app.models import Merchant, Product, Transaction
from app.repositories.transaction import TransactionRepository
from app.repositories.merchant_repository import MerchantRepository
from app.repositories.vendor import ProductRepository
from app.exceptions import (
    InsufficientFloatError,
    VendorError,
    VendlyException
)
from app.schemas import NormalizedResponse, VendingResult, TransactionResponse
from app.strategies.vendor_strategy import VendorStrategy


class TransactionService:
    """
    Service for atomic transaction processing with float management.
    
    This service ensures all float-affecting operations are processed atomically
    with proper database locking (SELECT FOR UPDATE) to prevent race conditions.
    It implements retry logic with exponential backoff for transaction conflicts.
    
    Attributes:
        session: The async database session
        transaction_repo: Repository for transaction operations
        merchant_repo: Repository for merchant operations
        product_repo: Repository for product operations
    """
    
    # Retry configuration
    MAX_RETRIES = 3
    INITIAL_BACKOFF_MS = 100
    BACKOFF_MULTIPLIER = 2
    
    def __init__(
        self,
        session: AsyncSession,
        vendor_strategies: Optional[Dict[int, VendorStrategy]] = None
    ):
        """
        Initialize the transaction service.
        
        Args:
            session: The async database session
            vendor_strategies: Optional dict mapping vendor_id to VendorStrategy instances
        """
        self.session = session
        self.transaction_repo = TransactionRepository(session)
        self.merchant_repo = MerchantRepository(session)
        self.product_repo = ProductRepository(session)
        self.vendor_strategies = vendor_strategies or {}
    
    async def _get_merchant_with_lock(self, merchant_id: int) -> Merchant:
        """
        Retrieve merchant with SELECT FOR UPDATE lock.
        
        This ensures exclusive access to the merchant record during the transaction,
        preventing concurrent modifications to the float balance.
        
        Args:
            merchant_id: The merchant ID
        
        Returns:
            The locked merchant instance
        
        Raises:
            VendlyException: If merchant not found
        """
        result = await self.session.execute(
            select(Merchant)
            .where(Merchant.id == merchant_id)
            .with_for_update()
        )
        merchant = result.scalar_one_or_none()
        
        if merchant is None:
            raise VendlyException(
                message=f"Merchant {merchant_id} not found",
                error_code="MERCHANT_NOT_FOUND"
            )
        
        return merchant
    
    async def _calculate_current_float(self, merchant_id: int) -> Decimal:
        """
        Calculate current float balance from transaction history.
        
        Args:
            merchant_id: The merchant ID
        
        Returns:
            Current float balance
        """
        return await self.transaction_repo.calculate_current_float_balance(merchant_id)
    
    async def validate_sufficient_float(
        self,
        merchant_id: int,
        required_amount: Decimal
    ) -> bool:
        """
        Validate that merchant has sufficient float for a transaction.
        
        This validation must be performed within the same database transaction
        as the float deduction to ensure consistency.
        
        Args:
            merchant_id: The merchant ID
            required_amount: The amount required for the transaction
        
        Returns:
            True if sufficient float is available
        
        Raises:
            InsufficientFloatError: If float is insufficient
        
        Requirements: 5.1, 19.4
        """
        current_float = await self._calculate_current_float(merchant_id)
        
        if current_float < required_amount:
            raise InsufficientFloatError(
                message=f"Insufficient float balance for transaction",
                required_amount=float(required_amount),
                available_float=float(current_float)
            )
        
        return True
    
    async def _execute_with_retry(self, operation, *args, **kwargs):
        """
        Execute a database operation with exponential backoff retry logic.
        
        Retries on OperationalError (deadlock, serialization failure) with
        exponential backoff. Other exceptions are raised immediately.
        
        Args:
            operation: The async operation to execute
            *args: Positional arguments for the operation
            **kwargs: Keyword arguments for the operation
        
        Returns:
            The result of the operation
        
        Raises:
            The last exception if all retries are exhausted
        
        Requirements: 19.3
        """
        last_exception = None
        backoff_ms = self.INITIAL_BACKOFF_MS
        
        for attempt in range(self.MAX_RETRIES):
            try:
                result = await operation(*args, **kwargs)
                return result
            except OperationalError as e:
                last_exception = e
                if attempt < self.MAX_RETRIES - 1:
                    # Exponential backoff
                    await asyncio.sleep(backoff_ms / 1000.0)
                    backoff_ms *= self.BACKOFF_MULTIPLIER
                    # Rollback the failed transaction
                    await self.session.rollback()
                else:
                    # Last attempt failed, raise the exception
                    raise
            except Exception:
                # Non-retryable exception, raise immediately
                raise
        
        # Should not reach here, but raise last exception if we do
        if last_exception:
            raise last_exception
    
    async def process_deposit(
        self,
        merchant_id: int,
        amount: Decimal,
        payment_provider: str,
        payment_reference: str
    ) -> Transaction:
        """
        Process a deposit transaction.
        
        Deposits increase the merchant float balance. This method is typically
        called after payment confirmation from the payment provider webhook.
        
        Args:
            merchant_id: The merchant ID
            amount: The deposit amount (must be positive)
            payment_provider: The payment provider name (e.g., "stripe")
            payment_reference: The payment reference from the provider
        
        Returns:
            The created transaction record
        
        Raises:
            VendlyException: If merchant not found or validation fails
        
        Requirements: 3.3, 3.4, 3.7
        """
        async def _process():
            # Lock merchant record
            merchant = await self._get_merchant_with_lock(merchant_id)
            
            # Calculate current float
            float_before = await self._calculate_current_float(merchant_id)
            float_after = float_before + amount
            
            # Create transaction record
            transaction = await self.transaction_repo.create_transaction(
                merchant_id=merchant_id,
                transaction_type="deposit",
                amount=amount,
                float_before=float_before,
                float_after=float_after,
                status="completed",
                payment_provider=payment_provider,
                payment_reference=payment_reference
            )
            
            # Commit the transaction
            await self.session.commit()
            await self.session.refresh(transaction)
            
            return transaction
        
        return await self._execute_with_retry(_process)
    
    async def process_vending(
        self,
        merchant_id: int,
        product_id: int,
        amount: Decimal,
        customer_identifier: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> VendingResult:
        """
        Process a vending transaction with vendor integration.
        
        This method:
        1. Validates sufficient float within a locked transaction
        2. Deducts the amount from merchant float
        3. Calls the vendor strategy to process the transaction
        4. Records the transaction with vendor response
        
        Args:
            merchant_id: The merchant ID
            product_id: The product ID
            amount: The transaction amount (must be positive)
            customer_identifier: The customer identifier for the vendor
            metadata: Optional additional metadata
        
        Returns:
            VendingResult containing the transaction and normalized vendor response
        
        Raises:
            InsufficientFloatError: If merchant has insufficient float
            VendorError: If vendor transaction fails
            VendlyException: If merchant or product not found
        
        Requirements: 5.1, 5.2, 5.3, 5.4, 5.7, 5.8
        """
        async def _process():
            try:
                # Lock merchant record
                merchant = await self._get_merchant_with_lock(merchant_id)
                
                # Get product and vendor information
                product = await self.product_repo.get_by_id(product_id)
                if product is None:
                    raise VendlyException(
                        message=f"Product {product_id} not found",
                        error_code="PRODUCT_NOT_FOUND"
                    )
                
                if not product.active:
                    raise VendlyException(
                        message=f"Product {product_id} is not active",
                        error_code="PRODUCT_INACTIVE"
                    )
                
                # Calculate current float and validate sufficiency
                float_before = await self._calculate_current_float(merchant_id)
                await self.validate_sufficient_float(merchant_id, amount)
                
                # Calculate float after deduction
                float_after = float_before - amount
                
                # Get vendor strategy
                vendor_strategy = self.vendor_strategies.get(product.vendor_id)
                if vendor_strategy is None:
                    raise VendorError(
                        message=f"No vendor strategy configured for vendor {product.vendor_id}",
                        vendor_name=str(product.vendor_id)
                    )
                
                # Process transaction with vendor
                try:
                    vendor_response = await vendor_strategy.process_transaction(
                        product_code=product.product_code,
                        amount=amount,
                        customer_identifier=customer_identifier,
                        metadata=metadata or {}
                    )
                    
                    # Normalize vendor response
                    normalized_response = vendor_strategy.normalize_response(
                        vendor_response.raw_data
                    )
                    
                    # Determine transaction status based on vendor response
                    if vendor_response.success:
                        status = "completed"
                    else:
                        status = "failed"
                        # For failed vendor transactions, don't deduct float
                        float_after = float_before
                    
                    # Create transaction record
                    transaction = await self.transaction_repo.create_transaction(
                        merchant_id=merchant_id,
                        product_id=product_id,
                        transaction_type="vending",
                        amount=amount,
                        float_before=float_before,
                        float_after=float_after,
                        status=status,
                        vendor_token=vendor_response.vendor_token,
                        metadata=metadata
                    )
                    
                    # Commit the transaction
                    await self.session.commit()
                    await self.session.refresh(transaction)
                    
                    # Convert to response schemas
                    transaction_response = TransactionResponse(
                        id=transaction.id,
                        merchant_id=transaction.merchant_id,
                        product_id=transaction.product_id,
                        transaction_type=transaction.transaction_type,
                        amount=transaction.amount,
                        float_before=transaction.float_before,
                        float_after=transaction.float_after,
                        status=transaction.status,
                        payment_provider=transaction.payment_provider,
                        payment_reference=transaction.payment_reference,
                        vendor_token=transaction.vendor_token,
                        metadata=transaction.metadata_,
                        created_at=transaction.created_at
                    )
                    
                    return VendingResult(
                        transaction=transaction_response,
                        vendor_response=normalized_response
                    )
                    
                except Exception as e:
                    # Vendor error - rollback and raise
                    await self.session.rollback()
                    if isinstance(e, VendorError):
                        raise
                    raise VendorError(
                        message=f"Vendor transaction failed: {str(e)}",
                        vendor_name=str(product.vendor_id)
                    )
            except (InsufficientFloatError, VendlyException, VendorError):
                # Rollback on business logic errors
                await self.session.rollback()
                raise
        
        return await self._execute_with_retry(_process)
    
    async def process_cashout(
        self,
        merchant_id: int,
        amount: Decimal
    ) -> Transaction:
        """
        Process a cashout transaction.
        
        Cashouts increase the merchant float balance in exchange for providing
        cash to customers. This is the inverse of a vending transaction.
        
        Args:
            merchant_id: The merchant ID
            amount: The cashout amount (must be positive)
        
        Returns:
            The created transaction record
        
        Raises:
            VendlyException: If merchant not found or validation fails
        
        Requirements: 6.1, 6.2, 6.4, 6.5
        """
        async def _process():
            # Lock merchant record
            merchant = await self._get_merchant_with_lock(merchant_id)
            
            # Calculate current float
            float_before = await self._calculate_current_float(merchant_id)
            float_after = float_before + amount
            
            # Create transaction record
            transaction = await self.transaction_repo.create_transaction(
                merchant_id=merchant_id,
                transaction_type="cashout",
                amount=amount,
                float_before=float_before,
                float_after=float_after,
                status="completed"
            )
            
            # Commit the transaction
            await self.session.commit()
            await self.session.refresh(transaction)
            
            return transaction
        
        return await self._execute_with_retry(_process)
    
    async def get_transaction_by_id(
        self,
        transaction_id: int
    ) -> Optional[Transaction]:
        """
        Retrieve a transaction by its ID.
        
        Args:
            transaction_id: The transaction ID
        
        Returns:
            The transaction if found, None otherwise
        """
        return await self.transaction_repo.get_transaction_by_id(transaction_id)
    
    async def get_merchant_transactions(
        self,
        merchant_id: int,
        limit: Optional[int] = None,
        offset: Optional[int] = None
    ) -> list[Transaction]:
        """
        Retrieve transactions for a merchant.
        
        Args:
            merchant_id: The merchant ID
            limit: Maximum number of transactions to return
            offset: Number of transactions to skip
        
        Returns:
            List of transactions
        """
        return await self.transaction_repo.get_transactions_by_merchant(
            merchant_id=merchant_id,
            limit=limit,
            offset=offset
        )
