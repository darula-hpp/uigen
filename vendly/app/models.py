"""
SQLAlchemy ORM models for Vendly platform.

All financial amounts use Numeric(precision=10, scale=2) for exact decimal arithmetic.
JSONB is used for PostgreSQL deployments; JSON is the fallback for SQLite in tests.
"""
from sqlalchemy import (
    Column, Integer, String, Numeric, Boolean, DateTime, Date, ForeignKey,
    CheckConstraint, Index, UniqueConstraint, func, JSON,
)
from sqlalchemy.orm import relationship, DeclarativeBase


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass


class Merchant(Base):
    """Merchant account model."""
    __tablename__ = "merchants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(50), nullable=False)
    business_name = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    transactions = relationship("Transaction", back_populates="merchant")
    commission_records = relationship("CommissionRecord", back_populates="merchant")
    commission_aggregates = relationship("DailyCommissionAggregate", back_populates="merchant")
    commission_payouts = relationship("CommissionPayout", back_populates="merchant")


class Vendor(Base):
    """Vendor configuration model."""
    __tablename__ = "vendors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False, index=True)
    sla_timeout_ms = Column(Integer, nullable=False)
    active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    products = relationship("Product", back_populates="vendor")
    sla_violations = relationship("SLAViolation", back_populates="vendor")


class Product(Base):
    """Product configuration model.

    product_code is globally unique.
    name is unique per vendor (enforced by uq_vendor_product_name).
    """
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    product_code = Column(String(100), unique=True, nullable=False, index=True)
    active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("vendor_id", "name", name="uq_vendor_product_name"),
    )

    # Relationships
    vendor = relationship("Vendor", back_populates="products")
    commission_rule = relationship("CommissionRule", back_populates="product", uselist=False)
    transactions = relationship("Transaction", back_populates="product")
    commission_records = relationship("CommissionRecord", back_populates="product")
    sla_violations = relationship("SLAViolation", back_populates="product")


class CommissionRule(Base):
    """Commission calculation rules for products.

    Each product has exactly one commission rule (one-to-one via unique FK).
    Supports percentage, fixed, and tiered calculation methods.
    """
    __tablename__ = "commission_rules"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), unique=True, nullable=False)
    calculation_method = Column(String(50), nullable=False)
    percentage_rate = Column(Numeric(precision=5, scale=2), nullable=True)
    fixed_amount = Column(Numeric(precision=10, scale=2), nullable=True)
    tiered_config = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        CheckConstraint(
            "calculation_method IN ('percentage', 'fixed', 'tiered')",
            name="check_calculation_method",
        ),
    )

    # Relationships
    product = relationship("Product", back_populates="commission_rule")


