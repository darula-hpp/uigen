"""
VendorStrategy abstract base class.

Defines the interface that all vendor integrations must implement,
enabling vendor-agnostic transaction processing via the Strategy pattern.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any, Dict, Optional


@dataclass
class VendorResponse:
    """
    Raw response returned by a vendor after processing a transaction.

    This is the vendor-specific payload before normalization. Each
    VendorStrategy implementation populates this from its own API
    response format, and then normalize_response converts it to the
    platform-standard NormalizedResponse.
    """

    success: bool
    """Whether the vendor considers the transaction successful."""

    raw_data: Dict[str, Any]
    """The full, unmodified response payload from the vendor API."""

    vendor_transaction_id: Optional[str] = None
    """Vendor-assigned transaction identifier, if provided."""

    vendor_token: Optional[str] = None
    """Vendor-issued token (e.g., electricity token, airtime PIN), if applicable."""

    error_code: Optional[str] = None
    """Vendor-specific error code when the transaction fails."""

    error_message: Optional[str] = None
    """Human-readable error description from the vendor."""

    extra: Dict[str, Any] = field(default_factory=dict)
    """Any additional vendor-specific fields not covered above."""


class VendorStrategy(ABC):
    """
    Abstract base class for vendor integrations.

    Every vendor integration must subclass VendorStrategy and implement
    all three abstract methods. This ensures the platform can treat all
    vendors uniformly regardless of their underlying API differences.

    Requirements: 7.1, 7.2, 7.4, 7.5
    """

    @abstractmethod
    async def process_transaction(
        self,
        product_code: str,
        amount: Decimal,
        customer_identifier: str,
        metadata: Dict[str, Any],
    ) -> VendorResponse:
        """
        Process a vending transaction with the vendor.

        Implementations must call the vendor API with the provided parameters
        and return a VendorResponse containing the raw vendor payload. Any
        vendor-specific error should be surfaced via VendorResponse.success=False
        rather than raising an exception, unless the error is unrecoverable
        (e.g., network failure), in which case VendorError should be raised.

        Args:
            product_code: The vendor-specific product or service code.
            amount: The transaction amount in the platform's base currency.
            customer_identifier: The end-customer reference (e.g., meter number,
                phone number) that the vendor uses to deliver the service.
            metadata: Arbitrary key-value pairs forwarded to the vendor for
                additional context (e.g., reference numbers, channel info).

        Returns:
            VendorResponse containing the vendor's raw response and parsed fields.

        Raises:
            VendorError: When the vendor API is unreachable or returns an
                unrecoverable error.
        """

    @abstractmethod
    def normalize_response(
        self,
        raw_response: Dict[str, Any],
    ) -> "NormalizedResponse":  # noqa: F821 - imported at call sites
        """
        Convert a vendor-specific response payload to the platform's
        NormalizedResponse format.

        Implementations must map vendor-specific status codes, error codes,
        and fields to the standard NormalizedResponse schema. Vendor-specific
        details that do not map to standard fields must be preserved in the
        NormalizedResponse.metadata dict.

        Args:
            raw_response: The unmodified response dict from the vendor API,
                as stored in VendorResponse.raw_data.

        Returns:
            NormalizedResponse with status, transaction_id, vendor_token,
            message, and metadata populated from the vendor payload.
        """

    @abstractmethod
    def get_sla_timeout(self) -> int:
        """
        Return the SLA timeout for this vendor in milliseconds.

        The platform uses this value to measure vendor response times and
        log SLA violations when the actual response time exceeds the threshold.
        Each vendor implementation should return the timeout agreed upon in
        its SLA contract.

        Returns:
            SLA timeout in milliseconds (e.g., 5000 for a 5-second SLA).
        """
