"""
Transaction repository for data access operations.

This module provides specialized data access methods for Transaction entities,
including transaction history queries, filtering, pagination, and float balance calculations.
"""
from typing import Optional, List, Dict, Any
from decimal import Decimal
from datetime import datetime
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Transaction
from app.repositories.base import BaseRepository


class TransactionRepository(BaseRepository[Transaction]):
    """
    Repository for Transaction entity with specialized query methods.
    
    Provides methods for:
    - Creating transactions with float tracking
    - Querying transactions by merchant
    - Filtering transactions by type, date range, and status
    - Pagination support
    - Calculating current float balance from transaction history
    
    Attributes:
        model: The Transaction SQLAlchemy model
        session: The async database session
    """
    
    def __init__(self, session: AsyncSession):
        """
        Initialize the transaction repository.
        
        Args:
            session: The async database session
        """
        super().__init__(Transaction, session)
    
    async def create_transaction(
        self,
        merchant_id: int,
        transaction_type: str,
        amount: Decimal,
        float_before: Decimal,
        float_after: Decimal,
        status: str = "completed",
        product_id: Optional[int] = None,
        payment_provider: Optional[str] = None,
        payment_reference: Optional[str] = None,
        vendor_token: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Transaction:
        """
        Create a new transaction record.
        
        Args:
            merchant_id: The merchant ID
            transaction_type: Type of transaction (deposit, vending, cashout, commission_payout)
            amount: Transaction amount (must be positive)
            float_before: Merchant float balance before transaction
            float_after: Merchant float balance after transaction
            status: Transaction status (pending, completed, failed)
            product_id: Optional product ID for vending transactions
            payment_provider: Optional payment provider for deposits
            payment_reference: Optional payment reference for deposits
            vendor_token: Optional vendor token for vending transactions
            metadata: Optional additional metadata as JSON
        
        Returns:
            The created Transaction instance
        
        Raises:
            ValueError: If transaction_type, status, or amount are invalid
        
        Example:
            transaction = await repo.create_transaction(
                merchant_id=1,
                transaction_type="deposit",
                amount=Decimal("100.00"),
                float_before=Decimal("0.00"),
                float_after=Decimal("100.00"),
                payment_provider="stripe",
                payment_reference="pi_123456"
            )
        """
        # Validation is handled by database constraints, but we can add explicit checks
        valid_types = ["deposit", "vending", "cashout", "commission_payout"]
        if transaction_type not in valid_types:
            raise ValueError(f"Invalid transaction_type: {transaction_type}. Must be one of {valid_types}")
        
        valid_statuses = ["pending", "completed", "failed"]
        if status not in valid_statuses:
            raise ValueError(f"Invalid status: {status}. Must be one of {valid_statuses}")
        
        if amount <= 0:
            raise ValueError(f"Amount must be positive, got {amount}")
        
        return await self.create(
            merchant_id=merchant_id,
            product_id=product_id,
            transaction_type=transaction_type,
            amount=amount,
            float_before=float_before,
            float_after=float_after,
            status=status,
            payment_provider=payment_provider,
            payment_reference=payment_reference,
            vendor_token=vendor_token,
            metadata_=metadata
        )
    
    async def get_transaction_by_id(self, transaction_id: int) -> Optional[Transaction]:
        """
        Retrieve a transaction by its ID.
        
        Args:
            transaction_id: The transaction ID
        
        Returns:
            The Transaction instance if found, None otherwise
        
        Example:
            transaction = await repo.get_transaction_by_id(123)
        """
        return await self.get_by_id(transaction_id)
    
    async def get_transactions_by_merchant(
        self,
        merchant_id: int,
        limit: Optional[int] = None,
        offset: Optional[int] = None
    ) -> List[Transaction]:
        """
        Retrieve all transactions for a specific merchant.
        
        Transactions are returned in reverse chronological order (newest first).
        
        Args:
            merchant_id: The merchant ID
            limit: Maximum number of transactions to return
            offset: Number of transactions to skip
        
        Returns:
            List of Transaction instances
        
        Example:
            transactions = await repo.get_transactions_by_merchant(
                merchant_id=1,
                limit=10,
                offset=0
            )
        """
        query = select(Transaction).where(
            Transaction.merchant_id == merchant_id
        ).order_by(Transaction.created_at.desc())
        
        if offset is not None:
            query = query.offset(offset)
        if limit is not None:
            query = query.limit(limit)
        
        result = await self.session.execute(query)
        return list(result.scalars().all())
    
    async def get_transactions_by_filters(
        self,
        merchant_id: int,
        transaction_type: Optional[str] = None,
        status: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        product_id: Optional[int] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None
    ) -> List[Transaction]:
        """
        Retrieve transactions matching specified filters.
        
        Supports filtering by:
        - Transaction type (deposit, vending, cashout, commission_payout)
        - Status (pending, completed, failed)
        - Date range (start_date to end_date)
        - Product ID
        
        Transactions are returned in reverse chronological order (newest first).
        
        Args:
            merchant_id: The merchant ID (required)
            transaction_type: Optional transaction type filter
            status: Optional status filter
            start_date: Optional start date for date range filter
            end_date: Optional end date for date range filter
            product_id: Optional product ID filter
            limit: Maximum number of transactions to return
            offset: Number of transactions to skip
        
        Returns:
            List of Transaction instances matching the filters
        
        Example:
            transactions = await repo.get_transactions_by_filters(
                merchant_id=1,
                transaction_type="vending",
                status="completed",
                start_date=datetime(2024, 1, 1),
                end_date=datetime(2024, 1, 31),
                limit=20,
                offset=0
            )
        """
        # Build the base query
        query = select(Transaction).where(Transaction.merchant_id == merchant_id)
        
        # Apply filters
        if transaction_type is not None:
            query = query.where(Transaction.transaction_type == transaction_type)
        
        if status is not None:
            query = query.where(Transaction.status == status)
        
        if start_date is not None:
            query = query.where(Transaction.created_at >= start_date)
        
        if end_date is not None:
            query = query.where(Transaction.created_at <= end_date)
        
        if product_id is not None:
            query = query.where(Transaction.product_id == product_id)
        
        # Order by created_at descending (newest first)
        query = query.order_by(Transaction.created_at.desc())
        
        # Apply pagination
        if offset is not None:
            query = query.offset(offset)
        if limit is not None:
            query = query.limit(limit)
        
        result = await self.session.execute(query)
        return list(result.scalars().all())
    
    async def calculate_current_float_balance(self, merchant_id: int) -> Decimal:
        """
        Calculate the current float balance from transaction history.
        
        This method computes the float balance by summing the effects of all
        completed transactions:
        - Deposits: increase float (positive amount)
        - Vending: decrease float (negative amount)
        - Cashouts: increase float (positive amount)
        - Commission payouts: increase float (positive amount)
        
        The calculation uses the float_after value of the most recent transaction,
        or sums all transaction effects if no transactions exist.
        
        Args:
            merchant_id: The merchant ID
        
        Returns:
            The current float balance as a Decimal
        
        Example:
            balance = await repo.calculate_current_float_balance(merchant_id=1)
            # Returns Decimal("150.00")
        
        Note:
            This method only considers completed transactions. Pending or failed
            transactions do not affect the float balance.
        """
        # Get the most recent completed transaction
        query = select(Transaction).where(
            and_(
                Transaction.merchant_id == merchant_id,
                Transaction.status == "completed"
            )
        ).order_by(Transaction.created_at.desc()).limit(1)
        
        result = await self.session.execute(query)
        latest_transaction = result.scalar_one_or_none()
        
        # If there's a latest transaction, return its float_after value
        if latest_transaction:
            return latest_transaction.float_after
        
        # If no transactions exist, the balance is zero
        return Decimal("0.00")
    
    async def get_transaction_count_by_merchant(
        self,
        merchant_id: int,
        transaction_type: Optional[str] = None,
        status: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> int:
        """
        Count transactions for a merchant matching optional filters.
        
        Useful for pagination to determine total pages.
        
        Args:
            merchant_id: The merchant ID
            transaction_type: Optional transaction type filter
            status: Optional status filter
            start_date: Optional start date for date range filter
            end_date: Optional end date for date range filter
        
        Returns:
            The count of matching transactions
        
        Example:
            count = await repo.get_transaction_count_by_merchant(
                merchant_id=1,
                transaction_type="vending",
                status="completed"
            )
        """
        query = select(func.count(Transaction.id)).where(
            Transaction.merchant_id == merchant_id
        )
        
        # Apply filters
        if transaction_type is not None:
            query = query.where(Transaction.transaction_type == transaction_type)
        
        if status is not None:
            query = query.where(Transaction.status == status)
        
        if start_date is not None:
            query = query.where(Transaction.created_at >= start_date)
        
        if end_date is not None:
            query = query.where(Transaction.created_at <= end_date)
        
        result = await self.session.execute(query)
        return result.scalar_one()
    
    async def get_transaction_by_payment_reference(
        self,
        payment_reference: str
    ) -> Optional[Transaction]:
        """
        Retrieve a transaction by its payment reference.
        
        Useful for webhook processing to find the associated transaction.
        
        Args:
            payment_reference: The payment reference (e.g., Stripe payment intent ID)
        
        Returns:
            The Transaction instance if found, None otherwise
        
        Example:
            transaction = await repo.get_transaction_by_payment_reference("pi_123456")
        """
        query = select(Transaction).where(
            Transaction.payment_reference == payment_reference
        )
        
        result = await self.session.execute(query)
        return result.scalar_one_or_none()