class Transaction(Base):
    """Transaction record model.

    Covers all float-affecting operations: deposit, vending, cashout, commission_payout.
    float_before and float_after capture the merchant balance snapshot at transaction time.
    """
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    merchant_id = Column(Integer, ForeignKey("merchants.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True, index=True)
    transaction_type = Column(String(50), nullable=False, index=True)
    amount = Column(Numeric(precision=10, scale=2), nullable=False)
    float_before = Column(Numeric(precision=10, scale=2), nullable=False)
    float_after = Column(Numeric(precision=10, scale=2), nullable=False)
    status = Column(String(50), nullable=False, default="completed")
    payment_provider = Column(String(50), nullable=True)
    payment_reference = Column(String(255), nullable=True, index=True)
    vendor_token = Column(String(255), nullable=True)
    # Column named "metadata" in DB; aliased to avoid shadowing Python built-in
    metadata_ = Column("metadata", JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    __table_args__ = (
        CheckConstraint(
            "transaction_type IN ('deposit', 'vending', 'cashout', 'commission_payout')",
            name="check_transaction_type",
        ),
        CheckConstraint(
            "status IN ('pending', 'completed', 'failed')",
            name="check_status",
        ),
        CheckConstraint("amount > 0", name="check_positive_amount"),
        Index("idx_merchant_created", "merchant_id", "created_at"),
    )

    # Relationships
    merchant = relationship("Merchant", back_populates="transactions")
    product = relationship("Product", back_populates="transactions")
    commission_record = relationship(
        "CommissionRecord", back_populates="transaction", uselist=False
    )
    audit_records = relationship("AuditRecord", back_populates="transaction")
    commission_payout = relationship(
        "CommissionPayout", back_populates="transaction", uselist=False
    )


class CommissionRecord(Base):
    """Per-transaction commission calculation record.

    One record per transaction (unique FK). Feeds into DailyCommissionAggregate.
    """
    __tablename__ = "commission_records"

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(
        Integer, ForeignKey("transactions.id"), unique=True, nullable=False
    )
    merchant_id = Column(Integer, ForeignKey("merchants.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    amount = Column(Numeric(precision=10, scale=2), nullable=False)
    calculation_method = Column(String(50), nullable=False)
    calculation_details = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    transaction = relationship("Transaction", back_populates="commission_record")
    merchant = relationship("Merchant", back_populates="commission_records")
    product = relationship("Product", back_populates="commission_records")


class DailyCommissionAggregate(Base):
    """Daily commission totals per merchant.

    Unique per (merchant_id, date). paid=True once included in a CommissionPayout.
    """
    __tablename__ = "daily_commission_aggregates"

    id = Column(Integer, primary_key=True, index=True)
    merchant_id = Column(Integer, ForeignKey("merchants.id"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    total_commission = Column(Numeric(precision=10, scale=2), nullable=False, default=0)
    transaction_count = Column(Integer, nullable=False, default=0)
    paid = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("merchant_id", "date", name="uq_merchant_date"),
    )

    # Relationships
    merchant = relationship("Merchant", back_populates="commission_aggregates")


class CommissionPayout(Base):
    """Monthly commission payout record.

    Unique per (merchant_id, year, month) to prevent duplicate payouts.
    Links to the deposit Transaction that credited the merchant float.
    """
    __tablename__ = "commission_payouts"

    id = Column(Integer, primary_key=True, index=True)
    merchant_id = Column(Integer, ForeignKey("merchants.id"), nullable=False, index=True)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    total_amount = Column(Numeric(precision=10, scale=2), nullable=False)
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("merchant_id", "year", "month", name="uq_merchant_year_month"),
    )

    # Relationships
    merchant = relationship("Merchant", back_populates="commission_payouts")
    transaction = relationship("Transaction", back_populates="commission_payout")


class AuditRecord(Base):
    """Immutable audit trail record.

    Created once and never modified. Captures full context of commission events.
    """
    __tablename__ = "audit_records"

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(
        Integer, ForeignKey("transactions.id"), nullable=False, index=True
    )
    record_type = Column(String(50), nullable=False, index=True)
    data = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    transaction = relationship("Transaction", back_populates="audit_records")


class SLAViolation(Base):
    """SLA violation log.

    Recorded when a vendor response time exceeds the configured SLA threshold.
    Transaction processing continues regardless of violations.
    """
    __tablename__ = "sla_violations"

    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    response_time_ms = Column(Integer, nullable=False)
    sla_threshold_ms = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Relationships
    vendor = relationship("Vendor", back_populates="sla_violations")
    product = relationship("Product", back_populates="sla_violations")


class WebhookEvent(Base):
    """Webhook event tracking for idempotent processing.

    event_id is unique per provider to prevent duplicate processing.
    """
    __tablename__ = "webhook_events"

    id = Column(Integer, primary_key=True, index=True)
    provider = Column(String(50), nullable=False, index=True)
    event_id = Column(String(255), unique=True, nullable=False, index=True)
    event_type = Column(String(100), nullable=False)
    payload = Column(JSON, nullable=False)
    processed = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
