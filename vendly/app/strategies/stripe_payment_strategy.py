"""
StripePaymentStrategy - Stripe implementation of PaymentStrategy.

Handles payment intent creation, webhook signature verification, and
payment_intent.succeeded event processing for Stripe card payments.

Requirements: 4.1, 4.2, 4.3, 4.7
"""
import logging
from decimal import Decimal
from typing import Any, Dict, Optional

import stripe
from stripe import StripeError

from app.exceptions import PaymentProcessingError
from app.strategies.payment_strategy import PaymentConfirmation, PaymentIntent, PaymentStrategy

logger = logging.getLogger(__name__)

# Stripe represents amounts in the smallest currency unit (cents for USD).
_CENTS_PER_UNIT = 100


class StripePaymentStrategy(PaymentStrategy):
    """
    Stripe implementation of the PaymentStrategy interface.

    Uses the Stripe Python SDK to create payment intents and verify
    webhook signatures. Processes payment_intent.succeeded events to
    confirm deposits.

    Requirements: 4.1, 4.2, 4.3, 4.7
    """

    def __init__(self, api_key: str, webhook_secret: str) -> None:
        """
        Initialise the strategy with Stripe credentials.

        Args:
            api_key: Stripe secret API key (sk_live_... or sk_test_...).
            webhook_secret: Stripe webhook signing secret (whsec_...) used
                to verify incoming webhook payloads.
        """
        self._api_key = api_key
        self._webhook_secret = webhook_secret
        stripe.api_key = api_key

    async def create_payment_intent(
        self,
        amount: Decimal,
        merchant_id: int,
        metadata: Dict[str, Any],
    ) -> PaymentIntent:
        """
        Create a Stripe PaymentIntent for the given deposit amount.

        Converts the decimal amount to cents (Stripe's smallest unit),
        attaches the merchant_id to the intent metadata for later
        reconciliation via webhook, and returns the client_secret needed
        by the frontend to confirm the payment.

        Args:
            amount: Deposit amount in the platform's base currency (e.g. USD).
            merchant_id: Platform merchant identifier stored in intent metadata.
            metadata: Additional key-value pairs forwarded to Stripe metadata.

        Returns:
            PaymentIntent with intent_id, client_secret, amount, currency,
            provider, and metadata.

        Raises:
            PaymentProcessingError: When the Stripe API call fails.
        """
        amount_cents = int(amount * _CENTS_PER_UNIT)

        intent_metadata = {**metadata, "merchant_id": str(merchant_id)}

        try:
            intent = stripe.PaymentIntent.create(
                amount=amount_cents,
                currency="usd",
                metadata=intent_metadata,
                automatic_payment_methods={"enabled": True},
            )
        except StripeError as exc:
            logger.error(
                "Stripe PaymentIntent creation failed",
                extra={"merchant_id": merchant_id, "amount": str(amount), "error": str(exc)},
            )
            raise PaymentProcessingError(
                message=f"Failed to create Stripe payment intent: {exc.user_message or str(exc)}",
                payment_provider="stripe",
            ) from exc

        return PaymentIntent(
            intent_id=intent.id,
            client_secret=intent.client_secret,
            amount=amount,
            currency=intent.currency,
            provider="stripe",
            metadata=dict(intent.metadata),
        )

    async def verify_webhook(
        self,
        payload: bytes,
        signature: str,
    ) -> bool:
        """
        Verify the Stripe webhook signature.

        Uses the Stripe SDK's construct_event to validate the HMAC signature
        against the raw payload bytes and the configured webhook secret.

        Args:
            payload: Raw request body bytes as received from Stripe.
            signature: Value of the 'Stripe-Signature' request header.

        Returns:
            True if the signature is valid, False if verification fails.
        """
        try:
            stripe.Webhook.construct_event(
                payload=payload,
                sig_header=signature,
                secret=self._webhook_secret,
            )
            return True
        except stripe.error.SignatureVerificationError:
            logger.warning("Stripe webhook signature verification failed")
            return False
        except Exception as exc:
            logger.error(
                "Unexpected error during Stripe webhook verification",
                extra={"error": str(exc)},
            )
            return False

    async def process_webhook_event(
        self,
        event: Dict[str, Any],
    ) -> Optional[PaymentConfirmation]:
        """
        Process a Stripe webhook event.

        Handles payment_intent.succeeded events by extracting the amount
        and merchant_id from the event payload and returning a
        PaymentConfirmation. All other event types return None.

        Args:
            event: Parsed Stripe webhook event dict (from stripe.Event or
                the raw JSON payload after signature verification).

        Returns:
            PaymentConfirmation for payment_intent.succeeded events,
            None for all other event types.

        Raises:
            PaymentProcessingError: When required fields are missing from
                the event payload.
        """
        event_type = event.get("type")

        if event_type != "payment_intent.succeeded":
            logger.debug("Ignoring Stripe event type: %s", event_type)
            return None

        try:
            payment_intent = event["data"]["object"]
            intent_id: str = payment_intent["id"]
            amount_cents: int = payment_intent["amount"]
            currency: str = payment_intent.get("currency", "usd")
            intent_metadata: Dict[str, Any] = payment_intent.get("metadata", {})

            merchant_id_str = intent_metadata.get("merchant_id")
            if merchant_id_str is None:
                raise PaymentProcessingError(
                    message="Stripe webhook event missing merchant_id in metadata",
                    payment_provider="stripe",
                    payment_reference=intent_id,
                )

            merchant_id = int(merchant_id_str)
            amount = Decimal(amount_cents) / _CENTS_PER_UNIT

        except (KeyError, TypeError, ValueError) as exc:
            raise PaymentProcessingError(
                message=f"Malformed Stripe webhook event payload: {exc}",
                payment_provider="stripe",
            ) from exc

        event_id: str = event.get("id", intent_id)

        logger.info(
            "Processing Stripe payment_intent.succeeded",
            extra={
                "event_id": event_id,
                "intent_id": intent_id,
                "merchant_id": merchant_id,
                "amount": str(amount),
                "currency": currency,
            },
        )

        return PaymentConfirmation(
            event_id=event_id,
            payment_reference=intent_id,
            amount=amount,
            merchant_id=merchant_id,
            provider="stripe",
            metadata={
                "currency": currency,
                "intent_metadata": intent_metadata,
            },
        )
