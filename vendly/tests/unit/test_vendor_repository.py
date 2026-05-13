"""
Unit tests for VendorRepository and ProductRepository.

Tests cover:
- Vendor CRUD operations
- Product CRUD operations
- Commission rule management
- SLA violation logging
- Product name uniqueness per vendor
"""
import pytest
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from sqlalchemy.exc import IntegrityError

from app.repositories.vendor import VendorRepository, ProductRepository
from app.models import Vendor, Product, CommissionRule, SLAViolation


class TestVendorRepository:
    """Test suite for VendorRepository."""
    
    @pytest.mark.asyncio
    async def test_create_vendor(self, db_session):
        """Test creating a new vendor."""
        repo = VendorRepository(db_session)
        
        vendor = await repo.create(
            name="TestVendor",
            sla_timeout_ms=3000,
            active=True
        )
        
        assert vendor.id is not None
        assert vendor.name == "TestVendor"
        assert vendor.sla_timeout_ms == 3000
        assert vendor.active is True
        assert vendor.created_at is not None
    
    @pytest.mark.asyncio
    async def test_get_vendor_by_id(self, db_session):
        """Test retrieving a vendor by ID."""
        repo = VendorRepository(db_session)
        
        # Create vendor
        created_vendor = await repo.create(
            name="TestVendor",
            sla_timeout_ms=3000,
            active=True
        )
        
        # Retrieve vendor
        vendor = await repo.get_by_id(created_vendor.id)
        
        assert vendor is not None
        assert vendor.id == created_vendor.id
        assert vendor.name == "TestVendor"
    
    @pytest.mark.asyncio
    async def test_get_vendor_by_name(self, db_session):
        """Test retrieving a vendor by name."""
        repo = VendorRepository(db_session)
        
        # Create vendor
        await repo.create(
            name="UniqueVendor",
            sla_timeout_ms=3000,
            active=True
        )
        
        # Retrieve by name
        vendor = await repo.get_by_name("UniqueVendor")
        
        assert vendor is not None
        assert vendor.name == "UniqueVendor"
    
    @pytest.mark.asyncio
    async def test_get_vendor_by_name_not_found(self, db_session):
        """Test retrieving a non-existent vendor by name."""
        repo = VendorRepository(db_session)
        
        vendor = await repo.get_by_name("NonExistent")
        
        assert vendor is None
    
    @pytest.mark.asyncio
    async def test_get_active_vendors(self, db_session):
        """Test retrieving only active vendors."""
        repo = VendorRepository(db_session)
        
        # Create active and inactive vendors
        await repo.create(name="ActiveVendor1", sla_timeout_ms=3000, active=True)
        await repo.create(name="ActiveVendor2", sla_timeout_ms=3000, active=True)
        await repo.create(name="InactiveVendor", sla_timeout_ms=3000, active=False)
        
        # Retrieve active vendors
        active_vendors = await repo.get_active_vendors()
        
        assert len(active_vendors) == 2
        assert all(v.active for v in active_vendors)
    
    @pytest.mark.asyncio
    async def test_get_active_vendors_with_pagination(self, db_session):
        """Test retrieving active vendors with pagination."""
        repo = VendorRepository(db_session)
        
        # Create multiple active vendors
        for i in range(5):
            await repo.create(
                name=f"Vendor{i}",
                sla_timeout_ms=3000,
                active=True
            )
        
        # Retrieve with pagination
        vendors = await repo.get_active_vendors(limit=2, offset=1)
        
        assert len(vendors) == 2
    
    @pytest.mark.asyncio
    async def test_update_vendor(self, db_session):
        """Test updating a vendor."""
        repo = VendorRepository(db_session)
        
        # Create vendor
        vendor = await repo.create(
            name="TestVendor",
            sla_timeout_ms=3000,
            active=True
        )
        
        # Update vendor
        updated_vendor = await repo.update(
            vendor.id,
            sla_timeout_ms=5000,
            active=False
        )
        
        assert updated_vendor is not None
        assert updated_vendor.sla_timeout_ms == 5000
        assert updated_vendor.active is False
    
    @pytest.mark.asyncio
    async def test_delete_vendor(self, db_session):
        """Test deleting a vendor."""
        repo = VendorRepository(db_session)
        
        # Create vendor
        vendor = await repo.create(
            name="TestVendor",
            sla_timeout_ms=3000,
            active=True
        )
        
        # Delete vendor
        deleted = await repo.delete(vendor.id)
        
        assert deleted is True
        
        # Verify deletion
        retrieved = await repo.get_by_id(vendor.id)
        assert retrieved is None
    
    @pytest.mark.asyncio
    async def test_log_sla_violation(self, db_session):
        """Test logging an SLA violation."""
        repo = VendorRepository(db_session)
        product_repo = ProductRepository(db_session)
        
        # Create vendor and product
        vendor = await repo.create(
            name="TestVendor",
            sla_timeout_ms=3000,
            active=True
        )
        product = await product_repo.create(
            vendor_id=vendor.id,
            name="TestProduct",
            product_code="TEST_001",
            active=True
        )
        
        # Log SLA violation
        violation = await repo.log_sla_violation(
            vendor_id=vendor.id,
            product_id=product.id,
            response_time_ms=5000,
            sla_threshold_ms=3000
        )
        
        assert violation.id is not None
        assert violation.vendor_id == vendor.id
        assert violation.product_id == product.id
        assert violation.response_time_ms == 5000
        assert violation.sla_threshold_ms == 3000
        assert violation.created_at is not None
    
    @pytest.mark.asyncio
    async def test_get_sla_violations_by_vendor(self, db_session):
        """Test retrieving SLA violations filtered by vendor."""
        repo = VendorRepository(db_session)
        product_repo = ProductRepository(db_session)
        
        # Create vendors and products
        vendor1 = await repo.create(name="Vendor1", sla_timeout_ms=3000, active=True)
        vendor2 = await repo.create(name="Vendor2", sla_timeout_ms=3000, active=True)
        product1 = await product_repo.create(
            vendor_id=vendor1.id,
            name="Product1",
            product_code="PROD_001",
            active=True
        )
        product2 = await product_repo.create(
            vendor_id=vendor2.id,
            name="Product2",
            product_code="PROD_002",
            active=True
        )
        
        # Log violations for both vendors
        await repo.log_sla_violation(vendor1.id, product1.id, 5000, 3000)
        await repo.log_sla_violation(vendor1.id, product1.id, 4000, 3000)
        await repo.log_sla_violation(vendor2.id, product2.id, 6000, 3000)
        
        # Retrieve violations for vendor1
        violations = await repo.get_sla_violations(vendor_id=vendor1.id)
        
        assert len(violations) == 2
        assert all(v.vendor_id == vendor1.id for v in violations)
    
    @pytest.mark.asyncio
    async def test_get_sla_violations_by_product(self, db_session):
        """Test retrieving SLA violations filtered by product."""
        repo = VendorRepository(db_session)
        product_repo = ProductRepository(db_session)
        
        # Create vendor and products
        vendor = await repo.create(name="Vendor", sla_timeout_ms=3000, active=True)
        product1 = await product_repo.create(
            vendor_id=vendor.id,
            name="Product1",
            product_code="PROD_001",
            active=True
        )
        product2 = await product_repo.create(
            vendor_id=vendor.id,
            name="Product2",
            product_code="PROD_002",
            active=True
        )
        
        # Log violations for both products
        await repo.log_sla_violation(vendor.id, product1.id, 5000, 3000)
        await repo.log_sla_violation(vendor.id, product2.id, 4000, 3000)
        await repo.log_sla_violation(vendor.id, product2.id, 6000, 3000)
        
        # Retrieve violations for product2
        violations = await repo.get_sla_violations(product_id=product2.id)
        
        assert len(violations) == 2
        assert all(v.product_id == product2.id for v in violations)
    
    @pytest.mark.asyncio
    async def test_get_sla_violations_by_date_range(self, db_session):
        """Test retrieving SLA violations filtered by date range."""
        repo = VendorRepository(db_session)
        product_repo = ProductRepository(db_session)
        
        # Create vendor and product
        vendor = await repo.create(name="Vendor", sla_timeout_ms=3000, active=True)
        product = await product_repo.create(
            vendor_id=vendor.id,
            name="Product",
            product_code="PROD_001",
            active=True
        )
        
        # Log violations
        await repo.log_sla_violation(vendor.id, product.id, 5000, 3000)
        
        # Query with date range
        now = datetime.utcnow()
        start_date = now - timedelta(hours=1)
        end_date = now + timedelta(hours=1)
        
        violations = await repo.get_sla_violations(
            vendor_id=vendor.id,
            start_date=start_date,
            end_date=end_date
        )
        
        assert len(violations) >= 1
    
    @pytest.mark.asyncio
    async def test_get_sla_violations_with_pagination(self, db_session):
        """Test retrieving SLA violations with pagination."""
        repo = VendorRepository(db_session)
        product_repo = ProductRepository(db_session)
        
        # Create vendor and product
        vendor = await repo.create(name="Vendor", sla_timeout_ms=3000, active=True)
        product = await product_repo.create(
            vendor_id=vendor.id,
            name="Product",
            product_code="PROD_001",
            active=True
        )
        
        # Log multiple violations
        for _ in range(5):
            await repo.log_sla_violation(vendor.id, product.id, 5000, 3000)
        
        # Retrieve with pagination
        violations = await repo.get_sla_violations(
            vendor_id=vendor.id,
            limit=2,
            offset=1
        )
        
        assert len(violations) == 2
    
    @pytest.mark.asyncio
    async def test_get_sla_compliance_stats(self, db_session):
        """Test calculating SLA compliance statistics."""
        repo = VendorRepository(db_session)
        product_repo = ProductRepository(db_session)
        
        # Create vendor and product
        vendor = await repo.create(name="Vendor", sla_timeout_ms=3000, active=True)
        product = await product_repo.create(
            vendor_id=vendor.id,
            name="Product",
            product_code="PROD_001",
            active=True
        )
        
        # Log violations
        await repo.log_sla_violation(vendor.id, product.id, 5000, 3000)
        await repo.log_sla_violation(vendor.id, product.id, 4000, 3000)
        
        # Get compliance stats
        now = datetime.utcnow()
        start_date = now - timedelta(hours=1)
        end_date = now + timedelta(hours=1)
        
        stats = await repo.get_sla_compliance_stats(
            vendor_id=vendor.id,
            start_date=start_date,
            end_date=end_date
        )
        
        assert stats["vendor_id"] == vendor.id
        assert stats["violations"] == 2


