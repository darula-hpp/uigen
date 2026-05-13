"""
Unit tests for VendorStrategy abstract base class and VendorResponse dataclass.

Requirements: 7.1, 7.2, 7.4, 7.5
"""
import pytest
from decimal import Decimal
from typing import Any, Dict, Optional

from app.strategies.vendor_strategy import VendorResponse, VendorStrategy
from app.schemas import NormalizedResponse


# ---------------------------------------------------------------------------
# Concrete stub used across tests
# ---------------------------------------------------------------------------

class _StubVendorStrategy(VendorStrategy):
    """Minimal concrete implementation for testing the interface contract."""

    def __init__(self, sla_timeout_ms: int = 3000):
        self._sla_timeout_ms = sla_timeout_ms

    async def process_transaction(
        self,
        product_code: str,
        amount: Decimal,
        customer_identifier: str,
        metadata: Dict[str, Any],
    ) -> VendorResponse:
        return VendorResponse(
            success=True,
            raw_data={"product": product_code, "amount": str(amount)},
            vendor_transaction_id="txn-001",
            vendor_token="TOKEN-XYZ",
        )

    def normalize_response(self, raw_response: Dict[str, Any]) -> NormalizedResponse:
        return NormalizedResponse(
            status="success",
            transaction_id=raw_response.get("vendor_transaction_id"),
            vendor_token=raw_response.get("vendor_token"),
            message="Transaction processed successfully",
            metadata=raw_response,
        )

    def get_sla_timeout(self) -> int:
        return self._sla_timeout_ms


# ---------------------------------------------------------------------------
# VendorResponse tests
# ---------------------------------------------------------------------------

class TestVendorResponse:
    def test_required_fields_only(self):
        response = VendorResponse(success=True, raw_data={"key": "value"})
        assert response.success is True
        assert response.raw_data == {"key": "value"}
        assert response.vendor_transaction_id is None
        assert response.vendor_token is None
        assert response.error_code is None
        assert response.error_message is None
        assert response.extra == {}

    def test_all_fields_populated(self):
        response = VendorResponse(
            success=False,
            raw_data={"status": "error"},
            vendor_transaction_id="txn-999",
            vendor_token=None,
            error_code="VENDOR_ERR_001",
            error_message="Meter not found",
            extra={"retry_after": 30},
        )
        assert response.success is False
        assert response.error_code == "VENDOR_ERR_001"
        assert response.error_message == "Meter not found"
        assert response.extra == {"retry_after": 30}

    def test_extra_defaults_to_empty_dict(self):
        r1 = VendorResponse(success=True, raw_data={})
        r2 = VendorResponse(success=True, raw_data={})
        # Each instance should have its own dict, not a shared default
        r1.extra["key"] = "value"
        assert r2.extra == {}


# ---------------------------------------------------------------------------
# VendorStrategy interface enforcement tests
# ---------------------------------------------------------------------------

class TestVendorStrategyIsAbstract:
    def test_cannot_instantiate_abstract_class(self):
        with pytest.raises(TypeError):
            VendorStrategy()  # type: ignore[abstract]

    def test_subclass_missing_process_transaction_raises(self):
        class _Incomplete(VendorStrategy):
            def normalize_response(self, raw_response):
                return NormalizedResponse(status="success", message="ok")

            def get_sla_timeout(self):
                return 1000

        with pytest.raises(TypeError):
            _Incomplete()  # type: ignore[abstract]

    def test_subclass_missing_normalize_response_raises(self):
        class _Incomplete(VendorStrategy):
            async def process_transaction(self, product_code, amount, customer_identifier, metadata):
                return VendorResponse(success=True, raw_data={})

            def get_sla_timeout(self):
                return 1000

        with pytest.raises(TypeError):
            _Incomplete()  # type: ignore[abstract]

    def test_subclass_missing_get_sla_timeout_raises(self):
        class _Incomplete(VendorStrategy):
            async def process_transaction(self, product_code, amount, customer_identifier, metadata):
                return VendorResponse(success=True, raw_data={})

            def normalize_response(self, raw_response):
                return NormalizedResponse(status="success", message="ok")

        with pytest.raises(TypeError):
            _Incomplete()  # type: ignore[abstract]

    def test_complete_subclass_instantiates_successfully(self):
        strategy = _StubVendorStrategy()
        assert isinstance(strategy, VendorStrategy)


# ---------------------------------------------------------------------------
# Concrete implementation behaviour tests
# ---------------------------------------------------------------------------

class TestVendorStrategyContract:
    @pytest.mark.asyncio
    async def test_process_transaction_returns_vendor_response(self):
        strategy = _StubVendorStrategy()
        result = await strategy.process_transaction(
            product_code="ELEC-001",
            amount=Decimal("50.00"),
            customer_identifier="METER-12345",
            metadata={"channel": "mobile"},
        )
        assert isinstance(result, VendorResponse)
        assert result.success is True
        assert result.vendor_transaction_id == "txn-001"
        assert result.vendor_token == "TOKEN-XYZ"

    def test_normalize_response_returns_normalized_response(self):
        strategy = _StubVendorStrategy()
        normalized = strategy.normalize_response(
            {"vendor_transaction_id": "txn-001", "vendor_token": "TOKEN-XYZ"}
        )
        assert isinstance(normalized, NormalizedResponse)
        assert normalized.status in ("success", "failure", "pending")
        assert normalized.message

    def test_get_sla_timeout_returns_int(self):
        strategy = _StubVendorStrategy(sla_timeout_ms=5000)
        timeout = strategy.get_sla_timeout()
        assert isinstance(timeout, int)
        assert timeout == 5000

    def test_get_sla_timeout_positive(self):
        strategy = _StubVendorStrategy(sla_timeout_ms=1)
        assert strategy.get_sla_timeout() > 0
