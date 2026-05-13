"""
Vendor repository for vendor and product data access.

This module provides repository implementations for Vendor and Product entities,
including commission rule management and SLA violation logging.
"""
from typing import Optional, List
from datetime import datetime, date
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Vendor, Product, CommissionRule, SLAViolation
from app.repositories.base import BaseRepository


class VendorRepository(BaseRepository[Vendor]):
    """
    Repository for Vendor entity operations.
    
    Provides methods for vendor CRUD operations and SLA violation logging.
    """
    
    def __init__(self, session: AsyncSession):
        """
        Initialize the vendor repository.
        
        Args:
            session: The async database session
        """
        super().__init__(Vendor, session)
    
    async def get_by_name(self, name: str) -> Optional[Vendor]:
        """
        Retrieve a vendor by name.
        
        Args:
            name: The vendor name
        
        Returns:
            The vendor instance if found, None otherwise
        
        Example:
            vendor = await repo.get_by_name("ExampleVendor")
        """
        result = await self.session.execute(
            select(Vendor).where(Vendor.name == name)
        )
        return result.scalar_one_or_none()
    
    async def get_active_vendors(
        self,
        limit: Optional[int] = None,
        offset: Optional[int] = None
    ) -> List[Vendor]:
        """
        Retrieve all active vendors.
        
        Args:
            limit: Maximum number of records to return
            offset: Number of records to skip
        
        Returns:
            List of active vendor instances
        
        Example:
            vendors = await repo.get_active_vendors(limit=10)
        """
        query = select(Vendor).where(Vendor.active == True)
        
        if offset is not None:
            query = query.offset(offset)
        if limit is not None:
            query = query.limit(limit)
        
        result = await self.session.execute(query)
        return list(result.scalars().all())
    
    async def log_sla_violation(
        self,
        vendor_id: int,
        product_id: int,
        response_time_ms: int,
        sla_threshold_ms: int
    ) -> SLAViolation:
        """
        Log an SLA violation for a vendor.
        
        Args:
            vendor_id: The vendor ID
            product_id: The product ID
            response_time_ms: The actual response time in milliseconds
            sla_threshold_ms: The SLA threshold in milliseconds
        
        Returns:
            The created SLA violation record
        
        Example:
            violation = await repo.log_sla_violation(
                vendor_id=1,
                product_id=2,
                response_time_ms=5000,
                sla_threshold_ms=3000
            )
        """
        violation = SLAViolation(
            vendor_id=vendor_id,
            product_id=product_id,
            response_time_ms=response_time_ms,
            sla_threshold_ms=sla_threshold_ms
        )
        self.session.add(violation)
        await self.session.flush()
        await self.session.refresh(violation)
        return violation
    
    async def get_sla_violations(
        self,
        vendor_id: Optional[int] = None,
        product_id: Optional[int] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None
    ) -> List[SLAViolation]:
        """
        Retrieve SLA violations with optional filters.
        
        Args:
            vendor_id: Optional vendor ID filter
            product_id: Optional product ID filter
            start_date: Optional start date filter
            end_date: Optional end date filter
            limit: Maximum number of records to return
            offset: Number of records to skip
        
        Returns:
            List of SLA violation records
        
        Example:
            violations = await repo.get_sla_violations(
                vendor_id=1,
                start_date=datetime(2024, 1, 1),
                limit=10
            )
        """
        query = select(SLAViolation)
        
        # Apply filters
        conditions = []
        if vendor_id is not None:
            conditions.append(SLAViolation.vendor_id == vendor_id)
        if product_id is not None:
            conditions.append(SLAViolation.product_id == product_id)
        if start_date is not None:
            conditions.append(SLAViolation.created_at >= start_date)
        if end_date is not None:
            conditions.append(SLAViolation.created_at <= end_date)
        
        if conditions:
            query = query.where(and_(*conditions))
        
        # Apply pagination
        if offset is not None:
            query = query.offset(offset)
        if limit is not None:
            query = query.limit(limit)
        
        # Order by created_at descending
        query = query.order_by(SLAViolation.created_at.desc())
        
        result = await self.session.execute(query)
        return list(result.scalars().all())
    
    async def get_sla_compliance_stats(
        self,
        vendor_id: int,
        start_date: datetime,
        end_date: datetime
    ) -> dict:
        """
        Calculate SLA compliance statistics for a vendor.
        
        Args:
            vendor_id: The vendor ID
            start_date: Start date for the period
            end_date: End date for the period
        
        Returns:
            Dictionary with compliance statistics:
            - total_transactions: Total number of transactions
            - violations: Number of SLA violations
            - compliance_percentage: Percentage of transactions meeting SLA
        
        Example:
            stats = await repo.get_sla_compliance_stats(
                vendor_id=1,
                start_date=datetime(2024, 1, 1),
                end_date=datetime(2024, 1, 31)
            )
        """
        # Count violations in the period
        violations_query = select(func.count(SLAViolation.id)).where(
            and_(
                SLAViolation.vendor_id == vendor_id,
                SLAViolation.created_at >= start_date,
                SLAViolation.created_at <= end_date
            )
        )
        violations_result = await self.session.execute(violations_query)
        violations_count = violations_result.scalar() or 0
        
        # For now, we'll need to count total transactions from the Transaction table
        # This will be implemented when TransactionRepository is available
        # For now, return the violation count
        return {
            "vendor_id": vendor_id,
            "start_date": start_date,
            "end_date": end_date,
            "violations": violations_count
        }


