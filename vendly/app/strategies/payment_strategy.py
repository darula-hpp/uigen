"""
PaymentStrategy abstract base class.

Defines the interface that all payment provider integrations must implement,
enabling payment-provider-agnostic deposit processing via the Strategy pattern.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass
from decimal import Decimal
from typing import Any, Dict, Optional


@dataclass
class PaymentIntent:
    """
    Represents a payment intent created by a payment provider.

    Returned by create_payment_intent and passed back to the client
    so they can complete the payment on the provider's side.
    """

    intent_id: str
    """Provider-assigned identifier for this payment intent."""

    client_secret: str
    """Client-facing secret used to confirm the payment on the frontend."""

    amount: Decimal
    """The amount this intent is for, in the platform's base currency."""

    currency: str
    """ISO 4217 currency code (e.g. 'usd')."""

    provider: str
    """Name of the payment provider that created this intent (e.g. 'stripe')."""

    metadata: Dict[str, Any]
    """Arbitrary key-value pairs attached to the intent for reconciliation."""


@dataclass
class PaymentConfirmation:
    """
    Confirmation that a payment has been successfully processed.

    Returned by process_webhook_event when a webhook event indicates
    a successful payment. The platform uses this to credit the merchant float.
    """

    event_id: str
    """Provider-assigned unique identifier for the webhook event."""

    payment_reference: str
    """Provider-assigned identifier for the completed payment (e.g. payment intent ID)."""

    amount: Decimal
    """The amount that was successfully charged, in the platform's base currency."""

    merchant_id: int
    """The platform merchant identifier extracted from the payment metadata."""

    provider: str
    """Name of the payment provider that confirmed this payment."""

    metadata: Dict[str, Any]
    """Additional provider-specific details about the payment."""


class PaymentStrategy(ABC):
    """
    Abstract base class for payment provider integrations.

    Every payment provider integration must subclass PaymentStrategy and
    implement all three abstract methods. This ensures the platform can
    treat all payment providers uniformly regardless of their underlying
    API differences.

    Requirements: 3.1, 3.2
    """

    @abstractmethod
    async def create_payment_intent(
        self,
        amount: Decimal,
        merchant_id: int,
        metadata: Dict[str, Any],
    ) -> PaymentIntent:
        """
        Create a payment intent for the specified amount.

        Implementations must call the provider API to create a payment intent
        and return a PaymentIntent containing the client secret and intent ID.
        The merchant_id must be stored in the intent metadata so it can be
        recovered when the webhook event arrives.

        Args:
            amount: The deposit amount in the platform's base currency.
            merchant_id: The platform merchant identifier to associate with
                this payment intent for later reconciliation.
            metadata: Additional key-value pairs to attach to the intent
                (e.g. reference numbers, channel info).

        Returns:
            PaymentIntent containing the client_secret and intent_id needed
            to complete the payment on the client side.

        Raises:
            PaymentProcessingError: When the provider API is unreachable or
                returns an unrecoverable error.
        """

    @abstractmethod
    async def verify_webhook(
        self,
        payload: bytes,
        signature: str,
    ) -> bool:
        """
        Verify the authenticity of an incoming webhook payload.

        Implementations must validate the provider-specific signature to
        ensure the webhook originated from the payment provider and has
        not been tampered with.

        Args:
            payload: The raw request body bytes as received from the provider.
            signature: The provider-supplied signature header value.

        Returns:
            True if the signature is valid, False otherwise.
        """

    @abstractmethod
    async def process_webhook_event(
        self,
        event: Dict[str, Any],
    ) -> Optional[PaymentConfirmation]:
        """
        Process a webhook event and return a confirmation if payment succeeded.

        Implementations must inspect the event type and, for successful payment
        events, extract the amount and merchant_id from the event payload and
        return a PaymentConfirmation. For non-payment events or failed payments,
        return None.

        Args:
            event: The parsed webhook event payload from the provider.

        Returns:
            PaymentConfirmation if the event represents a successful payment,
            None otherwise (e.g. for non-payment events or failed payments).

        Raises:
            PaymentProcessingError: When the event cannot be processed due to
                missing required fields or an unrecoverable error.
        """
