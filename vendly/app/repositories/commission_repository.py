"""
Commission repository for commission-related data access operations.

This module provides data access methods for commission records, daily aggregates,
payouts, and audit trail queries.
"""
from typing import List, Optional
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import (
    CommissionRecord,
    DailyCommissionAggregate,
    CommissionPayout,
    AuditRecord
)
from app.repositories.base import BaseRepository


class CommissionRepository:
    """
    Repository for commission-related data access operations.
    
    This repository provides methods for managing commission records, daily aggregates,
    monthly payouts, and audit trail queries. It supports the commission calculation
    and payout workflows defined in requirements 9.4, 10.3, 11.5, and 12.4.
    
    Attributes:
        session: The async database session
    """
    
    def __init__(self, session: AsyncSession):
        """
        Initialize the commission repository.
        
        Args:
            session: The async database session
        """
        self.session = session
        self.commission_record_repo = BaseRepository(CommissionRecord, session)
        self.daily_aggregate_repo = BaseRepository(DailyCommissionAggregate, session)
        self.payout_repo = BaseRepository(CommissionPayout, session)
        self.audit_record_repo = BaseRepository(AuditRecord, session)
    
    async def create_commission_record(
        self,
        transaction_id: int,
        merchant_id: int,
        product_id: int,
        amount: Decimal,
        calculation_method: str,
        calculation_details: Optional[dict] = None
    ) -> CommissionRecord:
        """
        Create a new commission record for a transaction.
        
        Args:
            transaction_id: The transaction ID this commission is for
            merchant_id: The merchant ID earning the commission
            product_id: The product ID the commission is based on
            amount: The commission amount
            calculation_method: The method used to calculate commission (percentage, fixed, tiered)
            calculation_details: Optional details about the calculation
        
        Returns:
            The created commission record
        
        Example:
            record = await repo.create_commission_record(
                transaction_id=123,
                merchant_id=1,
                product_id=5,
                amount=Decimal("5.00"),
                calculation_method="percentage",
                calculation_details={"rate": "5.0", "base_amount": "100.00"}
            )
        """
        return await self.commission_record_repo.create(
            transaction_id=transaction_id,
            merchant_id=merchant_id,
            product_id=product_id,
            amount=amount,
            calculation_method=calculation_method,
            calculation_details=calculation_details
        )
    
    async def get_commission_records(
        self,
        merchant_id: Optional[int] = None,
        product_id: Optional[int] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None
    ) -> List[CommissionRecord]:
        """
        Retrieve commission records with optional filters.
        
        Args:
            merchant_id: Optional merchant ID filter
            product_id: Optional product ID filter
            start_date: Optional start date filter (inclusive)
            end_date: Optional end date filter (inclusive)
            limit: Maximum number of records to return
            offset: Number of records to skip
        
        Returns:
            List of commission records matching the filters
        
        Example:
            records = await repo.get_commission_records(
                merchant_id=1,
                start_date=datetime(2024, 1, 1),
                end_date=datetime(2024, 1, 31),
                limit=100
            )
        """
        query = select(CommissionRecord)
        
        # Build filter conditions
        conditions = []
        if merchant_id is not None:
            conditions.append(CommissionRecord.merchant_id == merchant_id)
        if product_id is not None:
            conditions.append(CommissionRecord.product_id == product_id)
        if start_date is not None:
            conditions.append(CommissionRecord.created_at >= start_date)
        if end_date is not None:
            conditions.append(CommissionRecord.created_at <= end_date)
        
        if conditions:
            query = query.where(and_(*conditions))
        
        # Order by created_at descending (most recent first)
        query = query.order_by(CommissionRecord.created_at.desc())
        
        # Apply pagination
        if offset is not None:
            query = query.offset(offset)
        if limit is not None:
            query = query.limit(limit)
        
        result = await self.session.execute(query)
        return list(result.scalars().all())
    
    async def create_daily_aggregate(
        self,
        merchant_id: int,
        date: date,
        total_commission: Decimal,
        transaction_count: int
    ) -> DailyCommissionAggregate:
        """
        Create a new daily commission aggregate for a merchant.
        
        Args:
            merchant_id: The merchant ID
            date: The date for this aggregate
            total_commission: The total commission amount for the day
            transaction_count: The number of transactions for the day
        
        Returns:
            The created daily commission aggregate
        
        Example:
            aggregate = await repo.create_daily_aggregate(
                merchant_id=1,
                date=date(2024, 1, 15),
                total_commission=Decimal("50.00"),
                transaction_count=10
            )
        """
        return await self.daily_aggregate_repo.create(
            merchant_id=merchant_id,
            date=date,
            total_commission=total_commission,
            transaction_count=transaction_count,
            paid=False
        )
    
    async def get_daily_aggregate(
        self,
        merchant_id: int,
        date: date
    ) -> Optional[DailyCommissionAggregate]:
        """
        Get the daily commission aggregate for a specific merchant and date.
        
        Args:
            merchant_id: The merchant ID
            date: The date to query
        
        Returns:
            The daily commission aggregate if found, None otherwise
        
        Example:
            aggregate = await repo.get_daily_aggregate(
                merchant_id=1,
                date=date(2024, 1, 15)
            )
        """
        query = select(DailyCommissionAggregate).where(
            and_(
                DailyCommissionAggregate.merchant_id == merchant_id,
                func.date(DailyCommissionAggregate.date) == date
            )
        )
        
        result = await self.session.execute(query)
        return result.scalar_one_or_none()
    
    async def update_daily_aggregate(
        self,
        merchant_id: int,
        date: date,
        additional_commission: Decimal,
        additional_count: int = 1
    ) -> DailyCommissionAggregate:
        """
        Update an existing daily aggregate by adding commission and count.
        
        Args:
            merchant_id: The merchant ID
            date: The date to update
            additional_commission: The commission amount to add
            additional_count: The transaction count to add (default 1)
        
        Returns:
            The updated daily commission aggregate
        
        Example:
            aggregate = await repo.update_daily_aggregate(
                merchant_id=1,
                date=date(2024, 1, 15),
                additional_commission=Decimal("5.00")
            )
        """
        # Get existing aggregate
        aggregate = await self.get_daily_aggregate(merchant_id, date)
        
        if aggregate is None:
            # Create new aggregate if it doesn't exist
            return await self.create_daily_aggregate(
                merchant_id=merchant_id,
                date=date,
                total_commission=additional_commission,
                transaction_count=additional_count
            )
        
        # Update existing aggregate
        aggregate.total_commission += additional_commission
        aggregate.transaction_count += additional_count
        
        await self.session.flush()
        await self.session.refresh(aggregate)
        return aggregate
    
    async def get_daily_aggregates(
        self,
        merchant_id: Optional[int] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        paid: Optional[bool] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None
    ) -> List[DailyCommissionAggregate]:
        """
        Retrieve daily commission aggregates with optional filters.
        
        Args:
            merchant_id: Optional merchant ID filter
            start_date: Optional start date filter (inclusive)
            end_date: Optional end date filter (inclusive)
            paid: Optional filter for paid/unpaid aggregates
            limit: Maximum number of records to return
            offset: Number of records to skip
        
        Returns:
            List of daily commission aggregates matching the filters
        
        Example:
            aggregates = await repo.get_daily_aggregates(
                merchant_id=1,
                start_date=date(2024, 1, 1),
                end_date=date(2024, 1, 31),
                paid=False
            )
        """
        query = select(DailyCommissionAggregate)
        
        # Build filter conditions
        conditions = []
        if merchant_id is not None:
            conditions.append(DailyCommissionAggregate.merchant_id == merchant_id)
        if start_date is not None:
            conditions.append(func.date(DailyCommissionAggregate.date) >= start_date)
        if end_date is not None:
            conditions.append(func.date(DailyCommissionAggregate.date) <= end_date)
        if paid is not None:
            conditions.append(DailyCommissionAggregate.paid == paid)
        
        if conditions:
            query = query.where(and_(*conditions))
        
        # Order by date descending (most recent first)
        query = query.order_by(DailyCommissionAggregate.date.desc())
        
        # Apply pagination
        if offset is not None:
            query = query.offset(offset)
        if limit is not None:
            query = query.limit(limit)
        
        result = await self.session.execute(query)
        return list(result.scalars().all())
    
    async def mark_aggregates_as_paid(
        self,
        merchant_id: int,
        start_date: date,
        end_date: date
    ) -> int:
        """
        Mark daily aggregates as paid for a date range.
        
        Args:
            merchant_id: The merchant ID
            start_date: The start date (inclusive)
            end_date: The end date (inclusive)
        
        Returns:
            The number of aggregates marked as paid
        
        Example:
            count = await repo.mark_aggregates_as_paid(
                merchant_id=1,
                start_date=date(2024, 1, 1),
                end_date=date(2024, 1, 31)
            )
        """
        # Get all unpaid aggregates in the date range
        aggregates = await self.get_daily_aggregates(
            merchant_id=merchant_id,
            start_date=start_date,
            end_date=end_date,
            paid=False
        )
        
        # Mark each as paid
        for aggregate in aggregates:
            aggregate.paid = True
        
        await self.session.flush()
        return len(aggregates)
    
    async def create_payout(
        self,
        merchant_id: int,
        year: int,
        month: int,
        total_amount: Decimal,
        transaction_id: int
    ) -> CommissionPayout:
        """
        Create a new commission payout record.
        
        Args:
            merchant_id: The merchant ID receiving the payout
            year: The year of the payout period
            month: The month of the payout period
            total_amount: The total payout amount
            transaction_id: The transaction ID for the payout deposit
        
        Returns:
            The created commission payout
        
        Example:
            payout = await repo.create_payout(
                merchant_id=1,
                year=2024,
                month=1,
                total_amount=Decimal("500.00"),
                transaction_id=456
            )
        """
        return await self.payout_repo.create(
            merchant_id=merchant_id,
            year=year,
            month=month,
            total_amount=total_amount,
            transaction_id=transaction_id
        )
    
    async def get_payout(
        self,
        merchant_id: int,
        year: int,
        month: int
    ) -> Optional[CommissionPayout]:
        """
        Get a specific commission payout by merchant, year, and month.
        
        Args:
            merchant_id: The merchant ID
            year: The year of the payout period
            month: The month of the payout period
        
        Returns:
            The commission payout if found, None otherwise
        
        Example:
            payout = await repo.get_payout(
                merchant_id=1,
                year=2024,
                month=1
            )
        """
        query = select(CommissionPayout).where(
            and_(
                CommissionPayout.merchant_id == merchant_id,
                CommissionPayout.year == year,
                CommissionPayout.month == month
            )
        )
        
        result = await self.session.execute(query)
        return result.scalar_one_or_none()
    
    async def get_payouts(
        self,
        merchant_id: Optional[int] = None,
        year: Optional[int] = None,
        month: Optional[int] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None
    ) -> List[CommissionPayout]:
        """
        Retrieve commission payouts with optional filters.
        
        Args:
            merchant_id: Optional merchant ID filter
            year: Optional year filter
            month: Optional month filter
            limit: Maximum number of records to return
            offset: Number of records to skip
        
        Returns:
            List of commission payouts matching the filters
        
        Example:
            payouts = await repo.get_payouts(
                merchant_id=1,
                year=2024,
                limit=12
            )
        """
        query = select(CommissionPayout)
        
        # Build filter conditions
        conditions = []
        if merchant_id is not None:
            conditions.append(CommissionPayout.merchant_id == merchant_id)
        if year is not None:
            conditions.append(CommissionPayout.year == year)
        if month is not None:
            conditions.append(CommissionPayout.month == month)
        
        if conditions:
            query = query.where(and_(*conditions))
        
        # Order by year and month descending (most recent first)
        query = query.order_by(
            CommissionPayout.year.desc(),
            CommissionPayout.month.desc()
        )
        
        # Apply pagination
        if offset is not None:
            query = query.offset(offset)
        if limit is not None:
            query = query.limit(limit)
        
        result = await self.session.execute(query)
        return list(result.scalars().all())
    
    async def create_audit_record(
        self,
        transaction_id: int,
        record_type: str,
        data: dict
    ) -> AuditRecord:
        """
        Create an immutable audit trail record.
        
        Args:
            transaction_id: The transaction ID this audit record is for
            record_type: The type of audit record (e.g., 'commission_calculation', 'commission_payout')
            data: The audit data as a dictionary
        
        Returns:
            The created audit record
        
        Example:
            audit = await repo.create_audit_record(
                transaction_id=123,
                record_type="commission_calculation",
                data={
                    "commission_amount": "5.00",
                    "calculation_method": "percentage",
                    "rate": "5.0"
                }
            )
        """
        return await self.audit_record_repo.create(
            transaction_id=transaction_id,
            record_type=record_type,
            data=data
        )
    
    async def get_audit_records(
        self,
        transaction_id: Optional[int] = None,
        record_type: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None
    ) -> List[AuditRecord]:
        """
        Retrieve audit records with optional filters.
        
        This method supports querying the audit trail by transaction, record type,
        and date range as required by requirement 12.4.
        
        Args:
            transaction_id: Optional transaction ID filter
            record_type: Optional record type filter
            start_date: Optional start date filter (inclusive)
            end_date: Optional end date filter (inclusive)
            limit: Maximum number of records to return
            offset: Number of records to skip
        
        Returns:
            List of audit records matching the filters
        
        Example:
            audits = await repo.get_audit_records(
                record_type="commission_calculation",
                start_date=datetime(2024, 1, 1),
                end_date=datetime(2024, 1, 31),
                limit=100
            )
        """
        query = select(AuditRecord)
        
        # Build filter conditions
        conditions = []
        if transaction_id is not None:
            conditions.append(AuditRecord.transaction_id == transaction_id)
        if record_type is not None:
            conditions.append(AuditRecord.record_type == record_type)
        if start_date is not None:
            conditions.append(AuditRecord.created_at >= start_date)
        if end_date is not None:
            conditions.append(AuditRecord.created_at <= end_date)
        
        if conditions:
            query = query.where(and_(*conditions))
        
        # Order by created_at descending (most recent first)
        query = query.order_by(AuditRecord.created_at.desc())
        
        # Apply pagination
        if offset is not None:
            query = query.offset(offset)
        if limit is not None:
            query = query.limit(limit)
        
        result = await self.session.execute(query)
        return list(result.scalars().all())
    
    async def get_monthly_commission_total(
        self,
        merchant_id: int,
        year: int,
        month: int
    ) -> Decimal:
        """
        Calculate the total commission for a merchant for a specific month.
        
        Args:
            merchant_id: The merchant ID
            year: The year
            month: The month (1-12)
        
        Returns:
            The total commission amount for the month
        
        Example:
            total = await repo.get_monthly_commission_total(
                merchant_id=1,
                year=2024,
                month=1
            )
        """
        # Calculate start and end dates for the month
        start_date = date(year, month, 1)
        
        # Calculate last day of month
        if month == 12:
            end_date = date(year + 1, 1, 1)
        else:
            end_date = date(year, month + 1, 1)
        
        # Get all daily aggregates for the month
        aggregates = await self.get_daily_aggregates(
            merchant_id=merchant_id,
            start_date=start_date,
            end_date=end_date
        )
        
        # Sum the total commission
        total = sum(
            (agg.total_commission for agg in aggregates),
            Decimal("0.00")
        )
        
        return total