class TestProductRepository:
    """Test suite for ProductRepository."""
    
    @pytest.mark.asyncio
    async def test_create_product(self, db_session):
        """Test creating a new product."""
        vendor_repo = VendorRepository(db_session)
        product_repo = ProductRepository(db_session)
        
        # Create vendor first
        vendor = await vendor_repo.create(
            name="TestVendor",
            sla_timeout_ms=3000,
            active=True
        )
        
        # Create product
        product = await product_repo.create(
            vendor_id=vendor.id,
            name="TestProduct",
            product_code="TEST_001",
            active=True
        )
        
        assert product.id is not None
        assert product.vendor_id == vendor.id
        assert product.name == "TestProduct"
        assert product.product_code == "TEST_001"
        assert product.active is True
    
    @pytest.mark.asyncio
    async def test_get_product_by_id(self, db_session):
        """Test retrieving a product by ID."""
        vendor_repo = VendorRepository(db_session)
        product_repo = ProductRepository(db_session)
        
        # Create vendor and product
        vendor = await vendor_repo.create(
            name="TestVendor",
            sla_timeout_ms=3000,
            active=True
        )
        created_product = await product_repo.create(
            vendor_id=vendor.id,
            name="TestProduct",
            product_code="TEST_001",
            active=True
        )
        
        # Retrieve product
        product = await product_repo.get_by_id(created_product.id)
        
        assert product is not None
        assert product.id == created_product.id
        assert product.name == "TestProduct"
    
    @pytest.mark.asyncio
    async def test_get_product_by_product_code(self, db_session):
        """Test retrieving a product by product code."""
        vendor_repo = VendorRepository(db_session)
        product_repo = ProductRepository(db_session)
        
        # Create vendor and product
        vendor = await vendor_repo.create(
            name="TestVendor",
            sla_timeout_ms=3000,
            active=True
        )
        await product_repo.create(
            vendor_id=vendor.id,
            name="TestProduct",
            product_code="UNIQUE_CODE",
            active=True
        )
        
        # Retrieve by product code
        product = await product_repo.get_by_product_code("UNIQUE_CODE")
        
        assert product is not None
        assert product.product_code == "UNIQUE_CODE"
    
    @pytest.mark.asyncio
    async def test_get_product_by_product_code_not_found(self, db_session):
        """Test retrieving a non-existent product by code."""
        product_repo = ProductRepository(db_session)
        
        product = await product_repo.get_by_product_code("NONEXISTENT")
        
        assert product is None
    
    @pytest.mark.asyncio
    async def test_get_products_by_vendor(self, db_session):
        """Test retrieving products for a specific vendor."""
        vendor_repo = VendorRepository(db_session)
        product_repo = ProductRepository(db_session)
        
        # Create vendors
        vendor1 = await vendor_repo.create(name="Vendor1", sla_timeout_ms=3000, active=True)
        vendor2 = await vendor_repo.create(name="Vendor2", sla_timeout_ms=3000, active=True)
        
        # Create products for vendor1
        await product_repo.create(
            vendor_id=vendor1.id,
            name="Product1",
            product_code="PROD_001",
            active=True
        )
        await product_repo.create(
            vendor_id=vendor1.id,
            name="Product2",
            product_code="PROD_002",
            active=True
        )
        
        # Create product for vendor2
        await product_repo.create(
            vendor_id=vendor2.id,
            name="Product3",
            product_code="PROD_003",
            active=True
        )
        
        # Retrieve products for vendor1
        products = await product_repo.get_by_vendor(vendor1.id)
        
        assert len(products) == 2
        assert all(p.vendor_id == vendor1.id for p in products)
    
    @pytest.mark.asyncio
    async def test_get_products_by_vendor_active_only(self, db_session):
        """Test retrieving only active products for a vendor."""
        vendor_repo = VendorRepository(db_session)
        product_repo = ProductRepository(db_session)
        
        # Create vendor
        vendor = await vendor_repo.create(name="Vendor", sla_timeout_ms=3000, active=True)
        
        # Create active and inactive products
        await product_repo.create(
            vendor_id=vendor.id,
            name="ActiveProduct",
            product_code="ACTIVE_001",
            active=True
        )
        await product_repo.create(
            vendor_id=vendor.id,
            name="InactiveProduct",
            product_code="INACTIVE_001",
            active=False
        )
        
        # Retrieve active products only
        products = await product_repo.get_by_vendor(vendor.id, active_only=True)
        
        assert len(products) == 1
        assert products[0].active is True
    
    @pytest.mark.asyncio
    async def test_get_active_products(self, db_session):
        """Test retrieving all active products."""
        vendor_repo = VendorRepository(db_session)
        product_repo = ProductRepository(db_session)
        
        # Create vendor
        vendor = await vendor_repo.create(name="Vendor", sla_timeout_ms=3000, active=True)
        
        # Create active and inactive products
        await product_repo.create(
            vendor_id=vendor.id,
            name="Active1",
            product_code="ACTIVE_001",
            active=True
        )
        await product_repo.create(
            vendor_id=vendor.id,
            name="Active2",
            product_code="ACTIVE_002",
            active=True
        )
        await product_repo.create(
            vendor_id=vendor.id,
            name="Inactive",
            product_code="INACTIVE_001",
            active=False
        )
        
        # Retrieve active products
        products = await product_repo.get_active_products()
        
        assert len(products) == 2
        assert all(p.active for p in products)
    
    @pytest.mark.asyncio
    async def test_check_product_name_exists(self, db_session):
        """Test checking if a product name exists for a vendor."""
        vendor_repo = VendorRepository(db_session)
        product_repo = ProductRepository(db_session)
        
        # Create vendor and product
        vendor = await vendor_repo.create(name="Vendor", sla_timeout_ms=3000, active=True)
        await product_repo.create(
            vendor_id=vendor.id,
            name="ExistingProduct",
            product_code="EXIST_001",
            active=True
        )
        
        # Check existing name
        exists = await product_repo.check_product_name_exists(
            vendor_id=vendor.id,
            name="ExistingProduct"
        )
        assert exists is True
        
        # Check non-existing name
        not_exists = await product_repo.check_product_name_exists(
            vendor_id=vendor.id,
            name="NonExistentProduct"
        )
        assert not_exists is False
    
    @pytest.mark.asyncio
    async def test_check_product_name_exists_different_vendor(self, db_session):
        """Test that product name uniqueness is per vendor."""
        vendor_repo = VendorRepository(db_session)
        product_repo = ProductRepository(db_session)
        
        # Create two vendors
        vendor1 = await vendor_repo.create(name="Vendor1", sla_timeout_ms=3000, active=True)
        vendor2 = await vendor_repo.create(name="Vendor2", sla_timeout_ms=3000, active=True)
        
        # Create product with same name for vendor1
        await product_repo.create(
            vendor_id=vendor1.id,
            name="SharedName",
            product_code="SHARED_001",
            active=True
        )
        
        # Check if name exists for vendor2 (should be False)
        exists = await product_repo.check_product_name_exists(
            vendor_id=vendor2.id,
            name="SharedName"
        )
        assert exists is False
    
    @pytest.mark.asyncio
    async def test_check_product_name_exists_exclude_self(self, db_session):
        """Test checking product name existence excluding a specific product."""
        vendor_repo = VendorRepository(db_session)
        product_repo = ProductRepository(db_session)
        
        # Create vendor and product
        vendor = await vendor_repo.create(name="Vendor", sla_timeout_ms=3000, active=True)
        product = await product_repo.create(
            vendor_id=vendor.id,
            name="ProductName",
            product_code="PROD_001",
            active=True
        )
        
        # Check existence excluding the product itself (for updates)
        exists = await product_repo.check_product_name_exists(
            vendor_id=vendor.id,
            name="ProductName",
            exclude_product_id=product.id
        )
        assert exists is False
    
    @pytest.mark.asyncio
    async def test_create_with_commission_rule_percentage(self, db_session):
        """Test creating a product with percentage commission rule."""
        vendor_repo = VendorRepository(db_session)
        product_repo = ProductRepository(db_session)
        
        # Create vendor
        vendor = await vendor_repo.create(name="Vendor", sla_timeout_ms=3000, active=True)
        
        # Create product with commission rule
        product = await product_repo.create_with_commission_rule(
            vendor_id=vendor.id,
            name="Product",
            product_code="PROD_001",
            calculation_method="percentage",
            percentage_rate=5.0
        )
        
        assert product.id is not None
        
        # Retrieve commission rule separately to avoid lazy loading issues
        rule = await product_repo.get_commission_rule(product.id)
        assert rule is not None
        assert rule.calculation_method == "percentage"
        assert rule.percentage_rate == Decimal("5.0")
    
    @pytest.mark.asyncio
    async def test_create_with_commission_rule_fixed(self, db_session):
        """Test creating a product with fixed commission rule."""
        vendor_repo = VendorRepository(db_session)
        product_repo = ProductRepository(db_session)
        
        # Create vendor
        vendor = await vendor_repo.create(name="Vendor", sla_timeout_ms=3000, active=True)
        
        # Create product with fixed commission
        product = await product_repo.create_with_commission_rule(
            vendor_id=vendor.id,
            name="Product",
            product_code="PROD_001",
            calculation_method="fixed",
            fixed_amount=10.0
        )
        
        # Retrieve commission rule separately to avoid lazy loading issues
        rule = await product_repo.get_commission_rule(product.id)
        assert rule is not None
        assert rule.calculation_method == "fixed"
        assert rule.fixed_amount == Decimal("10.0")
    
    @pytest.mark.asyncio
    async def test_create_with_commission_rule_tiered(self, db_session):
        """Test creating a product with tiered commission rule."""
        vendor_repo = VendorRepository(db_session)
        product_repo = ProductRepository(db_session)
        
        # Create vendor
        vendor = await vendor_repo.create(name="Vendor", sla_timeout_ms=3000, active=True)
        
        # Create product with tiered commission
        tiered_config = {
            "tiers": [
                {"threshold": 0, "rate": 5.0},
                {"threshold": 100, "rate": 7.5},
                {"threshold": 500, "rate": 10.0}
            ]
        }
        product = await product_repo.create_with_commission_rule(
            vendor_id=vendor.id,
            name="Product",
            product_code="PROD_001",
            calculation_method="tiered",
            tiered_config=tiered_config
        )
        
        # Retrieve commission rule separately to avoid lazy loading issues
        rule = await product_repo.get_commission_rule(product.id)
        assert rule is not None
        assert rule.calculation_method == "tiered"
        assert rule.tiered_config == tiered_config
    
    @pytest.mark.asyncio
    async def test_get_commission_rule(self, db_session):
        """Test retrieving a commission rule for a product."""
        vendor_repo = VendorRepository(db_session)
        product_repo = ProductRepository(db_session)
        
        # Create vendor and product with commission rule
        vendor = await vendor_repo.create(name="Vendor", sla_timeout_ms=3000, active=True)
        product = await product_repo.create_with_commission_rule(
            vendor_id=vendor.id,
            name="Product",
            product_code="PROD_001",
            calculation_method="percentage",
            percentage_rate=5.0
        )
        
        # Retrieve commission rule
        rule = await product_repo.get_commission_rule(product.id)
        
        assert rule is not None
        assert rule.product_id == product.id
        assert rule.calculation_method == "percentage"
        assert rule.percentage_rate == Decimal("5.0")
    
    @pytest.mark.asyncio
    async def test_get_commission_rule_not_found(self, db_session):
        """Test retrieving commission rule for product without one."""
        product_repo = ProductRepository(db_session)
        
        rule = await product_repo.get_commission_rule(999)
        
        assert rule is None
    
    @pytest.mark.asyncio
    async def test_update_commission_rule(self, db_session):
        """Test updating a commission rule."""
        vendor_repo = VendorRepository(db_session)
        product_repo = ProductRepository(db_session)
        
        # Create vendor and product with commission rule
        vendor = await vendor_repo.create(name="Vendor", sla_timeout_ms=3000, active=True)
        product = await product_repo.create_with_commission_rule(
            vendor_id=vendor.id,
            name="Product",
            product_code="PROD_001",
            calculation_method="percentage",
            percentage_rate=5.0
        )
        
        # Update commission rule
        updated_rule = await product_repo.update_commission_rule(
            product_id=product.id,
            percentage_rate=7.5
        )
        
        assert updated_rule is not None
        assert updated_rule.percentage_rate == Decimal("7.5")
    
    @pytest.mark.asyncio
    async def test_update_commission_rule_change_method(self, db_session):
        """Test updating commission rule calculation method."""
        vendor_repo = VendorRepository(db_session)
        product_repo = ProductRepository(db_session)
        
        # Create vendor and product with percentage commission
        vendor = await vendor_repo.create(name="Vendor", sla_timeout_ms=3000, active=True)
        product = await product_repo.create_with_commission_rule(
            vendor_id=vendor.id,
            name="Product",
            product_code="PROD_001",
            calculation_method="percentage",
            percentage_rate=5.0
        )
        
        # Update to fixed commission
        updated_rule = await product_repo.update_commission_rule(
            product_id=product.id,
            calculation_method="fixed",
            fixed_amount=10.0
        )
        
        assert updated_rule is not None
        assert updated_rule.calculation_method == "fixed"
        assert updated_rule.fixed_amount == Decimal("10.0")
    
    @pytest.mark.asyncio
    async def test_update_commission_rule_not_found(self, db_session):
        """Test updating commission rule for non-existent product."""
        product_repo = ProductRepository(db_session)
        
        updated_rule = await product_repo.update_commission_rule(
            product_id=999,
            percentage_rate=7.5
        )
        
        assert updated_rule is None
    
    @pytest.mark.asyncio
    async def test_update_product(self, db_session):
        """Test updating a product."""
        vendor_repo = VendorRepository(db_session)
        product_repo = ProductRepository(db_session)
        
        # Create vendor and product
        vendor = await vendor_repo.create(name="Vendor", sla_timeout_ms=3000, active=True)
        product = await product_repo.create(
            vendor_id=vendor.id,
            name="OriginalName",
            product_code="PROD_001",
            active=True
        )
        
        # Update product
        updated_product = await product_repo.update(
            product.id,
            name="UpdatedName",
            active=False
        )
        
        assert updated_product is not None
        assert updated_product.name == "UpdatedName"
        assert updated_product.active is False
    
    @pytest.mark.asyncio
    async def test_delete_product(self, db_session):
        """Test deleting a product."""
        vendor_repo = VendorRepository(db_session)
        product_repo = ProductRepository(db_session)
        
        # Create vendor and product
        vendor = await vendor_repo.create(name="Vendor", sla_timeout_ms=3000, active=True)
        product = await product_repo.create(
            vendor_id=vendor.id,
            name="Product",
            product_code="PROD_001",
            active=True
        )
        
        # Delete product
        deleted = await product_repo.delete(product.id)
        
        assert deleted is True
        
        # Verify deletion
        retrieved = await product_repo.get_by_id(product.id)
        assert retrieved is None