class ProductRepository(BaseRepository[Product]):
    """
    Repository for Product entity operations.
    
    Provides methods for product CRUD operations and commission rule management.
    """
    
    def __init__(self, session: AsyncSession):
        """
        Initialize the product repository.
        
        Args:
            session: The async database session
        """
        super().__init__(Product, session)
    
    async def get_by_product_code(self, product_code: str) -> Optional[Product]:
        """
        Retrieve a product by its unique product code.
        
        Args:
            product_code: The product code
        
        Returns:
            The product instance if found, None otherwise
        
        Example:
            product = await repo.get_by_product_code("AIRTIME_MTN")
        """
        result = await self.session.execute(
            select(Product).where(Product.product_code == product_code)
        )
        return result.scalar_one_or_none()
    
    async def get_by_vendor(
        self,
        vendor_id: int,
        active_only: bool = True,
        limit: Optional[int] = None,
        offset: Optional[int] = None
    ) -> List[Product]:
        """
        Retrieve products for a specific vendor.
        
        Args:
            vendor_id: The vendor ID
            active_only: If True, return only active products
            limit: Maximum number of records to return
            offset: Number of records to skip
        
        Returns:
            List of product instances
        
        Example:
            products = await repo.get_by_vendor(vendor_id=1, active_only=True)
        """
        query = select(Product).where(Product.vendor_id == vendor_id)
        
        if active_only:
            query = query.where(Product.active == True)
        
        if offset is not None:
            query = query.offset(offset)
        if limit is not None:
            query = query.limit(limit)
        
        result = await self.session.execute(query)
        return list(result.scalars().all())
    
    async def get_active_products(
        self,
        limit: Optional[int] = None,
        offset: Optional[int] = None
    ) -> List[Product]:
        """
        Retrieve all active products.
        
        Args:
            limit: Maximum number of records to return
            offset: Number of records to skip
        
        Returns:
            List of active product instances
        
        Example:
            products = await repo.get_active_products(limit=10)
        """
        query = select(Product).where(Product.active == True)
        
        if offset is not None:
            query = query.offset(offset)
        if limit is not None:
            query = query.limit(limit)
        
        result = await self.session.execute(query)
        return list(result.scalars().all())
    
    async def check_product_name_exists(
        self,
        vendor_id: int,
        name: str,
        exclude_product_id: Optional[int] = None
    ) -> bool:
        """
        Check if a product name already exists for a vendor.
        
        Args:
            vendor_id: The vendor ID
            name: The product name to check
            exclude_product_id: Optional product ID to exclude from check (for updates)
        
        Returns:
            True if the product name exists, False otherwise
        
        Example:
            exists = await repo.check_product_name_exists(
                vendor_id=1,
                name="Airtime"
            )
        """
        query = select(Product.id).where(
            and_(
                Product.vendor_id == vendor_id,
                Product.name == name
            )
        )
        
        if exclude_product_id is not None:
            query = query.where(Product.id != exclude_product_id)
        
        result = await self.session.execute(query)
        return result.scalar_one_or_none() is not None
    
    async def create_with_commission_rule(
        self,
        vendor_id: int,
        name: str,
        product_code: str,
        calculation_method: str,
        percentage_rate: Optional[float] = None,
        fixed_amount: Optional[float] = None,
        tiered_config: Optional[dict] = None,
        active: bool = True
    ) -> Product:
        """
        Create a product with its commission rule in a single operation.
        
        Args:
            vendor_id: The vendor ID
            name: The product name
            product_code: The unique product code
            calculation_method: Commission calculation method ('percentage', 'fixed', 'tiered')
            percentage_rate: Percentage rate for percentage method
            fixed_amount: Fixed amount for fixed method
            tiered_config: Tiered configuration for tiered method
            active: Whether the product is active
        
        Returns:
            The created product instance with commission rule
        
        Example:
            product = await repo.create_with_commission_rule(
                vendor_id=1,
                name="Airtime",
                product_code="AIRTIME_MTN",
                calculation_method="percentage",
                percentage_rate=5.0
            )
        """
        # Create product
        product = Product(
            vendor_id=vendor_id,
            name=name,
            product_code=product_code,
            active=active
        )
        self.session.add(product)
        await self.session.flush()
        await self.session.refresh(product)
        
        # Create commission rule
        commission_rule = CommissionRule(
            product_id=product.id,
            calculation_method=calculation_method,
            percentage_rate=percentage_rate,
            fixed_amount=fixed_amount,
            tiered_config=tiered_config
        )
        self.session.add(commission_rule)
        await self.session.flush()
        
        # Refresh to load the relationship
        await self.session.refresh(product)
        
        return product
    
    async def get_commission_rule(self, product_id: int) -> Optional[CommissionRule]:
        """
        Retrieve the commission rule for a product.
        
        Args:
            product_id: The product ID
        
        Returns:
            The commission rule if found, None otherwise
        
        Example:
            rule = await repo.get_commission_rule(product_id=1)
        """
        result = await self.session.execute(
            select(CommissionRule).where(CommissionRule.product_id == product_id)
        )
        return result.scalar_one_or_none()
    
    async def update_commission_rule(
        self,
        product_id: int,
        calculation_method: Optional[str] = None,
        percentage_rate: Optional[float] = None,
        fixed_amount: Optional[float] = None,
        tiered_config: Optional[dict] = None
    ) -> Optional[CommissionRule]:
        """
        Update the commission rule for a product.
        
        Args:
            product_id: The product ID
            calculation_method: Optional new calculation method
            percentage_rate: Optional new percentage rate
            fixed_amount: Optional new fixed amount
            tiered_config: Optional new tiered configuration
        
        Returns:
            The updated commission rule if found, None otherwise
        
        Example:
            rule = await repo.update_commission_rule(
                product_id=1,
                percentage_rate=7.5
            )
        """
        rule = await self.get_commission_rule(product_id)
        if rule is None:
            return None
        
        # Update fields if provided
        if calculation_method is not None:
            rule.calculation_method = calculation_method
        if percentage_rate is not None:
            rule.percentage_rate = percentage_rate
        if fixed_amount is not None:
            rule.fixed_amount = fixed_amount
        if tiered_config is not None:
            rule.tiered_config = tiered_config
        
        await self.session.flush()
        await self.session.refresh(rule)
        return rule
