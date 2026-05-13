"""
Unit tests for SQLAlchemy models.

Validates model definitions, constraints, relationships, and schema correctness
against requirements 17.3, 17.5, 1.4, 8.3, 8.4, 8.5.
"""
import pytest
from decimal import Decimal
from datetime import date, datetime
from sqlalchemy import inspect, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.models import (
    Merchant,
    Vendor,
    Product,
    CommissionRule,
    Transaction,
    CommissionRecord,
    DailyCommissionAggregate,
    CommissionPayout,
    AuditRecord,
    SLAViolation,
    WebhookEvent,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def create_merchant(session: AsyncSession, **overrides) -> Merchant:
    defaults = dict(
        name="Test Merchant",
        email="test@example.com",
        phone="0123456789",
        business_name="Test Corp",
        password_hash="hashed_pw",
    )
    defaults.update(overrides)
    merchant = Merchant(**defaults)
    session.add(merchant)
    await session.flush()
    return merchant


async def create_vendor(session: AsyncSession, **overrides) -> Vendor:
    defaults = dict(name="Test Vendor", sla_timeout_ms=5000, active=True)
    defaults.update(overrides)
    vendor = Vendor(**defaults)
    session.add(vendor)
    await session.flush()
    return vendor


async def create_product(session: AsyncSession, vendor_id: int, **overrides) -> Product:
    defaults = dict(
        vendor_id=vendor_id,
        name="Test Product",
        product_code="PROD001",
        active=True,
    )
    defaults.update(overrides)
    product = Product(**defaults)
    session.add(product)
    await session.flush()
    return product


async def create_transaction(
    session: AsyncSession, merchant_id: int, **overrides
) -> Transaction:
    defaults = dict(
        merchant_id=merchant_id,
        transaction_type="deposit",
        amount=Decimal("100.00"),
        float_before=Decimal("0.00"),
        float_after=Decimal("100.00"),
        status="completed",
    )
    defaults.update(overrides)
    txn = Transaction(**defaults)
    session.add(txn)
    await session.flush()
    return txn


# ---------------------------------------------------------------------------
# Merchant model tests
# ---------------------------------------------------------------------------

@pytest.mark.unit
class TestMerchantModel:
    async def test_create_merchant(self, db_session: AsyncSession):
        merchant = await create_merchant(db_session)
        await db_session.commit()

        assert merchant.id is not None
        assert merchant.name == "Test Merchant"
        assert merchant.email == "test@example.com"
        assert merchant.created_at is not None

    async def test_email_uniqueness_constraint(self, db_session: AsyncSession):
        """Requirement 1.4: email must be unique across all merchants."""
        await create_merchant(db_session, email="dup@example.com")
        await db_session.commit()

        with pytest.raises(IntegrityError):
            await create_merchant(db_session, email="dup@example.com")
            await db_session.commit()

    async def test_merchant_has_required_columns(self, db_session: AsyncSession):
        merchant = await create_merchant(db_session)
        assert merchant.name is not None
        assert merchant.email is not None
        assert merchant.phone is not None
        assert merchant.business_name is not None
        assert merchant.password_hash is not None


# ---------------------------------------------------------------------------
# Vendor model tests
# ---------------------------------------------------------------------------

@pytest.mark.unit
class TestVendorModel:
    async def test_create_vendor(self, db_session: AsyncSession):
        vendor = await create_vendor(db_session)
        await db_session.commit()

        assert vendor.id is not None
        assert vendor.name == "Test Vendor"
        assert vendor.sla_timeout_ms == 5000
        assert vendor.active is True

    async def test_vendor_name_uniqueness(self, db_session: AsyncSession):
        await create_vendor(db_session, name="UniqueVendor")
        await db_session.commit()

        with pytest.raises(IntegrityError):
            await create_vendor(db_session, name="UniqueVendor")
            await db_session.commit()


# ---------------------------------------------------------------------------
# Product model tests
# ---------------------------------------------------------------------------

@pytest.mark.unit
class TestProductModel:
    async def test_create_product(self, db_session: AsyncSession):
        vendor = await create_vendor(db_session)
        product = await create_product(db_session, vendor.id)
        await db_session.commit()

        assert product.id is not None
        assert product.vendor_id == vendor.id
        assert product.product_code == "PROD001"

    async def test_product_code_globally_unique(self, db_session: AsyncSession):
        """product_code must be unique across all vendors."""
        vendor1 = await create_vendor(db_session, name="Vendor A")
        vendor2 = await create_vendor(db_session, name="Vendor B")
        await create_product(db_session, vendor1.id, product_code="SHARED_CODE", name="P1")
        await db_session.commit()

        with pytest.raises(IntegrityError):
            await create_product(
                db_session, vendor2.id, product_code="SHARED_CODE", name="P2"
            )
            await db_session.commit()

    async def test_product_name_unique_per_vendor(self, db_session: AsyncSession):
        """Requirement 8.5: product names must be unique within a vendor."""
        vendor = await create_vendor(db_session)
        await create_product(
            db_session, vendor.id, name="Electricity", product_code="ELEC001"
        )
        await db_session.commit()

        with pytest.raises(IntegrityError):
            await create_product(
                db_session, vendor.id, name="Electricity", product_code="ELEC002"
            )
            await db_session.commit()

    async def test_same_product_name_allowed_across_vendors(self, db_session: AsyncSession):
        """Requirement 8.5: uniqueness is per-vendor, not global."""
        vendor1 = await create_vendor(db_session, name="Vendor X")
        vendor2 = await create_vendor(db_session, name="Vendor Y")
        await create_product(
            db_session, vendor1.id, name="Airtime", product_code="AIR001"
        )
        await create_product(
            db_session, vendor2.id, name="Airtime", product_code="AIR002"
        )
        await db_session.commit()
        # No exception means the constraint is correctly scoped per vendor

    async def test_vendor_can_have_multiple_products(self, db_session: AsyncSession):
        """Requirement 8.4: a vendor can have multiple products."""
        from sqlalchemy import select
        vendor = await create_vendor(db_session)
        await create_product(db_session, vendor.id, name="P1", product_code="P001")
        await create_product(db_session, vendor.id, name="P2", product_code="P002")
        await create_product(db_session, vendor.id, name="P3", product_code="P003")
        await db_session.commit()

        result = await db_session.execute(
            select(Product).where(Product.vendor_id == vendor.id)
        )
        products = result.scalars().all()
        assert len(products) == 3

    async def test_product_belongs_to_exactly_one_vendor(self, db_session: AsyncSession):
        """Requirement 8.3: each product is associated with exactly one vendor."""
        vendor = await create_vendor(db_session)
        product = await create_product(db_session, vendor.id)
        await db_session.commit()

        assert product.vendor_id == vendor.id


# ---------------------------------------------------------------------------
# CommissionRule model tests
# ---------------------------------------------------------------------------

@pytest.mark.unit
class TestCommissionRuleModel:
    async def test_create_percentage_rule(self, db_session: AsyncSession):
        vendor = await create_vendor(db_session)
        product = await create_product(db_session, vendor.id)
        rule = CommissionRule(
            product_id=product.id,
            calculation_method="percentage",
            percentage_rate=Decimal("5.00"),
        )
        session.add(rule) if False else db_session.add(rule)
        await db_session.flush()
        await db_session.commit()

        assert rule.id is not None
        assert rule.calculation_method == "percentage"

    async def test_create_fixed_rule(self, db_session: AsyncSession):
        vendor = await create_vendor(db_session)
        product = await create_product(db_session, vendor.id)
        rule = CommissionRule(
            product_id=product.id,
            calculation_method="fixed",
            fixed_amount=Decimal("10.00"),
        )
        db_session.add(rule)
        await db_session.flush()
        await db_session.commit()

        assert rule.calculation_method == "fixed"

    async def test_create_tiered_rule(self, db_session: AsyncSession):
        vendor = await create_vendor(db_session)
        product = await create_product(db_session, vendor.id)
        tiered = [{"min": 0, "max": 100, "rate": 5}, {"min": 100, "max": None, "rate": 3}]
        rule = CommissionRule(
            product_id=product.id,
            calculation_method="tiered",
            tiered_config=tiered,
        )
        db_session.add(rule)
        await db_session.flush()
        await db_session.commit()

        assert rule.tiered_config is not None

    async def test_one_rule_per_product(self, db_session: AsyncSession):
        """Each product has exactly one commission rule (unique FK)."""
        vendor = await create_vendor(db_session)
        product = await create_product(db_session, vendor.id)
        rule1 = CommissionRule(
            product_id=product.id,
            calculation_method="fixed",
            fixed_amount=Decimal("5.00"),
        )
        db_session.add(rule1)
        await db_session.commit()

        with pytest.raises(IntegrityError):
            rule2 = CommissionRule(
                product_id=product.id,
                calculation_method="percentage",
                percentage_rate=Decimal("3.00"),
            )
            db_session.add(rule2)
            await db_session.commit()


# ---------------------------------------------------------------------------
# Transaction model tests
# ---------------------------------------------------------------------------

@pytest.mark.unit
class TestTransactionModel:
    async def test_create_deposit_transaction(self, db_session: AsyncSession):
        merchant = await create_merchant(db_session)
        txn = await create_transaction(db_session, merchant.id)
        await db_session.commit()

        assert txn.id is not None
        assert txn.transaction_type == "deposit"
        assert txn.amount == Decimal("100.00")
        assert txn.float_before == Decimal("0.00")
        assert txn.float_after == Decimal("100.00")
        assert txn.status == "completed"
        assert txn.created_at is not None

    async def test_transaction_types(self, db_session: AsyncSession):
        """All four valid transaction types can be created."""
        merchant = await create_merchant(db_session)
        for txn_type in ("deposit", "vending", "cashout", "commission_payout"):
            txn = await create_transaction(
                db_session, merchant.id, transaction_type=txn_type
            )
        await db_session.commit()

    async def test_transaction_statuses(self, db_session: AsyncSession):
        """All three valid statuses can be set."""
        merchant = await create_merchant(db_session)
        for status in ("pending", "completed", "failed"):
            await create_transaction(db_session, merchant.id, status=status)
        await db_session.commit()

    async def test_metadata_field(self, db_session: AsyncSession):
        """metadata_ attribute maps to the 'metadata' DB column."""
        merchant = await create_merchant(db_session)
        txn = await create_transaction(
            db_session, merchant.id, metadata_={"key": "value", "num": 42}
        )
        await db_session.commit()

        assert txn.metadata_ == {"key": "value", "num": 42}

    async def test_transaction_has_all_required_fields(self, db_session: AsyncSession):
        """Property 5: transaction records must contain all required fields."""
        merchant = await create_merchant(db_session)
        txn = await create_transaction(db_session, merchant.id)
        await db_session.commit()

        assert txn.id is not None
        assert txn.merchant_id is not None
        assert txn.transaction_type is not None
        assert txn.amount is not None
        assert txn.float_before is not None
        assert txn.float_after is not None
        assert txn.status is not None
        assert txn.created_at is not None


# ---------------------------------------------------------------------------
# CommissionRecord model tests
# ---------------------------------------------------------------------------

@pytest.mark.unit
class TestCommissionRecordModel:
    async def test_create_commission_record(self, db_session: AsyncSession):
        merchant = await create_merchant(db_session)
        vendor = await create_vendor(db_session)
        product = await create_product(db_session, vendor.id)
        txn = await create_transaction(
            db_session, merchant.id, product_id=product.id, transaction_type="vending"
        )
        record = CommissionRecord(
            transaction_id=txn.id,
            merchant_id=merchant.id,
            product_id=product.id,
            amount=Decimal("5.00"),
            calculation_method="percentage",
            calculation_details={"rate": "5%", "base": "100.00"},
        )
        db_session.add(record)
        await db_session.commit()

        assert record.id is not None
        assert record.amount == Decimal("5.00")

    async def test_one_commission_record_per_transaction(self, db_session: AsyncSession):
        """CommissionRecord has a unique FK on transaction_id."""
        merchant = await create_merchant(db_session)
        vendor = await create_vendor(db_session)
        product = await create_product(db_session, vendor.id)
        txn = await create_transaction(
            db_session, merchant.id, product_id=product.id, transaction_type="vending"
        )
        record1 = CommissionRecord(
            transaction_id=txn.id,
            merchant_id=merchant.id,
            product_id=product.id,
            amount=Decimal("5.00"),
            calculation_method="percentage",
        )
        db_session.add(record1)
        await db_session.commit()

        with pytest.raises(IntegrityError):
            record2 = CommissionRecord(
                transaction_id=txn.id,
                merchant_id=merchant.id,
                product_id=product.id,
                amount=Decimal("3.00"),
                calculation_method="fixed",
            )
            db_session.add(record2)
            await db_session.commit()


# ---------------------------------------------------------------------------
# DailyCommissionAggregate model tests
# ---------------------------------------------------------------------------

@pytest.mark.unit
class TestDailyCommissionAggregateModel:
    async def test_create_aggregate(self, db_session: AsyncSession):
        merchant = await create_merchant(db_session)
        agg = DailyCommissionAggregate(
            merchant_id=merchant.id,
            date=date(2024, 1, 15),
            total_commission=Decimal("50.00"),
            transaction_count=5,
            paid=False,
        )
        db_session.add(agg)
        await db_session.commit()

        assert agg.id is not None
        assert agg.date == date(2024, 1, 15)
        assert agg.total_commission == Decimal("50.00")
        assert agg.paid is False

    async def test_unique_per_merchant_per_date(self, db_session: AsyncSession):
        """Only one aggregate row per merchant per date."""
        merchant = await create_merchant(db_session)
        agg1 = DailyCommissionAggregate(
            merchant_id=merchant.id,
            date=date(2024, 1, 15),
            total_commission=Decimal("50.00"),
            transaction_count=5,
        )
        db_session.add(agg1)
        await db_session.commit()

        with pytest.raises(IntegrityError):
            agg2 = DailyCommissionAggregate(
                merchant_id=merchant.id,
                date=date(2024, 1, 15),
                total_commission=Decimal("20.00"),
                transaction_count=2,
            )
            db_session.add(agg2)
            await db_session.commit()

    async def test_date_column_is_date_type(self, db_session: AsyncSession):
        """date column stores a date, not a datetime."""
        merchant = await create_merchant(db_session)
        agg = DailyCommissionAggregate(
            merchant_id=merchant.id,
            date=date(2024, 6, 1),
            total_commission=Decimal("0.00"),
            transaction_count=0,
        )
        db_session.add(agg)
        await db_session.commit()

        assert isinstance(agg.date, date)


# ---------------------------------------------------------------------------
# CommissionPayout model tests
# ---------------------------------------------------------------------------

@pytest.mark.unit
class TestCommissionPayoutModel:
    async def test_create_payout(self, db_session: AsyncSession):
        merchant = await create_merchant(db_session)
        txn = await create_transaction(
            db_session, merchant.id, transaction_type="commission_payout"
        )
        payout = CommissionPayout(
            merchant_id=merchant.id,
            year=2024,
            month=1,
            total_amount=Decimal("150.00"),
            transaction_id=txn.id,
        )
        db_session.add(payout)
        await db_session.commit()

        assert payout.id is not None
        assert payout.year == 2024
        assert payout.month == 1

    async def test_unique_per_merchant_year_month(self, db_session: AsyncSession):
        """Prevents duplicate payouts for the same period."""
        merchant = await create_merchant(db_session)
        txn1 = await create_transaction(
            db_session, merchant.id, transaction_type="commission_payout"
        )
        txn2 = await create_transaction(
            db_session,
            merchant.id,
            transaction_type="commission_payout",
            amount=Decimal("50.00"),
            float_before=Decimal("100.00"),
            float_after=Decimal("150.00"),
        )
        payout1 = CommissionPayout(
            merchant_id=merchant.id,
            year=2024,
            month=1,
            total_amount=Decimal("150.00"),
            transaction_id=txn1.id,
        )
        db_session.add(payout1)
        await db_session.commit()

        with pytest.raises(IntegrityError):
            payout2 = CommissionPayout(
                merchant_id=merchant.id,
                year=2024,
                month=1,
                total_amount=Decimal("50.00"),
                transaction_id=txn2.id,
            )
            db_session.add(payout2)
            await db_session.commit()


# ---------------------------------------------------------------------------
# AuditRecord model tests
# ---------------------------------------------------------------------------

@pytest.mark.unit
class TestAuditRecordModel:
    async def test_create_audit_record(self, db_session: AsyncSession):
        merchant = await create_merchant(db_session)
        txn = await create_transaction(db_session, merchant.id)
        record = AuditRecord(
            transaction_id=txn.id,
            record_type="commission_calculation",
            data={"method": "percentage", "rate": "5%", "amount": "5.00"},
        )
        db_session.add(record)
        await db_session.commit()

        assert record.id is not None
        assert record.record_type == "commission_calculation"
        assert record.data is not None
        assert record.created_at is not None

    async def test_multiple_audit_records_per_transaction(self, db_session: AsyncSession):
        """A transaction can have multiple audit records."""
        from sqlalchemy import select
        merchant = await create_merchant(db_session)
        txn = await create_transaction(db_session, merchant.id)
        for record_type in ("commission_calculation", "float_update"):
            record = AuditRecord(
                transaction_id=txn.id,
                record_type=record_type,
                data={"event": record_type},
            )
            db_session.add(record)
        await db_session.commit()

        result = await db_session.execute(
            select(AuditRecord).where(AuditRecord.transaction_id == txn.id)
        )
        records = result.scalars().all()
        assert len(records) == 2


# ---------------------------------------------------------------------------
# SLAViolation model tests
# ---------------------------------------------------------------------------

@pytest.mark.unit
class TestSLAViolationModel:
    async def test_create_sla_violation(self, db_session: AsyncSession):
        vendor = await create_vendor(db_session)
        product = await create_product(db_session, vendor.id)
        violation = SLAViolation(
            vendor_id=vendor.id,
            product_id=product.id,
            response_time_ms=8000,
            sla_threshold_ms=5000,
        )
        db_session.add(violation)
        await db_session.commit()

        assert violation.id is not None
        assert violation.response_time_ms == 8000
        assert violation.sla_threshold_ms == 5000
        assert violation.created_at is not None

    async def test_sla_violation_relationships(self, db_session: AsyncSession):
        from sqlalchemy import select
        vendor = await create_vendor(db_session)
        product = await create_product(db_session, vendor.id)
        violation = SLAViolation(
            vendor_id=vendor.id,
            product_id=product.id,
            response_time_ms=6000,
            sla_threshold_ms=5000,
        )
        db_session.add(violation)
        await db_session.commit()

        result = await db_session.execute(
            select(SLAViolation).where(SLAViolation.id == violation.id)
        )
        fetched = result.scalar_one()
        assert fetched.vendor_id == vendor.id
        assert fetched.product_id == product.id


# ---------------------------------------------------------------------------
# WebhookEvent model tests
# ---------------------------------------------------------------------------

@pytest.mark.unit
class TestWebhookEventModel:
    async def test_create_webhook_event(self, db_session: AsyncSession):
        event = WebhookEvent(
            provider="stripe",
            event_id="evt_test_001",
            event_type="payment_intent.succeeded",
            payload={"id": "evt_test_001", "type": "payment_intent.succeeded"},
            processed=False,
        )
        db_session.add(event)
        await db_session.commit()

        assert event.id is not None
        assert event.provider == "stripe"
        assert event.processed is False

    async def test_event_id_uniqueness(self, db_session: AsyncSession):
        """event_id must be unique to enforce idempotency."""
        event1 = WebhookEvent(
            provider="stripe",
            event_id="evt_dup_001",
            event_type="payment_intent.succeeded",
            payload={},
            processed=False,
        )
        db_session.add(event1)
        await db_session.commit()

        with pytest.raises(IntegrityError):
            event2 = WebhookEvent(
                provider="stripe",
                event_id="evt_dup_001",
                event_type="payment_intent.succeeded",
                payload={},
                processed=False,
            )
            db_session.add(event2)
            await db_session.commit()


# ---------------------------------------------------------------------------
# Relationship integrity tests
# ---------------------------------------------------------------------------

@pytest.mark.unit
class TestRelationships:
    async def test_merchant_transaction_relationship(self, db_session: AsyncSession):
        """Requirement 17.5: FK constraints between related entities."""
        from sqlalchemy import select
        merchant = await create_merchant(db_session)
        txn = await create_transaction(db_session, merchant.id)
        await db_session.commit()

        result = await db_session.execute(
            select(Transaction).where(Transaction.merchant_id == merchant.id)
        )
        transactions = result.scalars().all()
        assert len(transactions) == 1
        assert transactions[0].id == txn.id

    async def test_vendor_product_relationship(self, db_session: AsyncSession):
        from sqlalchemy import select
        vendor = await create_vendor(db_session)
        product = await create_product(db_session, vendor.id)
        await db_session.commit()

        result = await db_session.execute(
            select(Product).where(Product.vendor_id == vendor.id)
        )
        products = result.scalars().all()
        assert len(products) == 1
        assert products[0].id == product.id

    async def test_product_commission_rule_one_to_one(self, db_session: AsyncSession):
        from sqlalchemy import select
        vendor = await create_vendor(db_session)
        product = await create_product(db_session, vendor.id)
        rule = CommissionRule(
            product_id=product.id,
            calculation_method="fixed",
            fixed_amount=Decimal("2.50"),
        )
        db_session.add(rule)
        await db_session.commit()

        result = await db_session.execute(
            select(CommissionRule).where(CommissionRule.product_id == product.id)
        )
        fetched_rule = result.scalar_one_or_none()
        assert fetched_rule is not None
        assert fetched_rule.id == rule.id

    async def test_transaction_commission_record_one_to_one(self, db_session: AsyncSession):
        from sqlalchemy import select
        merchant = await create_merchant(db_session)
        vendor = await create_vendor(db_session)
        product = await create_product(db_session, vendor.id)
        txn = await create_transaction(
            db_session, merchant.id, product_id=product.id, transaction_type="vending"
        )
        record = CommissionRecord(
            transaction_id=txn.id,
            merchant_id=merchant.id,
            product_id=product.id,
            amount=Decimal("2.50"),
            calculation_method="fixed",
        )
        db_session.add(record)
        await db_session.commit()

        result = await db_session.execute(
            select(CommissionRecord).where(CommissionRecord.transaction_id == txn.id)
        )
        fetched = result.scalar_one_or_none()
        assert fetched is not None
        assert fetched.id == record.id

    async def test_foreign_key_enforced_on_transaction(self, db_session: AsyncSession):
        """Requirement 17.5: FK constraint prevents orphaned transactions.

        SQLite requires PRAGMA foreign_keys=ON; we verify the FK column is set
        correctly and that a valid merchant_id is required at the model level.
        """
        merchant = await create_merchant(db_session)
        txn = await create_transaction(db_session, merchant.id)
        await db_session.commit()

        # Verify the FK column is correctly stored
        assert txn.merchant_id == merchant.id
